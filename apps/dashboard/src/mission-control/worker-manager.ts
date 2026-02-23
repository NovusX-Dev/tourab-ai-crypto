import type { BotEvent, BotStateSnapshot, ExecutionIntent, RiskContext, TradeProposal } from "@tourab/shared";
import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import { buildValidSpotProposal, fetchSpotMarketInputs, SpotMarketInputs } from "../proposal-helper.js";
import { createEvent } from "./event-factory.js";

interface WorkerCallbacks {
  onEvent: (event: BotEvent) => Promise<void>;
  onStateUpdate: (next: Partial<BotStateSnapshot>) => void;
  getState: () => BotStateSnapshot;
  evaluateSymbolEligibility?: (
    symbol: string,
    nowIso: string
  ) => Promise<{ eligible: boolean; reason?: string }>;
  queueDemoExecutionApproval: (input: {
    symbol: string;
    proposal: TradeProposal;
    context: RiskContext;
    intent: ExecutionIntent;
  }) => Promise<{ queued: boolean; approvalId?: string; reason?: string }>;
}

export interface WorkerSymbolOverride {
  enabled?: boolean;
  side?: "buy" | "sell";
  maxNotionalUsd?: number;
  entryOffsetBps?: number;
  stopDistanceBps?: number;
  minBandDistanceBps?: number;
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
  defaultSide?: "buy" | "sell";
  symbolOverrides?: Record<string, WorkerSymbolOverride>;
  blockedUtcHoursBySymbol?: Record<string, number[]>;
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

function choosePositiveNumber(candidate: number | undefined, fallback: number): number {
  if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate <= 0) {
    return fallback;
  }
  return candidate;
}

function normalizeHour(value: number): number | undefined {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  const hour = Math.floor(value);
  if (hour < 0 || hour > 23) {
    return undefined;
  }
  return hour;
}

function isBlockedUtcHour(policy: WorkerPolicy, symbol: string, now: Date): boolean {
  const rawHours = policy.blockedUtcHoursBySymbol?.[symbol];
  if (!rawHours || rawHours.length === 0) {
    return false;
  }
  const hour = now.getUTCHours();
  return rawHours.some((item) => normalizeHour(item) === hour);
}

function distanceToBandBps(market: SpotMarketInputs, side: "buy" | "sell"): number | undefined {
  if (!Number.isFinite(market.last) || market.last <= 0) {
    return undefined;
  }
  if (side === "buy") {
    if (!Number.isFinite(market.buyLmt) || (market.buyLmt ?? 0) <= 0) {
      return undefined;
    }
    return ((market.buyLmt! - market.last) / market.last) * 10_000;
  }
  if (!Number.isFinite(market.sellLmt) || (market.sellLmt ?? 0) <= 0) {
    return undefined;
  }
  return ((market.last - market.sellLmt!) / market.last) * 10_000;
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
      const now = new Date();
      const nowIso = now.toISOString();
      this.callbacks.onStateUpdate({ cycleProgress: 10, activeSymbol: symbol, lastHeartbeatAt: nowIso });

      if (isBlockedUtcHour(this.policy, symbol, now)) {
        await this.callbacks.onEvent(
          createEvent("RiskLimitHit", symbol, `Worker blocked by UTC time-window guard for ${symbol}`, "warn", [
            "worker_cycle",
            "time_window_guard"
          ])
        );
        this.cycle += 1;
        this.callbacks.onStateUpdate({
          cycleProgress: 0,
          cycleCount: this.cycle,
          activeSymbol: symbol,
          lastHeartbeatAt: new Date().toISOString()
        });
        return;
      }

      if (this.callbacks.evaluateSymbolEligibility) {
        const eligibility = await this.callbacks.evaluateSymbolEligibility(symbol, nowIso);
        if (!eligibility.eligible) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker symbol quality gate blocked ${symbol}: ${eligibility.reason ?? "blocked by policy"}`,
              "warn",
              ["worker_cycle", "symbol_quality_gate"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
      }

      const symbolOverride = this.policy.symbolOverrides?.[symbol];
      if (symbolOverride?.enabled === false) {
        await this.callbacks.onEvent(
          createEvent("RiskLimitHit", symbol, `Worker symbol disabled by override policy: ${symbol}`, "warn", [
            "worker_cycle",
            "symbol_override"
          ])
        );
        this.cycle += 1;
        this.callbacks.onStateUpdate({
          cycleProgress: 0,
          cycleCount: this.cycle,
          activeSymbol: symbol,
          lastHeartbeatAt: new Date().toISOString()
        });
        return;
      }

      const side = symbolOverride?.side ?? this.policy.defaultSide ?? "buy";
      const maxNotionalUsd = choosePositiveNumber(symbolOverride?.maxNotionalUsd, this.policy.maxNotionalUsd);
      const entryOffsetBps = choosePositiveNumber(symbolOverride?.entryOffsetBps, this.policy.entryOffsetBps);
      const stopDistanceBps = choosePositiveNumber(symbolOverride?.stopDistanceBps, this.policy.stopDistanceBps);
      const minBandDistanceBps = choosePositiveNumber(symbolOverride?.minBandDistanceBps, 0);

      const market = await this.fetchWithRetryBudget(symbol);
      if (minBandDistanceBps > 0) {
        const bps = distanceToBandBps(market, side);
        if (typeof bps === "number" && bps < minBandDistanceBps) {
          await this.callbacks.onEvent(
            createEvent(
              "RiskLimitHit",
              symbol,
              `Worker blocked by entry band-distance filter (${bps.toFixed(2)}bps < ${minBandDistanceBps.toFixed(2)}bps)`,
              "warn",
              ["worker_cycle", "entry_band_filter"]
            )
          );
          this.cycle += 1;
          this.callbacks.onStateUpdate({
            cycleProgress: 0,
            cycleCount: this.cycle,
            activeSymbol: symbol,
            lastHeartbeatAt: new Date().toISOString()
          });
          return;
        }
      }
      const built = buildValidSpotProposal(market, {
        symbol,
        side,
        maxRiskUsd: this.policy.maxRiskUsd,
        maxNotionalUsd,
        entryOffsetBps,
        stopDistanceBps
      });

      await this.callbacks.onEvent(
        createEvent("ProposalCreated", symbol, `Worker proposal created ${built.proposal.proposalId}`, "info", ["worker_cycle"])
      );

      const context = baseRiskContext(market, maxNotionalUsd, this.policy.executionMode);
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
