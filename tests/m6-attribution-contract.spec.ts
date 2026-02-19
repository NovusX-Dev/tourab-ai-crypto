import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tourab/okx-demo-adapter", () => {
  let seq = 0;
  class OkxApiError extends Error {
    code: string;
    details?: Record<string, unknown>;
    constructor(code: string, message: string, details?: Record<string, unknown>) {
      super(message);
      this.name = "OkxApiError";
      this.code = code;
      this.details = details;
    }
  }

  class OkxDemoAdapter {
    async getAccountBalance(): Promise<{
      totalEq: string;
      details: Array<{ ccy: string; availBal: string; cashBal: string; eq: string }>;
    }> {
      return {
        totalEq: "1000",
        details: [{ ccy: "USDT", availBal: "1000", cashBal: "1000", eq: "1000" }]
      };
    }

    async getPendingOrders(): Promise<
      Array<{
        ordId: string;
        clOrdId: string;
        instId: string;
        side: "buy" | "sell";
        px: string;
        sz: string;
        accFillSz: string;
        state: string;
        cTime: string;
        uTime: string;
      }>
    > {
      return [];
    }

    async getFills(): Promise<Array<{ instId: string; fillPx: string }>> {
      return [];
    }

    async placeSpotLimitOrder(input: { symbol: string }): Promise<{ ordId: string; clOrdId: string }> {
      seq += 1;
      return {
        ordId: `ord-${seq}`,
        clOrdId: `cl-${input.symbol}-${seq}`
      };
    }

    async cancelOrder(): Promise<void> {
      return;
    }
  }

  function loadOkxDemoConfigFromEnv(): Record<string, unknown> {
    return {};
  }

  return {
    OkxApiError,
    OkxDemoAdapter,
    loadOkxDemoConfigFromEnv
  };
});

vi.mock("../apps/dashboard/src/proposal-helper.js", async () => {
  const actual = await vi.importActual<typeof import("../apps/dashboard/src/proposal-helper.js")>(
    "../apps/dashboard/src/proposal-helper.js"
  );
  return {
    ...actual,
    fetchSpotMarketInputs: vi.fn(async (symbol: string) => ({
      symbol,
      last: 100,
      tickSz: 0.1,
      lotSz: 0.01,
      minSz: 0.01,
      buyLmt: 120,
      sellLmt: 80
    }))
  };
});

import { startMissionControlServer } from "../apps/dashboard/src/mission-control-server.js";

async function waitForDemoSubmitApproval(baseHttpUrl: string, timeoutMs = 12_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${baseHttpUrl}/approvals`);
    if (res.ok) {
      const payload = (await res.json()) as {
        items: Array<{ id: string; action: string; status: string }>;
      };
      const found = payload.items.find((item) => item.action === "demo_order_submit" && item.status === "pending");
      if (found) {
        return found.id;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Timed out waiting for pending demo_order_submit approval.");
}

describe("m6 attribution contract", () => {
  it("records approval_mode, strategy_version, and policy_version on submitted orders", async () => {
    const prevMode = process.env.OKX_TRADING_MODE;
    const prevExecMode = process.env.TOURAB_EXECUTION_MODE;
    const prevWorkerInterval = process.env.TOURAB_WORKER_INTERVAL_MS;
    process.env.OKX_TRADING_MODE = "demo";
    process.env.TOURAB_EXECUTION_MODE = "demo_execution_enabled";
    process.env.TOURAB_WORKER_INTERVAL_MS = "250";

    const tempDir = await mkdtemp(join(tmpdir(), "tourab-m6-attribution-"));
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
      const cfgRes = await fetch(`${handle.baseHttpUrl}/entry-autonomy/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({
          approvalMode: "manual",
          policyVersion: "m6-policy-attribution-test"
        })
      });
      expect(cfgRes.ok).toBe(true);

      const registerRes = await fetch(`${handle.baseHttpUrl}/strategy/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({ version: "attribution-strategy-v1" })
      });
      expect(registerRes.status).toBe(201);

      const promoteShadowRes = await fetch(`${handle.baseHttpUrl}/strategy/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({ version: "attribution-strategy-v1", targetStage: "shadow" })
      });
      expect(promoteShadowRes.ok).toBe(true);

      const startRes = await fetch(`${handle.baseHttpUrl}/start`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        }
      });
      expect(startRes.ok).toBe(true);

      const approvalId = await waitForDemoSubmitApproval(handle.baseHttpUrl);
      const approveRes = await fetch(`${handle.baseHttpUrl}/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "ops-user"
        }
      });
      expect(approveRes.ok).toBe(true);

      const submitRes = await fetch(`${handle.baseHttpUrl}/demo-order-submit`, {
        method: "POST",
        headers: {
          "x-tourab-role": "operator",
          "x-user-id": "ops-user",
          "x-approval-id": approvalId
        }
      });
      expect(submitRes.ok).toBe(true);

      const eventDeadline = Date.now() + 5_000;
      let submitted:
        | {
            type: string;
            tags?: string[];
            message?: string;
          }
        | undefined;
      while (!submitted && Date.now() < eventDeadline) {
        const eventsRes = await fetch(`${handle.baseHttpUrl}/events?limit=150`);
        expect(eventsRes.ok).toBe(true);
        const events = (await eventsRes.json()) as {
          items: Array<{ type: string; tags?: string[]; message?: string }>;
        };
        submitted = events.items.find((item) => {
          if (item.type !== "OrderSubmitted") {
            return false;
          }
          const tags = item.tags ?? [];
          return (
            tags.includes("approval_mode:manual") &&
            tags.includes("policy_version:m6-policy-attribution-test") &&
            tags.some((tag) => tag.startsWith("strategy_version:"))
          );
        });
        if (!submitted) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      expect(submitted).toBeTruthy();

      const snapshotRes = await fetch(`${handle.baseHttpUrl}/snapshot`);
      expect(snapshotRes.ok).toBe(true);
      const snapshot = (await snapshotRes.json()) as {
        audit: Array<{ title: string; detail: string }>;
      };
      expect(
        snapshot.audit.some(
          (item) =>
            item.title === "Demo order submitted" &&
            item.detail.includes("approvalMode=manual") &&
            item.detail.includes("strategy=") &&
            item.detail.includes("policy=m6-policy-attribution-test")
        )
      ).toBe(true);
    } finally {
      await handle.close();
      await rm(tempDir, { recursive: true, force: true });
      if (prevMode === undefined) {
        delete process.env.OKX_TRADING_MODE;
      } else {
        process.env.OKX_TRADING_MODE = prevMode;
      }
      if (prevExecMode === undefined) {
        delete process.env.TOURAB_EXECUTION_MODE;
      } else {
        process.env.TOURAB_EXECUTION_MODE = prevExecMode;
      }
      if (prevWorkerInterval === undefined) {
        delete process.env.TOURAB_WORKER_INTERVAL_MS;
      } else {
        process.env.TOURAB_WORKER_INTERVAL_MS = prevWorkerInterval;
      }
    }
  });
});
