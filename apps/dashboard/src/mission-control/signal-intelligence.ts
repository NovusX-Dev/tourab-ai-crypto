import type { SpotMarketInputs } from "../proposal-helper.js";

export interface PriceSample {
  atEpoch: number;
  last: number;
}

export interface SignalIntelligenceConfig {
  longLookbackSec: number;
  shortLookbackSec: number;
  minTrendMoveBps: number;
  minAbsoluteTrendMoveBps?: number;
  trendVolatilityThresholdMultiplier?: number;
  minVolatilityBps: number;
  roundTripFeeBps: number;
  quietRegimeTrendEfficiencyMin?: number;
  quietRegimeMoveThresholdMultiplier?: number;
  buyTrendStrengthMultiplier?: number;
  sellTrendStrengthMultiplier?: number;
  buyShortMoveConfirmationBps?: number;
  sellShortMoveConfirmationBps?: number;
  buyEntryOffsetMultiplier?: number;
  sellEntryOffsetMultiplier?: number;
}

export interface SignalSnapshot {
  longMoveBps: number;
  shortMoveBps: number;
  realizedVolatilityBps: number;
  moveThresholdBps: number;
  trendEfficiency: number;
  regime: "warmup" | "dead_zone" | "quiet_trend" | "trend";
  strategyFamily: "trend_follow";
  recommendedEntryOffsetBps: number;
}

export type SignalDecision =
  | { ok: true; side: "buy" | "sell"; snapshot: SignalSnapshot; recommendedEntryOffsetBps: number }
  | { ok: false; reason: string; snapshot?: SignalSnapshot };

