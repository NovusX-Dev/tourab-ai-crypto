import type { SpotMarketInputs } from "../proposal-helper.js";
import type { SignalSnapshot } from "./signal-intelligence.js";

export type TradingRegimeClass =
  | "trend_up"
  | "quiet_up"
  | "trend_down"
  | "quiet_down"
  | "expansion_breakout"
  | "mean_revert_chop"
  | "dead_zone"
  | "disorderly_microstructure";

export type TradingPlaybookId =
  | "btc_continuation_pullback"
  | "btc_breakout_expansion"
  | "btc_downside_continuation"
  | "eth_beta_confirmation"
  | "generic_continuation_probe";

export type TradingEntryStyle = "passive_pullback" | "passive_join" | "controlled_momentum";
export type TradingExecutionQuality = "good" | "caution" | "bad";

export interface TradingMarketIntelligenceInput {
  regime: string;
  confidenceScore: number;
  trendAlignmentScore: number;
  recommendedSide?: "buy" | "sell";
  recommendedEntryOffsetBps: number;
  move1mBps: number;
  move5mBps: number;
  move15mBps: number;
  realizedVolatilityBps: number;
  spreadBps: number;
  orderBookImbalancePct: number;
  continuationOverextended?: boolean;
  projectedMoveBudgetBps?: number;
}

export interface TradingObservationSnapshot {
  symbol: string;
  side: "buy" | "sell";
  regimeClass: TradingRegimeClass;
  directionalBias?: "buy" | "sell";
  executionQuality: TradingExecutionQuality;
  tradeabilityScore: number;
  confidenceScore: number;
  trendAlignmentScore: number;
  signalRegime: SignalSnapshot["regime"];
  marketRegime?: string;
  spreadBps: number;
  realizedVolatilityBps: number;
  orderBookImbalancePct: number;
  move1mBps: number;
  move5mBps: number;
  move15mBps: number;
}

export interface TradingTradePlan {
  intelligenceVersion: string;
  playbookId: TradingPlaybookId;
  side: "buy" | "sell";
  regimeClass: TradingRegimeClass;
  entryStyle: TradingEntryStyle;
  entryOffsetBps: number;
  takeProfitRMultiple: number;
  maxHoldSec: number;
  thesisSummary: string;
  invalidationSummary: string;
  thesisConfidenceScore: number;
  tradeabilityScore: number;
}

export type TradingIntelligenceDecision =
  | {
      ok: true;
      observation: TradingObservationSnapshot;
      plan: TradingTradePlan;
    }
  | {
      ok: false;
      observation: TradingObservationSnapshot;
      reason: string;
    };

export interface TradingThesisMonitorDecision {
  healthy: boolean;
  action: "hold" | "flatten";
  reason: string;
  severity: "info" | "warn";
}

const TRADING_INTELLIGENCE_VERSION = "ti-v1";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}

function normalizeEntryOffsetBps(side: "buy" | "sell", entryStyle: TradingEntryStyle, fallback: number, recommended?: number): number {
  const basis = typeof recommended === "number" && Number.isFinite(recommended) ? recommended : fallback;
  const magnitude = Math.max(1, Math.abs(basis || fallback));
  if (entryStyle === "controlled_momentum") {
    return -round6(clamp(Math.min(magnitude, Math.max(1, magnitude * 0.6)), 1, 8));
  }
  if (entryStyle === "passive_join") {
    return round6(clamp(magnitude * 0.5, 2, 12));
  }
  if (side === "sell" && basis < 0) {
    return round6(clamp(Math.abs(basis), 2, 14));
  }
  return round6(clamp(magnitude, 4, 18));
}

function sideMatchesTrend(side: "buy" | "sell", trendAlignmentScore: number): boolean {
  if (!Number.isFinite(trendAlignmentScore) || trendAlignmentScore === 0) {
    return false;
  }
  return side === "buy" ? trendAlignmentScore > 0 : trendAlignmentScore < 0;
}

function inferDirectionalBias(signal: SignalSnapshot, marketIntelligence?: TradingMarketIntelligenceInput): "buy" | "sell" | undefined {
  if (marketIntelligence?.recommendedSide) {
    return marketIntelligence.recommendedSide;
  }
  if (signal.longMoveBps > 0) {
    return "buy";
  }
  if (signal.longMoveBps < 0) {
    return "sell";
  }
  return undefined;
}

