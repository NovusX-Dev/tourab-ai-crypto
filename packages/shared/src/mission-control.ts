export type BotLifecycleState = "running" | "paused" | "stopped";
export type BotMode = "simulation" | "live" | "backtest" | "paper";
export type UserRole = "read_only" | "operator" | "admin";

export type EventType =
  | "ProposalCreated"
  | "GatekeeperDecision"
  | "ProposalApproved"
  | "OrderSubmitted"
  | "OrderFilled"
  | "OrderCancelled"
  | "Error"
  | "RiskLimitHit"
  | "ReconciliationComplete"
  | "System"
  | "BotStateChanged"
  | "ControlCommandAccepted"
  | "ControlCommandRejected";

export type EventSeverity = "info" | "warn" | "error";

export interface BotEvent {
  id: string;
  timestamp: string;
  type: EventType;
  symbol: string;
  message: string;
  tags?: string[];
  severity: EventSeverity;
  correlationId?: string;
}

export interface BotStateSnapshot {
  state: BotLifecycleState;
  cycleCount: number;
  cycleProgress: number;
  activeSymbol: string;
  mode: BotMode;
  lastHeartbeatAt: string;
}

export type ReconciliationState = "ok" | "drift" | "error" | "in_progress";

export interface ReconciliationStatus {
  positions: ReconciliationState;
  pnl: ReconciliationState;
  orders: ReconciliationState;
  lastRunAt: string;
}

export interface RiskLimit {
  key: string;
  label: string;
  current: number;
  limit: number;
  unit: string;
}

export interface RiskBlock {
  symbol: string;
  reason: string;
  since: string;
}

export interface RejectReason {
  id: string;
  symbol: string;
  reason: string;
  at: string;
}

export interface RiskStatus {
  limits: RiskLimit[];
  activeBlocks: RiskBlock[];
  recentRejects: RejectReason[];
}

export interface AuditItem {
  id: string;
  at: string;
  title: string;
  detail: string;
  symbol?: string;
  relatedEventType?: EventType;
}

export interface LogEntry {
  id: string;
  at: string;
  severity: EventSeverity;
  symbol?: string;
  message: string;
}

export type ControlAction = "start" | "pause" | "resume" | "stop" | "cancel_all" | "emergency_stop";

export interface DashboardSnapshot {
  state: BotStateSnapshot;
  risk: RiskStatus;
  reconciliation: ReconciliationStatus;
  audit: AuditItem[];
  logs: LogEntry[];
  events: BotEvent[];
}

export interface ControlActionResponse {
  ok: boolean;
  code: string;
  message: string;
  state: BotLifecycleState;
}

export interface ApiErrorPayload {
  ok: false;
  code: string;
  message: string;
  correlationId?: string;
}

export interface EventQuery {
  limit?: number;
  cursor?: string;
  type?: EventType;
  symbol?: string;
  severity?: EventSeverity;
}

export type WsMessage =
  | { kind: "snapshot"; data: DashboardSnapshot }
  | { kind: "event"; data: BotEvent }
  | { kind: "error"; code: string; message: string };
