# fuzzyHR setup checklist

## Done
- [x] GitHub repo: carecentrale/job-search-ai
- [x] Live on Vercel: https://fuzzyhr.vercel.app (Hobby plan, deploys on every push to `main`)
- [x] Landing page, demo workspace, morning hunt, live workspace, tailored CV and cover letter, tracker, free week

## To switch everything on (in Vercel, project **fuzzyhr**)
- [x] **Clerk** connected to fuzzyhr: sign-up and sign-in
- [x] **Neon** connected to fuzzyhr as `DATABASE_URL`: accounts and saved data
- [x] **Encryption**: automatic, derived from the Clerk secret. Optional: set `ENCRYPTION_KEY` in Vercel to use your own.
- [ ] **fuzzyHR's AI key**: paste it in **Admin → fuzzyHR's AI key** when you're ready (no Vercel needed). Until then users see "free AI writing is switching on soon", and Admin alerts you, with a dot on your Admin link, when a real user (not a tester) is waiting. Then use "Give them a fresh free week".
- [x] **Admin**: the first account (yours) is admin automatically; no setting needed
- [x] **Morning hunt**: runs at 7 am without any setting (at most once every 20 hours). Optional: `CRON_SECRET` in Vercel restricts it to Vercel Cron.
- [ ] Optional, more jobs: free keys from developer.adzuna.com (`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`) and jooble.org/api/about (`JOOBLE_API_KEY`). Adzuna's terms allow a 14-day trial for commercial use; after that it needs a licence agreement with Adzuna, and their logo as attribution. Check Jooble's partner terms too.
- [ ] Sign up on the live site to test

## Payments (Admin → Payments)
- [ ] On the live site, paste your Stripe **test** secret key (sk_test_…), set prices, switch on sales, and buy with card 4242 4242 4242 4242
- [ ] Then connect your **live** key (sk_live_…) and save the plan again to publish live prices
- [ ] fuzzyHR's AI key must be set too (Overview): Personal runs on it

## Legal (Privacy Policy at /privacy, Terms at /terms; business details in lib/legal.ts)
- [ ] Have a Quebec lawyer review both before taking payments
- [ ] French versions: Quebec's Charter of the French Language requires French versions of the Terms (a standard-form contract) and the site for Quebec users
- [ ] Keep a short written privacy impact assessment for storing data in the US (Law 25, s. 17)
- [ ] Sign up for each provider's data processing terms where offered (Vercel, Neon, Clerk, Anthropic, OpenAI)

## Later
- [x] Paid plans with Stripe: Personal, CAD and USD, set up in Admin → Payments
- [ ] Final name and domain
- [x] More job boards (115 companies), job search sites, AI review, Autopilot, follow companies, add jobs by link
