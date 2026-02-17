import type { BotApiClient } from "./BotApiClient";
import type { ConnectionHealth } from "./BotApiClient";
import type { AlertItem, ApprovalRequest, BotEvent, BotLifecycleState, ControlAction, DashboardSnapshot, IncidentItem, UserRole } from "../types";
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
  setAuthToken(_token: string | undefined): void {
    return;
  }

  private state = initialState();
  private events = initialEvents();
  private risk = initialRisk();
  private reconciliation = initialReconciliation();
  private audit = initialAudit();
  private logs = initialLogs();
  private intervalRef: ReturnType<typeof setInterval> | undefined;
  private eventIndex = 0;
  private approvals: ApprovalRequest[] = [];
  private alerts: AlertItem[] = [];
  private incidents: IncidentItem[] = [];
  private metrics = {
    controlRequestsTotal: 0,
    controlFailuresTotal: 0,
    wsConnectionsTotal: 0,
    wsDisconnectsTotal: 0,
    gatekeeperRejectsTotal: 0,
    driftEventsTotal: 0,
    heartbeatGapEventsTotal: 0,
    lastHeartbeatGapMs: 0,
    openAlerts: 0,
    openIncidents: 0,
    reconcileRunsTotal: 0
  };
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
      logs: this.logs,
      alerts: this.alerts,
      incidents: this.incidents,
      metrics: {
        ...this.metrics,
        openAlerts: this.alerts.filter((item) => item.status === "open").length,
        openIncidents: this.incidents.filter((item) => item.status !== "resolved").length
      }
    };
  }

  subscribeToEvents(
    onEvent: (event: BotEvent) => void,
    onConnectionHealthChange?: (health: ConnectionHealth) => void
  ): () => void {
    onConnectionHealthChange?.("live");
    this.metrics.wsConnectionsTotal += 1;
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
        this.alerts = [
          {
            id: `alert-${Date.now()}`,
            code: "EVENT_ERROR",
            severity: "error" as const,
            status: "open" as const,
            source: "system" as const,
            title: "Runtime error event",
            detail: event.message,
            symbol: event.symbol,
            firstSeenAt: event.timestamp,
            lastSeenAt: event.timestamp,
            count: 1
          },
          ...this.alerts
        ].slice(0, 200);
        this.incidents = [
          {
            id: `incident-${Date.now()}`,
            status: "open" as const,
            severity: "sev2" as const,
            taxonomy: "exchange_reliability" as const,
            title: "Runtime error incident",
            detail: event.message,
            runbookRef: "docs/runbooks/exchange-reliability.md",
            symbol: event.symbol,
            sourceAlertCode: "EVENT_ERROR",
            createdAt: event.timestamp,
            updatedAt: event.timestamp
          },
          ...this.incidents
        ].slice(0, 200);
      }
      onEvent(event);
    }, 2000);

    return () => {
      if (this.intervalRef) {
        clearInterval(this.intervalRef);
        this.intervalRef = undefined;
      }
      this.metrics.wsDisconnectsTotal += 1;
    };
  }

  async performAction(action: ControlAction, role: UserRole, userId: string, approvalId?: string): Promise<{
    ok: boolean;
    code: string;
    message: string;
    state: BotLifecycleState;
    details?: Record<string, string | number | boolean>;
  }> {
    this.metrics.controlRequestsTotal += 1;
    if (!canRoleExecuteAction(role, action)) {
      this.metrics.controlFailuresTotal += 1;
      return { ok: false, code: "UNAUTHORIZED", message: "Not authorized for this action", state: this.state.state };
    }

    const critical = action === "stop" || action === "cancel_all" || action === "emergency_stop";
    if (critical) {
      this.refreshApprovals();
      const found = this.approvals.find((item) => item.id === approvalId);
      if (!found || found.status !== "approved" || found.action !== action) {
        if (found?.status === "expired") {
          this.metrics.controlFailuresTotal += 1;
          return {
            ok: false,
            code: "APPROVAL_EXPIRED",
            message: `Approval expired for action ${action}`,
            state: this.state.state,
            details: { approvalId: found.id }
          };
        }
        if (found?.status === "rejected") {
          this.metrics.controlFailuresTotal += 1;
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
      this.metrics.controlFailuresTotal += 1;
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

  async listAlerts(status?: "open" | "acknowledged" | "resolved"): Promise<AlertItem[]> {
    if (!status) {
      return [...this.alerts];
    }
    return this.alerts.filter((item) => item.status === status);
  }

  async acknowledgeAlert(id: string, userId: string): Promise<AlertItem> {
    const existing = this.alerts.find((item) => item.id === id);
    if (!existing) {
      throw new Error(`Alert not found: ${id}`);
    }
    const updated: AlertItem = {
      ...existing,
      status: existing.status === "resolved" ? "resolved" : "acknowledged",
      acknowledgedBy: userId,
      acknowledgedAt: new Date().toISOString()
    };
    this.alerts = this.alerts.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  async resolveAlert(id: string, userId: string): Promise<AlertItem> {
    const existing = this.alerts.find((item) => item.id === id);
    if (!existing) {
      throw new Error(`Alert not found: ${id}`);
    }
    const updated: AlertItem = {
      ...existing,
      status: "resolved",
      resolvedBy: userId,
      resolvedAt: new Date().toISOString()
    };
    this.alerts = this.alerts.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  async updateReconciliation(
    role: UserRole,
    _userId: string,
    input: Partial<Pick<DashboardSnapshot["reconciliation"], "positions" | "pnl" | "orders">>
  ): Promise<DashboardSnapshot["reconciliation"]> {
    if (role === "read_only") {
      throw new Error("UNAUTHORIZED");
    }
    this.reconciliation = {
      ...this.reconciliation,
      ...input,
      lastRunAt: new Date().toISOString()
    };
    const drift =
      this.reconciliation.positions === "drift" ||
      this.reconciliation.pnl === "drift" ||
      this.reconciliation.orders === "drift" ||
      this.reconciliation.positions === "error" ||
      this.reconciliation.pnl === "error" ||
      this.reconciliation.orders === "error";
    if (drift && this.state.state === "running") {
      this.metrics.driftEventsTotal += 1;
      this.state = applyLifecycleAction(this.state, "paused");
      const ts = new Date().toISOString();
      this.events = [
        {
          id: `evt-cb-${Date.now()}`,
          timestamp: ts,
          type: "ControlCommandRejected" as const,
          symbol: this.state.activeSymbol,
          message: "Circuit breaker auto-pause due to reconciliation drift/error",
          severity: "error" as const,
          tags: ["circuit_breaker", "reconciliation_drift"]
        },
        ...this.events
      ].slice(0, 400);
    }
    this.metrics.reconcileRunsTotal += 1;
    return this.reconciliation;
  }

  async listIncidents(status?: "open" | "acknowledged" | "resolved"): Promise<IncidentItem[]> {
    if (!status) {
      return [...this.incidents];
    }
    return this.incidents.filter((item) => item.status === status);
  }

  async acknowledgeIncident(id: string, userId: string): Promise<IncidentItem> {
    const existing = this.incidents.find((item) => item.id === id);
    if (!existing) {
      throw new Error(`Incident not found: ${id}`);
    }
    const updated: IncidentItem = {
      ...existing,
      status: existing.status === "resolved" ? "resolved" : "acknowledged",
      acknowledgedBy: userId,
      acknowledgedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.incidents = this.incidents.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  async resolveIncident(id: string, userId: string): Promise<IncidentItem> {
    const existing = this.incidents.find((item) => item.id === id);
    if (!existing) {
      throw new Error(`Incident not found: ${id}`);
    }
    const updated: IncidentItem = {
      ...existing,
      status: "resolved",
      resolvedBy: userId,
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.incidents = this.incidents.map((item) => (item.id === id ? updated : item));
    return updated;
  }
}

export const mockBotApiClient = new MockBotApiClient();
