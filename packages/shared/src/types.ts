export type TradeSide = "buy" | "sell";

export interface TradeProposal {
  proposalId: string;
  symbol: string;
  side: TradeSide;
  qtyBase: number;
  entryPrice: number;
  stopPrice: number;
  estimatedMaxLossUsd: number;
  leverage?: number;
}

export interface OrderConstraints {
  symbol: string;
  minSz: number;
  lotSz: number;
  tickSz: number;
}

export interface AccountState {
  equityUsd: number;
  currentDailyLossUsd: number;
  currentWeeklyLossUsd: number;
  currentOpenExposureUsd: number;
}

export interface PositionState {
  symbol: string;
  baseQty: number;
  avgEntryPrice: number;
}

export interface MarketState {
  markPrice: number;
}

export interface RiskLimits {
  maxPerTradeRiskUsd: number;
  maxDailyLossUsd: number;
  maxWeeklyLossUsd: number;
  maxOpenExposureUsd: number;
}

export interface RiskPolicyConfig {
  allowedSymbols: string[];
  maxNotionalUsd: number;
  executionMode: "proposal_only" | "demo_execution_enabled";
}

export interface RiskContext {
  account: AccountState;
  instrument: OrderConstraints;
  market: MarketState;
  position?: PositionState;
  limits?: Partial<RiskLimits>;
  policy?: RiskPolicyConfig;
}

export interface RiskViolation {
  code: string;
  message: string;
  details?: Record<string, number | string | boolean>;
}

export interface ExecutionIntent {
  proposalId: string;
  symbol: string;
  side: TradeSide;
  qtyBase: number;
  limitPrice: number;
}

export interface RiskDecision {
  status: "APPROVE" | "REJECT";
  violations: RiskViolation[];
  executionIntent?: ExecutionIntent;
}

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxPerTradeRiskUsd: 0.5,
  maxDailyLossUsd: 1.0,
  maxWeeklyLossUsd: 2.5,
  maxOpenExposureUsd: 15.0
};
