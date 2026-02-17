import type { BotApiClient } from "./BotApiClient";
import type { ConnectionHealth } from "./BotApiClient";
import type { ApprovalRequest, BotEvent, BotLifecycleState, ControlAction, DashboardSnapshot, UserRole } from "../types";
import { isActionEnabled, canRoleExecuteAction, transitionState } from "../logic/controlAvailability";
import {
  applyLifecycleAction,
  bumpState,
  initialAudit,
  initialEvents,
  initialLogs,
  initialReconciliation,
  initialRisk,
  initialState,
  nextEvent
} from "../mock/mockData";

export class MockBotApiClient implements BotApiClient {
  private state = initialState();
  private events = initialEvents();
  private risk = initialRisk();
  private reconciliation = initialReconciliation();
  private audit = initialAudit();
  private logs = initialLogs();
  private intervalRef: ReturnType<typeof setInterval> | undefined;
  private eventIndex = 0;
  private approvals: ApprovalRequest[] = [];
  private readonly approvalTtlMs = 5 * 60_000;

  private materializeApprovalState(item: ApprovalRequest): ApprovalRequest {
    if (item.status !== "pending") {
      return item;
    }
    if (Date.now() <= new Date(item.expiresAt).getTime()) {
      return item;
    }
    return {
      ...item,
      status: "expired",
      decidedAt: new Date().toISOString()
    };
  }

  private refreshApprovals(): void {
    this.approvals = this.approvals.map((item) => this.materializeApprovalState(item));
  }

  async getSnapshot(): Promise<DashboardSnapshot> {
    return {
      state: this.state,
      events: [...this.events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      risk: this.risk,
      reconciliation: this.reconciliation,
      audit: this.audit,
      logs: this.logs
    };
  }

  subscribeToEvents(
    onEvent: (event: BotEvent) => void,
    onConnectionHealthChange?: (health: ConnectionHealth) => void
  ): () => void {
    onConnectionHealthChange?.("live");
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
    this.intervalRef = setInterval(() => {
      this.state = bumpState(this.state);
      const event = nextEvent(this.eventIndex, this.state);
      this.eventIndex += 1;
      this.events = [event, ...this.events].slice(0, 400);
      if (event.type === "Error") {
        this.logs = [
          {
            id: `log-${Date.now()}`,
            at: event.timestamp,
            severity: "error" as const,
            symbol: event.symbol,
            message: event.message
          },
          ...this.logs
        ].slice(0, 300);
      }
      onEvent(event);
    }, 2000);

    return () => {
      if (this.intervalRef) {
        clearInterval(this.intervalRef);
        this.intervalRef = undefined;
      }
    };
  }

  async performAction(action: ControlAction, role: UserRole, userId: string, approvalId?: string): Promise<{
    ok: boolean;
    code: string;
    message: string;
    state: BotLifecycleState;
    details?: Record<string, string | number | boolean>;
  }> {
    if (!canRoleExecuteAction(role, action)) {
      return { ok: false, code: "UNAUTHORIZED", message: "Not authorized for this action", state: this.state.state };
    }

    const critical = action === "stop" || action === "cancel_all" || action === "emergency_stop";
    if (critical) {
      this.refreshApprovals();
      const found = this.approvals.find((item) => item.id === approvalId);
      if (!found || found.status !== "approved" || found.action !== action) {
        if (found?.status === "expired") {
          return {
            ok: false,
            code: "APPROVAL_EXPIRED",
            message: `Approval expired for action ${action}`,
            state: this.state.state,
            details: { approvalId: found.id }
          };
        }
        if (found?.status === "rejected") {
          return {
            ok: false,
            code: "APPROVAL_REJECTED",
            message: `Approval rejected for action ${action}`,
            state: this.state.state,
            details: { approvalId: found.id, rejectedBy: found.rejectedBy ?? "unknown" }
          };
        }
        const created: ApprovalRequest = {
          id: `approval-${Date.now()}`,
          action,
          status: "pending",
          requestedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + this.approvalTtlMs).toISOString(),
          requestedBy: userId,
          requiredApprovals: action === "emergency_stop" ? 2 : 1,
          approvalCount: 0,
          approvedBy: []
        };
        this.approvals = [created, ...this.approvals];
        return {
          ok: false,
          code: "APPROVAL_REQUIRED",
          message: `Approval required for action ${action}`,
          state: this.state.state,
          details: {
            approvalId: created.id,
            requiredApprovals: 1,
            approvalCount: 0
          }
        };
      }
    }

    if (!isActionEnabled(this.state.state, action)) {
      return {
        ok: false,
        code: "INVALID_STATE_TRANSITION",
        message: `Action ${action} is not available while bot is ${this.state.state}`,
        state: this.state.state
      };
    }

    this.state = applyLifecycleAction(this.state, transitionState(this.state.state, action));
    const actionEvent: BotEvent = {
      id: `evt-action-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "System",
      symbol: this.state.activeSymbol,
      message: `Control action executed: ${action}`,
      severity: "info",
      tags: ["manual_override"]
    };
    this.events = [actionEvent, ...this.events].slice(0, 400);
    this.logs = [
      {
        id: `log-action-${Date.now()}`,
        at: actionEvent.timestamp,
        severity: "info" as const,
        symbol: this.state.activeSymbol,
        message: actionEvent.message
      },
      ...this.logs
    ].slice(0, 300);

    return { ok: true, code: "OK", message: actionEvent.message, state: this.state.state };
  }

  async listApprovals(status?: "pending" | "approved" | "rejected" | "expired"): Promise<ApprovalRequest[]> {
    this.refreshApprovals();
    if (!status) {
      return [...this.approvals];
    }
    return this.approvals.filter((item) => item.status === status);
  }

  async approveApproval(id: string, userId: string): Promise<ApprovalRequest> {
    const existing = this.approvals.find((item) => item.id === id);
    if (!existing) {
      throw new Error(`Approval not found: ${id}`);
    }
    const approvedBySet = new Set(existing.approvedBy);
    approvedBySet.add(userId);
    const updated: ApprovalRequest = {
      ...existing,
      approvedBy: [...approvedBySet],
      approvalCount: approvedBySet.size,
      status: approvedBySet.size >= existing.requiredApprovals ? "approved" : "pending"
    };
    this.approvals = this.approvals.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  async rejectApproval(id: string, userId: string, reason?: string): Promise<ApprovalRequest> {
    this.refreshApprovals();
    const existing = this.approvals.find((item) => item.id === id);
    if (!existing) {
      throw new Error(`Approval not found: ${id}`);
    }
    if (existing.status !== "pending") {
      return existing;
    }
    const updated: ApprovalRequest = {
      ...existing,
      status: "rejected",
      rejectedBy: userId,
      rejectedReason: reason,
      decidedAt: new Date().toISOString()
    };
    this.approvals = this.approvals.map((item) => (item.id === id ? updated : item));
    return updated;
  }
}

export const mockBotApiClient = new MockBotApiClient();
