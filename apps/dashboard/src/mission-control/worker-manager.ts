import type { BotEvent, BotStateSnapshot, TradeProposal, RiskContext } from "@tourab/shared";
import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import { buildValidSpotProposal, fetchSpotMarketInputs } from "../proposal-helper.js";
import { createEvent } from "./event-factory.js";

interface WorkerCallbacks {
  onEvent: (event: BotEvent) => Promise<void>;
  onStateUpdate: (next: Partial<BotStateSnapshot>) => void;
  getState: () => BotStateSnapshot;
}

export interface WorkerPolicy {
  symbolUniverse: string[];
  baseUrl: string;
  intervalMs: number;
  maxRiskUsd: number;
  maxNotionalUsd: number;
  entryOffsetBps: number;
  stopDistanceBps: number;
  retryMaxAttempts: number;
  retryBudgetPerHour: number;
}

function nextSymbol(universe: string[], cycle: number): string {
  return universe[cycle % universe.length] ?? "BTC-USDT";
}

function baseRiskContext(symbol: string, markPrice: number): RiskContext {
  const now = new Date().toISOString();
  return {
    account: {
      equityUsd: 50,
      currentDailyLossUsd: 0.1,
      currentWeeklyLossUsd: 0.5,
      currentOpenExposureUsd: 2,
      asOf: now
    },
    instrument: {
      symbol,
      minSz: 0.0001,
      lotSz: 0.0001,
      tickSz: 0.1
    },
    market: {
      markPrice,
      asOf: now
    },
    ordersAsOf: now,
    limits: {
      maxPerTradeRiskUsd: 0.5,
      maxDailyLossUsd: 1,
      maxWeeklyLossUsd: 2.5,
      maxOpenExposureUsd: 15
    },
    policy: {
      allowedSymbols: [symbol],
      maxNotionalUsd: 20,
      executionMode: "proposal_only"
    }
  };
}

export class RuntimeWorkerManager {
  private intervalRef: ReturnType<typeof setInterval> | undefined;
  private cycle = 0;
  private retryUsedInWindow = 0;
  private retryWindowStartEpoch = Date.now();

  constructor(private readonly callbacks: WorkerCallbacks, private readonly policy: WorkerPolicy) {}

  start(): void {
    if (this.intervalRef) {
      return;
    }
    this.intervalRef = setInterval(() => {
      void this.runCycle();
    }, this.policy.intervalMs);
  }

  pause(): void {
    if (!this.intervalRef) {
      return;
    }
    clearInterval(this.intervalRef);
    this.intervalRef = undefined;
  }

  stop(): void {
    this.pause();
    this.callbacks.onStateUpdate({ cycleProgress: 0 });
  }

  private async runCycle(): Promise<void> {
    const state = this.callbacks.getState();
    if (state.state !== "running") {
      return;
    }

    try {
      const symbol = nextSymbol(this.policy.symbolUniverse, this.cycle);
      this.callbacks.onStateUpdate({ cycleProgress: 10, activeSymbol: symbol, lastHeartbeatAt: new Date().toISOString() });

      const market = await this.fetchWithRetryBudget(symbol);
      const built = buildValidSpotProposal(market, {
        symbol,
        side: "buy",
        maxRiskUsd: this.policy.maxRiskUsd,
        maxNotionalUsd: this.policy.maxNotionalUsd,
        entryOffsetBps: this.policy.entryOffsetBps,
        stopDistanceBps: this.policy.stopDistanceBps
      });

      await this.callbacks.onEvent(
        createEvent("ProposalCreated", symbol, `Worker proposal created ${built.proposal.proposalId}`, "info", ["worker_cycle"])
      );

      const context = baseRiskContext(symbol, market.last);
      const decision = evaluateTradeProposal(built.proposal as TradeProposal, context);
      await this.callbacks.onEvent(
        createEvent(
          "GatekeeperDecision",
          symbol,
          decision.status === "APPROVE" ? "Gatekeeper approved worker proposal" : "Gatekeeper rejected worker proposal",
          decision.status === "APPROVE" ? "info" : "warn",
          [decision.status === "APPROVE" ? "gatekeeper_approve" : "gatekeeper_reject"]
        )
      );

      if (decision.status === "APPROVE") {
        await this.callbacks.onEvent(
          createEvent("ProposalApproved", symbol, "Proposal moved to approval queue (proposal-only mode)", "info", ["worker_cycle"])
        );
      }

      this.cycle += 1;
      this.callbacks.onStateUpdate({
        cycleProgress: 0,
        cycleCount: this.cycle,
        activeSymbol: symbol,
        lastHeartbeatAt: new Date().toISOString()
      });
    } catch (error: unknown) {
      await this.callbacks.onEvent(
        createEvent(
          "Error",
          this.callbacks.getState().activeSymbol,
          `Worker cycle failed: ${error instanceof Error ? error.message : String(error)}`,
          "error",
          ["worker_cycle_error"]
        )
      );
      this.callbacks.onStateUpdate({ lastHeartbeatAt: new Date().toISOString() });
    }
  }

  private resetRetryWindowIfNeeded(): void {
    const now = Date.now();
    if (now - this.retryWindowStartEpoch >= 60 * 60 * 1000) {
      this.retryWindowStartEpoch = now;
      this.retryUsedInWindow = 0;
    }
  }

  private async fetchWithRetryBudget(symbol: string) {
    this.resetRetryWindowIfNeeded();
    const maxAttempts = Math.max(1, this.policy.retryMaxAttempts);
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await fetchSpotMarketInputs(symbol, this.policy.baseUrl);
      } catch (error: unknown) {
        if (attempt >= maxAttempts) {
          throw error;
        }
        if (this.retryUsedInWindow >= this.policy.retryBudgetPerHour) {
          throw new Error("Retry budget exhausted for worker market data fetch.");
        }
        this.retryUsedInWindow += 1;
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
    throw new Error("Worker retry exhausted.");
  }
}
