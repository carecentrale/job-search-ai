import Link from "next/link";
const work = [
  {
    verb: "Brief",
    title: "Tell it what you want next",
    body: "Share your CV and a few lines on the role, pay, places and companies you want. Like a first meeting with a recruiter, minus the small talk.",
  },
  {
    verb: "Hunt",
    title: "It goes looking",
    body: "Every day it scans new postings and shortlists the ones that fit your brief, with a plain reason for each pick and a warning on stale or vague ones.",
  },
  {
    verb: "Tailor",
    title: "It prepares each application",
    body: "For every role you approve, it rewrites your CV and cover letter to answer what that employer asked for. Only from experience you actually have.",
  },
  {
    verb: "Follow up",
    title: "It keeps your search moving",
    body: "It tracks where every application stands and nudges you when it is time to follow up, prepare for an interview, or move on.",
  },
];

const templates = [
  { id: "minimal", name: "Minimal", note: "Quiet and clean. Fits any industry." },
  { id: "bold", name: "Bold", note: "A strong header band. Fits product and tech roles." },
  { id: "elegant", name: "Elegant", note: "Serif type, wide margins. Fits senior and executive roles." },
];

const plans = [
  {
    name: "Trial",
    price: "$0",
    period: "for 7 days",
    features: ["Your brief and daily shortlist", "5 tailored applications", "All 3 CV templates"],
    cta: "Start your free week",
    featured: false,
  },
  {
    name: "Personal",
    price: "$29",
    period: "per month",
    features: ["Unlimited tailored applications", "Match the style of any CV you like", "Application tracker and follow-up reminders"],
    cta: "Hire your headhunter",
    featured: true,
  },
  {
    name: "Coach",
    price: "$99",
    period: "per month",
    features: ["Up to 5 job seekers", "Shared templates", "Built for career coaches and outplacement"],
    cta: "Set up for clients",
    featured: false,
  },
];

const faqs = [
  {
    q: "Does it apply to jobs for me?",
    a: "No. It finds the roles and prepares everything, then you review and press send. Nothing goes out in your name without you.",
  },
  {
    q: "Will it make things up about me?",
    a: "No. Every line it writes comes from your own CV and brief. If a posting asks for something you don't have, it tells you instead of inventing it.",
  },
  {
    q: "What happens after the 7 days?",
    a: "Your trial ends and nothing is charged unless you choose a plan. Everything it prepared stays in your account to download.",
  },
  {
    q: "Who can see my CV?",
    a: "Only you. Your documents are private to your account and you can delete them at any time.",
  },
];

/** Sign-up opens by itself once the Clerk keys and the database are set in Vercel. */
const signupOn = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.DATABASE_URL);

