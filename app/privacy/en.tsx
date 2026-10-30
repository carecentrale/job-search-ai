import Link from "next/link";
import LegalPage, { ContactEmail } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";


const mail = <ContactEmail />;

export function PrivacyEn() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary={
        <ul>
          <li>We use your CV and brief only to find jobs for you and write your applications.</li>
          <li>We don&apos;t sell your data, show you ads, or share it with employers or recruiters. Nothing is sent to an employer unless you send it yourself.</li>
          <li>If you subscribe, Stripe handles your payment. We never see your card number.</li>
          <li>To write and review, we send your CV, brief and job postings to an AI provider: Anthropic, or OpenAI if you add an OpenAI key. We don&apos;t use your data to train AI models.</li>
          <li>Your data is stored in the United States. You can download it or delete your account at any time from <strong>Plan</strong> in your workspace.</li>
        </ul>
      }
    >
      <h2>1. Who we are</h2>
      <p>
        {LEGAL.product} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a personal job-search assistant run by {LEGAL.operator}, based in {LEGAL.city}, {LEGAL.province}, {LEGAL.country}. This policy covers {LEGAL.site.replace("https://", "")} and the {LEGAL.product} workspace.
      </p>
      <p>
        The person in charge of protecting personal information at {LEGAL.product} is {LEGAL.privacyOfficer}. You can reach them at {mail} with any question, request or complaint about your personal information.
      </p>
      <p>
        This policy is written to meet Canada&apos;s <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA), Quebec&apos;s <em>Act respecting the protection of personal information in the private sector</em> (as amended by Law 25), and the privacy laws of U.S. states that apply to us.
      </p>

      <h2>2. What we collect</h2>
      <table className="legal-table">
        <thead><tr><th>What</th><th>Where it comes from</th><th>Why</th></tr></thead>
        <tbody>
          <tr><td>Your name, email address and sign-in details</td><td>You, when you sign up, through our sign-in provider Clerk (including Google sign-in, if you use it)</td><td>To create and secure your account</td></tr>
          <tr><td>Your CV, in full</td><td>You, when you upload or paste it</td><td>To suggest your brief, match jobs to you, and write tailored CVs and cover letters</td></tr>
          <tr><td>Your brief: roles you want, strengths, cities, remote preference, things to avoid</td><td>You, or suggested by the AI from your CV for you to edit</td><td>To decide which jobs to show you</td></tr>
          <tr><td>Your shortlist, passed jobs, tracker, notes, interview dates, followed companies and job links you add</td><td>You, and our daily hunt</td><td>To run your job search and remind you to follow up</td></tr>
          <tr><td>CVs, cover letters, AI reviews and fit scores we generate</td><td>Our AI providers, working from your information</td><td>So you can review, edit and use them</td></tr>
          <tr><td>Billing details, if you subscribe: your plan, currency, subscription status, renewal date, and any pause. If you tell us you got a job, the company and role you choose</td><td>You, through Stripe&apos;s checkout. Your card details go straight to Stripe; we never see or store your card number</td><td>To provide and bill the Personal plan</td></tr>
          <tr><td>Your own AI key, if you add one</td><td>You</td><td>To run the AI on your account. It is encrypted (AES-256-GCM) and never shown again; we display only its last 4 characters</td></tr>
          <tr><td>An activity log: what you did in the app and when (for example &ldquo;uploaded a CV&rdquo;, &ldquo;approved a job&rdquo;), which workspace screens and documents you opened, plus counts of AI requests and tokens</td><td>Recorded automatically as you use the app</td><td>To enforce free-week limits, support you, prevent abuse, and understand how the product is used</td></tr>
          <tr><td>Technical data: IP address, browser and device type, and request logs</td><td>Recorded automatically by our hosting and sign-in providers</td><td>Security, fraud prevention and keeping the service running</td></tr>
          <tr><td>Your country and province or state, from your IP address</td><td>Our hosting provider, on each visit</td><td>To show the site in French in Quebec, show the Personal plan&apos;s price in your currency and check it&apos;s available where you are. We don&apos;t store them, except the country recorded when you start a checkout</td></tr>
          <tr><td>Your language choice</td><td>You, with the EN/FR switch, kept in a cookie on your device and saved with your account</td><td>To show the site in your language and have the AI write its reviews in it</td></tr>
          <tr><td>Anonymous visit statistics: pages visited, the site that referred you, country, browser and device type</td><td>Vercel Web Analytics, on every page except the admin area</td><td>To see how many people visit and which pages are useful. These statistics aren&apos;t linked to your account</td></tr>
        </tbody>
      </table>
      <p>
        We don&apos;t ask for, and you shouldn&apos;t include in your CV, sensitive details that employers don&apos;t need: government ID or social insurance numbers, date of birth, health information, photos, or banking details. If your CV contains them, they&apos;re processed like the rest of your CV.
      </p>
      <p>
        The demo at <Link href="/app">/app</Link>, used without signing in, keeps everything in your own browser and sends nothing to us.
      </p>

      <h2>3. Cookies and similar technology</h2>
      <p>
        We use only the cookies needed to keep you signed in, set by Clerk, and one that remembers your language choice. We don&apos;t use advertising cookies or any technology that profiles you for marketing.
      </p>
      <p>
        We count visits with Vercel Web Analytics, which uses no cookies and doesn&apos;t identify you. It recognizes repeat requests within a day from a temporary code made from your request, which is discarded after 24 hours. It sees only aggregate numbers, never your CV or account details. Inside your workspace, we also record which screens you open, as part of the activity log described in section 2. The site loads its fonts from Google Fonts, so Google receives your IP address when the page loads.
      </p>

      <h2>4. How the AI uses your information</h2>
      <p>
        {LEGAL.product} uses artificial intelligence in four ways. Each one sends your CV, your brief, and the text of the job posting to the AI provider:
      </p>
      <ul>
        <li><strong>Suggesting your brief</strong> from your CV, for you to edit.</li>
        <li><strong>Reviewing matches.</strong> Our system first scores postings by keywords from your brief: job titles, strengths, cities, remote and things to avoid. The AI then reads the best matches against your CV and labels each one Recommended, Worth a look or Skip, with a fit score from 0 to 100 and its reasons.</li>
        <li><strong>Writing a tailored CV and cover letter</strong> for a job, using only facts in your CV. It lists gaps instead of inventing experience.</li>
        <li><strong>Reading a job page</strong> you paste, when the page has no structured job data.</li>
      </ul>
      <p>
        These are recommendations to you, not decisions about you. You choose what to approve, and nothing is ever sent to an employer by us. If you switch on <strong>Autopilot</strong>, we approve roles the AI recommends above the fit score and daily limit you set, and write their documents, on your instruction. You can switch it off at any time. You can ask us what information and which factors led to any recommendation, and correct the information in your CV or brief whenever you like.
      </p>
      <p>
        <strong>Which AI provider.</strong> If you haven&apos;t added your own key, we use Anthropic&apos;s Claude on our account. If you add a Claude key, Anthropic processes your requests on your account. If you add an OpenAI key, OpenAI does. We use their business API services, not their consumer chat apps. According to their published business terms, Anthropic and OpenAI don&apos;t use API data to train their models by default, and they keep it for a limited period for safety and abuse monitoring. See the <a href="https://www.anthropic.com/legal/commercial-terms" target="_blank" rel="noopener noreferrer">Anthropic commercial terms</a> and <a href="https://openai.com/policies/business-terms/" target="_blank" rel="noopener noreferrer">OpenAI business terms</a>. We don&apos;t train any AI models on your information.
      </p>
      <p>AI output can be wrong. Always read your CV and cover letter before you send them.</p>

      <h2>5. Who we share it with</h2>
      <p>We don&apos;t sell or rent personal information, and we don&apos;t &ldquo;share&rdquo; it for cross-context behavioural advertising. We share it only with the service providers that run {LEGAL.product}, each bound by contract to protect it and use it only to provide their service to us:</p>
      <table className="legal-table">
        <thead><tr><th>Provider</th><th>What they do</th><th>Location</th></tr></thead>
        <tbody>
          <tr><td>Vercel</td><td>Hosts the website and app, and counts anonymous visits (Web Analytics)</td><td>United States</td></tr>
          <tr><td>Neon</td><td>Stores your account data (database)</td><td>United States</td></tr>
          <tr><td>Clerk</td><td>Sign-up, sign-in and account security</td><td>United States</td></tr>
          <tr><td>Anthropic</td><td>AI reviewing and writing (Claude)</td><td>United States</td></tr>
          <tr><td>OpenAI</td><td>AI reviewing and writing, only if you add an OpenAI key</td><td>United States</td></tr>
          <tr><td>Stripe</td><td>Payments and subscriptions for the Personal plan (receives your email, payment details and billing address)</td><td>United States</td></tr>
          <tr><td>Google Fonts</td><td>Website fonts (receives your IP address only)</td><td>United States</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Job sources.</strong> To find jobs we read public job boards (Greenhouse, Lever, Ashby, Recruitee) and, when enabled, search Adzuna and Jooble. Those searches send only job titles and city names from your brief, never your name, email or CV. When you paste a link, our server visits that page to read it.
      </p>
      <p>
        We may also disclose information if the law requires it, to protect someone&apos;s safety, or as part of a sale or reorganization of {LEGAL.product}. In a sale, the buyer would have to keep honouring this policy.
      </p>

      <h2>6. Storage outside Quebec and Canada</h2>
      <p>
        Your information is stored and processed in the United States by the providers above. As Quebec law requires, before sending personal information outside Quebec we assess whether it will be adequately protected, taking into account each provider&apos;s contract terms and security practices, and we review that assessment when our providers change. While it&apos;s in the U.S., it may be accessible to authorities there under U.S. law.
      </p>

      <h2>7. How long we keep it</h2>
      <p>
        We keep your information while your account is open. When you delete your account, your profile, CV, brief, applications, documents, saved key, briefings, usage records and activity log are deleted right away. Deleting your account also cancels any subscription. Stripe keeps payment and invoice records for as long as tax and accounting laws require. Backups held by our database provider expire on their normal cycle, within 30 days. We keep one record that an account was deleted, with no personal details. Request logs at our hosting and sign-in providers expire on their own schedules.
      </p>

      <h2>8. How we protect it</h2>
      <p>
        All traffic uses encrypted HTTPS connections. Saved AI keys are encrypted with a key held separately from the database. Only the site owner can see account data, through an admin area protected by sign-in, and only to run and support the service. We use reputable providers with their own security programs. If a breach puts you at risk of serious harm, we will notify you and the relevant regulators as the law requires. That means Quebec&apos;s Commission d&apos;accès à l&apos;information, the Office of the Privacy Commissioner of Canada, and U.S. state authorities where applicable.
      </p>

      <h2>9. Your rights</h2>
      <p>Wherever you live, you can:</p>
      <ul>
        <li><strong>See and download</strong> your information: <em>Plan → Download my data</em> gives you a structured file (JSON) of everything we store about you.</li>
        <li><strong>Correct</strong> it: edit your CV and brief at any time under <em>Your brief</em>, or ask us.</li>
        <li><strong>Delete</strong> it: <em>Plan → Delete my account</em> deletes your account and data immediately.</li>
        <li><strong>Withdraw consent</strong> to any use, for example by switching off Autopilot or removing your AI key, or by deleting your account.</li>
        <li><strong>Ask about automated recommendations</strong>: what information and factors produced them (see section 4).</li>
        <li><strong>Complain</strong>: write to {mail} first, and we&apos;ll answer within 30 days. You can also contact Quebec&apos;s <a href="https://www.cai.gouv.qc.ca/" target="_blank" rel="noopener noreferrer">Commission d&apos;accès à l&apos;information</a>, the <a href="https://www.priv.gc.ca/" target="_blank" rel="noopener noreferrer">Office of the Privacy Commissioner of Canada</a>, or, in the U.S., your state attorney general or privacy agency.</li>
      </ul>
      <p>
        <strong>U.S. residents.</strong> Depending on your state (for example California, Colorado, Connecticut, Virginia, Texas, Oregon and others), you may have the right to know what we collect, access, correct, delete and port your data, and to opt out of the sale of data, targeted advertising and profiling that produces legal or similarly significant effects. We don&apos;t sell data, do targeted advertising, or make such decisions about you. California residents: the categories we collect are listed in section 2, the sources in section 2, the purposes in sections 2 and 4, and the recipients in section 5. We will not treat you differently for using your rights. You can use an authorized agent; we may ask you to confirm your identity from your account email.
      </p>

      <h2>10. Age</h2>
      <p>{LEGAL.product} is for people {LEGAL.minimumAge} and older. We don&apos;t knowingly collect information from anyone younger. If you believe a child has signed up, write to {mail} and we&apos;ll delete the account.</p>

      <h2>11. Changes</h2>
      <p>If we change this policy, we&apos;ll update the date at the top. For significant changes, we&apos;ll tell you in the app or by email before they take effect.</p>

      <h2>12. Contact</h2>
      <p>{LEGAL.privacyOfficer}, Person in charge of the protection of personal information, {LEGAL.product}, {LEGAL.city}, {LEGAL.province}, {LEGAL.country}. Email: {mail}.</p>
    </LegalPage>
  );
}
