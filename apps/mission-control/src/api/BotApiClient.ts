import type {
  ApprovalRequest,
  AlertItem,
  IncidentItem,
  AuditItem,
  BotEvent,
  BotStateSnapshot,
  ControlAction,
  ControlActionResponse,
  DashboardSnapshot,
  LogEntry,
  OpsMetrics,
  ReconciliationStatus,
  RiskStatus,
  UserRole
} from "../types";

export type ConnectionHealth = "live" | "degraded";

export interface BotApiClient {
  setAuthToken(token: string | undefined): void;
  getSnapshot(): Promise<DashboardSnapshot>;
  subscribeToEvents(
    onEvent: (event: BotEvent) => void,
    onConnectionHealthChange?: (health: ConnectionHealth) => void
  ): () => void;
  performAction(action: ControlAction, role: UserRole, userId: string, approvalId?: string): Promise<ControlActionResponse>;
  listApprovals(status?: "pending" | "approved" | "rejected" | "expired"): Promise<ApprovalRequest[]>;
  approveApproval(id: string, userId: string): Promise<ApprovalRequest>;
  rejectApproval(id: string, userId: string, reason?: string): Promise<ApprovalRequest>;
  listAlerts(status?: "open" | "acknowledged" | "resolved"): Promise<AlertItem[]>;
  acknowledgeAlert(id: string, userId: string): Promise<AlertItem>;
  resolveAlert(id: string, userId: string): Promise<AlertItem>;
  listIncidents(status?: "open" | "acknowledged" | "resolved"): Promise<IncidentItem[]>;
  acknowledgeIncident(id: string, userId: string): Promise<IncidentItem>;
  resolveIncident(id: string, userId: string): Promise<IncidentItem>;
  updateReconciliation(
    role: UserRole,
    userId: string,
    input: Partial<Pick<ReconciliationStatus, "positions" | "pnl" | "orders">>
  ): Promise<ReconciliationStatus>;
}

export interface DashboardData {
  state: BotStateSnapshot;
  events: BotEvent[];
  risk: RiskStatus;
  reconciliation: ReconciliationStatus;
  audit: AuditItem[];
  logs: LogEntry[];
  alerts: AlertItem[];
  incidents: IncidentItem[];
  metrics: OpsMetrics;
}
