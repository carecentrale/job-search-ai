# fuzzyHR setup checklist

## Done
- [x] GitHub repo: carecentrale/job-search-ai
- [x] Live on Vercel: https://fuzzyhr.vercel.app (Hobby plan, deploys on every push to `main`)
- [x] Landing page, demo workspace, morning hunt, live workspace, tailored CV and cover letter, tracker, free week

## To switch everything on (in Vercel, project **fuzzyhr**)
- [x] **Clerk** connected to fuzzyhr: sign-up and sign-in
- [x] **Neon** connected to fuzzyhr as `DATABASE_URL`: accounts and saved data
- [ ] **ENCRYPTION_KEY** (Environment Variables): any long random string, so users can save their own Claude key
- [ ] **ANTHROPIC_API_KEY**: fuzzyHR's key for free-week users. Can wait: until it's set, users see "free AI writing is switching on soon" and can ask to be notified. The admin overview (and a dot on your Admin link) tells you when a real user, not a tester, is waiting. After adding it, use "Give them a fresh free week" there.
- [x] **Admin**: the first account (yours) is admin automatically; no setting needed
- [ ] **CRON_SECRET** (Environment Variables): any long random string, so the 7 am hunt can run
- [ ] Optional, more jobs: free keys from developer.adzuna.com (`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`) and jooble.org/api/about (`JOOBLE_API_KEY`). Adzuna's terms allow a 14-day trial for commercial use; after that it needs a licence agreement with Adzuna, and their logo as attribution. Check Jooble's partner terms too.
- [ ] Redeploy once these are in, then sign up on the live site to test

## Legal (Privacy Policy at /privacy, Terms at /terms; business details in lib/legal.ts)
- [ ] Have a Quebec lawyer review both before taking payments
- [ ] French versions: Quebec's Charter of the French Language requires French versions of the Terms (a standard-form contract) and the site for Quebec users
- [ ] Keep a short written privacy impact assessment for storing data in the US (Law 25, s. 17)
- [ ] Sign up for each provider's data processing terms where offered (Vercel, Neon, Clerk, Anthropic, OpenAI)

## Later
- [ ] Paid plans with Stripe ($29 Personal, $99 Coach)
- [ ] Final name and domain
- [x] More job boards (115 companies), job search sites, AI review, Autopilot, follow companies, add jobs by link
