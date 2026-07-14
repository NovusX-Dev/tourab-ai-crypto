import type { BotEvent, BotStateSnapshot, ExecutionIntent, RiskContext, TradeProposal } from "@tourab/shared";
import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import { buildValidSpotProposal, fetchSpotMarketInputs, SpotMarketInputs } from "../proposal-helper.js";
import { createEvent } from "./event-factory.js";
import { evaluateSignalOpportunity, type SignalSnapshot } from "./signal-intelligence.js";
import {
  buildTradingIntelligenceDecision,
  type TradingMarketIntelligenceInput,
  type TradingTradePlan
} from "./trading-intelligence.js";

export interface WorkerMarketIntelligenceSnapshot extends TradingMarketIntelligenceInput {}

interface WorkerCallbacks {
  onEvent: (event: BotEvent) => Promise<void>;
  onStateUpdate: (next: Partial<BotStateSnapshot>) => void;
  getState: () => BotStateSnapshot;
  getEntryBacklog?: (symbol: string) => {
    pendingEntryCount: number;
    pendingEntryNotionalUsd: number;
  };
  evaluateSymbolEligibility?: (
    symbol: string,
    nowIso: string
  ) => Promise<{ eligible: boolean; reason?: string }>;
  evaluateTradeEligibility?: (input: {
    symbol: string;
    side: "buy" | "sell";
    nowIso: string;
  }) => Promise<{ eligible: boolean; reason?: string }>;
  getMarketIntelligence?: (input: { symbol: string }) => Promise<WorkerMarketIntelligenceSnapshot | undefined>;
  buildRiskContext?: (input: {
    market: SpotMarketInputs;
    maxNotionalUsd: number;
    executionMode: "proposal_only" | "demo_execution_enabled";
  }) => RiskContext;
  queueDemoExecutionApproval: (input: {
    symbol: string;
    proposal: TradeProposal;
    context: RiskContext;
    intent: ExecutionIntent;
    entryOffsetBps: number;
    stopDistanceBps: number;
    requestedNotionalUsd: number;
    marketIntelligence?: WorkerMarketIntelligenceSnapshot;
    tradingPlan?: TradingTradePlan;
  }) => Promise<{ queued: boolean; approvalId?: string; reason?: string }>;
}

export interface WorkerSymbolOverride {
  enabled?: boolean;
  side?: WorkerSidePreference;
  maxNotionalUsd?: number;
  entryOffsetBps?: number;
  stopDistanceBps?: number;
  minBandDistanceBps?: number;
}

export type WorkerSidePreference = "buy" | "sell" | "auto";

export interface WorkerPolicy {
  symbolUniverse: string[];
  baseUrl: string;
  intervalMs: number;
  maxRiskUsd: number;
  maxNotionalUsd: number;
  entryOffsetBps: number;
  stopDistanceBps: number;
  signalLookbackSec: number;
  signalShortLookbackSec: number;
  signalMinMoveBps: number;
  signalMinAbsoluteMoveBps?: number;
  signalTrendVolatilityThresholdMultiplier?: number;
  signalMinVolatilityBps: number;
  signalRoundTripFeeBps: number;
  quietRegimeTrendEfficiencyMin?: number;
  quietRegimeMoveThresholdMultiplier?: number;
  buyTrendStrengthMultiplier?: number;
  sellTrendStrengthMultiplier?: number;
  buyShortMoveConfirmationBps?: number;
  sellShortMoveConfirmationBps?: number;
  buyEntryOffsetMultiplier?: number;
  sellEntryOffsetMultiplier?: number;
  expectedMoveHurdleEnabled?: boolean;
  expectedMoveTakeProfitRMultiple?: number;
  expectedMoveFeeCoverageMultiple?: number;
  expectedMoveMinNetEdgeBps?: number;
  marketIntelligenceMinConfidenceScore?: number;
  marketIntelligenceMaxSpreadBps?: number;
  requireMarketIntelligenceSideAlignment?: boolean;
  blockChopRegimes?: boolean;
  maxMoveBudgetUsagePct?: number;
  btcBuyMinConfidenceScore?: number;
  btcBuyMinTrendAlignmentScore?: number;
  btcBuyMinMove5mBps?: number;
  ethRequireBtcConfirmation?: boolean;
  ethBtcMinConfidenceScore?: number;
  ethBtcMinTrendAlignmentScore?: number;
  ethBtcRelativeStrengthMinDelta?: number;
  requireSignalEvaluationSymbols?: string[];
  requireMarketIntelligenceSymbols?: string[];
  retryMaxAttempts: number;
  retryBudgetPerHour: number;
  maxPendingEntriesPerSymbol: number;
  executionMode: "proposal_only" | "demo_execution_enabled";
  defaultMaxHoldSec?: number;
  defaultSide?: WorkerSidePreference;
  symbolOverrides?: Record<string, WorkerSymbolOverride>;
  blockedUtcHoursBySymbol?: Record<string, number[]>;
}

interface CachedValue<T> {
  value: T;
  fetchedAtEpoch: number;
}

