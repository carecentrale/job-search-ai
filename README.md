# fuzzyHR

*Working name.* Your personal headhunter: brief it once, and every morning it finds the roles worth your time, writes a CV and cover letter for each one you approve, and reminds you to follow up.

Live at **https://fuzzyhr.vercel.app** · Built by [Nicola Delnero](https://linkedin.com/in/nicoladelnero) with Claude.

---

## What it does

- **Brief.** A new user uploads their CV (PDF or text). Claude reads it and pre-fills a brief: roles they want, strengths, cities, and topics to always skip. They edit and save.
- **Hunt.** Every morning at 7:00 Toronto time, and on demand, fuzzyHR pulls fresh postings from public company job boards, scores each against the brief and keeps a ranked shortlist with a plain reason for every pick. Stale postings are flagged; anything on the user's skip list is dropped.
- **Tailor.** For each role the user approves, Claude rewrites the CV and writes a cover letter using **only facts in the CV**. Anything the posting asks for that the CV doesn't show is listed as a gap, never invented. Documents open in three templates (Minimal, Bold, Elegant) and save as PDF from the browser.
- **Follow up.** A tracker (Preparing → Applied → Interviewing → Offer → Closed) with reminders: follow up 7 days after applying, prepare 2 days before an interview.
- **Free with your own key.** Users who add their own Claude or OpenAI API key (Plan tab, or AI key and plan in the profile menu) use fuzzyHR free with no limits; their provider bills them directly. Keys are recognised by prefix, checked with the provider, stored encrypted (AES-256-GCM) and never sent back to the browser. For OpenAI keys, fuzzyHR picks the newest general GPT model the key can use.
- **Free week on us.** Without a key, new accounts get 7 days and 5 tailored applications on fuzzyHR's key, within daily caps per user and overall. Paid plans are not built yet.

Signed-out visitors get a demo at `/app` with sample data.

- **Admin (owner only).** `/admin` shows headline numbers, spend on your Claude key against today's cap, every user (searchable), and a per-user page with their brief, CV, applications, AI usage, briefings and a full activity timeline. `/admin/activity` is a live feed of everything across the site, filterable by event. Admins are users with role `admin` in the database: the first account ever created becomes admin automatically, and admins can make others admin from a user's page (but can't remove their own access). `ADMIN_EMAILS` in Vercel also works as a fallback. Everyone else gets a 404. Users' AI keys are never shown, only their last 4 characters.

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
| `ENCRYPTION_KEY` | Optional | Encrypts saved AI keys. Without it, fuzzyHR derives one from `CLERK_SECRET_KEY`. If set later, keys saved before keep working. |
| `ANTHROPIC_API_KEY` | Optional | Fallback for fuzzyHR's own AI key. Normally the owner pastes it in **Admin → fuzzyHR's AI key** instead, which takes priority. |
| `HOUSE_DAILY_LIMIT_PER_USER` | Optional | Claude requests per free-week user per day on fuzzyHR's key (default 10) |
| `HOUSE_DAILY_LIMIT_TOTAL` | Optional | Claude requests per day across all users on fuzzyHR's key (default 200). Your ceiling on spend. |
| `ANTHROPIC_MODEL` | Optional | Claude model, defaults to `claude-sonnet-5-5` |
| `OPENAI_MODEL` | Optional | Forces one model for OpenAI keys instead of picking the newest |
| `ADMIN_EMAILS` | Optional | Extra way to grant `/admin`: comma-separated sign-in emails (admins are normally set in the database) |
| `CRON_SECRET` | Optional | Restricts the morning hunt URL to Vercel Cron. Without it, the hunt URL is public but runs at most once every 20 hours. |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Optional, free at developer.adzuna.com | Adds Adzuna job search to the hunt |
| `JOOBLE_API_KEY` | Optional, free at jooble.org/api/about | Adds Jooble job search to the hunt |

## Before fuzzyHR's own AI key is set

fuzzyHR's own AI key can be left out while testing; the owner adds it later in Admin, with no Vercel changes. Users then see "Free AI writing is switching on soon": hunting, matching and the tracker work, and anyone can add their own key. When someone tries an AI feature or presses Notify me, it's logged as `ai_wanted`. The admin overview turns that into a "Time to add your Anthropic key" alert, with a count on the workspace's Admin link. It ignores admins, and users marked as testers on their admin page. Once the key is saved in Admin, the same box offers to give everyone waiting a fresh 7-day free week.

## Paid plans

Admin → Payments: paste a Stripe secret key and fuzzyHR creates the product, monthly CAD and USD prices (tax included), a webhook endpoint and a customer portal in that Stripe account. Prices and allowances (tailored applications a month, AI requests a day) are set there too, along with an on-sale switch. Personal subscribers use fuzzyHR's AI key within those allowances. Stripe's webhooks (`/api/stripe/webhook`, signature-checked) keep each user's plan in sync. Deleting an account cancels its subscription.

## How the hunt works

1. **Find.** Every morning at 7 (Toronto), fuzzyHR reads the public job boards of 115 companies (Greenhouse, Lever, Ashby, Recruitee; list in `lib/hunt/boards.ts`), the companies each user follows, and, when keys are set, Adzuna and Jooble searches built from each user's roles and cities. Duplicates are merged.
2. **Filter.** New postings are scored by keyword against the brief (titles, strengths, cities, avoid list).
3. **Review.** The AI reads the top keyword matches against the user's whole CV, up to 12 per call, and marks each Recommended, Worth a look, or Skip, with its own fit score and reasons.
4. **Approve.** The user approves or passes. With **Autopilot** on, fuzzyHR approves Recommended roles at or above the user's fit threshold, up to their daily limit, and writes the CV and cover letter. It never submits anything.
5. Users can also follow a company by pasting its careers page, or add a single job by pasting its link.

The review and Autopilot run in the morning job while time allows, and otherwise from the workspace when the user opens it. Each review or write is one AI request, counted against the free-week caps on fuzzyHR's key.

Changes to environment variables apply on the next deploy.

## Code map

```
app/
  page.tsx                      Landing page
  app/page.tsx                  Workspace: live if signed in, demo otherwise
  app/doc/[id]/page.tsx         Tailored CV and cover letter, 3 templates, print to PDF
  sign-in/, sign-up/            Clerk forms
  admin/                        Owner-only: overview and users, activity feed, user detail
  api/me/...                    The signed-in user's workspace API
    cv                          Upload CV, get a suggested brief
    brief                       Save brief, rescan the last 3 weeks
    hunt                        Hunt now (10-minute cooldown)
    pass                        Never show a posting again
    applications, [id], [id]/tailor
    claude-key                  Save (checked, encrypted) or remove the user's own key
  api/cron/hunt                 The morning hunt for every active user
components/workspace/           Live.tsx, Demo.tsx, shared parts.tsx
lib/
  hunt/                         Scoring, sources, follow-up rules, sample data
  ai.ts                         Prompts, schemas, Claude and OpenAI clients, model picking
  activity.ts, describe.ts      Activity log and its readable descriptions
  admin.ts                      Admin access check and queries
  claude.ts                     Which key pays, daily caps, usage tracking
  crypto.ts                     Encryption for saved keys
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
