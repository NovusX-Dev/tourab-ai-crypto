import { describe, expect, it } from "vitest";
import { canRoleExecuteAction } from "../logic/controlAvailability";

describe("canRoleExecuteAction", () => {
  it("blocks read-only role", () => {
    expect(canRoleExecuteAction("read_only", "start")).toBe(false);
    expect(canRoleExecuteAction("read_only", "emergency_stop")).toBe(false);
  });

  it("allows operator and admin", () => {
    expect(canRoleExecuteAction("operator", "start")).toBe(true);
    expect(canRoleExecuteAction("admin", "cancel_all")).toBe(true);
  });
});
