export type {
  ApprovalRequest,
  AlertItem,
  IncidentItem,
  AuditItem,
  BotEvent,
  BotLifecycleState,
  BotMode,
  BotStateSnapshot,
  ControlAction,
  ControlActionResponse,
  DashboardSnapshot,
  DemoQueuedIntent,
  ExchangeStatus,
  EventSeverity,
  EventType,
  LogEntry,
  OpenOrdersStatus,
  OpsMetrics,
  PortfolioStatus,
  ReconciliationStatus,
  RiskStatus,
  UserRole
} from "@tourab/shared";

export interface AutoExitConfig {
  enabled: boolean;
  maxHoldSec: number;
  takeProfitRMultiple: number;
  flattenTimeUtc?: string;
  exitOffsetBps: number;
}

export interface ManagedTradeItem {
  tradeId: string;
  status: string;
  symbol: string;
  entrySide: "buy" | "sell";
  entryOrdId: string;
  entryClOrdId: string;
  requestedQty: number;
  entryFilledQty: number;
  entryAvgPrice: number;
  exitOrdId?: string;
  exitClOrdId?: string;
  exitFilledQty: number;
  exitAvgPrice: number;
  remainingQty: number;
  exitReason?: string;
  stopPrice: number;
  takeProfitPrice: number;
  maxHoldSec: number;
  flattenAt?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  feeUsd: number;
  realizedPnlUsd: number;
  exitSubmittedAt?: string;
  exitRepriceCount?: number;
  forcedFlattenEscalated?: boolean;
}

export interface Milestone5EvidenceDay {
  day: string;
  pass: boolean;
  source: "soak_report" | "live";
  closureRatePct: number;
  filledEntries: number;
  deterministicClosed: number;
  closedTradeDataPass: boolean;
  reconciliationPass: boolean;
  tradeErrors: number;
  reportPath?: string;
}

export interface Milestone5EvidenceSummary {
  policyVersion: string;
  requiredDays: number;
  qualifiedDays: number;
  streakDays: number;
  milestoneReady: boolean;
  generatedAt: string;
  today: {
    day: string;
    pass: boolean;
    source: "soak_report" | "live";
    blockers: string[];
    closureRatePct: number;
    filledEntries: number;
    deterministicClosed: number;
    reconciliationPass: boolean;
    tradeErrors: number;
  };
  days: Milestone5EvidenceDay[];
}
