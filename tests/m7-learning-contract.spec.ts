import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { LearningFeatureSnapshot, LearningGovernanceState } from "@tourab/shared";
import { SqliteOpsStore, type ManagedTradeRecord } from "../apps/dashboard/src/mission-control/sqlite-ops-store.js";
import { startMissionControlServer } from "../apps/dashboard/src/mission-control-server.js";

describe("m7 learning contracts", () => {
  it("backfills closed-trade features from managed trades on startup", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-m7-learning-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const store = await SqliteOpsStore.open(opsStorePath);
    const closedAt = new Date();
    const createdAt = new Date(closedAt.getTime() - 2 * 60_000);
    const managed: ManagedTradeRecord = {
      tradeId: "m7-t-1",
      status: "closed",
      symbol: "BTC-USDT",
      entrySide: "buy",
      entryOrdId: "entry-1",
      entryClOrdId: "entry-cl-1",
      requestedQty: 0.001,
      entryFilledQty: 0.001,
      entryAvgPrice: 50_000,
      exitOrdId: "exit-1",
      exitClOrdId: "exit-cl-1",
      exitFilledQty: 0.001,
      exitAvgPrice: 50_250,
      remainingQty: 0,
      exitReason: "take_profit",
      stopPrice: 49_000,
      takeProfitPrice: 50_200,
      maxHoldSec: 600,
      createdAt: createdAt.toISOString(),
      updatedAt: closedAt.toISOString(),
      closedAt: closedAt.toISOString(),
      feeUsd: 0.08,
      realizedPnlUsd: 0.17,
      exitSubmittedAt: new Date(createdAt.getTime() + 60_000).toISOString(),
      exitRepriceCount: 0,
      forcedFlattenEscalated: false
    };
    store.upsertManagedTrade(managed);
    store.close();

    const handle = await startMissionControlServer({ port: 0, eventStorePath, opsStorePath, logRequests: false });
    try {
      const res = await fetch(`${handle.baseHttpUrl}/learning/features?limit=5`);
      expect(res.ok).toBe(true);
      const payload = (await res.json()) as LearningFeatureSnapshot;
      expect(payload.items.length).toBeGreaterThan(0);
      const item = payload.items.find((entry) => entry.tradeId === "m7-t-1");
      expect(item).toBeDefined();
      expect(item?.status).toBe("closed");
      expect(item?.featureSchemaVersion).toBe("m7-closed-trade-v1");
      expect(item?.policyVersion).toBe("m6-policy-v1");
      expect(item?.strategyVersion).toBe("champion-v1");
      expect(item?.modelVersion).toBe("m7-baseline-v1");
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("supports learning-governance rollback hook and audit evidence", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-m7-learning-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const store = await SqliteOpsStore.open(opsStorePath);
    const seededGovernance: LearningGovernanceState = {
      enabled: true,
      mode: "research_only",
      activeModelVersion: "m7-candidate-v2",
      previousStableModelVersion: "m7-stable-v1",
      updatedAt: "2026-02-20T01:00:00.000Z"
    };
    store.saveRuntimeState("learning_governance_state", seededGovernance);
    store.close();

    const handle = await startMissionControlServer({ port: 0, eventStorePath, opsStorePath, logRequests: false });
    try {
      const rollbackRes = await fetch(`${handle.baseHttpUrl}/learning/governance/rollback`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "m7-tester"
        },
        body: JSON.stringify({ reason: "candidate degraded in validation" })
      });
      expect(rollbackRes.ok).toBe(true);
      const rollbackPayload = (await rollbackRes.json()) as { changed: boolean; governance: LearningGovernanceState };
      expect(rollbackPayload.changed).toBe(true);
      expect(rollbackPayload.governance.activeModelVersion).toBe("m7-stable-v1");
      expect(rollbackPayload.governance.rollbackCandidateVersion).toBe("m7-candidate-v2");
      expect(rollbackPayload.governance.lastRollbackReason).toContain("degraded");

      const snapshotRes = await fetch(`${handle.baseHttpUrl}/snapshot`);
      expect(snapshotRes.ok).toBe(true);
      const snapshot = (await snapshotRes.json()) as { audit: Array<{ title: string; detail: string }> };
      expect(snapshot.audit.some((item) => item.title === "Learning model rollback" && item.detail.includes("m7-tester"))).toBe(
        true
      );
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
