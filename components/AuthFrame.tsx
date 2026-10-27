import Link from "next/link";
import type { ReactNode } from "react";

/** The green band and copy around Clerk's sign-in and sign-up forms. */
export default function AuthFrame({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <div className="auth">
      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="wordmark" href="/">fuzzyHR</Link>
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
              By continuing, you agree to the <Link href="/terms">Terms of Use</Link> and <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
