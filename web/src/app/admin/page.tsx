import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle,
  ClipboardCheck,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { BenchTestForm } from "@/app/admin/bench-test-form";
import { ClaimKitForm } from "@/app/admin/claim-kit-form";
import { HardwareProfileForm } from "@/app/admin/hardware-profile-form";
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

const betaScaleTargets = {
  firstBatchUsers: 100,
  firstPhysicalRobots: 10,
  fullBetaUsers: 1000,
  fullBetaRobots: 300,
} as const;

function estimateBetaRows(users: number, robots: number) {
  return {
    betaApplications: Math.round(users * 0.35),
    connectionSessions: users * 2,
    controlSessions: Math.round(users * 1.2),
    feedbackReports: Math.round(users * 0.25),
    ownerProfiles: users,
    robotClaimCodes: robots,
    robotEvents: users * 5,
    robotProgress: robots,
    robots,
  };
}

function totalRows(rows: Record<string, number>) {
  return Object.values(rows).reduce((sum, value) => sum + value, 0);
}

function targetPercent(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

function ScaleProgress({
  current,
  label,
  target,
}: {
  current: number;
  label: string;
  target: number;
}) {
  const percent = targetPercent(current, target);

  return (
    <span>
      <strong>{label}</strong>
      <small>
        {current.toLocaleString()} / {target.toLocaleString()}
      </small>
      <i aria-hidden="true">
        <b style={{ width: `${percent}%` }} />
      </i>
    </span>
  );
}

function readinessItems(data: NonNullable<Awaited<ReturnType<typeof getBetaHealth>>["data"]>) {
  const profiledKits = data.claimKits.filter(
    (kit) => kit.readiness_status && kit.readiness_status !== "needs_details",
  ).length;

  return [
    {
      complete: data.counts.ownerProfiles > 0,
      detail: `${data.counts.ownerProfiles.toLocaleString()} owner profiles`,
      label: "Login and owner account",
      next: "Verify Google login with the founder account.",
    },
    {
      complete: data.counts.claimCodes > 0,
      detail: `${data.counts.claimCodes.toLocaleString()} claim kits issued`,
      label: "First physical claim kit",
      next: "Create one kit in Ops after choosing the unit code.",
    },
    {
      complete: profiledKits > 0,
      detail: `${profiledKits.toLocaleString()} kits have hardware status`,
      label: "Prototype hardware profile",
      next: "Fill board, motor driver, battery, wiring, switch, and fuse.",
    },
    {
      complete: data.counts.benchPassed > 0,
      detail: `${data.counts.benchPassed.toLocaleString()} bench passes`,
      label: "Bench power and protocol check",
      next: "Record power, robot Wi-Fi, info, status, and stop checks.",
    },
    {
      complete: data.counts.raisedWheelPassed > 0,
      detail: `${data.counts.raisedWheelPassed.toLocaleString()} raised-wheel passes`,
      label: "Raised-wheel safety pass",
      next: "Raise wheels, arm, drive low-speed, release to zero, and stop.",
    },
    {
      complete: data.counts.connectionSessions > 0,
      detail: `${data.counts.connectionSessions.toLocaleString()} connection sessions`,
      label: "Connection quest telemetry",
      next: "Run one owner setup attempt and save the result.",
    },
    {
      complete: data.counts.controlSessions > 0,
      detail: `${data.counts.controlSessions.toLocaleString()} control summaries`,
      label: "Control session summary",
      next: "Start a Cockpit session and end safely or with stop evidence.",
    },
    {
      complete: data.counts.feedbackReports > 0,
      detail: `${data.counts.feedbackReports.toLocaleString()} beta reports`,
      label: "Feedback loop",
      next: "Submit one setup or control feedback report after a dry run.",
    },
  ];
}

function BetaScaleDrill({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getBetaHealth>>["data"]>;
}) {
  const firstBatchEstimate = estimateBetaRows(
    betaScaleTargets.firstBatchUsers,
    betaScaleTargets.firstPhysicalRobots,
  );
  const fullBetaEstimate = estimateBetaRows(
    betaScaleTargets.fullBetaUsers,
    betaScaleTargets.fullBetaRobots,
  );
  const physicalKitCount = data.counts.claimCodes;
  const startedConnections = data.connectionResults.started ?? 0;
  const failedConnections = data.connectionResults.failed ?? 0;
  const ownerSignals =
    data.counts.connectionSessions +
    data.counts.controlSessions +
    data.counts.feedbackReports;

  return (
    <section className="ops-panel ops-scale-drill">
      <div className="ops-scale-drill__copy">
        <span className="eyebrow">
          <Activity size={15} /> 100-1000 BETA DRILL
        </span>
        <h2>Test the backend with summaries, not joystick spam.</h2>
        <p>
          Use this as the release gate before inviting testers. The cloud should
          collect accounts, claims, outcomes, events, and feedback while live
          drive commands stay on the robot Wi-Fi.
        </p>
      </div>
      <div className="ops-scale-drill__targets">
        <ScaleProgress
          current={data.counts.ownerProfiles}
          label="First user batch"
          target={betaScaleTargets.firstBatchUsers}
        />
        <ScaleProgress
          current={data.counts.ownerProfiles}
          label="Full beta accounts"
          target={betaScaleTargets.fullBetaUsers}
        />
        <ScaleProgress
          current={physicalKitCount}
          label="Physical kits"
          target={betaScaleTargets.fullBetaRobots}
        />
        <ScaleProgress
          current={ownerSignals}
          label="Owner outcome signals"
          target={
            firstBatchEstimate.connectionSessions +
            firstBatchEstimate.controlSessions +
            firstBatchEstimate.feedbackReports
          }
        />
      </div>
      <div className="ops-scale-drill__notes">
        <span>
          <strong>{totalRows(firstBatchEstimate).toLocaleString()}</strong>
          <small>estimated rows for 100 users / 10 robots</small>
        </span>
        <span>
          <strong>{totalRows(fullBetaEstimate).toLocaleString()}</strong>
          <small>estimated rows for 1000 users / 300 robots</small>
        </span>
        <span>
          <strong>{startedConnections.toLocaleString()}</strong>
          <small>open connection quests to follow up</small>
        </span>
        <span>
          <strong>{failedConnections.toLocaleString()}</strong>
          <small>failed connection attempts to review</small>
        </span>
      </div>
    </section>
  );
}

const firstKitFacts = [
  ["Unit code", "Example: RF-RV-0001"],
  ["Board", "ESP32, Pico W, Arduino, or the exact prototype board"],
  ["Motor driver", "L298N, TB6612FNG, BTS7960, ESC, or custom driver"],
  ["Battery", "Chemistry and cell count, such as 2S Li-ion or 1S LiPo"],
  ["Motor wiring", "Left/right channel mapping or a wiring photo"],
  ["Safety hardware", "Power switch plus fuse or protected battery pack"],
] as const;

function FirstKitIntake({
  claimKitCount,
}: {
  claimKitCount: number;
}) {
  const hasKit = claimKitCount > 0;

  return (
    <section className="ops-panel">
      <span className="eyebrow">
        <Bot size={15} /> FIRST KIT INTAKE
      </span>
      <h2>{hasKit ? "Hardware facts still drive the next gate." : "Collect facts before the first real kit."}</h2>
      <p>
        {hasKit
          ? "Use the Hardware Profile and Bench Checklist before changing firmware or moving to floor tests."
          : "Defaults are fine for drafts, but the first physical claim kit needs real prototype facts before flashing."}
      </p>
      <div className="ops-list">
        {firstKitFacts.map(([label, detail]) => (
          <span key={label}>
            <strong>{label}</strong>
            <small>{detail}</small>
          </span>
        ))}
      </div>
    </section>
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
  const gates = readinessItems(data);
  const clearedGates = gates.filter((item) => item.complete).length;
  const nextGate = gates.find((item) => !item.complete);

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
        {metric("Floor", data.counts.floorReadyRobots, "ready for floor")}
        {metric("Bench", data.counts.benchPassed, `${data.counts.raisedWheelPassed} raised-wheel`)}
        {metric("Connect", data.counts.connectionSessions, `${successRate}% success`)}
        {metric("Control", data.counts.controlSessions, "session summaries")}
        {metric("Feedback", data.counts.feedbackReports, "beta reports")}
      </section>
      <section className="ops-panel ops-readiness">
        <div className="ops-readiness__summary">
          <span className="eyebrow">
            <ClipboardCheck size={15} /> BETA READINESS
          </span>
          <h2>{nextGate ? "Next gate is clear and specific." : "Small beta path is ready to rehearse."}</h2>
          <p>
            {nextGate
              ? nextGate.next
              : "Run one more founder dry run, then invite the smallest tester batch."}
          </p>
        </div>
        <div className="ops-readiness__score">
          <strong>
            {clearedGates}/{gates.length}
          </strong>
          <span>gates clear</span>
        </div>
        <div className="ops-readiness__list">
          {gates.map((item) => (
            <span className={item.complete ? "is-complete" : ""} key={item.label}>
              {item.complete ? <CheckCircle size={17} /> : <AlertTriangle size={17} />}
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
          ))}
        </div>
      </section>

      <BetaScaleDrill data={data} />

      <section className="ops-grid">
        <FirstKitIntake claimKitCount={data.counts.claimCodes} />
        <ClaimKitForm />
        <HardwareProfileForm claimKits={data.claimKits} />
        <BenchTestForm
          claimKits={data.claimKits}
          latestBenchTests={data.latestBenchTests}
        />

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
                <p>
                  {kit.ap_ssid ?? "SSID pending"} ·{" "}
                  {kit.firmware_version ?? "firmware pending"} ·{" "}
                  {kit.protocol_version ?? "protocol pending"}
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
            <ClipboardCheck size={15} /> TEST COVERAGE
          </span>
          <h2>Robot Checks</h2>
          <div className="ops-list">
            <span>
              <strong>bench records</strong>
              <small>{data.counts.benchTests.toLocaleString()}</small>
            </span>
            <span>
              <strong>bench passed</strong>
              <small>{data.counts.benchPassed.toLocaleString()}</small>
            </span>
            <span>
              <strong>raised-wheel passed</strong>
              <small>{data.counts.raisedWheelPassed.toLocaleString()}</small>
            </span>
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
