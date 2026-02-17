import { describe, expect, it } from "vitest";
import { ApprovalStore } from "../apps/dashboard/src/mission-control/approval-store.js";

describe("ApprovalStore", () => {
  it("creates pending request with ttl", () => {
    const store = new ApprovalStore(60_000);
    const item = store.create({ action: "stop", requestedBy: "alice" });

    expect(item.status).toBe("pending");
    expect(item.requestedBy).toBe("alice");
    expect(new Date(item.expiresAt).getTime()).toBeGreaterThan(new Date(item.requestedAt).getTime());
  });

  it("requires 2 approvals for emergency stop", () => {
    const store = new ApprovalStore();
    const item = store.create({ action: "emergency_stop", requestedBy: "alice" });
    expect(item.requiredApprovals).toBe(2);
  });

  it("keeps pending until required approvals reached", () => {
    const store = new ApprovalStore();
    const created = store.create({ action: "emergency_stop", requestedBy: "alice" });

    const first = store.approve(created.id, "alice");
    expect(first?.status).toBe("pending");

    const second = store.approve(created.id, "bob");
    expect(second?.status).toBe("approved");
    expect(second?.approvalCount).toBe(2);
  });

  it("ignores duplicate approver", () => {
    const store = new ApprovalStore();
    const created = store.create({ action: "stop", requestedBy: "alice" });

    store.approve(created.id, "alice");
    const second = store.approve(created.id, "alice");
    expect(second?.approvalCount).toBe(1);
    expect(second?.status).toBe("approved");
  });

  it("expires pending approvals", () => {
    const store = new ApprovalStore(1);
    const created = store.create({ action: "stop", requestedBy: "alice" });

    const expired = store.expirePending(Date.now() + 5);
    expect(expired.some((item) => item.id === created.id)).toBe(true);

    const current = store.get(created.id);
    expect(current?.status).toBe("expired");
  });

  it("rejects pending approval", () => {
    const store = new ApprovalStore();
    const created = store.create({ action: "stop", requestedBy: "alice" });
    const rejected = store.reject(created.id, "reviewer", "policy breach");

    expect(rejected?.status).toBe("rejected");
    expect(rejected?.rejectedBy).toBe("reviewer");
    expect(rejected?.rejectedReason).toBe("policy breach");
  });

  it("prevents action approval when action mismatch", () => {
    const store = new ApprovalStore();
    const created = store.create({ action: "stop", requestedBy: "alice" });
    store.approve(created.id, "alice");

    const check = store.isActionApproved("cancel_all", created.id);
    expect(check.ok).toBe(false);
  });

  it("returns all filtered statuses", () => {
    const store = new ApprovalStore(1);
    const a = store.create({ action: "stop", requestedBy: "alice" });
    const b = store.create({ action: "cancel_all", requestedBy: "bob" });

    store.approve(a.id, "alice");
    store.reject(b.id, "reviewer", "manual block");

    const approved = store.list("approved");
    const rejected = store.list("rejected");

    expect(approved.some((item) => item.id === a.id)).toBe(true);
    expect(rejected.some((item) => item.id === b.id)).toBe(true);
  });

  it("requires approval for demo order submit", () => {
    const store = new ApprovalStore();
    expect(store.isApprovalRequired("demo_order_submit")).toBe(true);
  });
});
