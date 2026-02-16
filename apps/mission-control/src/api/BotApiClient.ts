import type {
  AuditItem,
  BotEvent,
  BotStateSnapshot,
  ControlAction,
  DashboardSnapshot,
  LogEntry,
  ReconciliationStatus,
  RiskStatus,
  UserRole
} from "../types";

export interface BotApiClient {
  getSnapshot(): Promise<DashboardSnapshot>;
  subscribeToEvents(onEvent: (event: BotEvent) => void): () => void;
  performAction(action: ControlAction, role: UserRole): Promise<{ ok: boolean; message: string }>;
}

export interface DashboardData {
  state: BotStateSnapshot;
  events: BotEvent[];
  risk: RiskStatus;
  reconciliation: ReconciliationStatus;
  audit: AuditItem[];
  logs: LogEntry[];
}
