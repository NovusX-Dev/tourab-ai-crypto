import type {
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
  performAction(action: ControlAction, role: UserRole): Promise<ControlActionResponse>;
}

export interface DashboardData {
  state: BotStateSnapshot;
  events: BotEvent[];
  risk: RiskStatus;
  reconciliation: ReconciliationStatus;
  audit: AuditItem[];
  logs: LogEntry[];
}
