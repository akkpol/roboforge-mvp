"use client";

import { ClipboardCheck, Save } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import {
  saveBenchTestAction,
  type BenchTestState,
} from "@/app/admin/actions";

type ClaimKitSummary = {
  readiness_status: string | null;
  robot_id: string;
  robot_type: string | null;
  unit_code: string;
};

type LatestBenchTest = {
  checks: Record<string, unknown> | null;
  created_at: string;
  notes: string | null;
  result: string;
  robot_id: string;
  stage: string;
  unit_code: string | null;
};

const initialState: BenchTestState = {
  error: null,
  ok: false,
};

const checkGroups = [
  {
    checks: [
      ["powerOn", "Power on"],
      ["apVisible", "Robot Wi-Fi visible"],
      ["wifiJoined", "Phone joined Wi-Fi"],
      ["batteryVisible", "Battery/status visible"],
    ],
    title: "Power + Wi-Fi",
  },
  {
    checks: [
      ["infoOk", "Info check OK"],
      ["statusOk", "Status check OK"],
      ["stopOk", "Stop check OK"],
    ],
    title: "Protocol",
  },
  {
    checks: [
      ["wheelsRaised", "Wheels raised"],
      ["armOk", "Arm OK"],
      ["lowSpeedDriveOk", "Low-speed drive OK"],
      ["zeroReleaseOk", "Release stops"],
      ["emergencyStopOk", "Emergency stop OK"],
    ],
    title: "Raised Wheels",
  },
  {
    checks: [
      ["floorClear", "Floor path clear"],
      ["shortFloorDriveOk", "Short floor drive OK"],
    ],
    title: "Floor",
  },
] as const;

function stageLabel(stage: string) {
  if (stage === "raised_wheels") return "Raised wheels";
  if (stage === "floor") return "Floor";
  return "Bench";
}

function resultLabel(result: string) {
  if (result === "passed") return "Passed";
  if (result === "failed") return "Failed";
  if (result === "blocked") return "Blocked";
  return "Pending";
}

function completedChecks(checks: Record<string, unknown> | null) {
  if (!checks) return 0;
  return Object.values(checks).filter(Boolean).length;
}

export function BenchTestForm({
  claimKits,
  latestBenchTests,
}: {
  claimKits: ClaimKitSummary[];
  latestBenchTests: LatestBenchTest[];
}) {
  const [selectedRobotId, setSelectedRobotId] = useState(
    claimKits[0]?.robot_id ?? "",
  );
  const [state, formAction, isPending] = useActionState(
    saveBenchTestAction,
    initialState,
  );
  const selectedKit = useMemo(
    () => claimKits.find((kit) => kit.robot_id === selectedRobotId) ?? claimKits[0],
    [claimKits, selectedRobotId],
  );

  return (
    <article className="ops-panel ops-bench-panel">
      <span className="eyebrow">
        <ClipboardCheck size={15} /> ROBOT TEST
      </span>
      <h2>Bench Checklist</h2>
      <p>
        Record the real prototype checks before a kit moves from bench to raised
        wheels or floor testing.
      </p>

      {claimKits.length === 0 ? (
        <p>Create a claim kit before recording robot tests.</p>
      ) : (
        <form action={formAction} className="ops-form" key={selectedKit?.robot_id}>
          <label>
            Robot kit
            <select
              name="robotId"
              onChange={(event) => setSelectedRobotId(event.target.value)}
              value={selectedKit?.robot_id ?? ""}
            >
              {claimKits.map((kit) => (
                <option key={kit.robot_id} value={kit.robot_id}>
                  {kit.unit_code} / {kit.robot_type ?? "robot"} /{" "}
                  {kit.readiness_status ?? "needs details"}
                </option>
              ))}
            </select>
          </label>

          <div className="ops-form-row">
            <label>
              Stage
              <select name="stage" defaultValue="bench">
                <option value="bench">Bench</option>
                <option value="raised_wheels">Raised wheels</option>
                <option value="floor">Floor</option>
              </select>
            </label>
            <label>
              Result
              <select name="result" defaultValue="pending">
                <option value="pending">Pending</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>
          </div>

          <div className="ops-check-sections">
            {checkGroups.map((group) => (
              <section className="ops-check-section" key={group.title}>
                <h3>{group.title}</h3>
                <div className="ops-check-grid">
                  {group.checks.map(([name, label]) => (
                    <label key={name}>
                      <input name={name} type="checkbox" />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <label>
            Notes
            <textarea
              name="notes"
              placeholder="What failed, what wire changed, or what to test next"
            />
          </label>

          <button className="button" disabled={isPending} type="submit">
            <Save size={17} />
            {isPending ? "Saving..." : "Save test result"}
          </button>
        </form>
      )}

      {state.error ? <p className="ops-error">{state.error}</p> : null}
      {state.ok && !state.error ? (
        <p className="ops-success">Robot test result saved.</p>
      ) : null}

      <div className="ops-feed">
        {latestBenchTests.map((test) => (
          <span key={`${test.created_at}-${test.robot_id}-${test.stage}`}>
            <strong>
              {test.unit_code ?? "Robot"} / {stageLabel(test.stage)}
            </strong>
            <small>
              {resultLabel(test.result)} / {completedChecks(test.checks)} checks /{" "}
              {new Date(test.created_at).toLocaleDateString()}
            </small>
            {test.notes ? <p>{test.notes}</p> : null}
          </span>
        ))}
        {latestBenchTests.length === 0 ? <p>No robot tests recorded yet.</p> : null}
      </div>
    </article>
  );
}
