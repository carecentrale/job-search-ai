import Link from "next/link";
import { GoLiveForm, RollbackForm, VercelTokenForm } from "@/components/admin/VersionForms";
import { requireAdmin } from "@/lib/admin";
import { CURRENT_VERSION, RELEASES } from "@/lib/changelog";
import { ago, when } from "@/lib/describe";
import { productionDeployments, vercelInfo, type Deployment } from "@/lib/deploys";
import { removeVercelTokenAction } from "../actions";

export default async function AdminVersions() {
  await requireAdmin();
  const info = await vercelInfo();
  let deploys: { deployments: Deployment[]; liveId: string | null } | null = null;
  let error: string | null = null;
  if (info.connected) {
    try {
      deploys = await productionDeployments();
    } catch (e) {
      error = (e as Error).message;
    }
  }
  const ready = deploys?.deployments.filter((d) => d.state === "READY") ?? [];
  const newest = ready[0];
  const liveIndex = deploys ? ready.findIndex((d) => d.id === deploys!.liveId) : -1;
  const live = liveIndex >= 0 ? ready[liveIndex] : null;
  const previous = liveIndex >= 0 ? ready[liveIndex + 1] : null;
  const rolledBack = Boolean(live && newest && live.id !== newest.id);
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);

  return (
    <div className="admin-stack">
      <section className="admin-stats" aria-label="Version">
        <div className="stat"><span>v{CURRENT_VERSION}</span>this deploy<small>{commit ? `commit ${commit}` : "local build"}</small></div>
        <div className="stat"><span>{RELEASES.length}</span>releases<small>latest {RELEASES[0].date}</small></div>
      </section>

      {rolledBack && newest && (
        <section className="panel key-alert key-alert-warn" role="alert">
          <h2>The live site is rolled back</h2>
          <p className="small">
            It&apos;s running an older deployment ({live?.message ?? live?.sha?.slice(0, 7)}). While rolled back, new pushes don&apos;t go live by themselves.
            Once the problem is fixed, put the latest live again:
          </p>
          <p className="small muted">Latest: {newest.message ?? newest.sha?.slice(0, 7)}, {ago(newest.createdAt)}.</p>
          <GoLiveForm deploymentId={newest.id} />
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>Roll back</h2>
          <p className="muted small">If a new version breaks something, put the one before it back live in about a minute. Your data isn&apos;t touched.</p>
        </div>
        {!info.connected ? (
          <>
            <ol className="small key-alert-steps">
              <li>At <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer">vercel.com/account/tokens</a>, create a token named &ldquo;fuzzyHR admin&rdquo;, with the scope set to the <strong>FuzzyHR</strong> team and no expiry (or a long one).</li>
              <li>Copy it and paste it below. It&apos;s checked, stored encrypted, and never shown again.</li>
            </ol>
            {info.canSave ? <VercelTokenForm replacing={false} /> : <p className="warn small">The server has no encryption secret yet.</p>}
          </>
        ) : error ? (
          <p className="warn small">Couldn&apos;t load deployments from Vercel: {error}. If the token was deleted or expired, paste a new one below.</p>
        ) : live && previous ? (
          <>
            <p className="small">
              <strong>Live now:</strong> {live.message ?? live.sha?.slice(0, 7)} <span className="muted">({ago(live.createdAt)})</span>
            </p>
            <p className="small">
              <strong>Before it:</strong> {previous.message ?? previous.sha?.slice(0, 7)} <span className="muted">({ago(previous.createdAt)})</span>
            </p>
            <RollbackForm deploymentId={previous.id} label={previous.message ?? previous.sha?.slice(0, 7) ?? previous.id} />
            <p className="muted small">Vercel&apos;s free plan can only roll back one step like this. For an older version, see below.</p>
          </>
        ) : (
          <p className="muted small">There&apos;s no earlier deployment to roll back to yet.</p>
        )}
        {info.connected && (
          <>
            <p className="muted small">Vercel token ending in …{info.connected.last4}, added {ago(info.connected.setAt)}.</p>
            <VercelTokenForm replacing />
            <form action={removeVercelTokenAction}><button className="textbtn small" type="submit">Disconnect Vercel</button></form>
          </>
        )}
      </section>

      {deploys && (
        <section className="panel">
          <div className="panel-head"><h2>Recent deploys</h2></div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>When</th><th>Change</th><th>Commit</th><th>Status</th></tr></thead>
              <tbody>
                {deploys.deployments.map((d) => (
                  <tr key={d.id}>
                    <td>{when(d.createdAt)}</td>
                    <td className="clip" title={d.message ?? ""}>{d.message ?? "—"}</td>
                    <td className="mono">{d.sha?.slice(0, 7) ?? "—"}</td>
                    <td>
                      {d.id === deploys!.liveId ? <span className="pill pill-good">live</span> : <span className="pill pill-muted">{d.state.toLowerCase()}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-head"><h2>Going back further</h2></div>
        <p className="small">
          Every release is tagged in GitHub (v0.1.0, v0.2.0 …). To bring back an older version, ask Claude to &ldquo;roll fuzzyHR back to v0.5.0&rdquo;. It restores that version&apos;s code as a new change and deploys it,
          so nothing is lost and you can move forward again later. Database changes are only ever additions, so older versions keep working with today&apos;s data.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Release notes</h2>
          <p className="muted small">What users see on the public <Link href="/whats-new">What&apos;s new</Link> page.</p>
        </div>
        <ul className="small release-admin">
          {RELEASES.map((r) => <li key={r.version}><strong>v{r.version}</strong> · {r.date} · {r.en.title}</li>)}
        </ul>
      </section>
    </div>
  );
}
