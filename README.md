# fuzzyHR

*Working name. Formerly Job Search AI.*

An **open-source SaaS platform** that helps job seekers create tailored CVs and cover letters using AI. Built with Next.js, Clerk, Stripe, and Claude API.

**Marketing tagline**: *"Simplify your job search with an AI-Powered Agent working for you. Test it free for 7 days."*

---

## 🚀 Features

### MVP (Phase 1)
- ✅ User authentication via Clerk
- ✅ CV upload & preview
- ✅ Job description input
- ✅ Mock AI-generated CV & cover letter
- ✅ 3 design templates (Minimal, Bold, Elegant)
- ✅ Design customization UI
- ✅ PDF download functionality
- ✅ User dashboard with generated materials
- ✅ 7-day free trial system
- ✅ Stripe integration (test mode)

### Phase 2 (Roadmap)
- Real Claude API integration for live generation
- Streaming generation UI
- Database persistence of generated materials
- Billing/subscription enforcement
- Rate limiting

### Phase 3 (Future)
- Interview prep resources
- Job search tracking (integrated tracker)
- Community templates
- Analytics dashboard

---

## 🕵️ How the daily hunt works

Every morning at 7:00 Toronto time, Vercel Cron calls `/api/cron/hunt` (see `vercel.json`).

1. **Fetch** every company job board once: the starter list in `lib/hunt/boards.ts` plus any companies seekers add. Boards come from the public Greenhouse and Lever APIs (free, no key).
2. **Score** each new posting against the seeker's brief (`lib/hunt/score.ts`): title match, skills from their CV, location or remote. Postings mentioning anything on their "never show me" list are dropped. Postings older than 30 days lose points and get a warning.
3. **Remind** (`lib/hunt/followup.ts`): follow up 7 days after applying, prepare 2 days before an interview, finish applications left in "Preparing".
4. **Save** one briefing per seeker (`lib/store.ts`), shown on the Today screen at `/app`.

Set `CRON_SECRET` in Vercel; the route refuses any request without it. Until the database is connected, `lib/store.ts` serves one demo seeker.

---

## 📋 Tech Stack

- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentication**: Clerk (free tier)
- **Database**: PostgreSQL + Prisma ORM
- **Payments**: Stripe (test mode)
- **Deployment**: Vercel
- **AI**: Claude API (Phase 2)

---

## 🔧 Local Development Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL (local or Railway)
- Clerk account (API keys)
- Stripe account (test keys)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/carecentrale/job-search-ai.git
   cd job-search-ai
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in the variables:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/job_search_ai
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
   CLERK_SECRET_KEY=sk_test_xxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   STRIPE_SECRET_KEY=sk_test_xxxxx
   ```

3. **Set up the database**
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
job-search-ai/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   ├── auth/
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx              # User dashboard
│   │   └── [id]/page.tsx         # Application detail
│   ├── onboarding/
│   │   ├── cv-upload/page.tsx
│   │   └── job-input/page.tsx
│   ├── generate/
│   │   ├── page.tsx
│   │   └── [jobId]/page.tsx
│   ├── templates/page.tsx        # Design templates
│   ├── pricing/page.tsx
│   └── api/
│       ├── auth/[...auth]/
│       ├── generate/route.ts
│       ├── materials/route.ts
│       ├── users/route.ts
│       └── stripe/webhook/route.ts
├── components/
│   ├── ui/                       # Reusable shadcn components
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── ...
├── lib/
│   ├── auth.ts                   # Clerk setup
│   ├── db.ts                     # Prisma client
│   ├── stripe.ts                 # Stripe setup
│   ├── types.ts                  # TypeScript types
│   └── utils.ts
├── public/
│   ├── sample-cv.pdf
│   └── ...
├── prisma/
│   └── schema.prisma             # Database schema
├── styles/
│   └── globals.css
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔐 Environment Variables

### Database
- `DATABASE_URL` - PostgreSQL connection string

### Clerk (Authentication)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Public key for Clerk
- `CLERK_SECRET_KEY` - Secret key for Clerk
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` - Sign-in page route
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` - Sign-up page route
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` - Redirect after sign-in
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` - Redirect after sign-up

### Stripe (Payments)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Public key for Stripe
- `STRIPE_SECRET_KEY` - Secret key for Stripe
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

### Application
- `NEXT_PUBLIC_APP_URL` - Base URL of the application

---

## 📊 Database Schema

### Users
- User profile, Clerk integration
- Trial dates, subscription status
- Uploaded CV

### Materials
- Generated CVs and cover letters
- Job descriptions, role info
- Template used, creation dates

### UserPreferences
- Design template preferences
- Color customization settings

### DesignTemplates
- Pre-built design templates (Minimal, Bold, Elegant)
- CSS variables for customization

### StripeEvents
- Webhook event logging

---

## 🧪 Testing

### Run tests
```bash
npm run test
```

### Build for production
```bash
npm run build
npm run start
```

---

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. Connect GitHub repo to Vercel
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Add environment variables
   - Deploy

3. Set up Stripe webhooks
   - Add Vercel deployment URL to Stripe webhook endpoints
   - URL: `https://your-domain.vercel.app/api/stripe/webhook`

---

## 💳 Stripe Setup (Test Mode)

### Pricing Plans
- **Free**: 7-day trial (limited generations)
- **Pro**: $29/month (unlimited generations)
- **Team**: $99/month (multiple users)

### Test Credit Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

[See Stripe test cards](https://stripe.com/docs/testing)

---

## 🤝 Contributing

This is an open-source project. Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

## 👨‍💻 Built By

Created with ❤️ by [Nicola Delnero](https://linkedin.com/in/nicoladelnero) using Claude Code + AI.

---

## 🐛 Issues & Support

Found a bug? Have a suggestion? Open an issue on [GitHub Issues](https://github.com/carecentrale/job-search-ai/issues).

---

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com)

---

## 🎯 Roadmap

- [ ] MVP Launch (Phase 1)
- [ ] Real Claude API integration (Phase 2)
- [ ] Advanced analytics (Phase 3)
- [ ] Community features (Phase 3)

---

**Happy coding! 🚀**
