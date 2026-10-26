# Job Search AI - Setup Checklist

This document tracks the setup progress for the Job Search AI SaaS platform.

---

## ✅ Phase 1: Local Development Setup

### Infrastructure
- [x] Next.js 14 project initialized
- [x] TypeScript configured
- [x] Tailwind CSS installed
- [x] Essential dependencies installed:
  - [x] @clerk/nextjs (authentication)
  - [x] @stripe/stripe-js (payments)
  - [x] @prisma/client (database ORM)
  - [x] stripe (backend)
  - [x] next-themes (dark mode)
  - [x] lucide-react (icons)
  - [x] class-variance-authority (styling)

### Project Files
- [x] README.md (comprehensive documentation)
- [x] LICENSE (MIT)
- [x] .env.example (template for environment variables)
- [x] .gitignore (enhanced)
- [x] prisma/schema.prisma (database schema)

### Git Setup
- [x] Git repository initialized
- [ ] Remote origin added (GitHub)
- [ ] Initial commit created
- [ ] Pushed to main branch

---

## 🔐 Phase 2: Third-Party Accounts & Setup

### Clerk (Authentication)
- [ ] Account created at https://dashboard.clerk.com
- [ ] Email: nick@nickwiz.com
- [ ] Verification email confirmed
- [ ] API Keys obtained:
  - [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  - [ ] CLERK_SECRET_KEY
- [ ] Application created
- [ ] Sign-in/Sign-up URLs configured

### Stripe (Payments)
- [ ] Account created at https://dashboard.stripe.com
- [ ] Email: nick@nickwiz.com
- [ ] Verification email confirmed
- [ ] Test mode enabled
- [ ] API Keys obtained:
  - [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  - [ ] STRIPE_SECRET_KEY
- [ ] Pricing plans configured:
  - [ ] Free (7-day trial)
  - [ ] Pro ($29/month)
  - [ ] Team ($99/month)
- [ ] Webhook endpoint created for local testing

### Railway (PostgreSQL Database)
- [ ] Account created at https://railway.app
- [ ] Email: nick@nickwiz.com (optional)
- [ ] PostgreSQL database provisioned
- [ ] Connection string obtained:
  - [ ] DATABASE_URL
- [ ] Database created: `job_search_ai`

### Vercel (Deployment)
- [ ] Account created at https://vercel.com
- [ ] Email: nick@nickwiz.com
- [ ] GitHub connected
- [ ] Project imported: `carecentrale/job-search-ai`
- [ ] Environment variables configured:
  - [ ] All Clerk keys
  - [ ] All Stripe keys
  - [ ] DATABASE_URL
  - [ ] NEXT_PUBLIC_APP_URL

---

## 🗄️ Phase 3: Database Setup

### Local Development
- [ ] PostgreSQL running locally
- [ ] Database created: `job_search_ai`
- [ ] Prisma migration created:
  ```bash
  npx prisma migrate dev --name init
  ```
- [ ] Prisma client generated:
  ```bash
  npx prisma generate
  ```

### Production (Railway)
- [ ] DATABASE_URL configured in Vercel
- [ ] Prisma migrations pushed to production

---

## 🚀 Phase 4: Development & Testing

### Local Dev Server
- [ ] npm run dev works
- [ ] Server running on http://localhost:3000
- [ ] No TypeScript errors
- [ ] Clerk configured and working
- [ ] Basic pages rendering

### Environment Variables
- [ ] .env.local created with all keys
- [ ] Variables match .env.example
- [ ] No sensitive data in code

---

## 📦 Phase 5: GitHub & Deployment

### GitHub Setup
- [ ] Repository created: carecentrale/job-search-ai
- [ ] README pushed
- [ ] LICENSE pushed
- [ ] .gitignore configured
- [ ] Initial commit message with Claude attribution
- [ ] Branch protection rules (optional)

### Vercel Deployment
- [ ] GitHub repo connected to Vercel
- [ ] Environment variables added to Vercel
- [ ] First deployment successful
- [ ] Preview URL working
- [ ] Production URL working (if custom domain set)

### Stripe Webhook Integration
- [ ] Vercel production URL added to Stripe webhooks
- [ ] Webhook endpoint: `/api/stripe/webhook`
- [ ] Webhook signing secret configured

---

## 🎯 MVP Phase 1 Tasks (from Plan)

### Landing Page
- [ ] Hero section designed
- [ ] Features section added
- [ ] Pricing table implemented
- [ ] Call-to-action (CTA) buttons working
- [ ] Mobile responsive

### Authentication (Clerk)
- [ ] Sign-up flow integrated
- [ ] Log-in flow integrated
- [ ] Protected routes working
- [ ] User profile accessible

### CV Upload & Job Input
- [ ] CV upload form created
- [ ] File validation working
- [ ] Job description input form
- [ ] Role category selector

### Mock Generation
- [ ] CV generation UI complete
- [ ] Cover letter generation UI
- [ ] 3 design templates created
- [ ] Template selector working
- [ ] PDF download functionality

### Dashboard
- [ ] Dashboard page for logged-in users
- [ ] Display generated materials
- [ ] List of applications
- [ ] Trial countdown display

### Templates Page
- [ ] Template showcase created
- [ ] Preview images for each template
- [ ] Design customization UI

---

## 📋 Accounts Summary

Once all setup is complete, you'll have:

| Service | Email | Status | Notes |
|---------|-------|--------|-------|
| GitHub | carecentrale | ✓ Created | carecentrale/job-search-ai |
| Clerk | nick@nickwiz.com | ⏳ Pending | Authentication service |
| Stripe | nick@nickwiz.com | ⏳ Pending | Payments (test mode) |
| Railway | - | ⏳ Pending | PostgreSQL database |
| Vercel | nick@nickwiz.com | ⏳ Pending | Deployment platform |

---

## 🔗 Useful Links

- **GitHub Repo**: https://github.com/carecentrale/job-search-ai
- **Clerk Dashboard**: https://dashboard.clerk.com
- **Stripe Dashboard**: https://dashboard.stripe.com (test mode)
- **Railway Dashboard**: https://railway.app/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs

---

## 📞 Getting Help

If you encounter issues:
1. Check the error message carefully
2. Refer to service documentation
3. Check the project README
4. Open an issue on GitHub

---

## ✨ Next Steps

1. Confirm all accounts are created and verified
2. Get all API keys and environment variables
3. Configure .env.local with all credentials
4. Test local development environment
5. Deploy to Vercel
6. Begin MVP Phase 1 development

---

**Last Updated**: 2026-10-26
**Status**: ⏳ Setup in Progress
