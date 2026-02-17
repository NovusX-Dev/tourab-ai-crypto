import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import WebSocket, { type RawData } from "ws";
import type { WsMessage } from "@tourab/shared";
import { startMissionControlServer } from "../apps/dashboard/src/mission-control-server.js";

interface EventQueryResponse {
  items: Array<{ id: string }>;
  nextCursor: string | null;
}

interface SnapshotResponse {
  audit: Array<{ title: string; detail: string }>;
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
});