function classifyRegime(signal: SignalSnapshot, marketIntelligence?: TradingMarketIntelligenceInput): TradingRegimeClass {
  const spreadBps = Math.max(0, marketIntelligence?.spreadBps ?? 0);
  const realizedVolatilityBps = Math.max(0, marketIntelligence?.realizedVolatilityBps ?? signal.realizedVolatilityBps);
  const move1mBps = marketIntelligence?.move1mBps ?? signal.shortMoveBps;
  const move15mBps = marketIntelligence?.move15mBps ?? signal.longMoveBps;
  if (realizedVolatilityBps > 0 && spreadBps >= Math.max(3, realizedVolatilityBps * 0.85)) {
    return "disorderly_microstructure";
  }
  if (marketIntelligence?.regime === "dead_zone" || signal.regime === "dead_zone") {
    return "dead_zone";
  }
  if (marketIntelligence?.regime === "chop") {
    return "mean_revert_chop";
  }
  const impulseAligned = Math.sign(move1mBps) !== 0 && Math.sign(move1mBps) === Math.sign(move15mBps);
  const breakoutImpulse = impulseAligned && Math.abs(move1mBps) >= Math.max(2.5, realizedVolatilityBps * 0.9);
  if (breakoutImpulse && Math.abs(move15mBps) >= Math.max(5, realizedVolatilityBps * 1.15)) {
    return "expansion_breakout";
  }
  if (marketIntelligence?.regime === "quiet_up" || (signal.regime === "quiet_trend" && signal.longMoveBps > 0)) {
    return "quiet_up";
  }
  if (marketIntelligence?.regime === "quiet_down" || (signal.regime === "quiet_trend" && signal.longMoveBps < 0)) {
    return "quiet_down";
  }
  if (marketIntelligence?.regime === "trend_up" || signal.longMoveBps > 0) {
    return "trend_up";
  }
  if (marketIntelligence?.regime === "trend_down" || signal.longMoveBps < 0) {
    return "trend_down";
  }
  return "mean_revert_chop";
}

function computeTradeabilityScore(input: {
  side: "buy" | "sell";
  signal: SignalSnapshot;
  marketIntelligence?: TradingMarketIntelligenceInput;
}): number {
  const spreadBps = Math.max(0, input.marketIntelligence?.spreadBps ?? 0);
  const realizedVolatilityBps = Math.max(0.1, input.marketIntelligence?.realizedVolatilityBps ?? input.signal.realizedVolatilityBps);
  const confidenceScore = clamp(
    input.marketIntelligence?.confidenceScore ?? 55 + Math.abs(input.signal.longMoveBps) * 2,
    0,
    100
  );
  const trendAlignmentScore = input.marketIntelligence?.trendAlignmentScore ?? input.signal.longMoveBps;
  const spreadPenalty = clamp((spreadBps / realizedVolatilityBps) * 32, 0, 45);
  const alignmentBonus = sideMatchesTrend(input.side, trendAlignmentScore) ? 18 : -18;
  const imbalance = input.marketIntelligence?.orderBookImbalancePct ?? 0;
  const bookAgreement =
    input.side === "buy" ? Math.max(-12, Math.min(12, imbalance * 0.45)) : Math.max(-12, Math.min(12, -imbalance * 0.45));
  const continuationPenalty = input.marketIntelligence?.continuationOverextended ? 12 : 0;
  return round6(clamp(confidenceScore + alignmentBonus + bookAgreement - spreadPenalty - continuationPenalty, 0, 100));
}

function deriveExecutionQuality(regimeClass: TradingRegimeClass, tradeabilityScore: number): TradingExecutionQuality {
  if (regimeClass === "disorderly_microstructure" || tradeabilityScore < 35) {
    return "bad";
  }
  if (tradeabilityScore < 55) {
    return "caution";
  }
  return "good";
}

