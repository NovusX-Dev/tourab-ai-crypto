import { describe, expect, it } from "vitest";
import { isActionEnabled } from "../logic/controlAvailability";

describe("isActionEnabled", () => {
  it("allows start only when stopped", () => {
    expect(isActionEnabled("stopped", "start")).toBe(true);
    expect(isActionEnabled("running", "start")).toBe(false);
    expect(isActionEnabled("paused", "start")).toBe(false);
  });

  it("enables pause/resume on valid states", () => {
    expect(isActionEnabled("running", "pause")).toBe(true);
    expect(isActionEnabled("paused", "resume")).toBe(true);
    expect(isActionEnabled("stopped", "pause")).toBe(false);
  });
});
