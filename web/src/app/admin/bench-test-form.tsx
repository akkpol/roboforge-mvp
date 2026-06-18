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

type BenchStage = "bench" | "floor" | "raised_wheels";
type BenchResult = "blocked" | "failed" | "passed" | "pending";

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

type BenchCheckName = (typeof checkGroups)[number]["checks"][number][0];
type BenchChecks = Record<BenchCheckName, boolean>;

const checkNames = checkGroups.flatMap((group) =>
  group.checks.map(([name]) => name),
) as BenchCheckName[];

function emptyBenchChecks(): BenchChecks {
  return Object.fromEntries(checkNames.map((name) => [name, false])) as BenchChecks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function evidenceCheckKey(value: unknown): BenchCheckName | null {
  if (typeof value !== "string") return null;
  return checkNames.includes(value as BenchCheckName)
    ? (value as BenchCheckName)
    : null;
}

function checksFromEvidence(evidence: Record<string, unknown>) {
  const nextChecks = emptyBenchChecks();
  const adminBenchChecks = evidence.adminBenchChecks;

  if (isRecord(adminBenchChecks)) {
    for (const name of checkNames) {
      nextChecks[name] = adminBenchChecks[name] === true;
    }
  }

  if (Array.isArray(evidence.checks)) {
    for (const item of evidence.checks) {
      if (!isRecord(item)) continue;

      const key = evidenceCheckKey(item.key);
      if (key) {
        nextChecks[key] = item.passed === true;
      }
    }
  }

  return nextChecks;
}

function stageFromChecks(checks: BenchChecks): BenchStage {
  if (checks.floorClear || checks.shortFloorDriveOk) return "floor";
  if (
    checks.wheelsRaised ||
    checks.armOk ||
    checks.lowSpeedDriveOk ||
    checks.zeroReleaseOk ||
    checks.emergencyStopOk
  ) {
    return "raised_wheels";
  }

  return "bench";
}

function resultFromEvidence(evidence: Record<string, unknown>): BenchResult {
  if (typeof evidence.error === "string" && evidence.error.trim()) return "failed";
  if (evidence.ok === true) return "passed";
  if (evidence.ok === false) return "failed";
  return "pending";
}

function summarizeEvidence(evidence: Record<string, unknown>, rawJson: string) {
  const device = isRecord(evidence.device) ? evidence.device : {};
  const unitCode = stringValue(device, "unitCode") ?? stringValue(evidence, "unitCode");
  const firmwareVersion = stringValue(device, "firmwareVersion");
  const protocolVersion = stringValue(device, "protocolVersion");
  const robotType = stringValue(device, "robotType");
  const deviceName = stringValue(device, "deviceName");
  const batteryVoltage = numberValue(device, "batteryVoltage");
  const batteryPercent = numberValue(device, "batteryPercent");
  const startedAt = stringValue(evidence, "startedAt");
  const completedAt = stringValue(evidence, "completedAt");
  const baseUrl = stringValue(evidence, "baseUrl");
  const error = stringValue(evidence, "error");
  const driveCheck = evidence.driveCheck === true ? "raised wheels" : "bench";
  const passedChecks = Array.isArray(evidence.checks)
    ? evidence.checks
        .filter((item) => isRecord(item) && item.passed === true)
        .map((item) => (isRecord(item) ? stringValue(item, "key") : null))
        .filter(Boolean)
        .join(", ")
    : "";

  const summaryLines = [
    "Imported from rover-protocol-check evidence.",
    unitCode ? `Unit: ${unitCode}` : null,
    deviceName ? `Device: ${deviceName}` : null,
    robotType ? `Robot type: ${robotType}` : null,
    firmwareVersion ? `Firmware: ${firmwareVersion}` : null,
    protocolVersion ? `Protocol: ${protocolVersion}` : null,
    typeof batteryVoltage === "number" ? `Battery voltage: ${batteryVoltage}V` : null,
    typeof batteryPercent === "number" ? `Battery percent: ${batteryPercent}%` : null,
    baseUrl ? `Checked URL: ${baseUrl}` : null,
    `Check mode: ${driveCheck}`,
    startedAt ? `Started: ${startedAt}` : null,
    completedAt ? `Completed: ${completedAt}` : null,
    passedChecks ? `Passed checks: ${passedChecks}` : null,
    error ? `Error: ${error}` : null,
    "",
    "Raw evidence:",
    rawJson.trim(),
  ];

  return summaryLines.filter((line) => line !== null).join("\n");
}

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
  const [stage, setStage] = useState<BenchStage>("bench");
  const [result, setResult] = useState<BenchResult>("pending");
  const [checks, setChecks] = useState<BenchChecks>(() => emptyBenchChecks());
  const [notes, setNotes] = useState("");
  const [evidenceJson, setEvidenceJson] = useState("");
  const [evidenceMessage, setEvidenceMessage] = useState("");
  const [state, formAction, isPending] = useActionState(
    saveBenchTestAction,
    initialState,
  );
  const selectedKit = useMemo(
    () => claimKits.find((kit) => kit.robot_id === selectedRobotId) ?? claimKits[0],
    [claimKits, selectedRobotId],
  );

  function resetBenchInput(nextRobotId: string) {
    setSelectedRobotId(nextRobotId);
    setStage("bench");
    setResult("pending");
    setChecks(emptyBenchChecks());
    setNotes("");
    setEvidenceMessage("");
  }

  function setCheck(name: BenchCheckName, value: boolean) {
    setChecks((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function importEvidenceJson() {
    let parsed: unknown;

    try {
      parsed = JSON.parse(evidenceJson);
    } catch {
      setEvidenceMessage("Evidence JSON is not valid JSON.");
      return;
    }

    if (!isRecord(parsed)) {
      setEvidenceMessage("Evidence JSON must be an object.");
      return;
    }

    const nextChecks = checksFromEvidence(parsed);
    const prettyJson = JSON.stringify(parsed, null, 2);
    const device = isRecord(parsed.device) ? parsed.device : {};
    const unitCode =
      stringValue(device, "unitCode") ?? stringValue(parsed, "unitCode") ?? "";
    const matchedKit = claimKits.find(
      (kit) => kit.unit_code.toUpperCase() === unitCode.toUpperCase(),
    );

    if (matchedKit) {
      setSelectedRobotId(matchedKit.robot_id);
    }

    setChecks(nextChecks);
    setStage(stageFromChecks(nextChecks));
    setResult(resultFromEvidence(parsed));
    setNotes(summarizeEvidence(parsed, prettyJson));
    setEvidenceMessage(
      matchedKit
        ? `Imported evidence for ${matchedKit.unit_code}.`
        : "Imported evidence. Choose the matching robot kit before saving.",
    );
  }

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
        <form action={formAction} className="ops-form">
          <label>
            Robot kit
            <select
              name="robotId"
              onChange={(event) => resetBenchInput(event.target.value)}
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
              <select
                name="stage"
                onChange={(event) => setStage(event.target.value as BenchStage)}
                value={stage}
              >
                <option value="bench">Bench</option>
                <option value="raised_wheels">Raised wheels</option>
                <option value="floor">Floor</option>
              </select>
            </label>
            <label>
              Result
              <select
                name="result"
                onChange={(event) => setResult(event.target.value as BenchResult)}
                value={result}
              >
                <option value="pending">Pending</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>
          </div>

          <section className="ops-evidence-import">
            <label>
              Evidence JSON
              <textarea
                onChange={(event) => {
                  setEvidenceJson(event.target.value);
                  setEvidenceMessage("");
                }}
                placeholder="Paste bench-evidence.json or raised-wheel-evidence.json here"
                value={evidenceJson}
              />
            </label>
            <div className="ops-evidence-actions">
              <button
                className="ops-copy-button"
                onClick={importEvidenceJson}
                type="button"
              >
                <ClipboardCheck size={16} />
                Import evidence
              </button>
              {evidenceMessage ? <span>{evidenceMessage}</span> : null}
            </div>
          </section>

          <div className="ops-check-sections">
            {checkGroups.map((group) => (
              <section className="ops-check-section" key={group.title}>
                <h3>{group.title}</h3>
                <div className="ops-check-grid">
                  {group.checks.map(([name, label]) => (
                    <label key={name}>
                      <input
                        checked={checks[name]}
                        name={name}
                        onChange={(event) => setCheck(name, event.target.checked)}
                        type="checkbox"
                      />
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
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What failed, what wire changed, or what to test next"
              value={notes}
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
