import type { ApprovalRequest } from "../types";

export type ApprovalLifecycleStatus = "pending" | "approved" | "rejected" | "expired" | "executed";

export function deriveApprovalStatus(
  approval: ApprovalRequest,
  nowMs = Date.now(),
  executedIds?: ReadonlySet<string>
): ApprovalLifecycleStatus {
  if (executedIds?.has(approval.id)) {
    return "executed";
  }
  if (approval.status === "rejected") {
    return "rejected";
  }
  if (approval.status === "approved") {
    return "approved";
  }
  if (approval.status === "expired") {
    return "expired";
  }
  const expiresEpoch = Date.parse(approval.expiresAt);
  if (Number.isFinite(expiresEpoch) && expiresEpoch <= nowMs) {
    return "expired";
  }
  return "pending";
}
