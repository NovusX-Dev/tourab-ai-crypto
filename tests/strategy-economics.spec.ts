import { describe, expect, it } from "vitest";
import type { ClosedTradeFeatureRecord } from "@tourab/shared";
import { buildStrategyEconomicsReport } from "../apps/dashboard/src/learning/strategy-economics.js";

function makeRecord(index: number, input: Partial<ClosedTradeFeatureRecord> = {}): ClosedTradeFeatureRecord {
  return {
    tradeId: `t-${index}`,
    symbol: input.symbol ?? "BTC-USDT",
    entrySide: input.entrySide ?? "buy",
    exitReason: input.exitReason ?? "time_stop",
    status: "closed",
    closedAt: input.closedAt ?? new Date(Date.UTC(2026, 2, 24, 0, index, 0)).toISOString(),
    holdSec: input.holdSec ?? 300,
    entryFilledQty: input.entryFilledQty ?? 0.00007,
    exitFilledQty: input.exitFilledQty ?? 0.00007,
    entryAvgPrice: input.entryAvgPrice ?? 70000,
    exitAvgPrice: input.exitAvgPrice ?? 70010,
    feeUsd: input.feeUsd ?? 0.008,
    realizedPnlUsd: input.realizedPnlUsd ?? -0.002,
    realizedPnlBps: input.realizedPnlBps ?? -3,
    featureSchemaVersion: input.featureSchemaVersion ?? "m7-closed-trade-v2",
    policyVersion: input.policyVersion ?? "m6-policy-v1",
    strategyVersion: input.strategyVersion ?? "champion-v1",
    modelVersion: input.modelVersion ?? "m7-baseline-v1",
    playbookId: input.playbookId,
    entryStyle: input.entryStyle,
    thesisConfidenceScore: input.thesisConfidenceScore,
    tradeabilityScore: input.tradeabilityScore,
    requestedQty: input.requestedQty ?? 0.00007,
    requestedNotionalUsd: input.requestedNotionalUsd ?? 4.9,
    approvalMode: input.approvalMode ?? "policy_auto",
    stopPrice: input.stopPrice ?? 69930,
    takeProfitPrice: input.takeProfitPrice ?? 70035,
    maxHoldSecConfigured: input.maxHoldSecConfigured ?? 300,
    entryOffsetBps: input.entryOffsetBps ?? -250,
    stopDistanceBps: input.stopDistanceBps ?? 40,
    takeProfitRMultiple: input.takeProfitRMultiple ?? 0.5,
    marketRegime: input.marketRegime,
    riskDistanceBps: input.riskDistanceBps ?? 10,
    targetDistanceBps: input.targetDistanceBps ?? 5,
    feeBps: input.feeBps ?? 16,
    grossPnlUsd: input.grossPnlUsd ?? 0.006,
    grossPnlBps: input.grossPnlBps ?? 12,
    extractedAt: input.extractedAt ?? new Date(Date.UTC(2026, 2, 24, 1, index, 0)).toISOString()
  };
}

describe("strategy economics report", () => {
  it("detects fee-dominated profiles when gross is positive and net is negative", () => {
    const records = [
      makeRecord(1, { realizedPnlUsd: -0.002, feeUsd: 0.008, exitReason: "take_profit", holdSec: 240 }),
      makeRecord(2, { realizedPnlUsd: -0.001, feeUsd: 0.008, exitReason: "take_profit", holdSec: 260 })
    ];
    const report = buildStrategyEconomicsReport({
      generatedAt: new Date().toISOString(),
      records
    });
    expect(report.overall.grossExpectancyUsd).toBeGreaterThan(0);
    expect(report.overall.netExpectancyUsd).toBeLessThan(0);
    expect(report.findings.some((item) => item.code === "fee_dominated")).toBe(true);
  });

  it("segments by symbol-side and exit reason", () => {
    const records = [
      makeRecord(1, {
        symbol: "BTC-USDT",
        entrySide: "buy",
        exitReason: "time_stop",
        realizedPnlUsd: -0.01,
        marketRegime: "trend_up",
        strategyVersion: "btc-trend-pullback-v2",
        playbookId: "btc_continuation_pullback",
        entryStyle: "passive_pullback"
      }),
      makeRecord(2, {
        symbol: "BTC-USDT",
        entrySide: "sell",
        exitReason: "take_profit",
        realizedPnlUsd: 0.02,
        marketRegime: "trend_down",
        strategyVersion: "btc-trend-pullback-v2",
        playbookId: "btc_downside_continuation",
        entryStyle: "controlled_momentum"
      }),
      makeRecord(3, {
        symbol: "ETH-USDT",
        entrySide: "buy",
        exitReason: "stop_loss",
        realizedPnlUsd: -0.03,
        marketRegime: "trend_up",
        strategyVersion: "eth-beta-confirm-v1",
        playbookId: "eth_beta_confirmation",
        entryStyle: "passive_join"
      })
    ];
    const report = buildStrategyEconomicsReport({
      generatedAt: new Date().toISOString(),
      records
    });
    expect(report.bySymbolSide.some((item) => item.key === "BTC-USDT|sell")).toBe(true);
    expect(
      report.bySymbolSideRegimeStrategyVersion.some(
        (item) => item.key === "BTC-USDT|buy|trend_up|btc-trend-pullback-v2"
      )
    ).toBe(true);
    expect(report.byPlaybook.some((item) => item.key === "btc_continuation_pullback")).toBe(true);
    expect(report.byPlaybookRegime.some((item) => item.key === "eth_beta_confirmation|trend_up")).toBe(true);
    expect(report.byEntryStyle.some((item) => item.key === "controlled_momentum")).toBe(true);
    expect(report.byExitReason.some((item) => item.key === "take_profit")).toBe(true);
    expect(report.bySymbol.some((item) => item.key === "ETH-USDT")).toBe(true);
  });

  it("segments by richer entry-context cohorts", () => {
    const records = [
      makeRecord(1, {
        approvalMode: "policy_auto",
        requestedNotionalUsd: 4.95,
        entryOffsetBps: -250,
        stopDistanceBps: 40,
        takeProfitRMultiple: 0.5,
        maxHoldSecConfigured: 300,
        feeBps: 16
      }),
      makeRecord(2, {
        approvalMode: "manual",
        requestedNotionalUsd: 12,
        entryOffsetBps: 25,
        stopDistanceBps: 120,
        takeProfitRMultiple: 1.5,
        maxHoldSecConfigured: 1800,
        feeBps: 8
      })
    ];
    const report = buildStrategyEconomicsReport({
      generatedAt: new Date().toISOString(),
      records
    });
    expect(report.byApprovalMode.some((item) => item.key === "policy_auto")).toBe(true);
    expect(report.byRequestedNotionalBucket.some((item) => item.key === "<=5usd")).toBe(true);
    expect(report.byEntryOffsetBucket.some((item) => item.key === "<=-200bps")).toBe(true);
    expect(report.byStopDistanceBucket.some((item) => item.key === "<=60bps")).toBe(true);
    expect(report.byTakeProfitMultipleBucket.some((item) => item.key === "<=0.5R")).toBe(true);
    expect(report.byConfiguredMaxHoldBucket.some((item) => item.key === "<=5m")).toBe(true);
    expect(report.byFeeBucket.some((item) => item.key === "<=20bps")).toBe(true);
  });
});
