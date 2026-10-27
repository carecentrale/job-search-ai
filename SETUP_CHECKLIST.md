# fuzzyHR setup checklist

## Done
- [x] GitHub repo: carecentrale/job-search-ai
- [x] Live on Vercel: https://fuzzyhr.vercel.app (Hobby plan, deploys on every push to `main`)
- [x] Landing page, demo workspace, morning hunt, live workspace, tailored CV and cover letter, tracker, free week

## To switch everything on (in Vercel, project **fuzzyhr**)
- [x] **Clerk** connected to fuzzyhr: sign-up and sign-in
- [x] **Neon** connected to fuzzyhr as `DATABASE_URL`: accounts and saved data
- [ ] **ENCRYPTION_KEY** (Environment Variables): any long random string, so users can save their own Claude key
- [ ] **ANTHROPIC_API_KEY** (optional): fuzzyHR's key for free-week users. Skip it to run on users' own keys only.
- [x] **Admin**: the first account (yours) is admin automatically; no setting needed
- [ ] **CRON_SECRET** (Environment Variables): any long random string, so the 7 am hunt can run
- [ ] Optional, more jobs: free keys from developer.adzuna.com (`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`) and jooble.org/api/about (`JOOBLE_API_KEY`)
- [ ] Redeploy once these are in, then sign up on the live site to test

## Later
- [ ] Paid plans with Stripe ($29 Personal, $99 Coach)
- [ ] Final name and domain
- [x] More job boards (115 companies), job search sites, AI review, Autopilot, follow companies, add jobs by link
