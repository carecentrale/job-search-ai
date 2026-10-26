const steps = [
  {
    title: "Add your CV",
    body: "Upload the PDF you already have, or paste the text. We read your roles, results and skills once and keep them on file.",
  },
  {
    title: "Paste a job posting",
    body: "Copy the full posting from LinkedIn, Indeed or a company careers page. We pick out what the employer is asking for.",
  },
  {
    title: "Download your application",
    body: "Get a CV and cover letter rewritten for that posting, using only experience you actually have. Edit anything before you send it.",
  },
];

const templates = [
  { id: "minimal", name: "Minimal", note: "Plain and quiet. Good for any industry." },
  { id: "bold", name: "Bold", note: "A dark header band and strong headings. Good for product and tech roles." },
  { id: "elegant", name: "Elegant", note: "Serif type and generous margins. Good for senior and executive roles." },
];

const plans = [
  {
    name: "Free trial",
    price: "$0",
    period: "for 7 days",
    features: ["5 tailored applications", "All 3 templates", "PDF download"],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    features: ["Unlimited applications", "Match a CV style from a sample", "Application tracker"],
    cta: "Choose Pro",
    featured: true,
  },
  {
    name: "Team",
    price: "$99",
    period: "per month",
    features: ["Up to 5 job seekers", "Shared templates", "For coaches and outplacement"],
    cta: "Choose Team",
    featured: false,
  },
];

const faqs = [
  {
    q: "Will it make things up about me?",
    a: "No. Every line in your tailored CV comes from your own CV. We reorder, reword and emphasise what matches the posting. If the posting asks for something you don't have, we tell you instead of inventing it.",
  },
  {
    q: "What happens after the 7 days?",
    a: "Your trial ends and nothing is charged unless you choose a plan. Everything you created stays in your account to download.",
  },
  {
    q: "Can I edit what it writes?",
    a: "Yes. Every CV and cover letter opens in an editor before you download it.",
  },
  {
    q: "Who can see my CV?",
    a: "Only you. Your documents are private to your account, and you can delete them at any time.",
  },
];

export default function Home() {
  return (
    <>
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="wordmark" href="#top">Job Search AI</a>
          <nav aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#templates">Templates</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <a className="btn btn-small" href="#pricing">Start free trial</a>
        </div>
      </header>

      <main id="top">
        <section className="hero wrap">
          <div className="hero-copy">
            <h1>Paste a job posting. Get a CV written for it.</h1>
            <p className="lede">
              An AI agent reads what the employer is asking for, then rewrites your CV and
              cover letter to answer it. Using only experience you actually have.
            </p>
            <div className="hero-actions">
              <a className="btn" href="#pricing">Start your 7-day free trial</a>
              <a className="link" href="#how">See how it works</a>
            </div>
            <p className="fine">No card needed to start.</p>
          </div>

          <div className="demo" aria-label="Example: a job posting and the CV tailored to it">
            <article className="sheet posting">
              <p className="sheet-label">The posting</p>
              <h2 className="sheet-title">Senior Product Manager, Payments</h2>
              <p className="sheet-meta">Northwind Bank, Toronto (hybrid)</p>
              <p>
                You will own our merchant onboarding roadmap. We are looking for someone with{" "}
                <mark data-k="1">5+ years leading payments products</mark>, experience working
                with <mark data-k="2">sponsor banks and card networks</mark>, and a track record
                of <mark data-k="3">shipping with multiple engineering teams</mark>.
              </p>
              <p>French is an asset.</p>
            </article>

            <article className="sheet cv">
              <p className="sheet-label">Your tailored CV</p>
              <h2 className="sheet-title">Alex Morgan</h2>
              <p className="sheet-meta">Product Manager, Payments</p>
              <ul>
                <li><span className="tag">1</span>7 years running payments products, most recently a 1,200-merchant portfolio</li>
                <li><span className="tag">2</span>Managed sponsor bank and Visa/Mastercard relationships for card acquiring</li>
                <li><span className="tag">3</span>Set the roadmap for 4 scrum teams through a platform migration</li>
                <li><span className="tag">+</span>Bilingual, English and French</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="how" className="band">
          <div className="wrap">
            <h2 className="section-title">How it works</h2>
            <ol className="steps">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <span className="step-n">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="templates" className="wrap section">
          <div className="section-head">
            <h2 className="section-title">Three templates to start</h2>
            <p>
              Pick one per application. On Pro, upload a CV you like the look of and we will
              match its layout, fonts and colours.
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
            <h2 className="section-title">Pricing</h2>
            <div className="plans">
              {plans.map((p) => (
                <div key={p.name} className={`plan${p.featured ? " plan-featured" : ""}`}>
                  <h3>{p.name}</h3>
                  <p className="price"><span>{p.price}</span> {p.period}</p>
                  <ul>
                    {p.features.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                  <a className={p.featured ? "btn" : "btn btn-ghost"} href="#top">{p.cta}</a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap section faq">
          <h2 className="section-title">Questions</h2>
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
          <span>Job Search AI</span>
          <span>Built by Nicola Delnero with Claude</span>
        </div>
      </footer>
    </>
  );
}
