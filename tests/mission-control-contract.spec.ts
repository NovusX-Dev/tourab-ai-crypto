import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import WebSocket, { type RawData } from "ws";
import type { WsMessage } from "@tourab/shared";
import { SqliteOpsStore, type ManagedTradeRecord } from "../apps/dashboard/src/mission-control/sqlite-ops-store.js";
import { startMissionControlServer } from "../apps/dashboard/src/mission-control-server.js";

interface EventQueryResponse {
  items: Array<{ id: string }>;
  nextCursor: string | null;
}

interface SnapshotResponse {
  audit: Array<{ title: string; detail: string }>;
  state: { state: string };
  alerts: Array<{ code: string; status: string }>;
  incidents: Array<{ id: string; status: string; taxonomy: string; runbookRef: string }>;
  portfolio: { totalEq: string; balances: Array<{ ccy: string }>; lastUpdatedAt: string; lastError?: string };
  openOrders: { orders: Array<{ ordId: string; instId: string }>; lastUpdatedAt: string; lastError?: string };
}

interface EntryAutonomyConfigResponse {
  config: {
    approvalMode: "manual" | "policy_auto";
    policyVersion: string;
  };
  status: {
    approvalMode: "manual" | "policy_auto";
    fallbackActive: boolean;
    lastFallbackReason?: string;
    lastFallbackAt?: string;
  };
}

async function postControl(baseHttpUrl: string, path: string): Promise<void> {
  const res = await fetch(`${baseHttpUrl}${path}`, {
    method: "POST",
    headers: {
      "x-tourab-role": "operator"
    }
  });
  expect(res.ok).toBe(true);
}

async function postControlRaw(
  baseHttpUrl: string,
  path: string,
  headers?: Record<string, string>
): Promise<Response> {
  return await fetch(`${baseHttpUrl}${path}`, {
    method: "POST",
    headers: {
      "x-tourab-role": "operator",
      ...(headers ?? {})
    }
  });
}

function createWsMessageBuffer(ws: WebSocket): {
  waitForKind: (kind: WsMessage["kind"], timeoutMs?: number) => Promise<WsMessage>;
  dispose: () => void;
} {
  const queue: WsMessage[] = [];
  const onMessage = (payload: RawData) => {
    queue.push(JSON.parse(String(payload)) as WsMessage);
  };
  ws.on("message", onMessage);

  async function waitForKind(kind: WsMessage["kind"], timeoutMs = 4000): Promise<WsMessage> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const index = queue.findIndex((item) => item.kind === kind);
      if (index >= 0) {
        const found = queue[index] as WsMessage;
        queue.splice(index, 1);
        return found;
      }
      await delay(20);
    }
    throw new Error(`Timed out waiting for websocket kind ${kind}`);
  }

  return {
    waitForKind,
    dispose: () => {
      ws.off("message", onMessage);
    }
  };
}

async function waitForWsKind(
  buffer: { waitForKind: (kind: WsMessage["kind"], timeoutMs?: number) => Promise<WsMessage> },
  kind: WsMessage["kind"],
  timeoutMs = 4000
): Promise<WsMessage> {
  return await buffer.waitForKind(kind, timeoutMs);
}

