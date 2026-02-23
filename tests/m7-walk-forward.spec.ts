import { describe, expect, it } from "vitest";
import type { ClosedTradeFeatureRecord } from "@tourab/shared";
import { buildWalkForwardReport } from "../apps/dashboard/src/learning/m7-research-pipeline.js";

function makeRecord(index: number, pnl: number, exitReason: string): ClosedTradeFeatureRecord {
  const base = new Date("2026-02-01T00:00:00.000Z").getTime();
  const closedAt = new Date(base + index * 60_000).toISOString();
  return {
    tradeId: `t-${index}`,
    symbol: "BTC-USDT",
    entrySide: "buy",
    exitReason,
    status: "closed",
    closedAt,
    holdSec: 120,
    entryFilledQty: 0.001,
    exitFilledQty: 0.001,
    entryAvgPrice: 50000,
    exitAvgPrice: 50010,
    feeUsd: 0.01,
    realizedPnlUsd: pnl,
    realizedPnlBps: 2,
    featureSchemaVersion: "m7-closed-trade-v1",
    policyVersion: "m6-policy-v1",
    strategyVersion: "champion-v1",
    modelVersion: "m7-baseline-v1",
    extractedAt: closedAt
  };
}

describe("m7 walk-forward report", () => {
  it("passes when configured pass-rate threshold is met", () => {
    const records = [
      makeRecord(1, 0.1, "time_stop"),
      makeRecord(2, 0.1, "time_stop"),
      makeRecord(3, 0.1, "time_stop"),
      makeRecord(4, 0.1, "time_stop"),
      makeRecord(5, 0.1, "time_stop"),
      makeRecord(6, 0.1, "time_stop"),
      makeRecord(7, 0.1, "time_stop"),
      makeRecord(8, 0.1, "time_stop")
    ];
    const report = buildWalkForwardReport({
      generatedAt: "2026-02-23T00:00:00.000Z",
      candidateModelVersion: "m7-offline-2026-02-23-abcdef01",
      datasetId: "m7ds_x",
      records,
      windowCount: 4,
      minTradesPerWindow: 2,
      minWindows: 3,
      minPassRatePct: 75,
      minExpectancyUsd: 0,
      maxControlViolationRatePct: 35
    });
    expect(report.summary.windowsEvaluated).toBe(4);
    expect(report.summary.windowsPassed).toBe(4);
    expect(report.summary.pass).toBe(true);
  });

  it("fails when most windows breach expectancy/control thresholds", () => {
    const records = [
      makeRecord(1, -0.2, "manual"),
      makeRecord(2, -0.1, "manual"),
      makeRecord(3, -0.1, "manual"),
      makeRecord(4, 0.01, "time_stop"),
      makeRecord(5, -0.1, "manual"),
      makeRecord(6, -0.1, "manual"),
      makeRecord(7, -0.1, "manual"),
      makeRecord(8, -0.1, "manual")
    ];
    const report = buildWalkForwardReport({
      generatedAt: "2026-02-23T00:00:00.000Z",
      candidateModelVersion: "m7-offline-2026-02-23-abcdef01",
      datasetId: "m7ds_x",
      records,
      windowCount: 4,
      minTradesPerWindow: 2,
      minWindows: 3,
      minPassRatePct: 75,
      minExpectancyUsd: 0,
      maxControlViolationRatePct: 10
    });
    expect(report.summary.windowsEvaluated).toBe(4);
    expect(report.summary.windowsPassed).toBeLessThan(3);
    expect(report.summary.pass).toBe(false);
  });
});
