import type { IncidentItem } from "@tourab/shared";

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

export type EntryApprovalMode = "manual" | "policy_auto";

export interface EntryAutonomyConfig {
  approvalMode: EntryApprovalMode;
  allowedSymbols: string[];
  maxPerOrderNotionalUsd: number;
  maxOpenExposureUsd: number;
  maxDailyLossUsd: number;
  maxWeeklyLossUsd: number;
  lossStreakCooldownCount: number;
  cooldownMinutes: number;
  strategyVersion: string;
  strategyVersionBySymbol?: Record<string, string>;
  policyVersion: string;
}

export interface EntryAutonomyStatus {
  approvalMode: EntryApprovalMode;
  fallbackActive: boolean;
  lastFallbackReason?: string;
  lastFallbackAt?: string;
  lastPolicyAutoDecisionAt?: string;
  lastPolicyAutoBlockers: string[];
}

export type StrategyPromotionStage = "research" | "shadow" | "paper_canary" | "limited_prod";
export type StrategyVersionStatus = "active" | "candidate" | "retired" | "rolled_back";

export interface StrategyVersionRecord {
  version: string;
  stage: StrategyPromotionStage;
  status: StrategyVersionStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  artifacts?: {
    researchReportUrl?: string;
    shadowReportUrl?: string;
    canaryReportUrl?: string;
  };
}

export interface StrategyPromotionHistoryItem {
  at: string;
  action: "register" | "promote" | "rollback";
  version: string;
  actor: string;
  fromStage?: StrategyPromotionStage;
  toStage?: StrategyPromotionStage;
  reason?: string;
}

export interface StrategyPromotionState {
  activeVersion: string;
  championVersion: string;
  challengerVersion?: string;
  previousStableVersion?: string;
  activeVersionBySymbol?: Record<string, string>;
  championVersionBySymbol?: Record<string, string>;
  challengerVersionBySymbol?: Record<string, string>;
  previousStableVersionBySymbol?: Record<string, string>;
  versions: StrategyVersionRecord[];
  history: StrategyPromotionHistoryItem[];
}

export interface StrategyDegradationConfig {
  enabled: boolean;
  maxDailyLossUsd: number;
  maxDrawdownPct: number;
  maxConsecutiveLosingTrades: number;
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
  requestedNotionalUsd?: number;
  approvalModeAtDecision?: "manual" | "policy_auto";
  policyVersionAtDecision?: string;
  strategyVersionAtDecision?: string;
  modelVersionAtDecision?: string;
  intelligenceVersionAtDecision?: string;
  playbookIdAtDecision?: string;
  entryStyleAtDecision?: string;
  thesisSummaryAtDecision?: string;
  invalidationSummaryAtDecision?: string;
  thesisConfidenceScoreAtDecision?: number;
  tradeabilityScoreAtDecision?: number;
  entryOffsetBps?: number;
  stopDistanceBps?: number;
  takeProfitRMultiple?: number;
  marketRegimeAtDecision?: string;
  signalConfidenceScoreAtDecision?: number;
  trendAlignmentScoreAtDecision?: number;
  move1mBpsAtDecision?: number;
  move5mBpsAtDecision?: number;
  move15mBpsAtDecision?: number;
  realizedVolatilityBpsAtDecision?: number;
  spreadBpsAtDecision?: number;
  orderBookImbalancePctAtDecision?: number;
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

export type RolloutStageId =
  | "phase0_reset_and_stabilize"
  | "phase1_demo_execution_hardening"
  | "phase2_strategy_validation"
  | "phase3_supervised_demo_autonomy"
  | "phase4_bounded_demo_auto_approval"
  | "phase5_live_shadow"
  | "phase6_live_manual_tiny_notional"
  | "phase7_live_bounded_auto_btc"
  | "phase8_live_expansion"
  | "phase9_governed_learning_promotion";

export interface RolloutStatusSummary {
  generatedAt: string;
  posture: "blocked" | "demo_only" | "advancing";
  currentStage: {
    id: RolloutStageId;
    label: string;
    objective: string;
  };
  confidenceReset: {
    active: boolean;
    reasons: string[];
    priorReadinessInformationalOnly: boolean;
  };
  evidence: {
    rawQualifiedDays: number;
    effectiveQualifiedDays: number;
    requiredDays: number;
    streakDays: number;
    fresh: boolean;
    latestEvidenceDay?: string;
    latestPassingEvidenceDay?: string;
    ageDays?: number;
  };
  nextGate: {
    label: string;
    blockers: string[];
  };
  nextRecommendedAction: string;
}

export interface LearningEvaluationBucket {
  version: string;
  trades: number;
  expectancyNetFeesUsd: number;
  cumulativeNetPnlUsd: number;
  maxDrawdownUsd: number;
  maxDrawdownPct: number;
  slippageProxyBps: number;
  controlViolations: number;
}

export interface LearningEvaluationSummary {
  generatedAt: string;
  lookbackDays: number;
  closedTrades: number;
  totals: {
    expectancyNetFeesUsd: number;
    cumulativeNetPnlUsd: number;
    maxDrawdownUsd: number;
    maxDrawdownPct: number;
    slippageProxyBps: number;
    controlViolations: number;
  };
  byModelVersion: LearningEvaluationBucket[];
  byStrategyVersion: LearningEvaluationBucket[];
}

export interface LearningAlertConfig {
  enabled: boolean;
  lookbackDays: number;
  limit: number;
  minTrades: number;
  expectancyMinUsd: number;
  maxDrawdownPct: number;
  maxSlippageBps: number;
  maxControlViolationRatePct: number;
}

export interface LearningEvaluationTrendPoint {
  bucketStartAt: string;
  bucketEndAt: string;
  closedTrades: number;
  expectancyNetFeesUsd: number;
  cumulativeNetPnlUsd: number;
  maxDrawdownPct: number;
  slippageProxyBps: number;
  controlViolations: number;
  controlViolationRatePct: number;
  modelVersions: Array<{ version: string; trades: number }>;
  strategyVersions: Array<{ version: string; trades: number }>;
  breaches: {
    expectancy: boolean;
    drawdown: boolean;
    slippage: boolean;
    controlViolationRate: boolean;
  };
}

export interface LearningEvaluationTrendSummary {
  generatedAt: string;
  lookbackDays: number;
  bucketDays: number;
  thresholds: LearningAlertConfig;
  points: LearningEvaluationTrendPoint[];
}

export interface LearningIncidentExportReport {
  exportedAt: string;
  lookbackDays: number;
  status: "all" | "open" | "acknowledged" | "resolved";
  count: number;
  openCount: number;
  acknowledgedCount: number;
  resolvedCount: number;
  totals: {
    byCode: Array<{ code: string; count: number }>;
    bySeverity: Array<{ severity: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
  alertConfig: LearningAlertConfig;
  evaluation: LearningEvaluationSummary;
  items: IncidentItem[];
}

export interface LearningRetentionConfig {
  closedTradeFeatureRetentionDays: number;
}

export interface LearningRetentionStatus {
  config: LearningRetentionConfig;
  stats: {
    featureCount: number;
    oldestClosedAt?: string;
    newestClosedAt?: string;
  };
  lastPruneAt?: string;
  lastPruneResult?: {
    closedTradeFeaturesDeleted: number;
  };
}