describe("mission-control contract", () => {
  it("supports stable cursor pagination for /events query", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const handle = await startMissionControlServer({ port: 0, eventStorePath, logRequests: false });

    try {
      await postControl(handle.baseHttpUrl, "/start");
      await postControl(handle.baseHttpUrl, "/pause");
      await postControl(handle.baseHttpUrl, "/resume");

      const firstRes = await fetch(`${handle.baseHttpUrl}/events?limit=2`);
      expect(firstRes.ok).toBe(true);
      const firstPage = (await firstRes.json()) as EventQueryResponse;
      expect(firstPage.items).toHaveLength(2);
      expect(firstPage.nextCursor).toBe(firstPage.items[1]?.id);

      const secondRes = await fetch(`${handle.baseHttpUrl}/events?limit=2&cursor=${firstPage.nextCursor}`);
      expect(secondRes.ok).toBe(true);
      const secondPage = (await secondRes.json()) as EventQueryResponse;

      const firstIds = new Set(firstPage.items.map((item) => item.id));
      expect(secondPage.items.some((item) => firstIds.has(item.id))).toBe(false);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("sends WS replay snapshot then streams live events", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const handle = await startMissionControlServer({ port: 0, eventStorePath, logRequests: false });

    try {
      await postControl(handle.baseHttpUrl, "/start");
      await postControl(handle.baseHttpUrl, "/pause");
      await postControl(handle.baseHttpUrl, "/resume");

      const ws = new WebSocket(`${handle.baseWsUrl}/events?replay=3`);
      const buffer = createWsMessageBuffer(ws);
      await new Promise<void>((resolve, reject) => {
        ws.once("open", () => resolve());
        ws.once("error", (error) => reject(error));
      });

      const firstMessage = await waitForWsKind(buffer, "snapshot");
      expect(firstMessage.kind).toBe("snapshot");
      if (firstMessage.kind !== "snapshot") {
        throw new Error("Expected snapshot message");
      }
      expect(firstMessage.data.events.length).toBeGreaterThan(0);
      expect(firstMessage.data.events.length).toBeLessThanOrEqual(3);

      await delay(50);
      await postControl(handle.baseHttpUrl, "/pause");
      const secondMessage = await waitForWsKind(buffer, "event");
      expect(secondMessage.kind).toBe("event");

      buffer.dispose();
      ws.close();
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("requires approval for critical controls and allows execution after approval", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const handle = await startMissionControlServer({ port: 0, eventStorePath, logRequests: false });

    try {
      await postControl(handle.baseHttpUrl, "/start");

      const stopDenied = await postControlRaw(handle.baseHttpUrl, "/stop");
      expect(stopDenied.status).toBe(409);
      const deniedPayload = (await stopDenied.json()) as {
        code: string;
        details?: { approvalId?: string };
      };
      expect(deniedPayload.code).toBe("APPROVAL_REQUIRED");
      const approvalId = deniedPayload.details?.approvalId;
      expect(typeof approvalId).toBe("string");

      const approveRes = await fetch(`${handle.baseHttpUrl}/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "contract-tester"
        }
      });
      expect(approveRes.ok).toBe(true);

      const stopApproved = await postControlRaw(handle.baseHttpUrl, "/stop", {
        "x-approval-id": approvalId as string
      });
      expect(stopApproved.ok).toBe(true);
      const approvedPayload = (await stopApproved.json()) as { ok: boolean; state: string };
      expect(approvedPayload.ok).toBe(true);
      expect(approvedPayload.state).toBe("stopped");

      const snapshotRes = await fetch(`${handle.baseHttpUrl}/snapshot`);
      const snapshot = (await snapshotRes.json()) as SnapshotResponse;
      expect(snapshot.audit.some((item) => item.title === "Approval created")).toBe(true);
      expect(snapshot.audit.some((item) => item.title === "Approval approved" && item.detail.includes("contract-tester"))).toBe(true);
      expect(typeof snapshot.portfolio.totalEq).toBe("string");
      expect(Array.isArray(snapshot.portfolio.balances)).toBe(true);
      expect(Array.isArray(snapshot.openOrders.orders)).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("enforces dual distinct approvals for emergency stop", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const handle = await startMissionControlServer({ port: 0, eventStorePath, logRequests: false });

    try {
      await postControl(handle.baseHttpUrl, "/start");

      const denied = await postControlRaw(handle.baseHttpUrl, "/emergency-stop");
      expect(denied.status).toBe(409);
      const deniedPayload = (await denied.json()) as {
        code: string;
        details?: { approvalId?: string };
      };
      expect(deniedPayload.code).toBe("APPROVAL_REQUIRED");
      const approvalId = deniedPayload.details?.approvalId as string;

      const approveOne = await fetch(`${handle.baseHttpUrl}/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "alice"
        }
      });
      expect(approveOne.ok).toBe(true);

      const notEnough = await postControlRaw(handle.baseHttpUrl, "/emergency-stop", {
        "x-approval-id": approvalId,
        "x-user-id": "alice"
      });
      expect(notEnough.status).toBe(409);

      const approveTwo = await fetch(`${handle.baseHttpUrl}/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "bob"
        }
      });
      expect(approveTwo.ok).toBe(true);

      const execute = await postControlRaw(handle.baseHttpUrl, "/emergency-stop", {
        "x-approval-id": approvalId,
        "x-user-id": "bob"
      });
      expect(execute.ok).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects execution with expired approval", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const handle = await startMissionControlServer({
      port: 0,
      eventStorePath,
      logRequests: false,
      approvalTtlMs: 40
    });

    try {
      await postControl(handle.baseHttpUrl, "/start");
      const denied = await postControlRaw(handle.baseHttpUrl, "/stop");
      const payload = (await denied.json()) as { details?: { approvalId?: string } };
      const approvalId = payload.details?.approvalId as string;

      await delay(60);
      const execute = await postControlRaw(handle.baseHttpUrl, "/stop", {
        "x-approval-id": approvalId
      });
      expect(execute.status).toBe(409);
      const executePayload = (await execute.json()) as { code: string };
      expect(executePayload.code).toBe("APPROVAL_EXPIRED");

      const snapshotRes = await fetch(`${handle.baseHttpUrl}/snapshot`);
      const snapshot = (await snapshotRes.json()) as SnapshotResponse;
      expect(snapshot.audit.some((item) => item.title === "Approval expired")).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects execution with rejected approval", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const handle = await startMissionControlServer({ port: 0, eventStorePath, logRequests: false });

    try {
      await postControl(handle.baseHttpUrl, "/start");
      const denied = await postControlRaw(handle.baseHttpUrl, "/stop");
      const payload = (await denied.json()) as { details?: { approvalId?: string } };
      const approvalId = payload.details?.approvalId as string;

      const reject = await fetch(`${handle.baseHttpUrl}/approvals/${approvalId}/reject`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "risk-reviewer",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: "Risk committee denied" })
      });
      expect(reject.ok).toBe(true);

      const execute = await postControlRaw(handle.baseHttpUrl, "/stop", {
        "x-approval-id": approvalId
      });
      expect(execute.status).toBe(409);
      const executePayload = (await execute.json()) as { code: string };
      expect(executePayload.code).toBe("APPROVAL_REJECTED");

      const snapshotRes = await fetch(`${handle.baseHttpUrl}/snapshot`);
      const snapshot = (await snapshotRes.json()) as SnapshotResponse;
      expect(snapshot.audit.some((item) => item.title === "Approval rejected" && item.detail.includes("risk-reviewer"))).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("emits audit entry on invalid state transition", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const handle = await startMissionControlServer({ port: 0, eventStorePath, logRequests: false });

    try {
      const invalidPause = await postControlRaw(handle.baseHttpUrl, "/pause", {
        "x-user-id": "state-tester"
      });
      expect(invalidPause.status).toBe(409);

      const snapshotRes = await fetch(`${handle.baseHttpUrl}/snapshot`);
      const snapshot = (await snapshotRes.json()) as SnapshotResponse;
      expect(snapshot.audit.some((item) => item.title === "Invalid state transition")).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("supports persistent alert workflow (open -> acknowledged -> resolved)", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const alertStorePath = join(tempDir, "alerts.jsonl");
    const handle = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      logRequests: false,
      approvalTtlMs: 20
    });

    try {
      await postControl(handle.baseHttpUrl, "/start");
      const denied = await postControlRaw(handle.baseHttpUrl, "/stop");
      const deniedPayload = (await denied.json()) as { details?: { approvalId?: string } };
      const approvalId = deniedPayload.details?.approvalId as string;
      await delay(30);

      const expired = await postControlRaw(handle.baseHttpUrl, "/stop", { "x-approval-id": approvalId });
      expect(expired.status).toBe(409);

      const alertsRes = await fetch(`${handle.baseHttpUrl}/alerts?status=open`);
      expect(alertsRes.ok).toBe(true);
      const alertsPayload = (await alertsRes.json()) as { items: Array<{ id: string; code: string }> };
      const approvalAlert = alertsPayload.items.find((item) => item.code === "APPROVAL_EXPIRED");
      expect(approvalAlert).toBeTruthy();

      const ackRes = await fetch(`${handle.baseHttpUrl}/alerts/${approvalAlert?.id}/ack`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        }
      });
      expect(ackRes.ok).toBe(true);

      const resolveRes = await fetch(`${handle.baseHttpUrl}/alerts/${approvalAlert?.id}/resolve`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        }
      });
      expect(resolveRes.ok).toBe(true);
    } finally {
      await handle.close();
    }

    const restarted = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      logRequests: false,
      approvalTtlMs: 20
    });
    try {
      const alertsRes = await fetch(`${restarted.baseHttpUrl}/alerts?status=resolved`);
      expect(alertsRes.ok).toBe(true);
      const alertsPayload = (await alertsRes.json()) as { items: Array<{ code: string; resolvedBy?: string }> };
      expect(alertsPayload.items.some((item) => item.code === "APPROVAL_EXPIRED")).toBe(true);
    } finally {
      await restarted.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("triggers drift circuit breaker and auto-pauses running bot", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const alertStorePath = join(tempDir, "alerts.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const handle = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });

    try {
      await postControl(handle.baseHttpUrl, "/start");

      const update = await fetch(`${handle.baseHttpUrl}/reconciliation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({ orders: "drift" })
      });
      expect(update.ok).toBe(true);
      const updateSecond = await fetch(`${handle.baseHttpUrl}/reconciliation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({ orders: "drift" })
      });
      expect(updateSecond.ok).toBe(true);

      const snapshotRes = await fetch(`${handle.baseHttpUrl}/snapshot`);
      const snapshot = (await snapshotRes.json()) as SnapshotResponse;
      expect(snapshot.state.state).toBe("paused");
      expect(snapshot.audit.some((item) => item.title === "Circuit breaker triggered")).toBe(true);
      expect(snapshot.alerts.some((item) => item.code === "RECONCILIATION_DRIFT_CIRCUIT")).toBe(true);
      expect(snapshot.incidents.some((item) => item.taxonomy === "reconciliation_drift")).toBe(true);

      const incident = snapshot.incidents.find((item) => item.taxonomy === "reconciliation_drift");
      const ackRes = await fetch(`${handle.baseHttpUrl}/incidents/${incident?.id}/ack`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        }
      });
      expect(ackRes.ok).toBe(true);
      const resolveRes = await fetch(`${handle.baseHttpUrl}/incidents/${incident?.id}/resolve`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        }
      });
      expect(resolveRes.ok).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("persists audit trail across restart in structured ops store", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const alertStorePath = join(tempDir, "alerts.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");

    const first = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      await postControl(first.baseHttpUrl, "/start");
      await postControl(first.baseHttpUrl, "/pause");
      await postControl(first.baseHttpUrl, "/resume");
    } finally {
      await first.close();
    }

    const second = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      const snapshotRes = await fetch(`${second.baseHttpUrl}/snapshot`);
      const snapshot = (await snapshotRes.json()) as SnapshotResponse;
      expect(snapshot.audit.length).toBeGreaterThan(0);
    } finally {
      await second.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("auto-starts worker on boot when persisted state is running", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const alertStorePath = join(tempDir, "alerts.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");

    const first = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      await postControl(first.baseHttpUrl, "/start");
    } finally {
      await first.close();
    }

    const second = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      const eventsRes = await fetch(`${second.baseHttpUrl}/events?limit=30`);
      expect(eventsRes.ok).toBe(true);
      const eventsPayload = (await eventsRes.json()) as { items: Array<{ message: string }> };
      expect(eventsPayload.items.some((item) => item.message.includes("Worker auto-started from persisted running state"))).toBe(true);
    } finally {
      await second.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("raises a stall alert when running worker produces no ProposalCreated events", async () => {
    const previousInterval = process.env.TOURAB_WORKER_INTERVAL_MS;
    const previousGap = process.env.TOURAB_WORKER_PROPOSAL_GAP_MS;
    const previousCheck = process.env.TOURAB_WORKER_STALL_CHECK_INTERVAL_MS;
    process.env.TOURAB_WORKER_INTERVAL_MS = "120000";
    process.env.TOURAB_WORKER_PROPOSAL_GAP_MS = "1500";
    process.env.TOURAB_WORKER_STALL_CHECK_INTERVAL_MS = "500";

    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const alertStorePath = join(tempDir, "alerts.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");

    const first = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      await postControl(first.baseHttpUrl, "/start");
    } finally {
      await first.close();
    }

    const second = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      await delay(2400);
      const alertsRes = await fetch(`${second.baseHttpUrl}/alerts?status=open`);
      expect(alertsRes.ok).toBe(true);
      const alertsPayload = (await alertsRes.json()) as { items: Array<{ code: string }> };
      expect(alertsPayload.items.some((item) => item.code === "WORKER_STALLED_NO_PROPOSAL")).toBe(true);
    } finally {
      await second.close();
      await rm(tempDir, { recursive: true, force: true });
      if (previousInterval === undefined) {
        delete process.env.TOURAB_WORKER_INTERVAL_MS;
      } else {
        process.env.TOURAB_WORKER_INTERVAL_MS = previousInterval;
      }
      if (previousGap === undefined) {
        delete process.env.TOURAB_WORKER_PROPOSAL_GAP_MS;
      } else {
        process.env.TOURAB_WORKER_PROPOSAL_GAP_MS = previousGap;
      }
      if (previousCheck === undefined) {
        delete process.env.TOURAB_WORKER_STALL_CHECK_INTERVAL_MS;
      } else {
        process.env.TOURAB_WORKER_STALL_CHECK_INTERVAL_MS = previousCheck;
      }
    }
  });

  it("updates and persists auto-exit config", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");

    const first = await startMissionControlServer({
      port: 0,
      eventStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      const updateRes = await fetch(`${first.baseHttpUrl}/auto-exit/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({
          enabled: true,
          maxHoldSec: 600,
          takeProfitRMultiple: 1.8,
          flattenTimeUtc: "23:45",
          exitOffsetBps: 7
        })
      });
      expect(updateRes.ok).toBe(true);
      const payload = (await updateRes.json()) as { config: { maxHoldSec: number; takeProfitRMultiple: number; flattenTimeUtc?: string } };
      expect(payload.config.maxHoldSec).toBe(600);
      expect(payload.config.takeProfitRMultiple).toBe(1.8);
      expect(payload.config.flattenTimeUtc).toBe("23:45");
    } finally {
      await first.close();
    }

    const second = await startMissionControlServer({
      port: 0,
      eventStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      const configRes = await fetch(`${second.baseHttpUrl}/auto-exit/config`);
      expect(configRes.ok).toBe(true);
      const payload = (await configRes.json()) as { config: { maxHoldSec: number; takeProfitRMultiple: number; flattenTimeUtc?: string } };
      expect(payload.config.maxHoldSec).toBe(600);
      expect(payload.config.takeProfitRMultiple).toBe(1.8);
      expect(payload.config.flattenTimeUtc).toBe("23:45");
    } finally {
      await second.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("exposes managed-trades endpoint", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const handle = await startMissionControlServer({ port: 0, eventStorePath, logRequests: false });
    try {
      const res = await fetch(`${handle.baseHttpUrl}/managed-trades`);
      expect(res.ok).toBe(true);
      const payload = (await res.json()) as { items: unknown[] };
      expect(Array.isArray(payload.items)).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("exposes milestone5 evidence summary from soak artifacts", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const evidenceDir = join(tempDir, "evidence");
    const soakDir = join(evidenceDir, "m5-soak-2026-02-17T00-00-00-000Z");
    await mkdir(soakDir, { recursive: true });
    await writeFile(
      join(soakDir, "report.json"),
      JSON.stringify({
        startedAt: "2026-02-17T00:00:00.000Z",
        endedAt: "2026-02-17T00:20:00.000Z",
        totals: {
          filledEntries: 10,
          deterministicClosed: 10,
          tradeErrors: 0
        },
        checks: {
          closureRatePct: 100,
          closureRatePass: true,
          closedTradeDataPass: true,
          reconciliationSloObservedPass: true
        }
      }),
      "utf-8"
    );
    const previousEvidenceDir = process.env.TOURAB_M5_EVIDENCE_DIR;
    process.env.TOURAB_M5_EVIDENCE_DIR = evidenceDir;
    const handle = await startMissionControlServer({ port: 0, eventStorePath, logRequests: false });
    try {
      const res = await fetch(`${handle.baseHttpUrl}/milestone5/evidence`);
      expect(res.ok).toBe(true);
      const payload = (await res.json()) as {
        policyVersion: string;
        qualifiedDays: number;
        days: Array<{ day: string; pass: boolean; source: string }>;
      };
      expect(payload.policyVersion).toBe("calendar-day-v1");
      expect(payload.qualifiedDays).toBeGreaterThanOrEqual(1);
      expect(payload.days.some((item) => item.day === "2026-02-17" && item.pass && item.source === "soak_report")).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
      if (previousEvidenceDir === undefined) {
        delete process.env.TOURAB_M5_EVIDENCE_DIR;
      } else {
        process.env.TOURAB_M5_EVIDENCE_DIR = previousEvidenceDir;
      }
    }
  });

  it("exposes learning evaluation summary with model/strategy buckets", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const store = await SqliteOpsStore.open(opsStorePath);
    const now = new Date();
    const createdAt = new Date(now.getTime() - 5 * 60_000).toISOString();
    const closedAt = new Date(now.getTime() - 60_000).toISOString();
    const managedTrade: ManagedTradeRecord = {
      tradeId: "m7-eval-1",
      status: "closed",
      symbol: "BTC-USDT",
      entrySide: "buy",
      entryOrdId: "entry-1",
      entryClOrdId: "entry-cl-1",
      requestedQty: 0.001,
      entryFilledQty: 0.001,
      entryAvgPrice: 50000,
      exitOrdId: "exit-1",
      exitClOrdId: "exit-cl-1",
      exitFilledQty: 0.001,
      exitAvgPrice: 50100,
      remainingQty: 0,
      exitReason: "take_profit",
      stopPrice: 49500,
      takeProfitPrice: 50100,
      maxHoldSec: 600,
      createdAt,
      updatedAt: closedAt,
      closedAt,
      feeUsd: 0.05,
      realizedPnlUsd: 0.05,
      exitRepriceCount: 0,
      forcedFlattenEscalated: false
    };
    store.upsertManagedTrade(managedTrade);
    store.close();
    const handle = await startMissionControlServer({ port: 0, eventStorePath, opsStorePath, logRequests: false });
    try {
      const res = await fetch(`${handle.baseHttpUrl}/learning/evaluation?lookbackDays=30`);
      expect(res.ok).toBe(true);
      const payload = (await res.json()) as {
        closedTrades: number;
        totals: { slippageProxyBps: number };
        byModelVersion: Array<{ version: string; trades: number }>;
        byStrategyVersion: Array<{ version: string; trades: number }>;
      };
      expect(payload.closedTrades).toBeGreaterThanOrEqual(1);
      expect(payload.totals.slippageProxyBps).toBeGreaterThanOrEqual(0);
      expect(payload.byModelVersion.some((item) => item.version === "m7-baseline-v1" && item.trades >= 1)).toBe(true);
      expect(payload.byStrategyVersion.some((item) => item.version === "champion-v1" && item.trades >= 1)).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("raises learning evaluation alert incidents when thresholds are breached", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const alertStorePath = join(tempDir, "alerts.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const store = await SqliteOpsStore.open(opsStorePath);
    const now = new Date();
    const createdAt = new Date(now.getTime() - 10 * 60_000).toISOString();
    const closedAt = new Date(now.getTime() - 2 * 60_000).toISOString();
    store.upsertManagedTrade({
      tradeId: "m7-alert-breach-1",
      status: "closed",
      symbol: "BTC-USDT",
      entrySide: "buy",
      entryOrdId: "entry-1",
      entryClOrdId: "entry-cl-1",
      requestedQty: 0.001,
      entryFilledQty: 0.001,
      entryAvgPrice: 50000,
      exitOrdId: "exit-1",
      exitClOrdId: "exit-cl-1",
      exitFilledQty: 0.001,
      exitAvgPrice: 49900,
      remainingQty: 0,
      exitReason: "circuit_breaker",
      stopPrice: 49500,
      takeProfitPrice: 50500,
      maxHoldSec: 600,
      createdAt,
      updatedAt: closedAt,
      closedAt,
      feeUsd: 0.02,
      realizedPnlUsd: -0.12,
      exitRepriceCount: 0,
      forcedFlattenEscalated: false
    });
    store.close();

    const previousEnabled = process.env.TOURAB_LEARNING_ALERTS_ENABLED;
    const previousMinTrades = process.env.TOURAB_LEARNING_ALERT_MIN_TRADES;
    const previousExpectancyMin = process.env.TOURAB_LEARNING_ALERT_EXPECTANCY_MIN_USD;
    process.env.TOURAB_LEARNING_ALERTS_ENABLED = "1";
    process.env.TOURAB_LEARNING_ALERT_MIN_TRADES = "1";
    process.env.TOURAB_LEARNING_ALERT_EXPECTANCY_MIN_USD = "0";

    const handle = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      const alertsRes = await fetch(`${handle.baseHttpUrl}/alerts?status=open`);
      expect(alertsRes.ok).toBe(true);
      const alertsPayload = (await alertsRes.json()) as { items: Array<{ code: string; status: string }> };
      expect(alertsPayload.items.some((item) => item.code === "LEARNING_EXPECTANCY_DEGRADATION" && item.status === "open")).toBe(true);

      const incidentsRes = await fetch(`${handle.baseHttpUrl}/incidents`);
      expect(incidentsRes.ok).toBe(true);
      const incidentsPayload = (await incidentsRes.json()) as { items: Array<{ sourceAlertCode?: string; runbookRef: string }> };
      expect(
        incidentsPayload.items.some(
          (item) =>
            item.sourceAlertCode === "LEARNING_EXPECTANCY_DEGRADATION" &&
            item.runbookRef === "docs/runbooks/learning-evaluation-guard.md"
        )
      ).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
      if (previousEnabled === undefined) {
        delete process.env.TOURAB_LEARNING_ALERTS_ENABLED;
      } else {
        process.env.TOURAB_LEARNING_ALERTS_ENABLED = previousEnabled;
      }
      if (previousMinTrades === undefined) {
        delete process.env.TOURAB_LEARNING_ALERT_MIN_TRADES;
      } else {
        process.env.TOURAB_LEARNING_ALERT_MIN_TRADES = previousMinTrades;
      }
      if (previousExpectancyMin === undefined) {
        delete process.env.TOURAB_LEARNING_ALERT_EXPECTANCY_MIN_USD;
      } else {
        process.env.TOURAB_LEARNING_ALERT_EXPECTANCY_MIN_USD = previousExpectancyMin;
      }
    }
  });

  it("exposes learning evaluation trend summary with breach flags", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const store = await SqliteOpsStore.open(opsStorePath);
    const now = new Date();
    const createdAt = new Date(now.getTime() - 20 * 60_000).toISOString();
    const closedAt = new Date(now.getTime() - 5 * 60_000).toISOString();
    store.upsertManagedTrade({
      tradeId: "m7-trend-1",
      status: "closed",
      symbol: "BTC-USDT",
      entrySide: "buy",
      entryOrdId: "entry-1",
      entryClOrdId: "entry-cl-1",
      requestedQty: 0.001,
      entryFilledQty: 0.001,
      entryAvgPrice: 50000,
      exitOrdId: "exit-1",
      exitClOrdId: "exit-cl-1",
      exitFilledQty: 0.001,
      exitAvgPrice: 49900,
      remainingQty: 0,
      exitReason: "manual",
      stopPrice: 49500,
      takeProfitPrice: 50500,
      maxHoldSec: 600,
      createdAt,
      updatedAt: closedAt,
      closedAt,
      feeUsd: 0.02,
      realizedPnlUsd: -0.1,
      exitRepriceCount: 0,
      forcedFlattenEscalated: false
    });
    store.close();
    const previousMinTrades = process.env.TOURAB_LEARNING_ALERT_MIN_TRADES;
    const previousExpectancyMin = process.env.TOURAB_LEARNING_ALERT_EXPECTANCY_MIN_USD;
    process.env.TOURAB_LEARNING_ALERT_MIN_TRADES = "1";
    process.env.TOURAB_LEARNING_ALERT_EXPECTANCY_MIN_USD = "0";
    const handle = await startMissionControlServer({ port: 0, eventStorePath, opsStorePath, logRequests: false });
    try {
      const res = await fetch(`${handle.baseHttpUrl}/learning/evaluation-trend?lookbackDays=30&bucketDays=1&limit=50`);
      expect(res.ok).toBe(true);
      const payload = (await res.json()) as {
        points: Array<{ breaches: { expectancy: boolean }; closedTrades: number }>;
      };
      expect(payload.points.length).toBeGreaterThanOrEqual(1);
      expect(payload.points.some((item) => item.closedTrades >= 1 && item.breaches.expectancy)).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
      if (previousMinTrades === undefined) {
        delete process.env.TOURAB_LEARNING_ALERT_MIN_TRADES;
      } else {
        process.env.TOURAB_LEARNING_ALERT_MIN_TRADES = previousMinTrades;
      }
      if (previousExpectancyMin === undefined) {
        delete process.env.TOURAB_LEARNING_ALERT_EXPECTANCY_MIN_USD;
      } else {
        process.env.TOURAB_LEARNING_ALERT_EXPECTANCY_MIN_USD = previousExpectancyMin;
      }
    }
  });

  it("enforces strategy promotion gates before limited_prod", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const alertStorePath = join(tempDir, "alerts.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const handle = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      const register = await fetch(`${handle.baseHttpUrl}/strategy/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({ version: "challenger-v2", notes: "contract test" })
      });
      expect(register.status).toBe(201);

      const promoteShadow = await fetch(`${handle.baseHttpUrl}/strategy/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({ version: "challenger-v2", targetStage: "shadow" })
      });
      expect(promoteShadow.ok).toBe(true);

      const reconcileReady = await fetch(`${handle.baseHttpUrl}/reconciliation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({
          positions: "ok",
          pnl: "ok",
          orders: "ok"
        })
      });
      expect(reconcileReady.ok).toBe(true);

      const promoteCanary = await fetch(`${handle.baseHttpUrl}/strategy/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({ version: "challenger-v2", targetStage: "paper_canary" })
      });
      expect(promoteCanary.ok).toBe(true);

      const promoteLimited = await fetch(`${handle.baseHttpUrl}/strategy/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({ version: "challenger-v2", targetStage: "limited_prod" })
      });
      expect(promoteLimited.status).toBe(409);
      const gatePayload = (await promoteLimited.json()) as { code: string };
      expect(gatePayload.code).toBe("PROMOTION_GATES_FAILED");

      const stateRes = await fetch(`${handle.baseHttpUrl}/strategy/promotion`);
      expect(stateRes.ok).toBe(true);
      const statePayload = (await stateRes.json()) as {
        state: { versions: Array<{ version: string; stage: string }> };
      };
      expect(statePayload.state.versions.some((item) => item.version === "challenger-v2" && item.stage === "paper_canary")).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("updates strategy degradation config and persists strategy artifacts", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const alertStorePath = join(tempDir, "alerts.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const handle = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      const cfgUpdate = await fetch(`${handle.baseHttpUrl}/strategy/degradation-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({
          enabled: true,
          maxDailyLossUsd: 7,
          maxDrawdownPct: -4.5,
          maxConsecutiveLosingTrades: 3
        })
      });
      expect(cfgUpdate.ok).toBe(true);
      const cfgPayload = (await cfgUpdate.json()) as {
        config: { maxDailyLossUsd: number; maxDrawdownPct: number; maxConsecutiveLosingTrades: number };
      };
      expect(cfgPayload.config.maxDailyLossUsd).toBe(7);
      expect(cfgPayload.config.maxDrawdownPct).toBe(-4.5);
      expect(cfgPayload.config.maxConsecutiveLosingTrades).toBe(3);

      const register = await fetch(`${handle.baseHttpUrl}/strategy/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({
          version: "artifact-strategy-v1",
          artifacts: {
            researchReportUrl: "https://example.test/research",
            shadowReportUrl: "https://example.test/shadow"
          }
        })
      });
      expect(register.status).toBe(201);

      const stateRes = await fetch(`${handle.baseHttpUrl}/strategy/promotion`);
      expect(stateRes.ok).toBe(true);
      const statePayload = (await stateRes.json()) as {
        state: {
          versions: Array<{
            version: string;
            artifacts?: { researchReportUrl?: string; shadowReportUrl?: string };
          }>;
        };
      };
      const row = statePayload.state.versions.find((item) => item.version === "artifact-strategy-v1");
      expect(row?.artifacts?.researchReportUrl).toBe("https://example.test/research");
      expect(row?.artifacts?.shadowReportUrl).toBe("https://example.test/shadow");
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("updates and persists learning alert config with role enforcement", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const first = await startMissionControlServer({ port: 0, eventStorePath, opsStorePath, logRequests: false });
    try {
      const forbidden = await fetch(`${first.baseHttpUrl}/learning/alert-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "read_only",
          "x-user-id": "viewer-user"
        },
        body: JSON.stringify({ minTrades: 12 })
      });
      expect(forbidden.status).toBe(403);

      const updateRes = await fetch(`${first.baseHttpUrl}/learning/alert-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({
          enabled: true,
          lookbackDays: 45,
          limit: 1500,
          minTrades: 20,
          expectancyMinUsd: 0.01,
          maxDrawdownPct: 4.5,
          maxSlippageBps: 12,
          maxControlViolationRatePct: 10
        })
      });
      expect(updateRes.ok).toBe(true);
      const updatedPayload = (await updateRes.json()) as {
        config: {
          lookbackDays: number;
          minTrades: number;
          maxDrawdownPct: number;
          maxSlippageBps: number;
        };
      };
      expect(updatedPayload.config.lookbackDays).toBe(45);
      expect(updatedPayload.config.minTrades).toBe(20);
      expect(updatedPayload.config.maxDrawdownPct).toBe(4.5);
      expect(updatedPayload.config.maxSlippageBps).toBe(12);
    } finally {
      await first.close();
    }

    const second = await startMissionControlServer({ port: 0, eventStorePath, opsStorePath, logRequests: false });
    try {
      const configRes = await fetch(`${second.baseHttpUrl}/learning/alert-config`);
      expect(configRes.ok).toBe(true);
      const payload = (await configRes.json()) as {
        config: { lookbackDays: number; minTrades: number; maxDrawdownPct: number; maxSlippageBps: number };
      };
      expect(payload.config.lookbackDays).toBe(45);
      expect(payload.config.minTrades).toBe(20);
      expect(payload.config.maxDrawdownPct).toBe(4.5);
      expect(payload.config.maxSlippageBps).toBe(12);
    } finally {
      await second.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("exports learning incident report with M7-only filtering and summary totals", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const store = await SqliteOpsStore.open(opsStorePath);
    const nowIso = new Date().toISOString();
    store.createIncident({
      id: "learning-incident-1",
      severity: "sev2",
      taxonomy: "ops_durability",
      title: "Learning expectancy below threshold",
      detail: "Expectancy below configured threshold.",
      runbookRef: "docs/runbooks/learning-evaluation-guard.md",
      sourceAlertCode: "LEARNING_EXPECTANCY_DEGRADATION"
    });
    store.createIncident({
      id: "learning-incident-2",
      severity: "sev2",
      taxonomy: "ops_durability",
      title: "Learning slippage elevated",
      detail: "Slippage above configured threshold.",
      runbookRef: "docs/runbooks/learning-evaluation-guard.md",
      sourceAlertCode: "LEARNING_SLIPPAGE_ELEVATED"
    });
    store.updateIncidentStatus("learning-incident-2", "resolved", "ops-user");
    store.createIncident({
      id: "non-learning-incident-1",
      severity: "sev3",
      taxonomy: "exchange_reliability",
      title: "Exchange timeout",
      detail: "Non-learning incident should be excluded.",
      runbookRef: "docs/runbooks/exchange-reliability.md",
      sourceAlertCode: "RUNTIME_ERROR_EVENT"
    });
    store.close();

    const handle = await startMissionControlServer({
      port: 0,
      eventStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      const res = await fetch(`${handle.baseHttpUrl}/learning/incidents/export?lookbackDays=30`);
      expect(res.ok).toBe(true);
      const payload = (await res.json()) as {
        exportedAt: string;
        lookbackDays: number;
        count: number;
        openCount: number;
        resolvedCount: number;
        totals: {
          byCode: Array<{ code: string; count: number }>;
          byStatus: Array<{ status: string; count: number }>;
        };
        items: Array<{ id: string; sourceAlertCode?: string }>;
      };

      expect(payload.lookbackDays).toBe(30);
      expect(payload.count).toBe(2);
      expect(payload.openCount).toBe(1);
      expect(payload.resolvedCount).toBe(1);
      expect(payload.items.every((item) => item.sourceAlertCode?.startsWith("LEARNING_"))).toBe(true);
      expect(payload.items.some((item) => item.id === "non-learning-incident-1")).toBe(false);
      expect(payload.totals.byCode.some((item) => item.code === "LEARNING_EXPECTANCY_DEGRADATION")).toBe(true);
      expect(payload.totals.byCode.some((item) => item.code === "LEARNING_SLIPPAGE_ELEVATED")).toBe(true);
      expect(payload.totals.byStatus.some((item) => item.status === "open" && item.count >= 1)).toBe(true);
      expect(payload.totals.byStatus.some((item) => item.status === "resolved" && item.count >= 1)).toBe(true);
      expect(Number.isFinite(Date.parse(payload.exportedAt))).toBe(true);
      expect(Date.parse(payload.exportedAt)).toBeGreaterThanOrEqual(Date.parse(nowIso) - 60_000);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("falls back to manual on reconciliation drift circuit and records M6 fallback evidence", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const alertStorePath = join(tempDir, "alerts.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const handle = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      const enablePolicyAuto = await fetch(`${handle.baseHttpUrl}/entry-autonomy/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({
          approvalMode: "policy_auto",
          policyVersion: "m6-policy-contract"
        })
      });
      expect(enablePolicyAuto.ok).toBe(true);

      await postControl(handle.baseHttpUrl, "/start");
      const reconcileOne = await fetch(`${handle.baseHttpUrl}/reconciliation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({ orders: "drift" })
      });
      expect(reconcileOne.ok).toBe(true);
      const reconcileTwo = await fetch(`${handle.baseHttpUrl}/reconciliation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({ orders: "drift" })
      });
      expect(reconcileTwo.ok).toBe(true);

      const entryAutonomyRes = await fetch(`${handle.baseHttpUrl}/entry-autonomy/config`);
      expect(entryAutonomyRes.ok).toBe(true);
      const entryAutonomy = (await entryAutonomyRes.json()) as EntryAutonomyConfigResponse;
      expect(entryAutonomy.config.approvalMode).toBe("manual");
      expect(entryAutonomy.status.approvalMode).toBe("manual");
      expect(entryAutonomy.status.fallbackActive).toBe(true);
      expect(entryAutonomy.status.lastFallbackReason).toBeTruthy();
      expect(typeof entryAutonomy.status.lastFallbackAt).toBe("string");

      const snapshotRes = await fetch(`${handle.baseHttpUrl}/snapshot`);
      expect(snapshotRes.ok).toBe(true);
      const snapshot = (await snapshotRes.json()) as SnapshotResponse;
      expect(snapshot.audit.some((item) => item.title === "Approval mode fallback")).toBe(true);
      expect(snapshot.alerts.some((item) => item.code === "RECONCILIATION_DRIFT_CIRCUIT")).toBe(true);
      expect(snapshot.alerts.some((item) => item.code === "APPROVAL_MODE_FALLBACK")).toBe(true);

      const eventsRes = await fetch(`${handle.baseHttpUrl}/events?limit=40`);
      expect(eventsRes.ok).toBe(true);
      const eventsPayload = (await eventsRes.json()) as {
        items: Array<{ message?: string; tags?: string[] }>;
      };
      expect(
        eventsPayload.items.some(
          (item) => (item.message ?? "").includes("Approval mode fallback to manual") || (item.tags ?? []).includes("entry_autonomy")
        )
      ).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("falls back to manual when stop is executed under policy_auto mode", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const alertStorePath = join(tempDir, "alerts.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const handle = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      const enablePolicyAuto = await fetch(`${handle.baseHttpUrl}/entry-autonomy/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({
          approvalMode: "policy_auto"
        })
      });
      expect(enablePolicyAuto.ok).toBe(true);

      await postControl(handle.baseHttpUrl, "/start");

      const stopDenied = await postControlRaw(handle.baseHttpUrl, "/stop");
      expect(stopDenied.status).toBe(409);
      const deniedPayload = (await stopDenied.json()) as { details?: { approvalId?: string } };
      const approvalId = deniedPayload.details?.approvalId as string;
      expect(approvalId).toBeTruthy();

      const approveRes = await fetch(`${handle.baseHttpUrl}/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        }
      });
      expect(approveRes.ok).toBe(true);

      const stopApproved = await postControlRaw(handle.baseHttpUrl, "/stop", {
        "x-approval-id": approvalId
      });
      expect(stopApproved.ok).toBe(true);

      const entryAutonomyRes = await fetch(`${handle.baseHttpUrl}/entry-autonomy/config`);
      expect(entryAutonomyRes.ok).toBe(true);
      const entryAutonomy = (await entryAutonomyRes.json()) as EntryAutonomyConfigResponse;
      expect(entryAutonomy.config.approvalMode).toBe("manual");
      expect(entryAutonomy.status.fallbackActive).toBe(true);
      expect(entryAutonomy.status.lastFallbackReason).toContain("control action stop activated");
      expect(typeof entryAutonomy.status.lastFallbackAt).toBe("string");
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("falls back to manual when emergency-stop is executed under policy_auto mode", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "tourab-mission-contract-"));
    const eventStorePath = join(tempDir, "events.jsonl");
    const alertStorePath = join(tempDir, "alerts.jsonl");
    const opsStorePath = join(tempDir, "ops.sqlite");
    const handle = await startMissionControlServer({
      port: 0,
      eventStorePath,
      alertStorePath,
      opsStorePath,
      logRequests: false
    });
    try {
      const enablePolicyAuto = await fetch(`${handle.baseHttpUrl}/entry-autonomy/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({
          approvalMode: "policy_auto"
        })
      });
      expect(enablePolicyAuto.ok).toBe(true);

      await postControl(handle.baseHttpUrl, "/start");

      const denied = await postControlRaw(handle.baseHttpUrl, "/emergency-stop");
      expect(denied.status).toBe(409);
      const deniedPayload = (await denied.json()) as { details?: { approvalId?: string } };
      const approvalId = deniedPayload.details?.approvalId as string;
      expect(approvalId).toBeTruthy();

      const approveOne = await fetch(`${handle.baseHttpUrl}/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "alice"
        }
      });
      expect(approveOne.ok).toBe(true);
      const approveTwo = await fetch(`${handle.baseHttpUrl}/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "bob"
        }
      });
      expect(approveTwo.ok).toBe(true);

      const execute = await postControlRaw(handle.baseHttpUrl, "/emergency-stop", {
        "x-approval-id": approvalId,
        "x-user-id": "bob"
      });
      expect(execute.ok).toBe(true);

      const entryAutonomyRes = await fetch(`${handle.baseHttpUrl}/entry-autonomy/config`);
      expect(entryAutonomyRes.ok).toBe(true);
      const entryAutonomy = (await entryAutonomyRes.json()) as EntryAutonomyConfigResponse;
      expect(entryAutonomy.config.approvalMode).toBe("manual");
      expect(entryAutonomy.status.fallbackActive).toBe(true);
      expect(entryAutonomy.status.lastFallbackReason).toContain("control action emergency_stop activated");
      expect(typeof entryAutonomy.status.lastFallbackAt).toBe("string");
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
