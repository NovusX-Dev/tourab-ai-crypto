export type BotLifecycleState = "running" | "paused" | "stopped";
export type BotMode = "simulation" | "demo" | "live" | "backtest" | "paper";
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

export type AlertSeverity = "warn" | "error" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface AlertItem {
  id: string;
  code: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: "system" | "control" | "exchange" | "ws";
  title: string;
  detail: string;
  symbol?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  count: number;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export type IncidentStatus = "open" | "acknowledged" | "resolved";
export type IncidentSeverity = "sev1" | "sev2" | "sev3";
export type IncidentTaxonomy =
  | "reconciliation_drift"
  | "freshness_guard"
  | "approval_governance"
  | "control_plane"
  | "exchange_reliability"
  | "stream_health"
  | "ops_durability";

export interface IncidentItem {
  id: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  taxonomy: IncidentTaxonomy;
  title: string;
  detail: string;
  runbookRef: string;
  symbol?: string;
  sourceAlertCode?: string;
  createdAt: string;
  updatedAt: string;
  owner?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface OpsMetrics {
  controlRequestsTotal: number;
  controlFailuresTotal: number;
  wsConnectionsTotal: number;
  wsDisconnectsTotal: number;
  gatekeeperRejectsTotal: number;
  driftEventsTotal: number;
  heartbeatGapEventsTotal: number;
  lastHeartbeatGapMs: number;
  openAlerts: number;
  openIncidents: number;
  reconcileRunsTotal: number;
}

export type ControlAction =
  | "start"
  | "pause"
  | "resume"
  | "stop"
  | "cancel_all"
  | "emergency_stop"
  | "demo_order_submit";

export type ExchangeMode = "demo" | "live" | "unknown";
export type ExchangeSource = "okx_demo" | "none";

export interface ExchangeStatus {
  connected: boolean;
  mode: ExchangeMode;
  source: ExchangeSource;
  lastHealthCheckAt: string;
  lastError?: string;
}

export interface PortfolioBalance {
  ccy: string;
  availBal: string;
  cashBal: string;
  eq: string;
}

export interface PortfolioStatus {
  totalEq: string;
  balances: PortfolioBalance[];
  lastUpdatedAt: string;
  lastError?: string;
}

export interface OpenOrderItem {
  ordId: string;
  clOrdId: string;
  instId: string;
  side: "buy" | "sell";
  px: string;
  sz: string;
  accFillSz: string;
  state: string;
  cTime: string;
  uTime: string;
}

export interface OpenOrdersStatus {
  orders: OpenOrderItem[];
  lastUpdatedAt: string;
  lastError?: string;
}

export interface DemoQueuedIntent {
  approvalId: string;
  proposalId: string;
  symbol: string;
  side: "buy" | "sell";
  qtyBase: number;
  limitPrice: number;
  queuedAt: string;
}

export interface DashboardSnapshot {
  state: BotStateSnapshot;
  risk: RiskStatus;
  reconciliation: ReconciliationStatus;
  audit: AuditItem[];
  logs: LogEntry[];
  alerts: AlertItem[];
  incidents: IncidentItem[];
  metrics: OpsMetrics;
  exchange: ExchangeStatus;
  portfolio: PortfolioStatus;
  openOrders: OpenOrdersStatus;
  demoQueue: DemoQueuedIntent[];
  events: BotEvent[];
}

export interface ControlActionResponse {
  ok: boolean;
  code: string;
  message: string;
  state: BotLifecycleState;
  details?: Record<string, string | number | boolean>;
}

export interface ApiErrorPayload {
  ok: false;
  code: string;
  message: string;
  correlationId?: string;
  details?: Record<string, string | number | boolean>;
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

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export interface ApprovalRequest {
  id: string;
  action: ControlAction;
  status: ApprovalStatus;
  reason?: string;
  requestedAt: string;
  expiresAt: string;
  decidedAt?: string;
  requestedBy: string;
  requiredApprovals: number;
  approvalCount: number;
  approvedBy: string[];
  rejectedBy?: string;
  rejectedReason?: string;
}
