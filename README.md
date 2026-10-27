# fuzzyHR

*Working name.* Your personal headhunter: brief it once, and every morning it finds the roles worth your time, writes a CV and cover letter for each one you approve, and reminds you to follow up.

Live at **https://fuzzyhr.vercel.app** · Built by [Nicola Delnero](https://linkedin.com/in/nicoladelnero) with Claude.

---

## What it does

- **Brief.** A new user uploads their CV (PDF or text). Claude reads it and pre-fills a brief: roles they want, strengths, cities, and topics to always skip. They edit and save.
- **Hunt.** Every morning at 7:00 Toronto time, and on demand, fuzzyHR pulls fresh postings from public company job boards, scores each against the brief and keeps a ranked shortlist with a plain reason for every pick. Stale postings are flagged; anything on the user's skip list is dropped.
- **Tailor.** For each role the user approves, Claude rewrites the CV and writes a cover letter using **only facts in the CV**. Anything the posting asks for that the CV doesn't show is listed as a gap, never invented. Documents open in three templates (Minimal, Bold, Elegant) and save as PDF from the browser.
- **Follow up.** A tracker (Preparing → Applied → Interviewing → Offer → Closed) with reminders: follow up 7 days after applying, prepare 2 days before an interview.
- **Free week.** New accounts get 7 days and 5 tailored applications. Paid plans are not built yet.

Signed-out visitors get a demo at `/app` with sample data.

## Stack

| Part | Choice |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript |
| Hosting and schedule | Vercel, with Vercel Cron for the morning hunt (`vercel.json`) |
| Sign-in | Clerk (`proxy.ts`, `lib/auth.ts`) |
| Database | Postgres via `DATABASE_URL` (Neon on Vercel), using the `postgres` client. Tables are created on first use (`lib/db.ts`). |
| Writing | Claude via `@anthropic-ai/sdk` with structured JSON output (`lib/ai.ts`) |
| Job postings | Public Greenhouse and Lever board APIs, free and keyless (`lib/hunt/sources.ts`) |
| PDF CVs | `unpdf` text extraction |

The site degrades safely: with no keys set it runs as the public demo; each feature switches on when its key arrives.

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables.

| Name | Set by | What it does |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk integration | Turns on sign-up and sign-in |
| `DATABASE_URL` | Neon integration | Turns on accounts and saved data |
| `ANTHROPIC_API_KEY` | You, from console.anthropic.com | Turns on CV reading and writing |
| `ANTHROPIC_MODEL` | Optional | Defaults to `claude-sonnet-5-5` |
| `CRON_SECRET` | You, any long random string | Lets Vercel Cron run the morning hunt; every other caller is refused |

Changes to environment variables apply on the next deploy.

## Code map

```
app/
  page.tsx                      Landing page
  app/page.tsx                  Workspace: live if signed in, demo otherwise
  app/doc/[id]/page.tsx         Tailored CV and cover letter, 3 templates, print to PDF
  sign-in/, sign-up/            Clerk forms
  api/me/...                    The signed-in user's workspace API
    cv                          Upload CV, get a suggested brief
    brief                       Save brief, rescan the last 3 weeks
    hunt                        Hunt now (10-minute cooldown)
    pass                        Never show a posting again
    applications, [id], [id]/tailor
  api/cron/hunt                 The morning hunt for every active user
components/workspace/           Live.tsx, Demo.tsx, shared parts.tsx
lib/
  hunt/                         Scoring, sources, follow-up rules, sample data
  ai.ts                         Claude prompts and schemas
  db.ts, seekers.ts, store.ts   Database
  auth.ts, api.ts               Who is calling, shared API helpers
  markdown.ts                   Safe Markdown → HTML for documents
scripts/build_preview.py        Builds the claude.ai preview from a static export
```

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev
```

Without Clerk keys you can still test the signed-in workspace locally: set `FUZZY_DEV_USER=me` (ignored on Vercel), `DATABASE_URL` to any Postgres, and `FUZZY_SAMPLE_JOBS=1` to use sample postings instead of live boards.

## License

MIT. See [LICENSE](./LICENSE).