export default function Home() {
  return (
    <>
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="wordmark" href="#top">fuzzyHR</a>
          <nav aria-label="Main">
            <a href="#how">What it does</a>
            <a href="#templates">Templates</a>
            <a href="#pricing">Pricing</a>
          </nav>
          {signupOn ? (
            <>
              <Link className="nav-signin" href="/sign-in">Sign in</Link>
              <Link className="btn btn-small" href="/sign-up">Start free</Link>
            </>
          ) : (
            <a className="btn btn-small" href="/app">Try the demo</a>
          )}
        </div>
      </header>

      <main id="top">
        <section className="hero-band">
          <div className="hero wrap">
          <div className="hero-copy">
            <h1>Get to work with your personal headhunter.</h1>
            <p className="lede">
              Brief it once. It finds the roles worth your time, tailors your CV and cover letter
              for each one, and keeps your search moving while you get on with your day.
            </p>
            <div className="hero-actions">
              {signupOn ? (
                <>
                  <Link className="btn" href="/sign-up">Start your free week</Link>
                  <a className="link" href="/app">Try the demo first</a>
                </>
              ) : (
                <>
                  <a className="btn" href="/app">Try the demo</a>
                  <a className="link" href="#pricing">See pricing</a>
                </>
              )}
            </div>
            <p className="fine">{signupOn ? "7 days free. No card needed." : "Early access. The demo is open now and sign-up opens soon."}</p>
          </div>

          <aside className="briefing" aria-label="Example of a morning briefing from your headhunter">
            <div className="briefing-head">
              <span className="avatar" aria-hidden="true">fz</span>
              <div>
                <p className="briefing-from">Your headhunter</p>
                <p className="briefing-time">Tuesday, 7:30 am</p>
              </div>
            </div>
            <p className="briefing-hello">Morning, Alex. Here is what I did overnight.</p>

            <div className="briefing-stats">
              <p><strong>38</strong> new postings read</p>
              <p><strong>3</strong> worth your time</p>
            </div>

            <ul className="shortlist">
              <li>
                <div className="fit"><span>92</span>fit</div>
                <div>
                  <p className="role">Senior Product Manager, Payments</p>
                  <p className="why">Northwind Bank, Toronto. Asks for sponsor bank work you led for 4 years.</p>
                </div>
                <span className="status status-ready">CV ready</span>
              </li>
              <li>
                <div className="fit"><span>84</span>fit</div>
                <div>
                  <p className="role">Group PM, Merchant Platform</p>
                  <p className="why">Harbourline, remote. Your migration work matches their roadmap.</p>
                </div>
                <span className="status">Drafting</span>
              </li>
              <li>
                <div className="fit fit-warn"><span>71</span>fit</div>
                <div>
                  <p className="role">Director of Product, Fintech</p>
                  <p className="why">Posted 46 days ago. Might already be filled, worth a quick check.</p>
                </div>
                <span className="status status-warn">Check first</span>
              </li>
            </ul>

            <div className="briefing-foot">
              <span>Follow up with Clearwater today. It has been 8 days.</span>
              <a className="btn btn-small" href="#how">Review and send</a>
            </div>
          </aside>
          </div>
        </section>

        <section id="how" className="band">
          <div className="wrap">
            <div className="section-head">
              <h2 className="section-title">A headhunter that works for you, not the employer</h2>
              <p>Recruiters are paid to fill the company&apos;s role. This one is paid by you to find yours.</p>
            </div>
            <ol className="work">
              {work.map((w) => (
                <li key={w.verb}>
                  <span className="verb">{w.verb}</span>
                  <h3>{w.title}</h3>
                  <p>{w.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="templates" className="wrap section">
          <div className="section-head">
            <h2 className="section-title">Your CV, dressed for the room</h2>
            <p>
              Start with one of three templates. Or show it a CV whose look you like, and it will
              match the layout, fonts and colours.
            </p>
          </div>
          <div className="templates">
            {templates.map((t) => (
              <figure key={t.id} className="template">
                <div className={`thumb thumb-${t.id}`} aria-hidden="true">
                  <div className="t-head"><span className="t-name" /><span className="t-line short" /></div>
                  <div className="t-body">
                    <span className="t-h" /><span className="t-line" /><span className="t-line" /><span className="t-line short" />
                    <span className="t-h" /><span className="t-line" /><span className="t-line" /><span className="t-line short" />
                    <span className="t-h" /><span className="t-line" /><span className="t-line short" />
                  </div>
                </div>
                <figcaption>
                  <strong>{t.name}</strong>
                  <span>{t.note}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="pricing" className="band">
          <div className="wrap">
            <div className="section-head">
              <h2 className="section-title">Cheaper than one lunch with a recruiter</h2>
              <p>{signupOn ? "Every plan starts with a free week. Keep it only if it earns its place in your search." : "Sign-up opens soon, starting with a free week. Until then, try the demo."}</p>
            </div>
            <div className="plans">
              {plans.map((p) => (
                <div key={p.name} className={`plan${p.featured ? " plan-featured" : ""}`}>
                  <h3>{p.name}</h3>
                  <p className="price"><span>{p.price}</span> {p.period}</p>
                  <ul>
                    {p.features.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                  <Link className={p.featured ? "btn" : "btn btn-ghost"} href={signupOn ? "/sign-up" : "/app"}>
                    {signupOn ? "Start your free week" : "Try the demo"}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap section faq">
          <h2 className="section-title">Before you hire it</h2>
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <span>fuzzyHR</span>
          <span>Built by Nicola Delnero with Claude</span>
        </div>
      </footer>
    </>
  );
}
