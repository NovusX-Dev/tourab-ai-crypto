import { describe, expect, it } from "vitest";
import { RuntimeLifecycleManager } from "../apps/dashboard/src/mission-control/runtime-lifecycle-manager.js";

describe("runtime lifecycle manager", () => {
  it("accepts start transition from stopped", () => {
    const manager = new RuntimeLifecycleManager();
    const result = manager.applyAction("start");
    expect(result.ok).toBe(true);
    expect(result.state.state).toBe("running");
  });

  it("rejects invalid transition", () => {
    const manager = new RuntimeLifecycleManager();
    const result = manager.applyAction("resume");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_STATE_TRANSITION");
  });
});
