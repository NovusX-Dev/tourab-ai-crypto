import type {
  ApprovalRequest,
  AuditItem,
  BotEvent,
  BotStateSnapshot,
  ControlAction,
  ControlActionResponse,
  DashboardSnapshot,
  LogEntry,
  ReconciliationStatus,
  RiskStatus,
  UserRole
} from "../types";

export type ConnectionHealth = "live" | "degraded";

export interface BotApiClient {
  getSnapshot(): Promise<DashboardSnapshot>;
  subscribeToEvents(
    onEvent: (event: BotEvent) => void,
    onConnectionHealthChange?: (health: ConnectionHealth) => void
  ): () => void;
  performAction(action: ControlAction, role: UserRole, userId: string, approvalId?: string): Promise<ControlActionResponse>;
  listApprovals(status?: "pending" | "approved" | "rejected" | "expired"): Promise<ApprovalRequest[]>;
  approveApproval(id: string, userId: string): Promise<ApprovalRequest>;
  rejectApproval(id: string, userId: string, reason?: string): Promise<ApprovalRequest>;
}

export interface DashboardData {
  state: BotStateSnapshot;
  events: BotEvent[];
  risk: RiskStatus;
  reconciliation: ReconciliationStatus;
  audit: AuditItem[];
  logs: LogEntry[];
}
