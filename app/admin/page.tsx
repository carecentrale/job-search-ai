import Link from "next/link";
import { listUsers, overview, requireAdmin } from "@/lib/admin";
import { ACTIVITY_LABEL, ago, daysUntil, when } from "@/lib/describe";

const fmt = (v: number | bigint | string) => Number(v).toLocaleString("en-CA");

function planLabel(u: { key_provider: string | null; plan: string; trial_ends_at: Date }) {
  if (u.key_provider) return { text: `Own ${u.key_provider === "openai" ? "OpenAI" : "Claude"} key`, tone: "good" };
  if (u.plan !== "trial") return { text: u.plan, tone: "good" };
  const days = daysUntil(u.trial_ends_at);
  return days > 0 ? { text: `Free week, ${days}d left`, tone: "neutral" } : { text: "Free week ended", tone: "warn" };
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const [{ users: u, usage, daily, limits }, rows] = await Promise.all([overview(), listUsers(q)]);
  const capPct = limits.total ? Math.min(100, Math.round((usage.house_calls_today / limits.total) * 100)) : 0;
  const maxDay = Math.max(1, ...daily.map((d) => d.house + d.own));

  return (
    <div className="admin-stack">
      <section className="admin-stats" aria-label="Summary">
        <div className="stat"><span>{fmt(u.total)}</span>users<small>{fmt(u.new_7d)} new this week, {fmt(u.active_7d)} active</small></div>
        <div className="stat"><span>{fmt(u.onboarded)}</span>set up<small>CV and brief done</small></div>
        <div className="stat"><span>{fmt(u.own_anthropic + u.own_openai)}</span>own key<small>{fmt(u.own_anthropic)} Claude, {fmt(u.own_openai)} OpenAI</small></div>
        <div className="stat"><span>{fmt(u.in_trial)}</span>free week<small>{fmt(u.trial_ended)} ended without a key</small></div>
        <div className="stat"><span>{fmt(u.written)}</span>written<small>of {fmt(u.applications)} applications started</small></div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Your Claude key today</h2>
          <p className="muted small">Caps: {limits.perUser} per user, {limits.total} overall, per day (Eastern)</p>
        </div>
        <div className="meter" role="img" aria-label={`${usage.house_calls_today} of ${limits.total} requests used today`}>
          <div className={`meter-fill${capPct >= 90 ? " meter-hot" : ""}`} style={{ width: `${capPct}%` }} />
        </div>
        <p className="small">
          <strong>{fmt(usage.house_calls_today)}</strong> of {fmt(limits.total)} requests today ({fmt(usage.house_tokens_today)} tokens).
          This month: {fmt(usage.house_calls_month)} request{usage.house_calls_month === 1 ? "" : "s"}, {fmt(usage.house_in_month)} input and {fmt(usage.house_out_month)} output tokens on your key.
          Users&apos; own keys made {fmt(usage.own_calls_month)} request{usage.own_calls_month === 1 ? "" : "s"} this month, at their cost.
        </p>
        {daily.length > 0 && (
          <div className="spark" aria-label="Requests per day, last 14 days">
            {daily.map((d) => (
              <div key={d.day} className="spark-col" title={`${d.day}: ${d.house} on your key, ${d.own} on users' keys`}>
                <div className="spark-own" style={{ height: `${(d.own / maxDay) * 100}%` }} />
                <div className="spark-house" style={{ height: `${(d.house / maxDay) * 100}%` }} />
                <span>{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
        {daily.length > 0 && <p className="muted small legend"><i className="dot dot-house" /> your key <i className="dot dot-own" /> users&apos; own keys</p>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Users</h2>
          <form className="admin-search" role="search">
            <label htmlFor="q" className="sr-only">Search users</label>
            <input id="q" name="q" defaultValue={q} placeholder="Search by email or user id" />
            <button className="btn btn-small" type="submit">Search</button>
          </form>
        </div>
        {rows.length === 0 ? (
          <p className="muted">{q ? "No users match that search." : "No users yet. They'll appear here as soon as someone signs up."}</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th><th>Plan</th><th>Looking for</th><th className="num">Shortlist</th><th className="num">Apps</th><th className="num">Written</th>
                  <th className="num">Your key today</th><th>Last activity</th><th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const plan = planLabel(r);
                  return (
                    <tr key={r.user_id}>
                      <td><Link href={`/admin/users/${encodeURIComponent(r.user_id)}`}>{r.email ?? r.user_id}</Link>{!r.has_cv && <span className="pill pill-muted">no CV</span>}</td>
                      <td><span className={`pill pill-${plan.tone}`}>{plan.text}</span></td>
                      <td className="clip">{r.roles.length ? r.roles.join(", ") : <span className="muted">not set</span>}</td>
                      <td className="num">{r.matches}</td>
                      <td className="num">{r.applications}</td>
                      <td className="num">{r.written}</td>
                      <td className="num">{r.house_calls_today}/{limits.perUser}</td>
                      <td>{r.last_activity ? <>{ACTIVITY_LABEL[r.last_activity] ?? r.last_activity} <span className="muted">{ago(r.last_activity_at)}</span></> : <span className="muted">seen {ago(r.last_seen_at)}</span>}</td>
                      <td className="muted">{when(r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
