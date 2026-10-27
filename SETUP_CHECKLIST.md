# fuzzyHR setup checklist

## Done
- [x] GitHub repo: carecentrale/job-search-ai
- [x] Live on Vercel: https://fuzzyhr.vercel.app (Hobby plan, deploys on every push to `main`)
- [x] Landing page, demo workspace, morning hunt, live workspace, tailored CV and cover letter, tracker, free week

## To switch everything on (in Vercel, project **fuzzyhr**)
- [ ] **Clerk** (Integrations → Clerk → Add, connect to fuzzyhr): sign-up and sign-in
- [ ] **Neon** (Storage → Create Database → Neon, US East, connect to fuzzyhr): accounts and saved data
- [ ] **ANTHROPIC_API_KEY** (Environment Variables): CV reading and writing. Key from console.anthropic.com, with some credit added under Billing.
- [ ] **CRON_SECRET** (Environment Variables): any long random string, so the 7 am hunt can run
- [ ] Redeploy once all four are in, then sign up on the live site to test

## Later
- [ ] Paid plans with Stripe ($29 Personal, $99 Coach)
- [ ] Final name and domain
- [ ] More job boards, and letting users add companies to hunt
