import type {
  AutoExitConfig,
  EntryAutonomyConfig,
  EntryAutonomyStatus,
  ApprovalRequest,
  AlertItem,
  DemoQueuedIntent,
  IncidentItem,
  ManagedTradeItem,
  Milestone5EvidenceSummary,
  StrategyDegradationConfig,
  StrategyPromotionStage,
  StrategyPromotionState,
  AuditItem,
  BotEvent,
  BotStateSnapshot,
  ControlAction,
  ControlActionResponse,
  DashboardSnapshot,
  ExchangeStatus,
  LogEntry,
  OpenOrdersStatus,
  OpsMetrics,
  PortfolioStatus,
  ReconciliationStatus,
  RiskStatus,
  UserRole
} from "../types";

export type ConnectionHealth = "live" | "degraded";
export type ClientDataSource = "live" | "mock_fallback" | "mock_forced";
export interface ClearStreamsResponse {
  ok: boolean;
  code: string;
  message: string;
  state: BotStateSnapshot["state"];
  details?: Record<string, string | number | boolean>;
}

export interface BotApiClient {
  setAuthToken(token: string | undefined): void;
  getDataSource(): ClientDataSource;
  onDataSourceChange(listener: (source: ClientDataSource) => void): () => void;
  getSnapshot(): Promise<DashboardSnapshot>;
  subscribeToEvents(
    onEvent: (event: BotEvent) => void,
    onConnectionHealthChange?: (health: ConnectionHealth) => void,
    onDataSourceChange?: (source: ClientDataSource) => void
  ): () => void;
  performAction(action: ControlAction, role: UserRole, userId: string, approvalId?: string): Promise<ControlActionResponse>;
  listApprovals(status?: "pending" | "approved" | "rejected" | "expired"): Promise<ApprovalRequest[]>;
  approveApproval(id: string, userId: string): Promise<ApprovalRequest>;
  rejectApproval(id: string, userId: string, reason?: string): Promise<ApprovalRequest>;
  listAlerts(status?: "open" | "acknowledged" | "resolved"): Promise<AlertItem[]>;
  acknowledgeAlert(id: string, role: UserRole, userId: string): Promise<AlertItem>;
  resolveAlert(id: string, role: UserRole, userId: string): Promise<AlertItem>;
  listIncidents(status?: "open" | "acknowledged" | "resolved"): Promise<IncidentItem[]>;
  acknowledgeIncident(id: string, role: UserRole, userId: string): Promise<IncidentItem>;
  resolveIncident(id: string, role: UserRole, userId: string): Promise<IncidentItem>;
  updateReconciliation(
    role: UserRole,
    userId: string,
    input: Partial<Pick<ReconciliationStatus, "positions" | "pnl" | "orders">>
  ): Promise<ReconciliationStatus>;
  clearEventStreamsAndLogs(role: UserRole, userId: string): Promise<ClearStreamsResponse>;
  getAutoExitConfig(): Promise<AutoExitConfig>;
  updateAutoExitConfig(
    role: UserRole,
    userId: string,
    input: Partial<AutoExitConfig>
  ): Promise<AutoExitConfig>;
  listManagedTrades(): Promise<ManagedTradeItem[]>;
  getMilestone5Evidence(): Promise<Milestone5EvidenceSummary>;
  getEntryAutonomyConfig(): Promise<{ config: EntryAutonomyConfig; status: EntryAutonomyStatus }>;
  updateEntryAutonomyConfig(
    role: UserRole,
    userId: string,
    input: Partial<EntryAutonomyConfig>
  ): Promise<{ config: EntryAutonomyConfig; status: EntryAutonomyStatus }>;
  getStrategyPromotion(): Promise<{ state: StrategyPromotionState }>;
  registerStrategyVersion(
    role: UserRole,
    userId: string,
    input: {
      version: string;
      notes?: string;
      challenger?: boolean;
      artifacts?: { researchReportUrl?: string; shadowReportUrl?: string; canaryReportUrl?: string };
    }
  ): Promise<{ state: StrategyPromotionState }>;
  promoteStrategyVersion(
    role: UserRole,
    userId: string,
    input: {
      version: string;
      targetStage: StrategyPromotionStage;
      reason?: string;
      artifacts?: { researchReportUrl?: string; shadowReportUrl?: string; canaryReportUrl?: string };
    }
  ): Promise<{ state: StrategyPromotionState }>;
  rollbackStrategy(role: UserRole, userId: string, reason?: string): Promise<{ state: StrategyPromotionState }>;
  getStrategyDegradationConfig(): Promise<StrategyDegradationConfig>;
  updateStrategyDegradationConfig(
    role: UserRole,
    userId: string,
    input: Partial<StrategyDegradationConfig>
  ): Promise<StrategyDegradationConfig>;
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
  exchange: ExchangeStatus;
  portfolio: PortfolioStatus;
  openOrders: OpenOrdersStatus;
  demoQueue: DemoQueuedIntent[];
  autoExitConfig: AutoExitConfig;
  entryAutonomy: { config: EntryAutonomyConfig; status: EntryAutonomyStatus };
  strategyPromotion: StrategyPromotionState;
  strategyDegradation: StrategyDegradationConfig;
  managedTrades: ManagedTradeItem[];
  milestone5Evidence?: Milestone5EvidenceSummary;
}
