import Link from "next/link";
import { recentActivity, requireAdmin } from "@/lib/admin";
import { ACTIVITY_LABEL, describe, when } from "@/lib/describe";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireAdmin();
  const { type } = await searchParams;
  const valid = type && type in ACTIVITY_LABEL ? type : undefined;
  const rows = await recentActivity({ type: valid, limit: 300 });

  return (
    <section className="panel">
      <div className="panel-head">
        <h1>Activity</h1>
        <p className="muted small">Latest 300 events, newest first. Times are Eastern.</p>
      </div>
      <nav className="chips" aria-label="Filter by event">
        <Link href="/admin/activity" className={!valid ? "on" : ""}>Everything</Link>
        {Object.entries(ACTIVITY_LABEL).map(([k, label]) => (
          <Link key={k} href={`/admin/activity?type=${k}`} className={valid === k ? "on" : ""}>{label}</Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="muted">Nothing yet. Events appear as people use fuzzyHR.</p>
      ) : (
        <ol className="feed">
          {rows.map((r) => (
            <li key={r.id} className={`feed-${r.type}`}>
              <time dateTime={new Date(r.at).toISOString()}>{when(r.at)}</time>
              <div>
                <p>
                  <Link href={`/admin/users/${encodeURIComponent(r.user_id)}`}>{r.email ?? r.user_id}</Link>{" "}
                  <span className="pill pill-muted">{ACTIVITY_LABEL[r.type] ?? r.type}</span>
                </p>
                <p className="small">{describe(r.type, r.detail)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
