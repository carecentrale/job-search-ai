import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/LegalPage";
import { LanguageSwitch } from "@/components/I18n";
import { RELEASES } from "@/lib/changelog";
import { intlLocale } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  return (await getLocale()) === "fr"
    ? { title: "Nouveautés · fuzzyHR", description: "Ce qui a changé dans chaque version de fuzzyHR." }
    : { title: "What's new · fuzzyHR", description: "What changed in each version of fuzzyHR." };
}

export default async function WhatsNew() {
  const { t, locale } = await getT();
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(intlLocale(locale), { year: "numeric", month: "long", day: "numeric" });
  return (
    <>
      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="wordmark" href="/">fuzzyHR</Link>
          <LanguageSwitch className="nav-lang" />
        </div>
      </header>
      <main className="wrap legal changelog">
        <h1>{t("What's new")}</h1>
        <p className="muted">{t("What changed in each version of fuzzyHR, newest first.")}</p>
        <ol className="releases">
          {RELEASES.map((r, i) => {
            const notes = locale === "fr" ? r.fr : r.en;
            return (
              <li key={r.version} id={`v${r.version}`}>
                <p className="release-meta">
                  <span className="release-version">{t("Version {v}", { v: r.version })}</span>
                  {i === 0 && <span className="pill pill-good">{t("Current")}</span>}
                  <time dateTime={r.date}>{fmt(r.date)}</time>
                </p>
                <h2>{notes.title}</h2>
                <ul>{notes.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </li>
            );
          })}
        </ol>
      </main>
      <SiteFooter />
    </>
  );
}
