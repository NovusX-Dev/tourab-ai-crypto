import type {
  AuditItem,
  BotEvent,
  BotLifecycleState,
  BotStateSnapshot,
  EventType,
  LogEntry,
  ReconciliationStatus,
  RiskStatus
} from "../types";

const SYMBOLS = ["BTC-USDT", "ETH-USDT", "SOL-USDT"];

function nowIso(): string {
  return new Date().toISOString();
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function createEvent(id: string, type: EventType, symbol: string, message: string): BotEvent {
  const severity = type === "Error" ? "error" : type === "RiskLimitHit" ? "warn" : "info";
  return {
    id,
    timestamp: nowIso(),
    type,
    symbol,
    message,
    severity,
    tags: type === "GatekeeperDecision" ? ["risk_blocked"] : []
  };
}

export function initialState(): BotStateSnapshot {
  return {
    state: "stopped",
    cycleCount: 0,
    cycleProgress: 0,
    activeSymbol: "BTC-USDT",
    mode: "simulation",
    lastHeartbeatAt: nowIso()
  };
}

export function initialRisk(): RiskStatus {
  return {
    limits: [
      { key: "max_pos", label: "Max Position Size", current: 0.36, limit: 1, unit: "BTC" },
      { key: "max_daily_loss", label: "Max Daily Loss", current: 180, limit: 1200, unit: "USDT" },
      { key: "notional", label: "Max Notional", current: 8500, limit: 30000, unit: "USDT" }
    ],
    activeBlocks: [
      {
        symbol: "BTC-USDT",
        reason: "Trading blocked due to volatility spike",
        since: new Date(Date.now() - 10 * 60_000).toISOString()
      }
    ],
    recentRejects: [
      {
        id: "reject-1",
        symbol: "BTC-USDT",
        reason: "Proposal rejected: slippage threshold exceeded",
        at: new Date(Date.now() - 20 * 60_000).toISOString()
      }
    ]
  };
}

export function initialReconciliation(): ReconciliationStatus {
  return {
    positions: "ok",
    pnl: "ok",
    orders: "in_progress",
    lastRunAt: new Date(Date.now() - 5 * 60_000).toISOString()
  };
}

export function initialAudit(): AuditItem[] {
  return [
    {
      id: "audit-1",
      at: new Date(Date.now() - 35 * 60_000).toISOString(),
      title: "Run started",
      detail: "Automation run started in simulation mode",
      symbol: "BTC-USDT",
      relatedEventType: "ProposalCreated"
    },
    {
      id: "audit-2",
      at: new Date(Date.now() - 28 * 60_000).toISOString(),
      title: "Risk breach",
      detail: "Temporary risk block applied after volatility burst",
      symbol: "BTC-USDT",
      relatedEventType: "RiskLimitHit"
    },
    {
      id: "audit-3",
      at: new Date(Date.now() - 6 * 60_000).toISOString(),
      title: "Reconciliation",
      detail: "Order reconciliation completed with one drift warning",
      relatedEventType: "ReconciliationComplete"
    }
  ];
}

export function initialLogs(): LogEntry[] {
  return [
    {
      id: "log-1",
      at: new Date(Date.now() - 20 * 60_000).toISOString(),
      severity: "info",
      symbol: "BTC-USDT",
      message: "Cycle complete: proposal evaluated"
    },
    {
      id: "log-2",
      at: new Date(Date.now() - 16 * 60_000).toISOString(),
      severity: "warn",
      symbol: "BTC-USDT",
      message: "Gatekeeper warn: market spread widening"
    },
    {
      id: "log-3",
      at: new Date(Date.now() - 10 * 60_000).toISOString(),
      severity: "error",
      symbol: "ETH-USDT",
      message: "Order submit failed: temporary exchange timeout"
    }
  ];
}

export function initialEvents(): BotEvent[] {
  return [
    createEvent("evt-1", "ProposalCreated", "BTC-USDT", "New proposal created from signal engine"),
    createEvent("evt-2", "GatekeeperDecision", "BTC-USDT", "Gatekeeper blocked: volatility threshold breached"),
    createEvent("evt-3", "ReconciliationComplete", "BTC-USDT", "Reconciliation run completed"),
    createEvent("evt-4", "OrderSubmitted", "ETH-USDT", "Order submitted in simulation mode"),
    createEvent("evt-5", "OrderFilled", "ETH-USDT", "Order filled at 3,210.10")
  ];
}

export function nextEvent(eventIndex: number, state: BotStateSnapshot): BotEvent {
  const sequence: EventType[] = [
    "ProposalCreated",
    "GatekeeperDecision",
    "ProposalApproved",
    "OrderSubmitted",
    "OrderFilled",
    "OrderCancelled",
    "RiskLimitHit",
    "Error",
    "ReconciliationComplete",
    "System"
  ];
  const type = sequence[eventIndex % sequence.length] as EventType;
  const symbol = state.activeSymbol || randomItem(SYMBOLS);
  const messages: Record<EventType, string> = {
    ProposalCreated: "Proposal generated from latest market snapshot",
    GatekeeperDecision: "Gatekeeper approved proposal within constraints",
    ProposalApproved: "Manual approval token accepted",
    OrderSubmitted: "Order submitted to demo adapter",
    OrderFilled: "Order fill received",
    OrderCancelled: "Open order canceled by operator",
    Error: "Transient execution error captured and retried",
    RiskLimitHit: "Risk limit threshold reached, tightening controls",
    ReconciliationComplete: "Reconciliation completed with no critical drift",
    System: "Heartbeat and telemetry checkpoint",
    BotStateChanged: "Bot state changed",
    ControlCommandAccepted: "Control command accepted",
    ControlCommandRejected: "Control command rejected"
  };

  return createEvent(`evt-live-${eventIndex}-${Date.now()}`, type, symbol, messages[type]);
}

export function bumpState(state: BotStateSnapshot): BotStateSnapshot {
  const next: BotStateSnapshot = { ...state, lastHeartbeatAt: nowIso() };
  if (state.state === "running") {
    const progress = Math.min(100, state.cycleProgress + 20);
    next.cycleProgress = progress;
    if (progress >= 100) {
      next.cycleProgress = 0;
      next.cycleCount += 1;
      next.activeSymbol = randomItem(SYMBOLS);
    }
  }
  return next;
}

export function applyLifecycleAction(state: BotStateSnapshot, nextState: BotLifecycleState): BotStateSnapshot {
  return {
    ...state,
    state: nextState,
    cycleProgress: nextState === "stopped" ? 0 : state.cycleProgress,
    lastHeartbeatAt: nowIso()
  };
}
