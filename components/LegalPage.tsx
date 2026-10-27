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
        <p className="muted small">Effective {LEGAL.effective}. Questions: <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a></p>
        <div className="legal-summary">{summary}</div>
        <article className="legal-body">{children}</article>
      </main>
      <SiteFooter />
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span>fuzzyHR</span>
        <nav className="footer-links" aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={`mailto:${LEGAL.contactEmail}`}>Contact</a>
        </nav>
        <span>Built by Nicola Delnero with Claude</span>
      </div>
    </footer>
  );
}
