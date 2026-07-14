import { describe, expect, it } from "vitest";
import { shouldOpenIncidentForAlert } from "../apps/dashboard/src/mission-control-server.js";

describe("mission-control incident policy", () => {
  it("does not open incidents for warning-grade learning alerts", () => {
    expect(
      shouldOpenIncidentForAlert({
        code: "LEARNING_SLIPPAGE_ELEVATED",
        severity: "warn"
      })
    ).toBe(false);
  });

  it("still opens incidents for error-grade learning alerts", () => {
    expect(
      shouldOpenIncidentForAlert({
        code: "LEARNING_EXPECTANCY_DEGRADATION",
        severity: "error"
      })
    ).toBe(true);
  });

  it("still opens incidents for approval governance alerts", () => {
    expect(
      shouldOpenIncidentForAlert({
        code: "APPROVAL_MODE_FALLBACK",
        severity: "warn"
      })
    ).toBe(true);
  });
});