function computeExpectedMoveHurdle(input: {
  stopDistanceBps: number;
  takeProfitRMultiple: number;
  roundTripFeeBps: number;
  feeCoverageMultiple: number;
  minNetEdgeBps: number;
}): { projectedTargetBps: number; requiredTargetBps: number } {
  const projectedTargetBps = Math.max(0, input.stopDistanceBps) * Math.max(0, input.takeProfitRMultiple);
  const requiredTargetBps =
    Math.max(0, input.roundTripFeeBps) * Math.max(0, input.feeCoverageMultiple) + Math.max(0, input.minNetEdgeBps);
  return {
    projectedTargetBps,
    requiredTargetBps
  };
}

function nextSymbol(universe: string[], cycle: number): string {
  return universe[cycle % universe.length] ?? "BTC-USDT";
}

function baseRiskContext(
  market: SpotMarketInputs,
  maxNotionalUsd: number,
  executionMode: "proposal_only" | "demo_execution_enabled"
): RiskContext {
  const now = new Date().toISOString();
  return {
    account: {
      equityUsd: 50,
      currentDailyLossUsd: 0.1,
      currentWeeklyLossUsd: 0.5,
      currentOpenExposureUsd: 2,
      asOf: now
    },
    instrument: {
      symbol: market.symbol,
      minSz: market.minSz,
      lotSz: market.lotSz,
      tickSz: market.tickSz
    },
    market: {
      markPrice: market.last,
      asOf: now
    },
    ordersAsOf: now,
    limits: {
      maxPerTradeRiskUsd: 0.5,
      maxDailyLossUsd: 1,
      maxWeeklyLossUsd: 2.5,
      maxOpenExposureUsd: 15
    },
    policy: {
      allowedSymbols: [market.symbol],
      maxNotionalUsd,
      executionMode
    }
  };
}

function gatekeeperReason(decision: ReturnType<typeof evaluateTradeProposal>): string {
  if (decision.status === "APPROVE") {
    return "Gatekeeper approved worker proposal";
  }
  const violations = decision.violations.map((item) => `${item.code}: ${item.message}`);
  if (violations.length === 0) {
    return "Gatekeeper rejected worker proposal";
  }
  return `Gatekeeper rejected worker proposal: ${violations.join(" | ")}`;
}

function choosePositiveNumber(candidate: number | undefined, fallback: number): number {
  if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate <= 0) {
    return fallback;
  }
  return candidate;
}

function chooseFiniteNumber(candidate: number | undefined, fallback: number): number {
  if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
    return fallback;
  }
  return candidate;
}

function normalizeHour(value: number): number | undefined {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  const hour = Math.floor(value);
  if (hour < 0 || hour > 23) {
    return undefined;
  }
  return hour;
}

function isBlockedUtcHour(policy: WorkerPolicy, symbol: string, now: Date): boolean {
  const rawHours = policy.blockedUtcHoursBySymbol?.[symbol];
  if (!rawHours || rawHours.length === 0) {
    return false;
  }
  const hour = now.getUTCHours();
  return rawHours.some((item) => normalizeHour(item) === hour);
}

function distanceToBandBps(market: SpotMarketInputs, side: "buy" | "sell"): number | undefined {
  if (!Number.isFinite(market.last) || market.last <= 0) {
    return undefined;
  }
  if (side === "buy") {
    if (!Number.isFinite(market.buyLmt) || (market.buyLmt ?? 0) <= 0) {
      return undefined;
    }
    return ((market.buyLmt! - market.last) / market.last) * 10_000;
  }
  if (!Number.isFinite(market.sellLmt) || (market.sellLmt ?? 0) <= 0) {
    return undefined;
  }
  return ((market.last - market.sellLmt!) / market.last) * 10_000;
}

function sideMatchesTrend(side: "buy" | "sell", trendAlignmentScore: number): boolean {
  if (!Number.isFinite(trendAlignmentScore) || trendAlignmentScore === 0) {
    return false;
  }
  return side === "buy" ? trendAlignmentScore > 0 : trendAlignmentScore < 0;
}

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function policyAppliesToSymbol(symbol: string, configuredSymbols?: string[]): boolean {
  if (!configuredSymbols || configuredSymbols.length === 0) {
    return false;
  }
  const normalizedSymbol = normalizeSymbol(symbol);
  return configuredSymbols.some((item) => normalizeSymbol(item) === normalizedSymbol);
}

function resolveEntrySide(market: SpotMarketInputs, preferred: WorkerSidePreference, fallback: "buy" | "sell"): "buy" | "sell" {
  if (preferred === "buy" || preferred === "sell") {
    return preferred;
  }
  const buyDistance = distanceToBandBps(market, "buy");
  const sellDistance = distanceToBandBps(market, "sell");
  if (typeof buyDistance === "number" && typeof sellDistance === "number") {
    return buyDistance >= sellDistance ? "buy" : "sell";
  }
  if (typeof buyDistance === "number") {
    return "buy";
  }
  if (typeof sellDistance === "number") {
    return "sell";
  }
  return fallback;
}

function createFallbackSignalSnapshot(side: "buy" | "sell"): SignalSnapshot {
  const signedMove = side === "buy" ? 6 : -6;
  return {
    longMoveBps: signedMove,
    shortMoveBps: signedMove * 0.5,
    realizedVolatilityBps: 2,
    moveThresholdBps: 0,
    trendEfficiency: 3,
    regime: "quiet_trend",
    strategyFamily: "trend_follow",
    recommendedEntryOffsetBps: side === "buy" ? 8 : 6
  };
}

