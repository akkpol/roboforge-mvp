import { describe, expect, it } from "vitest";
import {
  clampDriveCommand,
  DemoRoverApi,
  getRoverErrorCode,
  RoverApiError,
} from "./api";

describe("clampDriveCommand", () => {
  it("keeps drive inputs within the Beta safety limits", () => {
    expect(
      clampDriveCommand({
        throttle: 2,
        steering: -3,
        speedLimit: 1,
        sequence: 8,
      }),
    ).toEqual({
      throttle: 1,
      steering: -1,
      speedLimit: 0.45,
      sequence: 8,
    });
  });
});

describe("DemoRoverApi", () => {
  it("arms and emergency stops the simulated rover", async () => {
    const api = new DemoRoverApi();
    expect((await api.setArmed(true)).armed).toBe(true);
    expect((await api.stop()).armed).toBe(false);
  });
});

describe("getRoverErrorCode", () => {
  it("preserves firmware error codes for contextual support", () => {
    expect(
      getRoverErrorCode(new RoverApiError("battery_configuration_mismatch", 409)),
    ).toBe("battery_configuration_mismatch");
  });
});