function sign(value: number): -1 | 0 | 1 {
  if (value > 0) {
    return 1;
  }
  if (value < 0) {
    return -1;
  }
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function findAnchor(history: PriceSample[], cutoffEpoch: number): PriceSample | undefined {
  return history.find((item) => item.atEpoch >= cutoffEpoch) ?? history[0];
}

function computeMoveBps(history: PriceSample[], nowEpoch: number, lookbackSec: number): number | undefined {
  if (history.length < 2) {
    return undefined;
  }
  const anchor = findAnchor(history, nowEpoch - Math.max(1, lookbackSec) * 1000);
  const latest = history[history.length - 1];
  if (!anchor || !latest || !Number.isFinite(anchor.last) || anchor.last <= 0 || !Number.isFinite(latest.last)) {
    return undefined;
  }
  return ((latest.last - anchor.last) / anchor.last) * 10_000;
}

function computeRealizedVolatilityBps(history: PriceSample[], nowEpoch: number, lookbackSec: number): number | undefined {
  const cutoffEpoch = nowEpoch - Math.max(1, lookbackSec) * 1000;
  const scoped = history.filter((item) => item.atEpoch >= cutoffEpoch);
  if (scoped.length < 3) {
    return undefined;
  }
  const returns: number[] = [];
  for (let i = 1; i < scoped.length; i += 1) {
    const prev = scoped[i - 1];
    const next = scoped[i];
    if (!prev || !next || !Number.isFinite(prev.last) || prev.last <= 0 || !Number.isFinite(next.last) || next.last <= 0) {
      continue;
    }
    returns.push(Math.log(next.last / prev.last));
  }
  if (returns.length < 2) {
    return undefined;
  }
  const mean = returns.reduce((sum, item) => sum + item, 0) / returns.length;
  const variance = returns.reduce((sum, item) => sum + (item - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 10_000;
}

function computeDynamicMoveThresholdBps(input: {
  baseMinTrendMoveBps: number;
  minAbsoluteTrendMoveBps?: number;
  trendVolatilityThresholdMultiplier?: number;
  realizedVolatilityBps: number;
}): number {
  const baseThreshold = Math.max(0, input.baseMinTrendMoveBps);
  const absoluteFloor = Math.max(0, input.minAbsoluteTrendMoveBps ?? 0);
  const volatilityMultiplier = Math.max(0, input.trendVolatilityThresholdMultiplier ?? 0);
  const volatilityScaledThreshold = input.realizedVolatilityBps * volatilityMultiplier;
  return Math.max(absoluteFloor, Math.min(baseThreshold, volatilityScaledThreshold || baseThreshold));
}

export function evaluateSignalOpportunity(input: {
  history: PriceSample[];
  market: SpotMarketInputs;
  preferredSide: "buy" | "sell" | "auto";
  nowEpoch: number;
  config: SignalIntelligenceConfig;
}): SignalDecision {
  const longMoveBps = computeMoveBps(input.history, input.nowEpoch, input.config.longLookbackSec);
  const shortMoveBps = computeMoveBps(input.history, input.nowEpoch, input.config.shortLookbackSec);
  const realizedVolatilityBps = computeRealizedVolatilityBps(input.history, input.nowEpoch, input.config.longLookbackSec);

  if (typeof longMoveBps !== "number" || typeof shortMoveBps !== "number" || typeof realizedVolatilityBps !== "number") {
    return {
      ok: false,
      reason: `Worker blocked by signal filter warmup (need ${input.config.longLookbackSec}s of price history).`
    };
  }

  // Net-of-cost gating is enforced separately by the expected-move hurdle.
  // Keep the signal layer focused on market structure, but scale the signal hurdle
  // with realized volatility so low-vol BTC does not get hard-blocked by a static threshold.
  const moveThresholdBps = computeDynamicMoveThresholdBps({
    baseMinTrendMoveBps: input.config.minTrendMoveBps,
    minAbsoluteTrendMoveBps: input.config.minAbsoluteTrendMoveBps,
    trendVolatilityThresholdMultiplier: input.config.trendVolatilityThresholdMultiplier,
    realizedVolatilityBps
  });
  const trendEfficiency = Math.abs(longMoveBps) / Math.max(0.0001, realizedVolatilityBps);
  const snapshot: SignalSnapshot = {
    longMoveBps,
    shortMoveBps,
    realizedVolatilityBps,
    moveThresholdBps,
    trendEfficiency,
    regime: "trend",
    strategyFamily: "trend_follow",
    recommendedEntryOffsetBps: 0
  };

  const quietRegimeMoveThreshold =
    moveThresholdBps * Math.max(0.5, input.config.quietRegimeMoveThresholdMultiplier ?? 1);
  const quietRegimeTrendEfficiencyMin = Math.max(1, input.config.quietRegimeTrendEfficiencyMin ?? 8);
  const impulseBps = Math.abs(longMoveBps);
  const baseRecommendedEntryOffsetBps = clamp(impulseBps * 0.35, 8, 25);
  snapshot.recommendedEntryOffsetBps = baseRecommendedEntryOffsetBps;

  if (realizedVolatilityBps < input.config.minVolatilityBps) {
    if (Math.abs(longMoveBps) < quietRegimeMoveThreshold) {
      snapshot.regime = "dead_zone";
      return {
        ok: false,
        reason: `Worker blocked by low-volatility dead zone (${realizedVolatilityBps.toFixed(2)}bps < ${input.config.minVolatilityBps.toFixed(2)}bps, move=${Math.abs(longMoveBps).toFixed(2)}bps < ${quietRegimeMoveThreshold.toFixed(2)}bps).`,
        snapshot
      };
    }
    if (trendEfficiency < quietRegimeTrendEfficiencyMin) {
      snapshot.regime = "dead_zone";
      return {
        ok: false,
        reason: `Worker blocked by low-volatility weak trend (efficiency=${trendEfficiency.toFixed(2)} < ${quietRegimeTrendEfficiencyMin.toFixed(2)}).`,
        snapshot
      };
    }
    snapshot.regime = "quiet_trend";
  } else {
    snapshot.regime = "trend";
  }

  if (Math.abs(longMoveBps) < moveThresholdBps) {
    return {
      ok: false,
      reason: `Worker blocked by trend-magnitude filter (${Math.abs(longMoveBps).toFixed(2)}bps < ${moveThresholdBps.toFixed(2)}bps).`,
      snapshot
    };
  }

  const buyTrendStrengthMultiplier = Math.max(1, input.config.buyTrendStrengthMultiplier ?? 1);
  const sellTrendStrengthMultiplier = Math.max(0.5, input.config.sellTrendStrengthMultiplier ?? 1);
  const buyTrendStrengthThreshold = moveThresholdBps * buyTrendStrengthMultiplier;
  const sellTrendStrengthThreshold = moveThresholdBps * sellTrendStrengthMultiplier;
  const buyShortMoveConfirmationBps = Math.max(0, input.config.buyShortMoveConfirmationBps ?? 0);
  const sellShortMoveConfirmationBps = Math.max(0, input.config.sellShortMoveConfirmationBps ?? 0);
  const buyEntryOffsetMultiplier = Math.max(0.5, input.config.buyEntryOffsetMultiplier ?? 1);
  const sellEntryOffsetMultiplier = Math.max(0.5, input.config.sellEntryOffsetMultiplier ?? 1);
  const recommendedPullbackEntryOffsetBpsBySide = {
    buy: clamp(baseRecommendedEntryOffsetBps * buyEntryOffsetMultiplier, 6, 25),
    sell: clamp(baseRecommendedEntryOffsetBps * sellEntryOffsetMultiplier, 4, 25)
  };
  const recommendedMomentumEntryOffsetBpsBySide = {
    buy: -clamp(baseRecommendedEntryOffsetBps * Math.min(buyEntryOffsetMultiplier, 1), 1, 8),
    sell: -clamp(baseRecommendedEntryOffsetBps * Math.min(sellEntryOffsetMultiplier, 1), 1, 8)
  };
  const quietContinuationSide =
    longMoveBps >= quietRegimeMoveThreshold * Math.max(1, buyTrendStrengthMultiplier ?? 1)
      ? "buy"
      : longMoveBps <= -(quietRegimeMoveThreshold * Math.max(0.5, sellTrendStrengthMultiplier ?? 1))
        ? "sell"
        : undefined;
  const quietContinuationToleranceBps = quietRegimeMoveThreshold * 0.75;
  const quietContinuationStrength = sign(longMoveBps) * shortMoveBps;

  if (snapshot.regime === "quiet_trend" && quietContinuationSide) {
    if (quietContinuationStrength < -quietContinuationToleranceBps) {
      return {
        ok: false,
        reason: `Worker blocked by quiet-trend continuation filter (long=${longMoveBps.toFixed(2)}bps short=${shortMoveBps.toFixed(2)}bps).`,
        snapshot
      };
    }
    if (input.preferredSide === "auto") {
      return {
        ok: true,
        side: quietContinuationSide,
        snapshot,
        recommendedEntryOffsetBps: recommendedPullbackEntryOffsetBpsBySide[quietContinuationSide]
      };
    }
    if (input.preferredSide !== quietContinuationSide) {
      return {
        ok: false,
        reason: `Worker blocked by quiet-trend side mismatch (required=${quietContinuationSide} requested=${input.preferredSide}).`,
        snapshot
      };
    }
    return {
      ok: true,
      side: input.preferredSide,
      snapshot,
      recommendedEntryOffsetBps: recommendedPullbackEntryOffsetBpsBySide[input.preferredSide]
    };
  }

  const continuationToleranceBps = moveThresholdBps * 0.75;
  const buyContinuation =
    longMoveBps >= buyTrendStrengthThreshold && shortMoveBps >= -continuationToleranceBps + buyShortMoveConfirmationBps;
  const sellContinuation =
    longMoveBps <= -sellTrendStrengthThreshold && shortMoveBps <= continuationToleranceBps - sellShortMoveConfirmationBps;

  if (input.preferredSide === "auto") {
    if (buyContinuation) {
      return { ok: true, side: "buy", snapshot, recommendedEntryOffsetBps: recommendedMomentumEntryOffsetBpsBySide.buy };
    }
    if (sellContinuation) {
      return { ok: true, side: "sell", snapshot, recommendedEntryOffsetBps: recommendedMomentumEntryOffsetBpsBySide.sell };
    }
    return {
      ok: false,
      reason: `Worker blocked by continuation confirmation filter (long=${longMoveBps.toFixed(2)}bps short=${shortMoveBps.toFixed(2)}bps).`,
      snapshot
    };
  }

  if (input.preferredSide === "buy" && !buyContinuation) {
    return {
      ok: false,
      reason: `Worker blocked by buy continuation filter (long=${longMoveBps.toFixed(2)}bps short=${shortMoveBps.toFixed(2)}bps, threshold=${buyTrendStrengthThreshold.toFixed(2)}bps).`,
      snapshot
    };
  }

  if (input.preferredSide === "sell" && !sellContinuation) {
    return {
      ok: false,
      reason: `Worker blocked by sell continuation filter (long=${longMoveBps.toFixed(2)}bps short=${shortMoveBps.toFixed(2)}bps, threshold=${sellTrendStrengthThreshold.toFixed(2)}bps).`,
      snapshot
    };
  }

  return {
    ok: true,
    side: input.preferredSide,
    snapshot,
    recommendedEntryOffsetBps: recommendedMomentumEntryOffsetBpsBySide[input.preferredSide]
  };
}
