import { describe, expect, it } from "vitest";
import { canRoleExecuteAction, isActionEnabled } from "../apps/dashboard/src/mission-control/policy.js";

describe("mission-control policy", () => {
  it("enforces role gating", () => {
    expect(canRoleExecuteAction("read_only", "start")).toBe(false);
    expect(canRoleExecuteAction("operator", "start")).toBe(true);
    expect(canRoleExecuteAction("admin", "emergency_stop")).toBe(true);
  });

  it("enforces lifecycle transitions", () => {
    expect(isActionEnabled("stopped", "start")).toBe(true);
    expect(isActionEnabled("running", "start")).toBe(false);
    expect(isActionEnabled("paused", "resume")).toBe(true);
    expect(isActionEnabled("stopped", "cancel_all")).toBe(false);
  });
});
