import type { BotApiClient } from "./BotApiClient";
import type { ClientDataSource, ConnectionHealth } from "./BotApiClient";
import type {
  AlertItem,
  ApprovalRequest,
  AutoExitConfig,
  BotEvent,
  BotLifecycleState,
  ControlAction,
  DashboardSnapshot,
  EntryAutonomyConfig,
  EntryAutonomyStatus,
  IncidentItem,
  ManagedTradeItem,
  Milestone5EvidenceSummary,
  StrategyDegradationConfig,
  StrategyPromotionStage,
  StrategyPromotionState,
  StrategyVersionRecord,
  UserRole
} from "../types";
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
  getDataSource(): ClientDataSource {
    return "mock_forced";
  }

  onDataSourceChange(listener: (source: ClientDataSource) => void): () => void {
    listener("mock_forced");
    return () => {
      return;
    };
  }

  setAuthToken(_: string | undefined): void {
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
  private autoExitConfig: AutoExitConfig = {
    enabled: true,
    maxHoldSec: 1800,
    takeProfitRMultiple: 1.5,
    flattenTimeUtc: undefined,
    exitOffsetBps: 5
  };
  private managedTrades: ManagedTradeItem[] = [];
  private entryAutonomy: { config: EntryAutonomyConfig; status: EntryAutonomyStatus } = {
    config: {
      approvalMode: "manual",
      allowedSymbols: ["BTC-USDT", "ETH-USDT", "SOL-USDT"],
      maxPerOrderNotionalUsd: 10,
      maxOpenExposureUsd: 20,
      maxDailyLossUsd: 5,
      maxWeeklyLossUsd: 15,
      lossStreakCooldownCount: 3,
      cooldownMinutes: 60,
      strategyVersion: "champion-v1",
      policyVersion: "m6-policy-v1"
    },
    status: {
      approvalMode: "manual",
      fallbackActive: false,
      lastPolicyAutoBlockers: []
    }
  };
  private strategyPromotion: StrategyPromotionState = {
    activeVersion: "champion-v1",
    championVersion: "champion-v1",
    previousStableVersion: "champion-v1",
    versions: [
      {
        version: "champion-v1",
        stage: "shadow",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    history: []
  };
  private strategyDegradationConfig: StrategyDegradationConfig = {
    enabled: true,
    maxDailyLossUsd: 5,
    maxDrawdownPct: -5,
    maxConsecutiveLosingTrades: 4
  };
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
      },
      exchange: {
        connected: false,
        mode: "demo",
        source: "none",
        lastHealthCheckAt: new Date().toISOString(),
        lastError: "Mock mode forced by UI configuration."
      },
      portfolio: {
        totalEq: "0",
        balances: [],
        lastUpdatedAt: new Date().toISOString(),
        lastError: "Portfolio unavailable in forced mock mode.",
        performance: {
          sessionStartEqUsd: 0,
          currentEqUsd: 0,
          deltaUsd: 0,
          deltaPct: 0,
          timeline: [],
          trades: [],
          daily: {
            day: new Date().toISOString().slice(0, 10),
            realizedPnlUsd: 0,
            unrealizedPnlUsd: 0,
            feesUsd: 0,
            winRate: 0,
            wins: 0,
            losses: 0,
            closedTrades: 0
          }
        }
      },
      openOrders: {
        orders: [],
        lastUpdatedAt: new Date().toISOString(),
        lastError: "Open orders unavailable in forced mock mode."
      },
      demoQueue: []
    };
  }

  subscribeToEvents(
    onEvent: (event: BotEvent) => void,
    onConnectionHealthChange?: (health: ConnectionHealth) => void,
    onDataSourceChange?: (source: ClientDataSource) => void
  ): () => void {
    onConnectionHealthChange?.("live");
    onDataSourceChange?.("mock_forced");
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

    const critical =
      action === "stop" || action === "cancel_all" || action === "emergency_stop" || action === "demo_order_submit";
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

    if (action !== "demo_order_submit" && !isActionEnabled(this.state.state, action)) {
      this.metrics.controlFailuresTotal += 1;
      return {
        ok: false,
        code: "INVALID_STATE_TRANSITION",
        message: `Action ${action} is not available while bot is ${this.state.state}`,
        state: this.state.state
      };
    }

    if (action !== "demo_order_submit") {
      this.state = applyLifecycleAction(this.state, transitionState(this.state.state, action));
    }
    const actionEvent: BotEvent = {
      id: `evt-action-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: action === "demo_order_submit" ? "OrderSubmitted" : "System",
      symbol: this.state.activeSymbol,
      message:
        action === "demo_order_submit" ? "Demo order submitted via approved action" : `Control action executed: ${action}`,
      severity: "info",
      tags: action === "demo_order_submit" ? ["demo_execution", "mock"] : ["manual_override"]
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

  async acknowledgeAlert(id: string, _role: UserRole, userId: string): Promise<AlertItem> {
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

  async resolveAlert(id: string, _role: UserRole, userId: string): Promise<AlertItem> {
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

  async clearEventStreamsAndLogs(role: UserRole, _: string): Promise<{
    ok: boolean;
    code: string;
    message: string;
    state: BotLifecycleState;
    details?: Record<string, string | number | boolean>;
  }> {
    if (role === "read_only") {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Not authorized for this action",
        state: this.state.state
      };
    }
    const eventsDeleted = this.events.length;
    const logsCleared = this.logs.length;
    const auditDeleted = this.audit.length;
    const incidentsDeleted = this.incidents.length;
    this.events = [];
    this.logs = [];
    this.audit = [];
    this.incidents = [];
    return {
      ok: true,
      code: "OK",
      message: "Event streams and logs cleared",
      state: this.state.state,
      details: {
        eventsDeleted,
        logsCleared,
        auditDeleted,
        incidentsDeleted
      }
    };
  }

  async listIncidents(status?: "open" | "acknowledged" | "resolved"): Promise<IncidentItem[]> {
    if (!status) {
      return [...this.incidents];
    }
    return this.incidents.filter((item) => item.status === status);
  }

  async acknowledgeIncident(id: string, _role: UserRole, userId: string): Promise<IncidentItem> {
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

  async resolveIncident(id: string, _role: UserRole, userId: string): Promise<IncidentItem> {
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

  async getAutoExitConfig(): Promise<AutoExitConfig> {
    return { ...this.autoExitConfig };
  }

  async updateAutoExitConfig(_role: UserRole, _userId: string, input: Partial<AutoExitConfig>): Promise<AutoExitConfig> {
    this.autoExitConfig = {
      ...this.autoExitConfig,
      ...input
    };
    return { ...this.autoExitConfig };
  }

  async listManagedTrades(): Promise<ManagedTradeItem[]> {
    return [...this.managedTrades];
  }

  async getMilestone5Evidence(): Promise<Milestone5EvidenceSummary> {
    const today = new Date().toISOString().slice(0, 10);
    return {
      policyVersion: "calendar-day-v1",
      requiredDays: 7,
      qualifiedDays: 0,
      streakDays: 0,
      milestoneReady: false,
      generatedAt: new Date().toISOString(),
      today: {
        day: today,
        pass: false,
        source: "live",
        blockers: ["No soak evidence yet."],
        closureRatePct: 0,
        filledEntries: 0,
        deterministicClosed: 0,
        reconciliationPass: true,
        tradeErrors: 0
      },
      days: []
    };
  }

  async getEntryAutonomyConfig(): Promise<{ config: EntryAutonomyConfig; status: EntryAutonomyStatus }> {
    return {
      config: { ...this.entryAutonomy.config },
      status: { ...this.entryAutonomy.status, lastPolicyAutoBlockers: [...this.entryAutonomy.status.lastPolicyAutoBlockers] }
    };
  }

  async updateEntryAutonomyConfig(
    _role: UserRole,
    _userId: string,
    input: Partial<EntryAutonomyConfig>
  ): Promise<{ config: EntryAutonomyConfig; status: EntryAutonomyStatus }> {
    this.entryAutonomy = {
      config: {
        ...this.entryAutonomy.config,
        ...input
      },
      status: {
        ...this.entryAutonomy.status,
        approvalMode: input.approvalMode ?? this.entryAutonomy.status.approvalMode
      }
    };
    return this.getEntryAutonomyConfig();
  }

  async getStrategyPromotion(): Promise<{ state: StrategyPromotionState }> {
    return { state: JSON.parse(JSON.stringify(this.strategyPromotion)) as StrategyPromotionState };
  }

  async registerStrategyVersion(
    _role: UserRole,
    userId: string,
    input: {
      version: string;
      notes?: string;
      challenger?: boolean;
      artifacts?: { researchReportUrl?: string; shadowReportUrl?: string; canaryReportUrl?: string };
    }
  ): Promise<{ state: StrategyPromotionState }> {
    const nowIso = new Date().toISOString();
    const existing = this.strategyPromotion.versions.find((item) => item.version === input.version);
    if (!existing) {
      const record: StrategyVersionRecord = {
        version: input.version,
        stage: "research",
        status: "candidate",
        createdAt: nowIso,
        updatedAt: nowIso,
        notes: input.notes,
        artifacts: input.artifacts
      };
      this.strategyPromotion.versions.unshift(record);
      if (input.challenger) {
        this.strategyPromotion.challengerVersion = input.version;
      }
      this.strategyPromotion.history.unshift({
        at: nowIso,
        action: "register",
        version: input.version,
        actor: userId,
        toStage: "research"
      });
    }
    return this.getStrategyPromotion();
  }

  async promoteStrategyVersion(
    _role: UserRole,
    userId: string,
    input: {
      version: string;
      targetStage: StrategyPromotionStage;
      reason?: string;
      artifacts?: { researchReportUrl?: string; shadowReportUrl?: string; canaryReportUrl?: string };
    }
  ): Promise<{ state: StrategyPromotionState }> {
    const nowIso = new Date().toISOString();
    const current = this.strategyPromotion.versions.find((item) => item.version === input.version);
    if (!current) {
      throw new Error("strategy_not_found");
    }
    const next: StrategyVersionRecord = {
      ...current,
      stage: input.targetStage,
      status: input.targetStage === "limited_prod" ? "active" : "candidate",
      updatedAt: nowIso,
      artifacts: {
        ...current.artifacts,
        ...input.artifacts
      }
    };
    this.strategyPromotion.versions = this.strategyPromotion.versions.map((item) => (item.version === input.version ? next : item));
    if (input.targetStage === "limited_prod") {
      this.strategyPromotion.previousStableVersion = this.strategyPromotion.activeVersion;
      this.strategyPromotion.activeVersion = input.version;
      this.strategyPromotion.championVersion = input.version;
      this.entryAutonomy.config.strategyVersion = input.version;
    }
    this.strategyPromotion.history.unshift({
      at: nowIso,
      action: "promote",
      version: input.version,
      actor: userId,
      fromStage: current.stage,
      toStage: input.targetStage,
      reason: input.reason
    });
    return this.getStrategyPromotion();
  }

  async rollbackStrategy(_role: UserRole, userId: string, reason?: string): Promise<{ state: StrategyPromotionState }> {
    const activeVersion = this.strategyPromotion.activeVersion;
    const previous = this.strategyPromotion.previousStableVersion;
    if (!previous || previous === activeVersion) {
      throw new Error("rollback_not_available");
    }
    const nowIso = new Date().toISOString();
    this.strategyPromotion.activeVersion = previous;
    this.strategyPromotion.championVersion = previous;
    this.strategyPromotion.challengerVersion = activeVersion;
    this.entryAutonomy.config.strategyVersion = previous;
    this.strategyPromotion.history.unshift({
      at: nowIso,
      action: "rollback",
      version: activeVersion,
      actor: userId,
      reason
    });
    return this.getStrategyPromotion();
  }

  async getStrategyDegradationConfig(): Promise<StrategyDegradationConfig> {
    return { ...this.strategyDegradationConfig };
  }

  async updateStrategyDegradationConfig(
    _role: UserRole,
    _userId: string,
    input: Partial<StrategyDegradationConfig>
  ): Promise<StrategyDegradationConfig> {
    this.strategyDegradationConfig = { ...this.strategyDegradationConfig, ...input };
    return { ...this.strategyDegradationConfig };
  }
}

export const mockBotApiClient = new MockBotApiClient();
