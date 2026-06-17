"use client";

import { Cpu, Save } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import {
  saveHardwareProfileAction,
  type HardwareProfileState,
} from "@/app/admin/actions";

type ClaimKitSummary = {
  battery_config: Record<string, unknown> | null;
  hardware_profile: Record<string, unknown> | null;
  readiness_status: string | null;
  robot_id: string;
  robot_type: string | null;
  unit_code: string;
};

const initialState: HardwareProfileState = {
  error: null,
  ok: false,
};

function stringValue(source: Record<string, unknown> | null, key: string, fallback = "") {
  const value = source?.[key];
  return typeof value === "string" ? value : fallback;
}

function numberValue(source: Record<string, unknown> | null, key: string, fallback = "") {
  const value = source?.[key];
  return typeof value === "number" ? String(value) : fallback;
}

function booleanValue(source: Record<string, unknown> | null, key: string) {
  return source?.[key] === true;
}

export function HardwareProfileForm({
  claimKits,
}: {
  claimKits: ClaimKitSummary[];
}) {
  const [selectedRobotId, setSelectedRobotId] = useState(
    claimKits[0]?.robot_id ?? "",
  );
  const [state, formAction, isPending] = useActionState(
    saveHardwareProfileAction,
    initialState,
  );
  const selectedKit = useMemo(
    () => claimKits.find((kit) => kit.robot_id === selectedRobotId) ?? claimKits[0],
    [claimKits, selectedRobotId],
  );
  const profile = selectedKit?.hardware_profile ?? null;
  const battery = selectedKit?.battery_config ?? null;
  const batteryCells =
    numberValue(profile, "batteryCells") || numberValue(battery, "cells") || "2";

  return (
    <article className="ops-panel ops-hardware-panel">
      <span className="eyebrow">
        <Cpu size={15} /> HARDWARE PROFILE
      </span>
      <h2>Prototype Details</h2>
      <p>
        Store the board, motor driver, battery, and wiring status before changing
        firmware for a physical robot.
      </p>

      {claimKits.length === 0 ? (
        <p>Create a claim kit before adding hardware details.</p>
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
                  {kit.unit_code} / {kit.robot_type ?? "robot"}
                </option>
              ))}
            </select>
          </label>

          <div className="ops-form-row">
            <label>
              Board model
              <input
                name="boardModel"
                placeholder="ESP32 DevKit V1"
                defaultValue={stringValue(profile, "boardModel", "esp32")}
              />
            </label>
            <label>
              Motor driver
              <input
                name="motorDriver"
                placeholder="L298N / TB6612FNG"
                defaultValue={stringValue(profile, "motorDriver")}
              />
            </label>
          </div>

          <div className="ops-form-row">
            <label>
              Battery
              <select
                name="batteryChemistry"
                defaultValue={stringValue(profile, "batteryChemistry", "li-ion")}
              >
                <option value="li-ion">Li-ion</option>
                <option value="lipo">LiPo</option>
                <option value="nimh">NiMH</option>
                <option value="alkaline">AA/alkaline</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
            <label>
              Cells
              <input min="1" max="4" name="batteryCells" type="number" defaultValue={batteryCells} />
            </label>
          </div>

          <div className="ops-form-row">
            <label>
              Motor channels
              <select
                name="motorChannels"
                defaultValue={stringValue(profile, "motorChannels", "differential_drive")}
              >
                <option value="differential_drive">Differential drive</option>
                <option value="tracked_drive">Tracked drive</option>
                <option value="single_motor">Single motor</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label>
              Wiring status
              <select
                name="wiringStatus"
                defaultValue={stringValue(profile, "wiringStatus", "unknown")}
              >
                <option value="unknown">Unknown</option>
                <option value="draft">Draft only</option>
                <option value="photo_received">Photo received</option>
                <option value="bench_verified">Bench verified</option>
              </select>
            </label>
          </div>

          <div className="ops-toggle-row">
            <label>
              <input
                defaultChecked={booleanValue(profile, "hasPowerSwitch")}
                name="hasPowerSwitch"
                type="checkbox"
              />
              Power switch present
            </label>
            <label>
              <input
                defaultChecked={booleanValue(profile, "hasFuse")}
                name="hasFuse"
                type="checkbox"
              />
              Fuse or protected pack present
            </label>
          </div>

          <label>
            Readiness
            <select
              name="readinessStatus"
              defaultValue={selectedKit?.readiness_status ?? "needs_details"}
            >
              <option value="needs_details">Needs details</option>
              <option value="ready_for_bench">Ready for bench</option>
              <option value="ready_for_raised_wheels">Ready for raised wheels</option>
              <option value="ready_for_floor">Ready for floor</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>

          <label>
            Notes
            <textarea
              name="notes"
              placeholder="Wiring photo link, unusual pin mapping, battery warning, or next check"
              defaultValue={stringValue(profile, "notes")}
            />
          </label>

          <button className="button" disabled={isPending} type="submit">
            <Save size={17} />
            {isPending ? "Saving..." : "Save hardware profile"}
          </button>
        </form>
      )}

      {state.error ? <p className="ops-error">{state.error}</p> : null}
      {state.ok && !state.error ? (
        <p className="ops-success">Hardware profile saved.</p>
      ) : null}
    </article>
  );
}

