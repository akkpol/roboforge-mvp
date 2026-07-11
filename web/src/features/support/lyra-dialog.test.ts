import { describe, expect, it } from "vitest";
import { readTextDelta } from "./lyra-stream";

describe("Lyra stream parsing", () => {
  it("reads text deltas and safely ignores malformed or unrelated events", () => {
    expect(readTextDelta('data: {"type":"text-delta","delta":"สวัสดี"}')).toBe("สวัสดี");
    expect(readTextDelta('data: {"type":"finish"}')).toBe("");
    expect(readTextDelta("data: not-json")).toBe("");
    expect(readTextDelta("event: text-delta")).toBe("");
  });
});
