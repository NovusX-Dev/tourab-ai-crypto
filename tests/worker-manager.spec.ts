import { describe, expect, it, vi } from "vitest";
import type { BotEvent, BotStateSnapshot } from "@tourab/shared";
import { RuntimeWorkerManager, type WorkerPolicy } from "../apps/dashboard/src/mission-control/worker-manager.js";
import * as proposalHelper from "../apps/dashboard/src/proposal-helper.js";

vi.mock("../apps/dashboard/src/proposal-helper.js", async () => {
  const actual = await vi.importActual<typeof import("../apps/dashboard/src/proposal-helper.js")>(
    "../apps/dashboard/src/proposal-helper.js"
  );
  return {
    ...actual,
    fetchSpotMarketInputs: vi.fn(async (symbol: string) => ({
      symbol,
      last: 10,
      tickSz: 0.01,
      lotSz: 0.01,
      minSz: 0.01
    }))
  };
});

function runningState(): BotStateSnapshot {
  return {
    state: "running",
    cycleCount: 0,
    cycleProgress: 0,
    activeSymbol: "BTC-USDT",
    mode: "demo",
    lastHeartbeatAt: new Date(0).toISOString()
  };
}

function basePolicy(): WorkerPolicy {
  return {
    symbolUniverse: ["SOL-USDT"],
    baseUrl: "https://www.okx.com",
    intervalMs: 10_000,
    maxRiskUsd: 0.2,
    maxNotionalUsd: 12,
    entryOffsetBps: 20,
    stopDistanceBps: 150,
    retryMaxAttempts: 1,
    retryBudgetPerHour: 1,
    executionMode: "demo_execution_enabled",
    defaultSide: "buy"
  };
}

describe("runtime worker manager", () => {
  it("blocks symbols when quality gate rejects eligibility", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-1" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => runningState(),
        evaluateSymbolEligibility: async () => ({ eligible: false, reason: "expectancy below floor" }),
        queueDemoExecutionApproval
      },
      basePolicy()
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.type === "RiskLimitHit" && event.message.includes("quality gate blocked"))).toBe(true);
    expect(events.some((event) => event.type === "ProposalCreated")).toBe(false);
  });

  it("applies SOL symbol overrides before proposal build and queueing", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-2" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => runningState(),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolOverrides: {
          "SOL-USDT": {
            side: "sell",
            maxNotionalUsd: 4,
            entryOffsetBps: 12,
            stopDistanceBps: 90
          }
        }
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).toHaveBeenCalledTimes(1);
    const queuedInput = queueDemoExecutionApproval.mock.calls[0]?.[0] as {
      proposal: { side: string; qtyBase: number };
      context: { policy: { maxNotionalUsd: number } };
    };
    expect(queuedInput.proposal.side).toBe("sell");
    expect(queuedInput.context.policy.maxNotionalUsd).toBe(4);
    expect(queuedInput.proposal.qtyBase).toBeGreaterThan(0);
    expect(queuedInput.proposal.qtyBase).toBeLessThanOrEqual(0.4);
    expect(events.some((event) => event.type === "ProposalApproved")).toBe(true);

    const fetchMock = proposalHelper.fetchSpotMarketInputs as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks symbol when UTC hour is guarded", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-23T08:05:00.000Z"));
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-3" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => runningState(),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        blockedUtcHoursBySymbol: {
          "SOL-USDT": [8, 12]
        }
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("time-window guard"))).toBe(true);
    vi.useRealTimers();
  });

  it("blocks symbol when entry band-distance filter is breached", async () => {
    const fetchMock = proposalHelper.fetchSpotMarketInputs as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      symbol: "SOL-USDT",
      last: 10,
      tickSz: 0.01,
      lotSz: 0.01,
      minSz: 0.01,
      buyLmt: 10.01,
      sellLmt: 9.99
    });
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-4" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => runningState(),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolOverrides: {
          "SOL-USDT": {
            side: "sell",
            minBandDistanceBps: 20
          }
        }
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("entry band-distance filter"))).toBe(true);
  });
});
