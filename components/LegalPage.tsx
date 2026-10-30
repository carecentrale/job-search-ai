import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitch } from "@/components/I18n";
import { LEGAL } from "@/lib/legal";
import { getT } from "@/lib/locale";

/** Shared frame for the Privacy Policy and Terms of Use. */
export default async function LegalPage({ title, summary, children }: { title: string; summary: ReactNode; children: ReactNode }) {
  const { t, locale } = await getT();
  return (
    <>
      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="wordmark" href="/">fuzzyHR</Link>
          <nav className="legal-nav" aria-label={t("Legal")}>
            <Link href="/privacy">{t("Privacy")}</Link>
            <Link href="/terms">{t("Terms")}</Link>
          </nav>
          <LanguageSwitch />
        </div>
      </header>
      <main className="wrap legal" lang={locale === "fr" ? "fr-CA" : "en"}>
        <h1>{title}</h1>
        <p className="muted small">
          {t("Effective {date}.", { date: locale === "fr" ? LEGAL.effectiveFr : LEGAL.effective })}
          {LEGAL.contactEmail ? <> {t("Questions:")} <ContactEmail /></> : null}
        </p>
        <div className="legal-summary">{summary}</div>
        <article className="legal-body">{children}</article>
      </main>
      <SiteFooter />
    </>
  );
}

/** The contact email as a link, or a placeholder until one is set in lib/legal.ts. */
export async function ContactEmail() {
  const { t } = await getT();
  if (!LEGAL.contactEmail) return <span>{t("our contact email (coming soon; it will be posted here)")}</span>;
  return <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;
}

export async function SiteFooter() {
  const { t } = await getT();
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span>fuzzyHR</span>
        <nav className="footer-links" aria-label={t("Legal")}>
          <Link href="/privacy">{t("Privacy")}</Link>
          <Link href="/terms">{t("Terms")}</Link>
          {LEGAL.contactEmail ? <a href={`mailto:${LEGAL.contactEmail}`}>{t("Contact")}</a> : null}
        </nav>
        <span>{t("Built by Nicola Delnero with Claude")}</span>
      </div>
    </footer>
  );
}
