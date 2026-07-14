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
    signalLookbackSec: 180,
    signalShortLookbackSec: 45,
    signalMinMoveBps: 0,
    signalMinVolatilityBps: 0,
    signalRoundTripFeeBps: 16,
    retryMaxAttempts: 1,
    retryBudgetPerHour: 1,
    maxPendingEntriesPerSymbol: 4,
    executionMode: "demo_execution_enabled",
    defaultSide: "buy"
  };
}

describe("runtime worker manager", () => {
  it("does not overlap worker cycles while a market fetch is still in flight", async () => {
    vi.useFakeTimers();
    const originalFetch = vi.mocked(proposalHelper.fetchSpotMarketInputs);
    let resolveFetch: ((value: Awaited<ReturnType<typeof proposalHelper.fetchSpotMarketInputs>>) => void) | undefined;
    originalFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    const manager = new RuntimeWorkerManager(
      {
        onEvent: async () => {},
        onStateUpdate: () => {},
        getState: () => runningState(),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval: vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-overlap" }))
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        intervalMs: 5
      }
    );

    manager.start();
    await vi.advanceTimersByTimeAsync(25);

    expect(originalFetch).toHaveBeenCalledTimes(1);

    resolveFetch?.({
      symbol: "BTC-USDT",
      last: 10,
      tickSz: 0.01,
      lotSz: 0.01,
      minSz: 0.01
    });

    await vi.advanceTimersByTimeAsync(10);

    expect(originalFetch.mock.calls.length).toBeGreaterThanOrEqual(2);

    manager.pause();
    vi.useRealTimers();
  });

  it("can restart after a paused in-flight cycle without inheriting the old deadlock", async () => {
    vi.useFakeTimers();
    const originalFetch = vi.mocked(proposalHelper.fetchSpotMarketInputs);
    let resolveFirstFetch: ((value: Awaited<ReturnType<typeof proposalHelper.fetchSpotMarketInputs>>) => void) | undefined;
    originalFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstFetch = resolve;
        })
    );
    originalFetch.mockImplementation(async (symbol: string) => ({
      symbol,
      last: 10,
      tickSz: 0.01,
      lotSz: 0.01,
      minSz: 0.01
    }));

    const events: BotEvent[] = [];
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => runningState(),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval: vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-restart" }))
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        intervalMs: 5
      }
    );

    manager.start();
    await vi.advanceTimersByTimeAsync(10);
    expect(originalFetch.mock.calls.length).toBeGreaterThanOrEqual(1);

    manager.pause();
    manager.start();
    await vi.advanceTimersByTimeAsync(10);

    expect(originalFetch.mock.calls.length).toBeGreaterThanOrEqual(2);

    resolveFirstFetch?.({
      symbol: "BTC-USDT",
      last: 10,
      tickSz: 0.01,
      lotSz: 0.01,
      minSz: 0.01
    });

    manager.pause();
    vi.useRealTimers();
  });

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

  it("blocks proposals when market-intelligence confidence is below the configured floor", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-mi-low" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        getMarketIntelligence: async () => ({
          regime: "trend_down",
          confidenceScore: 18,
          trendAlignmentScore: -55,
          recommendedSide: "sell",
          recommendedEntryOffsetBps: 8,
          move1mBps: -3,
          move5mBps: -8,
          move15mBps: -15,
          realizedVolatilityBps: 3,
          spreadBps: 1,
          orderBookImbalancePct: -12
        }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "sell",
        marketIntelligenceMinConfidenceScore: 25
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("market-intelligence confidence"))).toBe(true);
  });

  it("passes market-intelligence context into queued demo approvals", async () => {
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-mi-pass" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async () => {},
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        getMarketIntelligence: async () => ({
          regime: "trend_down",
          confidenceScore: 42,
          trendAlignmentScore: -62,
          recommendedSide: "sell",
          recommendedEntryOffsetBps: 7,
          move1mBps: -2,
          move5mBps: -7,
          move15mBps: -18,
          realizedVolatilityBps: 4,
          spreadBps: 1.2,
          orderBookImbalancePct: -10
        }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "sell",
        marketIntelligenceMinConfidenceScore: 20
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).toHaveBeenCalledTimes(1);
    const queuedInput = queueDemoExecutionApproval.mock.calls[0]?.[0] as {
      marketIntelligence?: { regime: string; confidenceScore: number; recommendedEntryOffsetBps: number };
      tradingPlan?: { playbookId: string; entryStyle: string; thesisConfidenceScore: number };
    };
    expect(queuedInput.marketIntelligence?.regime).toBe("trend_down");
    expect(queuedInput.marketIntelligence?.confidenceScore).toBe(42);
    expect(queuedInput.marketIntelligence?.recommendedEntryOffsetBps).toBe(7);
    expect(queuedInput.tradingPlan?.playbookId).toBe("btc_downside_continuation");
    expect(queuedInput.tradingPlan?.entryStyle).toBe("passive_join");
    expect((queuedInput.tradingPlan?.thesisConfidenceScore ?? 0) > 0).toBe(true);
  });

  it("blocks entries when no valid playbook exists for the observed regime", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-no-playbook" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "SOL-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        getMarketIntelligence: async () => ({
          regime: "chop",
          confidenceScore: 41,
          trendAlignmentScore: 4,
          recommendedSide: undefined,
          recommendedEntryOffsetBps: 7,
          move1mBps: 1,
          move5mBps: -1,
          move15mBps: 2,
          realizedVolatilityBps: 4,
          spreadBps: 1.2,
          orderBookImbalancePct: 0
        }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["SOL-USDT"],
        defaultSide: "buy",
        signalMinMoveBps: 0,
        signalMinVolatilityBps: 0
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("No-trade"))).toBe(true);
  });

  it("blocks BTC buys until stricter confirmation thresholds are met", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-btc-tight" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        getMarketIntelligence: async () => ({
          regime: "trend_up",
          confidenceScore: 58,
          trendAlignmentScore: 17,
          recommendedSide: "buy",
          recommendedEntryOffsetBps: 5,
          move1mBps: 2,
          move5mBps: 3,
          move15mBps: 9,
          realizedVolatilityBps: 5,
          spreadBps: 1,
          orderBookImbalancePct: 18
        }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "buy",
        signalMinMoveBps: 0,
        signalMinVolatilityBps: 0,
        btcBuyMinConfidenceScore: 65,
        btcBuyMinTrendAlignmentScore: 20,
        btcBuyMinMove5mBps: 4
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("BTC buy"))).toBe(true);
  });

  it("blocks BTC when signal evaluation is required but disabled", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-btc-no-signal" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "buy",
        signalMinMoveBps: 0,
        requireSignalEvaluationSymbols: ["BTC-USDT"]
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("signal evaluation is required"))).toBe(true);
  });

  it("blocks BTC when market intelligence is required but unavailable", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-btc-no-mi" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        getMarketIntelligence: async () => undefined,
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "sell",
        signalMinMoveBps: 0,
        signalMinVolatilityBps: 0,
        requireMarketIntelligenceSymbols: ["BTC-USDT"]
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("market intelligence is required"))).toBe(true);
  });

  it("blocks ETH entries when BTC confirmation disagrees", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-eth-confirm" }));
    const getMarketIntelligence = vi.fn(async ({ symbol }: { symbol: string }) => {
      if (symbol === "ETH-USDT") {
        return {
          regime: "trend_up",
          confidenceScore: 72,
          trendAlignmentScore: 28,
          recommendedSide: "buy" as const,
          recommendedEntryOffsetBps: 6,
          move1mBps: 3,
          move5mBps: 6,
          move15mBps: 12,
          realizedVolatilityBps: 7,
          spreadBps: 1.2,
          orderBookImbalancePct: 15
        };
      }
      return {
        regime: "trend_down",
        confidenceScore: 78,
        trendAlignmentScore: -32,
        recommendedSide: "sell" as const,
        recommendedEntryOffsetBps: 5,
        move1mBps: -2,
        move5mBps: -5,
        move15mBps: -10,
        realizedVolatilityBps: 5,
        spreadBps: 1,
        orderBookImbalancePct: -14
      };
    });
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "ETH-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        getMarketIntelligence,
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["ETH-USDT"],
        defaultSide: "buy",
        signalMinMoveBps: 0,
        signalMinVolatilityBps: 0,
        ethRequireBtcConfirmation: true,
        ethBtcMinConfidenceScore: 55,
        ethBtcMinTrendAlignmentScore: 18
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(getMarketIntelligence).toHaveBeenCalledWith({ symbol: "BTC-USDT" });
    expect(events.some((event) => event.message.includes("BTC recommended side"))).toBe(true);
  });

  it("blocks ETH when BTC is stronger after volatility adjustment", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-eth-strength" }));
    const getMarketIntelligence = vi.fn(async ({ symbol }: { symbol: string }) => {
      if (symbol === "ETH-USDT") {
        return {
          regime: "trend_up",
          confidenceScore: 80,
          trendAlignmentScore: 20,
          recommendedSide: "buy" as const,
          recommendedEntryOffsetBps: 6,
          move1mBps: 3,
          move5mBps: 6,
          move15mBps: 11,
          realizedVolatilityBps: 10,
          spreadBps: 1.1,
          orderBookImbalancePct: 14
        };
      }
      return {
        regime: "trend_up",
        confidenceScore: 78,
        trendAlignmentScore: 32,
        recommendedSide: "buy" as const,
        recommendedEntryOffsetBps: 5,
        move1mBps: 2,
        move5mBps: 5,
        move15mBps: 10,
        realizedVolatilityBps: 4,
        spreadBps: 1,
        orderBookImbalancePct: 16
      };
    });
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "ETH-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        getMarketIntelligence,
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["ETH-USDT"],
        defaultSide: "buy",
        signalMinMoveBps: 0,
        signalMinVolatilityBps: 0,
        ethRequireBtcConfirmation: true,
        ethBtcMinConfidenceScore: 55,
        ethBtcMinTrendAlignmentScore: 18,
        ethBtcRelativeStrengthMinDelta: 0.15
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("relative strength"))).toBe(true);
  });

  it("blocks non-trending regimes when chop blocking is enabled", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-mi-chop" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        getMarketIntelligence: async () => ({
          regime: "chop",
          confidenceScore: 55,
          trendAlignmentScore: 2,
          recommendedEntryOffsetBps: 6,
          move1mBps: 1,
          move5mBps: -2,
          move15mBps: 1,
          realizedVolatilityBps: 4,
          spreadBps: 1,
          orderBookImbalancePct: 5
        }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "buy",
        signalMinMoveBps: 0,
        signalMinVolatilityBps: 0,
        blockChopRegimes: true
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("non-trending regime"))).toBe(true);
  });

  it("blocks volatility-budget mismatches when target exceeds the observed move budget", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-mi-budget" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        getMarketIntelligence: async () => ({
          regime: "trend_up",
          confidenceScore: 80,
          trendAlignmentScore: 25,
          recommendedSide: "buy",
          recommendedEntryOffsetBps: 6,
          move1mBps: 4,
          move5mBps: 7,
          move15mBps: 10,
          realizedVolatilityBps: 5,
          spreadBps: 1,
          orderBookImbalancePct: 20,
          projectedMoveBudgetBps: 20
        }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "buy",
        stopDistanceBps: 40,
        expectedMoveHurdleEnabled: true,
        expectedMoveTakeProfitRMultiple: 1,
        expectedMoveFeeCoverageMultiple: 1,
        expectedMoveMinNetEdgeBps: 0,
        maxMoveBudgetUsagePct: 100
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("volatility-budget mismatch"))).toBe(true);
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
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("passes aggressive negative entry offsets through symbol overrides", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-5" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "sell",
        symbolOverrides: {
          "BTC-USDT": {
            entryOffsetBps: -20
          }
        }
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).toHaveBeenCalledTimes(1);
    const queuedInput = queueDemoExecutionApproval.mock.calls[0]?.[0] as {
      proposal: { entryPrice: number };
    };
    expect(queuedInput.proposal.entryPrice).toBeLessThan(10);
    expect(events.some((event) => event.type === "ProposalApproved")).toBe(true);
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

  it("blocks symbol when pending entry backlog reaches the per-symbol cap", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-6" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => runningState(),
        getEntryBacklog: () => ({
          pendingEntryCount: 4,
          pendingEntryNotionalUsd: 2.5
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "sell"
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("entry backlog"))).toBe(true);
    expect(events.some((event) => event.type === "ProposalCreated")).toBe(false);
  });

  it("continues proposal flow when pending entry backlog is below the cap", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-7" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => runningState(),
        getEntryBacklog: () => ({
          pendingEntryCount: 2,
          pendingEntryNotionalUsd: 1.1
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "sell"
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).toHaveBeenCalledTimes(1);
    expect(events.some((event) => event.type === "ProposalApproved")).toBe(true);
  });

  it("blocks auto-side entries until signal history is warm", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-8" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "auto",
        signalMinMoveBps: 10
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("signal filter warmup"))).toBe(true);
  });

  it("resolves auto-side signal gating into a buy after a strong up move", async () => {
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async () => {},
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval: vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-9" }))
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "auto",
        signalLookbackSec: 60,
        signalShortLookbackSec: 30,
        signalMinMoveBps: 10,
        signalMinVolatilityBps: 0
      }
    );

    const nowEpoch = Date.now();
    (manager as any).recentPrices.set("BTC-USDT", [
      { atEpoch: nowEpoch - 60_000, last: 100 },
      { atEpoch: nowEpoch - 45_000, last: 100.2 },
      { atEpoch: nowEpoch - 30_000, last: 100.4 }
    ]);
    const result = (manager as any).resolveSignalSide(
      "BTC-USDT",
      "auto",
      {
        symbol: "BTC-USDT",
        last: 100.3,
        tickSz: 0.1,
        lotSz: 0.0001,
        minSz: 0.0001
      },
      nowEpoch
    );

    expect(result).toMatchObject({ ok: true, side: "buy" });
  });

  it("blocks after signal selection when the trade-quality gate rejects the chosen side", async () => {
    const fetchMock = proposalHelper.fetchSpotMarketInputs as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      symbol: "BTC-USDT",
      last: 100.3,
      tickSz: 0.1,
      lotSz: 0.0001,
      minSz: 0.0001
    });
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-10" }));
    const evaluateTradeEligibility = vi.fn(async ({ side }: { side: string }) => ({
      eligible: false,
      reason: `${side} side expectancy below floor`
    }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        evaluateTradeEligibility,
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "sell",
        signalMinMoveBps: 0,
        signalMinVolatilityBps: 0
      }
    );

    await (manager as any).runCycle();

    expect(evaluateTradeEligibility).toHaveBeenCalledTimes(1);
    expect(evaluateTradeEligibility.mock.calls[0]?.[0]).toMatchObject({ symbol: "BTC-USDT", side: "sell" });
    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.type === "RiskLimitHit")).toBe(true);
  });

  it("blocks entries when expected target move does not clear the configured cost hurdle", async () => {
    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-11" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "sell",
        stopDistanceBps: 40,
        signalRoundTripFeeBps: 16,
        expectedMoveHurdleEnabled: true,
        expectedMoveTakeProfitRMultiple: 0.5,
        expectedMoveFeeCoverageMultiple: 2,
        expectedMoveMinNetEdgeBps: 4
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.message.includes("expected-move hurdle"))).toBe(true);
  });

  it("uses cached market data when fresh public market fetch fails transiently", async () => {
    const fetchMock = proposalHelper.fetchSpotMarketInputs as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValueOnce(new Error("OKX public request failed: 502"));

    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-cache-market" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "sell",
        signalMinMoveBps: 0,
        signalMinVolatilityBps: 0,
        retryMaxAttempts: 1
      }
    );

    (manager as any).lastGoodMarketBySymbol.set("BTC-USDT", {
      value: {
        symbol: "BTC-USDT",
        last: 100,
        tickSz: 0.1,
        lotSz: 0.0001,
        minSz: 0.0001
      },
      fetchedAtEpoch: Date.now()
    });

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).toHaveBeenCalledTimes(1);
    expect(events.some((event) => event.message.includes("cached market data"))).toBe(true);
    expect(events.some((event) => event.type === "ProposalCreated")).toBe(true);
  });

  it("emits an explicit blocker when no market data is available and no cache exists", async () => {
    const fetchMock = proposalHelper.fetchSpotMarketInputs as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValueOnce(new Error("OKX public request timed out after 4000ms: /api/v5/market/ticker?instId=BTC-USDT"));

    const events: BotEvent[] = [];
    const queueDemoExecutionApproval = vi.fn(async (_input: unknown) => ({ queued: true, approvalId: "a-no-market" }));
    const manager = new RuntimeWorkerManager(
      {
        onEvent: async (event) => {
          events.push(event);
        },
        onStateUpdate: () => {},
        getState: () => ({
          ...runningState(),
          activeSymbol: "BTC-USDT"
        }),
        evaluateSymbolEligibility: async () => ({ eligible: true }),
        queueDemoExecutionApproval
      },
      {
        ...basePolicy(),
        symbolUniverse: ["BTC-USDT"],
        defaultSide: "sell",
        signalMinMoveBps: 0,
        signalMinVolatilityBps: 0,
        retryMaxAttempts: 1
      }
    );

    await (manager as any).runCycle();

    expect(queueDemoExecutionApproval).not.toHaveBeenCalled();
    expect(events.some((event) => event.type === "RiskLimitHit" && event.message.includes("unavailable market data"))).toBe(true);
    expect(events.some((event) => event.type === "Error" && event.message.includes("Worker cycle failed"))).toBe(false);
  });
});
