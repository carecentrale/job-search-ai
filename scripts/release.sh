#!/usr/bin/env bash
# Cut a release: scripts/release.sh 0.8.0
# Before running: add the new version's notes (English and French) at the top of lib/changelog.ts.
# This sets package.json's version, commits, tags vX.Y.Z and pushes (Vercel then deploys it).
set -euo pipefail
v="${1:?usage: scripts/release.sh X.Y.Z}"
[[ "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Version must look like 1.2.3"; exit 1; }
grep -q "version: \"$v\"" lib/changelog.ts || { echo "Add v$v's notes to the top of lib/changelog.ts first."; exit 1; }
git diff --quiet || git diff --cached --quiet || true
npm pkg set version="$v"
npx tsc --noEmit -p . && npm run build >/dev/null
git add -A
git commit -m "Release v$v" || true
# GitHub tags it (and publishes the notes) automatically: see .github/workflows/tag-releases.yml.
git push origin main
node -e 'const f="release-commits.json",m=require("./"+f);m[process.argv[1]]=process.argv[2];require("fs").writeFileSync(f,JSON.stringify(m,null,2)+"\n")' "$v" "$(git rev-parse HEAD)"
git add release-commits.json && git commit -m "Record v$v's commit" && git push origin main
echo "Released v$v"
