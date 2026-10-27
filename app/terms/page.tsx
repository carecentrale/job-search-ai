import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { ContactEmail } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Use · fuzzyHR", description: "The rules for using fuzzyHR, the AI personal headhunter." };

const mail = <ContactEmail />;

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Use"
      summary={
        <ul>
          <li>{LEGAL.product} helps you find jobs and prepare applications. You decide what to send, and you send it yourself.</li>
          <li>AI writing can be wrong. Read everything before you use it, and keep it truthful.</li>
          <li>You own your CV and your documents. Use the service fairly: no spam applications, scraping, or other people&apos;s data.</li>
          <li>We can&apos;t promise interviews or jobs. If you live in Quebec or elsewhere with consumer protection laws, you keep all the rights those laws give you.</li>
        </ul>
      }
    >
      <h2>1. These terms</h2>
      <p>
        These Terms of Use are an agreement between you and {LEGAL.operator}, who operates {LEGAL.product} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using {LEGAL.product}, you agree to them and to our <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use the service.
      </p>
      <p>
        You must be at least {LEGAL.minimumAge}. If you&apos;re under the age of majority where you live, you need a parent or guardian&apos;s permission. You must give accurate sign-up information and keep your sign-in secure. You&apos;re responsible for what happens in your account.
      </p>

      <h2>2. What {LEGAL.product} does, and doesn&apos;t do</h2>
      <p>
        {LEGAL.product} is a tool for job seekers. It reads public job postings, scores and recommends them against your brief and CV, tracks your applications, reminds you to follow up, and uses AI to draft tailored CVs and cover letters.
      </p>
      <ul>
        <li>We are <strong>not an employer, recruiter, staffing or employment agency</strong>. We don&apos;t represent you to employers, and we aren&apos;t paid by them.</li>
        <li>We <strong>never submit applications</strong> or contact employers for you. That includes Autopilot. You choose what to send, and you send it yourself.</li>
        <li>We <strong>don&apos;t guarantee</strong> interviews, offers, or that any posting is accurate, still open, or legitimate.</li>
        <li>Our recommendations and documents are <strong>not career, legal, immigration or financial advice</strong>.</li>
      </ul>

      <h2>3. AI-generated content</h2>
      <p>
        {LEGAL.product} uses AI models from Anthropic and OpenAI. We instruct them to use only facts from your CV and to list gaps instead of inventing experience, but AI can still make mistakes. It can misread your CV, misjudge a fit, or phrase something inaccurately. You agree to:
      </p>
      <ul>
        <li>read and correct every CV and cover letter before you use it;</li>
        <li>send only information that is true about you;</li>
        <li>follow any rules an employer sets about using AI in applications.</li>
      </ul>
      <p>You are responsible for the applications you send.</p>

      <h2>4. Autopilot</h2>
      <p>
        Autopilot is off unless you switch it on. When it&apos;s on, {LEGAL.product} approves roles the AI recommends at or above the fit score you choose, up to your daily limit, and writes their CV and cover letter. It acts on your instructions, and you can switch it off at any time. It never submits anything. Each approval counts toward your plan&apos;s limits, and with your own AI key, your provider charges you for the writing.
      </p>

      <h2>5. Plans, your own AI key, and limits</h2>
      <ul>
        <li><strong>Free week.</strong> New accounts get 7 days with AI on our account, including up to 5 tailored applications and daily request limits. These limits can change.</li>
        <li><strong>Your own key.</strong> If you add your own Anthropic or OpenAI API key, {LEGAL.product} is free for you, and your provider bills you directly for the AI you use. You&apos;re responsible for those charges and for following your provider&apos;s terms. We recommend setting a spending limit with your provider. You can remove your key at any time.</li>
        <li>
          <strong>Personal plan.</strong> A monthly subscription, in Canadian or U.S. dollars, at the price shown before you pay. Taxes are included in that price. It includes the number of tailored applications and daily AI requests shown on your Plan page. Unused allowances don&apos;t carry over.
        </li>
        <li>
          <strong>Billing and renewal.</strong> Payments are processed by Stripe. We never see or store your full card number. Your subscription renews automatically each month on the date you signed up, until you cancel. If a payment fails, Stripe retries it for a short period, and your plan may end if it can&apos;t be collected.
        </li>
        <li>
          <strong>Cancelling.</strong> You can cancel any time under <em>Plan → Manage billing</em>. Cancelling stops the next renewal, and you keep Personal until the end of the month you&apos;ve paid for. We don&apos;t give partial refunds for the rest of a month, except where the law requires it. If something went wrong, contact us and we&apos;ll look at it.
        </li>
        <li>
          <strong>Price changes.</strong> We&apos;ll tell you at least 30 days before a price change applies to your subscription, and you can cancel before it does.
        </li>
      </ul>
      <p>We may change or stop free features, with notice in the app where practical.</p>

      <h2>6. Your content</h2>
      <p>
        Your CV, brief, notes and the documents generated for you are yours. You give us permission to store, process and send them to our service providers (see the <Link href="/privacy">Privacy Policy</Link>) only as needed to run {LEGAL.product} for you. This permission ends when you delete them or your account. You confirm you have the right to upload what you upload. Don&apos;t upload someone else&apos;s CV or personal information without their permission.
      </p>

      <h2>7. Job listings and other sites</h2>
      <p>
        Job postings come from third parties: companies&apos; own job boards, job search sites such as Adzuna and Jooble, and links you add. They belong to their owners. We don&apos;t verify them and aren&apos;t responsible for their content, or for the sites you reach through them. Watch for scams: real employers don&apos;t ask you to pay to apply or for banking details before an offer.
      </p>

      <h2>8. Fair use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use {LEGAL.product} to send spam or mass, untargeted applications, or to impersonate anyone;</li>
        <li>scrape, copy or resell job data or other content from {LEGAL.product};</li>
        <li>get around usage limits, for example with multiple free accounts, or interfere with the service or its security;</li>
        <li>reverse engineer the service, or use it to build a competing product;</li>
        <li>upload malware, or content that is unlawful, discriminatory or infringes someone&apos;s rights;</li>
        <li>use it in a way that breaks the law, your AI provider&apos;s usage policies, or a job site&apos;s terms.</li>
      </ul>

      <h2>9. Ending your account</h2>
      <p>
        You can delete your account at any time under <em>Plan → Delete my account</em>. We may suspend or close accounts that break these terms or put the service or others at risk. Where it&apos;s reasonable, we&apos;ll tell you why first. We may also discontinue {LEGAL.product}; if we do, we&apos;ll give you at least 30 days&apos; notice, where possible, to download your data.
      </p>

      <h2>10. Disclaimers and liability</h2>
      <p>
        We work hard to keep {LEGAL.product} useful and available, but it&apos;s provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we don&apos;t give warranties beyond those in these terms, and we&apos;re not liable for indirect or consequential losses such as lost opportunities, lost earnings or lost data. Our total liability for any claim is limited to the greater of what you paid us in the 12 months before the claim and CA$100.
      </p>
      <p>
        <strong>Nothing in these terms limits rights you have under consumer protection laws that can&apos;t be waived.</strong> That includes Quebec&apos;s <em>Consumer Protection Act</em> and the <em>Civil Code of Québec</em>, which do not allow us to exclude liability for our own fault or certain warranties. If you live in Quebec or elsewhere with such laws, the limits above apply only as far as those laws permit.
      </p>

      <h2>11. Governing law and disputes</h2>
      <p>
        These terms are governed by the laws of {LEGAL.province} and the federal laws of {LEGAL.country} that apply there. Disputes go to the courts of the judicial district of {LEGAL.city}. If you&apos;re a consumer, you can also bring a claim in the courts where you live, and the mandatory consumer laws of your home province or state still apply. There is no mandatory arbitration, and nothing here stops you from taking part in a class action. Please contact us first at {mail}. Most problems can be solved quickly.
      </p>

      <h2>12. Changes to these terms</h2>
      <p>
        We may update these terms. For significant changes, we&apos;ll notify you in the app or by email at least 30 days before they take effect. The notice will show the new version, what changes, and how to refuse the change by closing your account. Using {LEGAL.product} after that date means you accept them.
      </p>

      <h2>13. Contact</h2>
      <p>{LEGAL.operator}, {LEGAL.product}, {LEGAL.city}, {LEGAL.province}, {LEGAL.country}. Email: {mail}.</p>
    </LegalPage>
  );
}
