import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "fuzzyHR admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const admin = await requireAdmin();
  return (
    <div className="admin">
      <header className="ws-top">
        <div className="wrap ws-top-inner">
          <Link className="wordmark" href="/admin">fuzzyHR admin</Link>
          <nav className="ws-tabs" aria-label="Admin">
            <Link href="/admin">Overview and users</Link>
            <Link href="/admin/activity">Activity</Link>
            <Link href="/admin/billing">Payments</Link>
            <Link href="/app">Your workspace</Link>
          </nav>
          <span className="admin-who">{admin.email ?? "owner"}</span>
        </div>
      </header>
      <main className="wrap admin-main">{children}</main>
    </div>
  );
}
