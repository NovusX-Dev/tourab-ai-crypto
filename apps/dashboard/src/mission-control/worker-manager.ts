import type { BotEvent, BotStateSnapshot, ExecutionIntent, RiskContext, TradeProposal } from "@tourab/shared";
import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import { buildValidSpotProposal, fetchSpotMarketInputs, SpotMarketInputs } from "../proposal-helper.js";
import { createEvent } from "./event-factory.js";

interface WorkerCallbacks {
  onEvent: (event: BotEvent) => Promise<void>;
  onStateUpdate: (next: Partial<BotStateSnapshot>) => void;
  getState: () => BotStateSnapshot;
  queueDemoExecutionApproval: (input: {
    symbol: string;
    proposal: TradeProposal;
    context: RiskContext;
    intent: ExecutionIntent;
  }) => Promise<{ queued: boolean; approvalId?: string; reason?: string }>;
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
  executionMode: "proposal_only" | "demo_execution_enabled";
}

function nextSymbol(universe: string[], cycle: number): string {
  return universe[cycle % universe.length] ?? "BTC-USDT";
}

function baseRiskContext(
  market: SpotMarketInputs,
  maxNotionalUsd: number,
  executionMode: "proposal_only" | "demo_execution_enabled"
): RiskContext {
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
      symbol: market.symbol,
      minSz: market.minSz,
      lotSz: market.lotSz,
      tickSz: market.tickSz
    },
    market: {
      markPrice: market.last,
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
      allowedSymbols: [market.symbol],
      maxNotionalUsd,
      executionMode
    }
  };
}

function gatekeeperReason(decision: ReturnType<typeof evaluateTradeProposal>): string {
  if (decision.status === "APPROVE") {
    return "Gatekeeper approved worker proposal";
  }
  const violations = decision.violations.map((item) => `${item.code}: ${item.message}`);
  if (violations.length === 0) {
    return "Gatekeeper rejected worker proposal";
  }
  return `Gatekeeper rejected worker proposal: ${violations.join(" | ")}`;
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

      const context = baseRiskContext(market, this.policy.maxNotionalUsd, this.policy.executionMode);
      const decision = evaluateTradeProposal(built.proposal as TradeProposal, context);
      await this.callbacks.onEvent(
        createEvent(
          "GatekeeperDecision",
          symbol,
          gatekeeperReason(decision),
          decision.status === "APPROVE" ? "info" : "warn",
          [decision.status === "APPROVE" ? "gatekeeper_approve" : "gatekeeper_reject"]
        )
      );

      if (decision.status === "APPROVE" && decision.executionIntent) {
        if (this.policy.executionMode === "demo_execution_enabled") {
          const queued = await this.callbacks.queueDemoExecutionApproval({
            symbol,
            proposal: built.proposal as TradeProposal,
            context,
            intent: decision.executionIntent
          });
          const message = queued.queued
            ? `Proposal queued for human approval (${queued.approvalId}) before demo order submit`
            : `Proposal approved but not queued for demo execution: ${queued.reason ?? "unknown reason"}`;
          await this.callbacks.onEvent(
            createEvent("ProposalApproved", symbol, message, queued.queued ? "info" : "warn", ["worker_cycle", "approval_created"])
          );
        } else {
          await this.callbacks.onEvent(
            createEvent("ProposalApproved", symbol, "Proposal moved to approval queue (proposal-only mode)", "info", ["worker_cycle"])
          );
        }
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
