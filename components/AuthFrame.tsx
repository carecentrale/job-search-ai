import Link from "next/link";
import type { ReactNode } from "react";
import { getT } from "@/lib/locale";
import { LanguageSwitch } from "@/components/I18n";

/** The green band and copy around Clerk's sign-in and sign-up forms. */
export default async function AuthFrame({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  const { t } = await getT();
  return (
    <div className="auth">
      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="wordmark" href="/">fuzzyHR</Link>
          <LanguageSwitch className="nav-lang" />
        </div>
      </header>
      <main className="hero-band auth-band">
        <div className="wrap auth-inner">
          <div className="auth-copy">
            <h1>{title}</h1>
            <p className="lede">{lede}</p>
          </div>
          <div className="auth-form">
            {children}
            <p className="auth-legal">
              {t("By continuing, you agree to the")} <Link href="/terms">{t("Terms of Use")}</Link> {t("and the")} <Link href="/privacy">{t("Privacy Policy")}</Link>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