function buildObservation(input: {
  symbol: string;
  side: "buy" | "sell";
  signal: SignalSnapshot;
  marketIntelligence?: TradingMarketIntelligenceInput;
}): TradingObservationSnapshot {
  const regimeClass = classifyRegime(input.signal, input.marketIntelligence);
  const tradeabilityScore = computeTradeabilityScore(input);
  return {
    symbol: input.symbol,
    side: input.side,
    regimeClass,
    directionalBias: inferDirectionalBias(input.signal, input.marketIntelligence),
    executionQuality: deriveExecutionQuality(regimeClass, tradeabilityScore),
    tradeabilityScore,
    confidenceScore: round6(clamp(input.marketIntelligence?.confidenceScore ?? Math.abs(input.signal.longMoveBps) * 3, 0, 100)),
    trendAlignmentScore: round6(input.marketIntelligence?.trendAlignmentScore ?? input.signal.longMoveBps),
    signalRegime: input.signal.regime,
    marketRegime: input.marketIntelligence?.regime,
    spreadBps: round6(Math.max(0, input.marketIntelligence?.spreadBps ?? 0)),
    realizedVolatilityBps: round6(
      Math.max(0, input.marketIntelligence?.realizedVolatilityBps ?? input.signal.realizedVolatilityBps)
    ),
    orderBookImbalancePct: round6(input.marketIntelligence?.orderBookImbalancePct ?? 0),
    move1mBps: round6(input.marketIntelligence?.move1mBps ?? input.signal.shortMoveBps),
    move5mBps: round6(input.marketIntelligence?.move5mBps ?? input.signal.longMoveBps * 0.5),
    move15mBps: round6(input.marketIntelligence?.move15mBps ?? input.signal.longMoveBps)
  };
}

