import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, userDetail } from "@/lib/admin";
import { ACTIVITY_LABEL, ago, daysUntil, describe, when } from "@/lib/describe";

const fmt = (v: number | bigint | string) => Number(v).toLocaleString("en-CA");

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const data = await userDetail(decodeURIComponent(id));
  if (!data) notFound();
  const { user: u, usage, briefings, activity } = data;
  const trialDays = daysUntil(u.trial_ends_at);
  const totals = usage.reduce(
    (t, r) => {
      const k = r.source === "own" ? "own" : "house";
      t[k].calls += r.calls;
      t[k].tokens += Number(r.input_tokens) + Number(r.output_tokens);
      return t;
    },
    { house: { calls: 0, tokens: 0 }, own: { calls: 0, tokens: 0 } },
  );

  return (
    <div className="admin-stack">
      <p><Link href="/admin" className="textbtn small">All users</Link></p>

      <section className="panel">
        <h1>{u.email ?? "No email"}</h1>
        <dl className="facts">
          <div><dt>User id</dt><dd className="mono">{u.user_id}</dd></div>
          <div><dt>Joined</dt><dd>{when(u.created_at)}</dd></div>
          <div><dt>Last seen</dt><dd>{ago(u.last_seen_at)}</dd></div>
          <div>
            <dt>Plan</dt>
            <dd>
              {u.key_provider
                ? `Own ${u.key_provider === "openai" ? "OpenAI" : "Claude"} key …${u.key_last4 ?? ""} (${u.key_model ?? "default model"}), added ${when(u.key_added_at)}`
                : u.plan !== "trial"
                  ? u.plan
                  : trialDays > 0
                    ? `Free week, ${trialDays} days left`
                    : `Free week ended ${when(u.trial_ends_at)}`}
            </dd>
          </div>
          <div><dt>Shortlist</dt><dd>{u.matches} roles, {u.passed} passed on</dd></div>
          <div><dt>Last hunt</dt><dd>{ago(u.last_hunt_at)}</dd></div>
          <div><dt>Your key, all time</dt><dd>{fmt(totals.house.calls)} request{totals.house.calls === 1 ? "" : "s"}, {fmt(totals.house.tokens)} tokens</dd></div>
          <div><dt>Their own key, all time</dt><dd>{fmt(totals.own.calls)} request{totals.own.calls === 1 ? "" : "s"}, {fmt(totals.own.tokens)} tokens</dd></div>
        </dl>
      </section>

      <div className="admin-two">
        <section className="panel">
          <h2>Brief</h2>
          {u.brief && u.brief.targetTitles.length ? (
            <dl className="facts facts-tight">
              <div><dt>Name</dt><dd>{u.brief.name || "—"}</dd></div>
              <div><dt>Roles</dt><dd>{u.brief.targetTitles.join(", ")}</dd></div>
              <div><dt>Strengths</dt><dd>{u.brief.skills.join(", ") || "—"}</dd></div>
              <div><dt>Cities</dt><dd>{u.brief.locations.join(", ") || "—"}{u.brief.remoteOk ? ", remote OK" : ""}</dd></div>
              <div><dt>Never show</dt><dd>{u.brief.avoid.join(", ") || "—"}</dd></div>
            </dl>
          ) : (
            <p className="muted">Not set yet.</p>
          )}
        </section>
        <section className="panel">
          <h2>CV</h2>
          {u.cv_text ? (
            <details>
              <summary className="small">{fmt(u.cv_text.length)} characters. Show the text</summary>
              <pre className="cv-text">{u.cv_text}</pre>
            </details>
          ) : (
            <p className="muted">No CV yet.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Applications ({u.applications.length})</h2>
        {u.applications.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Company</th><th>Role</th><th className="num">Fit</th><th>Status</th><th>Started</th><th>Applied</th><th>Written</th><th>Note</th></tr></thead>
              <tbody>
                {u.applications.map((a) => (
                  <tr key={a.id}>
                    <td>{a.job.url && a.job.url !== "#" ? <a href={a.job.url} target="_blank" rel="noopener noreferrer">{a.job.company}</a> : a.job.company}</td>
                    <td className="clip">{a.job.title}</td>
                    <td className="num">{a.job.fit}</td>
                    <td><span className="pill pill-muted">{a.status}</span></td>
                    <td className="muted">{when(a.createdAt)}</td>
                    <td className="muted">{a.appliedAt ? when(a.appliedAt) : "—"}</td>
                    <td>{a.tailored ? `${a.writes ?? 1}× (${a.tailored.model})` : "—"}</td>
                    <td className="clip">{a.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="admin-two">
        <section className="panel">
          <h2>AI usage by day</h2>
          {usage.length === 0 ? (
            <p className="muted">No AI requests yet.</p>
          ) : (
            <div className="table-wrap"><table className="admin-table">
              <thead><tr><th>Day</th><th>Key</th><th className="num">Requests</th><th className="num">Tokens in</th><th className="num">Tokens out</th></tr></thead>
              <tbody>
                {usage.map((r) => (
                  <tr key={r.day + r.source}>
                    <td>{r.day}</td><td>{r.source === "own" ? "theirs" : "yours"}</td>
                    <td className="num">{r.calls}</td><td className="num">{fmt(r.input_tokens)}</td><td className="num">{fmt(r.output_tokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </section>
        <section className="panel">
          <h2>Briefings</h2>
          {briefings.length === 0 ? (
            <p className="muted">No hunts yet.</p>
          ) : (
            <div className="table-wrap"><table className="admin-table">
              <thead><tr><th>Date</th><th className="num">Read</th><th className="num">Matches</th><th className="num">Reminders</th></tr></thead>
              <tbody>
                {briefings.map((b) => (
                  <tr key={b.date}>
                    <td>{b.date}</td><td className="num">{fmt(b.data.postingsRead)}</td><td className="num">{b.data.newMatches.length}</td><td className="num">{b.data.nudges.length}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Activity ({activity.length})</h2>
        {activity.length === 0 ? (
          <p className="muted">Nothing recorded yet. Activity logging started on October 27, 2026.</p>
        ) : (
          <ol className="feed">
            {activity.map((r) => (
              <li key={r.id} className={`feed-${r.type}`}>
                <time dateTime={new Date(r.at).toISOString()}>{when(r.at)}</time>
                <div>
                  <p><span className="pill pill-muted">{ACTIVITY_LABEL[r.type] ?? r.type}</span></p>
                  <p className="small">{describe(r.type, r.detail)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
