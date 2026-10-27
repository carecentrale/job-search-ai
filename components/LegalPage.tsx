import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL } from "@/lib/legal";

/** Shared frame for the Privacy Policy and Terms of Use. */
export default function LegalPage({ title, summary, children }: { title: string; summary: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="wordmark" href="/">fuzzyHR</Link>
          <nav className="legal-nav" aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </header>
      <main className="wrap legal">
        <h1>{title}</h1>
        <p className="muted small">Effective {LEGAL.effective}.{LEGAL.contactEmail ? <> Questions: <ContactEmail /></> : null}</p>
        <div className="legal-summary">{summary}</div>
        <article className="legal-body">{children}</article>
      </main>
      <SiteFooter />
    </>
  );
}

/** The contact email as a link, or a placeholder until one is set in lib/legal.ts. */
export function ContactEmail() {
  if (!LEGAL.contactEmail) return <span>our contact email (coming soon; it will be posted here)</span>;
  return <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span>fuzzyHR</span>
        <nav className="footer-links" aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          {LEGAL.contactEmail ? <a href={`mailto:${LEGAL.contactEmail}`}>Contact</a> : null}
        </nav>
        <span>Built by Nicola Delnero with Claude</span>
      </div>
    </footer>
  );
}
