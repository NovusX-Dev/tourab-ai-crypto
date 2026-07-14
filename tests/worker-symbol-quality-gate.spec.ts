import { describe, expect, it } from "vitest";
import type { ClosedTradeFeatureRecord } from "@tourab/shared";
import { evaluateWorkerSymbolQualityGate, evaluateWorkerTradeSideGate } from "../apps/dashboard/src/mission-control-server.js";

function makeFeature(index: number, symbol: string, pnl: number): ClosedTradeFeatureRecord {
  const closedAt = new Date(Date.UTC(2026, 1, 20, 0, index, 0, 0)).toISOString();
  return {
    tradeId: `t-${symbol}-${index}`,
    symbol,
    entrySide: "buy",
    exitReason: "time_stop",
    status: "closed",
    closedAt,
    holdSec: 120,
    entryFilledQty: 0.1,
    exitFilledQty: 0.1,
    entryAvgPrice: 100,
    exitAvgPrice: 99,
    feeUsd: 0.01,
    realizedPnlUsd: pnl,
    realizedPnlBps: -10,
    featureSchemaVersion: "m7-closed-trade-v1",
    policyVersion: "m6-policy-v1",
    strategyVersion: "champion-v1",
    modelVersion: "m7-baseline-v1",
    extractedAt: closedAt
  };
}

describe("worker symbol quality gate", () => {
  it("blocks SOL when expectancy is below configured floor", () => {
    const features = Array.from({ length: 25 }, (_, index) => makeFeature(index, "SOL-USDT", -0.02));
    const result = evaluateWorkerSymbolQualityGate({
      symbol: "SOL-USDT",
      nowIso: "2026-02-23T08:00:00.000Z",
      features,
      config: {
        enabled: true,
        lookbackTrades: 120,
        minTrades: 20,
        defaultRule: {
          minExpectancyUsd: -0.01,
          maxConsecutiveLosses: 12,
          cooldownMinutes: 120
        },
        solRule: {
          minExpectancyUsd: 0,
          maxConsecutiveLosses: 5,
          cooldownMinutes: 360
        }
      }
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("expectancy");
  });

  it("allows symbols with insufficient history", () => {
    const features = [makeFeature(1, "BTC-USDT", -0.1), makeFeature(2, "BTC-USDT", 0.05)];
    const result = evaluateWorkerSymbolQualityGate({
      symbol: "BTC-USDT",
      nowIso: "2026-02-23T08:00:00.000Z",
      features,
      config: {
        enabled: true,
        lookbackTrades: 120,
        minTrades: 20,
        defaultRule: {
          minExpectancyUsd: -0.01,
          maxConsecutiveLosses: 12,
          cooldownMinutes: 120
        },
        solRule: {
          minExpectancyUsd: 0,
          maxConsecutiveLosses: 5,
          cooldownMinutes: 360
        }
      }
    });
    expect(result.eligible).toBe(true);
  });

  it("fails closed for SOL when configured and evidence is insufficient", () => {
    const features = [makeFeature(1, "SOL-USDT", -0.02), makeFeature(2, "SOL-USDT", -0.01)];
    const result = evaluateWorkerSymbolQualityGate({
      symbol: "SOL-USDT",
      nowIso: "2026-02-23T08:00:00.000Z",
      features,
      config: {
        enabled: true,
        lookbackTrades: 120,
        minTrades: 20,
        defaultRule: {
          minExpectancyUsd: -0.01,
          maxConsecutiveLosses: 12,
          cooldownMinutes: 120
        },
        solRule: {
          minExpectancyUsd: 0,
          maxConsecutiveLosses: 5,
          cooldownMinutes: 360,
          minTrades: 20,
          failClosedOnInsufficientTrades: true
        }
      }
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("fail-closed");
  });

  it("blocks a symbol-side pair when recent side expectancy is negative", () => {
    const features = Array.from({ length: 10 }, (_, index) => makeFeature(index, "BTC-USDT", -0.01));
    const result = evaluateWorkerTradeSideGate({
      symbol: "BTC-USDT",
      side: "buy",
      features,
      config: {
        enabled: true,
        lookbackTrades: 30,
        minTrades: 8,
        minExpectancyUsd: 0,
        maxTimeStopRatePct: 85
      }
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("side expectancy");
  });

  it("blocks a symbol-side pair when time-stop dominates and expectancy is non-positive", () => {
    const features = Array.from({ length: 10 }, (_, index) => makeFeature(index, "BTC-USDT", 0));
    const result = evaluateWorkerTradeSideGate({
      symbol: "BTC-USDT",
      side: "buy",
      features,
      config: {
        enabled: true,
        lookbackTrades: 30,
        minTrades: 8,
        minExpectancyUsd: -0.01,
        maxTimeStopRatePct: 50
      }
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("time_stop rate");
  });
});
