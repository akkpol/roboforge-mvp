import { Activity, AlertTriangle, Bot, RadioTower, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ClaimKitForm } from "@/app/admin/claim-kit-form";
import { getBetaHealth } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";

function metric(label: string, value: number, detail: string) {
  return (
    <article className="ops-metric" key={label}>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default async function AdminPage() {
  const { configured, user } = await getCurrentUser();

  if (!configured) {
    return (
      <main className="ops-shell">
        <section className="setup-alert">
          <h1>Supabase is not configured</h1>
          <p>Add Supabase env vars before using the RoboForge Ops view.</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="ops-shell">
        <section className="setup-alert">
          <h1>Login required</h1>
          <p>Sign in before opening the beta Ops view.</p>
          <Link className="button" href="/login">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const health = await getBetaHealth();

  if (!health.ready) {
    return (
      <main className="ops-shell">
        <section className="setup-alert">
          <h1>Ops view needs setup</h1>
          <p>{health.error}</p>
          <Link className="button button-secondary" href="/dashboard">
            Back to Garage
          </Link>
        </section>
      </main>
    );
  }

  const data = health.data;
  const successCount = data.connectionResults.success ?? 0;
  const failedCount = data.connectionResults.failed ?? 0;
  const totalFinishedConnections = successCount + failedCount;
  const successRate =
    totalFinishedConnections > 0
      ? Math.round((successCount / totalFinishedConnections) * 100)
      : 0;

  return (
    <main className="ops-shell">
      <section className="ops-heading">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={15} /> ROBOFORGE OPS
          </span>
          <h1>Beta Health</h1>
          <p>
            Lightweight operational view for the first 100-1000 users. This
            tracks outcomes and friction, not high-frequency joystick commands.
          </p>
        </div>
        <Link className="button button-secondary" href="/dashboard">
          Back to Garage
        </Link>
      </section>

      <section className="ops-metric-grid">
        {metric("Users", data.counts.ownerProfiles, "owner profiles")}
        {metric("Robots", data.counts.robots, "registered units")}
        {metric("Codes", data.counts.claimCodes, "claim kits issued")}
        {metric("Claimed", data.counts.claimedRobots, "claimed robot codes")}
        {metric("Connect", data.counts.connectionSessions, `${successRate}% success`)}
        {metric("Control", data.counts.controlSessions, "session summaries")}
        {metric("Feedback", data.counts.feedbackReports, "beta reports")}
      </section>

      <section className="ops-grid">
        <ClaimKitForm />

        <article className="ops-panel">
          <span className="eyebrow">
            <ShieldCheck size={15} /> RECENT KITS
          </span>
          <h2>Claim Cards</h2>
          <div className="ops-feed">
            {data.claimKits.map((kit) => (
              <span key={`${kit.created_at}-${kit.unit_code}`}>
                <strong>{kit.unit_code}</strong>
                <small>{kit.claimed_at ? "claimed" : "ready"}</small>
                <p>
                  {kit.claimed_at
                    ? `Claimed ${new Date(kit.claimed_at).toLocaleDateString()}`
                    : kit.expires_at
                      ? `Expires ${new Date(kit.expires_at).toLocaleDateString()}`
                      : "No expiry"}
                </p>
              </span>
            ))}
            {data.claimKits.length === 0 ? <p>No claim kits yet.</p> : null}
          </div>
        </article>

        <article className="ops-panel">
          <span className="eyebrow">
            <RadioTower size={15} /> CONNECTIONS
          </span>
          <h2>Connection Results</h2>
          <div className="ops-list">
            {Object.entries(data.connectionResults).map(([result, count]) => (
              <span key={result}>
                <strong>{result}</strong>
                <small>{count.toLocaleString()}</small>
              </span>
            ))}
            {Object.keys(data.connectionResults).length === 0 ? (
              <p>No connection sessions yet.</p>
            ) : null}
          </div>
        </article>

        <article className="ops-panel">
          <span className="eyebrow">
            <Activity size={15} /> CONTROL
          </span>
          <h2>Control Summary</h2>
          <div className="ops-list">
            <span>
              <strong>commands</strong>
              <small>{data.controlSummary.commandCount.toLocaleString()}</small>
            </span>
            <span>
              <strong>safe ends</strong>
              <small>{data.controlSummary.completedSafely.toLocaleString()}</small>
            </span>
            <span>
              <strong>emergency stops</strong>
              <small>{data.controlSummary.emergencyStopCount.toLocaleString()}</small>
            </span>
          </div>
        </article>

        <article className="ops-panel">
          <span className="eyebrow">
            <AlertTriangle size={15} /> EVENTS
          </span>
          <h2>Recent Robot Events</h2>
          <div className="ops-feed">
            {data.topEvents.map((event) => (
              <span key={`${event.created_at}-${event.event_type}`}>
                <strong>{event.event_type}</strong>
                <small>{event.severity}</small>
                <p>{event.message}</p>
              </span>
            ))}
            {data.topEvents.length === 0 ? <p>No events yet.</p> : null}
          </div>
        </article>

        <article className="ops-panel">
          <span className="eyebrow">
            <Bot size={15} /> FEEDBACK
          </span>
          <h2>Latest Feedback</h2>
          <div className="ops-feed">
            {data.latestFeedback.map((feedback) => (
              <span key={`${feedback.created_at}-${feedback.message}`}>
                <strong>{feedback.problem_type ?? "general"}</strong>
                <small>{feedback.rating ? `${feedback.rating}/5` : "no rating"}</small>
                <p>{feedback.message}</p>
              </span>
            ))}
            {data.latestFeedback.length === 0 ? <p>No feedback yet.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
