import { describe, expect, it } from "vitest";
import type { ClosedTradeFeatureRecord } from "@tourab/shared";
import {
  buildDatasetSnapshot,
  buildOfflineTrainingRun,
  parseClosedTradeFeaturesNdjson
} from "../apps/dashboard/src/learning/m7-research-pipeline.js";

const SAMPLE: ClosedTradeFeatureRecord[] = [
  {
    tradeId: "t1",
    symbol: "BTC-USDT",
    entrySide: "buy",
    exitReason: "take_profit",
    status: "closed",
    closedAt: "2026-02-20T00:10:00.000Z",
    holdSec: 120,
    entryFilledQty: 0.001,
    exitFilledQty: 0.001,
    entryAvgPrice: 50000,
    exitAvgPrice: 50100,
    feeUsd: 0.05,
    realizedPnlUsd: 0.05,
    realizedPnlBps: 10,
    featureSchemaVersion: "m7-closed-trade-v1",
    policyVersion: "m6-policy-v1",
    strategyVersion: "champion-v1",
    modelVersion: "m7-baseline-v1",
    extractedAt: "2026-02-20T00:12:00.000Z"
  },
  {
    tradeId: "t2",
    symbol: "ETH-USDT",
    entrySide: "sell",
    exitReason: "stop_loss",
    status: "closed",
    closedAt: "2026-02-20T00:20:00.000Z",
    holdSec: 300,
    entryFilledQty: 0.01,
    exitFilledQty: 0.01,
    entryAvgPrice: 3000,
    exitAvgPrice: 3008,
    feeUsd: 0.08,
    realizedPnlUsd: -0.16,
    realizedPnlBps: -26.6667,
    featureSchemaVersion: "m7-closed-trade-v1",
    policyVersion: "m6-policy-v1",
    strategyVersion: "champion-v1",
    modelVersion: "m7-baseline-v1",
    extractedAt: "2026-02-20T00:21:00.000Z"
  }
];

describe("m7 research pipeline helpers", () => {
  it("builds stable dataset manifests and ndjson", () => {
    const createdAt = "2026-02-20T01:00:00.000Z";
    const one = buildDatasetSnapshot({
      features: SAMPLE,
      createdAt,
      sourceEndpoint: "http://localhost:7071/learning/features",
      governanceModelVersion: "m7-baseline-v1",
      limit: 2000,
      lookbackDays: 30,
      artifactFile: "closed-trade-features.ndjson"
    });
    const two = buildDatasetSnapshot({
      features: SAMPLE,
      createdAt,
      sourceEndpoint: "http://localhost:7071/learning/features",
      governanceModelVersion: "m7-baseline-v1",
      limit: 2000,
      lookbackDays: 30,
      artifactFile: "closed-trade-features.ndjson"
    });
    expect(one.manifest.datasetId).toBe(two.manifest.datasetId);
    expect(one.manifest.recordCount).toBe(2);
    expect(one.manifest.distinct.symbols).toEqual(["BTC-USDT", "ETH-USDT"]);
    expect(one.manifest.artifact.sha256).toBe(two.manifest.artifact.sha256);
    const parsed = parseClosedTradeFeaturesNdjson(one.ndjson);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.tradeId).toBe("t1");
  });

  it("builds governed offline training report", () => {
    const snapshot = buildDatasetSnapshot({
      features: SAMPLE,
      createdAt: "2026-02-20T01:00:00.000Z",
      sourceEndpoint: "http://localhost:7071/learning/features",
      governanceModelVersion: "m7-baseline-v1",
      limit: 2000,
      lookbackDays: 30,
      artifactFile: "closed-trade-features.ndjson"
    });
    const manifestRaw = JSON.stringify(snapshot.manifest, null, 2);
    const run = buildOfflineTrainingRun({
      startedAt: "2026-02-20T01:05:00.000Z",
      completedAt: "2026-02-20T01:06:00.000Z",
      manifest: snapshot.manifest,
      manifestRawJson: manifestRaw,
      records: SAMPLE
    });
    expect(run.dataset.recordCount).toBe(2);
    expect(run.metrics.totalTrades).toBe(2);
    expect(run.metrics.winRatePct).toBe(50);
    expect(run.candidateModelVersion.startsWith("m7-offline-2026-02-20-")).toBe(true);
    expect(run.governance.deployAction).toBe("blocked_until_validation_and_approval");
  });
});
