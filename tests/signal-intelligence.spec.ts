import { describe, expect, it } from "vitest";
import { evaluateSignalOpportunity, type PriceSample } from "../apps/dashboard/src/mission-control/signal-intelligence.js";

function makeSeries(values: number[], startEpoch = Date.UTC(2026, 2, 24, 0, 0, 0), stepMs = 15_000): PriceSample[] {
  return values.map((last, index) => ({
    last,
    atEpoch: startEpoch + index * stepMs
  }));
}

const market = {
  symbol: "BTC-USDT",
  last: 100,
  tickSz: 0.1,
  lotSz: 0.0001,
  minSz: 0.0001
};

describe("signal intelligence", () => {
  it("blocks when history is too short", () => {
    const result = evaluateSignalOpportunity({
      history: makeSeries([100, 99.9]),
      market,
      preferredSide: "auto",
      nowEpoch: Date.UTC(2026, 2, 24, 0, 1, 0),
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 20,
        minVolatilityBps: 3,
        roundTripFeeBps: 16
      }
    });
    expect(result.ok).toBe(false);
  });

  it("picks buy on continuation after a meaningful rise with only a mild pullback", () => {
    const history = makeSeries([100, 100.15, 100.3, 100.45, 100.6, 100.58, 100.56, 100.55, 100.54]);
    const result = evaluateSignalOpportunity({
      history,
      market: { ...market, last: 100.54 },
      preferredSide: "auto",
      nowEpoch: history[history.length - 1]!.atEpoch,
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 20,
        minVolatilityBps: 1,
        roundTripFeeBps: 16
      }
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.side).toBe("buy");
      expect(result.recommendedEntryOffsetBps).toBeLessThan(0);
    }
  });

  it("makes buys more passive when asymmetric buy controls are enabled", () => {
    const history = makeSeries([100, 100.12, 100.24, 100.33, 100.4, 100.39, 100.37, 100.35, 100.34]);
    const baseline = evaluateSignalOpportunity({
      history,
      market: { ...market, last: 100.34 },
      preferredSide: "auto",
      nowEpoch: history[history.length - 1]!.atEpoch,
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 20,
        minVolatilityBps: 1,
        roundTripFeeBps: 16
      }
    });
    const result = evaluateSignalOpportunity({
      history,
      market: { ...market, last: 100.34 },
      preferredSide: "auto",
      nowEpoch: history[history.length - 1]!.atEpoch,
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 20,
        minVolatilityBps: 1,
        roundTripFeeBps: 16,
        buyTrendStrengthMultiplier: 1.5,
        buyShortMoveConfirmationBps: 2,
        buyEntryOffsetMultiplier: 1.2
      }
    });
    expect(baseline.ok).toBe(true);
    expect(result.ok).toBe(true);
    if (baseline.ok && result.ok) {
      expect(baseline.side).toBe("buy");
      expect(result.side).toBe("buy");
      expect(result.recommendedEntryOffsetBps).toBeLessThanOrEqual(baseline.recommendedEntryOffsetBps);
    }
  });

  it("picks sell on continuation after a meaningful drop with only a mild bounce", () => {
    const history = makeSeries([100, 99.85, 99.7, 99.55, 99.4, 99.42, 99.44, 99.45, 99.46]);
    const result = evaluateSignalOpportunity({
      history,
      market: { ...market, last: 99.46 },
      preferredSide: "auto",
      nowEpoch: history[history.length - 1]!.atEpoch,
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 20,
        minVolatilityBps: 1,
        roundTripFeeBps: 16
      }
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.side).toBe("sell");
      expect(result.recommendedEntryOffsetBps).toBeLessThan(0);
    }
  });

  it("makes sells slightly less passive when asymmetric sell controls are enabled", () => {
    const history = makeSeries([100, 99.86, 99.72, 99.58, 99.44, 99.47, 99.49, 99.5, 99.51]);
    const baseline = evaluateSignalOpportunity({
      history,
      market: { ...market, last: 99.51 },
      preferredSide: "auto",
      nowEpoch: history[history.length - 1]!.atEpoch,
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 20,
        minVolatilityBps: 1,
        roundTripFeeBps: 16
      }
    });
    const tuned = evaluateSignalOpportunity({
      history,
      market: { ...market, last: 99.51 },
      preferredSide: "auto",
      nowEpoch: history[history.length - 1]!.atEpoch,
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 20,
        minVolatilityBps: 1,
        roundTripFeeBps: 16,
        sellTrendStrengthMultiplier: 0.9,
        sellEntryOffsetMultiplier: 0.7
      }
    });
    expect(baseline.ok).toBe(true);
    expect(tuned.ok).toBe(true);
    if (baseline.ok && tuned.ok) {
      expect(baseline.side).toBe("sell");
      expect(tuned.side).toBe("sell");
      expect(tuned.recommendedEntryOffsetBps).toBeGreaterThanOrEqual(baseline.recommendedEntryOffsetBps);
    }
  });

  it("blocks when move does not clear cost hurdle", () => {
    const history = makeSeries([100, 100.05, 100.06, 100.04, 100.05, 100.03, 100.04, 100.02, 100.01]);
    const result = evaluateSignalOpportunity({
      history,
      market: { ...market, last: 100.01 },
      preferredSide: "auto",
      nowEpoch: history[history.length - 1]!.atEpoch,
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 5,
        minVolatilityBps: 0,
        roundTripFeeBps: 16
      }
    });
    expect(result.ok).toBe(false);
  });

  it("scales the trend-magnitude threshold down in low-volatility trend regimes", () => {
    const history = makeSeries([100, 99.98, 99.95, 99.92, 99.89, 99.87, 99.85, 99.83, 99.82]);
    const result = evaluateSignalOpportunity({
      history,
      market: { ...market, last: 99.82 },
      preferredSide: "sell",
      nowEpoch: history[history.length - 1]!.atEpoch,
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 18,
        minAbsoluteTrendMoveBps: 6,
        trendVolatilityThresholdMultiplier: 3,
        minVolatilityBps: 2,
        roundTripFeeBps: 16
      }
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.moveThresholdBps).toBeLessThan(18);
      expect(result.side).toBe("sell");
    }
  });

  it("allows a quiet directional regime as continuation when move and efficiency are strong enough", () => {
    const history = makeSeries([100, 99.95, 99.9, 99.86, 99.82, 99.8, 99.81, 99.83, 99.85]);
    const result = evaluateSignalOpportunity({
      history,
      market: { ...market, last: 99.85 },
      preferredSide: "auto",
      nowEpoch: history[history.length - 1]!.atEpoch,
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 10,
        minVolatilityBps: 3,
        roundTripFeeBps: 8,
        quietRegimeTrendEfficiencyMin: 5,
        quietRegimeMoveThresholdMultiplier: 1
      }
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.side).toBe("sell");
      expect(result.snapshot.regime).toBe("quiet_trend");
      expect(result.snapshot.strategyFamily).toBe("trend_follow");
      expect(result.recommendedEntryOffsetBps).toBeGreaterThan(0);
    }
  });

  it("blocks quiet-trend continuation when the short move violently opposes the trend", () => {
    const history = makeSeries([100, 100.01, 100.03, 100.05, 100.07, 100.12, 100.11, 100.09, 100.08]);
    const result = evaluateSignalOpportunity({
      history,
      market: { ...market, last: 100.04 },
      preferredSide: "auto",
      nowEpoch: history[history.length - 1]!.atEpoch,
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 8,
        minVolatilityBps: 3,
        roundTripFeeBps: 8,
        quietRegimeTrendEfficiencyMin: 3,
        quietRegimeMoveThresholdMultiplier: 0.5
      }
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.snapshot) {
      expect(result.snapshot.regime).toBe("quiet_trend");
    }
  });

  it("blocks low-volatility dead zones when move is too small", () => {
    const history = makeSeries([100, 99.99, 99.98, 99.98, 99.97, 99.98, 99.98, 99.99, 99.99]);
    const result = evaluateSignalOpportunity({
      history,
      market: { ...market, last: 99.99 },
      preferredSide: "auto",
      nowEpoch: history[history.length - 1]!.atEpoch,
      config: {
        longLookbackSec: 180,
        shortLookbackSec: 45,
        minTrendMoveBps: 10,
        minVolatilityBps: 3,
        roundTripFeeBps: 8,
        quietRegimeTrendEfficiencyMin: 5,
        quietRegimeMoveThresholdMultiplier: 1
      }
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.snapshot) {
      expect(result.snapshot.regime).toBe("dead_zone");
    }
  });
});