export class RuntimeWorkerManager {
  private intervalRef: ReturnType<typeof setInterval> | undefined;
  private cycleInFlight = false;
  private cycleGeneration = 0;
  private cycle = 0;
  private retryUsedInWindow = 0;
  private retryWindowStartEpoch = Date.now();
  private recentPrices = new Map<string, Array<{ atEpoch: number; last: number }>>();
  private lastGoodMarketBySymbol = new Map<string, CachedValue<SpotMarketInputs>>();
  private lastGoodMarketIntelligenceBySymbol = new Map<string, CachedValue<WorkerMarketIntelligenceSnapshot>>();

  constructor(private readonly callbacks: WorkerCallbacks, private readonly policy: WorkerPolicy) {}

  start(): void {
    if (this.intervalRef) {
      return;
    }
    this.cycleGeneration += 1;
    const generation = this.cycleGeneration;
    this.intervalRef = setInterval(() => {
      if (generation !== this.cycleGeneration) {
        return;
      }
      if (this.cycleInFlight) {
        return;
      }
      this.cycleInFlight = true;
      void this.runCycle(generation).finally(() => {
        if (generation === this.cycleGeneration) {
          this.cycleInFlight = false;
        }
      });
    }, this.policy.intervalMs);
  }

  pause(): void {
    if (!this.intervalRef) {
      return;
    }
    clearInterval(this.intervalRef);
    this.intervalRef = undefined;
    this.cycleGeneration += 1;
    this.cycleInFlight = false;
  }

  stop(): void {
    this.pause();
    this.cycleInFlight = false;
    this.callbacks.onStateUpdate({ cycleProgress: 0 });
  }