function buildPlan(input: {
  symbol: string;
  observation: TradingObservationSnapshot;
  market: SpotMarketInputs;
  configuredEntryOffsetBps: number;
  configuredStopDistanceBps: number;
  configuredMaxHoldSec: number;
  marketIntelligence?: TradingMarketIntelligenceInput;
}): TradingTradePlan | undefined {
  const { symbol, observation } = input;
  const recommendedOffset = input.marketIntelligence?.recommendedEntryOffsetBps;
  const tradeability = observation.tradeabilityScore;
  const confidence = round6(clamp((observation.confidenceScore * 0.55) + (tradeability * 0.45), 0, 100));
  if (observation.executionQuality === "bad") {
    return undefined;
  }
  if (symbol === "BTC-USDT" && observation.side === "buy") {
    if ((observation.regimeClass === "quiet_up" || observation.regimeClass === "trend_up") && tradeability >= 50) {
      return {
        intelligenceVersion: TRADING_INTELLIGENCE_VERSION,
        playbookId: "btc_continuation_pullback",
        side: "buy",
        regimeClass: observation.regimeClass,
        entryStyle: "passive_pullback",
        entryOffsetBps: normalizeEntryOffsetBps("buy", "passive_pullback", input.configuredEntryOffsetBps, recommendedOffset),
        takeProfitRMultiple: 1.2,
        maxHoldSec: Math.max(300, Math.min(input.configuredMaxHoldSec, 20 * 60)),
        thesisSummary: `BTC continuation pullback in ${observation.regimeClass} with aligned trend and tradable spread/depth.`,
        invalidationSummary: "Exit if BTC regime degrades to chop/dead-zone, side recommendation flips, or tradeability collapses.",
        thesisConfidenceScore: confidence,
        tradeabilityScore: tradeability
      };
    }
    if (observation.regimeClass === "expansion_breakout" && tradeability >= 65 && observation.move1mBps > 0) {
      return {
        intelligenceVersion: TRADING_INTELLIGENCE_VERSION,
        playbookId: "btc_breakout_expansion",
        side: "buy",
        regimeClass: observation.regimeClass,
        entryStyle: "controlled_momentum",
        entryOffsetBps: normalizeEntryOffsetBps("buy", "controlled_momentum", input.configuredEntryOffsetBps, recommendedOffset),
        takeProfitRMultiple: 1.5,
        maxHoldSec: Math.max(180, Math.min(input.configuredMaxHoldSec, 12 * 60)),
        thesisSummary: "BTC breakout expansion with fast aligned impulse and acceptable execution quality.",
        invalidationSummary: "Exit if impulse stalls, local recommendation flips, or microstructure becomes disorderly.",
        thesisConfidenceScore: round6(clamp(confidence + 5, 0, 100)),
        tradeabilityScore: tradeability
      };
    }
  }
  if (symbol === "BTC-USDT" && observation.side === "sell") {
    if (
      (observation.regimeClass === "quiet_down" ||
        observation.regimeClass === "trend_down" ||
        observation.regimeClass === "expansion_breakout") &&
      tradeability >= 50
    ) {
      const entryStyle = observation.regimeClass === "quiet_down" ? "passive_join" : "controlled_momentum";
      return {
        intelligenceVersion: TRADING_INTELLIGENCE_VERSION,
        playbookId: "btc_downside_continuation",
        side: "sell",
        regimeClass: observation.regimeClass,
        entryStyle,
        entryOffsetBps: normalizeEntryOffsetBps("sell", entryStyle, input.configuredEntryOffsetBps, recommendedOffset),
        takeProfitRMultiple: 1.2,
        maxHoldSec: Math.max(300, Math.min(input.configuredMaxHoldSec, 18 * 60)),
        thesisSummary: `BTC downside continuation in ${observation.regimeClass} with bearish alignment and tradable conditions.`,
        invalidationSummary: "Exit if bearish alignment breaks, spread expands sharply, or BTC stops confirming downside continuation.",
        thesisConfidenceScore: confidence,
        tradeabilityScore: tradeability
      };
    }
  }
  if (symbol === "ETH-USDT") {
    if (
      (observation.regimeClass === "quiet_up" ||
        observation.regimeClass === "trend_up" ||
        observation.regimeClass === "quiet_down" ||
        observation.regimeClass === "trend_down" ||
        observation.regimeClass === "expansion_breakout") &&
      tradeability >= 55
    ) {
      const entryStyle = observation.regimeClass === "expansion_breakout" ? "controlled_momentum" : "passive_join";
      return {
        intelligenceVersion: TRADING_INTELLIGENCE_VERSION,
        playbookId: "eth_beta_confirmation",
        side: observation.side,
        regimeClass: observation.regimeClass,
        entryStyle,
        entryOffsetBps: normalizeEntryOffsetBps(observation.side, entryStyle, input.configuredEntryOffsetBps, recommendedOffset),
        takeProfitRMultiple: 1,
        maxHoldSec: Math.max(240, Math.min(input.configuredMaxHoldSec, 12 * 60)),
        thesisSummary: `ETH beta confirmation following BTC anchor alignment in ${observation.regimeClass}.`,
        invalidationSummary: "Exit if BTC confirmation breaks, ETH local recommendation flips, or tradeability weakens materially.",
        thesisConfidenceScore: confidence,
        tradeabilityScore: tradeability
      };
    }
  }
  if (
    symbol !== "BTC-USDT" &&
    symbol !== "ETH-USDT" &&
    (observation.regimeClass === "quiet_up" ||
      observation.regimeClass === "trend_up" ||
      observation.regimeClass === "quiet_down" ||
      observation.regimeClass === "trend_down" ||
      observation.regimeClass === "expansion_breakout") &&
    tradeability >= 40
  ) {
    const entryStyle =
      observation.regimeClass.startsWith("quiet_") && observation.regimeClass !== "expansion_breakout"
        ? "passive_join"
        : "controlled_momentum";
    return {
      intelligenceVersion: TRADING_INTELLIGENCE_VERSION,
      playbookId: "generic_continuation_probe",
      side: observation.side,
      regimeClass: observation.regimeClass,
      entryStyle,
      entryOffsetBps: normalizeEntryOffsetBps(observation.side, entryStyle, input.configuredEntryOffsetBps, recommendedOffset),
      takeProfitRMultiple: 1,
      maxHoldSec: Math.max(180, Math.min(input.configuredMaxHoldSec, 10 * 60)),
      thesisSummary: `${symbol} continuation probe in ${observation.regimeClass} under tradable conditions.`,
      invalidationSummary: "Exit if local recommendation flips, regime degrades, or execution quality deteriorates.",
      thesisConfidenceScore: confidence,
      tradeabilityScore: tradeability
    };
  }
  return undefined;
}

