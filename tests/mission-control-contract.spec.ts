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

async function postControl(baseHttpUrl: string, path: string): Promise<void> {
  const res = await fetch(`${baseHttpUrl}${path}`, {
    method: "POST",
    headers: {
      "x-tourab-role": "operator"
    }
  });
  expect(res.ok).toBe(true);
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
});
