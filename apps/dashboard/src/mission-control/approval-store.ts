import { randomUUID } from "node:crypto";
import type { ApprovalRequest, ControlAction } from "@tourab/shared";

const CRITICAL_ACTIONS = new Set<ControlAction>(["stop", "cancel_all", "emergency_stop", "demo_order_submit"]);

interface CreateApprovalInput {
  action: ControlAction;
  requestedBy: string;
  reason?: string;
}

export class ApprovalStore {
  private readonly items = new Map<string, ApprovalRequest>();
  constructor(private readonly ttlMs: number = 5 * 60_000) {}

  private expireIfNeeded(current: ApprovalRequest, nowMs = Date.now()): ApprovalRequest {
    if (current.status !== "pending") {
      return current;
    }
    if (nowMs <= new Date(current.expiresAt).getTime()) {
      return current;
    }
    return {
      ...current,
      status: "expired",
      decidedAt: new Date(nowMs).toISOString()
    };
  }

  isApprovalRequired(action: ControlAction): boolean {
    return CRITICAL_ACTIONS.has(action);
  }

  create(input: CreateApprovalInput): ApprovalRequest {
    const now = new Date();
    const requiredApprovals = input.action === "emergency_stop" ? 2 : 1;
    const item: ApprovalRequest = {
      id: randomUUID(),
      action: input.action,
      status: "pending",
      reason: input.reason,
      requestedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.ttlMs).toISOString(),
      requestedBy: input.requestedBy,
      requiredApprovals,
      approvalCount: 0,
      approvedBy: []
    };
    this.items.set(item.id, item);
    return item;
  }

  approve(id: string, actor: string): ApprovalRequest | undefined {
    const current = this.get(id);
    if (!current || current.status !== "pending") {
      return current;
    }

    const approvedBySet = new Set(current.approvedBy);
    approvedBySet.add(actor);

    const approvalCount = approvedBySet.size;
    const next: ApprovalRequest = {
      ...current,
      approvedBy: [...approvedBySet],
      approvalCount,
      status: approvalCount >= current.requiredApprovals ? "approved" : "pending",
      decidedAt: approvalCount >= current.requiredApprovals ? new Date().toISOString() : undefined
    };

    this.items.set(id, next);
    return next;
  }

  get(id: string): ApprovalRequest | undefined {
    const current = this.items.get(id);
    if (!current) {
      return undefined;
    }
    const next = this.expireIfNeeded(current);
    if (next !== current) {
      this.items.set(id, next);
    }
    return next;
  }

  list(status?: ApprovalRequest["status"]): ApprovalRequest[] {
    const all = [...this.items.keys()]
      .map((id) => this.get(id))
      .filter((item): item is ApprovalRequest => Boolean(item))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    if (!status) {
      return all;
    }
    return all.filter((item) => item.status === status);
  }

  reject(id: string, actor: string, reason?: string): ApprovalRequest | undefined {
    const current = this.get(id);
    if (!current) {
      return undefined;
    }
    if (current.status !== "pending") {
      return current;
    }
    const rejected: ApprovalRequest = {
      ...current,
      status: "rejected",
      rejectedBy: actor,
      rejectedReason: reason,
      decidedAt: new Date().toISOString()
    };
    this.items.set(id, rejected);
    return rejected;
  }

  expirePending(nowMs = Date.now()): ApprovalRequest[] {
    const expired: ApprovalRequest[] = [];
    for (const [id, item] of this.items.entries()) {
      const next = this.expireIfNeeded(item, nowMs);
      if (next !== item) {
        this.items.set(id, next);
        if (next.status === "expired") {
          expired.push(next);
        }
      }
    }
    return expired;
  }

  isActionApproved(action: ControlAction, approvalId: string | undefined): { ok: boolean; request?: ApprovalRequest } {
    if (!this.isApprovalRequired(action)) {
      return { ok: true };
    }
    if (!approvalId) {
      return { ok: false };
    }
    const request = this.get(approvalId);
    if (!request) {
      return { ok: false };
    }
    if (request.action !== action) {
      return { ok: false, request };
    }
    return { ok: request.status === "approved", request };
  }

  clear(): void {
    this.items.clear();
  }
}
