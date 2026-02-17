import { describe, expect, it } from "vitest";
import { enforceHumanApproval, parseBooleanEnv } from "../apps/dashboard/src/human-approval.js";

describe("enforceHumanApproval", () => {
  it("fails closed when disabled", () => {
    expect(() => enforceHumanApproval({ enabled: false })).toThrowError(/required/i);
  });

  it("requires configured token", () => {
    expect(() =>
      enforceHumanApproval({
        enabled: true,
        providedToken: "x",
        expiresAtIso: new Date(Date.now() + 1000).toISOString()
      })
    ).toThrowError(/configured/i);
  });

  it("requires provided token", () => {
    expect(() =>
      enforceHumanApproval({
        enabled: true,
        requiredToken: "x",
        expiresAtIso: new Date(Date.now() + 1000).toISOString()
      })
    ).toThrowError(/required/i);
  });

  it("rejects invalid token", () => {
    expect(() =>
      enforceHumanApproval({
        enabled: true,
        requiredToken: "x",
        providedToken: "y",
        expiresAtIso: new Date(Date.now() + 1000).toISOString()
      })
    ).toThrowError(/invalid/i);
  });

  it("requires expiresAt timestamp", () => {
    expect(() =>
      enforceHumanApproval({
        enabled: true,
        requiredToken: "x",
        providedToken: "x"
      })
    ).toThrowError(/expiresAt/i);
  });

  it("rejects invalid expiresAt timestamp", () => {
    expect(() =>
      enforceHumanApproval({
        enabled: true,
        requiredToken: "x",
        providedToken: "x",
        expiresAtIso: "not-a-date"
      })
    ).toThrowError(/invalid/i);
  });

  it("rejects expired approval", () => {
    expect(() =>
      enforceHumanApproval({
        enabled: true,
        requiredToken: "x",
        providedToken: "x",
        expiresAtIso: new Date(Date.now() - 1000).toISOString()
      })
    ).toThrowError(/expired/i);
  });

  it("rejects approval for different proposal", () => {
    expect(() =>
      enforceHumanApproval({
        enabled: true,
        requiredToken: "x",
        providedToken: "x",
        expiresAtIso: new Date(Date.now() + 1000).toISOString(),
        approvedProposalId: "p-1",
        proposalId: "p-2"
      })
    ).toThrowError(/different proposal/i);
  });

  it("passes with valid approval", () => {
    expect(() =>
      enforceHumanApproval({
        enabled: true,
        requiredToken: "x",
        providedToken: "x",
        expiresAtIso: new Date(Date.now() + 1000).toISOString(),
        approvedProposalId: "p-1",
        proposalId: "p-1"
      })
    ).not.toThrow();
  });
});

describe("parseBooleanEnv", () => {
  it("parses true values", () => {
    expect(parseBooleanEnv("1", false)).toBe(true);
    expect(parseBooleanEnv("true", false)).toBe(true);
    expect(parseBooleanEnv("yes", false)).toBe(true);
    expect(parseBooleanEnv("on", false)).toBe(true);
  });

  it("parses false values", () => {
    expect(parseBooleanEnv("0", true)).toBe(false);
    expect(parseBooleanEnv("false", true)).toBe(false);
    expect(parseBooleanEnv("no", true)).toBe(false);
    expect(parseBooleanEnv("off", true)).toBe(false);
  });

  it("falls back on unknown values", () => {
    expect(parseBooleanEnv("unknown", true)).toBe(true);
    expect(parseBooleanEnv(undefined, false)).toBe(false);
  });
});