  private async runCycle(generation = this.cycleGeneration): Promise<void> {
    if (generation !== this.cycleGeneration) {
      return;
    }
    const state = this.callbacks.getState();
    if (state.state !== "running") {
      return;
    }

    try {
      const symbol = nextSymbol(this.policy.symbolUniverse, this.cycle);
      const now = new Date();
      const nowIso = now.toISOString();
      this.callbacks.onStateUpdate({ cycleProgress: 10, activeSymbol: symbol, lastHeartbeatAt: nowIso });

      if (isBlockedUtcHour(this.policy, symbol, now)) {
        await this.callbacks.onEvent(
          createEvent("RiskLimitHit", symbol, `Worker blocked by UTC time-window guard for ${symbol}`, "warn", [
            "worker_cycle",
            "time_window_guard"
          ])
        );
        this.cycle += 1;
        this.callbacks.onStateUpdate({
          cycleProgress: 0,
          cycleCount: this.cycle,
          activeSymbol: symbol,
          lastHeartbeatAt: new Date().toISOString()
        });
        return;
      }

      if (this.callbacks.evaluateSymbolEligibility) {
        const eligibility = await this.callbacks.evaluateSymbolEligibility(symbol, nowIso);
        if (!eligibility.eligible) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker symbol quality gate blocked ${symbol}: ${eligibility.reason ?? "blocked by policy"}`,
              "warn",
              ["worker_cycle", "symbol_quality_gate"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
      }

      const symbolOverride = this.policy.symbolOverrides?.[symbol];
      if (symbolOverride?.enabled === false) {
        await this.callbacks.onEvent(
          createEvent("RiskLimitHit", symbol, `Worker symbol disabled by override policy: ${symbol}`, "warn", [
            "worker_cycle",
            "symbol_override"
          ])
        );
        this.cycle += 1;
        this.callbacks.onStateUpdate({
          cycleProgress: 0,
          cycleCount: this.cycle,
          activeSymbol: symbol,
          lastHeartbeatAt: new Date().toISOString()
        });
        return;
      }

      if (this.callbacks.getEntryBacklog) {
        const backlog = this.callbacks.getEntryBacklog(symbol);
        if (backlog.pendingEntryCount >= this.policy.maxPendingEntriesPerSymbol) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker blocked by entry backlog (${backlog.pendingEntryCount} pending entries, ${backlog.pendingEntryNotionalUsd.toFixed(6)} USD resting >= limit ${this.policy.maxPendingEntriesPerSymbol})`,
              "warn",
              ["worker_cycle", "entry_backlog_guard"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
      }

      const sidePreference = symbolOverride?.side ?? this.policy.defaultSide ?? "buy";
      const maxNotionalUsd = choosePositiveNumber(symbolOverride?.maxNotionalUsd, this.policy.maxNotionalUsd);
      const configuredEntryOffsetBps = chooseFiniteNumber(symbolOverride?.entryOffsetBps, this.policy.entryOffsetBps);
      const stopDistanceBps = choosePositiveNumber(symbolOverride?.stopDistanceBps, this.policy.stopDistanceBps);
      const minBandDistanceBps = choosePositiveNumber(symbolOverride?.minBandDistanceBps, 0);

      const marketResult = await this.getMarketWithFallback(symbol);
      if (generation !== this.cycleGeneration) {
        return;
      }
      if (!marketResult.market) {
        await this.callbacks.onEvent(
          createEvent(
            "RiskLimitHit",
            symbol,
            marketResult.reason ?? "Worker blocked by unavailable market data.",
            "warn",
            ["worker_cycle", "market_data_unavailable"]
          )
        );
        this.cycle += 1;
        this.callbacks.onStateUpdate({
          cycleProgress: 0,
          cycleCount: this.cycle,
          activeSymbol: symbol,
          lastHeartbeatAt: new Date().toISOString()
        });
        return;
      }
      if (marketResult.fallbackUsed && marketResult.reason) {
        await this.callbacks.onEvent(
          createEvent("RiskLimitHit", symbol, marketResult.reason, "warn", ["worker_cycle", "market_data_cache"])
        );
      }
      const market = marketResult.market;
      const nowEpoch = Date.now();
      this.recordMarketSample(symbol, market.last, nowEpoch);
      const signalDecision = this.resolveSignalSide(symbol, sidePreference, market, nowEpoch);
      if (!signalDecision.ok) {
        await this.callbacks.onEvent(
          createEvent("RiskLimitHit", symbol, signalDecision.reason, "warn", ["worker_cycle", "signal_filter"])
        );
        this.cycle += 1;
        this.callbacks.onStateUpdate({
          cycleProgress: 0,
          cycleCount: this.cycle,
          activeSymbol: symbol,
          lastHeartbeatAt: new Date().toISOString()
        });
        return;
      }
      const side = signalDecision.side;
      const marketIntelligenceResult = await this.getMarketIntelligenceWithFallback(symbol);
      const marketIntelligence = marketIntelligenceResult.snapshot;
      if (generation !== this.cycleGeneration) {
        return;
      }
      if (marketIntelligenceResult.fallbackUsed && marketIntelligenceResult.reason) {
        await this.callbacks.onEvent(
          createEvent(
            "RiskLimitHit",
            symbol,
            marketIntelligenceResult.reason,
            "warn",
            ["worker_cycle", "market_intelligence_cache"]
          )
        );
      }
      if (policyAppliesToSymbol(symbol, this.policy.requireMarketIntelligenceSymbols) && !marketIntelligence) {
        await this.callbacks.onEvent(
          createEvent(
            "RiskLimitHit",
            symbol,
            `Worker blocked because market intelligence is required for ${symbol} but unavailable.`,
            "warn",
            ["worker_cycle", "market_intelligence_gate"]
          )
        );
        this.cycle += 1;
        this.callbacks.onStateUpdate({
          cycleProgress: 0,
          cycleCount: this.cycle,
          activeSymbol: symbol,
          lastHeartbeatAt: new Date().toISOString()
        });
        return;
      }
      if (marketIntelligence) {
        const minConfidence = Math.max(0, this.policy.marketIntelligenceMinConfidenceScore ?? 0);
        if (marketIntelligence.confidenceScore < minConfidence) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker blocked by market-intelligence confidence (${marketIntelligence.confidenceScore.toFixed(2)} < ${minConfidence.toFixed(2)} regime=${marketIntelligence.regime}).`,
              "warn",
              ["worker_cycle", "market_intelligence_gate"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
        const maxSpreadBps = Math.max(0, this.policy.marketIntelligenceMaxSpreadBps ?? Number.POSITIVE_INFINITY);
        if (marketIntelligence.spreadBps > maxSpreadBps) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker blocked by spread filter (${marketIntelligence.spreadBps.toFixed(2)}bps > ${maxSpreadBps.toFixed(2)}bps regime=${marketIntelligence.regime}).`,
              "warn",
              ["worker_cycle", "market_intelligence_gate"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
        if (this.policy.blockChopRegimes && (marketIntelligence.regime === "chop" || marketIntelligence.regime === "dead_zone")) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker blocked by non-trending regime (${marketIntelligence.regime}).`,
              "warn",
              ["worker_cycle", "market_intelligence_gate"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
        if (
          this.policy.requireMarketIntelligenceSideAlignment &&
          marketIntelligence.recommendedSide &&
          marketIntelligence.recommendedSide !== side
        ) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker blocked by market-intelligence side alignment (recommended=${marketIntelligence.recommendedSide} requested=${side} regime=${marketIntelligence.regime}).`,
              "warn",
              ["worker_cycle", "market_intelligence_gate"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
        if (marketIntelligence.continuationOverextended) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker blocked by continuation overextension (regime=${marketIntelligence.regime} move1m=${marketIntelligence.move1mBps.toFixed(2)}bps move15m=${marketIntelligence.move15mBps.toFixed(2)}bps).`,
              "warn",
              ["worker_cycle", "market_intelligence_gate"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
      }
      const thesisGate = await this.applySymbolThesisGate({
        symbol,
        side,
        marketIntelligence
      });
      if (generation !== this.cycleGeneration) {
        return;
      }
      if (thesisGate.warning) {
        await this.callbacks.onEvent(
          createEvent("RiskLimitHit", symbol, thesisGate.warning, "warn", ["worker_cycle", "market_intelligence_cache"])
        );
      }
      if (!thesisGate.ok) {
        await this.callbacks.onEvent(
          createEvent("RiskLimitHit", symbol, thesisGate.reason, "warn", ["worker_cycle", "symbol_thesis_gate"])
        );
        this.cycle += 1;
        this.callbacks.onStateUpdate({
          cycleProgress: 0,
          cycleCount: this.cycle,
          activeSymbol: symbol,
          lastHeartbeatAt: new Date().toISOString()
        });
        return;
      }
      const intelligenceDecision = buildTradingIntelligenceDecision({
        symbol,
        side,
        market,
        signal: signalDecision.snapshot,
        marketIntelligence,
        configuredEntryOffsetBps:
          symbolOverride?.entryOffsetBps !== undefined
            ? configuredEntryOffsetBps
            : marketIntelligence?.recommendedEntryOffsetBps ?? signalDecision.recommendedEntryOffsetBps ?? configuredEntryOffsetBps,
        configuredStopDistanceBps: stopDistanceBps,
        configuredMaxHoldSec: Math.max(60, this.policy.defaultMaxHoldSec ?? 30 * 60)
      });
      if (!intelligenceDecision.ok) {
        await this.callbacks.onEvent(
          createEvent("RiskLimitHit", symbol, intelligenceDecision.reason, "warn", ["worker_cycle", "intelligence_loop"])
        );
        this.cycle += 1;
        this.callbacks.onStateUpdate({
          cycleProgress: 0,
          cycleCount: this.cycle,
          activeSymbol: symbol,
          lastHeartbeatAt: new Date().toISOString()
        });
        return;
      }
      const entryOffsetBps = intelligenceDecision.plan.entryOffsetBps;
      if (this.callbacks.evaluateTradeEligibility) {
        const tradeEligibility = await this.callbacks.evaluateTradeEligibility({
          symbol,
          side,
          nowIso
        });
        if (!tradeEligibility.eligible) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker trade-quality gate blocked ${symbol} ${side}: ${tradeEligibility.reason ?? "blocked by policy"}`,
              "warn",
              ["worker_cycle", "trade_quality_gate"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
      }
      if (minBandDistanceBps > 0) {
        const bps = distanceToBandBps(market, side);
        if (typeof bps === "number" && bps < minBandDistanceBps) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker blocked by entry band-distance filter (${bps.toFixed(2)}bps < ${minBandDistanceBps.toFixed(2)}bps)`,
              "warn",
              ["worker_cycle", "entry_band_filter"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
      }
      const built = buildValidSpotProposal(market, {
        symbol,
        side,
        maxRiskUsd: this.policy.maxRiskUsd,
        maxNotionalUsd,
        entryOffsetBps,
        stopDistanceBps
      });
      if (this.policy.expectedMoveHurdleEnabled) {
        const expectedMove = computeExpectedMoveHurdle({
          stopDistanceBps,
          takeProfitRMultiple: choosePositiveNumber(this.policy.expectedMoveTakeProfitRMultiple, 1),
          roundTripFeeBps: Math.max(0, this.policy.signalRoundTripFeeBps),
          feeCoverageMultiple: choosePositiveNumber(this.policy.expectedMoveFeeCoverageMultiple, 1),
          minNetEdgeBps: Math.max(0, this.policy.expectedMoveMinNetEdgeBps ?? 0)
        });
        if (expectedMove.projectedTargetBps < expectedMove.requiredTargetBps) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker blocked by expected-move hurdle (projected=${expectedMove.projectedTargetBps.toFixed(2)}bps < required=${expectedMove.requiredTargetBps.toFixed(2)}bps).`,
              "warn",
              ["worker_cycle", "expected_move_hurdle"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
        if (marketIntelligence) {
          const maxMoveBudgetUsagePct = Math.max(0, this.policy.maxMoveBudgetUsagePct ?? 100);
          const projectedMoveBudgetBps = Math.max(0, marketIntelligence.projectedMoveBudgetBps ?? 0);
          if (projectedMoveBudgetBps > 0) {
            const usagePct = (expectedMove.projectedTargetBps / projectedMoveBudgetBps) * 100;
            if (usagePct > maxMoveBudgetUsagePct) {
              await this.callbacks.onEvent(
                createEvent(
                  "RiskLimitHit",
                  symbol,
                  `Worker blocked by volatility-budget mismatch (target=${expectedMove.projectedTargetBps.toFixed(2)}bps budget=${projectedMoveBudgetBps.toFixed(2)}bps usage=${usagePct.toFixed(2)}%).`,
                  "warn",
                  ["worker_cycle", "expected_move_hurdle"]
                )
              );
              this.cycle += 1;
              this.callbacks.onStateUpdate({
                cycleProgress: 0,
                cycleCount: this.cycle,
                activeSymbol: symbol,
                lastHeartbeatAt: new Date().toISOString()
              });
              return;
            }
          }
        }
      }
      if (built.diagnostics.blockedByMaxNotional) {
        await this.callbacks.onEvent(
          createEvent(
            "RiskLimitHit",
            symbol,
            `Worker blocked by max notional constraint (min notional exceeds cap).`,
            "warn",
            ["worker_cycle", "max_notional_guard"]
          )
        );
        this.cycle += 1;
        this.callbacks.onStateUpdate({
          cycleProgress: 0,
          cycleCount: this.cycle,
          activeSymbol: symbol,
          lastHeartbeatAt: new Date().toISOString()
        });
        return;
      }

      await this.callbacks.onEvent(
        createEvent("ProposalCreated", symbol, `Worker proposal created ${built.proposal.proposalId}`, "info", ["worker_cycle"])
      );

      const context =
        this.callbacks.buildRiskContext?.({
          market,
          maxNotionalUsd,
          executionMode: this.policy.executionMode
        }) ?? baseRiskContext(market, maxNotionalUsd, this.policy.executionMode);
      const decision = evaluateTradeProposal(built.proposal as TradeProposal, context);
      await this.callbacks.onEvent(
        createEvent(
          "GatekeeperDecision",
          symbol,
          gatekeeperReason(decision),
          decision.status === "APPROVE" ? "info" : "warn",
          [decision.status === "APPROVE" ? "gatekeeper_approve" : "gatekeeper_reject"]
        )
      );

      if (decision.status === "APPROVE" && decision.executionIntent) {
        if (this.policy.executionMode === "demo_execution_enabled") {
          const queued = await this.callbacks.queueDemoExecutionApproval({
            symbol,
            proposal: built.proposal as TradeProposal,
            context,
            intent: decision.executionIntent,
            entryOffsetBps,
            stopDistanceBps,
            requestedNotionalUsd: built.diagnostics.notionalUsd,
            marketIntelligence,
            tradingPlan: intelligenceDecision.plan
          });
          if (generation !== this.cycleGeneration) {
            return;
          }
          const message = queued.queued
            ? `Proposal queued for human approval (${queued.approvalId}) before demo order submit`
            : `Proposal approved but not queued for demo execution: ${queued.reason ?? "unknown reason"}`;
          await this.callbacks.onEvent(
            createEvent("ProposalApproved", symbol, message, queued.queued ? "info" : "warn", ["worker_cycle", "approval_created"])
          );
        } else {
          await this.callbacks.onEvent(
            createEvent("ProposalApproved", symbol, "Proposal moved to approval queue (proposal-only mode)", "info", ["worker_cycle"])
          );
        }
      }

      this.cycle += 1;
      this.callbacks.onStateUpdate({
        cycleProgress: 0,
        cycleCount: this.cycle,
        activeSymbol: symbol,
        lastHeartbeatAt: new Date().toISOString()
      });
    } catch (error: unknown) {
      await this.callbacks.onEvent(
        createEvent(
          "Error",
          this.callbacks.getState().activeSymbol,
          `Worker cycle failed: ${error instanceof Error ? error.message : String(error)}`,
          "error",
          ["worker_cycle_error"]
        )
      );
      this.callbacks.onStateUpdate({ lastHeartbeatAt: new Date().toISOString() });
    }
  }

  private resetRetryWindowIfNeeded(): void {
    const now = Date.now();
    if (now - this.retryWindowStartEpoch >= 60 * 60 * 1000) {
      this.retryWindowStartEpoch = now;
      this.retryUsedInWindow = 0;
    }
  }

  private async fetchWithRetryBudget(symbol: string) {
    this.resetRetryWindowIfNeeded();
    const maxAttempts = Math.max(1, this.policy.retryMaxAttempts);
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await fetchSpotMarketInputs(symbol, this.policy.baseUrl);
      } catch (error: unknown) {
        if (attempt >= maxAttempts) {
          throw error;
        }
        if (this.retryUsedInWindow >= this.policy.retryBudgetPerHour) {
          throw new Error("Retry budget exhausted for worker market data fetch.");
        }
        this.retryUsedInWindow += 1;
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
    throw new Error("Worker retry exhausted.");
  }

  private marketCacheTtlMs(): number {
    return Math.max(60_000, Math.min(15 * 60_000, this.policy.signalLookbackSec * 1000));
  }

  private marketIntelligenceCacheTtlMs(): number {
    return Math.max(60_000, Math.min(10 * 60_000, this.policy.signalLookbackSec * 1000));
  }

  private async getMarketWithFallback(symbol: string): Promise<{
    market?: SpotMarketInputs;
    fallbackUsed: boolean;
    reason?: string;
  }> {
    try {
      const market = await this.fetchWithRetryBudget(symbol);
      this.lastGoodMarketBySymbol.set(symbol, {
        value: market,
        fetchedAtEpoch: Date.now()
      });
      return {
        market,
        fallbackUsed: false
      };
    } catch (error: unknown) {
      const cached = this.lastGoodMarketBySymbol.get(symbol);
      const nowEpoch = Date.now();
      const ttlMs = this.marketCacheTtlMs();
      if (cached && nowEpoch - cached.fetchedAtEpoch <= ttlMs) {
        const ageSec = Math.round((nowEpoch - cached.fetchedAtEpoch) / 1000);
        return {
          market: cached.value,
          fallbackUsed: true,
          reason: `Worker using cached market data for ${symbol} after public-data failure (age=${ageSec}s ttl=${Math.round(
            ttlMs / 1000
          )}s: ${error instanceof Error ? error.message : String(error)}).`
        };
      }
      return {
        fallbackUsed: false,
        reason: `Worker blocked by unavailable market data for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async getMarketIntelligenceWithFallback(symbol: string): Promise<{
    snapshot?: WorkerMarketIntelligenceSnapshot;
    fallbackUsed: boolean;
    reason?: string;
  }> {
    if (!this.callbacks.getMarketIntelligence) {
      return { fallbackUsed: false };
    }
    try {
      const snapshot = await this.callbacks.getMarketIntelligence({ symbol });
      if (snapshot) {
        this.lastGoodMarketIntelligenceBySymbol.set(symbol, {
          value: snapshot,
          fetchedAtEpoch: Date.now()
        });
        return {
          snapshot,
          fallbackUsed: false
        };
      }
    } catch (error: unknown) {
      const cached = this.lastGoodMarketIntelligenceBySymbol.get(symbol);
      const nowEpoch = Date.now();
      const ttlMs = this.marketIntelligenceCacheTtlMs();
      if (cached && nowEpoch - cached.fetchedAtEpoch <= ttlMs) {
        const ageSec = Math.round((nowEpoch - cached.fetchedAtEpoch) / 1000);
        return {
          snapshot: cached.value,
          fallbackUsed: true,
          reason: `Worker using cached market intelligence for ${symbol} after public-data failure (age=${ageSec}s ttl=${Math.round(
            ttlMs / 1000
          )}s: ${error instanceof Error ? error.message : String(error)}).`
        };
      }
      return {
        fallbackUsed: false,
        reason: `Worker market intelligence unavailable for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    const cached = this.lastGoodMarketIntelligenceBySymbol.get(symbol);
    const nowEpoch = Date.now();
    const ttlMs = this.marketIntelligenceCacheTtlMs();
    if (cached && nowEpoch - cached.fetchedAtEpoch <= ttlMs) {
      const ageSec = Math.round((nowEpoch - cached.fetchedAtEpoch) / 1000);
      return {
        snapshot: cached.value,
        fallbackUsed: true,
        reason: `Worker using cached market intelligence for ${symbol} because fresh intelligence was unavailable (age=${ageSec}s ttl=${Math.round(
          ttlMs / 1000
        )}s).`
      };
    }
    return { fallbackUsed: false };
  }

  private recordMarketSample(symbol: string, last: number, atEpoch: number): void {
    if (!Number.isFinite(last) || last <= 0) {
      return;
    }
    const history = this.recentPrices.get(symbol) ?? [];
    history.push({ atEpoch, last });
    const cutoffEpoch = atEpoch - Math.max(60, this.policy.signalLookbackSec * 3) * 1000;
    const trimmed = history.filter((item) => item.atEpoch >= cutoffEpoch).slice(-256);
    this.recentPrices.set(symbol, trimmed);
  }

  private async applySymbolThesisGate(input: {
    symbol: string;
    side: "buy" | "sell";
    marketIntelligence?: WorkerMarketIntelligenceSnapshot;
  }): Promise<
    | { ok: true; warning?: string }
    | {
        ok: false;
        reason: string;
        warning?: string;
      }
  > {
    if (input.symbol === "BTC-USDT" && input.side === "buy") {
      if (!input.marketIntelligence) {
        return {
          ok: false,
          reason: "Worker blocked BTC buy because market intelligence is required for stricter confirmation."
        };
      }
      const minConfidence = Math.max(0, this.policy.btcBuyMinConfidenceScore ?? 0);
      if (input.marketIntelligence.confidenceScore < minConfidence) {
        return {
          ok: false,
          reason: `Worker blocked BTC buy by confidence confirmation (${input.marketIntelligence.confidenceScore.toFixed(2)} < ${minConfidence.toFixed(2)}).`
        };
      }
      const minTrendAlignment = Math.max(0, this.policy.btcBuyMinTrendAlignmentScore ?? 0);
      if (input.marketIntelligence.trendAlignmentScore < minTrendAlignment) {
        return {
          ok: false,
          reason: `Worker blocked BTC buy by trend-alignment confirmation (${input.marketIntelligence.trendAlignmentScore.toFixed(2)} < ${minTrendAlignment.toFixed(2)}).`
        };
      }
      const minMove5mBps = Math.max(0, this.policy.btcBuyMinMove5mBps ?? 0);
      if (input.marketIntelligence.move5mBps < minMove5mBps) {
        return {
          ok: false,
          reason: `Worker blocked BTC buy by 5m continuation confirmation (${input.marketIntelligence.move5mBps.toFixed(2)}bps < ${minMove5mBps.toFixed(2)}bps).`
        };
      }
    }

    if (input.symbol !== "ETH-USDT" || !this.policy.ethRequireBtcConfirmation) {
      return { ok: true };
    }

    const btcIntelligenceResult = await this.getMarketIntelligenceWithFallback("BTC-USDT");
    const btcIntelligence = btcIntelligenceResult.snapshot;
    const warning = btcIntelligenceResult.fallbackUsed ? btcIntelligenceResult.reason : undefined;
    if (!btcIntelligence) {
      return {
        ok: false,
        reason: "Worker blocked ETH because BTC confirmation intelligence was unavailable.",
        warning
      };
    }
    if (btcIntelligence.regime === "chop" || btcIntelligence.regime === "dead_zone") {
      return {
        ok: false,
        reason: `Worker blocked ETH because BTC confirmation regime is ${btcIntelligence.regime}.`,
        warning
      };
    }
    if (btcIntelligence.recommendedSide && btcIntelligence.recommendedSide !== input.side) {
      return {
        ok: false,
        reason: `Worker blocked ETH because BTC recommended side is ${btcIntelligence.recommendedSide}, not ${input.side}.`,
        warning
      };
    }
    const minBtcConfidence = Math.max(0, this.policy.ethBtcMinConfidenceScore ?? 0);
    if (btcIntelligence.confidenceScore < minBtcConfidence) {
      return {
        ok: false,
        reason: `Worker blocked ETH because BTC confirmation confidence is too low (${btcIntelligence.confidenceScore.toFixed(2)} < ${minBtcConfidence.toFixed(2)}).`,
        warning
      };
    }
    const minBtcTrendAlignment = Math.max(0, this.policy.ethBtcMinTrendAlignmentScore ?? 0);
    if (!sideMatchesTrend(input.side, btcIntelligence.trendAlignmentScore)) {
      return {
        ok: false,
        reason: `Worker blocked ETH because BTC trend alignment does not support ${input.side} (${btcIntelligence.trendAlignmentScore.toFixed(2)}).`,
        warning
      };
    }
    if (Math.abs(btcIntelligence.trendAlignmentScore) < minBtcTrendAlignment) {
      return {
        ok: false,
        reason: `Worker blocked ETH because BTC trend alignment is too weak (${Math.abs(btcIntelligence.trendAlignmentScore).toFixed(2)} < ${minBtcTrendAlignment.toFixed(2)}).`,
        warning
      };
    }
    if (!input.marketIntelligence) {
      return {
        ok: false,
        reason: "Worker blocked ETH because local ETH intelligence is required for cross-asset confirmation.",
        warning
      };
    }
    const minRelativeStrengthDelta = this.policy.ethBtcRelativeStrengthMinDelta ?? 0;
    const ethRelativeStrength = Math.abs(input.marketIntelligence.trendAlignmentScore) / Math.max(1, input.marketIntelligence.realizedVolatilityBps);
    const btcRelativeStrength = Math.abs(btcIntelligence.trendAlignmentScore) / Math.max(1, btcIntelligence.realizedVolatilityBps);
    if (ethRelativeStrength + minRelativeStrengthDelta < btcRelativeStrength) {
      return {
        ok: false,
        reason: `Worker blocked ETH because ETH relative strength (${ethRelativeStrength.toFixed(2)}) trails BTC confirmation (${btcRelativeStrength.toFixed(2)}).`,
        warning
      };
    }
    if (input.marketIntelligence?.recommendedSide && input.marketIntelligence.recommendedSide !== input.side) {
      return {
        ok: false,
        reason: `Worker blocked ETH because ETH local recommendation is ${input.marketIntelligence.recommendedSide}, not ${input.side}.`,
        warning
      };
    }
    return { ok: true, warning };
  }

  private resolveSignalSide(
    symbol: string,
    sidePreference: WorkerSidePreference,
    market: SpotMarketInputs,
    nowEpoch: number
  ): { ok: true; side: "buy" | "sell"; snapshot: SignalSnapshot; recommendedEntryOffsetBps?: number } | { ok: false; reason: string } {
    const minMoveBps = Math.max(0, this.policy.signalMinMoveBps);
    if (minMoveBps <= 0) {
      if (policyAppliesToSymbol(symbol, this.policy.requireSignalEvaluationSymbols)) {
        return {
          ok: false,
          reason: `Worker blocked because signal evaluation is required for ${symbol} but signalMinMoveBps is disabled.`
        };
      }
      const side = resolveEntrySide(market, sidePreference, "buy");
      return { ok: true, side, snapshot: createFallbackSignalSnapshot(side) };
    }
    const history = this.recentPrices.get(symbol) ?? [];
    const decision = evaluateSignalOpportunity({
      history,
      market,
      preferredSide: sidePreference,
      nowEpoch,
      config: {
        longLookbackSec: this.policy.signalLookbackSec,
        shortLookbackSec: this.policy.signalShortLookbackSec,
        minTrendMoveBps: this.policy.signalMinMoveBps,
        minAbsoluteTrendMoveBps: this.policy.signalMinAbsoluteMoveBps,
        trendVolatilityThresholdMultiplier: this.policy.signalTrendVolatilityThresholdMultiplier,
        minVolatilityBps: this.policy.signalMinVolatilityBps,
        roundTripFeeBps: this.policy.signalRoundTripFeeBps,
        quietRegimeTrendEfficiencyMin: this.policy.quietRegimeTrendEfficiencyMin,
        quietRegimeMoveThresholdMultiplier: this.policy.quietRegimeMoveThresholdMultiplier,
        buyTrendStrengthMultiplier: this.policy.buyTrendStrengthMultiplier,
        sellTrendStrengthMultiplier: this.policy.sellTrendStrengthMultiplier,
        buyShortMoveConfirmationBps: this.policy.buyShortMoveConfirmationBps,
        sellShortMoveConfirmationBps: this.policy.sellShortMoveConfirmationBps,
        buyEntryOffsetMultiplier: this.policy.buyEntryOffsetMultiplier,
        sellEntryOffsetMultiplier: this.policy.sellEntryOffsetMultiplier
      }
    });
    return decision.ok
      ? {
          ok: true,
          side: decision.side,
          snapshot: decision.snapshot,
          recommendedEntryOffsetBps: decision.recommendedEntryOffsetBps
        }
      : { ok: false, reason: decision.reason };
  }
}
