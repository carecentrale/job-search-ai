"""
Build the private preview (claude.ai artifact) from a static export.

  1. Copy the repo without app/api, set `output: 'export'` in next.config.ts
     and drop cacheComponents/partialPrefetching, then `npx next build`.
  2. python3 scripts/build_preview.py <copy>/out <preview-dir>
  3. Publish <preview-dir>/index.html with app.html and assets/** as supporting files.

The preview host reserves names starting with "_", so _next/ becomes assets/.
"""
import os, re, shutil, sys
src, dst = sys.argv[1], sys.argv[2]
shutil.rmtree(dst, ignore_errors=True)
shutil.copytree(os.path.join(src, "_next"), os.path.join(dst, "assets"), ignore=shutil.ignore_patterns("*Manifest.js"))
# JS: chunk base path and wordmark link become relative to the page
for root, _, files in os.walk(os.path.join(dst, "assets")):
    for f in files:
        if f.endswith(".js"):
            p = os.path.join(root, f); s = open(p).read()
            t = (s.replace('TURBOPACK_CHUNK_BASE_PATH:"/_next/"', 'TURBOPACK_CHUNK_BASE_PATH:"./assets/"')
                  .replace("/_next/", "/assets/").replace('href:"/"', 'href:"./"').replace("\ufffd", "\\uFFFD"))
            if t != s: open(p, "w").write(t)
def rel(html):
    html = html.replace('"/_next/', '"./assets/')
    html = re.sub(r'<link rel="icon"[^>]*>', '', html)
    return html.replace('href="/app"', 'href="app.html"')
# app.html: a full document of its own
app = rel(open(os.path.join(src, "app.html")).read())
open(os.path.join(dst, "app.html"), "w").write(app)
# index.html: the landing page, content only (the viewer wraps it), styles inlined, no scripts needed
idx = open(os.path.join(src, "index.html")).read()
css = "".join(open(os.path.join(src, h.lstrip("/"))).read() for h in re.findall(r'<link rel="stylesheet" href="(/_next/[^"]+\.css)"', idx))
body = re.search(r"<body[^>]*>(.*)</body>", idx, re.S).group(1)
body = re.sub(r"<script\b.*?</script>", "", body, flags=re.S)
body = re.sub(r"<!--.*?-->", "", body, flags=re.S).replace('href="/app"', 'href="app.html"')
fonts = re.search(r'<link rel="stylesheet" href="(https://fonts.googleapis.com[^"]+)"', idx).group(1).replace("&amp;", "&")
head = ('<title>fuzzyHR</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        f'<link rel="stylesheet" href="{fonts}">\n'
        f'<style>{css}\nbody::before{{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:30;background:var(--hero)}}</style>\n')
open(os.path.join(dst, "index.html"), "w").write(head + body.strip() + "\n")
n = sum(len(fs) for _, _, fs in os.walk(dst)); print("files:", n)