export function buildTradingIntelligenceDecision(input: {
  symbol: string;
  side: "buy" | "sell";
  market: SpotMarketInputs;
  signal: SignalSnapshot;
  marketIntelligence?: TradingMarketIntelligenceInput;
  configuredEntryOffsetBps: number;
  configuredStopDistanceBps: number;
  configuredMaxHoldSec: number;
}): TradingIntelligenceDecision {
  const observation = buildObservation({
    symbol: input.symbol,
    side: input.side,
    signal: input.signal,
    marketIntelligence: input.marketIntelligence
  });
  if (observation.directionalBias && observation.directionalBias !== input.side) {
    return {
      ok: false,
      observation,
      reason: `No-trade: directional bias is ${observation.directionalBias}, not ${input.side}.`
    };
  }
  if (observation.regimeClass === "dead_zone" || observation.regimeClass === "mean_revert_chop") {
    return {
      ok: false,
      observation,
      reason: `No-trade: regime ${observation.regimeClass} does not support a continuation playbook.`
    };
  }
  if (observation.regimeClass === "disorderly_microstructure") {
    return {
      ok: false,
      observation,
      reason: "No-trade: microstructure is disorderly relative to current volatility."
    };
  }
  const plan = buildPlan({
    symbol: input.symbol,
    observation,
    market: input.market,
    configuredEntryOffsetBps: input.configuredEntryOffsetBps,
    configuredStopDistanceBps: input.configuredStopDistanceBps,
    configuredMaxHoldSec: input.configuredMaxHoldSec,
    marketIntelligence: input.marketIntelligence
  });
  if (!plan) {
    return {
      ok: false,
      observation,
      reason: `No-trade: no valid playbook for ${input.symbol} ${input.side} in ${observation.regimeClass}.`
    };
  }
  return {
    ok: true,
    observation,
    plan
  };
}

export function monitorTradeThesis(input: {
  symbol: string;
  entrySide: "buy" | "sell";
  playbookId?: string;
  currentSymbolIntelligence?: TradingMarketIntelligenceInput;
  currentBtcIntelligence?: TradingMarketIntelligenceInput;
}): TradingThesisMonitorDecision {
  if (!input.currentSymbolIntelligence) {
    return {
      healthy: true,
      action: "hold",
      reason: "No fresh market-intelligence snapshot available for thesis monitoring.",
      severity: "info"
    };
  }
  const current = input.currentSymbolIntelligence;
  const spreadPenalty = current.realizedVolatilityBps > 0 && current.spreadBps >= Math.max(3, current.realizedVolatilityBps * 0.85);
  if (spreadPenalty) {
    return {
      healthy: false,
      action: "flatten",
      reason: `Thesis monitor: spread ${round6(current.spreadBps)}bps is disorderly versus volatility ${round6(current.realizedVolatilityBps)}bps.`,
      severity: "warn"
    };
  }
  if (current.regime === "chop" || current.regime === "dead_zone") {
    return {
      healthy: false,
      action: "flatten",
      reason: `Thesis monitor: regime degraded to ${current.regime}.`,
      severity: "warn"
    };
  }
  if (current.recommendedSide && current.recommendedSide !== input.entrySide) {
    return {
      healthy: false,
      action: "flatten",
      reason: `Thesis monitor: local side recommendation flipped to ${current.recommendedSide}.`,
      severity: "warn"
    };
  }
  if (!sideMatchesTrend(input.entrySide, current.trendAlignmentScore) || current.confidenceScore < 20) {
    return {
      healthy: false,
      action: "flatten",
      reason: `Thesis monitor: trend/confidence degraded (trend=${round6(current.trendAlignmentScore)} confidence=${round6(current.confidenceScore)}).`,
      severity: "warn"
    };
  }
  if (input.playbookId === "eth_beta_confirmation") {
    const btc = input.currentBtcIntelligence;
    if (!btc) {
      return {
        healthy: true,
        action: "hold",
        reason: "ETH thesis monitor missing BTC anchor snapshot; keeping current trade state.",
        severity: "info"
      };
    }
    if (btc.regime === "chop" || btc.regime === "dead_zone") {
      return {
        healthy: false,
        action: "flatten",
        reason: `Thesis monitor: BTC anchor degraded to ${btc.regime}.`,
        severity: "warn"
      };
    }
    if (btc.recommendedSide && btc.recommendedSide !== input.entrySide) {
      return {
        healthy: false,
        action: "flatten",
        reason: `Thesis monitor: BTC anchor side flipped to ${btc.recommendedSide}.`,
        severity: "warn"
      };
    }
  }
  return {
    healthy: true,
    action: "hold",
    reason: "Thesis monitor confirms playbook conditions still broadly hold.",
    severity: "info"
  };
}
