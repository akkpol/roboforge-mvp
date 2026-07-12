import { describe, expect, it } from "vitest";
import {
  createSetupState,
  parseSetupProgress,
  reduceSetupState,
  serializeSetupProgress,
} from "./setup-state";

describe("setup state", () => {
  it("starts a new setup at the prepare step", () => {
    expect(createSetupState("rf-demo")).toEqual({
      progress: { completed: [], robotId: "rf-demo", version: 1 },
      status: "active",
      step: "prepare",
    });
  });

  it("advances only after the active step succeeds", () => {
    const next = reduceSetupState(createSetupState("rf-demo"), {
      step: "prepare",
      type: "succeed",
    });

    expect(next.progress.completed).toEqual(["prepare"]);
    expect(next.step).toBe("runtime");
    expect(next.status).toBe("active");
  });

  it("keeps a failed step active until the user retries", () => {
    const agentState = createSetupState("rf-demo", {
      completed: ["prepare", "runtime"],
      robotId: "rf-demo",
      version: 1,
    });
    const failed = reduceSetupState(agentState, {
      message: "อัปโหลด Agent ไม่สำเร็จ",
      type: "fail",
    });

    expect(failed).toMatchObject({
      message: "อัปโหลด Agent ไม่สำเร็จ",
      status: "error",
      step: "agent",
    });
    expect(reduceSetupState(failed, { type: "retry" })).toMatchObject({
      message: undefined,
      status: "active",
      step: "agent",
    });
  });

  it("restores valid progress and discards unknown or secret fields", () => {
    const progress = parseSetupProgress(
      JSON.stringify({
        completed: ["prepare", "runtime", "unknown"],
        robotId: "rf-saved",
        version: 1,
        wifiPassword: "must-not-survive",
      }),
      "rf-fallback",
    );

    expect(progress).toEqual({
      completed: ["prepare", "runtime"],
      robotId: "rf-saved",
      version: 1,
    });
    expect(serializeSetupProgress(progress)).toBe(
      '{"version":1,"robotId":"rf-saved","completed":["prepare","runtime"]}',
    );
  });

  it("recovers from corrupted or outdated stored progress", () => {
    expect(parseSetupProgress("not-json", "rf-new")).toEqual({
      completed: [],
      robotId: "rf-new",
      version: 1,
    });
    expect(
      parseSetupProgress(
        JSON.stringify({ completed: ["prepare"], robotId: "rf-old", version: 0 }),
        "rf-new",
      ),
    ).toEqual({ completed: [], robotId: "rf-new", version: 1 });
  });

  it("keeps only the longest contiguous prefix from semantically corrupted progress", () => {
    expect(parseSetupProgress(
      JSON.stringify({ completed: ["runtime"], robotId: "rf-saved", version: 1 }),
      "rf-new",
    ).completed).toEqual([]);
    expect(parseSetupProgress(
      JSON.stringify({ completed: ["prepare", "agent"], robotId: "rf-saved", version: 1 }),
      "rf-new",
    ).completed).toEqual(["prepare"]);
    expect(parseSetupProgress(
      JSON.stringify({ completed: ["prepare", "prepare", "runtime"], robotId: "rf-saved", version: 1 }),
      "rf-new",
    ).completed).toEqual(["prepare", "runtime"]);
  });
});
