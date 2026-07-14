import { createServer } from "node:http";
import type { IncomingMessage, Server } from "node:http";
import { readdir, readFile } from "node:fs/promises";
import process from "node:process";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import express, { type Request, type Response } from "express";
import { WebSocketServer, type WebSocket } from "ws";
import type {
  AlertItem,
  AuditItem,
  ApprovalRequest,
  ApiErrorPayload,
  BotEvent,
  BotMode,
  ClosedTradeFeatureRecord,
  ControlAction,
  ControlActionResponse,
  DemoQueuedIntent,
  DashboardSnapshot,
  ExecutionIntent,
  ExchangeMode,
  ExchangeStatus,
  EventQuery,
  IncidentItem,
  LearningFeatureSnapshot,
  LearningGovernanceState,
  OpenOrdersStatus,
  OpsMetrics,
  PortfolioStatus,
  PortfolioPerformance,
  ReconciliationStatus,
  TradePnlItem,
  TradeProposal,
  UserRole,
  WsMessage
} from "@tourab/shared";
import { OkxApiError, loadOkxDemoConfigFromEnv, OkxDemoAdapter, type OkxFillRecord } from "@tourab/okx-demo-adapter";
import { authRoleMiddleware, type AuthenticatedRequest } from "./mission-control/auth.js";
import { ApprovalStore } from "./mission-control/approval-store.js";
import { EventBus } from "./mission-control/event-bus.js";
import { createEvent } from "./mission-control/event-factory.js";
import { JsonlAlertStore } from "./mission-control/jsonl-alert-store.js";
import { canRoleExecuteAction } from "./mission-control/policy.js";
import { controlRateLimiter } from "./mission-control/rate-limit.js";
import { RuntimeLifecycleManager } from "./mission-control/runtime-lifecycle-manager.js";
import { SqliteEventStore } from "./mission-control/sqlite-event-store.js";
import { SqliteOpsStore, type ManagedTradeRecord } from "./mission-control/sqlite-ops-store.js";
import {
  RuntimeWorkerManager,
  type WorkerMarketIntelligenceSnapshot,
  type WorkerSidePreference,
  type WorkerSymbolOverride
} from "./mission-control/worker-manager.js";
import { monitorTradeThesis, type TradingTradePlan } from "./mission-control/trading-intelligence.js";
import { createSignedAccessToken, verifySignedAccessToken } from "./mission-control/auth.js";
import { evaluateDemoPolicyAutoReadiness } from "./autonomy-rollout.js";
import { loadEnvFromProjectRoot } from "./env-loader.js";
import { fetchMarketIntelligenceSnapshot } from "./mission-control/market-intelligence.js";
import { computeSpotEntryPrice, fetchSpotMarketInputs } from "./proposal-helper.js";

// Load local .env defaults for standalone `mission-control:server` runs.
loadEnvFromProjectRoot(process.cwd(), { override: true });

const DEFAULT_PORT = Number(process.env.TOURAB_MISSION_CONTROL_PORT ?? "7071");
const DEFAULT_EVENT_STORE_PATH = process.env.TOURAB_EVENT_STORE_PATH ?? "logs/mission-events.sqlite";
const DEFAULT_ALERT_STORE_PATH = process.env.TOURAB_ALERT_STORE_PATH ?? "logs/mission-alerts.jsonl";
const DEFAULT_M5_EVIDENCE_DIR = "logs";
const REPLAY_DEFAULT = 200;
const DEFAULT_DRIFT_CIRCUIT_ACTION = (process.env.TOURAB_DRIFT_CIRCUIT_ACTION ?? "pause") as "pause" | "stop";
const DEFAULT_STREAM_RETENTION_MS = 15 * 60_000;
const DEFAULT_STREAM_RETENTION_SWEEP_MS = 60_000;
const DEFAULT_OPS_TRADE_RETENTION_MS = 90 * 24 * 60 * 60_000;
const HEARTBEAT_CHECKPOINT_MESSAGE = "Heartbeat checkpoint";
const WORKER_STALL_ALERT_CODE = "WORKER_STALLED_NO_PROPOSAL";
const DEFAULT_AUTO_EXIT_MAX_HOLD_SEC = 30 * 60;
const DEFAULT_AUTO_EXIT_TP_R_MULTIPLE = 1.5;
const DEFAULT_AUTO_EXIT_EXIT_OFFSET_BPS = 5;
const DEFAULT_AUTO_EXIT_STALE_TIMEOUT_SEC = 45;
const DEFAULT_ENTRY_STALE_TIMEOUT_SEC = 60;
const DEFAULT_AUTO_EXIT_MAX_REPRICES = 8;
const DEFAULT_AUTO_EXIT_FORCE_FLATTEN_BPS = 30;
const DEFAULT_ENTRY_AUTONOMY_POLICY_VERSION = "m6-policy-v1";
const DEFAULT_ENTRY_AUTONOMY_STRATEGY_VERSION = "btc-trend-pullback-v2";
const DEFAULT_BTC_STRATEGY_VERSION = "btc-trend-pullback-v2";
const DEFAULT_ETH_STRATEGY_VERSION = "eth-beta-confirm-v1";
const DEFAULT_STRATEGY_MAX_DAILY_LOSS_USD = 5;
const DEFAULT_STRATEGY_MAX_DRAWDOWN_PCT = -5;
const DEFAULT_STRATEGY_MAX_CONSEC_LOSSES = 4;
const DEFAULT_LEARNING_MODEL_VERSION = "m7-baseline-v1";
const DEFAULT_LEARNING_FEATURE_SCHEMA_VERSION = "m7-closed-trade-v4";
const DEFAULT_ENTRY_MAX_REPRICE_COUNT = 1;
const DEFAULT_ENTRY_REPRICE_MIN_CONFIDENCE = 85;
const DEFAULT_LEARNING_ALERT_LOOKBACK_DAYS = 30;
const DEFAULT_LEARNING_ALERT_LIMIT = 2000;
const DEFAULT_LEARNING_ALERT_MIN_TRADES = 15;
const DEFAULT_LEARNING_ALERT_EXPECTANCY_MIN_USD = 0;
const DEFAULT_LEARNING_ALERT_MAX_DRAWDOWN_PCT = 5;
const DEFAULT_LEARNING_ALERT_MAX_SLIPPAGE_BPS = 15;
const DEFAULT_LEARNING_ALERT_MAX_CONTROL_VIOLATION_RATE_PCT = 20;
const DEFAULT_LEARNING_ALERT_CHECK_INTERVAL_MS = 60_000;
const DEFAULT_AUTO_PAUSE_MAX_MINUTES = 180;
const DEFAULT_AUTO_PAUSE_CHECK_INTERVAL_MS = 15_000;
const DEFAULT_WORKER_SYMBOL_QUALITY_LOOKBACK_TRADES = 120;
const DEFAULT_WORKER_SYMBOL_QUALITY_MIN_TRADES = 20;
const DEFAULT_WORKER_SYMBOL_MIN_EXPECTANCY_USD = 0;
const DEFAULT_WORKER_SYMBOL_MAX_CONSECUTIVE_LOSSES = 12;
const DEFAULT_WORKER_SYMBOL_COOLDOWN_MINUTES = 120;
const DEFAULT_WORKER_SIGNAL_LOOKBACK_SEC = 180;
const DEFAULT_WORKER_SIGNAL_SHORT_LOOKBACK_SEC = 45;
const DEFAULT_WORKER_SIGNAL_MIN_MOVE_BPS = 0;
const DEFAULT_WORKER_SIGNAL_MIN_VOLATILITY_BPS = 3;
const DEFAULT_WORKER_SIGNAL_ROUND_TRIP_FEE_BPS = 16;
const DEFAULT_WORKER_QUIET_REGIME_TREND_EFFICIENCY_MIN = 8;
const DEFAULT_WORKER_QUIET_REGIME_MOVE_THRESHOLD_MULTIPLIER = 1;
const DEFAULT_WORKER_BUY_TREND_STRENGTH_MULTIPLIER = 1;
const DEFAULT_WORKER_SELL_TREND_STRENGTH_MULTIPLIER = 1;
const DEFAULT_WORKER_BUY_SHORT_MOVE_CONFIRMATION_BPS = 0;
const DEFAULT_WORKER_SELL_SHORT_MOVE_CONFIRMATION_BPS = 0;
const DEFAULT_WORKER_BUY_ENTRY_OFFSET_MULTIPLIER = 1;
const DEFAULT_WORKER_SELL_ENTRY_OFFSET_MULTIPLIER = 1;
const DEFAULT_WORKER_EXPECTED_MOVE_HURDLE_ENABLED = false;
const DEFAULT_WORKER_EXPECTED_MOVE_TP_R_MULTIPLE = 1;
const DEFAULT_WORKER_EXPECTED_MOVE_FEE_COVERAGE_MULTIPLE = 1;
const DEFAULT_WORKER_EXPECTED_MOVE_MIN_NET_EDGE_BPS = 0;
const DEFAULT_WORKER_MARKET_INTELLIGENCE_MIN_CONFIDENCE = 0;
const DEFAULT_WORKER_MARKET_INTELLIGENCE_MAX_SPREAD_BPS = 10;
const DEFAULT_WORKER_REQUIRE_MARKET_INTELLIGENCE_ALIGNMENT = false;
const DEFAULT_WORKER_BLOCK_CHOP_REGIMES = false;
const DEFAULT_WORKER_MAX_MOVE_BUDGET_USAGE_PCT = 100;
const DEFAULT_POLICY_AUTO_MAX_OPEN_TRADES_PER_SYMBOL = 1;
const DEFAULT_WORKER_TRADE_SIDE_LOOKBACK_TRADES = 30;
const DEFAULT_WORKER_TRADE_SIDE_MIN_TRADES = 8;
const DEFAULT_WORKER_TRADE_SIDE_MIN_EXPECTANCY_USD = 0;
const DEFAULT_WORKER_TRADE_SIDE_MAX_TIME_STOP_RATE_PCT = 85;
const NON_RESTING_EXIT_MISS_GRACE_MS = 2_000;
const DEFAULT_WORKER_SOL_MIN_EXPECTANCY_USD = -0.015;
const DEFAULT_WORKER_SOL_MAX_CONSECUTIVE_LOSSES = 5;
const DEFAULT_WORKER_SOL_COOLDOWN_MINUTES = 360;
const DEFAULT_WORKER_SOL_MIN_TRADES = 20;
const DEFAULT_WORKER_SOL_FAIL_CLOSED_ON_INSUFFICIENT_TRADES = true;
const DEFAULT_WORKER_SOL_MAX_NOTIONAL_USD = 4;
const DEFAULT_WORKER_SOL_ENTRY_OFFSET_BPS = 12;
const DEFAULT_WORKER_SOL_STOP_DISTANCE_BPS = 90;
const DEFAULT_WORKER_SOL_MIN_BAND_DISTANCE_BPS = 25;
const DEFAULT_SOL_AUTO_EXIT_MAX_HOLD_SEC = 8 * 60;
const DEFAULT_SOL_AUTO_EXIT_TP_R_MULTIPLE = 1.1;
const DEFAULT_SOL_AUTO_EXIT_OFFSET_BPS = 1;
const DEFAULT_SOL_AUTO_EXIT_FORCE_FLATTEN_BPS = 12;
const EXECUTION_EVENT_TYPES = new Set<BotEvent["type"]>([
  "ProposalCreated",
  "GatekeeperDecision",
  "ProposalApproved",
  "OrderSubmitted",
  "OrderFilled",
  "OrderCancelled",
  "RiskLimitHit",
  "Error"
]);

export function normalizeHeartbeatEventSemantics(event: BotEvent): BotEvent {
  if (event.message !== HEARTBEAT_CHECKPOINT_MESSAGE || !EXECUTION_EVENT_TYPES.has(event.type)) {
    return event;
  }
  return {
    ...event,
    type: "System",
    severity: "info",
    tags: [...(event.tags ?? []), "heartbeat", "semantic_sanitized", `original_type:${event.type}`]
  };
}

function parseBoundedInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.floor(value);
  return Math.max(min, Math.min(max, rounded));
}

function parseBoundedNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(raw: string | number | undefined): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeDrawdownPct(maxDrawdownUsd: number, peak: number): number {
  if (!Number.isFinite(maxDrawdownUsd) || !Number.isFinite(peak) || peak <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (maxDrawdownUsd / peak) * 100));
}

function parseBooleanEnv(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) {
    return fallback;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }
  return fallback;
}

function parseCsvEnv(raw: string | undefined, fallback: string[]): string[] {
  const items = (raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : fallback;
}

function parseAutoPauseScope(raw: string | undefined): AutoPauseScope {
  if (raw === "demo" || raw === "live" || raw === "both") {
    return raw;
  }
  return "both";
}

function parseWorkerSymbolOverrides(raw: string | undefined): Record<string, WorkerSymbolOverride> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, WorkerSymbolOverride>;
    const output: Record<string, WorkerSymbolOverride> = {};
    for (const [symbol, value] of Object.entries(parsed ?? {})) {
      const key = symbol.trim().toUpperCase();
      if (key.length === 0 || typeof value !== "object" || !value) {
        continue;
      }
      output[key] = value;
    }
    return output;
  } catch {
    return {};
  }
}

function parseWorkerBlockedUtcHours(raw: string | undefined): Record<string, number[]> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const output: Record<string, number[]> = {};
    for (const [symbol, value] of Object.entries(parsed ?? {})) {
      const key = symbol.trim().toUpperCase();
      if (key.length === 0 || !Array.isArray(value)) {
        continue;
      }
      const hours = value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
        .map((item) => Math.floor(item))
        .filter((item) => item >= 0 && item <= 23);
      output[key] = [...new Set(hours)];
    }
    return output;
  } catch {
    return {};
  }
}

function parseStrategyVersionBySymbol(raw: string | undefined): Record<string, string> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const output: Record<string, string> = {};
    for (const [symbol, value] of Object.entries(parsed ?? {})) {
      const key = symbol.trim().toUpperCase();
      const version = typeof value === "string" ? value.trim() : "";
      if (key.length === 0 || version.length === 0) {
        continue;
      }
      output[key] = version;
    }
    return output;
  } catch {
    return {};
  }
}

function buildDefaultStrategyVersionBySymbol(): Record<string, string> {
  return {
    "BTC-USDT": DEFAULT_BTC_STRATEGY_VERSION,
    "ETH-USDT": DEFAULT_ETH_STRATEGY_VERSION
  };
}

function parseWorkerSidePreference(raw: string | undefined, fallback: WorkerSidePreference): WorkerSidePreference {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === "buy" || normalized === "sell" || normalized === "auto") {
    return normalized;
  }
  return fallback;
}

export function evaluateWorkerSymbolQualityGate(input: {
  symbol: string;
  nowIso: string;
  features: ClosedTradeFeatureRecord[];
  config: WorkerSymbolQualityGateConfig;
}): WorkerSymbolGateDecision {
  if (!input.config.enabled) {
    return { eligible: true };
  }
  const symbol = input.symbol.trim().toUpperCase();
  const isSol = symbol === "SOL-USDT";
  const rule = isSol ? input.config.solRule : input.config.defaultRule;
  const requiredMinTrades =
    typeof rule.minTrades === "number" && Number.isFinite(rule.minTrades) && rule.minTrades > 0
      ? Math.floor(rule.minTrades)
      : input.config.minTrades;
  const scoped = input.features.filter((item) => item.symbol.toUpperCase() === symbol);
  if (scoped.length < requiredMinTrades) {
    if (isSol && rule.failClosedOnInsufficientTrades) {
      return {
        eligible: false,
        reason: `insufficient SOL evidence ${scoped.length}/${requiredMinTrades} (fail-closed)`
      };
    }
    return { eligible: true };
  }
  const expectancy = scoped.reduce((acc, item) => acc + item.realizedPnlUsd, 0) / scoped.length;
  if (expectancy < rule.minExpectancyUsd) {
    return {
      eligible: false,
      reason: `expectancy ${round6(expectancy)} < ${round6(rule.minExpectancyUsd)} (${scoped.length} trades)`
    };
  }
  let consecutiveLosses = 0;
  for (const row of scoped) {
    if (row.realizedPnlUsd < 0) {
      consecutiveLosses += 1;
      continue;
    }
    break;
  }
  if (consecutiveLosses >= rule.maxConsecutiveLosses) {
    const latestClosedEpoch = Date.parse(scoped[0]?.closedAt ?? "");
    const nowEpoch = Date.parse(input.nowIso);
    const cooldownMs = Math.max(0, rule.cooldownMinutes) * 60_000;
    const cooldownActive =
      Number.isFinite(latestClosedEpoch) &&
      Number.isFinite(nowEpoch) &&
      cooldownMs > 0 &&
      nowEpoch - latestClosedEpoch < cooldownMs;
    if (cooldownActive) {
      return {
        eligible: false,
        reason: `cooldown active after ${consecutiveLosses} consecutive losses (threshold=${rule.maxConsecutiveLosses})`
      };
    }
    return {
      eligible: false,
      reason: `consecutive losses ${consecutiveLosses} >= ${rule.maxConsecutiveLosses}`
    };
  }
  return { eligible: true };
}

export function evaluateWorkerTradeSideGate(input: {
  symbol: string;
  side: "buy" | "sell";
  features: ClosedTradeFeatureRecord[];
  config: WorkerTradeSideGateConfig;
}): WorkerSymbolGateDecision {
  if (!input.config.enabled) {
    return { eligible: true };
  }
  const symbol = input.symbol.trim().toUpperCase();
  const scoped = input.features
    .filter((item) => item.symbol.toUpperCase() === symbol && item.entrySide === input.side)
    .slice(0, input.config.lookbackTrades);
  if (scoped.length < input.config.minTrades) {
    return { eligible: true };
  }
  const expectancy = scoped.reduce((acc, item) => acc + item.realizedPnlUsd, 0) / scoped.length;
  if (expectancy < input.config.minExpectancyUsd) {
    return {
      eligible: false,
      reason: `side expectancy ${round6(expectancy)} < ${round6(input.config.minExpectancyUsd)} over ${scoped.length} ${input.side} trades`
    };
  }
  const timeStopRatePct =
    (scoped.filter((item) => item.exitReason === "time_stop").length / Math.max(1, scoped.length)) * 100;
  if (expectancy <= 0 && timeStopRatePct > input.config.maxTimeStopRatePct) {
    return {
      eligible: false,
      reason: `time_stop rate ${round6(timeStopRatePct)}% > ${round6(input.config.maxTimeStopRatePct)}% with non-positive expectancy over ${scoped.length} ${input.side} trades`
    };
  }
  return { eligible: true };
}

function parseFlattenTimeUtc(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const normalized = raw.trim();
  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    return undefined;
  }
  const [hhRaw, mmRaw] = normalized.split(":");
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return undefined;
  }
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function nextFlattenAtIso(flattenTimeUtc: string | undefined, nowIso = new Date().toISOString()): string | undefined {
  if (!flattenTimeUtc) {
    return undefined;
  }
  const [hhRaw, mmRaw] = flattenTimeUtc.split(":");
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
    return undefined;
  }
  const now = new Date(nowIso);
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm, 0, 0));
  if (candidate.getTime() <= now.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate.toISOString();
}

function toManagedTrade(record: ManagedTradeRecord): ManagedTrade {
  return {
    tradeId: record.tradeId,
    status: record.status as ManagedTradeStatus,
    symbol: record.symbol,
    entrySide: record.entrySide,
    entryOrdId: record.entryOrdId,
    entryClOrdId: record.entryClOrdId,
    requestedQty: record.requestedQty,
    entryLimitPrice: record.entryLimitPrice,
    entrySubmittedAt: record.entrySubmittedAt,
    entryFirstFilledAt: record.entryFirstFilledAt,
    entryRepriceCount: record.entryRepriceCount ?? 0,
    entryFilledQty: record.entryFilledQty,
    entryAvgPrice: record.entryAvgPrice,
    exitOrdId: record.exitOrdId,
    exitClOrdId: record.exitClOrdId,
    exitFilledQty: record.exitFilledQty,
    exitAvgPrice: record.exitAvgPrice,
    remainingQty: record.remainingQty,
    exitReason: record.exitReason as ExitReason | undefined,
    stopPrice: record.stopPrice,
    takeProfitPrice: record.takeProfitPrice,
    maxHoldSec: record.maxHoldSec,
    flattenAt: record.flattenAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    closedAt: record.closedAt,
    feeUsd: record.feeUsd,
    realizedPnlUsd: record.realizedPnlUsd,
    exitSubmittedAt: record.exitSubmittedAt,
    exitRepriceCount: record.exitRepriceCount,
    forcedFlattenEscalated: record.forcedFlattenEscalated,
    requestedNotionalUsd: record.requestedNotionalUsd,
    approvalModeAtDecision: record.approvalModeAtDecision,
    policyVersionAtDecision: record.policyVersionAtDecision,
    strategyVersionAtDecision: record.strategyVersionAtDecision,
    modelVersionAtDecision: record.modelVersionAtDecision,
    intelligenceVersionAtDecision: record.intelligenceVersionAtDecision,
    playbookIdAtDecision: record.playbookIdAtDecision,
    entryStyleAtDecision: record.entryStyleAtDecision,
    thesisSummaryAtDecision: record.thesisSummaryAtDecision,
    invalidationSummaryAtDecision: record.invalidationSummaryAtDecision,
    thesisConfidenceScoreAtDecision: record.thesisConfidenceScoreAtDecision,
    tradeabilityScoreAtDecision: record.tradeabilityScoreAtDecision,
    entryOffsetBps: record.entryOffsetBps,
    stopDistanceBps: record.stopDistanceBps,
    takeProfitRMultiple: record.takeProfitRMultiple
    ,
    marketRegimeAtDecision: record.marketRegimeAtDecision,
    signalConfidenceScoreAtDecision: record.signalConfidenceScoreAtDecision,
    trendAlignmentScoreAtDecision: record.trendAlignmentScoreAtDecision,
    move1mBpsAtDecision: record.move1mBpsAtDecision,
    move5mBpsAtDecision: record.move5mBpsAtDecision,
    move15mBpsAtDecision: record.move15mBpsAtDecision,
    realizedVolatilityBpsAtDecision: record.realizedVolatilityBpsAtDecision,
    spreadBpsAtDecision: record.spreadBpsAtDecision,
    orderBookImbalancePctAtDecision: record.orderBookImbalancePctAtDecision
  };
}

function toManagedTradeRecord(trade: ManagedTrade): ManagedTradeRecord {
  return {
    tradeId: trade.tradeId,
    status: trade.status,
    symbol: trade.symbol,
    entrySide: trade.entrySide,
    entryOrdId: trade.entryOrdId,
    entryClOrdId: trade.entryClOrdId,
    requestedQty: trade.requestedQty,
    entryLimitPrice: trade.entryLimitPrice,
    entrySubmittedAt: trade.entrySubmittedAt,
    entryFirstFilledAt: trade.entryFirstFilledAt,
    entryRepriceCount: trade.entryRepriceCount,
    entryFilledQty: trade.entryFilledQty,
    entryAvgPrice: trade.entryAvgPrice,
    exitOrdId: trade.exitOrdId,
    exitClOrdId: trade.exitClOrdId,
    exitFilledQty: trade.exitFilledQty,
    exitAvgPrice: trade.exitAvgPrice,
    remainingQty: trade.remainingQty,
    exitReason: trade.exitReason,
    stopPrice: trade.stopPrice,
    takeProfitPrice: trade.takeProfitPrice,
    maxHoldSec: trade.maxHoldSec,
    flattenAt: trade.flattenAt,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
    closedAt: trade.closedAt,
    feeUsd: trade.feeUsd,
    realizedPnlUsd: trade.realizedPnlUsd,
    exitSubmittedAt: trade.exitSubmittedAt,
    exitRepriceCount: trade.exitRepriceCount,
    forcedFlattenEscalated: trade.forcedFlattenEscalated,
    requestedNotionalUsd: trade.requestedNotionalUsd,
    approvalModeAtDecision: trade.approvalModeAtDecision,
    policyVersionAtDecision: trade.policyVersionAtDecision,
    strategyVersionAtDecision: trade.strategyVersionAtDecision,
    modelVersionAtDecision: trade.modelVersionAtDecision,
    intelligenceVersionAtDecision: trade.intelligenceVersionAtDecision,
    playbookIdAtDecision: trade.playbookIdAtDecision,
    entryStyleAtDecision: trade.entryStyleAtDecision,
    thesisSummaryAtDecision: trade.thesisSummaryAtDecision,
    invalidationSummaryAtDecision: trade.invalidationSummaryAtDecision,
    thesisConfidenceScoreAtDecision: trade.thesisConfidenceScoreAtDecision,
    tradeabilityScoreAtDecision: trade.tradeabilityScoreAtDecision,
    entryOffsetBps: trade.entryOffsetBps,
    stopDistanceBps: trade.stopDistanceBps,
    takeProfitRMultiple: trade.takeProfitRMultiple
    ,
    marketRegimeAtDecision: trade.marketRegimeAtDecision,
    signalConfidenceScoreAtDecision: trade.signalConfidenceScoreAtDecision,
    trendAlignmentScoreAtDecision: trade.trendAlignmentScoreAtDecision,
    move1mBpsAtDecision: trade.move1mBpsAtDecision,
    move5mBpsAtDecision: trade.move5mBpsAtDecision,
    move15mBpsAtDecision: trade.move15mBpsAtDecision,
    realizedVolatilityBpsAtDecision: trade.realizedVolatilityBpsAtDecision,
    spreadBpsAtDecision: trade.spreadBpsAtDecision,
    orderBookImbalancePctAtDecision: trade.orderBookImbalancePctAtDecision
  };
}

function toClosedTradeFeatureRecord(
  trade: ManagedTrade,
  input: {
    policyVersion: string;
    strategyVersion: string;
    modelVersion: string;
    extractedAt: string;
  }
): ClosedTradeFeatureRecord | undefined {
  if (
    trade.status !== "closed" ||
    !trade.closedAt ||
    !trade.exitReason ||
    trade.entryFilledQty <= 0 ||
    !Number.isFinite(Date.parse(trade.closedAt))
  ) {
    return undefined;
  }
  const holdStartIso = trade.entryFirstFilledAt ?? trade.entrySubmittedAt ?? trade.createdAt;
  const createdEpoch = Date.parse(holdStartIso);
  const closedEpoch = Date.parse(trade.closedAt);
  const holdSec =
    Number.isFinite(createdEpoch) && Number.isFinite(closedEpoch) && closedEpoch >= createdEpoch
      ? Math.max(0, Math.round((closedEpoch - createdEpoch) / 1000))
      : 0;
  const entryNotional = Math.max(0, trade.entryFilledQty * trade.entryAvgPrice);
  const requestedNotionalUsd =
    typeof trade.requestedNotionalUsd === "number" && Number.isFinite(trade.requestedNotionalUsd)
      ? Math.max(0, trade.requestedNotionalUsd)
      : Math.max(0, trade.requestedQty * Math.max(0, trade.entryAvgPrice));
  const grossPnlUsd = trade.realizedPnlUsd + Math.max(0, trade.feeUsd);
  const feeBps = entryNotional > 0 ? round6((trade.feeUsd / entryNotional) * 10_000) : 0;
  const grossPnlBps = entryNotional > 0 ? round6((grossPnlUsd / entryNotional) * 10_000) : 0;
  const realizedPnlBps = entryNotional > 0 ? round6((trade.realizedPnlUsd / entryNotional) * 10_000) : 0;
  const riskDistanceBps =
    trade.entryAvgPrice > 0 && trade.stopPrice > 0
      ? round6((Math.abs(trade.entryAvgPrice - trade.stopPrice) / trade.entryAvgPrice) * 10_000)
      : 0;
  const targetDistanceBps =
    trade.entryAvgPrice > 0 && trade.takeProfitPrice > 0
      ? round6((Math.abs(trade.takeProfitPrice - trade.entryAvgPrice) / trade.entryAvgPrice) * 10_000)
      : 0;
  return {
    tradeId: trade.tradeId,
    symbol: trade.symbol,
    entrySide: trade.entrySide,
    exitReason: trade.exitReason,
    status: "closed",
    closedAt: trade.closedAt,
    holdSec,
    entrySubmittedAt: trade.entrySubmittedAt,
    entryFirstFilledAt: trade.entryFirstFilledAt,
    entryFilledQty: round6(Math.max(0, trade.entryFilledQty)),
    exitFilledQty: round6(Math.max(0, trade.exitFilledQty)),
    entryAvgPrice: round6(Math.max(0, trade.entryAvgPrice)),
    exitAvgPrice: round6(Math.max(0, trade.exitAvgPrice)),
    requestedQty: round6(Math.max(0, trade.requestedQty)),
    requestedNotionalUsd: round6(requestedNotionalUsd),
    entryLimitPrice:
      typeof trade.entryLimitPrice === "number" && Number.isFinite(trade.entryLimitPrice) ? round6(trade.entryLimitPrice) : undefined,
    entryRepriceCount: Math.max(0, Math.floor(trade.entryRepriceCount)),
    approvalMode: trade.approvalModeAtDecision,
    stopPrice: round6(Math.max(0, trade.stopPrice)),
    takeProfitPrice: round6(Math.max(0, trade.takeProfitPrice)),
    maxHoldSecConfigured: Math.max(0, Math.floor(trade.maxHoldSec)),
    intelligenceVersion: trade.intelligenceVersionAtDecision,
    playbookId: trade.playbookIdAtDecision,
    entryStyle: trade.entryStyleAtDecision,
    thesisSummary: trade.thesisSummaryAtDecision,
    invalidationSummary: trade.invalidationSummaryAtDecision,
    thesisConfidenceScore:
      typeof trade.thesisConfidenceScoreAtDecision === "number" && Number.isFinite(trade.thesisConfidenceScoreAtDecision)
        ? round6(trade.thesisConfidenceScoreAtDecision)
        : undefined,
    tradeabilityScore:
      typeof trade.tradeabilityScoreAtDecision === "number" && Number.isFinite(trade.tradeabilityScoreAtDecision)
        ? round6(trade.tradeabilityScoreAtDecision)
        : undefined,
    entryOffsetBps:
      typeof trade.entryOffsetBps === "number" && Number.isFinite(trade.entryOffsetBps) ? round6(trade.entryOffsetBps) : undefined,
    stopDistanceBps:
      typeof trade.stopDistanceBps === "number" && Number.isFinite(trade.stopDistanceBps)
        ? round6(trade.stopDistanceBps)
        : undefined,
    takeProfitRMultiple:
      typeof trade.takeProfitRMultiple === "number" && Number.isFinite(trade.takeProfitRMultiple)
        ? round6(trade.takeProfitRMultiple)
        : undefined,
    marketRegime: trade.marketRegimeAtDecision,
    signalConfidenceScore:
      typeof trade.signalConfidenceScoreAtDecision === "number" && Number.isFinite(trade.signalConfidenceScoreAtDecision)
        ? round6(trade.signalConfidenceScoreAtDecision)
        : undefined,
    trendAlignmentScore:
      typeof trade.trendAlignmentScoreAtDecision === "number" && Number.isFinite(trade.trendAlignmentScoreAtDecision)
        ? round6(trade.trendAlignmentScoreAtDecision)
        : undefined,
    move1mBps:
      typeof trade.move1mBpsAtDecision === "number" && Number.isFinite(trade.move1mBpsAtDecision)
        ? round6(trade.move1mBpsAtDecision)
        : undefined,
    move5mBps:
      typeof trade.move5mBpsAtDecision === "number" && Number.isFinite(trade.move5mBpsAtDecision)
        ? round6(trade.move5mBpsAtDecision)
        : undefined,
    move15mBps:
      typeof trade.move15mBpsAtDecision === "number" && Number.isFinite(trade.move15mBpsAtDecision)
        ? round6(trade.move15mBpsAtDecision)
        : undefined,
    realizedVolatilityBps:
      typeof trade.realizedVolatilityBpsAtDecision === "number" && Number.isFinite(trade.realizedVolatilityBpsAtDecision)
        ? round6(trade.realizedVolatilityBpsAtDecision)
        : undefined,
    spreadBps:
      typeof trade.spreadBpsAtDecision === "number" && Number.isFinite(trade.spreadBpsAtDecision)
        ? round6(trade.spreadBpsAtDecision)
        : undefined,
    orderBookImbalancePct:
      typeof trade.orderBookImbalancePctAtDecision === "number" && Number.isFinite(trade.orderBookImbalancePctAtDecision)
        ? round6(trade.orderBookImbalancePctAtDecision)
        : undefined,
    riskDistanceBps,
    targetDistanceBps,
    feeUsd: round6(Math.max(0, trade.feeUsd)),
    feeBps,
    grossPnlUsd: round6(grossPnlUsd),
    grossPnlBps,
    realizedPnlUsd: round6(trade.realizedPnlUsd),
    realizedPnlBps,
    featureSchemaVersion: DEFAULT_LEARNING_FEATURE_SCHEMA_VERSION,
    policyVersion: trade.policyVersionAtDecision ?? input.policyVersion,
    strategyVersion: trade.strategyVersionAtDecision ?? input.strategyVersion,
    modelVersion: trade.modelVersionAtDecision ?? input.modelVersion,
    extractedAt: input.extractedAt
  };
}

function fillStatsForOrder(fills: OkxFillRecord[], ordId: string | undefined): { qty: number; avgPrice: number } {
  if (!ordId) {
    return { qty: 0, avgPrice: 0 };
  }
  let qty = 0;
  let notional = 0;
  for (const fill of fills) {
    if (fill.ordId !== ordId) {
      continue;
    }
    const q = Math.max(0, toFiniteNumber(fill.fillSz));
    const p = Math.max(0, toFiniteNumber(fill.fillPx));
    if (q <= 0 || p <= 0) {
      continue;
    }
    qty += q;
    notional += q * p;
  }
  return {
    qty: round6(qty),
    avgPrice: qty > 0 ? round6(notional / qty) : 0
  };
}

export function resolveManagedTradeMark(input: {
  streamMark?: number;
  marketLast?: number;
  cachedLast?: number;
  fallbackEntryAvgPrice?: number;
}): number | undefined {
  const candidates = [input.marketLast, input.cachedLast, input.streamMark, input.fallbackEntryAvgPrice];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }
  return undefined;
}

function dayStartIso(day: string): string {
  return `${day}T00:00:00.000Z`;
}

function asUtcDay(isoLike: string | undefined): string | undefined {
  if (!isoLike) {
    return undefined;
  }
  const epoch = Date.parse(isoLike);
  if (!Number.isFinite(epoch)) {
    return undefined;
  }
  return new Date(epoch).toISOString().slice(0, 10);
}

interface PositionAccumulator {
  qty: number;
  avgPrice: number;
}

interface PerformanceBuildInput {
  fills: OkxFillRecord[];
  marksBySymbol: Map<string, number>;
  feeRateBps: number;
  sessionStartEqUsd: number;
  currentEqUsd: number;
  exchangeTimezoneOffsetMinutes: number;
}

function dayKeyAtOffset(isoTs: string, offsetMinutes: number): string {
  const epoch = Date.parse(isoTs);
  if (!Number.isFinite(epoch)) {
    return new Date().toISOString().slice(0, 10);
  }
  const shifted = epoch + offsetMinutes * 60_000;
  return new Date(shifted).toISOString().slice(0, 10);
}

function formatUtcOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function summarizeDailyFromTrades(
  trades: TradePnlItem[],
  dayKey: string,
  offsetMinutes: number,
  unrealizedPnlUsd: number
): PortfolioPerformance["daily"] {
  let realizedPnlUsd = 0;
  let feesUsd = 0;
  let wins = 0;
  let losses = 0;
  for (const trade of trades) {
    if (dayKeyAtOffset(trade.ts, offsetMinutes) !== dayKey) {
      continue;
    }
    realizedPnlUsd += trade.realizedPnlUsd;
    feesUsd += trade.feeUsd;
    if (trade.realizedPnlUsd > 0) {
      wins += 1;
    } else if (trade.realizedPnlUsd < 0) {
      losses += 1;
    }
  }
  const closedTrades = wins + losses;
  return {
    day: dayKey,
    realizedPnlUsd: round6(realizedPnlUsd),
    unrealizedPnlUsd: round6(unrealizedPnlUsd),
    feesUsd: round6(feesUsd),
    winRate: closedTrades > 0 ? round6((wins / closedTrades) * 100) : 0,
    wins,
    losses,
    closedTrades
  };
}

function buildPerformanceFromFills(input: PerformanceBuildInput): {
  trades: TradePnlItem[];
  dailyUtc: PortfolioPerformance["daily"];
  dailyExchange: PortfolioPerformance["daily"];
  exchangeTimezoneLabel: string;
} {
  const fills = [...input.fills].sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  const positions = new Map<string, PositionAccumulator>();
  const trades: TradePnlItem[] = [];

  for (const fill of fills) {
    const qty = Math.max(0, toFiniteNumber(fill.fillSz));
    const price = Math.max(0, toFiniteNumber(fill.fillPx));
    if (qty <= 0 || price <= 0) {
      continue;
    }
    const signedQty = fill.side === "buy" ? qty : -qty;
    const notionalUsd = qty * price;
    const feeUsd = notionalUsd * (input.feeRateBps / 10_000);
    const current = positions.get(fill.instId) ?? { qty: 0, avgPrice: 0 };
    let realizedPnlUsd = 0;

    if (current.qty > 0 && signedQty < 0) {
      const closeQty = Math.min(current.qty, Math.abs(signedQty));
      realizedPnlUsd = (price - current.avgPrice) * closeQty;
      const remainingQty = current.qty - closeQty;
      positions.set(fill.instId, {
        qty: remainingQty,
        avgPrice: remainingQty > 0 ? current.avgPrice : 0
      });
      const openShortQty = Math.abs(signedQty) - closeQty;
      if (openShortQty > 0) {
        positions.set(fill.instId, { qty: -openShortQty, avgPrice: price });
      }
    } else if (current.qty < 0 && signedQty > 0) {
      const closeQty = Math.min(Math.abs(current.qty), signedQty);
      realizedPnlUsd = (current.avgPrice - price) * closeQty;
      const remainingQty = Math.abs(current.qty) - closeQty;
      positions.set(fill.instId, {
        qty: remainingQty > 0 ? -remainingQty : 0,
        avgPrice: remainingQty > 0 ? current.avgPrice : 0
      });
      const openLongQty = signedQty - closeQty;
      if (openLongQty > 0) {
        positions.set(fill.instId, { qty: openLongQty, avgPrice: price });
      }
    } else {
      const nextQty = current.qty + signedQty;
      const weightedNotional = current.avgPrice * Math.abs(current.qty) + price * Math.abs(signedQty);
      const avgPrice = Math.abs(nextQty) > 0 ? weightedNotional / Math.abs(nextQty) : 0;
      positions.set(fill.instId, { qty: nextQty, avgPrice });
    }

    const netPnlUsd = realizedPnlUsd - feeUsd;
    const item: TradePnlItem = {
      tradeId: fill.tradeId,
      ordId: fill.ordId,
      clOrdId: fill.clOrdId,
      symbol: fill.instId,
      side: fill.side,
      qtyBase: qty,
      price,
      notionalUsd,
      realizedPnlUsd: round6(realizedPnlUsd),
      feeUsd: round6(feeUsd),
      netPnlUsd: round6(netPnlUsd),
      ts: fill.ts
    };
    trades.push(item);

  }

  let unrealizedPnlUsd = 0;
  for (const [symbol, position] of positions.entries()) {
    if (position.qty === 0) {
      continue;
    }
    const mark = input.marksBySymbol.get(symbol) ?? position.avgPrice;
    unrealizedPnlUsd += (mark - position.avgPrice) * position.qty;
  }
  const nowIso = new Date().toISOString();
  const utcDay = nowIso.slice(0, 10);
  const exchangeDay = dayKeyAtOffset(nowIso, input.exchangeTimezoneOffsetMinutes);
  const sortedTrades = trades.sort((a, b) => b.ts.localeCompare(a.ts));
  const dailyUtc = summarizeDailyFromTrades(sortedTrades, utcDay, 0, unrealizedPnlUsd);
  const dailyExchange = summarizeDailyFromTrades(
    sortedTrades,
    exchangeDay,
    input.exchangeTimezoneOffsetMinutes,
    unrealizedPnlUsd
  );

  return {
    trades: sortedTrades,
    dailyUtc,
    dailyExchange,
    exchangeTimezoneLabel: formatUtcOffsetLabel(input.exchangeTimezoneOffsetMinutes)
  };
}

export interface MissionControlServerOptions {
  port?: number;
  eventStorePath?: string;
  alertStorePath?: string;
  opsStorePath?: string;
  replayDefault?: number;
  logRequests?: boolean;
  approvalTtlMs?: number;
}

export interface MissionControlServerHandle {
  port: number;
  baseHttpUrl: string;
  baseWsUrl: string;
  close: () => Promise<void>;
  server: Server;
}

interface ClearStreamsResult {
  eventsDeleted: number;
  auditDeleted: number;
  incidentsDeleted: number;
  logsCleared: number;
}

type ManagedTradeStatus =
  | "planned"
  | "entry_submitted"
  | "entry_partially_filled"
  | "entry_filled"
  | "exit_pending"
  | "exit_submitted"
  | "closed"
  | "canceled"
  | "error";

type ExitReason = "stop_loss" | "take_profit" | "time_stop" | "flatten" | "manual" | "circuit_breaker";

interface AutoExitConfig {
  enabled: boolean;
  maxHoldSec: number;
  takeProfitRMultiple: number;
  flattenTimeUtc?: string;
  exitOffsetBps: number;
}

type EntryApprovalMode = "manual" | "policy_auto";

interface EntryAutonomyConfig {
  approvalMode: EntryApprovalMode;
  allowedSymbols: string[];
  maxPerOrderNotionalUsd: number;
  maxOpenExposureUsd: number;
  maxDailyLossUsd: number;
  maxWeeklyLossUsd: number;
  lossStreakCooldownCount: number;
  cooldownMinutes: number;
  strategyVersion: string;
  strategyVersionBySymbol?: Record<string, string>;
  policyVersion: string;
}

interface EntryAutonomyStatus {
  approvalMode: EntryApprovalMode;
  fallbackActive: boolean;
  lastFallbackReason?: string;
  lastFallbackAt?: string;
  lastPolicyAutoDecisionAt?: string;
  lastPolicyAutoBlockers: string[];
}

type StrategyPromotionStage = "research" | "shadow" | "paper_canary" | "limited_prod";
type StrategyVersionStatus = "active" | "candidate" | "retired" | "rolled_back";

interface StrategyVersionRecord {
  version: string;
  stage: StrategyPromotionStage;
  status: StrategyVersionStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  artifacts?: {
    researchReportUrl?: string;
    shadowReportUrl?: string;
    canaryReportUrl?: string;
  };
}

interface StrategyPromotionHistoryItem {
  at: string;
  action: "register" | "promote" | "rollback";
  version: string;
  actor: string;
  fromStage?: StrategyPromotionStage;
  toStage?: StrategyPromotionStage;
  reason?: string;
}

interface StrategyPromotionState {
  activeVersion: string;
  championVersion: string;
  challengerVersion?: string;
  previousStableVersion?: string;
  activeVersionBySymbol?: Record<string, string>;
  championVersionBySymbol?: Record<string, string>;
  challengerVersionBySymbol?: Record<string, string>;
  previousStableVersionBySymbol?: Record<string, string>;
  versions: StrategyVersionRecord[];
  history: StrategyPromotionHistoryItem[];
}

interface StrategyDegradationConfig {
  enabled: boolean;
  maxDailyLossUsd: number;
  maxDrawdownPct: number;
  maxConsecutiveLosingTrades: number;
}

interface ManagedTrade {
  tradeId: string;
  status: ManagedTradeStatus;
  symbol: string;
  entrySide: "buy" | "sell";
  entryOrdId: string;
  entryClOrdId: string;
  requestedQty: number;
  entryLimitPrice?: number;
  entrySubmittedAt?: string;
  entryFirstFilledAt?: string;
  entryRepriceCount: number;
  entryFilledQty: number;
  entryAvgPrice: number;
  exitOrdId?: string;
  exitClOrdId?: string;
  exitFilledQty: number;
  exitAvgPrice: number;
  remainingQty: number;
  exitReason?: ExitReason;
  stopPrice: number;
  takeProfitPrice: number;
  maxHoldSec: number;
  flattenAt?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  feeUsd: number;
  realizedPnlUsd: number;
  exitSubmittedAt?: string;
  exitRepriceCount: number;
  forcedFlattenEscalated: boolean;
  requestedNotionalUsd?: number;
  approvalModeAtDecision?: EntryApprovalMode;
  policyVersionAtDecision?: string;
  strategyVersionAtDecision?: string;
  modelVersionAtDecision?: string;
  intelligenceVersionAtDecision?: string;
  playbookIdAtDecision?: string;
  entryStyleAtDecision?: string;
  thesisSummaryAtDecision?: string;
  invalidationSummaryAtDecision?: string;
  thesisConfidenceScoreAtDecision?: number;
  tradeabilityScoreAtDecision?: number;
  entryOffsetBps?: number;
  stopDistanceBps?: number;
  takeProfitRMultiple?: number;
  marketRegimeAtDecision?: string;
  signalConfidenceScoreAtDecision?: number;
  trendAlignmentScoreAtDecision?: number;
  move1mBpsAtDecision?: number;
  move5mBpsAtDecision?: number;
  move15mBpsAtDecision?: number;
  realizedVolatilityBpsAtDecision?: number;
  spreadBpsAtDecision?: number;
  orderBookImbalancePctAtDecision?: number;
}

interface AutoExitDecisionTraceItem {
  at: string;
  tradeId: string;
  symbol: string;
  status: ManagedTradeStatus;
  remainingQty: number;
  mark: number;
  reason?: ExitReason;
  action:
    | "stale_forced_closed"
    | "submit_attempt"
    | "submit_ok"
    | "submit_retry"
    | "min_size_closed"
    | "forced_closed"
    | "dust_closed"
    | "submit_failed";
  detail?: string;
  repriceCount: number;
  offsetBps?: number;
  limitPrice?: number;
  exitQty?: number;
}

export type ManagedTradeEntryAgingAction = "none" | "mark_canceled" | "cancel_unfilled" | "cancel_remainder";
export type AutoExitStaleCancelAction = "retry_exit" | "force_close";

function shouldEscalateTimeStopExitToForcedClose(exitReason: ExitReason | undefined, exitRepriceCount: number, autoExitMaxReprices: number): boolean {
  if (exitReason !== "time_stop") {
    return false;
  }
  const threshold = Math.min(autoExitMaxReprices, 3);
  return exitRepriceCount >= threshold;
}

export function evaluateManagedTradeEntryAging(input: {
  status: ManagedTradeStatus;
  requestedQty: number;
  entryFilledQty: number;
  submittedAt: string;
  nowIso: string;
  hasSubmittedOrder: boolean;
  isPendingAtVenue: boolean;
  staleTimeoutSec: number;
}): { action: ManagedTradeEntryAgingAction; elapsedSec: number } {
  if (input.status === "closed" || input.status === "canceled") {
    return { action: "none", elapsedSec: 0 };
  }
  const createdEpoch = Date.parse(input.submittedAt);
  const nowEpoch = Date.parse(input.nowIso);
  const elapsedSec =
    Number.isFinite(createdEpoch) && Number.isFinite(nowEpoch) ? Math.max(0, (nowEpoch - createdEpoch) / 1000) : 0;
  if (!input.hasSubmittedOrder) {
    return { action: "none", elapsedSec };
  }
  if (!input.isPendingAtVenue && input.entryFilledQty <= 1e-9) {
    return { action: "mark_canceled", elapsedSec };
  }
  if (!input.isPendingAtVenue || elapsedSec < input.staleTimeoutSec) {
    return { action: "none", elapsedSec };
  }
  if (input.entryFilledQty <= 1e-9) {
    return { action: "cancel_unfilled", elapsedSec };
  }
  if (input.entryFilledQty + 1e-9 < input.requestedQty) {
    return { action: "cancel_remainder", elapsedSec };
  }
  return { action: "none", elapsedSec };
}

export function evaluateAutoExitStaleCancelAction(input: {
  exitRepriceCount: number;
  autoExitMaxReprices: number;
  forcedFlattenEscalated: boolean;
  exitReason?: ExitReason;
}): AutoExitStaleCancelAction {
  if (input.forcedFlattenEscalated) {
    return "force_close";
  }
  if (shouldEscalateTimeStopExitToForcedClose(input.exitReason, input.exitRepriceCount, input.autoExitMaxReprices)) {
    return "force_close";
  }
  if (input.exitReason === "flatten" && input.exitRepriceCount >= input.autoExitMaxReprices) {
    return "force_close";
  }
  return "retry_exit";
}

function resolveManagedTradeHoldStartIso(trade: ManagedTrade): string {
  return trade.entryFirstFilledAt ?? trade.entrySubmittedAt ?? trade.createdAt;
}

function isContinuationRegimeAligned(trade: ManagedTrade): boolean {
  if (trade.entrySide === "sell") {
    return trade.marketRegimeAtDecision === "trend_down" || trade.marketRegimeAtDecision === "quiet_down";
  }
  return trade.marketRegimeAtDecision === "trend_up" || trade.marketRegimeAtDecision === "quiet_up";
}

export function resolveManagedTradeExitOrderType(input: {
  exitReason?: ExitReason;
  exitRepriceCount: number;
  forcedFlattenEscalated: boolean;
  exitSide: "buy" | "sell";
}): "limit" | "ioc" | "market" {
  if (
    input.forcedFlattenEscalated ||
    input.exitReason === "flatten" ||
    input.exitReason === "time_stop" ||
    input.exitReason === "take_profit" ||
    input.exitReason === "stop_loss"
  ) {
    return "market";
  }
  return "limit";
}

export function shouldAttemptAmendLiveExitOrder(input: {
  exitReason?: ExitReason;
  exitRepriceCount: number;
  forcedFlattenEscalated: boolean;
  exitSide: "buy" | "sell";
}): boolean {
  return resolveManagedTradeExitOrderType(input) === "limit";
}

interface Milestone5EvidenceDay {
  day: string;
  pass: boolean;
  source: "soak_report" | "live";
  closureRatePct: number;
  filledEntries: number;
  deterministicClosed: number;
  closedTradeDataPass: boolean;
  reconciliationPass: boolean;
  tradeErrors: number;
  reportPath?: string;
}

interface Milestone5EvidenceSummary {
  policyVersion: "calendar-day-v1";
  requiredDays: number;
  qualifiedDays: number;
  streakDays: number;
  milestoneReady: boolean;
  generatedAt: string;
  today: {
    day: string;
    pass: boolean;
    source: "soak_report" | "live";
    blockers: string[];
    closureRatePct: number;
    filledEntries: number;
    deterministicClosed: number;
    reconciliationPass: boolean;
    tradeErrors: number;
  };
  days: Milestone5EvidenceDay[];
}

type RolloutStageId =
  | "phase0_reset_and_stabilize"
  | "phase1_demo_execution_hardening"
  | "phase2_strategy_validation"
  | "phase3_supervised_demo_autonomy"
  | "phase4_bounded_demo_auto_approval"
  | "phase5_live_shadow"
  | "phase6_live_manual_tiny_notional"
  | "phase7_live_bounded_auto_btc"
  | "phase8_live_expansion"
  | "phase9_governed_learning_promotion";

interface RolloutStatusSummary {
  generatedAt: string;
  posture: "blocked" | "demo_only" | "advancing";
  currentStage: {
    id: RolloutStageId;
    label: string;
    objective: string;
  };
  confidenceReset: {
    active: boolean;
    reasons: string[];
    priorReadinessInformationalOnly: boolean;
  };
  evidence: {
    rawQualifiedDays: number;
    effectiveQualifiedDays: number;
    requiredDays: number;
    streakDays: number;
    fresh: boolean;
    latestEvidenceDay?: string;
    latestPassingEvidenceDay?: string;
    ageDays?: number;
  };
  nextGate: {
    label: string;
    blockers: string[];
  };
  nextRecommendedAction: string;
}

interface LearningEvaluationBucket {
  version: string;
  trades: number;
  expectancyNetFeesUsd: number;
  cumulativeNetPnlUsd: number;
  maxDrawdownUsd: number;
  maxDrawdownPct: number;
  slippageProxyBps: number;
  controlViolations: number;
}

interface LearningEvaluationSummary {
  generatedAt: string;
  lookbackDays: number;
  closedTrades: number;
  totals: {
    expectancyNetFeesUsd: number;
    cumulativeNetPnlUsd: number;
    maxDrawdownUsd: number;
    maxDrawdownPct: number;
    slippageProxyBps: number;
    controlViolations: number;
  };
  byModelVersion: LearningEvaluationBucket[];
  byStrategyVersion: LearningEvaluationBucket[];
}

interface LearningAlertThresholds {
  enabled: boolean;
  lookbackDays: number;
  limit: number;
  minTrades: number;
  expectancyMinUsd: number;
  maxDrawdownPct: number;
  maxSlippageBps: number;
  maxControlViolationRatePct: number;
}

interface LearningEvaluationTrendPoint {
  bucketStartAt: string;
  bucketEndAt: string;
  closedTrades: number;
  expectancyNetFeesUsd: number;
  cumulativeNetPnlUsd: number;
  maxDrawdownPct: number;
  slippageProxyBps: number;
  controlViolations: number;
  controlViolationRatePct: number;
  modelVersions: Array<{ version: string; trades: number }>;
  strategyVersions: Array<{ version: string; trades: number }>;
  breaches: {
    expectancy: boolean;
    drawdown: boolean;
    slippage: boolean;
    controlViolationRate: boolean;
  };
}

export function parseOkxPriceBandHint(message: string | undefined): number | undefined {
  if (!message) {
    return undefined;
  }
  const matches = [...message.matchAll(/(\d+(?:,\d{3})*(?:\.\d+)?)/g)];
  const last = matches.at(-1)?.[1];
  if (!last) {
    return undefined;
  }
  const value = Number(last.replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

interface LearningEvaluationTrendSummary {
  generatedAt: string;
  lookbackDays: number;
  bucketDays: number;
  thresholds: LearningAlertThresholds;
  points: LearningEvaluationTrendPoint[];
}

interface LearningRetentionConfig {
  closedTradeFeatureRetentionDays: number;
}

interface LearningRetentionPruneResult {
  closedTradeFeaturesDeleted: number;
}

interface LearningRetentionStatus {
  config: LearningRetentionConfig;
  stats: {
    featureCount: number;
    oldestClosedAt?: string;
    newestClosedAt?: string;
  };
  lastPruneAt?: string;
  lastPruneResult?: LearningRetentionPruneResult;
}

type AutoPauseScope = "demo" | "live" | "both";

interface AutoPauseConfig {
  enabled: boolean;
  maxPauseMinutes: number;
  resumeMode: EntryApprovalMode;
  scope: AutoPauseScope;
}

interface AutoPauseState {
  active: boolean;
  reason?: string;
  pausedAt?: string;
  resumeAt?: string;
  lastAutoPauseAt?: string;
  lastAutoResumeAt?: string;
}

interface WorkerSymbolGateRule {
  minExpectancyUsd: number;
  maxConsecutiveLosses: number;
  cooldownMinutes: number;
  minTrades?: number;
  failClosedOnInsufficientTrades?: boolean;
}

interface WorkerSymbolQualityGateConfig {
  enabled: boolean;
  lookbackTrades: number;
  minTrades: number;
  defaultRule: WorkerSymbolGateRule;
  solRule: WorkerSymbolGateRule;
}

interface WorkerSymbolGateDecision {
  eligible: boolean;
  reason?: string;
}

interface WorkerTradeSideGateConfig {
  enabled: boolean;
  lookbackTrades: number;
  minTrades: number;
  minExpectancyUsd: number;
  maxTimeStopRatePct: number;
}

function controlActionFromPath(path: string): ControlAction | undefined {
  if (path === "/start") return "start";
  if (path === "/pause") return "pause";
  if (path === "/resume") return "resume";
  if (path === "/stop") return "stop";
  if (path === "/cancel-all") return "cancel_all";
  if (path === "/emergency-stop") return "emergency_stop";
  return undefined;
}

function parseEventQuery(req: Request): EventQuery {
  const query = req.query as Record<string, string | undefined>;
  return {
    limit: query.limit ? Number(query.limit) : undefined,
    cursor: query.cursor,
    type: query.type as EventQuery["type"],
    symbol: query.symbol,
    severity: query.severity as EventQuery["severity"]
  };
}

function writeError(res: Response, status: number, payload: ApiErrorPayload): void {
  res.status(status).json(payload);
}

function resolveExchangeMode(raw: string | undefined): ExchangeMode {
  if (raw === "demo") {
    return "demo";
  }
  if (raw === "live") {
    return "live";
  }
  return "unknown";
}

function resolveRuntimeMode(exchangeMode: ExchangeMode, executionMode: string | undefined): BotMode {
  if (exchangeMode === "demo") {
    return "demo";
  }
  if (exchangeMode === "live") {
    return "live";
  }
  if (executionMode === "demo_execution_enabled") {
    return "paper";
  }
  return "simulation";
}

function hasReconciliationDrift(state: ReconciliationStatus): boolean {
  return state.orders === "drift" || state.positions === "drift" || state.pnl === "drift" || state.orders === "error" || state.positions === "error" || state.pnl === "error";
}

function isWsAuthorized(req: IncomingMessage): boolean {
  const requireSigned = process.env.TOURAB_REQUIRE_SIGNED_AUTH === "1";
  if (!requireSigned) {
    return true;
  }
  const secret = process.env.TOURAB_AUTH_SECRET;
  if (!secret) {
    return false;
  }
  const authHeader = req.headers["authorization"];
  const headerToken =
    typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : undefined;
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const queryToken = url.searchParams.get("token") ?? undefined;
  const token = headerToken ?? queryToken;
  if (!token) {
    return false;
  }
  return Boolean(verifySignedAccessToken(token, secret));
}

function incidentTemplateFromAlert(alert: AlertItem): Pick<IncidentItem, "taxonomy" | "severity" | "runbookRef"> {
  if (alert.code === "RECONCILIATION_DRIFT_CIRCUIT") {
    return {
      taxonomy: "reconciliation_drift",
      severity: "sev1",
      runbookRef: "docs/runbooks/reconciliation-drift-circuit.md"
    };
  }
  if (alert.code.startsWith("STALE_")) {
    return {
      taxonomy: "freshness_guard",
      severity: "sev2",
      runbookRef: "docs/runbooks/freshness-guard.md"
    };
  }
  if (alert.code.startsWith("APPROVAL_")) {
    return {
      taxonomy: "approval_governance",
      severity: "sev2",
      runbookRef: "docs/runbooks/approval-governance.md"
    };
  }
  if (alert.code === "RUNTIME_ERROR_EVENT") {
    return {
      taxonomy: "exchange_reliability",
      severity: "sev2",
      runbookRef: "docs/runbooks/exchange-reliability.md"
    };
  }
  if (alert.code === WORKER_STALL_ALERT_CODE) {
    return {
      taxonomy: "stream_health",
      severity: "sev2",
      runbookRef: "docs/runbooks/control-plane-incident.md"
    };
  }
  if (alert.code.startsWith("LEARNING_")) {
    return {
      taxonomy: "ops_durability",
      severity: alert.severity === "critical" ? "sev1" : "sev2",
      runbookRef: "docs/runbooks/learning-evaluation-guard.md"
    };
  }
  return {
    taxonomy: "control_plane",
    severity: alert.severity === "critical" ? "sev1" : "sev3",
    runbookRef: "docs/runbooks/control-plane-incident.md"
  };
}

export function shouldOpenIncidentForAlert(alert: Pick<AlertItem, "code" | "severity">): boolean {
  if (alert.severity === "critical") {
    return true;
  }
  if (alert.code.startsWith("APPROVAL_") || alert.code.startsWith("STALE_")) {
    return true;
  }
  if (alert.code.startsWith("LEARNING_")) {
    return alert.severity !== "warn";
  }
  return false;
}

function countBlockingOpenIncidents(incidents: IncidentItem[]): number {
  return incidents.filter((item) => item.status !== "resolved").length;
}

export function formatMissionControlOkxErrorDetail(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!(error instanceof OkxApiError)) {
    return `error=${message}`;
  }
  const details = (error.details ?? {}) as Record<string, unknown>;
  const status = typeof details.status === "number" ? details.status : undefined;
  const apiCodeRaw = details.code;
  const apiCode =
    typeof apiCodeRaw === "string" || typeof apiCodeRaw === "number" ? String(apiCodeRaw) : undefined;
  const apiMsgRaw = details.msg;
  const apiMsg = typeof apiMsgRaw === "string" ? apiMsgRaw : undefined;
  const sCodeRaw = details.sCode;
  const sCode =
    typeof sCodeRaw === "string" || typeof sCodeRaw === "number"
      ? String(sCodeRaw)
      : Array.isArray(details.data) &&
        details.data.length > 0 &&
        (typeof (details.data[0] as Record<string, unknown>).sCode === "string" ||
          typeof (details.data[0] as Record<string, unknown>).sCode === "number")
      ? String((details.data[0] as Record<string, unknown>).sCode)
      : undefined;
  const sMsgRaw = details.sMsg;
  const sMsg =
    typeof sMsgRaw === "string"
      ? sMsgRaw
      : Array.isArray(details.data) &&
        details.data.length > 0 &&
        typeof (details.data[0] as Record<string, unknown>).sMsg === "string"
      ? String((details.data[0] as Record<string, unknown>).sMsg)
      : undefined;
  const method = typeof details.method === "string" ? details.method : undefined;
  const requestPath = typeof details.requestPath === "string" ? details.requestPath : undefined;
  const requestBodyHash = typeof details.requestBodyHash === "string" ? details.requestBodyHash : undefined;
  const authProbe =
    details.authProbe && typeof details.authProbe === "object"
      ? (details.authProbe as Record<string, unknown>)
      : undefined;
  const authProbeOk = typeof authProbe?.ok === "boolean" ? authProbe.ok : undefined;
  const authProbeStatus = typeof authProbe?.status === "number" ? authProbe.status : undefined;
  const authProbeError = typeof authProbe?.error === "string" ? authProbe.error : undefined;

  const parts = [`error=${message}`, `okxCode=${error.code}`];
  if (status !== undefined) {
    parts.push(`httpStatus=${status}`);
  }
  if (method) {
    parts.push(`method=${method}`);
  }
  if (requestPath) {
    parts.push(`requestPath=${requestPath}`);
  }
  if (requestBodyHash) {
    parts.push(`requestBodyHash=${requestBodyHash}`);
  }
  if (apiCode) {
    parts.push(`apiCode=${apiCode}`);
  }
  if (apiMsg) {
    parts.push(`apiMsg=${apiMsg}`);
  }
  if (sCode) {
    parts.push(`sCode=${sCode}`);
  }
  if (sMsg) {
    parts.push(`sMsg=${sMsg}`);
  }
  if (authProbeOk !== undefined) {
    parts.push(`authProbeOk=${authProbeOk ? "yes" : "no"}`);
  }
  if (authProbeStatus !== undefined) {
    parts.push(`authProbeStatus=${authProbeStatus}`);
  }
  if (authProbeError) {
    parts.push(`authProbeError=${authProbeError}`);
  }
  return parts.join(" ");
}

export function classifyMissionControlSubmitFailure(error: unknown): { transient: boolean; message: string } {
  const message = formatMissionControlOkxErrorDetail(error);
  if (error instanceof OkxApiError) {
    const details = (error.details ?? {}) as Record<string, unknown>;
    const topLevelSCodeRaw = details.sCode;
    const nestedSCodeRaw =
      Array.isArray(details.data) && details.data.length > 0
        ? (details.data[0] as Record<string, unknown>).sCode
        : undefined;
    const sCode =
      typeof topLevelSCodeRaw === "string" || typeof topLevelSCodeRaw === "number"
        ? String(topLevelSCodeRaw)
        : typeof nestedSCodeRaw === "string" || typeof nestedSCodeRaw === "number"
        ? String(nestedSCodeRaw)
        : "";
    if (sCode === "51016" || sCode === "51137" || sCode === "51138") {
      return { transient: true, message };
    }
    if (error.code === "OKX_ORDER_REJECTED") {
      return { transient: false, message };
    }
    if (error.code === "OKX_CANCEL_INPUT_ERROR" || error.code === "OKX_CONFIG_ERROR") {
      return { transient: false, message };
    }
    if (error.code === "OKX_NETWORK_ERROR") {
      return { transient: true, message };
    }
    if (error.code === "OKX_HTTP_ERROR") {
      const status = Number((error.details ?? {}).status);
      const requestPath = typeof (error.details ?? {}).requestPath === "string" ? String((error.details ?? {}).requestPath) : "";
      const apiCode = typeof (error.details ?? {}).code === "string" ? String((error.details ?? {}).code) : "";
      const apiMsg = typeof (error.details ?? {}).msg === "string" ? String((error.details ?? {}).msg).toLowerCase() : "";
      const permanentAuthFailure = apiCode === "50110" || apiMsg.includes("whitelist") || apiMsg.includes("api key");
      if (status === 401 && requestPath.startsWith("/api/v5/trade/") && !permanentAuthFailure) {
        return { transient: true, message };
      }
      if (status === 408 || status === 425 || status === 429 || status >= 500) {
        return { transient: true, message };
      }
    }
  }
  const normalized = message.toLowerCase();
  if (normalized.includes("fetch failed") || normalized.includes("network") || normalized.includes("timeout")) {
    return { transient: true, message };
  }
  return { transient: false, message };
}

export async function startMissionControlServer(
  options: MissionControlServerOptions = {}
): Promise<MissionControlServerHandle> {
  const app = express();
  const httpServer = createServer(app);
  const wsServer = new WebSocketServer({ noServer: true });

  const port = options.port ?? DEFAULT_PORT;
  const eventStorePath = options.eventStorePath ?? DEFAULT_EVENT_STORE_PATH;
  const alertStorePath = options.alertStorePath ?? DEFAULT_ALERT_STORE_PATH;
  const opsStorePath = options.opsStorePath ?? (process.env.TOURAB_OPS_STORE_PATH ?? join(dirname(eventStorePath), "mission-ops.sqlite"));
  const m5EvidenceDir = process.env.TOURAB_M5_EVIDENCE_DIR ?? DEFAULT_M5_EVIDENCE_DIR;
  const replayDefault = options.replayDefault ?? REPLAY_DEFAULT;
  const logRequests = options.logRequests ?? true;
  const approvalTtlMs = options.approvalTtlMs ?? Number(process.env.TOURAB_APPROVAL_TTL_MS ?? 5 * 60_000);
  const driftCircuitAction = DEFAULT_DRIFT_CIRCUIT_ACTION;
  let streamRetentionMs = parseBoundedInt(
    process.env.TOURAB_STREAM_RETENTION_MS,
    DEFAULT_STREAM_RETENTION_MS,
    60_000,
    24 * 60 * 60_000
  );
  const streamRetentionSweepMs = parseBoundedInt(
    process.env.TOURAB_STREAM_RETENTION_SWEEP_MS,
    DEFAULT_STREAM_RETENTION_SWEEP_MS,
    5_000,
    10 * 60_000
  );
  let opsTradeRetentionMs = parseBoundedInt(
    process.env.TOURAB_OPS_TRADE_RETENTION_MS,
    DEFAULT_OPS_TRADE_RETENTION_MS,
    60_000,
    365 * 24 * 60 * 60_000
  );
  const driftMinConsecutive = parseBoundedInt(process.env.TOURAB_DRIFT_CIRCUIT_MIN_CONSECUTIVE, 2, 1, 20);
  const driftMaxGraceMs = parseBoundedInt(process.env.TOURAB_DRIFT_CIRCUIT_MAX_GRACE_MS, 90_000, 1_000, 86_400_000);
  const policyAutoMaxOpenTradesPerSymbol = parseBoundedInt(
    process.env.TOURAB_POLICY_AUTO_MAX_OPEN_TRADES_PER_SYMBOL,
    DEFAULT_POLICY_AUTO_MAX_OPEN_TRADES_PER_SYMBOL,
    1,
    100
  );
  const exchangeMode = resolveExchangeMode(process.env.OKX_TRADING_MODE);
  const workerExecutionMode =
    (process.env.TOURAB_EXECUTION_MODE as "proposal_only" | "demo_execution_enabled" | undefined) ??
    (exchangeMode === "demo" ? "demo_execution_enabled" : "proposal_only");
  const pendingDemoApprovalLimit = parseBoundedInt(process.env.TOURAB_DEMO_PENDING_APPROVAL_LIMIT, 1, 1, 50);
  const workerSymbolQualityGate: WorkerSymbolQualityGateConfig = {
    enabled: parseBooleanEnv(process.env.TOURAB_WORKER_SYMBOL_QUALITY_GATE_ENABLED, true),
    lookbackTrades: parseBoundedInt(
      process.env.TOURAB_WORKER_SYMBOL_QUALITY_LOOKBACK_TRADES,
      DEFAULT_WORKER_SYMBOL_QUALITY_LOOKBACK_TRADES,
      10,
      10_000
    ),
    minTrades: parseBoundedInt(
      process.env.TOURAB_WORKER_SYMBOL_QUALITY_MIN_TRADES,
      DEFAULT_WORKER_SYMBOL_QUALITY_MIN_TRADES,
      1,
      10_000
    ),
    defaultRule: {
      minExpectancyUsd: parseBoundedNumber(
        process.env.TOURAB_WORKER_SYMBOL_MIN_EXPECTANCY_USD,
        DEFAULT_WORKER_SYMBOL_MIN_EXPECTANCY_USD,
        -1_000,
        1_000
      ),
      maxConsecutiveLosses: parseBoundedInt(
        process.env.TOURAB_WORKER_SYMBOL_MAX_CONSECUTIVE_LOSSES,
        DEFAULT_WORKER_SYMBOL_MAX_CONSECUTIVE_LOSSES,
        1,
        100
      ),
      cooldownMinutes: parseBoundedInt(
        process.env.TOURAB_WORKER_SYMBOL_COOLDOWN_MINUTES,
        DEFAULT_WORKER_SYMBOL_COOLDOWN_MINUTES,
        0,
        14 * 24 * 60
      )
    },
    solRule: {
      minExpectancyUsd: parseBoundedNumber(
        process.env.TOURAB_WORKER_SOL_MIN_EXPECTANCY_USD,
        DEFAULT_WORKER_SOL_MIN_EXPECTANCY_USD,
        -1_000,
        1_000
      ),
      maxConsecutiveLosses: parseBoundedInt(
        process.env.TOURAB_WORKER_SOL_MAX_CONSECUTIVE_LOSSES,
        DEFAULT_WORKER_SOL_MAX_CONSECUTIVE_LOSSES,
        1,
        100
      ),
      cooldownMinutes: parseBoundedInt(
        process.env.TOURAB_WORKER_SOL_COOLDOWN_MINUTES,
        DEFAULT_WORKER_SOL_COOLDOWN_MINUTES,
        0,
        14 * 24 * 60
      ),
      minTrades: parseBoundedInt(
        process.env.TOURAB_WORKER_SOL_MIN_TRADES,
        DEFAULT_WORKER_SOL_MIN_TRADES,
        1,
        10_000
      ),
      failClosedOnInsufficientTrades: parseBooleanEnv(
        process.env.TOURAB_WORKER_SOL_FAIL_CLOSED_ON_INSUFFICIENT_TRADES,
        DEFAULT_WORKER_SOL_FAIL_CLOSED_ON_INSUFFICIENT_TRADES
      )
    }
  };
  const workerTradeSideGate: WorkerTradeSideGateConfig = {
    enabled: parseBooleanEnv(process.env.TOURAB_WORKER_TRADE_SIDE_GATE_ENABLED, true),
    lookbackTrades: parseBoundedInt(
      process.env.TOURAB_WORKER_TRADE_SIDE_LOOKBACK_TRADES,
      DEFAULT_WORKER_TRADE_SIDE_LOOKBACK_TRADES,
      1,
      10_000
    ),
    minTrades: parseBoundedInt(
      process.env.TOURAB_WORKER_TRADE_SIDE_MIN_TRADES,
      DEFAULT_WORKER_TRADE_SIDE_MIN_TRADES,
      1,
      10_000
    ),
    minExpectancyUsd: parseBoundedNumber(
      process.env.TOURAB_WORKER_TRADE_SIDE_MIN_EXPECTANCY_USD,
      DEFAULT_WORKER_TRADE_SIDE_MIN_EXPECTANCY_USD,
      -1_000,
      1_000
    ),
    maxTimeStopRatePct: parseBoundedNumber(
      process.env.TOURAB_WORKER_TRADE_SIDE_MAX_TIME_STOP_RATE_PCT,
      DEFAULT_WORKER_TRADE_SIDE_MAX_TIME_STOP_RATE_PCT,
      0,
      100
    )
  };

  const eventStore = await SqliteEventStore.open(eventStorePath);
  const alertStore = new JsonlAlertStore(alertStorePath);
  const opsStore = await SqliteOpsStore.open(opsStorePath);
  const bus = new EventBus();
  const lifecycle = new RuntimeLifecycleManager(resolveRuntimeMode(exchangeMode, workerExecutionMode));
  const approvals = new ApprovalStore(approvalTtlMs);
  const pendingDemoOrders = new Map<
    string,
    {
      intent: ExecutionIntent;
      proposal: TradeProposal;
      symbol: string;
      stopPrice: number;
      takeProfitPrice: number;
      maxHoldSec: number;
      flattenAt?: string;
      approvalModeAtDecision: EntryApprovalMode;
      strategyVersion: string;
      policyVersion: string;
      modelVersion: string;
      entryOffsetBps: number;
      stopDistanceBps: number;
      takeProfitRMultiple: number;
      requestedNotionalUsd: number;
      marketIntelligence?: WorkerMarketIntelligenceSnapshot;
      tradingPlan?: TradingTradePlan;
      queuedAt: string;
    }
  >();
  let autoExitConfig: AutoExitConfig =
    opsStore.loadRuntimeState<AutoExitConfig>("auto_exit_config") ?? {
      enabled: parseBooleanEnv(process.env.TOURAB_AUTO_EXIT_ENABLED, true),
      maxHoldSec: parseBoundedInt(
        process.env.TOURAB_AUTO_EXIT_MAX_HOLD_SEC,
        DEFAULT_AUTO_EXIT_MAX_HOLD_SEC,
        30,
        7 * 24 * 60 * 60
      ),
      takeProfitRMultiple: Math.max(0.25, Number(process.env.TOURAB_AUTO_EXIT_TP_R_MULTIPLE ?? DEFAULT_AUTO_EXIT_TP_R_MULTIPLE)),
      flattenTimeUtc: parseFlattenTimeUtc(process.env.TOURAB_AUTO_EXIT_FLATTEN_UTC),
      exitOffsetBps: Math.max(0, Number(process.env.TOURAB_AUTO_EXIT_EXIT_OFFSET_BPS ?? DEFAULT_AUTO_EXIT_EXIT_OFFSET_BPS))
    };
  let entryAutonomyConfig: EntryAutonomyConfig =
    opsStore.loadRuntimeState<EntryAutonomyConfig>("entry_autonomy_config") ?? {
      approvalMode: (process.env.TOURAB_APPROVAL_MODE as EntryApprovalMode | undefined) ?? "manual",
      allowedSymbols: parseCsvEnv(process.env.TOURAB_POLICY_AUTO_ALLOWED_SYMBOLS, ["BTC-USDT"]),
      maxPerOrderNotionalUsd: Math.max(1, Number(process.env.TOURAB_POLICY_AUTO_MAX_PER_ORDER_NOTIONAL_USD ?? "12")),
      maxOpenExposureUsd: Math.max(1, Number(process.env.TOURAB_POLICY_AUTO_MAX_OPEN_EXPOSURE_USD ?? "20")),
      maxDailyLossUsd: Math.max(0.5, Number(process.env.TOURAB_POLICY_AUTO_MAX_DAILY_LOSS_USD ?? "5")),
      maxWeeklyLossUsd: Math.max(1, Number(process.env.TOURAB_POLICY_AUTO_MAX_WEEKLY_LOSS_USD ?? "15")),
      lossStreakCooldownCount: parseBoundedInt(process.env.TOURAB_POLICY_AUTO_LOSS_STREAK_COUNT, 3, 1, 20),
      cooldownMinutes: parseBoundedInt(process.env.TOURAB_POLICY_AUTO_COOLDOWN_MINUTES, 60, 1, 24 * 60),
      strategyVersion: (process.env.TOURAB_STRATEGY_VERSION ?? DEFAULT_ENTRY_AUTONOMY_STRATEGY_VERSION).trim(),
      strategyVersionBySymbol: {
        ...buildDefaultStrategyVersionBySymbol(),
        ...parseStrategyVersionBySymbol(process.env.TOURAB_STRATEGY_VERSION_BY_SYMBOL_JSON)
      },
      policyVersion: (process.env.TOURAB_POLICY_VERSION ?? DEFAULT_ENTRY_AUTONOMY_POLICY_VERSION).trim()
    };
  const entryAutonomyStatus: EntryAutonomyStatus =
    opsStore.loadRuntimeState<EntryAutonomyStatus>("entry_autonomy_status") ?? {
      approvalMode: entryAutonomyConfig.approvalMode,
      fallbackActive: false,
      lastPolicyAutoBlockers: []
    };
  const strategyPromotionState: StrategyPromotionState =
    opsStore.loadRuntimeState<StrategyPromotionState>("strategy_promotion_state") ?? {
      activeVersion: entryAutonomyConfig.strategyVersion,
      championVersion: entryAutonomyConfig.strategyVersion,
      previousStableVersion: entryAutonomyConfig.strategyVersion,
      activeVersionBySymbol: {
        ...entryAutonomyConfig.strategyVersionBySymbol
      },
      championVersionBySymbol: {
        ...entryAutonomyConfig.strategyVersionBySymbol
      },
      previousStableVersionBySymbol: {
        ...entryAutonomyConfig.strategyVersionBySymbol
      },
      versions: [
        {
          version: entryAutonomyConfig.strategyVersion,
          stage: "shadow",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: "bootstrap"
        }
      ],
      history: []
    };
  let strategyDegradationConfig: StrategyDegradationConfig =
    opsStore.loadRuntimeState<StrategyDegradationConfig>("strategy_degradation_config") ?? {
      enabled: parseBooleanEnv(process.env.TOURAB_STRATEGY_DEGRADATION_ENABLED, true),
      maxDailyLossUsd: Math.max(0.5, Number(process.env.TOURAB_STRATEGY_MAX_DAILY_LOSS_USD ?? DEFAULT_STRATEGY_MAX_DAILY_LOSS_USD)),
      maxDrawdownPct: Number(process.env.TOURAB_STRATEGY_MAX_DRAWDOWN_PCT ?? DEFAULT_STRATEGY_MAX_DRAWDOWN_PCT),
      maxConsecutiveLosingTrades: parseBoundedInt(
        process.env.TOURAB_STRATEGY_MAX_CONSEC_LOSSES,
        DEFAULT_STRATEGY_MAX_CONSEC_LOSSES,
        1,
        50
      )
    };
  const learningGovernanceState: LearningGovernanceState =
    opsStore.loadRuntimeState<LearningGovernanceState>("learning_governance_state") ?? {
      enabled: false,
      mode: "research_only",
      activeModelVersion: DEFAULT_LEARNING_MODEL_VERSION,
      previousStableModelVersion: DEFAULT_LEARNING_MODEL_VERSION,
      updatedAt: new Date().toISOString()
    };
  if (!learningGovernanceState.activeModelVersion) {
    learningGovernanceState.activeModelVersion = DEFAULT_LEARNING_MODEL_VERSION;
  }
  if (!learningGovernanceState.previousStableModelVersion) {
    learningGovernanceState.previousStableModelVersion = learningGovernanceState.activeModelVersion;
  }
  if (!learningGovernanceState.updatedAt) {
    learningGovernanceState.updatedAt = new Date().toISOString();
  }
  let learningAlertThresholds: LearningAlertThresholds =
    opsStore.loadRuntimeState<LearningAlertThresholds>("learning_alert_thresholds") ?? {
      enabled: parseBooleanEnv(process.env.TOURAB_LEARNING_ALERTS_ENABLED, true),
      lookbackDays: parseBoundedInt(
        process.env.TOURAB_LEARNING_ALERT_LOOKBACK_DAYS,
        DEFAULT_LEARNING_ALERT_LOOKBACK_DAYS,
        1,
        365
      ),
      limit: parseBoundedInt(process.env.TOURAB_LEARNING_ALERT_LIMIT, DEFAULT_LEARNING_ALERT_LIMIT, 1, 10_000),
      minTrades: parseBoundedInt(process.env.TOURAB_LEARNING_ALERT_MIN_TRADES, DEFAULT_LEARNING_ALERT_MIN_TRADES, 1, 10_000),
      expectancyMinUsd: parseBoundedNumber(
        process.env.TOURAB_LEARNING_ALERT_EXPECTANCY_MIN_USD,
        DEFAULT_LEARNING_ALERT_EXPECTANCY_MIN_USD,
        -1_000,
        1_000
      ),
      maxDrawdownPct: parseBoundedNumber(
        process.env.TOURAB_LEARNING_ALERT_MAX_DRAWDOWN_PCT,
        DEFAULT_LEARNING_ALERT_MAX_DRAWDOWN_PCT,
        0,
        100
      ),
      maxSlippageBps: parseBoundedNumber(
        process.env.TOURAB_LEARNING_ALERT_MAX_SLIPPAGE_BPS,
        DEFAULT_LEARNING_ALERT_MAX_SLIPPAGE_BPS,
        0,
        10_000
      ),
      maxControlViolationRatePct: parseBoundedNumber(
        process.env.TOURAB_LEARNING_ALERT_MAX_CONTROL_VIOLATION_RATE_PCT,
        DEFAULT_LEARNING_ALERT_MAX_CONTROL_VIOLATION_RATE_PCT,
        0,
        100
      )
    };
  let learningRetentionConfig: LearningRetentionConfig =
    opsStore.loadRuntimeState<LearningRetentionConfig>("learning_retention_config") ?? {
      closedTradeFeatureRetentionDays: Math.max(1, Math.floor(opsTradeRetentionMs / (24 * 60 * 60_000)))
    };
  learningRetentionConfig.closedTradeFeatureRetentionDays = Math.max(
    1,
    Math.min(3650, Math.floor(learningRetentionConfig.closedTradeFeatureRetentionDays))
  );
  opsTradeRetentionMs = learningRetentionConfig.closedTradeFeatureRetentionDays * 24 * 60 * 60_000;
  let learningRetentionLastPruneAt: string | undefined;
  let learningRetentionLastPruneResult: LearningRetentionPruneResult | undefined;
  let autoPauseConfig: AutoPauseConfig =
    opsStore.loadRuntimeState<AutoPauseConfig>("auto_pause_config") ?? {
      enabled: parseBooleanEnv(process.env.TOURAB_AUTO_PAUSE_ENABLED, false),
      maxPauseMinutes: parseBoundedInt(
        process.env.TOURAB_AUTO_PAUSE_MAX_MINUTES,
        DEFAULT_AUTO_PAUSE_MAX_MINUTES,
        5,
        24 * 60
      ),
      resumeMode: (process.env.TOURAB_AUTO_PAUSE_RESUME_MODE as EntryApprovalMode | undefined) ?? "manual",
      scope: parseAutoPauseScope(process.env.TOURAB_AUTO_PAUSE_SCOPE)
    };
  let autoPauseState: AutoPauseState =
    opsStore.loadRuntimeState<AutoPauseState>("auto_pause_state") ?? {
      active: false
    };
  const autoExitStaleTimeoutSec = parseBoundedInt(
    process.env.TOURAB_AUTO_EXIT_STALE_TIMEOUT_SEC,
    DEFAULT_AUTO_EXIT_STALE_TIMEOUT_SEC,
    5,
    15 * 60
  );
  const entryStaleTimeoutSec = parseBoundedInt(
    process.env.TOURAB_ENTRY_STALE_TIMEOUT_SEC,
    DEFAULT_ENTRY_STALE_TIMEOUT_SEC,
    15,
    15 * 60
  );
  const entryMaxRepriceCount = parseBoundedInt(
    process.env.TOURAB_ENTRY_MAX_REPRICE_COUNT,
    DEFAULT_ENTRY_MAX_REPRICE_COUNT,
    0,
    5
  );
  const entryRepriceMinConfidence = parseBoundedNumber(
    process.env.TOURAB_ENTRY_REPRICE_MIN_CONFIDENCE,
    DEFAULT_ENTRY_REPRICE_MIN_CONFIDENCE,
    0,
    100
  );
  const autoExitMaxReprices = parseBoundedInt(process.env.TOURAB_AUTO_EXIT_MAX_REPRICES, DEFAULT_AUTO_EXIT_MAX_REPRICES, 0, 20);
  const autoExitForceFlattenBps = Math.max(
    1,
    Number(process.env.TOURAB_AUTO_EXIT_FORCE_FLATTEN_BPS ?? DEFAULT_AUTO_EXIT_FORCE_FLATTEN_BPS)
  );
  const solAutoExitMaxHoldSec = parseBoundedInt(
    process.env.TOURAB_AUTO_EXIT_SOL_MAX_HOLD_SEC,
    DEFAULT_SOL_AUTO_EXIT_MAX_HOLD_SEC,
    30,
    7 * 24 * 60 * 60
  );
  const solAutoExitTpRMultiple = Math.max(
    0.25,
    Number(process.env.TOURAB_AUTO_EXIT_SOL_TP_R_MULTIPLE ?? DEFAULT_SOL_AUTO_EXIT_TP_R_MULTIPLE)
  );
  const solAutoExitOffsetBps = Math.max(
    0,
    Number(process.env.TOURAB_AUTO_EXIT_SOL_OFFSET_BPS ?? DEFAULT_SOL_AUTO_EXIT_OFFSET_BPS)
  );
  const solAutoExitForceFlattenBps = Math.max(
    1,
    Number(process.env.TOURAB_AUTO_EXIT_SOL_FORCE_FLATTEN_BPS ?? DEFAULT_SOL_AUTO_EXIT_FORCE_FLATTEN_BPS)
  );
  const autoExitMaxOffsetBps = parseBoundedInt(process.env.TOURAB_AUTO_EXIT_MAX_OFFSET_BPS, 100, 1, 5_000);
  const autoExitDecisionTraceMax = parseBoundedInt(process.env.TOURAB_AUTO_EXIT_TRACE_MAX, 2000, 100, 20_000);
  const autoExitDecisionTrace: AutoExitDecisionTraceItem[] = [];
  const managedTrades = new Map<string, ManagedTrade>(
    opsStore
      .listManagedTrades(1000)
      .map((row) => toManagedTrade(row))
      .map((trade) => [trade.tradeId, trade])
  );
  if (entryAutonomyConfig.approvalMode !== "manual" && entryAutonomyConfig.approvalMode !== "policy_auto") {
    entryAutonomyConfig.approvalMode = "manual";
  }
  if (!strategyPromotionState.activeVersion) {
    strategyPromotionState.activeVersion = entryAutonomyConfig.strategyVersion;
  }
  entryAutonomyConfig.strategyVersionBySymbol = {
    ...buildDefaultStrategyVersionBySymbol(),
    ...(entryAutonomyConfig.strategyVersionBySymbol ?? {})
  };
  strategyPromotionState.activeVersionBySymbol = {
    ...entryAutonomyConfig.strategyVersionBySymbol,
    ...(strategyPromotionState.activeVersionBySymbol ?? {})
  };
  strategyPromotionState.championVersionBySymbol = {
    ...entryAutonomyConfig.strategyVersionBySymbol,
    ...(strategyPromotionState.championVersionBySymbol ?? {})
  };
  strategyPromotionState.previousStableVersionBySymbol = {
    ...entryAutonomyConfig.strategyVersionBySymbol,
    ...(strategyPromotionState.previousStableVersionBySymbol ?? {})
  };
  if (!strategyPromotionState.championVersion) {
    strategyPromotionState.championVersion = strategyPromotionState.activeVersion;
  }
  if (!Array.isArray(strategyPromotionState.versions) || strategyPromotionState.versions.length === 0) {
    strategyPromotionState.versions = [
      {
        version: strategyPromotionState.activeVersion,
        stage: "shadow",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: "bootstrap"
      }
    ];
  }
  if (!strategyPromotionState.versions.some((item) => item.version === strategyPromotionState.activeVersion)) {
    strategyPromotionState.versions.unshift({
      version: strategyPromotionState.activeVersion,
      stage: "shadow",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: "bootstrap"
    });
  }
  for (const version of Object.values(entryAutonomyConfig.strategyVersionBySymbol)) {
    if (!strategyPromotionState.versions.some((item) => item.version === version)) {
      strategyPromotionState.versions.unshift({
        version,
        stage: "shadow",
        status: version === strategyPromotionState.activeVersion ? "active" : "candidate",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: "symbol bootstrap"
      });
    }
  }
  entryAutonomyConfig.strategyVersion = strategyPromotionState.activeVersion;
  entryAutonomyStatus.approvalMode = entryAutonomyConfig.approvalMode;

  function resolveStrategyVersionForSymbol(symbol: string): string {
    const normalizedSymbol = symbol.trim().toUpperCase();
    return (
      strategyPromotionState.activeVersionBySymbol?.[normalizedSymbol] ??
      entryAutonomyConfig.strategyVersionBySymbol?.[normalizedSymbol] ??
      strategyPromotionState.activeVersion ??
      entryAutonomyConfig.strategyVersion
    );
  }
  function pushAutoExitDecisionTrace(
    item: Omit<AutoExitDecisionTraceItem, "at"> & { at?: string }
  ): void {
    autoExitDecisionTrace.unshift({
      ...item,
      at: item.at ?? new Date().toISOString()
    });
    if (autoExitDecisionTrace.length > autoExitDecisionTraceMax) {
      autoExitDecisionTrace.splice(autoExitDecisionTraceMax);
    }
  }
  persistLearningGovernanceState(new Date().toISOString());
  let exchangeStatus: ExchangeStatus = {
    connected: false,
    mode: exchangeMode,
    source: "none",
    lastHealthCheckAt: new Date(0).toISOString(),
    lastError: "Exchange health not checked yet."
  };
  const performanceTimelineMaxPoints = parseBoundedInt(process.env.TOURAB_PERF_TIMELINE_MAX_POINTS, 500, 50, 5000);
  const performanceTradeLimit = parseBoundedInt(process.env.TOURAB_PERF_TRADE_LIMIT, 200, 20, 2000);
  const performanceFillLimit = parseBoundedInt(process.env.TOURAB_PERF_FILLS_LIMIT, 100, 20, 100);
  const performanceFeeRateBps = Math.max(0, Number(process.env.TOURAB_PERF_FEE_RATE_BPS ?? "8"));
  const exchangeTimezoneOffsetMinutes = parseBoundedInt(process.env.TOURAB_EXCHANGE_TIMEZONE_OFFSET_MINUTES, 480, -840, 840);
  const exchangeTimezoneLabel = formatUtcOffsetLabel(exchangeTimezoneOffsetMinutes);
  const equityTimeline: PortfolioPerformance["timeline"] = [];
  let sessionStartEqUsd: number | undefined;
  let portfolioStatus: PortfolioStatus = {
    totalEq: "0",
    balances: [],
    lastUpdatedAt: new Date(0).toISOString(),
    lastError: "Portfolio health not checked yet.",
    performance: {
      sessionStartEqUsd: 0,
      currentEqUsd: 0,
      deltaUsd: 0,
      deltaPct: 0,
      timeline: [],
      trades: [],
      daily: {
        day: new Date().toISOString().slice(0, 10),
        realizedPnlUsd: 0,
        unrealizedPnlUsd: 0,
        feesUsd: 0,
        winRate: 0,
        wins: 0,
        losses: 0,
        closedTrades: 0
      },
      dailyByBasis: {
        utc: {
          day: new Date().toISOString().slice(0, 10),
          realizedPnlUsd: 0,
          unrealizedPnlUsd: 0,
          feesUsd: 0,
          winRate: 0,
          wins: 0,
          losses: 0,
          closedTrades: 0
        },
        exchange: {
          day: dayKeyAtOffset(new Date().toISOString(), exchangeTimezoneOffsetMinutes),
          realizedPnlUsd: 0,
          unrealizedPnlUsd: 0,
          feesUsd: 0,
          winRate: 0,
          wins: 0,
          losses: 0,
          closedTrades: 0
        }
      },
      exchangeTimezoneOffsetMinutes,
      exchangeTimezoneLabel
    }
  };
  let openOrdersStatus: OpenOrdersStatus = {
    orders: [],
    lastUpdatedAt: new Date(0).toISOString(),
    lastError: "Open orders health not checked yet."
  };
  let latestSuccessfulFills: OkxFillRecord[] = [];
  let latestSuccessfulPendingOrders: OpenOrdersStatus["orders"] = [];

  function getDemoQueueSnapshot(): DemoQueuedIntent[] {
    return [...pendingDemoOrders.entries()]
      .map(([approvalId, queued]) => ({
        approvalId,
        proposalId: queued.proposal.proposalId,
        symbol: queued.intent.symbol,
        side: queued.intent.side,
        qtyBase: queued.intent.qtyBase,
        limitPrice: queued.intent.limitPrice,
        queuedAt: queued.queuedAt
      }))
      .sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
  }

  let inMemoryEvents = await eventStore.readAll();
  let inMemoryAlerts = await alertStore.readAll();
  let inMemoryIncidents = opsStore.listIncidents();
  const persistedAudit = opsStore.listAudit(300);
  if (persistedAudit.length > 0) {
    lifecycle.audit.length = 0;
    lifecycle.audit.push(...persistedAudit);
  }
  const persistedState = opsStore.loadBotState();
  if (persistedState) {
    lifecycle.patchState(persistedState);
  }
  lifecycle.patchState({
    mode: resolveRuntimeMode(exchangeMode, workerExecutionMode)
  });
  const persistedRecon = opsStore.loadReconciliation();
  if (persistedRecon) {
    lifecycle.updateReconciliation(persistedRecon);
  }
  const latestProposalEvent = inMemoryEvents.find((event) => event.type === "ProposalCreated");
  let lastProposalCreatedAtEpoch = latestProposalEvent?.timestamp ? Date.parse(latestProposalEvent.timestamp) : Number.NaN;
  if (!Number.isFinite(lastProposalCreatedAtEpoch)) {
    lastProposalCreatedAtEpoch = Date.now();
  }
  const latestBacklogGuardEvent = inMemoryEvents.find((event) => event.tags?.includes("entry_backlog_guard"));
  let lastWorkerBacklogGuardAtEpoch = latestBacklogGuardEvent?.timestamp
    ? Date.parse(latestBacklogGuardEvent.timestamp)
    : Number.NaN;

  const metrics: OpsMetrics = {
    controlRequestsTotal: 0,
    controlFailuresTotal: 0,
    wsConnectionsTotal: 0,
    wsDisconnectsTotal: 0,
    gatekeeperRejectsTotal: 0,
    driftEventsTotal: 0,
    heartbeatGapEventsTotal: 0,
    lastHeartbeatGapMs: 0,
    openAlerts: inMemoryAlerts.filter((item) => item.status === "open").length,
    openIncidents: inMemoryIncidents.filter((item) => item.status !== "resolved").length,
    reconcileRunsTotal: 0
  };
  let driftConsecutive = 0;
  let driftFirstSeenAtEpoch: number | undefined;
  const workerSymbolOverrides: Record<string, WorkerSymbolOverride> = {
    "SOL-USDT": {
      enabled: parseBooleanEnv(process.env.TOURAB_WORKER_SOL_ENABLED, true),
      side: parseWorkerSidePreference(process.env.TOURAB_WORKER_SOL_SIDE, "sell"),
      maxNotionalUsd: Math.max(0.000001, Number(process.env.TOURAB_WORKER_SOL_MAX_NOTIONAL_USD ?? DEFAULT_WORKER_SOL_MAX_NOTIONAL_USD)),
      entryOffsetBps: Math.max(
        0.0001,
        Number(process.env.TOURAB_WORKER_SOL_ENTRY_OFFSET_BPS ?? DEFAULT_WORKER_SOL_ENTRY_OFFSET_BPS)
      ),
      stopDistanceBps: Math.max(
        0.0001,
        Number(process.env.TOURAB_WORKER_SOL_STOP_DISTANCE_BPS ?? DEFAULT_WORKER_SOL_STOP_DISTANCE_BPS)
      ),
      minBandDistanceBps: Math.max(
        0,
        Number(process.env.TOURAB_WORKER_SOL_MIN_BAND_DISTANCE_BPS ?? DEFAULT_WORKER_SOL_MIN_BAND_DISTANCE_BPS)
      )
    },
    ...parseWorkerSymbolOverrides(process.env.TOURAB_WORKER_SYMBOL_OVERRIDES_JSON)
  };
  const blockedUtcHoursBySymbol: Record<string, number[]> = {
    "SOL-USDT": parseCsvEnv(process.env.TOURAB_WORKER_SOL_BLOCKED_UTC_HOURS, ["08", "12"])
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item))
      .map((item) => Math.floor(item))
      .filter((item) => item >= 0 && item <= 23),
    ...parseWorkerBlockedUtcHours(process.env.TOURAB_WORKER_BLOCKED_UTC_HOURS_JSON)
  };
  const workerMaxPendingEntriesPerSymbol = parseBoundedInt(
    process.env.TOURAB_WORKER_MAX_PENDING_ENTRIES_PER_SYMBOL,
    4,
    1,
    50
  );
  const worker = new RuntimeWorkerManager(
    {
      onEvent: async (event) => {
        await publish(event);
      },
      onStateUpdate: (next) => {
        const updated = lifecycle.patchState(next);
        opsStore.saveBotState(updated);
      },
      getState: () => lifecycle.getSnapshotState(),
      getEntryBacklog: (symbol) => {
        let pendingEntryCount = 0;
        let pendingEntryNotionalUsd = 0;
        for (const trade of managedTrades.values()) {
          if (trade.symbol !== symbol) {
            continue;
          }
          if (
            trade.status !== "planned" &&
            trade.status !== "entry_submitted" &&
            trade.status !== "entry_partially_filled"
          ) {
            continue;
          }
          pendingEntryCount += 1;
          const pendingQty = Math.max(0, round6(trade.requestedQty - trade.entryFilledQty));
          const referencePrice =
            trade.entryAvgPrice > 0 ? trade.entryAvgPrice : trade.stopPrice > 0 ? trade.stopPrice : 0;
          pendingEntryNotionalUsd += pendingQty * referencePrice;
        }
        return {
          pendingEntryCount,
          pendingEntryNotionalUsd: round6(pendingEntryNotionalUsd)
        };
      },
      evaluateSymbolEligibility: async (symbol, nowIso) => {
        const features = opsStore.listClosedTradeFeatures(workerSymbolQualityGate.lookbackTrades);
        return evaluateWorkerSymbolQualityGate({
          symbol,
          nowIso,
          features,
          config: workerSymbolQualityGate
        });
      },
      evaluateTradeEligibility: async ({ symbol, side }) => {
        const features = opsStore.listClosedTradeFeatures(
          Math.max(workerSymbolQualityGate.lookbackTrades, workerTradeSideGate.lookbackTrades)
        );
        return evaluateWorkerTradeSideGate({
          symbol,
          side,
          features,
          config: workerTradeSideGate
        });
      },
      buildRiskContext: ({ market, maxNotionalUsd, executionMode }) => {
        const nowIso = new Date().toISOString();
        const budget = computeLossBudgets(nowIso);
        return {
          account: {
            equityUsd: Math.max(0, toFiniteNumber(portfolioStatus.totalEq)),
            currentDailyLossUsd: budget.dailyLossUsedUsd,
            currentWeeklyLossUsd: budget.weeklyLossUsedUsd,
            currentOpenExposureUsd: computeOpenExposureUsd(),
            asOf: nowIso
          },
          instrument: {
            symbol: market.symbol,
            minSz: market.minSz,
            lotSz: market.lotSz,
            tickSz: market.tickSz
          },
          market: {
            markPrice: market.last,
            asOf: nowIso
          },
          ordersAsOf: nowIso,
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
      },
      getMarketIntelligence: async ({ symbol }) => {
        try {
          const snapshot = await fetchMarketIntelligenceSnapshot(
            symbol,
            process.env.OKX_DEMO_BASE_URL ?? "https://www.okx.com"
          );
          return {
            regime: snapshot.regime,
            confidenceScore: snapshot.confidenceScore,
            trendAlignmentScore: snapshot.trendAlignmentScore,
            recommendedSide: snapshot.recommendedSide,
            recommendedEntryOffsetBps: snapshot.recommendedEntryOffsetBps,
            move1mBps: snapshot.move1mBps,
            move5mBps: snapshot.move5mBps,
            move15mBps: snapshot.move15mBps,
            realizedVolatilityBps: snapshot.realizedVolatilityBps,
            spreadBps: snapshot.spreadBps,
            orderBookImbalancePct: snapshot.orderBookImbalancePct,
            continuationOverextended: snapshot.continuationOverextended,
            projectedMoveBudgetBps: snapshot.projectedMoveBudgetBps
          };
        } catch {
          return undefined;
        }
      },
      queueDemoExecutionApproval: async ({
        symbol,
        proposal,
        intent,
        entryOffsetBps,
        stopDistanceBps,
        requestedNotionalUsd,
        marketIntelligence,
        tradingPlan
      }) => {
        if (workerExecutionMode !== "demo_execution_enabled") {
          return { queued: false, reason: "Execution mode is proposal_only." };
        }
        const mode = resolveExchangeMode(process.env.OKX_TRADING_MODE);
        if (mode !== "demo") {
          return { queued: false, reason: "OKX_TRADING_MODE must be demo." };
        }
        if (pendingDemoOrders.size >= pendingDemoApprovalLimit) {
          return { queued: false, reason: `Pending demo approval limit (${pendingDemoApprovalLimit}) reached.` };
        }
        const nowIso = new Date().toISOString();
        let approvalModeAtDecision: EntryApprovalMode = "manual";
        if (entryAutonomyConfig.approvalMode === "policy_auto") {
          const policyAuto = await evaluatePolicyAutoEligibility({
            symbol,
            intent,
            nowIso
          });
          if (policyAuto.ok) {
            approvalModeAtDecision = "policy_auto";
            entryAutonomyStatus.fallbackActive = false;
            entryAutonomyStatus.lastFallbackAt = undefined;
            entryAutonomyStatus.lastFallbackReason = undefined;
            persistEntryAutonomyState();
          } else {
            // Guardrail rejection should fail the single proposal, not demote global approval mode.
            const reason = `policy_auto guardrails blocked proposal: ${policyAuto.blockers.join(" | ")}`;
            await appendAudit("Policy-auto guardrail blocked proposal", reason, symbol, "RiskLimitHit");
            await publish(
              createEvent(
                "RiskLimitHit",
                symbol,
                reason,
                "warn",
                ["entry_autonomy", "policy_auto", "guardrail_block"]
              )
            );
            return { queued: false, reason: policyAuto.blockers.join(" | ") };
          }
        }
        const request = approvals.create({
          action: "demo_order_submit",
          requestedBy: approvalModeAtDecision === "policy_auto" ? "policy_auto" : "worker",
          reason: `Auto-cycle execution request for ${intent.symbol} proposal=${proposal.proposalId} approvalMode=${approvalModeAtDecision}`
        });
        const entryPrice = Math.max(0.00000001, intent.limitPrice);
        const stopPrice = Math.max(0.00000001, proposal.stopPrice);
        const riskDistance = Math.max(Math.abs(entryPrice - stopPrice), entryPrice * 0.001);
        const baseTpRMultiple = symbol === "SOL-USDT" ? solAutoExitTpRMultiple : autoExitConfig.takeProfitRMultiple;
        const baseMaxHoldSec = symbol === "SOL-USDT" ? solAutoExitMaxHoldSec : autoExitConfig.maxHoldSec;
        const effectiveTpRMultiple =
          typeof tradingPlan?.takeProfitRMultiple === "number" && Number.isFinite(tradingPlan.takeProfitRMultiple)
            ? Math.max(0.25, tradingPlan.takeProfitRMultiple)
            : baseTpRMultiple;
        const effectiveMaxHoldSec =
          typeof tradingPlan?.maxHoldSec === "number" && Number.isFinite(tradingPlan.maxHoldSec)
            ? Math.max(60, Math.floor(tradingPlan.maxHoldSec))
            : baseMaxHoldSec;
        const takeProfitPrice =
          intent.side === "buy"
            ? round6(entryPrice + riskDistance * effectiveTpRMultiple)
            : round6(entryPrice - riskDistance * effectiveTpRMultiple);
        const flattenAt = nextFlattenAtIso(autoExitConfig.flattenTimeUtc);
        const effectiveStrategyVersion = resolveStrategyVersionForSymbol(symbol);
        pendingDemoOrders.set(request.id, {
          intent,
          proposal,
          symbol,
          stopPrice,
          takeProfitPrice,
          maxHoldSec: effectiveMaxHoldSec,
          flattenAt,
          approvalModeAtDecision,
          strategyVersion: effectiveStrategyVersion,
          policyVersion: entryAutonomyConfig.policyVersion,
          modelVersion: learningGovernanceState.activeModelVersion,
          entryOffsetBps,
          stopDistanceBps,
          takeProfitRMultiple: effectiveTpRMultiple,
          requestedNotionalUsd: round6(Math.max(0, requestedNotionalUsd)),
          marketIntelligence,
          tradingPlan,
          queuedAt: new Date().toISOString()
        });
        await appendAudit(
          "Demo execution approval queued",
          `Approval ${request.id} queued for demo order submit proposal=${proposal.proposalId} symbol=${intent.symbol} stop=${stopPrice} tp=${takeProfitPrice} maxHoldSec=${effectiveMaxHoldSec} tpR=${effectiveTpRMultiple} approvalMode=${approvalModeAtDecision} strategy=${effectiveStrategyVersion} policy=${entryAutonomyConfig.policyVersion}`,
          symbol,
          "ProposalApproved"
        );
        if (approvalModeAtDecision === "policy_auto") {
          approvals.approve(request.id, "policy_auto_runtime");
          const queued = pendingDemoOrders.get(request.id);
          if (queued) {
            try {
              await executeQueuedDemoOrder({
                approvedId: request.id,
                queued,
                actor: "policy_auto_runtime"
              });
            } catch (error: unknown) {
              const { transient, message } = classifyMissionControlSubmitFailure(error);
              pendingDemoOrders.delete(request.id);
              await upsertAlert({
                code: transient ? "RUNTIME_ERROR_EVENT" : "POLICY_AUTO_SUBMIT_FAILED",
                severity: transient ? "warn" : "error",
                source: "exchange",
                title: transient ? "Policy-auto demo submit transient failure" : "Policy-auto demo submit failed",
                detail: message,
                symbol
              });
              await publish(
                createEvent(
                  "Error",
                  symbol,
                  transient
                    ? `Policy-auto demo submit transient failure approval=${request.id} error=${message}`
                    : `Policy-auto demo submit failed approval=${request.id} error=${message}`,
                  transient ? "warn" : "error",
                  ["entry_autonomy", "policy_auto", transient ? "okx_transient" : "okx_error"]
                )
              );
              if (!transient) {
                await upsertAlert({
                  code: "POLICY_AUTO_SUBMIT_FAILED",
                  severity: "error",
                  source: "exchange",
                  title: "Policy-auto demo submit failed",
                  detail: message,
                  symbol
                });
                await fallbackApprovalModeToManual(`policy_auto submit failure: ${message}`, symbol, "critical");
              }
              return { queued: false, reason: message };
            }
          }
        }
        return { queued: true, approvalId: request.id };
      }
    },
    {
      symbolUniverse: (process.env.TOURAB_WORKER_SYMBOLS ?? "BTC-USDT,ETH-USDT")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      baseUrl: process.env.OKX_DEMO_BASE_URL ?? "https://www.okx.com",
      intervalMs: parseBoundedInt(process.env.TOURAB_WORKER_INTERVAL_MS, 7_500, 2_000, 120_000),
      maxRiskUsd: Number(process.env.TOURAB_WORKER_MAX_RISK_USD ?? "0.2"),
      maxNotionalUsd: Number(process.env.TOURAB_WORKER_MAX_NOTIONAL_USD ?? "12"),
      entryOffsetBps: Number(process.env.TOURAB_WORKER_ENTRY_OFFSET_BPS ?? "20"),
      stopDistanceBps: Number(process.env.TOURAB_WORKER_STOP_DISTANCE_BPS ?? "150"),
      signalLookbackSec: parseBoundedInt(
        process.env.TOURAB_WORKER_SIGNAL_LOOKBACK_SEC,
        DEFAULT_WORKER_SIGNAL_LOOKBACK_SEC,
        10,
        3600
      ),
      signalShortLookbackSec: parseBoundedInt(
        process.env.TOURAB_WORKER_SIGNAL_SHORT_LOOKBACK_SEC,
        DEFAULT_WORKER_SIGNAL_SHORT_LOOKBACK_SEC,
        5,
        600
      ),
      signalMinMoveBps: parseBoundedNumber(
        process.env.TOURAB_WORKER_SIGNAL_MIN_MOVE_BPS,
        DEFAULT_WORKER_SIGNAL_MIN_MOVE_BPS,
        0,
        1000
      ),
      signalMinAbsoluteMoveBps: parseBoundedNumber(
        process.env.TOURAB_WORKER_SIGNAL_MIN_ABSOLUTE_MOVE_BPS,
        6,
        0,
        1000
      ),
      signalTrendVolatilityThresholdMultiplier: parseBoundedNumber(
        process.env.TOURAB_WORKER_SIGNAL_TREND_VOLATILITY_THRESHOLD_MULTIPLIER,
        3,
        0,
        100
      ),
      signalMinVolatilityBps: parseBoundedNumber(
        process.env.TOURAB_WORKER_SIGNAL_MIN_VOLATILITY_BPS,
        DEFAULT_WORKER_SIGNAL_MIN_VOLATILITY_BPS,
        0,
        1000
      ),
      signalRoundTripFeeBps: parseBoundedNumber(
        process.env.TOURAB_WORKER_SIGNAL_ROUND_TRIP_FEE_BPS,
        DEFAULT_WORKER_SIGNAL_ROUND_TRIP_FEE_BPS,
        0,
        1000
      ),
      quietRegimeTrendEfficiencyMin: parseBoundedNumber(
        process.env.TOURAB_WORKER_QUIET_REGIME_TREND_EFFICIENCY_MIN,
        DEFAULT_WORKER_QUIET_REGIME_TREND_EFFICIENCY_MIN,
        1,
        100
      ),
      quietRegimeMoveThresholdMultiplier: parseBoundedNumber(
        process.env.TOURAB_WORKER_QUIET_REGIME_MOVE_THRESHOLD_MULTIPLIER,
        DEFAULT_WORKER_QUIET_REGIME_MOVE_THRESHOLD_MULTIPLIER,
        0.5,
        5
      ),
      buyTrendStrengthMultiplier: parseBoundedNumber(
        process.env.TOURAB_WORKER_BUY_TREND_STRENGTH_MULTIPLIER,
        DEFAULT_WORKER_BUY_TREND_STRENGTH_MULTIPLIER,
        1,
        5
      ),
      sellTrendStrengthMultiplier: parseBoundedNumber(
        process.env.TOURAB_WORKER_SELL_TREND_STRENGTH_MULTIPLIER,
        DEFAULT_WORKER_SELL_TREND_STRENGTH_MULTIPLIER,
        0.5,
        5
      ),
      buyShortMoveConfirmationBps: parseBoundedNumber(
        process.env.TOURAB_WORKER_BUY_SHORT_MOVE_CONFIRMATION_BPS,
        DEFAULT_WORKER_BUY_SHORT_MOVE_CONFIRMATION_BPS,
        0,
        100
      ),
      sellShortMoveConfirmationBps: parseBoundedNumber(
        process.env.TOURAB_WORKER_SELL_SHORT_MOVE_CONFIRMATION_BPS,
        DEFAULT_WORKER_SELL_SHORT_MOVE_CONFIRMATION_BPS,
        0,
        100
      ),
      buyEntryOffsetMultiplier: parseBoundedNumber(
        process.env.TOURAB_WORKER_BUY_ENTRY_OFFSET_MULTIPLIER,
        DEFAULT_WORKER_BUY_ENTRY_OFFSET_MULTIPLIER,
        0.5,
        3
      ),
      sellEntryOffsetMultiplier: parseBoundedNumber(
        process.env.TOURAB_WORKER_SELL_ENTRY_OFFSET_MULTIPLIER,
        DEFAULT_WORKER_SELL_ENTRY_OFFSET_MULTIPLIER,
        0.5,
        3
      ),
      expectedMoveHurdleEnabled: parseBooleanEnv(
        process.env.TOURAB_WORKER_EXPECTED_MOVE_HURDLE_ENABLED,
        DEFAULT_WORKER_EXPECTED_MOVE_HURDLE_ENABLED
      ),
      expectedMoveTakeProfitRMultiple: parseBoundedNumber(
        process.env.TOURAB_WORKER_EXPECTED_MOVE_TP_R_MULTIPLE,
        DEFAULT_WORKER_EXPECTED_MOVE_TP_R_MULTIPLE,
        0.1,
        10
      ),
      expectedMoveFeeCoverageMultiple: parseBoundedNumber(
        process.env.TOURAB_WORKER_EXPECTED_MOVE_FEE_COVERAGE_MULTIPLE,
        DEFAULT_WORKER_EXPECTED_MOVE_FEE_COVERAGE_MULTIPLE,
        0.5,
        10
      ),
      expectedMoveMinNetEdgeBps: parseBoundedNumber(
        process.env.TOURAB_WORKER_EXPECTED_MOVE_MIN_NET_EDGE_BPS,
        DEFAULT_WORKER_EXPECTED_MOVE_MIN_NET_EDGE_BPS,
        0,
        1000
      ),
      marketIntelligenceMinConfidenceScore: parseBoundedNumber(
        process.env.TOURAB_WORKER_MARKET_INTELLIGENCE_MIN_CONFIDENCE_SCORE,
        DEFAULT_WORKER_MARKET_INTELLIGENCE_MIN_CONFIDENCE,
        0,
        100
      ),
      marketIntelligenceMaxSpreadBps: parseBoundedNumber(
        process.env.TOURAB_WORKER_MARKET_INTELLIGENCE_MAX_SPREAD_BPS,
        DEFAULT_WORKER_MARKET_INTELLIGENCE_MAX_SPREAD_BPS,
        0,
        100
      ),
      requireMarketIntelligenceSideAlignment: parseBooleanEnv(
        process.env.TOURAB_WORKER_REQUIRE_MARKET_INTELLIGENCE_ALIGNMENT,
        DEFAULT_WORKER_REQUIRE_MARKET_INTELLIGENCE_ALIGNMENT
      ),
      blockChopRegimes: parseBooleanEnv(
        process.env.TOURAB_WORKER_BLOCK_CHOP_REGIMES,
        DEFAULT_WORKER_BLOCK_CHOP_REGIMES
      ),
      maxMoveBudgetUsagePct: parseBoundedNumber(
        process.env.TOURAB_WORKER_MAX_MOVE_BUDGET_USAGE_PCT,
        DEFAULT_WORKER_MAX_MOVE_BUDGET_USAGE_PCT,
        1,
        1000
      ),
      btcBuyMinConfidenceScore: parseBoundedNumber(process.env.TOURAB_WORKER_BTC_BUY_MIN_CONFIDENCE, 65, 0, 100),
      btcBuyMinTrendAlignmentScore: parseBoundedNumber(process.env.TOURAB_WORKER_BTC_BUY_MIN_TREND_ALIGNMENT, 20, 0, 100),
      btcBuyMinMove5mBps: parseBoundedNumber(process.env.TOURAB_WORKER_BTC_BUY_MIN_MOVE_5M_BPS, 4, 0, 1000),
      ethRequireBtcConfirmation: parseBooleanEnv(process.env.TOURAB_WORKER_ETH_REQUIRE_BTC_CONFIRMATION, true),
      ethBtcMinConfidenceScore: parseBoundedNumber(process.env.TOURAB_WORKER_ETH_BTC_MIN_CONFIDENCE, 55, 0, 100),
      ethBtcMinTrendAlignmentScore: parseBoundedNumber(process.env.TOURAB_WORKER_ETH_BTC_MIN_TREND_ALIGNMENT, 18, 0, 100),
      ethBtcRelativeStrengthMinDelta: parseBoundedNumber(process.env.TOURAB_WORKER_ETH_BTC_RELATIVE_STRENGTH_MIN_DELTA, 0.15, 0, 10),
      requireSignalEvaluationSymbols: parseCsvEnv(
        process.env.TOURAB_WORKER_REQUIRE_SIGNAL_EVALUATION_SYMBOLS,
        ["BTC-USDT", "ETH-USDT"]
      ),
      requireMarketIntelligenceSymbols: parseCsvEnv(
        process.env.TOURAB_WORKER_REQUIRE_MARKET_INTELLIGENCE_SYMBOLS,
        ["BTC-USDT", "ETH-USDT"]
      ),
      retryMaxAttempts: parseBoundedInt(process.env.TOURAB_WORKER_RETRY_MAX_ATTEMPTS, 3, 1, 10),
      retryBudgetPerHour: parseBoundedInt(process.env.TOURAB_WORKER_RETRY_BUDGET_PER_HOUR, 30, 1, 1000),
      maxPendingEntriesPerSymbol: workerMaxPendingEntriesPerSymbol,
      executionMode: workerExecutionMode,
      defaultMaxHoldSec: autoExitConfig.maxHoldSec,
      defaultSide: parseWorkerSidePreference(process.env.TOURAB_WORKER_DEFAULT_SIDE, "buy"),
      symbolOverrides: workerSymbolOverrides,
      blockedUtcHoursBySymbol
    }
  );

  function upsertManagedTrade(trade: ManagedTrade): void {
    managedTrades.set(trade.tradeId, trade);
    opsStore.upsertManagedTrade(toManagedTradeRecord(trade));
  }

  function persistLearningGovernanceState(nowIso: string): void {
    learningGovernanceState.updatedAt = nowIso;
    opsStore.saveRuntimeState("learning_governance_state", learningGovernanceState);
  }

  function persistClosedTradeFeature(trade: ManagedTrade, nowIso: string): void {
    const feature = toClosedTradeFeatureRecord(trade, {
      policyVersion: entryAutonomyConfig.policyVersion,
      strategyVersion: entryAutonomyConfig.strategyVersion,
      modelVersion: learningGovernanceState.activeModelVersion,
      extractedAt: nowIso
    });
    if (!feature) {
      return;
    }
    opsStore.upsertClosedTradeFeature(feature);
  }

  function persistEntryAutonomyState(): void {
    opsStore.saveRuntimeState("entry_autonomy_config", entryAutonomyConfig);
    opsStore.saveRuntimeState("entry_autonomy_status", entryAutonomyStatus);
  }

  function persistStrategyPromotionState(): void {
    opsStore.saveRuntimeState("strategy_promotion_state", strategyPromotionState);
    entryAutonomyConfig.strategyVersion = strategyPromotionState.activeVersion;
    entryAutonomyConfig.strategyVersionBySymbol = {
      ...(entryAutonomyConfig.strategyVersionBySymbol ?? {}),
      ...(strategyPromotionState.activeVersionBySymbol ?? {})
    };
    persistEntryAutonomyState();
  }

  function persistStrategyDegradationConfig(): void {
    opsStore.saveRuntimeState("strategy_degradation_config", strategyDegradationConfig);
  }

  function persistLearningAlertThresholds(): void {
    opsStore.saveRuntimeState("learning_alert_thresholds", learningAlertThresholds);
  }

  function persistLearningRetentionConfig(): void {
    opsStore.saveRuntimeState("learning_retention_config", learningRetentionConfig);
  }

  function buildLearningRetentionStatus(): LearningRetentionStatus {
    const stats = opsStore.getClosedTradeFeatureStats();
    return {
      config: learningRetentionConfig,
      stats: {
        featureCount: stats.count,
        oldestClosedAt: stats.oldestClosedAt,
        newestClosedAt: stats.newestClosedAt
      },
      lastPruneAt: learningRetentionLastPruneAt,
      lastPruneResult: learningRetentionLastPruneResult
    };
  }

  const startupIso = new Date().toISOString();
  for (const trade of managedTrades.values()) {
    if (trade.status === "closed") {
      persistClosedTradeFeature(trade, startupIso);
    }
  }

  function stageRank(stage: StrategyPromotionStage): number {
    if (stage === "research") return 0;
    if (stage === "shadow") return 1;
    if (stage === "paper_canary") return 2;
    return 3;
  }

  function findStrategy(version: string): StrategyVersionRecord | undefined {
    return strategyPromotionState.versions.find((item) => item.version === version);
  }

  function normalizeStrategySymbol(raw: string | undefined): string | undefined {
    const normalized = raw?.trim().toUpperCase();
    return normalized ? normalized : undefined;
  }

  function inferStrategySymbolFromVersion(version: string): string | undefined {
    return Object.entries(entryAutonomyConfig.strategyVersionBySymbol ?? {}).find(([, mappedVersion]) => mappedVersion === version)?.[0];
  }

  function resolveStrategyGovernanceSymbol(rawSymbol: string | undefined, version: string): string | undefined {
    return normalizeStrategySymbol(rawSymbol) ?? inferStrategySymbolFromVersion(version);
  }

  function upsertStrategyVersion(record: StrategyVersionRecord): void {
    const next = strategyPromotionState.versions.filter((item) => item.version !== record.version);
    next.unshift(record);
    strategyPromotionState.versions = next.slice(0, 200);
  }

  function setActiveStrategyVersion(nextVersion: string, symbol?: string): void {
    strategyPromotionState.activeVersion = nextVersion;
    if (!strategyPromotionState.previousStableVersion) {
      strategyPromotionState.previousStableVersion = nextVersion;
    }
    const nowIso = new Date().toISOString();
    strategyPromotionState.versions = strategyPromotionState.versions.map((item) => {
      if (item.version === nextVersion) {
        return { ...item, status: "active", updatedAt: nowIso };
      }
      if (item.status === "active") {
        return { ...item, status: "candidate", updatedAt: nowIso };
      }
      return item;
    });
    if (!strategyPromotionState.versions.some((item) => item.version === nextVersion)) {
      strategyPromotionState.versions.unshift({
        version: nextVersion,
        stage: "research",
        status: "active",
        createdAt: nowIso,
        updatedAt: nowIso,
        notes: "auto-inserted"
      });
    }
    const normalizedSymbol = normalizeStrategySymbol(symbol);
    if (normalizedSymbol) {
      const previousBySymbol = strategyPromotionState.activeVersionBySymbol?.[normalizedSymbol];
      strategyPromotionState.activeVersionBySymbol = {
        ...(strategyPromotionState.activeVersionBySymbol ?? {}),
        [normalizedSymbol]: nextVersion
      };
      strategyPromotionState.championVersionBySymbol = {
        ...(strategyPromotionState.championVersionBySymbol ?? {}),
        [normalizedSymbol]: nextVersion
      };
      strategyPromotionState.previousStableVersionBySymbol = {
        ...(strategyPromotionState.previousStableVersionBySymbol ?? {}),
        [normalizedSymbol]: previousBySymbol && previousBySymbol !== nextVersion ? previousBySymbol : nextVersion
      };
      entryAutonomyConfig.strategyVersionBySymbol = {
        ...(entryAutonomyConfig.strategyVersionBySymbol ?? {}),
        [normalizedSymbol]: nextVersion
      };
    }
  }

  async function evaluatePromotionGates(targetStage: StrategyPromotionStage, nowIso: string): Promise<string[]> {
    const blockers: string[] = [];
    if (targetStage === "limited_prod") {
      const m5 = await buildMilestone5EvidenceSummary(nowIso);
      if (!m5.today.pass || m5.qualifiedDays < m5.requiredDays) {
        blockers.push(`Milestone5 readiness insufficient (${m5.qualifiedDays}/${m5.requiredDays}, todayPass=${m5.today.pass}).`);
      }
      if (entryAutonomyConfig.approvalMode !== "policy_auto") {
        blockers.push("approval_mode must be policy_auto for limited_prod.");
      }
    }
    if (targetStage === "paper_canary" || targetStage === "limited_prod") {
      if (inMemoryIncidents.some((item) => item.status !== "resolved")) {
        blockers.push("Open incidents present.");
      }
      if (inMemoryAlerts.some((item) => item.status === "open" && item.severity === "critical")) {
        blockers.push("Open critical alerts present.");
      }
      if (
        lifecycle.reconciliation.positions !== "ok" ||
        lifecycle.reconciliation.pnl !== "ok" ||
        lifecycle.reconciliation.orders !== "ok"
      ) {
        blockers.push("Reconciliation is not fully OK.");
      }
    }
    return blockers;
  }

  async function rollbackStrategyOnDegradation(reason: string, actor: string, symbol: string, force = false): Promise<boolean> {
    const normalizedSymbol = normalizeStrategySymbol(symbol);
    const activeVersion =
      (normalizedSymbol ? strategyPromotionState.activeVersionBySymbol?.[normalizedSymbol] : undefined) ??
      strategyPromotionState.activeVersion;
    const previousVersion =
      (normalizedSymbol ? strategyPromotionState.previousStableVersionBySymbol?.[normalizedSymbol] : undefined) ??
      strategyPromotionState.previousStableVersion;
    const active = activeVersion ? findStrategy(activeVersion) : undefined;
    const previous = previousVersion ? findStrategy(previousVersion) : undefined;
    if (!active || !previous || previous.version === active.version) {
      return false;
    }
    if (!force && active.stage !== "paper_canary" && active.stage !== "limited_prod") {
      return false;
    }
    const nowIso = new Date().toISOString();
    upsertStrategyVersion({
      ...active,
      status: "rolled_back",
      updatedAt: nowIso
    });
    upsertStrategyVersion({
      ...previous,
      status: "active",
      updatedAt: nowIso
    });
    strategyPromotionState.activeVersion = previous.version;
    strategyPromotionState.championVersion = previous.version;
    strategyPromotionState.challengerVersion = active.version;
    if (normalizedSymbol) {
      strategyPromotionState.activeVersionBySymbol = {
        ...(strategyPromotionState.activeVersionBySymbol ?? {}),
        [normalizedSymbol]: previous.version
      };
      strategyPromotionState.championVersionBySymbol = {
        ...(strategyPromotionState.championVersionBySymbol ?? {}),
        [normalizedSymbol]: previous.version
      };
      strategyPromotionState.challengerVersionBySymbol = {
        ...(strategyPromotionState.challengerVersionBySymbol ?? {}),
        [normalizedSymbol]: active.version
      };
      entryAutonomyConfig.strategyVersionBySymbol = {
        ...(entryAutonomyConfig.strategyVersionBySymbol ?? {}),
        [normalizedSymbol]: previous.version
      };
    }
    strategyPromotionState.history.unshift({
      at: nowIso,
      action: "rollback",
      version: active.version,
      actor,
      fromStage: active.stage,
      toStage: previous.stage,
      reason
    });
    strategyPromotionState.history = strategyPromotionState.history.slice(0, 400);
    persistStrategyPromotionState();
    await appendAudit(
      "Strategy rollback",
      `Rolled back strategy from ${active.version} to ${previous.version}; reason=${reason}; actor=${actor}`,
      symbol,
      "System"
    );
    await publish(
      createEvent(
        "System",
        symbol,
        `Strategy rollback executed from ${active.version} to ${previous.version}: ${reason}`,
        "warn",
        ["strategy_promotion", "rollback"]
      )
    );
    return true;
  }

  async function evaluateStrategyDegradationTriggers(nowIso: string): Promise<void> {
    if (!strategyDegradationConfig.enabled) {
      return;
    }
    const active = findStrategy(strategyPromotionState.activeVersion);
    if (!active || (active.stage !== "paper_canary" && active.stage !== "limited_prod")) {
      return;
    }
    const daily = portfolioStatus.performance.dailyByBasis?.utc ?? portfolioStatus.performance.daily;
    if (Math.abs(Math.min(0, daily.realizedPnlUsd)) >= strategyDegradationConfig.maxDailyLossUsd) {
      await rollbackStrategyOnDegradation(
        `daily loss breach: ${daily.realizedPnlUsd} <= -${strategyDegradationConfig.maxDailyLossUsd}`,
        "system",
        lifecycle.getSnapshotState().activeSymbol
      );
      return;
    }
    const latestTimeline = portfolioStatus.performance.timeline[portfolioStatus.performance.timeline.length - 1];
    if (latestTimeline && latestTimeline.drawdownPct <= strategyDegradationConfig.maxDrawdownPct) {
      await rollbackStrategyOnDegradation(
        `drawdown breach: ${latestTimeline.drawdownPct}% <= ${strategyDegradationConfig.maxDrawdownPct}%`,
        "system",
        lifecycle.getSnapshotState().activeSymbol
      );
      return;
    }
    const closed = [...managedTrades.values()]
      .filter((trade) => trade.closedAt && Number.isFinite(Date.parse(trade.closedAt)))
      .sort((a, b) => Date.parse(b.closedAt ?? b.updatedAt) - Date.parse(a.closedAt ?? a.updatedAt));
    let consecutiveLosses = 0;
    for (const trade of closed) {
      if (toFiniteNumber(trade.realizedPnlUsd) < 0) {
        consecutiveLosses += 1;
      } else {
        break;
      }
    }
    if (consecutiveLosses >= strategyDegradationConfig.maxConsecutiveLosingTrades) {
      await rollbackStrategyOnDegradation(
        `consecutive loss breach: ${consecutiveLosses} >= ${strategyDegradationConfig.maxConsecutiveLosingTrades}`,
        "system",
        lifecycle.getSnapshotState().activeSymbol
      );
      return;
    }
    void nowIso;
  }

  async function fallbackApprovalModeToManual(reason: string, symbol: string, severity: "warn" | "critical" = "warn"): Promise<void> {
    if (entryAutonomyConfig.approvalMode !== "policy_auto") {
      return;
    }
    const nowIso = new Date().toISOString();
    entryAutonomyConfig.approvalMode = "manual";
    entryAutonomyStatus.approvalMode = "manual";
    entryAutonomyStatus.fallbackActive = true;
    entryAutonomyStatus.lastFallbackAt = nowIso;
    entryAutonomyStatus.lastFallbackReason = reason;
    persistEntryAutonomyState();
    await upsertAlert({
      code: "APPROVAL_MODE_FALLBACK",
      severity,
      source: "system",
      title: "Approval mode fallback to manual",
      detail: reason,
      symbol
    });
    await publish(
      createEvent(
        "System",
        symbol,
        `Approval mode fallback to manual: ${reason}`,
        severity === "critical" ? "error" : "warn",
        ["entry_autonomy", "fallback_manual"]
      )
    );
    await appendAudit("Approval mode fallback", `approvalMode=manual reason=${reason}`, symbol, "System");
    if (severity === "critical") {
      await rollbackStrategyOnDegradation(`approval fallback critical: ${reason}`, "system", symbol);
    }
  }

  function computeOpenExposureUsd(): number {
    let exposure = 0;
    for (const trade of managedTrades.values()) {
      if (trade.status === "closed" || trade.remainingQty <= 1e-9) {
        continue;
      }
      const refPrice =
        trade.entryAvgPrice > 0
          ? trade.entryAvgPrice
          : trade.exitAvgPrice > 0
            ? trade.exitAvgPrice
            : trade.takeProfitPrice > 0
              ? trade.takeProfitPrice
              : trade.stopPrice;
      exposure += Math.max(0, trade.remainingQty) * Math.max(0, refPrice);
    }
    return round6(exposure);
  }

  function computeLossBudgets(nowIso: string): { dailyLossUsedUsd: number; weeklyLossUsedUsd: number; lossStreak: number; cooldownActive: boolean } {
    const nowEpoch = Date.parse(nowIso);
    const dayStartEpoch = Number.isFinite(nowEpoch) ? Date.parse(nowIso.slice(0, 10) + "T00:00:00.000Z") : Number.NaN;
    const weekStartEpoch = Number.isFinite(nowEpoch) ? nowEpoch - 7 * 24 * 60 * 60 * 1000 : Number.NaN;
    let dailyLossUsedUsd = 0;
    let weeklyLossUsedUsd = 0;
    const closed = [...managedTrades.values()]
      .filter((trade) => trade.closedAt && Number.isFinite(Date.parse(trade.closedAt)))
      .sort((a, b) => Date.parse(b.closedAt ?? b.updatedAt) - Date.parse(a.closedAt ?? a.updatedAt));
    for (const trade of closed) {
      const pnl = toFiniteNumber(trade.realizedPnlUsd);
      if (pnl >= 0) {
        continue;
      }
      const closedEpoch = Date.parse(trade.closedAt ?? trade.updatedAt);
      if (Number.isFinite(dayStartEpoch) && closedEpoch >= dayStartEpoch) {
        dailyLossUsedUsd += Math.abs(pnl);
      }
      if (Number.isFinite(weekStartEpoch) && closedEpoch >= weekStartEpoch) {
        weeklyLossUsedUsd += Math.abs(pnl);
      }
    }
    let lossStreak = 0;
    for (const trade of closed) {
      const pnl = toFiniteNumber(trade.realizedPnlUsd);
      if (pnl < 0) {
        lossStreak += 1;
        continue;
      }
      break;
    }
    const cooldownActive =
      lossStreak >= entryAutonomyConfig.lossStreakCooldownCount &&
      closed.length > 0 &&
      Number.isFinite(nowEpoch) &&
      nowEpoch - Date.parse(closed[0].closedAt ?? closed[0].updatedAt) < entryAutonomyConfig.cooldownMinutes * 60_000;
    return {
      dailyLossUsedUsd: round6(dailyLossUsedUsd),
      weeklyLossUsedUsd: round6(weeklyLossUsedUsd),
      lossStreak,
      cooldownActive
    };
  }

  function persistAutoPauseState(): void {
    opsStore.saveRuntimeState("auto_pause_state", autoPauseState);
  }

  function shouldAutoPauseForScope(): boolean {
    if (!autoPauseConfig.enabled) {
      return false;
    }
    if (autoPauseConfig.scope === "both") {
      return true;
    }
    return exchangeMode === autoPauseConfig.scope;
  }

  async function triggerAutoPause(reason: string, symbol: string, severity: "warn" | "error" = "warn"): Promise<void> {
    if (!shouldAutoPauseForScope()) {
      return;
    }
    if (autoPauseState.active) {
      return;
    }
    if (lifecycle.getSnapshotState().state !== "running") {
      return;
    }
    const nowIso = new Date().toISOString();
    const resumeAt = new Date(Date.now() + autoPauseConfig.maxPauseMinutes * 60_000).toISOString();
    const result = lifecycle.applyAction("pause");
    if (!result.ok) {
      return;
    }
    worker.pause();
    opsStore.saveBotState(result.state);
    autoPauseState = {
      active: true,
      reason,
      pausedAt: nowIso,
      resumeAt,
      lastAutoPauseAt: nowIso
    };
    persistAutoPauseState();
    await upsertAlert({
      code: "AUTO_PAUSE_TRIGGERED",
      severity,
      source: "system",
      title: "Auto-pause triggered",
      detail: `${reason} (resumeAt=${resumeAt})`,
      symbol
    });
    await publish(
      createEvent(
        "System",
        symbol,
        `Auto-pause triggered: ${reason} resumeAt=${resumeAt}`,
        severity === "error" ? "error" : "warn",
        ["auto_pause"]
      )
    );
    await appendAudit("Auto-pause", `reason=${reason} resumeAt=${resumeAt}`, symbol, "System");
  }

  async function evaluateAutoResume(nowIso: string): Promise<void> {
    if (!autoPauseState.active) {
      return;
    }
    if (lifecycle.getSnapshotState().state !== "paused") {
      return;
    }
    if (!autoPauseState.resumeAt) {
      return;
    }
    const resumeEpoch = Date.parse(autoPauseState.resumeAt);
    const nowEpoch = Date.parse(nowIso);
    if (!Number.isFinite(resumeEpoch) || !Number.isFinite(nowEpoch) || nowEpoch < resumeEpoch) {
      return;
    }
    const result = lifecycle.applyAction("resume");
    if (!result.ok) {
      return;
    }
    worker.start();
    opsStore.saveBotState(result.state);
    entryAutonomyConfig.approvalMode = autoPauseConfig.resumeMode;
    entryAutonomyStatus.approvalMode = autoPauseConfig.resumeMode;
    entryAutonomyStatus.fallbackActive = false;
    entryAutonomyStatus.lastFallbackReason = undefined;
    entryAutonomyStatus.lastFallbackAt = undefined;
    persistEntryAutonomyState();
    autoPauseState.active = false;
    autoPauseState.lastAutoResumeAt = nowIso;
    persistAutoPauseState();
    await resolveAlertIfOpen("AUTO_PAUSE_TRIGGERED", lifecycle.getSnapshotState().activeSymbol, "system");
    await publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        `Auto-resume executed after pause window; approvalMode=${autoPauseConfig.resumeMode}`,
        "info",
        ["auto_resume"]
      )
    );
    await appendAudit(
      "Auto-resume",
      `approvalMode=${autoPauseConfig.resumeMode} resumeAt=${autoPauseState.resumeAt ?? "unknown"}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
  }

  async function evaluateAutoPauseConditions(nowIso: string): Promise<void> {
    if (!shouldAutoPauseForScope()) {
      return;
    }
    const symbol = lifecycle.getSnapshotState().activeSymbol;
    const budget = computeLossBudgets(nowIso);
    if (budget.dailyLossUsedUsd >= entryAutonomyConfig.maxDailyLossUsd) {
      await triggerAutoPause(`daily loss cap breached: used=${budget.dailyLossUsedUsd} cap=${entryAutonomyConfig.maxDailyLossUsd}`, symbol, "error");
      return;
    }
    if (budget.weeklyLossUsedUsd >= entryAutonomyConfig.maxWeeklyLossUsd) {
      await triggerAutoPause(`weekly loss cap breached: used=${budget.weeklyLossUsedUsd} cap=${entryAutonomyConfig.maxWeeklyLossUsd}`, symbol, "error");
      return;
    }
    if (budget.lossStreak >= entryAutonomyConfig.lossStreakCooldownCount) {
      await triggerAutoPause(
        `loss streak breached: streak=${budget.lossStreak} threshold=${entryAutonomyConfig.lossStreakCooldownCount}`,
        symbol,
        "warn"
      );
      return;
    }
    const latestTimeline = portfolioStatus.performance.timeline[portfolioStatus.performance.timeline.length - 1];
    if (latestTimeline && latestTimeline.drawdownPct <= strategyDegradationConfig.maxDrawdownPct) {
      await triggerAutoPause(
        `drawdown breached: drawdown=${latestTimeline.drawdownPct}% threshold=${strategyDegradationConfig.maxDrawdownPct}%`,
        symbol,
        "error"
      );
    }
  }

  async function evaluatePolicyAutoEligibility(input: {
    symbol: string;
    intent: ExecutionIntent;
    nowIso: string;
  }): Promise<{ ok: boolean; blockers: string[] }> {
    const blockers: string[] = [];
    if (input.symbol === "ETH-USDT") {
      blockers.push("ETH-USDT remains shadow/manual until it has symbol-level promotable evidence.");
    }
    if (entryAutonomyConfig.approvalMode !== "policy_auto") {
      blockers.push("Approval mode is manual.");
    }
    if (!entryAutonomyConfig.allowedSymbols.includes(input.symbol)) {
      blockers.push(`Symbol ${input.symbol} is not in allowlist.`);
    }
    const notionalUsd = Math.max(0, input.intent.qtyBase * input.intent.limitPrice);
    if (notionalUsd > entryAutonomyConfig.maxPerOrderNotionalUsd) {
      blockers.push(`Per-order notional ${round6(notionalUsd)} exceeds max ${entryAutonomyConfig.maxPerOrderNotionalUsd}.`);
    }
    const openExposureUsd = computeOpenExposureUsd();
    if (openExposureUsd + notionalUsd > entryAutonomyConfig.maxOpenExposureUsd) {
      blockers.push(
        `Open exposure would exceed cap: current=${openExposureUsd} next=${round6(openExposureUsd + notionalUsd)} cap=${entryAutonomyConfig.maxOpenExposureUsd}.`
      );
    }
    const activeTradesForSymbol = [...managedTrades.values()].filter((trade) => {
      if (trade.symbol !== input.symbol) {
        return false;
      }
      if (trade.status === "closed" || trade.status === "canceled" || trade.status === "error") {
        return false;
      }
      if (trade.entryFilledQty > 0) {
        return trade.remainingQty > 1e-9 || trade.status === "entry_partially_filled" || trade.status === "entry_filled" || trade.status === "exit_pending" || trade.status === "exit_submitted";
      }
      return false;
    }).length;
    if (activeTradesForSymbol >= policyAutoMaxOpenTradesPerSymbol) {
      blockers.push(
        `Active managed trades for ${input.symbol} would exceed cap: current=${activeTradesForSymbol} cap=${policyAutoMaxOpenTradesPerSymbol}.`
      );
    }
    const budget = computeLossBudgets(input.nowIso);
    if (budget.dailyLossUsedUsd >= entryAutonomyConfig.maxDailyLossUsd) {
      blockers.push(`Daily loss cap exhausted: used=${budget.dailyLossUsedUsd} cap=${entryAutonomyConfig.maxDailyLossUsd}.`);
    }
    if (budget.weeklyLossUsedUsd >= entryAutonomyConfig.maxWeeklyLossUsd) {
      blockers.push(`Weekly loss cap exhausted: used=${budget.weeklyLossUsedUsd} cap=${entryAutonomyConfig.maxWeeklyLossUsd}.`);
    }
    if (budget.cooldownActive) {
      blockers.push(`Cooldown active after loss streak=${budget.lossStreak}.`);
    }
    if (inMemoryIncidents.some((item) => item.status !== "resolved")) {
      blockers.push("Open incidents present.");
    }
    if (inMemoryAlerts.some((item) => item.status === "open" && item.severity === "critical")) {
      blockers.push("Open critical alerts present.");
    }
    if (
      lifecycle.reconciliation.positions !== "ok" ||
      lifecycle.reconciliation.pnl !== "ok" ||
      lifecycle.reconciliation.orders !== "ok"
    ) {
      blockers.push("Reconciliation state is not fully OK.");
    }
    if (!exchangeStatus.connected || exchangeStatus.mode !== "demo") {
      blockers.push("Demo exchange is not fully connected.");
    }
    const m5 = await buildMilestone5EvidenceSummary(input.nowIso);
    const demoReadiness = evaluateDemoPolicyAutoReadiness(m5, input.nowIso, {
      // Demo policy_auto should be able to continue automatically when today's
      // live evidence is currently green, even if the latest completed passing
      // day is older. Promotion and rollout status still judge freshness separately.
      allowTodayLivePassForFreshness: true
    });
    if (!demoReadiness.ok) {
      blockers.push(
        `Demo readiness not fully green for policy_auto (${demoReadiness.reasons.join("; ")}).`
      );
    }
    entryAutonomyStatus.lastPolicyAutoDecisionAt = input.nowIso;
    entryAutonomyStatus.lastPolicyAutoBlockers = blockers;
    persistEntryAutonomyState();
    return { ok: blockers.length === 0, blockers };
  }

  async function executeQueuedDemoOrder(input: {
    approvedId: string;
    queued: {
      intent: ExecutionIntent;
      proposal: TradeProposal;
      symbol: string;
      stopPrice: number;
      takeProfitPrice: number;
      maxHoldSec: number;
      flattenAt?: string;
      approvalModeAtDecision: EntryApprovalMode;
      strategyVersion: string;
      policyVersion: string;
      modelVersion: string;
      entryOffsetBps: number;
      stopDistanceBps: number;
      takeProfitRMultiple: number;
      requestedNotionalUsd: number;
      marketIntelligence?: WorkerMarketIntelligenceSnapshot;
      tradingPlan?: TradingTradePlan;
      queuedAt: string;
    };
    actor: string;
    correlationId?: string;
  }): Promise<{ ordId: string }> {
    const mode = resolveExchangeMode(process.env.OKX_TRADING_MODE);
    if (mode !== "demo") {
      throw new Error("OKX_TRADING_MODE must be demo for demo order submit.");
    }
    const adapter = new OkxDemoAdapter(loadOkxDemoConfigFromEnv(process.env));
    const order = await adapter.placeSpotLimitOrder(input.queued.intent);
    pendingDemoOrders.delete(input.approvedId);
    const createdAt = new Date().toISOString();
    const managedTrade: ManagedTrade = {
      tradeId: `trade-${input.queued.proposal.proposalId}`,
      status: "planned",
      symbol: input.queued.symbol,
      entrySide: input.queued.intent.side,
      entryOrdId: order.ordId,
      entryClOrdId: order.clOrdId,
      requestedQty: round6(input.queued.intent.qtyBase),
      entryLimitPrice: round6(input.queued.intent.limitPrice),
      entrySubmittedAt: createdAt,
      entryFirstFilledAt: undefined,
      entryRepriceCount: 0,
      entryFilledQty: 0,
      entryAvgPrice: 0,
      exitFilledQty: 0,
      exitAvgPrice: 0,
      remainingQty: round6(input.queued.intent.qtyBase),
      stopPrice: round6(input.queued.stopPrice),
      takeProfitPrice: round6(input.queued.takeProfitPrice),
      maxHoldSec: input.queued.maxHoldSec,
      flattenAt: input.queued.flattenAt,
      createdAt,
      updatedAt: createdAt,
      feeUsd: 0,
      realizedPnlUsd: 0,
      exitSubmittedAt: undefined,
      exitRepriceCount: 0,
      forcedFlattenEscalated: false,
      requestedNotionalUsd: input.queued.requestedNotionalUsd,
      approvalModeAtDecision: input.queued.approvalModeAtDecision,
      policyVersionAtDecision: input.queued.policyVersion,
      strategyVersionAtDecision: input.queued.strategyVersion,
      modelVersionAtDecision: input.queued.modelVersion,
      intelligenceVersionAtDecision: input.queued.tradingPlan?.intelligenceVersion,
      playbookIdAtDecision: input.queued.tradingPlan?.playbookId,
      entryStyleAtDecision: input.queued.tradingPlan?.entryStyle,
      thesisSummaryAtDecision: input.queued.tradingPlan?.thesisSummary,
      invalidationSummaryAtDecision: input.queued.tradingPlan?.invalidationSummary,
      thesisConfidenceScoreAtDecision: input.queued.tradingPlan?.thesisConfidenceScore,
      tradeabilityScoreAtDecision: input.queued.tradingPlan?.tradeabilityScore,
      entryOffsetBps: input.queued.entryOffsetBps,
      stopDistanceBps: input.queued.stopDistanceBps,
      takeProfitRMultiple: input.queued.takeProfitRMultiple,
      marketRegimeAtDecision: input.queued.marketIntelligence?.regime,
      signalConfidenceScoreAtDecision: input.queued.marketIntelligence?.confidenceScore,
      trendAlignmentScoreAtDecision: input.queued.marketIntelligence?.trendAlignmentScore,
      move1mBpsAtDecision: input.queued.marketIntelligence?.move1mBps,
      move5mBpsAtDecision: input.queued.marketIntelligence?.move5mBps,
      move15mBpsAtDecision: input.queued.marketIntelligence?.move15mBps,
      realizedVolatilityBpsAtDecision: input.queued.marketIntelligence?.realizedVolatilityBps,
      spreadBpsAtDecision: input.queued.marketIntelligence?.spreadBps,
      orderBookImbalancePctAtDecision: input.queued.marketIntelligence?.orderBookImbalancePct
    };
    upsertManagedTrade(managedTrade);
    await publish(
      createEvent(
        "OrderSubmitted",
        input.queued.symbol,
            `Demo order submitted ordId=${order.ordId} clOrdId=${order.clOrdId} proposal=${input.queued.proposal.proposalId} managedTrade=${managedTrade.tradeId} approvalMode=${input.queued.approvalModeAtDecision} strategy=${input.queued.strategyVersion} policy=${input.queued.policyVersion}`,
            "info",
            [
              "demo_execution",
              "okx_demo",
              `approval_mode:${input.queued.approvalModeAtDecision}`,
              `strategy_version:${input.queued.strategyVersion}`,
              `policy_version:${input.queued.policyVersion}`,
              `playbook:${input.queued.tradingPlan?.playbookId ?? "unknown"}`
            ],
            input.correlationId
          )
        );
      await appendAudit(
        "Demo order submitted",
        `Approval ${input.approvedId} executed by ${input.actor}; ordId=${order.ordId} proposal=${input.queued.proposal.proposalId} approvalMode=${input.queued.approvalModeAtDecision} strategy=${input.queued.strategyVersion} policy=${input.queued.policyVersion} playbook=${input.queued.tradingPlan?.playbookId ?? "unknown"}`,
        input.queued.symbol,
        "OrderSubmitted"
      );
    await refreshExchangeStatus();
    return { ordId: order.ordId };
  }

  async function evaluateManagedTradeExits(input: {
    adapter: OkxDemoAdapter;
    fills: OkxFillRecord[];
    marksBySymbol: Map<string, number>;
    pendingOrders: OpenOrdersStatus["orders"];
    nowIso: string;
  }): Promise<void> {
    if (!autoExitConfig.enabled) {
      return;
    }
    const pendingByOrdId = new Set(input.pendingOrders.map((order) => order.ordId));
    const marketInputsCache = new Map<string, Awaited<ReturnType<typeof fetchSpotMarketInputs>>>();
    const markCache = new Map<string, number>();
    const marketIntelligenceCache = new Map<string, WorkerMarketIntelligenceSnapshot | undefined>();
    const nowEpoch = Date.parse(input.nowIso);

    async function loadMarketIntelligence(symbol: string): Promise<WorkerMarketIntelligenceSnapshot | undefined> {
      if (marketIntelligenceCache.has(symbol)) {
        return marketIntelligenceCache.get(symbol);
      }
      try {
        const snapshot = await fetchMarketIntelligenceSnapshot(symbol, process.env.OKX_DEMO_BASE_URL ?? "https://www.okx.com");
        const mapped: WorkerMarketIntelligenceSnapshot = {
          regime: snapshot.regime,
          confidenceScore: snapshot.confidenceScore,
          trendAlignmentScore: snapshot.trendAlignmentScore,
          recommendedSide: snapshot.recommendedSide,
          recommendedEntryOffsetBps: snapshot.recommendedEntryOffsetBps,
          move1mBps: snapshot.move1mBps,
          move5mBps: snapshot.move5mBps,
          move15mBps: snapshot.move15mBps,
          realizedVolatilityBps: snapshot.realizedVolatilityBps,
          spreadBps: snapshot.spreadBps,
          orderBookImbalancePct: snapshot.orderBookImbalancePct,
          continuationOverextended: snapshot.continuationOverextended,
          projectedMoveBudgetBps: snapshot.projectedMoveBudgetBps
        };
        marketIntelligenceCache.set(symbol, mapped);
        return mapped;
      } catch {
        marketIntelligenceCache.set(symbol, undefined);
        return undefined;
      }
    }

    async function amendLiveExitOrder(params: {
      trade: ManagedTrade;
      mark: number;
      marketInputs: Awaited<ReturnType<typeof fetchSpotMarketInputs>> | undefined;
      nowIso: string;
      nowEpoch: number;
    }): Promise<boolean> {
      const { trade, mark, marketInputs, nowIso, nowEpoch } = params;
      if (!trade.exitOrdId && !trade.exitClOrdId) {
        return false;
      }
      const reason: ExitReason = trade.forcedFlattenEscalated ? "flatten" : trade.exitReason ?? "time_stop";
      const exitSide: "buy" | "sell" = trade.entrySide === "buy" ? "sell" : "buy";
      const nextRepriceCount = trade.exitRepriceCount + 1;
      const offsetBps = resolveExitOffsetBps({ ...trade, exitRepriceCount: nextRepriceCount }, reason);
      const offsetMultiplier = exitSide === "sell" ? 1 - offsetBps / 10_000 : 1 + offsetBps / 10_000;
      let amendedPrice = round6(Math.max(0.00000001, mark * offsetMultiplier));
      amendedPrice = clampExitPriceToBand(amendedPrice, exitSide, marketInputs);
      if (marketInputs && Number.isFinite(marketInputs.tickSz) && marketInputs.tickSz > 0) {
        amendedPrice = alignPriceToTick(amendedPrice, marketInputs.tickSz, exitSide);
      }
      amendedPrice = clampExitPriceToBand(amendedPrice, exitSide, marketInputs);
      amendedPrice = round6(Math.max(0.00000001, amendedPrice));
      const remainingQty = Math.max(0.00000001, round6(Math.min(trade.remainingQty, Math.max(0, trade.entryFilledQty - trade.exitFilledQty))));
      const reqId = `${trade.tradeId}-amend-${nextRepriceCount}-${nowEpoch}`;

      pushAutoExitDecisionTrace({
        at: nowIso,
        tradeId: trade.tradeId,
        symbol: trade.symbol,
        status: trade.status,
        remainingQty: round6(trade.remainingQty),
        mark: round6(mark),
        reason,
        action: "submit_attempt",
        detail: `amend ordId=${trade.exitOrdId ?? "n/a"} forcedFlattenEscalated=${trade.forcedFlattenEscalated}`,
        repriceCount: nextRepriceCount,
        offsetBps,
        limitPrice: amendedPrice,
        exitQty: remainingQty
      });

      try {
        const amended = await input.adapter.amendOrder({
          instId: trade.symbol,
          ordId: trade.exitOrdId,
          clOrdId: trade.exitClOrdId,
          newPx: amendedPrice,
          newSz: remainingQty,
          reqId
        });
        trade.exitOrdId = amended.ordId || trade.exitOrdId;
        trade.exitClOrdId = amended.clOrdId || trade.exitClOrdId;
        trade.exitReason = reason;
        trade.exitRepriceCount = nextRepriceCount;
        trade.exitSubmittedAt = nowIso;
        trade.status = "exit_submitted";
        trade.updatedAt = nowIso;
        upsertManagedTrade(trade);
        await publish(
          createEvent(
            "OrderSubmitted",
            trade.symbol,
            `Auto-exit amended tradeId=${trade.tradeId} reason=${reason} ordId=${trade.exitOrdId} repriceCount=${trade.exitRepriceCount} offsetBps=${offsetBps}`,
            "info",
            ["managed_trade", "auto_exit", reason, "amend_order"]
          )
        );
        await appendAudit(
          "Auto-exit amended",
          `tradeId=${trade.tradeId} reason=${reason} ordId=${trade.exitOrdId} limitPrice=${amendedPrice} repriceCount=${trade.exitRepriceCount} offsetBps=${offsetBps}`,
          trade.symbol,
          "OrderSubmitted"
        );
        pushAutoExitDecisionTrace({
          at: nowIso,
          tradeId: trade.tradeId,
          symbol: trade.symbol,
          status: trade.status,
          remainingQty: round6(trade.remainingQty),
          mark: round6(mark),
          reason,
          action: "submit_ok",
          detail: `amended ordId=${trade.exitOrdId}`,
          repriceCount: trade.exitRepriceCount,
          offsetBps,
          limitPrice: amendedPrice,
          exitQty: remainingQty
        });
        return true;
      } catch (error: unknown) {
        const detail = formatAutoExitErrorDetail(error);
        const { transient } = classifyMissionControlSubmitFailure(error);
        await upsertAlert({
          code: transient ? "AUTO_EXIT_SUBMIT_RETRYING" : "AUTO_EXIT_CANCEL_FAILED",
          severity: "warn",
          source: "exchange",
          title: transient ? "Auto-exit amend transient failure" : "Auto-exit amend failed",
          detail: `tradeId=${trade.tradeId} reason=${reason} ${detail}`,
          symbol: trade.symbol
        });
        await publish(
          createEvent(
            transient ? "System" : "Error",
            trade.symbol,
            `Auto-exit amend failed tradeId=${trade.tradeId} reason=${reason} ${detail}`,
            "warn",
            ["managed_trade", "auto_exit_amend_failed"]
          )
        );
        return false;
      }
    }

    async function loadMarketInputs(symbol: string): Promise<Awaited<ReturnType<typeof fetchSpotMarketInputs>> | undefined> {
      const cached = marketInputsCache.get(symbol);
      if (cached) {
        return cached;
      }
      try {
        const market = await fetchSpotMarketInputs(symbol, process.env.OKX_DEMO_BASE_URL ?? "https://www.okx.com");
        marketInputsCache.set(symbol, market);
        return market;
      } catch {
        return undefined;
      }
    }

    function alignPriceToTick(rawPrice: number, tickSz: number, side: "buy" | "sell"): number {
      if (!Number.isFinite(rawPrice) || rawPrice <= 0 || !Number.isFinite(tickSz) || tickSz <= 0) {
        return round6(Math.max(0.00000001, rawPrice));
      }
      const ratio = rawPrice / tickSz;
      const units = side === "sell" ? Math.ceil(ratio - 1e-12) : Math.floor(ratio + 1e-12);
      return round6(Math.max(tickSz, units * tickSz));
    }

    function clampExitPriceToBand(
      rawPrice: number,
      side: "buy" | "sell",
      marketInputs: Awaited<ReturnType<typeof fetchSpotMarketInputs>> | undefined
    ): number {
      let next = rawPrice;
      const buyLmt = marketInputs?.buyLmt;
      const sellLmt = marketInputs?.sellLmt;
      if (side === "sell" && Number.isFinite(sellLmt)) {
        next = Math.max(next, sellLmt as number);
      }
      if (side === "buy" && Number.isFinite(buyLmt)) {
        next = Math.min(next, buyLmt as number);
      }
      if (Number.isFinite(buyLmt) && Number.isFinite(sellLmt) && (buyLmt as number) >= (sellLmt as number)) {
        next = clamp(next, sellLmt as number, buyLmt as number);
      }
      return next;
    }

    function shouldAttemptManagedTradeEntryRefresh(
      trade: ManagedTrade,
      marketInputs: Awaited<ReturnType<typeof fetchSpotMarketInputs>> | undefined
    ): boolean {
      if (trade.entryFilledQty > 1e-9 || trade.entryRepriceCount >= entryMaxRepriceCount) {
        return false;
      }
      if (!isContinuationRegimeAligned(trade)) {
        return false;
      }
      if ((trade.signalConfidenceScoreAtDecision ?? 0) < entryRepriceMinConfidence) {
        return false;
      }
      if (!marketInputs) {
        return false;
      }
      return typeof trade.entryOffsetBps === "number" && Number.isFinite(trade.entryOffsetBps);
    }

    function resolveManagedTradeEntryRefreshPrice(
      trade: ManagedTrade,
      marketInputs: Awaited<ReturnType<typeof fetchSpotMarketInputs>>
    ): number | undefined {
      if (typeof trade.entryOffsetBps !== "number" || !Number.isFinite(trade.entryOffsetBps)) {
        return undefined;
      }
      const originalOffsetBps = trade.entryOffsetBps;
      const refreshedOffsetBps =
        originalOffsetBps < 0 ? -Math.min(8, Math.max(1, Math.abs(originalOffsetBps) + 1)) : Math.max(0, originalOffsetBps - 2);
      const { entryPrice } = computeSpotEntryPrice(marketInputs, trade.entrySide, refreshedOffsetBps);
      return round6(Math.max(0.00000001, entryPrice));
    }

    async function amendLiveEntryOrder(params: {
      trade: ManagedTrade;
      marketInputs: Awaited<ReturnType<typeof fetchSpotMarketInputs>>;
      nowIso: string;
      nowEpoch: number;
    }): Promise<boolean> {
      const amendedPrice = resolveManagedTradeEntryRefreshPrice(params.trade, params.marketInputs);
      if (!amendedPrice || (params.trade.entryLimitPrice && Math.abs(amendedPrice - params.trade.entryLimitPrice) < params.marketInputs.tickSz)) {
        return false;
      }
      const reqId = `${params.trade.tradeId}-entry-amend-${params.trade.entryRepriceCount + 1}-${params.nowEpoch}`;
      try {
        const amended = await input.adapter.amendOrder({
          instId: params.trade.symbol,
          ordId: params.trade.entryOrdId,
          clOrdId: params.trade.entryClOrdId,
          newPx: amendedPrice,
          reqId,
          cxlOnFail: true
        });
        params.trade.entryOrdId = amended.ordId || params.trade.entryOrdId;
        params.trade.entryClOrdId = amended.clOrdId || params.trade.entryClOrdId;
        params.trade.entryLimitPrice = amendedPrice;
        params.trade.entryRepriceCount += 1;
        params.trade.entrySubmittedAt = params.nowIso;
        params.trade.updatedAt = params.nowIso;
        upsertManagedTrade(params.trade);
        await publish(
          createEvent(
            "OrderSubmitted",
            params.trade.symbol,
            `Entry amended tradeId=${params.trade.tradeId} ordId=${params.trade.entryOrdId} entryRepriceCount=${params.trade.entryRepriceCount} limitPrice=${amendedPrice}`,
            "warn",
            ["managed_trade", "entry_reprice"]
          )
        );
        await appendAudit(
          "Entry amended",
          `tradeId=${params.trade.tradeId} ordId=${params.trade.entryOrdId} limitPrice=${amendedPrice} entryRepriceCount=${params.trade.entryRepriceCount}`,
          params.trade.symbol,
          "OrderSubmitted"
        );
        return true;
      } catch (error: unknown) {
        const detail = formatAutoExitErrorDetail(error);
        await upsertAlert({
          code: "ENTRY_REPRICE_FAILED",
          severity: "warn",
          source: "exchange",
          title: "Entry reprice failed",
          detail: `tradeId=${params.trade.tradeId} ${detail}`,
          symbol: params.trade.symbol
        });
        await publish(
          createEvent(
            "Error",
            params.trade.symbol,
            `Entry reprice failed tradeId=${params.trade.tradeId} ${detail}`,
            "warn",
            ["managed_trade", "entry_reprice_failed"]
          )
        );
        return false;
      }
    }

    function extractOkxSCode(error: unknown): string | undefined {
      if (!(error instanceof OkxApiError)) {
        return undefined;
      }
      const details = (error.details ?? {}) as Record<string, unknown>;
      const direct = details.sCode;
      if (typeof direct === "string" || typeof direct === "number") {
        return String(direct);
      }
      const data = details.data;
      if (!Array.isArray(data) || data.length === 0) {
        return undefined;
      }
      const first = data[0] as Record<string, unknown>;
      if (typeof first.sCode === "string" || typeof first.sCode === "number") {
        return String(first.sCode);
      }
      return undefined;
    }

    function extractOkxSMsg(error: unknown): string | undefined {
      if (!(error instanceof OkxApiError)) {
        return undefined;
      }
      const details = (error.details ?? {}) as Record<string, unknown>;
      const direct = details.sMsg;
      if (typeof direct === "string" && direct.trim().length > 0) {
        return direct.trim();
      }
      const data = details.data;
      if (!Array.isArray(data) || data.length === 0) {
        return undefined;
      }
      const first = data[0] as Record<string, unknown>;
      if (typeof first.sMsg === "string" && first.sMsg.trim().length > 0) {
        return first.sMsg.trim();
      }
      return undefined;
    }

    async function tryBandCorrectedExitSubmit(input: {
      trade: ManagedTrade;
      reason: ExitReason;
      exitSide: "buy" | "sell";
      limitPrice: number;
      exitQty: number;
      offsetBps: number;
      marketInputs: Awaited<ReturnType<typeof fetchSpotMarketInputs>> | undefined;
      adapter: OkxDemoAdapter;
      nowIso: string;
      repriceCount: number;
      error: unknown;
    }): Promise<boolean> {
      const sCode = extractOkxSCode(input.error);
      if (sCode !== "51138" && sCode !== "51137") {
        return false;
      }
      const freshMarket = (await loadMarketInputs(input.trade.symbol)) ?? input.marketInputs;
      const hintedLimit = parseOkxPriceBandHint(extractOkxSMsg(input.error));
      let corrected = input.limitPrice;
      if (input.exitSide === "sell") {
        const floor = Math.max(freshMarket?.sellLmt ?? 0, hintedLimit ?? 0);
        if (floor > 0) {
          corrected = Math.max(corrected, floor);
        }
      } else {
        const ceilingCandidates = [freshMarket?.buyLmt, hintedLimit].filter(
          (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0
        );
        const ceiling = ceilingCandidates.length > 0 ? Math.min(...ceilingCandidates) : undefined;
        if (ceiling && ceiling > 0) {
          corrected = Math.min(corrected, ceiling);
        }
      }
      corrected = clampExitPriceToBand(corrected, input.exitSide, freshMarket);
      if (freshMarket && Number.isFinite(freshMarket.tickSz) && freshMarket.tickSz > 0) {
        corrected = alignPriceToTick(corrected, freshMarket.tickSz, input.exitSide);
      }
      corrected = round6(Math.max(0.00000001, clampExitPriceToBand(corrected, input.exitSide, freshMarket)));
      if (!Number.isFinite(corrected) || corrected <= 0 || Math.abs(corrected - input.limitPrice) < 1e-9) {
        return false;
      }
      const exitProposalId = `${input.trade.tradeId}-${input.reason}-${input.repriceCount}-band-${Date.parse(input.nowIso)}`;
      const order = await input.adapter.placeSpotLimitOrder({
        proposalId: exitProposalId,
        symbol: input.trade.symbol,
        side: input.exitSide,
        qtyBase: input.exitQty,
        limitPrice: corrected
      });
      input.trade.exitOrdId = order.ordId;
      input.trade.exitClOrdId = order.clOrdId;
      input.trade.exitReason = input.reason;
      input.trade.status = "exit_submitted";
      input.trade.exitSubmittedAt = input.nowIso;
      input.trade.updatedAt = input.nowIso;
      upsertManagedTrade(input.trade);
      await publish(
        createEvent(
          "OrderSubmitted",
          input.trade.symbol,
          `Auto-exit submitted after band correction tradeId=${input.trade.tradeId} reason=${input.reason} ordId=${order.ordId} offsetBps=${input.offsetBps}`,
          "warn",
          ["managed_trade", "auto_exit", input.reason, "band_correction"]
        )
      );
      await appendAudit(
        "Auto-exit submitted after band correction",
        `tradeId=${input.trade.tradeId} reason=${input.reason} ordId=${order.ordId} prevLimitPrice=${input.limitPrice} correctedLimitPrice=${corrected} offsetBps=${input.offsetBps}`,
        input.trade.symbol,
        "OrderSubmitted"
      );
      pushAutoExitDecisionTrace({
        at: input.nowIso,
        tradeId: input.trade.tradeId,
        symbol: input.trade.symbol,
        status: input.trade.status,
        remainingQty: round6(input.trade.remainingQty),
        mark: round6(freshMarket?.last ?? 0),
        reason: input.reason,
        action: "submit_ok",
        detail: `band_corrected ordId=${order.ordId}`,
        repriceCount: input.repriceCount,
        offsetBps: input.offsetBps,
        limitPrice: corrected,
        exitQty: input.exitQty
      });
      return true;
    }

    function resolveExitOffsetBps(trade: ManagedTrade, reason: ExitReason): number {
      const baseOffsetBps = trade.symbol === "SOL-USDT" ? Math.min(autoExitConfig.exitOffsetBps, solAutoExitOffsetBps) : autoExitConfig.exitOffsetBps;
      const forceFlattenFloorBps =
        trade.symbol === "SOL-USDT" ? Math.min(autoExitForceFlattenBps, solAutoExitForceFlattenBps) : autoExitForceFlattenBps;
      const exitSide: "buy" | "sell" = trade.entrySide === "buy" ? "sell" : "buy";
      const orderType = resolveManagedTradeExitOrderType({
        exitReason: reason,
        exitRepriceCount: trade.exitRepriceCount,
        forcedFlattenEscalated: trade.forcedFlattenEscalated,
        exitSide
      });
      if (orderType === "ioc" || orderType === "market") {
        return Math.min(autoExitMaxOffsetBps, Math.max(forceFlattenFloorBps, baseOffsetBps + trade.exitRepriceCount * 10));
      }
      return Math.min(autoExitMaxOffsetBps, baseOffsetBps + trade.exitRepriceCount * 5);
    }

    function classifyTransientExitSubmitFailure(error: unknown): { transient: boolean; message: string } {
      return classifyMissionControlSubmitFailure(error);
    }

    function formatAutoExitErrorDetail(error: unknown): string {
      return formatMissionControlOkxErrorDetail(error);
    }

    for (const trade of managedTrades.values()) {
      if (trade.status === "closed") {
        continue;
      }
      const marketInputs = await loadMarketInputs(trade.symbol);
      const hasSubmittedEntryOrder = Boolean(trade.entryOrdId || trade.entryClOrdId);
      const entryStats = fillStatsForOrder(input.fills, trade.entryOrdId);
      if (entryStats.qty > 0) {
        if (!trade.entryFirstFilledAt) {
          trade.entryFirstFilledAt = input.nowIso;
        }
        trade.entryFilledQty = entryStats.qty;
        trade.entryAvgPrice = entryStats.avgPrice;
        trade.status = entryStats.qty + 1e-9 < trade.requestedQty ? "entry_partially_filled" : "entry_filled";
        trade.remainingQty = Math.max(0, round6(trade.entryFilledQty - trade.exitFilledQty));
      } else if (trade.status === "planned" && hasSubmittedEntryOrder) {
        trade.status = "entry_submitted";
      }

      const entryAging = evaluateManagedTradeEntryAging({
        status: trade.status,
        requestedQty: trade.requestedQty,
        entryFilledQty: trade.entryFilledQty,
        submittedAt: trade.entrySubmittedAt ?? trade.createdAt,
        nowIso: input.nowIso,
        hasSubmittedOrder: hasSubmittedEntryOrder,
        isPendingAtVenue: pendingByOrdId.has(trade.entryOrdId),
        staleTimeoutSec: entryStaleTimeoutSec
      });
      if (entryAging.action === "mark_canceled") {
        trade.status = "canceled";
        trade.remainingQty = 0;
        trade.updatedAt = input.nowIso;
        upsertManagedTrade(trade);
        await publish(
          createEvent(
            "OrderCancelled",
            trade.symbol,
            `Entry order no longer pending; marking canceled tradeId=${trade.tradeId} ordId=${trade.entryOrdId}`,
            "warn",
            ["managed_trade", "entry_cancelled"]
          )
        );
        await appendAudit(
          "Entry order marked canceled",
          `tradeId=${trade.tradeId} ordId=${trade.entryOrdId} elapsedSec=${round6(entryAging.elapsedSec)}`,
          trade.symbol,
          "OrderCancelled"
        );
        continue;
      }
      if (entryAging.action === "cancel_unfilled" || entryAging.action === "cancel_remainder") {
        if (
          entryAging.action === "cancel_unfilled" &&
          shouldAttemptManagedTradeEntryRefresh(trade, marketInputs) &&
          (await amendLiveEntryOrder({
            trade,
            marketInputs: marketInputs as Awaited<ReturnType<typeof fetchSpotMarketInputs>>,
            nowIso: input.nowIso,
            nowEpoch
          }))
        ) {
          continue;
        }
        try {
          await input.adapter.cancelOrder({
            instId: trade.symbol,
            ordId: trade.entryOrdId,
            clOrdId: trade.entryClOrdId
          });
          if (entryAging.action === "cancel_remainder" && trade.entryFilledQty > 0) {
            trade.status = "entry_filled";
            trade.remainingQty = Math.max(0, round6(Math.min(trade.remainingQty, trade.entryFilledQty)));
          } else {
            trade.status = "canceled";
            trade.remainingQty = 0;
          }
          trade.updatedAt = input.nowIso;
          upsertManagedTrade(trade);
          await publish(
            createEvent(
              "OrderCancelled",
              trade.symbol,
              `Entry stale cancel tradeId=${trade.tradeId} action=${entryAging.action} elapsedSec=${round6(entryAging.elapsedSec)}`,
              "warn",
              ["managed_trade", "entry_stale_cancel", entryAging.action]
            )
          );
          await appendAudit(
            "Entry stale cancel",
            `tradeId=${trade.tradeId} action=${entryAging.action} ordId=${trade.entryOrdId} elapsedSec=${round6(entryAging.elapsedSec)}`,
            trade.symbol,
            "OrderCancelled"
          );
        } catch (error: unknown) {
          const detail = formatAutoExitErrorDetail(error);
          await upsertAlert({
            code: "ENTRY_STALE_CANCEL_FAILED",
            severity: "warn",
            source: "exchange",
            title: "Entry stale cancel failed",
            detail: `tradeId=${trade.tradeId} action=${entryAging.action} ${detail}`,
            symbol: trade.symbol
          });
          await publish(
            createEvent(
              "Error",
              trade.symbol,
              `Entry stale cancel failed tradeId=${trade.tradeId} action=${entryAging.action} ${detail}`,
              "warn",
              ["managed_trade", "entry_stale_cancel_failed"]
            )
          );
        }
        continue;
      }

      if (trade.exitOrdId) {
        const exitStats = fillStatsForOrder(input.fills, trade.exitOrdId);
        trade.exitFilledQty = exitStats.qty;
        trade.exitAvgPrice = exitStats.avgPrice;
        trade.remainingQty = Math.max(0, round6(trade.entryFilledQty - trade.exitFilledQty));
        const approximateFees =
          (trade.entryFilledQty * trade.entryAvgPrice + trade.exitFilledQty * trade.exitAvgPrice) * (performanceFeeRateBps / 10_000);
        trade.feeUsd = round6(approximateFees);
        const gross =
          trade.entrySide === "buy"
            ? (trade.exitAvgPrice - trade.entryAvgPrice) * trade.exitFilledQty
            : (trade.entryAvgPrice - trade.exitAvgPrice) * trade.exitFilledQty;
        trade.realizedPnlUsd = round6(gross - trade.feeUsd);
        if (trade.remainingQty <= 1e-9) {
          trade.status = "closed";
          trade.closedAt = input.nowIso;
          trade.exitOrdId = undefined;
          trade.exitClOrdId = undefined;
          trade.exitSubmittedAt = undefined;
          persistClosedTradeFeature(trade, input.nowIso);
          await publish(
            createEvent(
              "OrderFilled",
              trade.symbol,
              `Managed trade closed tradeId=${trade.tradeId} reason=${trade.exitReason ?? "unknown"} pnl=${trade.realizedPnlUsd}`,
              trade.realizedPnlUsd >= 0 ? "info" : "warn",
              ["managed_trade", "auto_exit_closed"]
            )
          );
          await appendAudit(
            "Managed trade closed",
            `tradeId=${trade.tradeId} reason=${trade.exitReason ?? "unknown"} realizedPnl=${trade.realizedPnlUsd}`,
            trade.symbol,
            "OrderFilled"
          );
        } else if (!pendingByOrdId.has(trade.exitOrdId)) {
          const exitSide: "buy" | "sell" = trade.entrySide === "buy" ? "sell" : "buy";
          const currentOrdType = resolveManagedTradeExitOrderType({
            exitReason: trade.exitReason,
            exitRepriceCount: trade.exitRepriceCount,
            forcedFlattenEscalated: trade.forcedFlattenEscalated,
            exitSide
          });
          const submittedEpoch = trade.exitSubmittedAt ? Date.parse(trade.exitSubmittedAt) : Number.NaN;
          const treatAsMissedNonRestingExit =
            (currentOrdType === "ioc" || currentOrdType === "market") &&
            Number.isFinite(nowEpoch) &&
            Number.isFinite(submittedEpoch) &&
            nowEpoch - submittedEpoch >= NON_RESTING_EXIT_MISS_GRACE_MS;
          trade.exitOrdId = undefined;
          trade.exitClOrdId = undefined;
          trade.exitSubmittedAt = undefined;
          if (treatAsMissedNonRestingExit) {
            trade.exitRepriceCount += 1;
            if (trade.exitRepriceCount > autoExitMaxReprices) {
              trade.forcedFlattenEscalated = true;
              trade.exitReason = "flatten";
            }
            trade.status = "exit_pending";
            await publish(
              createEvent(
                "OrderCancelled",
                trade.symbol,
                `Auto-exit non-resting order missed tradeId=${trade.tradeId} ordType=${currentOrdType} repriceCount=${trade.exitRepriceCount} forcedFlatten=${trade.forcedFlattenEscalated}`,
                "warn",
                ["managed_trade", "auto_exit", "non_resting_miss"]
              )
            );
            await appendAudit(
              "Auto-exit non-resting order missed",
              `tradeId=${trade.tradeId} ordType=${currentOrdType} repriceCount=${trade.exitRepriceCount} forcedFlatten=${trade.forcedFlattenEscalated}`,
              trade.symbol,
              "OrderCancelled"
            );
            pushAutoExitDecisionTrace({
              at: input.nowIso,
              tradeId: trade.tradeId,
              symbol: trade.symbol,
              status: trade.status,
              remainingQty: round6(trade.remainingQty),
              mark: 0,
              reason: trade.exitReason,
              action: "submit_retry",
              detail: `non_resting_miss ordType=${currentOrdType}`,
              repriceCount: trade.exitRepriceCount
            });
          } else {
            trade.status = "exit_pending";
          }
        } else {
          const submittedEpoch = trade.exitSubmittedAt ? Date.parse(trade.exitSubmittedAt) : Number.NaN;
          const isStale =
            Number.isFinite(nowEpoch) &&
            Number.isFinite(submittedEpoch) &&
            nowEpoch - submittedEpoch >= autoExitStaleTimeoutSec * 1000;
          if (isStale) {
            try {
              if (
                shouldAttemptAmendLiveExitOrder({
                  exitReason: trade.exitReason,
                  exitRepriceCount: trade.exitRepriceCount,
                  forcedFlattenEscalated: trade.forcedFlattenEscalated,
                  exitSide: trade.entrySide === "buy" ? "sell" : "buy"
                })
              ) {
                const amended = await amendLiveExitOrder({
                  trade,
                  mark: marketInputs?.last ?? trade.entryAvgPrice,
                  marketInputs,
                  nowIso: input.nowIso,
                  nowEpoch
                });
                if (amended) {
                  continue;
                }
              }

              await input.adapter.cancelOrder({
                instId: trade.symbol,
                ordId: trade.exitOrdId,
                clOrdId: trade.exitClOrdId
              });
              trade.exitOrdId = undefined;
              trade.exitClOrdId = undefined;
              trade.exitSubmittedAt = undefined;
              trade.exitRepriceCount += 1;
              if (trade.exitRepriceCount > autoExitMaxReprices) {
                trade.forcedFlattenEscalated = true;
                trade.exitReason = "flatten";
              }
              const staleCancelAction = evaluateAutoExitStaleCancelAction({
                exitRepriceCount: trade.exitRepriceCount,
                autoExitMaxReprices,
                forcedFlattenEscalated: trade.forcedFlattenEscalated,
                exitReason: trade.exitReason
              });
              if (staleCancelAction === "force_close") {
                const staleQty = Math.max(0, round6(trade.remainingQty));
                trade.remainingQty = 0;
                trade.status = "closed";
                trade.closedAt = input.nowIso;
                trade.exitReason = "flatten";
                trade.updatedAt = input.nowIso;
                upsertManagedTrade(trade);
                persistClosedTradeFeature(trade, input.nowIso);
                pushAutoExitDecisionTrace({
                  at: input.nowIso,
                  tradeId: trade.tradeId,
                  symbol: trade.symbol,
                  status: trade.status,
                  remainingQty: staleQty,
                  mark: 0,
                  reason: "flatten",
                  action: "stale_forced_closed",
                  detail: `after_stale_cancel repriceCount=${trade.exitRepriceCount}`,
                  repriceCount: trade.exitRepriceCount
                });
                await upsertAlert({
                  code: "AUTO_EXIT_STALE_FORCED_CLOSED",
                  severity: "warn",
                  source: "system",
                  title: "Auto-exit stale trade forced closed",
                  detail: `tradeId=${trade.tradeId} qty=${staleQty} after_stale_cancel repriceCount=${trade.exitRepriceCount}`,
                  symbol: trade.symbol
                });
                await publish(
                  createEvent(
                    "OrderFilled",
                    trade.symbol,
                    `Managed trade stale forced-closed tradeId=${trade.tradeId} reason=flatten qty=${staleQty} after_stale_cancel`,
                    "warn",
                    ["managed_trade", "auto_exit_stale_forced_closed"]
                  )
                );
                await appendAudit(
                  "Managed trade stale forced-closed",
                  `tradeId=${trade.tradeId} reason=flatten qty=${staleQty} after_stale_cancel repriceCount=${trade.exitRepriceCount}`,
                  trade.symbol,
                  "OrderFilled"
                );
              } else {
                trade.status = "exit_pending";
                await publish(
                  createEvent(
                    "OrderCancelled",
                    trade.symbol,
                    `Auto-exit stale cancel tradeId=${trade.tradeId} repriceCount=${trade.exitRepriceCount} forcedFlatten=${trade.forcedFlattenEscalated}`,
                    "warn",
                    ["managed_trade", "auto_exit", "stale_cancel"]
                  )
                );
                await appendAudit(
                  "Auto-exit stale cancel",
                  `tradeId=${trade.tradeId} staleTimeoutSec=${autoExitStaleTimeoutSec} repriceCount=${trade.exitRepriceCount} forcedFlatten=${trade.forcedFlattenEscalated}`,
                  trade.symbol,
                  "OrderCancelled"
                );
              }
            } catch (error: unknown) {
              const detail = formatAutoExitErrorDetail(error);
              await upsertAlert({
                code: "AUTO_EXIT_CANCEL_FAILED",
                severity: "warn",
                source: "exchange",
                title: "Auto-exit cancel failed",
                detail: `tradeId=${trade.tradeId} ${detail}`,
                symbol: trade.symbol
              });
              await publish(
                createEvent(
                  "Error",
                  trade.symbol,
                  `Auto-exit cancel failed tradeId=${trade.tradeId} ${detail}`,
                  "warn",
                  ["managed_trade", "auto_exit_cancel_failed"]
                )
              );
            }
          } else {
            trade.status = "exit_submitted";
          }
        }
      } else if (trade.remainingQty > 1e-9 && trade.entryFilledQty > 0 && trade.exitReason) {
        trade.status = "exit_pending";
      }

      trade.updatedAt = input.nowIso;
      upsertManagedTrade(trade);
    }

    for (const trade of managedTrades.values()) {
      if (trade.status === "closed" || trade.entryFilledQty <= 0 || trade.remainingQty <= 1e-9 || trade.exitOrdId) {
        continue;
      }
      const marketInputs = await loadMarketInputs(trade.symbol);
      if (marketInputs?.last && marketInputs.last > 0) {
        markCache.set(trade.symbol, marketInputs.last);
      }
      let mark = resolveManagedTradeMark({
        streamMark: input.marksBySymbol.get(trade.symbol),
        marketLast: marketInputs?.last,
        cachedLast: markCache.get(trade.symbol),
        fallbackEntryAvgPrice: trade.entryAvgPrice > 0 ? trade.entryAvgPrice : undefined
      });
      if (mark === undefined || mark <= 0) {
        try {
          const market = await fetchSpotMarketInputs(trade.symbol, process.env.OKX_DEMO_BASE_URL ?? "https://www.okx.com");
          mark = market.last;
          markCache.set(trade.symbol, mark);
        } catch {
          mark = trade.entryAvgPrice;
        }
      }

      const holdStartEpoch = Date.parse(resolveManagedTradeHoldStartIso(trade));
      const elapsedSec = Number.isFinite(holdStartEpoch) && Number.isFinite(nowEpoch) ? (nowEpoch - holdStartEpoch) / 1000 : 0;
      // Keep forced-closure escalation intentionally slower than reprice cadence to avoid churn.
      const staleEscalatedClosureSec = trade.maxHoldSec + autoExitStaleTimeoutSec * Math.max(10, autoExitMaxReprices * 2);
      const staleEscalatedClosureEligible =
        (trade.status === "exit_pending" || trade.status === "error") &&
        trade.forcedFlattenEscalated &&
        elapsedSec >= staleEscalatedClosureSec;
      if (staleEscalatedClosureEligible) {
        const staleQty = Math.max(0, round6(trade.remainingQty));
        pushAutoExitDecisionTrace({
          tradeId: trade.tradeId,
          symbol: trade.symbol,
          status: trade.status,
          remainingQty: staleQty,
          mark: round6(mark),
          reason: "flatten",
          action: "stale_forced_closed",
          detail: `elapsedSec=${round6(elapsedSec)} thresholdSec=${staleEscalatedClosureSec}`,
          repriceCount: trade.exitRepriceCount
        });
        trade.remainingQty = 0;
        trade.status = "closed";
        trade.closedAt = input.nowIso;
        trade.exitOrdId = undefined;
        trade.exitClOrdId = undefined;
        trade.exitSubmittedAt = undefined;
        trade.exitReason = "flatten";
        trade.updatedAt = input.nowIso;
        upsertManagedTrade(trade);
        persistClosedTradeFeature(trade, input.nowIso);
        await upsertAlert({
          code: "AUTO_EXIT_STALE_FORCED_CLOSED",
          severity: "warn",
          source: "system",
          title: "Auto-exit stale trade forced closed",
          detail: `tradeId=${trade.tradeId} qty=${staleQty} elapsedSec=${round6(elapsedSec)} thresholdSec=${staleEscalatedClosureSec} repriceCount=${trade.exitRepriceCount}`,
          symbol: trade.symbol
        });
        await publish(
          createEvent(
            "OrderFilled",
            trade.symbol,
            `Managed trade stale forced-closed tradeId=${trade.tradeId} reason=flatten qty=${staleQty} elapsedSec=${round6(elapsedSec)}`,
            "warn",
            ["managed_trade", "auto_exit_stale_forced_closed"]
          )
        );
        await appendAudit(
          "Managed trade stale forced-closed",
          `tradeId=${trade.tradeId} reason=flatten qty=${staleQty} elapsedSec=${round6(elapsedSec)} thresholdSec=${staleEscalatedClosureSec}`,
          trade.symbol,
          "OrderFilled"
        );
        continue;
      }
      const flattenTriggered = trade.flattenAt ? input.nowIso >= trade.flattenAt : false;
      const timeTriggered = elapsedSec >= trade.maxHoldSec;
      const stopTriggered = trade.entrySide === "buy" ? mark <= trade.stopPrice : mark >= trade.stopPrice;
      const tpTriggered = trade.entrySide === "buy" ? mark >= trade.takeProfitPrice : mark <= trade.takeProfitPrice;
      const thesisMonitor =
        !trade.exitReason && !stopTriggered && !tpTriggered
          ? monitorTradeThesis({
              symbol: trade.symbol,
              entrySide: trade.entrySide,
              playbookId: trade.playbookIdAtDecision as TradingTradePlan["playbookId"] | undefined,
              currentSymbolIntelligence: await loadMarketIntelligence(trade.symbol),
              currentBtcIntelligence: trade.symbol === "ETH-USDT" ? await loadMarketIntelligence("BTC-USDT") : undefined
            })
          : undefined;
      const thesisTriggered = thesisMonitor?.action === "flatten" && !thesisMonitor.healthy;

      let reason: ExitReason | undefined;
      if (trade.forcedFlattenEscalated) {
        reason = "flatten";
      } else if (trade.exitReason && (trade.status === "exit_pending" || trade.status === "error")) {
        reason = trade.exitReason;
      } else if (stopTriggered) {
        reason = "stop_loss";
      } else if (tpTriggered) {
        reason = "take_profit";
      } else if (flattenTriggered) {
        reason = "flatten";
      } else if (thesisTriggered) {
        reason = "flatten";
      } else if (timeTriggered) {
        reason = "time_stop";
      }
      if (!reason) {
        continue;
      }
      if (thesisTriggered) {
        await publish(
          createEvent(
            "System",
            trade.symbol,
            thesisMonitor?.reason ?? `Thesis monitor invalidated ${trade.tradeId}.`,
            "warn",
            ["managed_trade", "thesis_monitor", "flatten"]
          )
        );
        await appendAudit(
          "Trade thesis invalidated",
          `tradeId=${trade.tradeId} playbook=${trade.playbookIdAtDecision ?? "unknown"} ${thesisMonitor?.reason ?? ""}`.trim(),
          trade.symbol,
          "System"
        );
      }

      if (trade.exitRepriceCount > autoExitMaxReprices) {
        trade.forcedFlattenEscalated = true;
        reason = "flatten";
      }

      const exitSide: "buy" | "sell" = trade.entrySide === "buy" ? "sell" : "buy";
      const ordType = resolveManagedTradeExitOrderType({
        exitReason: reason,
        exitRepriceCount: trade.exitRepriceCount,
        forcedFlattenEscalated: trade.forcedFlattenEscalated,
        exitSide
      });
      const offsetBps = resolveExitOffsetBps(trade, reason);
      const offsetMultiplier = exitSide === "sell" ? 1 - offsetBps / 10_000 : 1 + offsetBps / 10_000;
      let limitPrice = round6(Math.max(0.00000001, mark * offsetMultiplier));
      limitPrice = clampExitPriceToBand(limitPrice, exitSide, marketInputs);
      if (marketInputs && Number.isFinite(marketInputs.tickSz) && marketInputs.tickSz > 0) {
        limitPrice = alignPriceToTick(limitPrice, marketInputs.tickSz, exitSide);
      }
      limitPrice = clampExitPriceToBand(limitPrice, exitSide, marketInputs);
      limitPrice = round6(Math.max(0.00000001, limitPrice));
      const exitQty = Math.max(0.00000001, round6(Math.min(trade.remainingQty, Math.max(0, trade.entryFilledQty - trade.exitFilledQty))));
      // Use unique proposal IDs per retry attempt to avoid clOrdId collisions on repeated exit submissions.
      const exitProposalId = `${trade.tradeId}-${reason}-${trade.exitRepriceCount}-${Date.parse(input.nowIso)}`;
      pushAutoExitDecisionTrace({
        at: input.nowIso,
        tradeId: trade.tradeId,
        symbol: trade.symbol,
        status: trade.status,
        remainingQty: round6(trade.remainingQty),
        mark: round6(mark),
        reason,
        action: "submit_attempt",
        detail: `forcedFlattenEscalated=${trade.forcedFlattenEscalated} ordType=${ordType}`,
        repriceCount: trade.exitRepriceCount,
        offsetBps,
        limitPrice,
        exitQty
      });
      try {
        const order = await input.adapter.placeSpotLimitOrder({
          proposalId: exitProposalId,
          symbol: trade.symbol,
          side: exitSide,
          qtyBase: exitQty,
          limitPrice,
          ordType
        });
        trade.exitOrdId = order.ordId;
        trade.exitClOrdId = order.clOrdId;
        trade.exitReason = reason;
        trade.status = "exit_submitted";
        trade.exitSubmittedAt = input.nowIso;
        trade.updatedAt = input.nowIso;
        upsertManagedTrade(trade);
        await publish(
          createEvent(
            "OrderSubmitted",
            trade.symbol,
            `Auto-exit submitted tradeId=${trade.tradeId} reason=${reason} ordId=${order.ordId} repriceCount=${trade.exitRepriceCount} offsetBps=${offsetBps} ordType=${ordType}`,
            "info",
            ["managed_trade", "auto_exit", reason]
          )
        );
        await appendAudit(
          "Auto-exit submitted",
          `tradeId=${trade.tradeId} reason=${reason} ordId=${order.ordId} limitPrice=${limitPrice} repriceCount=${trade.exitRepriceCount} offsetBps=${offsetBps} ordType=${ordType}`,
          trade.symbol,
          "OrderSubmitted"
        );
        pushAutoExitDecisionTrace({
          at: input.nowIso,
          tradeId: trade.tradeId,
          symbol: trade.symbol,
          status: trade.status,
          remainingQty: round6(trade.remainingQty),
          mark: round6(mark),
          reason,
          action: "submit_ok",
          detail: `ordId=${order.ordId} ordType=${ordType}`,
          repriceCount: trade.exitRepriceCount,
          offsetBps,
          limitPrice,
          exitQty
        });
      } catch (error: unknown) {
        const detail = formatAutoExitErrorDetail(error);
        const bandCorrected = await tryBandCorrectedExitSubmit({
          trade,
          reason,
          exitSide,
          limitPrice,
          exitQty,
          offsetBps,
          marketInputs,
          adapter: input.adapter,
          nowIso: input.nowIso,
          repriceCount: trade.exitRepriceCount,
          error
        });
        if (bandCorrected) {
          continue;
        }
        const { transient, message } = classifyTransientExitSubmitFailure(error);
        if (transient) {
          trade.exitReason = reason;
          trade.status = "exit_pending";
          trade.updatedAt = input.nowIso;
          upsertManagedTrade(trade);
          await upsertAlert({
            code: "AUTO_EXIT_SUBMIT_RETRYING",
            severity: "warn",
            source: "exchange",
            title: "Auto-exit submit transient failure",
            detail: `tradeId=${trade.tradeId} reason=${reason} ${detail}`,
            symbol: trade.symbol
          });
          await publish(
            createEvent(
              "System",
              trade.symbol,
              `Auto-exit transient submit failure tradeId=${trade.tradeId} reason=${reason} ${detail}`,
              "warn",
              ["managed_trade", "auto_exit_retry"]
            )
          );
          pushAutoExitDecisionTrace({
            at: input.nowIso,
            tradeId: trade.tradeId,
            symbol: trade.symbol,
            status: trade.status,
            remainingQty: round6(trade.remainingQty),
            mark: round6(mark),
            reason,
            action: "submit_retry",
            detail,
            repriceCount: trade.exitRepriceCount,
            offsetBps,
            limitPrice,
            exitQty
          });
          continue;
        }
        const sCode = extractOkxSCode(error);
        const lowerMessage = message.toLowerCase();
        const insufficientBalance = sCode === "51008" || lowerMessage.includes("insufficient");
        const minimumOrderAmount = sCode === "51020" || lowerMessage.includes("minimum order amount");
        if (minimumOrderAmount) {
          const market = marketInputs ?? (await loadMarketInputs(trade.symbol));
          const lotSz = market?.lotSz && Number.isFinite(market.lotSz) ? market.lotSz : 0.00000001;
          const minSz = market?.minSz && Number.isFinite(market.minSz) ? market.minSz : lotSz;
          const currentQty = Math.max(0, round6(trade.remainingQty));
          trade.remainingQty = 0;
          trade.status = "closed";
          trade.closedAt = input.nowIso;
          trade.exitOrdId = undefined;
          trade.exitClOrdId = undefined;
          trade.exitSubmittedAt = undefined;
          trade.exitReason = "flatten";
          trade.updatedAt = input.nowIso;
          upsertManagedTrade(trade);
          persistClosedTradeFeature(trade, input.nowIso);
          pushAutoExitDecisionTrace({
            at: input.nowIso,
            tradeId: trade.tradeId,
            symbol: trade.symbol,
            status: trade.status,
            remainingQty: currentQty,
            mark: round6(mark),
            reason: "flatten",
            action: "min_size_closed",
            detail,
            repriceCount: trade.exitRepriceCount,
            limitPrice,
            exitQty
          });
          await upsertAlert({
            code: "AUTO_EXIT_MIN_SIZE_CLOSED",
            severity: "warn",
            source: "exchange",
            title: "Auto-exit minimum-order remainder closed",
            detail: `tradeId=${trade.tradeId} reason=${reason} qty=${currentQty} minSz=${minSz} lotSz=${lotSz} ${detail}`,
            symbol: trade.symbol
          });
          await publish(
            createEvent(
              "OrderFilled",
              trade.symbol,
              `Managed trade min-size closed tradeId=${trade.tradeId} reason=flatten qty=${currentQty}`,
              "warn",
              ["managed_trade", "auto_exit_min_size_closed"]
            )
          );
          await appendAudit(
            "Managed trade min-size closed",
            `tradeId=${trade.tradeId} reason=flatten qty=${currentQty} minSz=${minSz} lotSz=${lotSz}`,
            trade.symbol,
            "OrderFilled"
          );
          continue;
        }
        if (insufficientBalance) {
          const market = marketInputs ?? (await loadMarketInputs(trade.symbol));
          const lotSz = market?.lotSz && Number.isFinite(market.lotSz) ? market.lotSz : 0.00000001;
          const minSz = market?.minSz && Number.isFinite(market.minSz) ? market.minSz : lotSz;
          const currentQty = Math.max(0, round6(trade.remainingQty));
          trade.exitRepriceCount += 1;
          let recoveredQty = round6(currentQty - lotSz);
          if (recoveredQty < minSz && currentQty > minSz + 1e-9) {
            recoveredQty = round6(minSz);
          }
          if (recoveredQty > 0 && recoveredQty + 1e-9 < currentQty) {
            trade.remainingQty = recoveredQty;
            trade.exitReason = reason;
            trade.status = "exit_pending";
            trade.updatedAt = input.nowIso;
            upsertManagedTrade(trade);
            await upsertAlert({
              code: "AUTO_EXIT_QTY_RECOVERY",
              severity: "warn",
              source: "exchange",
              title: "Auto-exit quantity reduced after insufficient balance",
              detail: `tradeId=${trade.tradeId} reason=${reason} prevQty=${currentQty} nextQty=${recoveredQty} lotSz=${lotSz} minSz=${minSz} ${detail}`,
              symbol: trade.symbol
            });
            await publish(
              createEvent(
                "System",
                trade.symbol,
                `Auto-exit quantity recovery tradeId=${trade.tradeId} reason=${reason} prevQty=${currentQty} nextQty=${recoveredQty} ${detail}`,
                "warn",
                ["managed_trade", "auto_exit_qty_recovery"]
              )
            );
            continue;
          }
          if (trade.exitRepriceCount > autoExitMaxReprices) {
            trade.remainingQty = 0;
            trade.status = "closed";
            trade.closedAt = input.nowIso;
            trade.exitOrdId = undefined;
            trade.exitClOrdId = undefined;
            trade.exitSubmittedAt = undefined;
            trade.exitReason = "flatten";
            trade.updatedAt = input.nowIso;
            upsertManagedTrade(trade);
            persistClosedTradeFeature(trade, input.nowIso);
            pushAutoExitDecisionTrace({
              at: input.nowIso,
              tradeId: trade.tradeId,
              symbol: trade.symbol,
              status: trade.status,
              remainingQty: currentQty,
              mark: round6(mark),
              reason: "flatten",
              action: "forced_closed",
              detail,
              repriceCount: trade.exitRepriceCount,
              limitPrice,
              exitQty
            });
            await upsertAlert({
              code: "AUTO_EXIT_FORCED_CLOSED",
              severity: "warn",
              source: "exchange",
              title: "Auto-exit forced closure after repeated insufficient balance",
              detail: `tradeId=${trade.tradeId} reason=${reason} qty=${currentQty} repriceCount=${trade.exitRepriceCount} ${detail}`,
              symbol: trade.symbol
            });
            await publish(
              createEvent(
                "OrderFilled",
                trade.symbol,
                `Managed trade forced-closed tradeId=${trade.tradeId} reason=flatten qty=${currentQty} repriceCount=${trade.exitRepriceCount}`,
                "warn",
                ["managed_trade", "auto_exit_forced_closed"]
              )
            );
            await appendAudit(
              "Managed trade forced-closed",
              `tradeId=${trade.tradeId} reason=flatten qty=${currentQty} repriceCount=${trade.exitRepriceCount}`,
              trade.symbol,
              "OrderFilled"
            );
            continue;
          }
          if (currentQty <= minSz + 1e-9) {
            trade.remainingQty = 0;
            trade.status = "closed";
            trade.closedAt = input.nowIso;
            trade.exitOrdId = undefined;
            trade.exitClOrdId = undefined;
            trade.exitSubmittedAt = undefined;
            trade.exitReason = "flatten";
            trade.updatedAt = input.nowIso;
            upsertManagedTrade(trade);
            persistClosedTradeFeature(trade, input.nowIso);
            pushAutoExitDecisionTrace({
              at: input.nowIso,
              tradeId: trade.tradeId,
              symbol: trade.symbol,
              status: trade.status,
              remainingQty: currentQty,
              mark: round6(mark),
              reason: "flatten",
              action: "dust_closed",
              detail,
              repriceCount: trade.exitRepriceCount,
              limitPrice,
              exitQty
            });
            await upsertAlert({
              code: "AUTO_EXIT_DUST_CLOSED",
              severity: "warn",
              source: "exchange",
              title: "Auto-exit dust remainder closed",
              detail: `tradeId=${trade.tradeId} reason=${reason} qty=${currentQty} minSz=${minSz} ${detail}`,
              symbol: trade.symbol
            });
            await publish(
              createEvent(
                "OrderFilled",
                trade.symbol,
                `Managed trade dust-closed tradeId=${trade.tradeId} reason=flatten qty=${currentQty}`,
                "warn",
                ["managed_trade", "auto_exit_dust_closed"]
              )
            );
            await appendAudit(
              "Managed trade dust-closed",
              `tradeId=${trade.tradeId} reason=flatten dustQty=${currentQty} minSz=${minSz}`,
              trade.symbol,
              "OrderFilled"
            );
            continue;
          }
        }
        trade.exitRepriceCount += 1;
        if (trade.exitRepriceCount > autoExitMaxReprices) {
          trade.forcedFlattenEscalated = true;
          trade.exitReason = "flatten";
        }
        trade.status = "error";
        trade.updatedAt = input.nowIso;
        upsertManagedTrade(trade);
        await upsertAlert({
          code: "AUTO_EXIT_SUBMIT_FAILED",
          severity: "error",
          source: "exchange",
          title: "Auto-exit submit failed",
          detail: `tradeId=${trade.tradeId} reason=${reason} ${detail}`,
          symbol: trade.symbol
        });
        await publish(
          createEvent(
            "Error",
            trade.symbol,
            `Auto-exit submit failed tradeId=${trade.tradeId} reason=${reason} ${detail}`,
            "error",
            ["managed_trade", "auto_exit_error"]
          )
        );
        pushAutoExitDecisionTrace({
          at: input.nowIso,
          tradeId: trade.tradeId,
          symbol: trade.symbol,
          status: trade.status,
          remainingQty: round6(trade.remainingQty),
          mark: round6(mark),
          reason,
          action: "submit_failed",
          detail,
          repriceCount: trade.exitRepriceCount,
          offsetBps,
          limitPrice,
          exitQty
        });
      }
    }
  }

  async function refreshExchangeStatus(): Promise<void> {
    const now = new Date().toISOString();
    const mode = resolveExchangeMode(process.env.OKX_TRADING_MODE);
    if (mode !== "demo") {
      const currentEqUsd = 0;
      if (sessionStartEqUsd === undefined) {
        sessionStartEqUsd = currentEqUsd;
      }
      equityTimeline.push({
        at: now,
        equityUsd: currentEqUsd,
        drawdownPct: 0
      });
      if (equityTimeline.length > performanceTimelineMaxPoints) {
        equityTimeline.splice(0, equityTimeline.length - performanceTimelineMaxPoints);
      }
      exchangeStatus = {
        connected: false,
        mode,
        source: "none",
        lastHealthCheckAt: now,
        lastError:
          mode === "live"
            ? "Live mode connectivity checks are not wired in Mission Control yet."
            : "Set OKX_TRADING_MODE=demo to enable Mission Control demo exchange checks."
      };
      portfolioStatus = {
        totalEq: "0",
        balances: [],
        lastUpdatedAt: now,
        lastError: exchangeStatus.lastError,
        performance: {
          sessionStartEqUsd: sessionStartEqUsd,
          currentEqUsd,
          deltaUsd: round6(currentEqUsd - sessionStartEqUsd),
          deltaPct: 0,
          timeline: [...equityTimeline],
          trades: [],
          daily: {
            day: now.slice(0, 10),
            realizedPnlUsd: 0,
            unrealizedPnlUsd: 0,
            feesUsd: 0,
            winRate: 0,
            wins: 0,
            losses: 0,
            closedTrades: 0
          },
          dailyByBasis: {
            utc: {
              day: now.slice(0, 10),
              realizedPnlUsd: 0,
              unrealizedPnlUsd: 0,
              feesUsd: 0,
              winRate: 0,
              wins: 0,
              losses: 0,
              closedTrades: 0
            },
            exchange: {
              day: dayKeyAtOffset(now, exchangeTimezoneOffsetMinutes),
              realizedPnlUsd: 0,
              unrealizedPnlUsd: 0,
              feesUsd: 0,
              winRate: 0,
              wins: 0,
              losses: 0,
              closedTrades: 0
            }
          },
          exchangeTimezoneOffsetMinutes,
          exchangeTimezoneLabel
        }
      };
      openOrdersStatus = {
        orders: [],
        lastUpdatedAt: now,
        lastError: exchangeStatus.lastError
      };
      return;
    }
    try {
      const adapter = new OkxDemoAdapter(loadOkxDemoConfigFromEnv(process.env));
      const [balanceRes, pendingOrdersRes, fillsRes] = await Promise.allSettled([
        adapter.getAccountBalance(),
        adapter.getPendingOrders(),
        adapter.getFills(undefined, performanceFillLimit)
      ]);

      const pendingOrders =
        pendingOrdersRes.status === "fulfilled"
          ? pendingOrdersRes.value.map((item) => ({
              ordId: item.ordId,
              clOrdId: item.clOrdId,
              instId: item.instId,
              side: item.side,
              px: item.px,
              sz: item.sz,
              accFillSz: item.accFillSz,
              state: item.state,
              cTime: item.cTime,
              uTime: item.uTime
            }))
          : latestSuccessfulPendingOrders;
      if (pendingOrdersRes.status === "fulfilled") {
        latestSuccessfulPendingOrders = pendingOrders;
      }

      const fills = fillsRes.status === "fulfilled" ? fillsRes.value : latestSuccessfulFills;
      if (fillsRes.status === "fulfilled") {
        latestSuccessfulFills = fills;
      }

      const currentEqUsd =
        balanceRes.status === "fulfilled" ? Math.max(0, toFiniteNumber(balanceRes.value.totalEq)) : Math.max(0, toFiniteNumber(portfolioStatus.totalEq));
      if (sessionStartEqUsd === undefined) {
        sessionStartEqUsd = currentEqUsd;
      }
      equityTimeline.push({
        at: now,
        equityUsd: currentEqUsd,
        drawdownPct: 0
      });
      if (equityTimeline.length > performanceTimelineMaxPoints) {
        equityTimeline.splice(0, equityTimeline.length - performanceTimelineMaxPoints);
      }
      let peak = 0;
      for (const point of equityTimeline) {
        peak = Math.max(peak, point.equityUsd);
        point.drawdownPct = peak > 0 ? round6(((point.equityUsd - peak) / peak) * 100) : 0;
      }
      const deltaUsd = currentEqUsd - sessionStartEqUsd;
      const deltaPct = sessionStartEqUsd > 0 ? (deltaUsd / sessionStartEqUsd) * 100 : 0;
      const marksBySymbol = new Map<string, number>();
      for (const fill of fills) {
        marksBySymbol.set(fill.instId, toFiniteNumber(fill.fillPx));
      }
      const perf = buildPerformanceFromFills({
        fills,
        marksBySymbol,
        feeRateBps: performanceFeeRateBps,
        sessionStartEqUsd,
        currentEqUsd,
        exchangeTimezoneOffsetMinutes
      });
      exchangeStatus = {
        connected: balanceRes.status === "fulfilled" && pendingOrdersRes.status === "fulfilled" && fillsRes.status === "fulfilled",
        mode,
        source: "okx_demo",
        lastHealthCheckAt: now,
        lastError:
          balanceRes.status === "rejected"
            ? (balanceRes.reason instanceof Error ? balanceRes.reason.message : String(balanceRes.reason))
            : pendingOrdersRes.status === "rejected"
              ? (pendingOrdersRes.reason instanceof Error ? pendingOrdersRes.reason.message : String(pendingOrdersRes.reason))
              : fillsRes.status === "rejected"
                ? (fillsRes.reason instanceof Error ? fillsRes.reason.message : String(fillsRes.reason))
                : undefined
      };

      const balances =
        balanceRes.status === "fulfilled"
          ? balanceRes.value.details.map((item) => ({
              ccy: item.ccy,
              availBal: item.availBal,
              cashBal: item.cashBal,
              eq: item.eq
            }))
          : portfolioStatus.balances;
      portfolioStatus = {
        totalEq: balanceRes.status === "fulfilled" ? balanceRes.value.totalEq : portfolioStatus.totalEq,
        balances,
        lastUpdatedAt: now,
        lastError: exchangeStatus.lastError,
        performance: {
          sessionStartEqUsd: round6(sessionStartEqUsd),
          currentEqUsd: round6(currentEqUsd),
          deltaUsd: round6(deltaUsd),
          deltaPct: round6(deltaPct),
          timeline: [...equityTimeline],
          trades: perf.trades.slice(0, performanceTradeLimit),
          daily: perf.dailyUtc,
          dailyByBasis: {
            utc: perf.dailyUtc,
            exchange: perf.dailyExchange
          },
          exchangeTimezoneOffsetMinutes,
          exchangeTimezoneLabel: perf.exchangeTimezoneLabel
        }
      };
      openOrdersStatus = {
        orders: pendingOrders,
        lastUpdatedAt: now,
        lastError:
          pendingOrdersRes.status === "rejected"
            ? (pendingOrdersRes.reason instanceof Error ? pendingOrdersRes.reason.message : String(pendingOrdersRes.reason))
            : undefined
      };
      await evaluateManagedTradeExits({
        adapter,
        fills,
        marksBySymbol,
        pendingOrders: openOrdersStatus.orders,
        nowIso: now
      });
      await evaluateStrategyDegradationTriggers(now);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const currentEqUsd = Math.max(0, toFiniteNumber(portfolioStatus.totalEq));
      if (sessionStartEqUsd === undefined) {
        sessionStartEqUsd = currentEqUsd;
      }
      exchangeStatus = {
        connected: false,
        mode,
        source: "okx_demo",
        lastHealthCheckAt: now,
        lastError: message
      };
      portfolioStatus = {
        totalEq: portfolioStatus.totalEq,
        balances: [],
        lastUpdatedAt: now,
        lastError: message,
        performance: {
          ...portfolioStatus.performance,
          currentEqUsd: round6(currentEqUsd),
          deltaUsd: round6(currentEqUsd - sessionStartEqUsd),
          deltaPct: sessionStartEqUsd > 0 ? round6(((currentEqUsd - sessionStartEqUsd) / sessionStartEqUsd) * 100) : 0
        }
      };
      openOrdersStatus = {
        orders: [],
        lastUpdatedAt: now,
        lastError: message
      };
    }
  }
  await refreshExchangeStatus();

  async function cancelAllOpenDemoOrders(actor: string, correlationId?: string): Promise<number> {
    const mode = resolveExchangeMode(process.env.OKX_TRADING_MODE);
    if (mode !== "demo") {
      return 0;
    }
    const adapter = new OkxDemoAdapter(loadOkxDemoConfigFromEnv(process.env));
    const pending = await adapter.getPendingOrders();
    let canceled = 0;
    for (const item of pending) {
      if (item.state !== "live" && item.state !== "partially_filled") {
        continue;
      }
      await adapter.cancelOrder({ instId: item.instId, ordId: item.ordId });
      canceled += 1;
      await publish(
        createEvent(
          "OrderCancelled",
          item.instId,
          `Demo pending order cancelled ordId=${item.ordId} clOrdId=${item.clOrdId} actor=${actor}`,
          "info",
          ["demo_execution", "okx_demo", "cancel_all"],
          correlationId
        )
      );
    }
    await refreshExchangeStatus();
    return canceled;
  }

  async function enforceDriftCircuitBreaker(actor = "system"): Promise<void> {
    const reconciliation = lifecycle.reconciliation;
    if (!hasReconciliationDrift(reconciliation)) {
      return;
    }
    const state = lifecycle.getSnapshotState();
    if (state.state !== "running") {
      return;
    }
    const nowEpoch = Date.now();
    const graceElapsed = driftFirstSeenAtEpoch ? nowEpoch - driftFirstSeenAtEpoch >= driftMaxGraceMs : false;
    if (driftConsecutive < driftMinConsecutive && !graceElapsed) {
      return;
    }
    const result = lifecycle.applyAction(driftCircuitAction);
    if (!result.ok) {
      return;
    }
    const symbol = state.activeSymbol;
    await upsertAlert({
      code: "RECONCILIATION_DRIFT_CIRCUIT",
      severity: "critical",
      source: "system",
      title: "Drift circuit breaker triggered",
      detail: `Auto-${driftCircuitAction} due to reconciliation drift/error.`,
      symbol
    });
    await appendAudit(
      "Circuit breaker triggered",
      `Auto-${driftCircuitAction} triggered by reconciliation drift; actor=${actor}`,
      symbol,
      "ControlCommandRejected"
    );
    await publish(
      createEvent(
        "ControlCommandRejected",
        symbol,
        `Circuit breaker auto-${driftCircuitAction} due to reconciliation drift/error`,
        "error",
        ["circuit_breaker", "reconciliation_drift"]
      )
    );
    await publish(
      createEvent(
        "BotStateChanged",
        symbol,
        `Bot state is now ${result.state.state} (circuit breaker)`,
        "warn",
        ["circuit_breaker", "state_change"]
      )
    );
    await fallbackApprovalModeToManual("reconciliation drift circuit breaker triggered", symbol, "critical");
    await rollbackStrategyOnDegradation("reconciliation drift circuit breaker triggered", actor, symbol);
    driftConsecutive = 0;
    driftFirstSeenAtEpoch = undefined;
  }

  async function appendAudit(title: string, detail: string, symbol: string, relatedEventType?: AuditItem["relatedEventType"]): Promise<void> {
    const item: AuditItem = {
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: new Date().toISOString(),
      title,
      detail,
      symbol,
      relatedEventType
    };
    lifecycle.audit.unshift(item);
    opsStore.appendAudit(item);
    if (lifecycle.audit.length > 300) {
      lifecycle.audit.length = 300;
    }
  }

  function isSqliteBusyError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }
    const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    const errcode = "errcode" in error ? Number((error as { errcode?: unknown }).errcode) : Number.NaN;
    const message =
      "message" in error ? String((error as { message?: unknown }).message ?? "").toLowerCase() : String(error).toLowerCase();
    return code === "ERR_SQLITE_ERROR" && (errcode === 5 || message.includes("database is locked"));
  }

  async function pruneRetentionData(): Promise<{
    eventsDeleted: number;
    auditDeleted: number;
    incidentsDeleted: number;
    managedTradesDeleted: number;
    closedTradeFeaturesDeleted: number;
  }> {
    try {
      const cutoffIso = new Date(Date.now() - streamRetentionMs).toISOString();
      const eventsDeleted = eventStore.deleteOlderThan(cutoffIso);
      const auditDeleted = opsStore.deleteAuditOlderThan(cutoffIso);
      const incidentsDeleted = opsStore.deleteIncidentsOlderThan(cutoffIso);
      const opsTradeCutoffIso = new Date(Date.now() - opsTradeRetentionMs).toISOString();
      const managedTradesDeleted = opsStore.deleteManagedTradesOlderThan(opsTradeCutoffIso);
      const closedTradeFeaturesDeleted = opsStore.deleteClosedTradeFeaturesOlderThan(opsTradeCutoffIso);
      learningRetentionLastPruneAt = new Date().toISOString();
      learningRetentionLastPruneResult = {
        closedTradeFeaturesDeleted
      };
      if (
        eventsDeleted === 0 &&
        auditDeleted === 0 &&
        incidentsDeleted === 0 &&
        managedTradesDeleted === 0 &&
        closedTradeFeaturesDeleted === 0
      ) {
        return {
          eventsDeleted,
          auditDeleted,
          incidentsDeleted,
          managedTradesDeleted,
          closedTradeFeaturesDeleted
        };
      }
      inMemoryEvents = await eventStore.readAll();
      const latestAudit = opsStore.listAudit(300);
      lifecycle.audit.length = 0;
      lifecycle.audit.push(...latestAudit);
      inMemoryIncidents = opsStore.listIncidents();
      metrics.openIncidents = inMemoryIncidents.filter((item) => item.status !== "resolved").length;
      if (managedTradesDeleted > 0) {
        for (const [tradeId, trade] of managedTrades.entries()) {
          const reference = trade.closedAt ?? trade.updatedAt;
          if (reference < opsTradeCutoffIso) {
            managedTrades.delete(tradeId);
          }
        }
      }
      return {
        eventsDeleted,
        auditDeleted,
        incidentsDeleted,
        managedTradesDeleted,
        closedTradeFeaturesDeleted
      };
    } catch (error: unknown) {
      if (isSqliteBusyError(error)) {
        return {
          eventsDeleted: 0,
          auditDeleted: 0,
          incidentsDeleted: 0,
          managedTradesDeleted: 0,
          closedTradeFeaturesDeleted: 0
        };
      }
      throw error;
    }
  }

  async function clearStreamsAndLogs(): Promise<ClearStreamsResult> {
    const eventsDeleted = eventStore.clearAll();
    const { auditDeleted, incidentsDeleted } = opsStore.clearTransientOps();
    const alertsDeleted = await alertStore.clearAll();
    const logsCleared = lifecycle.logs.length;
    lifecycle.logs.length = 0;
    lifecycle.audit.length = 0;
    inMemoryEvents = [];
    inMemoryAlerts = [];
    inMemoryIncidents = [];
    autoExitDecisionTrace.length = 0;
    pendingDemoOrders.clear();
    approvals.clear();
    managedTrades.clear();
    entryAutonomyStatus.fallbackActive = false;
    entryAutonomyStatus.lastFallbackAt = undefined;
    entryAutonomyStatus.lastFallbackReason = undefined;
    entryAutonomyStatus.lastPolicyAutoDecisionAt = undefined;
    entryAutonomyStatus.lastPolicyAutoBlockers = [];
    persistEntryAutonomyState();
    autoPauseState.active = false;
    autoPauseState.resumeAt = undefined;
    persistAutoPauseState();
    metrics.openAlerts = 0;
    metrics.openIncidents = 0;
    return {
      eventsDeleted,
      auditDeleted,
      incidentsDeleted,
      logsCleared: logsCleared + alertsDeleted
    };
  }

  async function buildMilestone5EvidenceSummary(nowIso: string): Promise<Milestone5EvidenceSummary> {
    const requiredDays = 7;
    const reportDayMap = new Map<string, Milestone5EvidenceDay & { endedAt: string }>();
    try {
      const entries = await readdir(m5EvidenceDir, { withFileTypes: true });
      const soakDirs = entries.filter((entry) => entry.isDirectory() && entry.name.startsWith("m5-soak-"));
      for (const dirent of soakDirs) {
        const reportPath = join(m5EvidenceDir, dirent.name, "report.json");
        try {
          const raw = await readFile(reportPath, "utf-8");
          const report = JSON.parse(raw) as {
            startedAt?: string;
            endedAt?: string;
            totals?: { filledEntries?: number; deterministicClosed?: number; tradeErrors?: number };
            checks?: {
              closureRatePct?: number;
              closureRatePass?: boolean;
              closedTradeDataPass?: boolean;
              reconciliationSloObservedPass?: boolean;
            };
          };
          const endedAt = report.endedAt ?? report.startedAt;
          const day = asUtcDay(endedAt);
          if (!endedAt || !day) {
            continue;
          }
          const item: Milestone5EvidenceDay & { endedAt: string } = {
            day,
            pass: Boolean(
              report.checks?.closureRatePass && report.checks?.closedTradeDataPass && report.checks?.reconciliationSloObservedPass
            ),
            source: "soak_report",
            closureRatePct: round6(toFiniteNumber(report.checks?.closureRatePct)),
            filledEntries: Math.max(0, Math.floor(toFiniteNumber(report.totals?.filledEntries))),
            deterministicClosed: Math.max(0, Math.floor(toFiniteNumber(report.totals?.deterministicClosed))),
            closedTradeDataPass: Boolean(report.checks?.closedTradeDataPass),
            reconciliationPass: Boolean(report.checks?.reconciliationSloObservedPass),
            tradeErrors: Math.max(0, Math.floor(toFiniteNumber(report.totals?.tradeErrors))),
            reportPath,
            endedAt
          };
          const existing = reportDayMap.get(day);
          if (!existing || existing.endedAt < item.endedAt) {
            reportDayMap.set(day, item);
          }
        } catch {
          continue;
        }
      }
    } catch {
      // no-op: missing evidence directory should not fail endpoint.
    }

    const todayDay = nowIso.slice(0, 10);
    const deterministicReasons = new Set<ExitReason>(["stop_loss", "take_profit", "time_stop", "flatten"]);
    const closedToday = [...managedTrades.values()].filter((trade) => trade.closedAt && asUtcDay(trade.closedAt) === todayDay);
    const filledEntriesToday = [...managedTrades.values()].filter(
      (trade) => asUtcDay(trade.createdAt) === todayDay && trade.entryFilledQty > 0
    );
    const deterministicClosedToday = closedToday.filter(
      (trade) => trade.exitReason && deterministicReasons.has(trade.exitReason)
    ).length;
    const tradeErrorsToday = [...managedTrades.values()].filter(
      (trade) => trade.status === "error" && asUtcDay(trade.updatedAt) === todayDay
    ).length;
    const uniqueClosedIdsToday = new Set(closedToday.map((trade) => trade.tradeId));
    const closedTradeDataPassToday =
      uniqueClosedIdsToday.size === closedToday.length &&
      closedToday.every(
        (trade) =>
          Boolean(trade.exitReason) && Number.isFinite(trade.realizedPnlUsd) && Number.isFinite(trade.feeUsd)
      );
    const closureRatePctToday =
      filledEntriesToday.length > 0 ? round6((deterministicClosedToday / filledEntriesToday.length) * 100) : 100;
    const reconciliationPass =
      lifecycle.reconciliation.positions === "ok" &&
      lifecycle.reconciliation.pnl === "ok" &&
      lifecycle.reconciliation.orders === "ok";
    const todayBlockers: string[] = [];
    if (filledEntriesToday.length > 0 && closureRatePctToday < 95) {
      todayBlockers.push(`Closure rate below threshold: ${closureRatePctToday.toFixed(2)}% (<95%).`);
    }
    if (!closedTradeDataPassToday) {
      todayBlockers.push("Closed trade data integrity failed.");
    }
    if (!reconciliationPass) {
      todayBlockers.push("Reconciliation not fully OK.");
    }
    if (tradeErrorsToday > 0) {
      todayBlockers.push(`Managed trade errors today: ${tradeErrorsToday}.`);
    }
    const liveToday: Milestone5EvidenceDay = {
      day: todayDay,
      pass: todayBlockers.length === 0,
      source: "live",
      closureRatePct: closureRatePctToday,
      filledEntries: filledEntriesToday.length,
      deterministicClosed: deterministicClosedToday,
      closedTradeDataPass: closedTradeDataPassToday,
      reconciliationPass,
      tradeErrors: tradeErrorsToday
    };

    const reportDays = [...reportDayMap.values()]
      .sort((a, b) => b.day.localeCompare(a.day))
      .map(({ endedAt: _, ...rest }) => rest);
    const days = [...reportDays];
    if (!days.some((item) => item.day === todayDay)) {
      days.unshift(liveToday);
    }

    let streakDays = 0;
    let expectedDay = days[0]?.day;
    for (const day of days) {
      if (!expectedDay || day.day !== expectedDay || !day.pass) {
        break;
      }
      streakDays += 1;
      const prev = new Date(dayStartIso(expectedDay));
      prev.setUTCDate(prev.getUTCDate() - 1);
      expectedDay = prev.toISOString().slice(0, 10);
    }

    const qualifiedDays = days.filter((item) => item.pass).length;
    const today = days.find((item) => item.day === todayDay) ?? liveToday;
    const todayBlockersEffective = today.source === "live" ? todayBlockers : today.pass ? [] : ["Latest soak report failed one or more criteria."];
    return {
      policyVersion: "calendar-day-v1",
      requiredDays,
      qualifiedDays,
      streakDays,
      milestoneReady: qualifiedDays >= requiredDays,
      generatedAt: nowIso,
      today: {
        day: today.day,
        pass: today.pass,
        source: today.source,
        blockers: todayBlockersEffective,
        closureRatePct: today.closureRatePct,
        filledEntries: today.filledEntries,
        deterministicClosed: today.deterministicClosed,
        reconciliationPass: today.reconciliationPass,
        tradeErrors: today.tradeErrors
      },
      days: days.slice(0, 30)
    };
  }

  async function buildRolloutStatusSummary(nowIso: string): Promise<RolloutStatusSummary> {
    const evidence = await buildMilestone5EvidenceSummary(nowIso);
    const openCriticalAlertCodes = new Set(
      inMemoryAlerts.filter((item) => item.status === "open").map((item) => item.code)
    );
    const latestEvidenceDay = evidence.days[0]?.day;
    const demoReadiness = evaluateDemoPolicyAutoReadiness(evidence, nowIso);
    const latestPassingEvidenceDay = demoReadiness.latestPassingEvidenceDay;
    const ageDays = demoReadiness.latestEvidenceAgeDays;
    const fresh = demoReadiness.fresh;

    const confidenceResetReasons: string[] = [];
    if (entryAutonomyStatus.fallbackActive) {
      confidenceResetReasons.push(
        entryAutonomyStatus.lastFallbackReason
          ? `Approval fallback active: ${entryAutonomyStatus.lastFallbackReason}`
          : "Approval fallback is active."
      );
    }
    if (evidence.today.filledEntries > 0 && evidence.today.closureRatePct < 95) {
      confidenceResetReasons.push(
        `Deterministic closure below threshold today: ${evidence.today.deterministicClosed}/${evidence.today.filledEntries} (${evidence.today.closureRatePct.toFixed(2)}%).`
      );
    }
    if (!evidence.today.reconciliationPass) {
      confidenceResetReasons.push("Reconciliation is not fully OK.");
    }
    if (evidence.today.tradeErrors > 0) {
      confidenceResetReasons.push(`Managed trade errors today: ${evidence.today.tradeErrors}.`);
    }
    if (openCriticalAlertCodes.has("APPROVAL_MODE_FALLBACK")) {
      confidenceResetReasons.push("Open APPROVAL_MODE_FALLBACK alert.");
    }
    if (openCriticalAlertCodes.has("AUTO_EXIT_SUBMIT_FAILED")) {
      confidenceResetReasons.push("Open AUTO_EXIT_SUBMIT_FAILED alert.");
    }
    if (openCriticalAlertCodes.has("RECONCILIATION_DRIFT_CIRCUIT")) {
      confidenceResetReasons.push("Open RECONCILIATION_DRIFT_CIRCUIT alert.");
    }

    const confidenceResetActive = confidenceResetReasons.length > 0;
    const effectiveQualifiedDays = confidenceResetActive ? 0 : demoReadiness.qualifiedDays;
    const snapshotMode = lifecycle.getSnapshotState().mode;

    let currentStage: RolloutStatusSummary["currentStage"] = {
      id: "phase0_reset_and_stabilize",
      label: "Phase 0: Reset and Stabilize",
      objective: "Restore deterministic closure and make fresh demo evidence mandatory."
    };
    if (!confidenceResetActive) {
      if (snapshotMode === "live" && entryAutonomyConfig.approvalMode === "policy_auto") {
        currentStage = {
          id: "phase7_live_bounded_auto_btc",
          label: "Phase 7: Live Bounded Auto for BTC",
          objective: "Keep live auto narrow, explain every fallback, and hold tiny notional caps."
        };
      } else if (snapshotMode === "live") {
        currentStage = {
          id: "phase6_live_manual_tiny_notional",
          label: "Phase 6: Live Manual Tiny Notional",
          objective: "Prove live execution safely before autonomy."
        };
      } else if (entryAutonomyConfig.approvalMode === "policy_auto") {
        currentStage = {
          id: "phase4_bounded_demo_auto_approval",
          label: "Phase 4: Bounded Demo Auto-Approval",
          objective: "Prove policy_auto in demo before any live capital is touched."
        };
      } else if (evidence.milestoneReady) {
        currentStage = {
          id: "phase3_supervised_demo_autonomy",
          label: "Phase 3: Supervised Demo Autonomy",
          objective: "Keep demo active with manual approvals while validating runtime guardrails."
        };
      } else {
        currentStage = {
          id: "phase1_demo_execution_hardening",
          label: "Phase 1: Demo Execution Hardening",
          objective: "Make exchange interaction boring, predictable, and observable."
        };
      }
    }

    let posture: RolloutStatusSummary["posture"] = "blocked";
    if (!confidenceResetActive && snapshotMode === "live") {
      posture = "advancing";
    } else if (!confidenceResetActive) {
      posture = "demo_only";
    }

    let nextGateLabel = "Phase 0 exit gate";
    let nextGateBlockers = confidenceResetReasons.length > 0 ? [...confidenceResetReasons] : [];
    let nextRecommendedAction =
      "Reproduce the deterministic closure path, document root cause, and add a regression test before collecting fresh evidence.";

    if (!confidenceResetActive) {
      if (!evidence.milestoneReady) {
        nextGateLabel = "Phase 4 demo auto-approval gate";
        nextGateBlockers = [
          ...(effectiveQualifiedDays >= evidence.requiredDays
            ? []
            : [`Fresh qualifying demo days: ${effectiveQualifiedDays}/${evidence.requiredDays}.`]),
          ...(fresh ? [] : [`Latest passing evidence is stale${latestPassingEvidenceDay ? ` (${latestPassingEvidenceDay})` : ""}.`]),
          ...(evidence.today.pass ? [] : evidence.today.blockers),
          ...(entryAutonomyConfig.approvalMode === "policy_auto" ? [] : ["approvalMode must remain manual until supervised demo sessions are clean."])
        ];
        nextRecommendedAction =
          "Finish demo hardening, then rebuild seven fresh qualifying demo days on BTC before enabling durable policy_auto runs.";
      } else if (snapshotMode !== "live" && entryAutonomyConfig.approvalMode !== "policy_auto") {
        nextGateLabel = "Phase 3 supervised demo autonomy gate";
        nextGateBlockers = [
          "Run BTC supervised demo sessions with manual approval.",
          "Validate guardrail rejects, cooldowns, drift pause, and incident workflow during active sessions."
        ];
        nextRecommendedAction =
          "Keep BTC in manual approval, run supervised demo sessions, and verify the dashboard reports promotion metrics cleanly.";
      } else if (snapshotMode !== "live") {
        nextGateLabel = "Phase 4 bounded demo auto-approval gate";
        nextGateBlockers = [
          "Complete two uninterrupted BTC policy_auto sessions of at least 2 hours with zero fallback.",
          "Repeat the gate independently for ETH and SOL only after BTC stays clean."
        ];
        nextRecommendedAction =
          "Keep demo caps tiny, run BTC policy_auto sessions, and fail closed on any fallback, drift, or exit-path anomaly.";
      } else if (entryAutonomyConfig.approvalMode !== "policy_auto") {
        nextGateLabel = "Phase 6 live manual tiny-notional gate";
        nextGateBlockers = [
          "Keep manual approval for the first two live days.",
          "Maintain positive net expectancy with no severe operational incidents."
        ];
        nextRecommendedAction =
          "Run live BTC in manual tiny-notional mode only after shadow assumptions hold up under conservative slippage haircuts.";
      } else {
        nextGateLabel = "Phase 7 live bounded auto BTC gate";
        nextGateBlockers = [
          "Maintain five clean live BTC days at tiny notional.",
          "Explain every fallback cause before expanding autonomy."
        ];
        nextRecommendedAction =
          "Keep BTC autonomous under strict caps and only expand after five clean live days net of full costs.";
      }
    }

    return {
      generatedAt: nowIso,
      posture,
      currentStage,
      confidenceReset: {
        active: confidenceResetActive,
        reasons: confidenceResetReasons,
        priorReadinessInformationalOnly: confidenceResetActive
      },
      evidence: {
        rawQualifiedDays: evidence.qualifiedDays,
        effectiveQualifiedDays: confidenceResetActive ? 0 : demoReadiness.qualifiedDays,
        requiredDays: evidence.requiredDays,
        streakDays: evidence.streakDays,
        fresh,
        latestEvidenceDay,
        latestPassingEvidenceDay,
        ageDays
      },
      nextGate: {
        label: nextGateLabel,
        blockers: nextGateBlockers
      },
      nextRecommendedAction
    };
  }

  function bucketLearningEvaluation(
    items: Array<{
      version: string;
      pnl: number;
      slippageBps: number;
      controlViolation: boolean;
    }>
  ): LearningEvaluationBucket[] {
    const grouped = new Map<string, Array<{ pnl: number; slippageBps: number; controlViolation: boolean }>>();
    for (const item of items) {
      const key = item.version || "unknown";
      const bucket = grouped.get(key) ?? [];
      bucket.push({ pnl: item.pnl, slippageBps: item.slippageBps, controlViolation: item.controlViolation });
      grouped.set(key, bucket);
    }
    const out: LearningEvaluationBucket[] = [];
    for (const [version, bucket] of grouped.entries()) {
      let cumulative = 0;
      let peak = 0;
      let maxDrawdownUsd = 0;
      let slippageTotal = 0;
      let controlViolations = 0;
      for (const row of bucket) {
        cumulative += row.pnl;
        peak = Math.max(peak, cumulative);
        maxDrawdownUsd = Math.max(maxDrawdownUsd, peak - cumulative);
        slippageTotal += row.slippageBps;
        if (row.controlViolation) {
          controlViolations += 1;
        }
      }
      const expectancy = bucket.length > 0 ? cumulative / bucket.length : 0;
      const maxDrawdownPct = computeDrawdownPct(maxDrawdownUsd, peak);
      const slippageProxyBps = bucket.length > 0 ? slippageTotal / bucket.length : 0;
      out.push({
        version,
        trades: bucket.length,
        expectancyNetFeesUsd: round6(expectancy),
        cumulativeNetPnlUsd: round6(cumulative),
        maxDrawdownUsd: round6(maxDrawdownUsd),
        maxDrawdownPct: round6(maxDrawdownPct),
        slippageProxyBps: round6(slippageProxyBps),
        controlViolations
      });
    }
    return out.sort((a, b) => b.trades - a.trades || a.version.localeCompare(b.version));
  }

  function buildLearningEvaluationSummary(nowIso: string, lookbackDays: number, limit: number): LearningEvaluationSummary {
    const nowEpoch = Date.parse(nowIso);
    const minEpoch = nowEpoch - lookbackDays * 24 * 60 * 60 * 1000;
    const controlViolationReasons = new Set<ExitReason>(["manual", "circuit_breaker"]);
    const rows = opsStore
      .listClosedTradeFeatures(Math.max(1, limit))
      .filter((item) => {
        const epoch = Date.parse(item.closedAt);
        return Number.isFinite(epoch) && epoch >= minEpoch;
      })
      .sort((a, b) => a.closedAt.localeCompare(b.closedAt));
    let cumulative = 0;
    let peak = 0;
    let maxDrawdownUsd = 0;
    let slippageTotal = 0;
    let controlViolations = 0;
    const materialized = rows.map((item) => {
      const slippageProxyBps =
        item.entryAvgPrice > 0 ? Math.abs(((item.exitAvgPrice - item.entryAvgPrice) / item.entryAvgPrice) * 10_000) : 0;
      const controlViolation = controlViolationReasons.has(item.exitReason as ExitReason);
      cumulative += item.realizedPnlUsd;
      peak = Math.max(peak, cumulative);
      maxDrawdownUsd = Math.max(maxDrawdownUsd, peak - cumulative);
      slippageTotal += slippageProxyBps;
      if (controlViolation) {
        controlViolations += 1;
      }
      return {
        modelVersion: item.modelVersion,
        strategyVersion: item.strategyVersion,
        pnl: item.realizedPnlUsd,
        slippageBps: slippageProxyBps,
        controlViolation
      };
    });
    const expectancy = rows.length > 0 ? cumulative / rows.length : 0;
    const slippageProxyBps = rows.length > 0 ? slippageTotal / rows.length : 0;
    const maxDrawdownPct = computeDrawdownPct(maxDrawdownUsd, peak);
    return {
      generatedAt: nowIso,
      lookbackDays,
      closedTrades: rows.length,
      totals: {
        expectancyNetFeesUsd: round6(expectancy),
        cumulativeNetPnlUsd: round6(cumulative),
        maxDrawdownUsd: round6(maxDrawdownUsd),
        maxDrawdownPct: round6(maxDrawdownPct),
        slippageProxyBps: round6(slippageProxyBps),
        controlViolations
      },
      byModelVersion: bucketLearningEvaluation(
        materialized.map((item) => ({
          version: item.modelVersion,
          pnl: item.pnl,
          slippageBps: item.slippageBps,
          controlViolation: item.controlViolation
        }))
      ),
      byStrategyVersion: bucketLearningEvaluation(
        materialized.map((item) => ({
          version: item.strategyVersion,
          pnl: item.pnl,
          slippageBps: item.slippageBps,
          controlViolation: item.controlViolation
        }))
      )
    };
  }

  function learningBreachesFromSummary(
    summary: LearningEvaluationSummary,
    thresholds: LearningAlertThresholds
  ): LearningEvaluationTrendPoint["breaches"] {
    const controlViolationRatePct =
      summary.closedTrades > 0 ? (summary.totals.controlViolations / summary.closedTrades) * 100 : 0;
    return {
      expectancy: summary.totals.expectancyNetFeesUsd < thresholds.expectancyMinUsd,
      drawdown: summary.totals.maxDrawdownPct > thresholds.maxDrawdownPct,
      slippage: summary.totals.slippageProxyBps > thresholds.maxSlippageBps,
      controlViolationRate: controlViolationRatePct > thresholds.maxControlViolationRatePct
    };
  }

  function buildLearningEvaluationTrendSummary(
    nowIso: string,
    lookbackDays: number,
    bucketDays: number,
    limit: number,
    thresholds: LearningAlertThresholds
  ): LearningEvaluationTrendSummary {
    const nowEpoch = Date.parse(nowIso);
    const minEpoch = nowEpoch - lookbackDays * 24 * 60 * 60 * 1000;
    const bucketMs = Math.max(1, bucketDays) * 24 * 60 * 60 * 1000;
    const rows = opsStore
      .listClosedTradeFeatures(Math.max(1, limit))
      .filter((item) => {
        const epoch = Date.parse(item.closedAt);
        return Number.isFinite(epoch) && epoch >= minEpoch;
      })
      .sort((a, b) => a.closedAt.localeCompare(b.closedAt));

    const buckets = new Map<number, ClosedTradeFeatureRecord[]>();
    for (const item of rows) {
      const epoch = Date.parse(item.closedAt);
      const index = Math.max(0, Math.floor((epoch - minEpoch) / bucketMs));
      const bucket = buckets.get(index) ?? [];
      bucket.push(item);
      buckets.set(index, bucket);
    }

    const points: LearningEvaluationTrendPoint[] = [];
    for (const [index, bucket] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
      const bucketStartEpoch = minEpoch + index * bucketMs;
      const bucketEndEpoch = Math.min(nowEpoch, bucketStartEpoch + bucketMs);
      let cumulative = 0;
      let peak = 0;
      let maxDrawdownUsd = 0;
      let slippageTotal = 0;
      let controlViolations = 0;
      const modelCounts = new Map<string, number>();
      const strategyCounts = new Map<string, number>();
      for (const item of bucket) {
        const slippageProxyBps =
          item.entryAvgPrice > 0 ? Math.abs(((item.exitAvgPrice - item.entryAvgPrice) / item.entryAvgPrice) * 10_000) : 0;
        const controlViolation = item.exitReason === "manual" || item.exitReason === "circuit_breaker";
        cumulative += item.realizedPnlUsd;
        peak = Math.max(peak, cumulative);
        maxDrawdownUsd = Math.max(maxDrawdownUsd, peak - cumulative);
        slippageTotal += slippageProxyBps;
        if (controlViolation) {
          controlViolations += 1;
        }
        const modelKey = item.modelVersion || "unknown";
        modelCounts.set(modelKey, (modelCounts.get(modelKey) ?? 0) + 1);
        const strategyKey = item.strategyVersion || "unknown";
        strategyCounts.set(strategyKey, (strategyCounts.get(strategyKey) ?? 0) + 1);
      }
      const closedTrades = bucket.length;
      const expectancyNetFeesUsd = closedTrades > 0 ? cumulative / closedTrades : 0;
      const slippageProxyBps = closedTrades > 0 ? slippageTotal / closedTrades : 0;
      const maxDrawdownPct = computeDrawdownPct(maxDrawdownUsd, peak);
      const controlViolationRatePct = closedTrades > 0 ? (controlViolations / closedTrades) * 100 : 0;
      const syntheticSummary: LearningEvaluationSummary = {
        generatedAt: nowIso,
        lookbackDays: bucketDays,
        closedTrades,
        totals: {
          expectancyNetFeesUsd: round6(expectancyNetFeesUsd),
          cumulativeNetPnlUsd: round6(cumulative),
          maxDrawdownUsd: round6(maxDrawdownUsd),
          maxDrawdownPct: round6(maxDrawdownPct),
          slippageProxyBps: round6(slippageProxyBps),
          controlViolations
        },
        byModelVersion: [],
        byStrategyVersion: []
      };
      points.push({
        bucketStartAt: new Date(bucketStartEpoch).toISOString(),
        bucketEndAt: new Date(bucketEndEpoch).toISOString(),
        closedTrades,
        expectancyNetFeesUsd: syntheticSummary.totals.expectancyNetFeesUsd,
        cumulativeNetPnlUsd: syntheticSummary.totals.cumulativeNetPnlUsd,
        maxDrawdownPct: syntheticSummary.totals.maxDrawdownPct,
        slippageProxyBps: syntheticSummary.totals.slippageProxyBps,
        controlViolations,
        controlViolationRatePct: round6(controlViolationRatePct),
        modelVersions: [...modelCounts.entries()]
          .map(([version, trades]) => ({ version, trades }))
          .sort((a, b) => b.trades - a.trades || a.version.localeCompare(b.version)),
        strategyVersions: [...strategyCounts.entries()]
          .map(([version, trades]) => ({ version, trades }))
          .sort((a, b) => b.trades - a.trades || a.version.localeCompare(b.version)),
        breaches: learningBreachesFromSummary(syntheticSummary, thresholds)
      });
    }

    return {
      generatedAt: nowIso,
      lookbackDays,
      bucketDays,
      thresholds: { ...thresholds },
      points
    };
  }

  async function sweepExpiredApprovals(): Promise<void> {
    const expired = approvals.expirePending();
    for (const item of expired) {
      pendingDemoOrders.delete(item.id);
      const symbol = lifecycle.getSnapshotState().activeSymbol;
      await appendAudit(
        "Approval expired",
        `Approval ${item.id} expired for ${item.action}; actor=system requester=${item.requestedBy}`,
        symbol,
        "System"
      );
      await publish(
        createEvent(
          "System",
          symbol,
          `Approval expired: ${item.id} (${item.action}) actor=system requester=${item.requestedBy}`,
          "warn",
          ["approval_expired"]
        )
      );
    }
  }

  async function publish(event: BotEvent): Promise<void> {
    const normalized = normalizeHeartbeatEventSemantics(event);
    if (normalized.type === "ProposalCreated") {
      const epoch = Date.parse(normalized.timestamp);
      if (Number.isFinite(epoch)) {
        lastProposalCreatedAtEpoch = epoch;
      } else {
        lastProposalCreatedAtEpoch = Date.now();
      }
    }
    if (normalized.tags?.includes("entry_backlog_guard")) {
      const epoch = Date.parse(normalized.timestamp);
      lastWorkerBacklogGuardAtEpoch = Number.isFinite(epoch) ? epoch : Date.now();
    }
    inMemoryEvents = [normalized, ...inMemoryEvents].slice(0, 500);
    bus.publish(normalized);
    await eventStore.append(normalized);
    if (normalized.tags?.includes("gatekeeper_reject")) {
      metrics.gatekeeperRejectsTotal += 1;
    }
    if (normalized.tags?.includes("reconciliation_drift")) {
      metrics.driftEventsTotal += 1;
    }
    if (normalized.severity === "error" || normalized.type === "Error") {
      await upsertAlert({
        code: "RUNTIME_ERROR_EVENT",
        severity: "error",
        source: "system",
        title: "Runtime error event",
        detail: normalized.message,
        symbol: normalized.symbol
      });
    }
  }

  async function upsertAlert(input: {
    code: string;
    severity: AlertItem["severity"];
    source: AlertItem["source"];
    title: string;
    detail: string;
    symbol?: string;
  }): Promise<AlertItem> {
    const existing = await alertStore.findByFingerprint(input.code, input.symbol);
    const now = new Date().toISOString();
    const next: AlertItem = existing
      ? {
          ...existing,
          severity: input.severity,
          source: input.source,
          title: input.title,
          detail: input.detail,
          status: "open",
          lastSeenAt: now,
          count: existing.count + 1
        }
      : {
          id: `alert-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          code: input.code,
          severity: input.severity,
          source: input.source,
          title: input.title,
          detail: input.detail,
          symbol: input.symbol,
          status: "open",
          firstSeenAt: now,
          lastSeenAt: now,
          count: 1
        };
    const saved = await alertStore.upsert(next);
    inMemoryAlerts = await alertStore.readAll();
    metrics.openAlerts = inMemoryAlerts.filter((item) => item.status === "open").length;
    if (shouldOpenIncidentForAlert(saved)) {
      const existingIncident = opsStore.findOpenIncidentByAlert(saved.code, saved.symbol);
      if (!existingIncident) {
        const template = incidentTemplateFromAlert(saved);
        opsStore.createIncident({
          id: `incident-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          severity: template.severity,
          taxonomy: template.taxonomy,
          title: saved.title,
          detail: saved.detail,
          runbookRef: template.runbookRef,
          symbol: saved.symbol,
          sourceAlertCode: saved.code
        });
      }
      inMemoryIncidents = opsStore.listIncidents();
      metrics.openIncidents = countBlockingOpenIncidents(inMemoryIncidents);
    }
    const blockingIncidentCount = countBlockingOpenIncidents(inMemoryIncidents);
    if (blockingIncidentCount > 0) {
      await fallbackApprovalModeToManual(
        `open incident present (count=${blockingIncidentCount})`,
        saved.symbol ?? lifecycle.getSnapshotState().activeSymbol,
        "warn"
      );
    }
    if (saved.severity === "critical") {
      await fallbackApprovalModeToManual(`critical alert raised: ${saved.code}`, saved.symbol ?? lifecycle.getSnapshotState().activeSymbol, "critical");
      await rollbackStrategyOnDegradation(
        `critical alert raised: ${saved.code}`,
        "system",
        saved.symbol ?? lifecycle.getSnapshotState().activeSymbol
      );
    }
    return saved;
  }

  async function resolveAlertIfOpen(code: string, symbol: string | undefined, actor = "system"): Promise<void> {
    const open = await alertStore.findByFingerprint(code, symbol);
    if (!open) {
      return;
    }
    await alertStore.updateStatus(open.id, "resolved", actor);
    inMemoryAlerts = await alertStore.readAll();
    metrics.openAlerts = inMemoryAlerts.filter((item) => item.status === "open").length;
  }

  async function evaluateLearningAlertThresholds(nowIso: string): Promise<void> {
    if (!learningAlertThresholds.enabled) {
      return;
    }
    const summary = buildLearningEvaluationSummary(nowIso, learningAlertThresholds.lookbackDays, learningAlertThresholds.limit);
    const breaches = learningBreachesFromSummary(summary, learningAlertThresholds);
    const symbol = undefined;
    if (summary.closedTrades < learningAlertThresholds.minTrades) {
      await resolveAlertIfOpen("LEARNING_EXPECTANCY_DEGRADATION", symbol);
      await resolveAlertIfOpen("LEARNING_DRAWDOWN_ELEVATED", symbol);
      await resolveAlertIfOpen("LEARNING_SLIPPAGE_ELEVATED", symbol);
      await resolveAlertIfOpen("LEARNING_CONTROL_VIOLATION_RATE_ELEVATED", symbol);
      return;
    }

    const controlViolationRatePct = summary.closedTrades > 0 ? (summary.totals.controlViolations / summary.closedTrades) * 100 : 0;

    if (summary.totals.expectancyNetFeesUsd < learningAlertThresholds.expectancyMinUsd) {
      await upsertAlert({
        code: "LEARNING_EXPECTANCY_DEGRADATION",
        severity: "error",
        source: "system",
        title: "Learning expectancy below threshold",
        detail: `Expectancy ${summary.totals.expectancyNetFeesUsd} < ${learningAlertThresholds.expectancyMinUsd} over ${summary.closedTrades} closed trades (${summary.lookbackDays}d lookback).`,
        symbol
      });
    } else {
      await resolveAlertIfOpen("LEARNING_EXPECTANCY_DEGRADATION", symbol);
    }

    if (summary.totals.maxDrawdownPct > learningAlertThresholds.maxDrawdownPct) {
      await upsertAlert({
        code: "LEARNING_DRAWDOWN_ELEVATED",
        severity: "error",
        source: "system",
        title: "Learning drawdown above threshold",
        detail: `Drawdown ${summary.totals.maxDrawdownPct}% > ${learningAlertThresholds.maxDrawdownPct}% over ${summary.closedTrades} closed trades (${summary.lookbackDays}d lookback).`,
        symbol
      });
    } else {
      await resolveAlertIfOpen("LEARNING_DRAWDOWN_ELEVATED", symbol);
    }

    if (summary.totals.slippageProxyBps > learningAlertThresholds.maxSlippageBps) {
      await upsertAlert({
        code: "LEARNING_SLIPPAGE_ELEVATED",
        severity: "warn",
        source: "system",
        title: "Learning slippage above threshold",
        detail: `Slippage ${summary.totals.slippageProxyBps}bps > ${learningAlertThresholds.maxSlippageBps}bps over ${summary.closedTrades} closed trades (${summary.lookbackDays}d lookback).`,
        symbol
      });
    } else {
      await resolveAlertIfOpen("LEARNING_SLIPPAGE_ELEVATED", symbol);
    }

    if (controlViolationRatePct > learningAlertThresholds.maxControlViolationRatePct) {
      await upsertAlert({
        code: "LEARNING_CONTROL_VIOLATION_RATE_ELEVATED",
        severity: "warn",
        source: "system",
        title: "Learning control-violation rate above threshold",
        detail: `Control violations ${round6(controlViolationRatePct)}% > ${learningAlertThresholds.maxControlViolationRatePct}% over ${summary.closedTrades} closed trades (${summary.lookbackDays}d lookback).`,
        symbol
      });
    } else {
      await resolveAlertIfOpen("LEARNING_CONTROL_VIOLATION_RATE_ELEVATED", symbol);
    }

    if (breaches.expectancy || breaches.drawdown || breaches.slippage || breaches.controlViolationRate) {
      const activeSymbol = lifecycle.getSnapshotState().activeSymbol;
      const breachList = Object.entries(breaches)
        .filter(([, active]) => active)
        .map(([key]) => key)
        .join(", ");
      await triggerAutoPause(`learning alert breach: ${breachList}`, activeSymbol, "warn");
    }
  }

  if (inMemoryEvents.length === 0) {
    await publish(createEvent("System", "BTC-USDT", "Mission control backend initialized", "info", ["bootstrap"]));
  }

  lifecycle.startTick((message) => {
    const state = lifecycle.getSnapshotState();
    if (message === HEARTBEAT_CHECKPOINT_MESSAGE) {
      return;
    }
    void publish(createEvent("System", state.activeSymbol, message, "info", ["worker_cycle"]));
  });
  if (lifecycle.getSnapshotState().state === "running") {
    worker.start();
    void publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        "Worker auto-started from persisted running state",
        "info",
        ["bootstrap", "worker_autostart"]
      )
    );
  }

  const reconcileIntervalMs = parseBoundedInt(process.env.TOURAB_RECONCILE_INTERVAL_MS, 20_000, 5_000, 120_000);
  const heartbeatGapMs = parseBoundedInt(process.env.TOURAB_HEARTBEAT_GAP_MS, 30_000, 5_000, 300_000);
  const workerProposalGapMs = parseBoundedInt(process.env.TOURAB_WORKER_PROPOSAL_GAP_MS, 60_000, 1_000, 3_600_000);
  const workerStallCheckIntervalMs = parseBoundedInt(process.env.TOURAB_WORKER_STALL_CHECK_INTERVAL_MS, 5_000, 500, 60_000);
  const exchangeHealthIntervalMs = parseBoundedInt(process.env.TOURAB_EXCHANGE_HEALTH_INTERVAL_MS, 15_000, 5_000, 300_000);
  const learningAlertCheckIntervalMs = parseBoundedInt(
    process.env.TOURAB_LEARNING_ALERT_CHECK_INTERVAL_MS,
    DEFAULT_LEARNING_ALERT_CHECK_INTERVAL_MS,
    250,
    3_600_000
  );
  const autoPauseCheckIntervalMs = parseBoundedInt(
    process.env.TOURAB_AUTO_PAUSE_CHECK_INTERVAL_MS,
    DEFAULT_AUTO_PAUSE_CHECK_INTERVAL_MS,
    1_000,
    3_600_000
  );
  const reconcileTimer = setInterval(() => {
    const state = lifecycle.getSnapshotState();
    const nowIso = new Date().toISOString();
    const hasDrift = inMemoryAlerts.some(
      (item) => item.status === "open" && (item.code === "RECONCILIATION_DRIFT_CIRCUIT" || item.code.includes("DRIFT"))
    );
    lifecycle.updateReconciliation({
      positions: hasDrift ? "drift" : "ok",
      pnl: hasDrift ? "drift" : "ok",
      orders: hasDrift ? "drift" : "ok",
      lastRunAt: nowIso
    });
    opsStore.saveReconciliation(lifecycle.reconciliation);
    metrics.reconcileRunsTotal += 1;
    void publish(
      createEvent(
        "ReconciliationComplete",
        state.activeSymbol,
        `Continuous reconciliation tick: positions=${lifecycle.reconciliation.positions} pnl=${lifecycle.reconciliation.pnl} orders=${lifecycle.reconciliation.orders}`,
        hasDrift ? "warn" : "info",
        [hasDrift ? "reconciliation_drift" : "reconciliation_ok", "continuous_reconcile"]
      )
    );
  }, reconcileIntervalMs);

  const heartbeatTimer = setInterval(() => {
    const state = lifecycle.getSnapshotState();
    const gap = Date.now() - Date.parse(state.lastHeartbeatAt);
    metrics.lastHeartbeatGapMs = Number.isFinite(gap) ? Math.max(0, Math.floor(gap)) : 0;
    if (state.state === "running" && metrics.lastHeartbeatGapMs > heartbeatGapMs) {
      metrics.heartbeatGapEventsTotal += 1;
      void upsertAlert({
        code: "HEARTBEAT_GAP",
        severity: "warn",
        source: "system",
        title: "Heartbeat gap detected",
        detail: `Heartbeat gap ${metrics.lastHeartbeatGapMs}ms exceeded threshold ${heartbeatGapMs}ms`,
        symbol: state.activeSymbol
      });
    }
  }, 5_000);
  async function resolveWorkerStallAlert(): Promise<void> {
    const open = await alertStore.findByFingerprint(WORKER_STALL_ALERT_CODE, undefined);
    if (!open) {
      return;
    }
    await alertStore.updateStatus(open.id, "resolved", "system");
    inMemoryAlerts = await alertStore.readAll();
    metrics.openAlerts = inMemoryAlerts.filter((item) => item.status === "open").length;
  }
  const workerStallTimer = setInterval(() => {
    const state = lifecycle.getSnapshotState();
    if (state.state !== "running") {
      return;
    }
    const hasThrottledEntryBacklog = (() => {
      const counts = new Map<string, number>();
      for (const trade of managedTrades.values()) {
        if (
          trade.status !== "planned" &&
          trade.status !== "entry_submitted" &&
          trade.status !== "entry_partially_filled"
        ) {
          continue;
        }
        counts.set(trade.symbol, (counts.get(trade.symbol) ?? 0) + 1);
      }
      return [...counts.values()].some((count) => count >= workerMaxPendingEntriesPerSymbol);
    })();
    const now = Date.now();
    const proposalGap = now - lastProposalCreatedAtEpoch;
    const backlogGuardGap = now - lastWorkerBacklogGuardAtEpoch;
    if (hasThrottledEntryBacklog || (Number.isFinite(backlogGuardGap) && backlogGuardGap <= workerProposalGapMs)) {
      void resolveWorkerStallAlert();
      return;
    }
    if (!Number.isFinite(proposalGap) || proposalGap > workerProposalGapMs) {
      void upsertAlert({
        code: WORKER_STALL_ALERT_CODE,
        severity: "warn",
        source: "system",
        title: "Worker proposal stream stalled",
        detail: `No ProposalCreated event for ${Number.isFinite(proposalGap) ? proposalGap : "unknown"}ms while state=running (threshold=${workerProposalGapMs}ms).`,
        symbol: undefined
      });
      return;
    }
    void resolveWorkerStallAlert();
  }, workerStallCheckIntervalMs);
  const exchangeHealthTimer = setInterval(() => {
    void refreshExchangeStatus();
  }, exchangeHealthIntervalMs);
  const retentionTimer = setInterval(() => {
    void pruneRetentionData();
  }, streamRetentionSweepMs);
  await evaluateLearningAlertThresholds(new Date().toISOString());
  const learningAlertTimer = setInterval(() => {
    void evaluateLearningAlertThresholds(new Date().toISOString());
  }, learningAlertCheckIntervalMs);

  const autoPauseTimer = setInterval(() => {
    const nowIso = new Date().toISOString();
    void evaluateAutoPauseConditions(nowIso);
    void evaluateAutoResume(nowIso);
  }, autoPauseCheckIntervalMs);
  await pruneRetentionData();

  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, x-tourab-role, x-correlation-id, x-user-id, x-actor-id, x-approval-id");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(authRoleMiddleware);
  if (logRequests) {
    app.use((req: Request, _res: Response, next) => {
      const typed = req as AuthenticatedRequest;
      process.stdout.write(
        `[mission-control] ${new Date().toISOString()} ${req.method} ${req.path} role=${typed.role} corr=${typed.correlationId}\n`
      );
      next();
    });
  }

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "mission-control",
      state: lifecycle.getSnapshotState().state,
      exchangeConnected: exchangeStatus.connected,
      exchangeMode: exchangeStatus.mode
    });
  });

  app.post("/auth/dev-token", async (req, res) => {
    const secret = process.env.TOURAB_AUTH_SECRET;
    if (!secret) {
      writeError(res, 400, {
        ok: false,
        code: "AUTH_SECRET_MISSING",
        message: "TOURAB_AUTH_SECRET is required to mint dev tokens."
      });
      return;
    }
    const userId = typeof req.body?.userId === "string" ? req.body.userId : "operator-1";
    const role = (req.body?.role === "admin" || req.body?.role === "operator" || req.body?.role === "read_only"
      ? req.body.role
      : "operator") as "admin" | "operator" | "read_only";
    const ttlSec = parseBoundedInt(String(req.body?.ttlSec ?? "3600"), 3600, 60, 86_400);
    const nowSec = Math.floor(Date.now() / 1000);
    const token = createSignedAccessToken(
      {
        sub: userId,
        role,
        iat: nowSec,
        exp: nowSec + ttlSec
      },
      secret
    );
    res.json({ token, userId, role, exp: nowSec + ttlSec });
  });

  app.get("/snapshot", (_req, res) => {
    const snapshot: DashboardSnapshot = {
      state: lifecycle.getSnapshotState(),
      risk: lifecycle.risk,
      reconciliation: lifecycle.reconciliation,
      audit: lifecycle.audit,
      logs: lifecycle.logs,
      alerts: inMemoryAlerts,
      incidents: inMemoryIncidents,
      metrics,
      exchange: exchangeStatus,
      portfolio: portfolioStatus,
      openOrders: openOrdersStatus,
      demoQueue: getDemoQueueSnapshot(),
      events: inMemoryEvents.slice(0, 200)
    };
    res.json(snapshot);
  });

  app.get("/entry-autonomy/config", (_req, res) => {
    res.json({
      config: entryAutonomyConfig,
      status: entryAutonomyStatus
    });
  });

  app.post("/entry-autonomy/config", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const nextApprovalModeRaw = typeof req.body?.approvalMode === "string" ? req.body.approvalMode : entryAutonomyConfig.approvalMode;
    const nextApprovalMode: EntryApprovalMode = nextApprovalModeRaw === "policy_auto" ? "policy_auto" : "manual";
    const requestedStrategyVersionBySymbol =
      req.body?.strategyVersionBySymbol && typeof req.body.strategyVersionBySymbol === "object"
        ? Object.fromEntries(
            Object.entries(req.body.strategyVersionBySymbol as Record<string, unknown>)
              .map(([symbol, version]) => [symbol.trim().toUpperCase(), typeof version === "string" ? version.trim() : ""])
              .filter(([symbol, version]) => symbol.length > 0 && version.length > 0)
          )
        : entryAutonomyConfig.strategyVersionBySymbol;
    const next: EntryAutonomyConfig = {
      approvalMode: nextApprovalMode,
      allowedSymbols:
        Array.isArray(req.body?.allowedSymbols) && req.body.allowedSymbols.length > 0
          ? req.body.allowedSymbols.map((item: unknown) => String(item)).filter((item: string) => item.trim().length > 0)
          : entryAutonomyConfig.allowedSymbols,
      maxPerOrderNotionalUsd:
        typeof req.body?.maxPerOrderNotionalUsd === "number" && Number.isFinite(req.body.maxPerOrderNotionalUsd)
          ? Math.max(1, req.body.maxPerOrderNotionalUsd)
          : entryAutonomyConfig.maxPerOrderNotionalUsd,
      maxOpenExposureUsd:
        typeof req.body?.maxOpenExposureUsd === "number" && Number.isFinite(req.body.maxOpenExposureUsd)
          ? Math.max(1, req.body.maxOpenExposureUsd)
          : entryAutonomyConfig.maxOpenExposureUsd,
      maxDailyLossUsd:
        typeof req.body?.maxDailyLossUsd === "number" && Number.isFinite(req.body.maxDailyLossUsd)
          ? Math.max(0.5, req.body.maxDailyLossUsd)
          : entryAutonomyConfig.maxDailyLossUsd,
      maxWeeklyLossUsd:
        typeof req.body?.maxWeeklyLossUsd === "number" && Number.isFinite(req.body.maxWeeklyLossUsd)
          ? Math.max(1, req.body.maxWeeklyLossUsd)
          : entryAutonomyConfig.maxWeeklyLossUsd,
      lossStreakCooldownCount:
        typeof req.body?.lossStreakCooldownCount === "number" && Number.isFinite(req.body.lossStreakCooldownCount)
          ? Math.max(1, Math.floor(req.body.lossStreakCooldownCount))
          : entryAutonomyConfig.lossStreakCooldownCount,
      cooldownMinutes:
        typeof req.body?.cooldownMinutes === "number" && Number.isFinite(req.body.cooldownMinutes)
          ? Math.max(1, Math.floor(req.body.cooldownMinutes))
          : entryAutonomyConfig.cooldownMinutes,
      strategyVersion: strategyPromotionState.activeVersion,
      strategyVersionBySymbol: {
        ...buildDefaultStrategyVersionBySymbol(),
        ...(requestedStrategyVersionBySymbol ?? {})
      },
      policyVersion:
        typeof req.body?.policyVersion === "string" && req.body.policyVersion.trim().length > 0
          ? req.body.policyVersion.trim()
          : entryAutonomyConfig.policyVersion
    };
    entryAutonomyConfig = next;
    entryAutonomyStatus.approvalMode = next.approvalMode;
    if (next.approvalMode === "manual") {
      entryAutonomyStatus.fallbackActive = false;
      entryAutonomyStatus.lastFallbackAt = undefined;
      entryAutonomyStatus.lastFallbackReason = undefined;
    }
    persistEntryAutonomyState();
    await appendAudit(
      "Entry autonomy config updated",
      `approvalMode=${entryAutonomyConfig.approvalMode} allowedSymbols=${entryAutonomyConfig.allowedSymbols.join(",")} maxPerOrder=${entryAutonomyConfig.maxPerOrderNotionalUsd} maxExposure=${entryAutonomyConfig.maxOpenExposureUsd} dailyCap=${entryAutonomyConfig.maxDailyLossUsd} weeklyCap=${entryAutonomyConfig.maxWeeklyLossUsd} cooldownCount=${entryAutonomyConfig.lossStreakCooldownCount} cooldownMin=${entryAutonomyConfig.cooldownMinutes} strategy=${entryAutonomyConfig.strategyVersion} policy=${entryAutonomyConfig.policyVersion}; actor=${typed.userId}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    await publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        `Entry autonomy config updated by ${typed.userId}`,
        "info",
        ["entry_autonomy", `approval_mode:${entryAutonomyConfig.approvalMode}`]
      )
    );
    res.json({
      config: entryAutonomyConfig,
      status: entryAutonomyStatus
    });
  });

  app.get("/strategy/promotion", (_req, res) => {
    res.json({
      state: strategyPromotionState,
      effective: {
        strategyVersion: strategyPromotionState.activeVersion,
        policyVersion: entryAutonomyConfig.policyVersion,
        approvalMode: entryAutonomyConfig.approvalMode
      }
    });
  });

  app.get("/strategy/degradation-config", (_req, res) => {
    res.json({
      config: strategyDegradationConfig
    });
  });

  app.post("/strategy/degradation-config", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    strategyDegradationConfig = {
      enabled:
        typeof req.body?.enabled === "boolean"
          ? req.body.enabled
          : strategyDegradationConfig.enabled,
      maxDailyLossUsd:
        typeof req.body?.maxDailyLossUsd === "number" && Number.isFinite(req.body.maxDailyLossUsd)
          ? Math.max(0.5, req.body.maxDailyLossUsd)
          : strategyDegradationConfig.maxDailyLossUsd,
      maxDrawdownPct:
        typeof req.body?.maxDrawdownPct === "number" && Number.isFinite(req.body.maxDrawdownPct)
          ? req.body.maxDrawdownPct
          : strategyDegradationConfig.maxDrawdownPct,
      maxConsecutiveLosingTrades:
        typeof req.body?.maxConsecutiveLosingTrades === "number" && Number.isFinite(req.body.maxConsecutiveLosingTrades)
          ? Math.max(1, Math.floor(req.body.maxConsecutiveLosingTrades))
          : strategyDegradationConfig.maxConsecutiveLosingTrades
    };
    persistStrategyDegradationConfig();
    await appendAudit(
      "Strategy degradation config updated",
      `enabled=${strategyDegradationConfig.enabled} maxDailyLossUsd=${strategyDegradationConfig.maxDailyLossUsd} maxDrawdownPct=${strategyDegradationConfig.maxDrawdownPct} maxConsecutiveLosingTrades=${strategyDegradationConfig.maxConsecutiveLosingTrades}; actor=${typed.userId}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    res.json({ config: strategyDegradationConfig });
  });

  app.post("/strategy/register", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const version = typeof req.body?.version === "string" ? req.body.version.trim() : "";
    if (!version) {
      writeError(res, 400, {
        ok: false,
        code: "INVALID_INPUT",
        message: "version is required",
        correlationId: typed.correlationId
      });
      return;
    }
    if (findStrategy(version)) {
      writeError(res, 409, {
        ok: false,
        code: "STRATEGY_EXISTS",
        message: `Strategy ${version} already exists`,
        correlationId: typed.correlationId
      });
      return;
    }
    const nowIso = new Date().toISOString();
    upsertStrategyVersion({
      version,
      stage: "research",
      status: "candidate",
      createdAt: nowIso,
      updatedAt: nowIso,
      notes: typeof req.body?.notes === "string" ? req.body.notes : undefined,
      artifacts:
        req.body?.artifacts && typeof req.body.artifacts === "object"
          ? {
              researchReportUrl:
                typeof req.body.artifacts.researchReportUrl === "string" ? req.body.artifacts.researchReportUrl : undefined,
              shadowReportUrl:
                typeof req.body.artifacts.shadowReportUrl === "string" ? req.body.artifacts.shadowReportUrl : undefined,
              canaryReportUrl:
                typeof req.body.artifacts.canaryReportUrl === "string" ? req.body.artifacts.canaryReportUrl : undefined
            }
          : undefined
    });
    if (req.body?.challenger) {
      strategyPromotionState.challengerVersion = version;
    }
    strategyPromotionState.history.unshift({
      at: nowIso,
      action: "register",
      version,
      actor: typed.userId,
      toStage: "research",
      reason: "registered"
    });
    strategyPromotionState.history = strategyPromotionState.history.slice(0, 400);
    persistStrategyPromotionState();
    await appendAudit("Strategy registered", `version=${version}; actor=${typed.userId}`, lifecycle.getSnapshotState().activeSymbol, "System");
    await publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        `Strategy registered version=${version} by ${typed.userId}`,
        "info",
        ["strategy_promotion", "register"]
      )
    );
    res.status(201).json({ state: strategyPromotionState });
  });

  app.post("/strategy/promote", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const version = typeof req.body?.version === "string" ? req.body.version.trim() : "";
    const symbol = typeof req.body?.symbol === "string" ? req.body.symbol.trim().toUpperCase() : undefined;
    const targetStageRaw = typeof req.body?.targetStage === "string" ? req.body.targetStage.trim() : "";
    const targetStage: StrategyPromotionStage | undefined =
      targetStageRaw === "research" || targetStageRaw === "shadow" || targetStageRaw === "paper_canary" || targetStageRaw === "limited_prod"
        ? targetStageRaw
        : undefined;
    if (!version || !targetStage) {
      writeError(res, 400, {
        ok: false,
        code: "INVALID_INPUT",
        message: "version and valid targetStage are required",
        correlationId: typed.correlationId
      });
      return;
    }
    const current = findStrategy(version);
    if (!current) {
      writeError(res, 404, {
        ok: false,
        code: "STRATEGY_NOT_FOUND",
        message: `Strategy ${version} not found`,
        correlationId: typed.correlationId
      });
      return;
    }
    const currentRank = stageRank(current.stage);
    const targetRank = stageRank(targetStage);
    if (targetRank > currentRank + 1) {
      writeError(res, 409, {
        ok: false,
        code: "PROMOTION_ORDER_INVALID",
        message: `Cannot skip promotion stages from ${current.stage} to ${targetStage}`,
        correlationId: typed.correlationId
      });
      return;
    }
    const nowIso = new Date().toISOString();
    const governanceSymbol = resolveStrategyGovernanceSymbol(symbol, version);
    const blockers = await evaluatePromotionGates(targetStage, nowIso);
    if (blockers.length > 0) {
      writeError(res, 409, {
        ok: false,
        code: "PROMOTION_GATES_FAILED",
        message: "Promotion gates failed",
        correlationId: typed.correlationId,
        details: {
          blockerCount: blockers.length
        }
      });
      return;
    }
    const promoted: StrategyVersionRecord = {
      ...current,
      stage: targetStage,
      status: targetStage === "limited_prod" ? "active" : "candidate",
      updatedAt: nowIso,
      artifacts:
        req.body?.artifacts && typeof req.body.artifacts === "object"
          ? {
              researchReportUrl:
                typeof req.body.artifacts.researchReportUrl === "string"
                  ? req.body.artifacts.researchReportUrl
                  : current.artifacts?.researchReportUrl,
              shadowReportUrl:
                typeof req.body.artifacts.shadowReportUrl === "string"
                  ? req.body.artifacts.shadowReportUrl
                  : current.artifacts?.shadowReportUrl,
              canaryReportUrl:
                typeof req.body.artifacts.canaryReportUrl === "string"
                  ? req.body.artifacts.canaryReportUrl
                  : current.artifacts?.canaryReportUrl
            }
          : current.artifacts
    };
    upsertStrategyVersion(promoted);
    if (targetStage === "limited_prod") {
      strategyPromotionState.previousStableVersion = strategyPromotionState.activeVersion;
      if (governanceSymbol) {
        strategyPromotionState.previousStableVersionBySymbol = {
          ...(strategyPromotionState.previousStableVersionBySymbol ?? {}),
          [governanceSymbol]: resolveStrategyVersionForSymbol(governanceSymbol)
        };
      }
      setActiveStrategyVersion(version, governanceSymbol);
      strategyPromotionState.championVersion = version;
      if (governanceSymbol) {
        strategyPromotionState.championVersionBySymbol = {
          ...(strategyPromotionState.championVersionBySymbol ?? {}),
          [governanceSymbol]: version
        };
      }
    } else if (targetStage === "paper_canary") {
      strategyPromotionState.challengerVersion = version;
      if (governanceSymbol) {
        strategyPromotionState.challengerVersionBySymbol = {
          ...(strategyPromotionState.challengerVersionBySymbol ?? {}),
          [governanceSymbol]: version
        };
      }
    }
    strategyPromotionState.history.unshift({
      at: nowIso,
      action: "promote",
      version,
      actor: typed.userId,
      fromStage: current.stage,
      toStage: targetStage,
      reason: typeof req.body?.reason === "string" ? req.body.reason : undefined
    });
    strategyPromotionState.history = strategyPromotionState.history.slice(0, 400);
    persistStrategyPromotionState();
    await appendAudit(
      "Strategy promoted",
      `version=${version} from=${current.stage} to=${targetStage}; actor=${typed.userId}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    await publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        `Strategy promoted version=${version} from=${current.stage} to=${targetStage} by ${typed.userId}`,
        "info",
        ["strategy_promotion", "promote", `stage:${targetStage}`]
      )
    );
    res.json({ state: strategyPromotionState });
  });

  app.post("/strategy/rollback", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const reason = typeof req.body?.reason === "string" && req.body.reason.trim().length > 0 ? req.body.reason.trim() : "manual rollback";
    const rollbackSymbol =
      typeof req.body?.symbol === "string" && req.body.symbol.trim().length > 0
        ? req.body.symbol.trim().toUpperCase()
        : lifecycle.getSnapshotState().activeSymbol;
    const rolled = await rollbackStrategyOnDegradation(
      reason,
      typed.userId,
      rollbackSymbol,
      true
    );
    if (!rolled) {
      writeError(res, 409, {
        ok: false,
        code: "ROLLBACK_NOT_AVAILABLE",
        message: "No previous stable strategy available for rollback",
        correlationId: typed.correlationId
      });
      return;
    }
    res.json({ state: strategyPromotionState });
  });

  app.get("/auto-exit/config", (_req, res) => {
    res.json({
      config: autoExitConfig
    });
  });

  app.get("/auto-exit/decision-trace", (req, res) => {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(10_000, Math.floor(rawLimit))) : 200;
    const tradeId = typeof req.query.tradeId === "string" ? req.query.tradeId.trim() : "";
    const items = tradeId
      ? autoExitDecisionTrace.filter((item) => item.tradeId === tradeId).slice(0, limit)
      : autoExitDecisionTrace.slice(0, limit);
    res.json({
      items,
      total: autoExitDecisionTrace.length,
      max: autoExitDecisionTraceMax
    });
  });

  app.post("/auto-exit/config", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const next: AutoExitConfig = {
      enabled:
        typeof req.body?.enabled === "boolean"
          ? req.body.enabled
          : autoExitConfig.enabled,
      maxHoldSec:
        typeof req.body?.maxHoldSec === "number" && Number.isFinite(req.body.maxHoldSec)
          ? Math.max(30, Math.floor(req.body.maxHoldSec))
          : autoExitConfig.maxHoldSec,
      takeProfitRMultiple:
        typeof req.body?.takeProfitRMultiple === "number" && Number.isFinite(req.body.takeProfitRMultiple)
          ? Math.max(0.25, req.body.takeProfitRMultiple)
          : autoExitConfig.takeProfitRMultiple,
      flattenTimeUtc:
        typeof req.body?.flattenTimeUtc === "string"
          ? parseFlattenTimeUtc(req.body.flattenTimeUtc)
          : autoExitConfig.flattenTimeUtc,
      exitOffsetBps:
        typeof req.body?.exitOffsetBps === "number" && Number.isFinite(req.body.exitOffsetBps)
          ? Math.max(0, req.body.exitOffsetBps)
          : autoExitConfig.exitOffsetBps
    };
    autoExitConfig = next;
    opsStore.saveRuntimeState("auto_exit_config", autoExitConfig);
    await appendAudit(
      "Auto-exit config updated",
      `enabled=${autoExitConfig.enabled} maxHoldSec=${autoExitConfig.maxHoldSec} tpR=${autoExitConfig.takeProfitRMultiple} flatten=${autoExitConfig.flattenTimeUtc ?? "off"} offsetBps=${autoExitConfig.exitOffsetBps}; actor=${typed.userId}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    await publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        `Auto-exit config updated by ${typed.userId}`,
        "info",
        ["auto_exit_config"]
      )
    );
    res.json({ config: autoExitConfig });
  });

  app.get("/managed-trades", (_req, res) => {
    const items = [...managedTrades.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json({ items });
  });

  app.get("/learning/features", (req, res) => {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(1000, Math.floor(rawLimit))) : 200;
    const payload: LearningFeatureSnapshot = {
      governance: learningGovernanceState,
      items: opsStore.listClosedTradeFeatures(limit)
    };
    res.json(payload);
  });

  app.get("/learning/governance", (_req, res) => {
    res.json({ governance: learningGovernanceState });
  });

  app.post("/learning/governance/promote", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const requestedVersion = typeof req.body?.targetVersion === "string" ? req.body.targetVersion.trim() : "";
    if (!requestedVersion) {
      writeError(res, 400, {
        ok: false,
        code: "INVALID_LEARNING_PROMOTION_REQUEST",
        message: "targetVersion is required",
        correlationId: typed.correlationId
      });
      return;
    }
    const validationReportRef =
      typeof req.body?.validationReportRef === "string" ? req.body.validationReportRef.trim() : "";
    const approvalRecordRef = typeof req.body?.approvalRecordRef === "string" ? req.body.approvalRecordRef.trim() : "";
    const gateResultRef = typeof req.body?.gateResultRef === "string" ? req.body.gateResultRef.trim() : "";
    const blockers: string[] = [];
    if (!validationReportRef) {
      blockers.push("validationReportRef is required.");
    }
    if (!approvalRecordRef) {
      blockers.push("approvalRecordRef is required.");
    }
    if (!gateResultRef) {
      blockers.push("gateResultRef is required.");
    }
    if (blockers.length > 0) {
      writeError(res, 409, {
        ok: false,
        code: "LEARNING_PROMOTION_GATES_FAILED",
        message: "Learning promotion blocked: missing governed evidence references.",
        correlationId: typed.correlationId,
        details: { blockers: blockers.join(" | ") }
      });
      return;
    }
    if (requestedVersion === learningGovernanceState.activeModelVersion) {
      res.json({ governance: learningGovernanceState, changed: false });
      return;
    }
    const reason =
      typeof req.body?.reason === "string" && req.body.reason.trim().length > 0
        ? req.body.reason.trim()
        : "manual learning promotion";
    const previousActive = learningGovernanceState.activeModelVersion;
    learningGovernanceState.previousStableModelVersion = previousActive;
    learningGovernanceState.activeModelVersion = requestedVersion;
    learningGovernanceState.mode = "shadow_eval";
    learningGovernanceState.rollbackCandidateVersion = undefined;
    const nowIso = new Date().toISOString();
    persistLearningGovernanceState(nowIso);
    await appendAudit(
      "Learning model promoted",
      `from=${previousActive} to=${requestedVersion}; reason=${reason}; actor=${typed.userId}; validation=${validationReportRef}; approval=${approvalRecordRef}; gate=${gateResultRef}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    await publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        `Learning model promoted from ${previousActive} to ${requestedVersion} by ${typed.userId}`,
        "info",
        ["learning_governance", "promote", "m7"]
      )
    );
    res.json({ governance: learningGovernanceState, changed: true });
  });

  app.get("/learning/evaluation", (req, res) => {
    const rawLookback = Number(req.query.lookbackDays);
    const rawLimit = Number(req.query.limit);
    const lookbackDays = Number.isFinite(rawLookback) ? Math.max(1, Math.min(365, Math.floor(rawLookback))) : 30;
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(10_000, Math.floor(rawLimit))) : 2_000;
    const summary = buildLearningEvaluationSummary(new Date().toISOString(), lookbackDays, limit);
    res.json(summary);
  });

  app.get("/learning/evaluation-trend", (req, res) => {
    const rawLookback = Number(req.query.lookbackDays);
    const rawBucketDays = Number(req.query.bucketDays);
    const rawLimit = Number(req.query.limit);
    const lookbackDays = Number.isFinite(rawLookback) ? Math.max(1, Math.min(365, Math.floor(rawLookback))) : 30;
    const bucketDays = Number.isFinite(rawBucketDays) ? Math.max(1, Math.min(30, Math.floor(rawBucketDays))) : 1;
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(10_000, Math.floor(rawLimit))) : 2_000;
    const summary = buildLearningEvaluationTrendSummary(
      new Date().toISOString(),
      lookbackDays,
      bucketDays,
      limit,
      learningAlertThresholds
    );
    res.json(summary);
  });

  app.get("/learning/alert-config", (_req, res) => {
    res.json({ config: learningAlertThresholds });
  });

  app.post("/learning/alert-config", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    learningAlertThresholds = {
      enabled:
        typeof req.body?.enabled === "boolean"
          ? req.body.enabled
          : learningAlertThresholds.enabled,
      lookbackDays:
        typeof req.body?.lookbackDays === "number" && Number.isFinite(req.body.lookbackDays)
          ? Math.max(1, Math.min(365, Math.floor(req.body.lookbackDays)))
          : learningAlertThresholds.lookbackDays,
      limit:
        typeof req.body?.limit === "number" && Number.isFinite(req.body.limit)
          ? Math.max(1, Math.min(10_000, Math.floor(req.body.limit)))
          : learningAlertThresholds.limit,
      minTrades:
        typeof req.body?.minTrades === "number" && Number.isFinite(req.body.minTrades)
          ? Math.max(1, Math.min(10_000, Math.floor(req.body.minTrades)))
          : learningAlertThresholds.minTrades,
      expectancyMinUsd:
        typeof req.body?.expectancyMinUsd === "number" && Number.isFinite(req.body.expectancyMinUsd)
          ? Math.max(-1_000, Math.min(1_000, req.body.expectancyMinUsd))
          : learningAlertThresholds.expectancyMinUsd,
      maxDrawdownPct:
        typeof req.body?.maxDrawdownPct === "number" && Number.isFinite(req.body.maxDrawdownPct)
          ? Math.max(0, Math.min(100, req.body.maxDrawdownPct))
          : learningAlertThresholds.maxDrawdownPct,
      maxSlippageBps:
        typeof req.body?.maxSlippageBps === "number" && Number.isFinite(req.body.maxSlippageBps)
          ? Math.max(0, Math.min(10_000, req.body.maxSlippageBps))
          : learningAlertThresholds.maxSlippageBps,
      maxControlViolationRatePct:
        typeof req.body?.maxControlViolationRatePct === "number" && Number.isFinite(req.body.maxControlViolationRatePct)
          ? Math.max(0, Math.min(100, req.body.maxControlViolationRatePct))
          : learningAlertThresholds.maxControlViolationRatePct
    };
    persistLearningAlertThresholds();
    await appendAudit(
      "Learning alert config updated",
      `enabled=${learningAlertThresholds.enabled} lookbackDays=${learningAlertThresholds.lookbackDays} limit=${learningAlertThresholds.limit} minTrades=${learningAlertThresholds.minTrades} expectancyMinUsd=${learningAlertThresholds.expectancyMinUsd} maxDrawdownPct=${learningAlertThresholds.maxDrawdownPct} maxSlippageBps=${learningAlertThresholds.maxSlippageBps} maxControlViolationRatePct=${learningAlertThresholds.maxControlViolationRatePct}; actor=${typed.userId}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    await evaluateLearningAlertThresholds(new Date().toISOString());
    res.json({ config: learningAlertThresholds });
  });

  app.get("/learning/retention-config", (_req, res) => {
    res.json(buildLearningRetentionStatus());
  });

  app.post("/learning/retention-config", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const nextDays =
      typeof req.body?.closedTradeFeatureRetentionDays === "number" && Number.isFinite(req.body.closedTradeFeatureRetentionDays)
        ? Math.max(1, Math.min(3650, Math.floor(req.body.closedTradeFeatureRetentionDays)))
        : learningRetentionConfig.closedTradeFeatureRetentionDays;
    learningRetentionConfig = {
      closedTradeFeatureRetentionDays: nextDays
    };
    opsTradeRetentionMs = learningRetentionConfig.closedTradeFeatureRetentionDays * 24 * 60 * 60_000;
    persistLearningRetentionConfig();
    await appendAudit(
      "Learning retention config updated",
      `closedTradeFeatureRetentionDays=${learningRetentionConfig.closedTradeFeatureRetentionDays}; actor=${typed.userId}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    res.json(buildLearningRetentionStatus());
  });

  app.post("/learning/retention/prune", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    await pruneRetentionData();
    await appendAudit(
      "Learning retention prune applied",
      `closedTradeFeaturesDeleted=${learningRetentionLastPruneResult?.closedTradeFeaturesDeleted ?? 0}; actor=${typed.userId}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    res.json(buildLearningRetentionStatus());
  });

  app.post("/learning/governance/rollback", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const reason =
      typeof req.body?.reason === "string" && req.body.reason.trim().length > 0
        ? req.body.reason.trim()
        : "manual learning rollback";
    const requestedVersion = typeof req.body?.targetVersion === "string" ? req.body.targetVersion.trim() : "";
    const targetVersion = requestedVersion.length > 0 ? requestedVersion : learningGovernanceState.previousStableModelVersion;
    if (!targetVersion) {
      writeError(res, 409, {
        ok: false,
        code: "ROLLBACK_NOT_AVAILABLE",
        message: "No previous stable model version available for rollback",
        correlationId: typed.correlationId
      });
      return;
    }
    if (targetVersion === learningGovernanceState.activeModelVersion) {
      res.json({ governance: learningGovernanceState, changed: false });
      return;
    }
    const previousActive = learningGovernanceState.activeModelVersion;
    learningGovernanceState.rollbackCandidateVersion = previousActive;
    learningGovernanceState.activeModelVersion = targetVersion;
    learningGovernanceState.lastRollbackAt = new Date().toISOString();
    learningGovernanceState.lastRollbackReason = reason;
    persistLearningGovernanceState(learningGovernanceState.lastRollbackAt);
    await appendAudit(
      "Learning model rollback",
      `from=${previousActive} to=${targetVersion}; reason=${reason}; actor=${typed.userId}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    await publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        `Learning model rollback from ${previousActive} to ${targetVersion} by ${typed.userId}`,
        "warn",
        ["learning_governance", "rollback", "m7"]
      )
    );
    res.json({ governance: learningGovernanceState, changed: true });
  });

  app.get("/milestone5/evidence", async (_req, res) => {
    const summary = await buildMilestone5EvidenceSummary(new Date().toISOString());
    res.json(summary);
  });

  app.get("/rollout/status", async (_req, res) => {
    const summary = await buildRolloutStatusSummary(new Date().toISOString());
    res.json(summary);
  });

  app.get("/metrics", (_req, res) => {
    res.json(metrics);
  });

  app.post("/reconciliation", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }

    const body = req.body as Partial<ReconciliationStatus> | undefined;
    const allowed = new Set(["ok", "drift", "error", "in_progress"]);
    const invalid =
      (body?.positions && !allowed.has(body.positions)) ||
      (body?.pnl && !allowed.has(body.pnl)) ||
      (body?.orders && !allowed.has(body.orders));
    if (invalid) {
      writeError(res, 400, {
        ok: false,
        code: "INVALID_RECONCILIATION_STATUS",
        message: "Invalid reconciliation status payload",
        correlationId: typed.correlationId
      });
      return;
    }

    lifecycle.updateReconciliation({
      positions: body?.positions,
      pnl: body?.pnl,
      orders: body?.orders,
      lastRunAt: new Date().toISOString()
    });
    opsStore.saveReconciliation(lifecycle.reconciliation);
    metrics.reconcileRunsTotal += 1;
    if (hasReconciliationDrift(lifecycle.reconciliation)) {
      driftConsecutive += 1;
      if (!driftFirstSeenAtEpoch) {
        driftFirstSeenAtEpoch = Date.now();
      }
    } else {
      driftConsecutive = 0;
      driftFirstSeenAtEpoch = undefined;
    }

    const symbol = lifecycle.getSnapshotState().activeSymbol;
    await publish(
      createEvent(
        "ReconciliationComplete",
        symbol,
        `Reconciliation updated: positions=${lifecycle.reconciliation.positions} pnl=${lifecycle.reconciliation.pnl} orders=${lifecycle.reconciliation.orders}`,
        hasReconciliationDrift(lifecycle.reconciliation) ? "warn" : "info",
        [hasReconciliationDrift(lifecycle.reconciliation) ? "reconciliation_drift" : "reconciliation_ok"],
        typed.correlationId
      )
    );
    await appendAudit(
      "Reconciliation updated",
      `positions=${lifecycle.reconciliation.positions} pnl=${lifecycle.reconciliation.pnl} orders=${lifecycle.reconciliation.orders} actor=${typed.userId}`,
      symbol,
      "ReconciliationComplete"
    );

    await enforceDriftCircuitBreaker(typed.userId);
    res.json({ ok: true, reconciliation: lifecycle.reconciliation });
  });

  app.get("/alerts", async (req, res) => {
    const statusRaw = String(req.query.status ?? "");
    const status =
      statusRaw === "open" || statusRaw === "acknowledged" || statusRaw === "resolved"
        ? statusRaw
        : undefined;
    const items = await alertStore.list(status);
    inMemoryAlerts = items;
    res.json({ items });
  });

  app.post("/alerts/:id/ack", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const item = await alertStore.updateStatus(req.params.id, "acknowledged", typed.userId);
    if (!item) {
      writeError(res, 404, {
        ok: false,
        code: "ALERT_NOT_FOUND",
        message: `Alert ${req.params.id} not found`,
        correlationId: typed.correlationId
      });
      return;
    }
    inMemoryAlerts = await alertStore.readAll();
    metrics.openAlerts = inMemoryAlerts.filter((entry) => entry.status === "open").length;
    res.json(item);
  });

  app.post("/alerts/:id/resolve", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const item = await alertStore.updateStatus(req.params.id, "resolved", typed.userId);
    if (!item) {
      writeError(res, 404, {
        ok: false,
        code: "ALERT_NOT_FOUND",
        message: `Alert ${req.params.id} not found`,
        correlationId: typed.correlationId
      });
      return;
    }
    inMemoryAlerts = await alertStore.readAll();
    metrics.openAlerts = inMemoryAlerts.filter((entry) => entry.status === "open").length;
    res.json(item);
  });

  app.post("/maintenance/clear-streams", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const cleared = await clearStreamsAndLogs();
    res.json({
      ok: true,
      code: "OK",
      message: "Event streams and logs cleared",
      state: lifecycle.getSnapshotState().state,
      details: {
        eventsDeleted: cleared.eventsDeleted,
        auditDeleted: cleared.auditDeleted,
        incidentsDeleted: cleared.incidentsDeleted,
        logsCleared: cleared.logsCleared
      }
    } satisfies ControlActionResponse);
  });

  app.get("/incidents", async (req, res) => {
    const statusRaw = String(req.query.status ?? "");
    const status =
      statusRaw === "open" || statusRaw === "acknowledged" || statusRaw === "resolved"
        ? statusRaw
        : undefined;
    const items = opsStore.listIncidents(status);
    inMemoryIncidents = items;
    metrics.openIncidents = opsStore.listIncidents().filter((entry) => entry.status !== "resolved").length;
    res.json({ items });
  });

  app.post("/incidents/:id/ack", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const item = opsStore.updateIncidentStatus(req.params.id, "acknowledged", typed.userId);
    if (!item) {
      writeError(res, 404, {
        ok: false,
        code: "INCIDENT_NOT_FOUND",
        message: `Incident ${req.params.id} not found`,
        correlationId: typed.correlationId
      });
      return;
    }
    inMemoryIncidents = opsStore.listIncidents();
    metrics.openIncidents = inMemoryIncidents.filter((entry) => entry.status !== "resolved").length;
    await appendAudit(
      "Incident acknowledged",
      `Incident ${item.id} acknowledged by ${typed.userId}; runbook=${item.runbookRef}`,
      item.symbol ?? lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    res.json(item);
  });

  app.post("/incidents/:id/resolve", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const item = opsStore.updateIncidentStatus(req.params.id, "resolved", typed.userId);
    if (!item) {
      writeError(res, 404, {
        ok: false,
        code: "INCIDENT_NOT_FOUND",
        message: `Incident ${req.params.id} not found`,
        correlationId: typed.correlationId
      });
      return;
    }
    inMemoryIncidents = opsStore.listIncidents();
    metrics.openIncidents = inMemoryIncidents.filter((entry) => entry.status !== "resolved").length;
    await appendAudit(
      "Incident resolved",
      `Incident ${item.id} resolved by ${typed.userId}; runbook=${item.runbookRef}`,
      item.symbol ?? lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    res.json(item);
  });

  app.get("/incidents/export", async (_req, res) => {
    const items = opsStore.listIncidents();
    const body = {
      exportedAt: new Date().toISOString(),
      count: items.length,
      items
    };
    res.json(body);
  });

  app.get("/learning/incidents/export", (req, res) => {
    const statusRaw = String(req.query.status ?? "");
    const status =
      statusRaw === "open" || statusRaw === "acknowledged" || statusRaw === "resolved"
        ? statusRaw
        : undefined;
    const rawLookback = Number(req.query.lookbackDays);
    const lookbackDays = Number.isFinite(rawLookback) ? Math.max(1, Math.min(365, Math.floor(rawLookback))) : 30;
    const nowIso = new Date().toISOString();
    const cutoffEpoch = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

    const learningItems = opsStore
      .listIncidents(status)
      .filter(
        (item) =>
          item.sourceAlertCode?.startsWith("LEARNING_") &&
          Number.isFinite(Date.parse(item.createdAt)) &&
          Date.parse(item.createdAt) >= cutoffEpoch
      );

    const byCode = new Map<string, number>();
    const bySeverity = new Map<string, number>();
    const byStatus = new Map<string, number>();
    for (const item of learningItems) {
      const code = item.sourceAlertCode || "LEARNING_UNKNOWN";
      byCode.set(code, (byCode.get(code) ?? 0) + 1);
      bySeverity.set(item.severity, (bySeverity.get(item.severity) ?? 0) + 1);
      byStatus.set(item.status, (byStatus.get(item.status) ?? 0) + 1);
    }

    const evaluation = buildLearningEvaluationSummary(
      nowIso,
      lookbackDays,
      Math.max(1, Math.min(10_000, Math.floor(learningAlertThresholds.limit)))
    );

    res.json({
      exportedAt: nowIso,
      lookbackDays,
      status: status ?? "all",
      count: learningItems.length,
      openCount: learningItems.filter((item) => item.status === "open").length,
      acknowledgedCount: learningItems.filter((item) => item.status === "acknowledged").length,
      resolvedCount: learningItems.filter((item) => item.status === "resolved").length,
      totals: {
        byCode: [...byCode.entries()]
          .map(([code, count]) => ({ code, count }))
          .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
        bySeverity: [...bySeverity.entries()]
          .map(([severity, count]) => ({ severity, count }))
          .sort((a, b) => b.count - a.count || a.severity.localeCompare(b.severity)),
        byStatus: [...byStatus.entries()]
          .map(([statusValue, count]) => ({ status: statusValue, count }))
          .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status))
      },
      alertConfig: learningAlertThresholds,
      evaluation,
      items: learningItems
    });
  });

  app.get("/events", async (req, res) => {
    const query = parseEventQuery(req);
    const events = await eventStore.query(query);
    res.json({ items: events, nextCursor: events.at(-1)?.id ?? null });
  });

  app.get("/approvals", async (req, res) => {
    await sweepExpiredApprovals();
    const statusRaw = String(req.query.status ?? "");
    const status =
      statusRaw === "pending" || statusRaw === "approved" || statusRaw === "rejected" || statusRaw === "expired"
        ? statusRaw
        : undefined;
    const items = approvals.list(status);
    res.json({ items });
  });

  app.post("/approvals", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    const action = req.body?.action as ControlAction | undefined;
    const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;

    if (!action) {
      writeError(res, 400, {
        ok: false,
        code: "INVALID_APPROVAL_ACTION",
        message: "Approval action is required",
        correlationId: typed.correlationId
      });
      return;
    }

    if (!approvals.isApprovalRequired(action)) {
      writeError(res, 400, {
        ok: false,
        code: "APPROVAL_NOT_REQUIRED",
        message: `Action ${action} does not require approval`,
        correlationId: typed.correlationId
      });
      return;
    }

    const request = approvals.create({
      action,
      requestedBy: typed.userId,
      reason
    });
    const symbol = lifecycle.getSnapshotState().activeSymbol;
    await appendAudit(
      "Approval created",
      `Approval ${request.id} created for ${action} by ${typed.userId}`,
      symbol,
      "System"
    );

    await publish(
      createEvent(
        "System",
        symbol,
        `Approval requested for ${action} (${request.id}) actor=${typed.userId}`,
        "warn",
        ["approval_created"],
        typed.correlationId
      )
    );

    res.status(201).json(request satisfies ApprovalRequest);
  });

  app.post("/approvals/:id/approve", async (req, res) => {
    await sweepExpiredApprovals();
    const typed = req as unknown as AuthenticatedRequest;
    const approvalId = req.params.id;
    const actor = String(req.header("x-actor-id") ?? typed.userId);
    const request = approvals.approve(approvalId, actor);
    if (!request) {
      writeError(res, 404, {
        ok: false,
        code: "APPROVAL_NOT_FOUND",
        message: `Approval ${approvalId} not found`,
        correlationId: typed.correlationId
      });
      return;
    }

    await publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        `Approval ${request.id} updated by ${actor}: ${request.approvalCount}/${request.requiredApprovals}`,
        request.status === "approved" ? "info" : "warn",
        [request.status === "approved" ? "approval_approved" : "approval_progress"],
        typed.correlationId
      )
    );
    await appendAudit(
      request.status === "approved" ? "Approval approved" : "Approval updated",
      `Approval ${request.id} action=${request.action} actor=${actor} ${request.approvalCount}/${request.requiredApprovals}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );

    res.json(request);
  });

  app.post("/approvals/:id/reject", async (req, res) => {
    await sweepExpiredApprovals();
    const typed = req as unknown as AuthenticatedRequest;
    const approvalId = req.params.id;
    const actor = typed.userId;
    const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
    const request = approvals.reject(approvalId, actor, reason);
    if (!request) {
      writeError(res, 404, {
        ok: false,
        code: "APPROVAL_NOT_FOUND",
        message: `Approval ${approvalId} not found`,
        correlationId: typed.correlationId
      });
      return;
    }
    if (request.action === "demo_order_submit") {
      pendingDemoOrders.delete(request.id);
    }

    await publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        `Approval ${request.id} rejected by ${actor}`,
        "warn",
        ["approval_rejected"],
        typed.correlationId
      )
    );
    await appendAudit(
      "Approval rejected",
      `Approval ${request.id} action=${request.action} rejected by ${actor}${reason ? ` reason=${reason}` : ""}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    res.json(request);
  });

  app.post("/demo-order-submit", controlRateLimiter, async (req, res) => {
    await sweepExpiredApprovals();
    const typed = req as unknown as AuthenticatedRequest;
    metrics.controlRequestsTotal += 1;

    if (!canRoleExecuteAction(typed.role as UserRole, "demo_order_submit")) {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      metrics.controlFailuresTotal += 1;
      return;
    }

    const approvalId = req.header("x-approval-id") ?? undefined;
    const approvalCheck = approvals.isActionApproved("demo_order_submit", approvalId);
    if (!approvalCheck.ok) {
      if (approvalCheck.request?.status === "expired") {
        writeError(res, 409, {
          ok: false,
          code: "APPROVAL_EXPIRED",
          message: "Approval expired for action demo_order_submit",
          correlationId: typed.correlationId,
          details: { approvalId: approvalCheck.request.id }
        });
        metrics.controlFailuresTotal += 1;
        return;
      }
      if (approvalCheck.request?.status === "rejected") {
        writeError(res, 409, {
          ok: false,
          code: "APPROVAL_REJECTED",
          message: "Approval rejected for action demo_order_submit",
          correlationId: typed.correlationId,
          details: { approvalId: approvalCheck.request.id }
        });
        metrics.controlFailuresTotal += 1;
        return;
      }
      writeError(res, 409, {
        ok: false,
        code: "APPROVAL_REQUIRED",
        message: "Approval required for action demo_order_submit",
        correlationId: typed.correlationId
      });
      metrics.controlFailuresTotal += 1;
      return;
    }

    const approvedId = approvalCheck.request?.id;
    const queued = approvedId ? pendingDemoOrders.get(approvedId) : undefined;
    if (!approvedId || !queued) {
      writeError(res, 409, {
        ok: false,
        code: "DEMO_ORDER_NOT_QUEUED",
        message: "No queued demo execution intent found for this approval id.",
        correlationId: typed.correlationId,
        details: approvedId ? { approvalId: approvedId } : undefined
      });
      metrics.controlFailuresTotal += 1;
      return;
    }

    try {
      const submitted = await executeQueuedDemoOrder({
        approvedId,
        queued,
        actor: typed.userId,
        correlationId: typed.correlationId
      });
      res.json({
        ok: true,
        code: "OK",
        message: `Demo order submitted (${submitted.ordId})`,
        state: lifecycle.getSnapshotState().state,
        details: {
          approvalId: approvedId,
          ordId: submitted.ordId
        }
      } satisfies ControlActionResponse);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // Prevent queue starvation when submit fails (e.g. auth/network errors).
      pendingDemoOrders.delete(approvedId);
      await upsertAlert({
        code: "DEMO_ORDER_SUBMIT_FAILED",
        severity: "error",
        source: "exchange",
        title: "Demo order submit failed",
        detail: message,
        symbol: queued.symbol
      });
      await publish(
        createEvent(
          "Error",
          queued.symbol,
          `Demo order submit failed approval=${approvedId} error=${message}`,
          "error",
          ["demo_execution", "okx_error"],
          typed.correlationId
        )
      );
      writeError(res, 502, {
        ok: false,
        code: "DEMO_ORDER_SUBMIT_FAILED",
        message,
        correlationId: typed.correlationId,
        details: { approvalId: approvedId }
      });
      metrics.controlFailuresTotal += 1;
    }
  });

  app.post(["/start", "/pause", "/resume", "/stop", "/cancel-all", "/emergency-stop"], controlRateLimiter, async (req, res) => {
    await sweepExpiredApprovals();
    const typed = req as unknown as AuthenticatedRequest;
    metrics.controlRequestsTotal += 1;
    const action = controlActionFromPath(req.path);
    if (!action) {
      writeError(res, 400, {
        ok: false,
        code: "INVALID_ACTION",
        message: `Unknown control action path: ${req.path}`,
        correlationId: typed.correlationId
      });
      metrics.controlFailuresTotal += 1;
      return;
    }

    if (!canRoleExecuteAction(typed.role as UserRole, action)) {
      await upsertAlert({
        code: "UNAUTHORIZED_CONTROL_ATTEMPT",
        severity: "warn",
        source: "control",
        title: "Unauthorized control attempt",
        detail: `Role ${typed.role} attempted ${action}`,
        symbol: lifecycle.getSnapshotState().activeSymbol
      });
      await publish(
        createEvent(
          "ControlCommandRejected",
          lifecycle.getSnapshotState().activeSymbol,
          `Role ${typed.role} is not allowed to run ${action}`,
          "warn",
          ["unauthorized"],
          typed.correlationId
        )
      );
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      metrics.controlFailuresTotal += 1;
      return;
    }

    const approvalId = req.header("x-approval-id") ?? undefined;
    const approvalCheck = approvals.isActionApproved(action, approvalId);
    if (!approvalCheck.ok) {
      if (approvalCheck.request?.status === "expired") {
        await upsertAlert({
          code: "APPROVAL_EXPIRED",
          severity: "warn",
          source: "control",
          title: "Approval expired",
          detail: `Approval ${approvalCheck.request.id} expired for ${action}`,
          symbol: lifecycle.getSnapshotState().activeSymbol
        });
        await appendAudit(
          "Approval expired",
          `Approval ${approvalCheck.request.id} expired for ${action}; requester=${approvalCheck.request.requestedBy}`,
          lifecycle.getSnapshotState().activeSymbol,
          "System"
        );
        writeError(res, 409, {
          ok: false,
          code: "APPROVAL_EXPIRED",
          message: `Approval expired for action ${action}`,
          correlationId: typed.correlationId,
          details: {
            approvalId: approvalCheck.request.id
          }
        });
        metrics.controlFailuresTotal += 1;
        return;
      }

      if (approvalCheck.request?.status === "rejected") {
        await upsertAlert({
          code: "APPROVAL_REJECTED",
          severity: "warn",
          source: "control",
          title: "Approval rejected",
          detail: `Rejected approval ${approvalCheck.request.id} blocked ${action}`,
          symbol: lifecycle.getSnapshotState().activeSymbol
        });
        await appendAudit(
          "Approval rejected",
          `Rejected approval ${approvalCheck.request.id} blocked ${action}; rejectedBy=${approvalCheck.request.rejectedBy ?? "unknown"}`,
          lifecycle.getSnapshotState().activeSymbol,
          "System"
        );
        writeError(res, 409, {
          ok: false,
          code: "APPROVAL_REJECTED",
          message: `Approval rejected for action ${action}`,
          correlationId: typed.correlationId,
          details: {
            approvalId: approvalCheck.request.id,
            rejectedBy: approvalCheck.request.rejectedBy ?? "unknown"
          }
        });
        metrics.controlFailuresTotal += 1;
        return;
      }

      const request =
        approvalCheck.request ??
        approvals.create({
          action,
          requestedBy: typed.userId
        });
      if (!approvalCheck.request) {
        await appendAudit(
          "Approval created",
          `Approval ${request.id} created for ${action} by ${typed.userId}`,
          lifecycle.getSnapshotState().activeSymbol,
          "System"
        );
      }
      await publish(
        createEvent(
          "ControlCommandRejected",
          lifecycle.getSnapshotState().activeSymbol,
          `Approval required before ${action} (${request.id}) actor=${typed.userId}`,
          "warn",
          ["approval_created"],
          typed.correlationId
        )
      );
      writeError(res, 409, {
        ok: false,
        code: "APPROVAL_REQUIRED",
        message: `Approval required for action ${action}`,
        correlationId: typed.correlationId,
        details: {
          approvalId: request.id,
          requiredApprovals: request.requiredApprovals,
          approvalCount: request.approvalCount
        }
      });
      metrics.controlFailuresTotal += 1;
      return;
    }

    const result = lifecycle.applyAction(action);
    let canceledOrders = 0;
    if (result.ok) {
      opsStore.saveBotState(result.state);
    }
    if (result.ok) {
      if (action === "start" || action === "resume") {
        worker.start();
      } else if (action === "pause") {
        worker.pause();
      } else if (action === "stop" || action === "emergency_stop") {
        worker.stop();
        await fallbackApprovalModeToManual(`control action ${action} activated`, lifecycle.getSnapshotState().activeSymbol, "critical");
      }
    }
    if (result.ok && action === "cancel_all") {
      try {
        canceledOrders = await cancelAllOpenDemoOrders(typed.userId, typed.correlationId);
        await appendAudit(
          "Cancel-all executed",
          `Cancel-all executed by ${typed.userId}; canceledOrders=${canceledOrders}`,
          lifecycle.getSnapshotState().activeSymbol,
          "OrderCancelled"
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        await upsertAlert({
          code: "CANCEL_ALL_FAILED",
          severity: "error",
          source: "exchange",
          title: "Cancel-all failed",
          detail: message,
          symbol: lifecycle.getSnapshotState().activeSymbol
        });
        metrics.controlFailuresTotal += 1;
      }
    }
    const controlEvents = lifecycle.createControlEvents(action, result.ok, typed.correlationId);
    for (const event of controlEvents) {
      await publish(event);
    }
    if (!result.ok) {
      await upsertAlert({
        code: "INVALID_STATE_TRANSITION",
        severity: "warn",
        source: "control",
        title: "Invalid control transition",
        detail: `Action ${action} rejected in state ${result.state.state}`,
        symbol: lifecycle.getSnapshotState().activeSymbol
      });
      await appendAudit(
        "Invalid state transition",
        `Action ${action} rejected in state ${result.state.state}; actor=${typed.userId}`,
        lifecycle.getSnapshotState().activeSymbol,
        "ControlCommandRejected"
      );
      metrics.controlFailuresTotal += 1;
    }

    const payload: ControlActionResponse = {
      ok: result.ok,
      code: result.code,
      message: result.message,
      state: result.state.state,
      details:
        approvalId || canceledOrders > 0
          ? {
              ...(approvalId ? { approvalId } : {}),
              ...(canceledOrders > 0 ? { canceledOrders } : {})
            }
          : undefined
    };
    res.status(result.ok ? 200 : 409).json(payload);
  });

  httpServer.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    if (url.pathname !== "/events") {
      socket.destroy();
      return;
    }
    if (!isWsAuthorized(req)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wsServer.emit("connection", ws, req);
    });
  });

  wsServer.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    metrics.wsConnectionsTotal += 1;
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const replay = Math.min(Number(url.searchParams.get("replay") ?? replayDefault), 500);

    const snapshot: DashboardSnapshot = {
      state: lifecycle.getSnapshotState(),
      risk: lifecycle.risk,
      reconciliation: lifecycle.reconciliation,
      audit: lifecycle.audit,
      logs: lifecycle.logs,
      alerts: inMemoryAlerts,
      incidents: inMemoryIncidents,
      metrics,
      exchange: exchangeStatus,
      portfolio: portfolioStatus,
      openOrders: openOrdersStatus,
      demoQueue: getDemoQueueSnapshot(),
      events: inMemoryEvents.slice(0, replay)
    };

    const snapshotMsg: WsMessage = { kind: "snapshot", data: snapshot };
    ws.send(JSON.stringify(snapshotMsg));

    const unsubscribe = bus.subscribe((event) => {
      const msg: WsMessage = { kind: "event", data: event };
      ws.send(JSON.stringify(msg));
    });

    ws.on("close", () => {
      unsubscribe();
      metrics.wsDisconnectsTotal += 1;
    });
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      resolve();
    });
  });

  const address = httpServer.address();
  const boundPort = typeof address === "object" && address ? address.port : port;

  return {
    port: boundPort,
    baseHttpUrl: `http://localhost:${boundPort}`,
    baseWsUrl: `ws://localhost:${boundPort}`,
    server: httpServer,
    close: async () => {
      lifecycle.stopTick();
      worker.stop();
      clearInterval(reconcileTimer);
      clearInterval(heartbeatTimer);
      clearInterval(workerStallTimer);
      clearInterval(exchangeHealthTimer);
      clearInterval(retentionTimer);
      clearInterval(learningAlertTimer);
      clearInterval(autoPauseTimer);
      wsServer.clients.forEach((client: WebSocket) => {
        client.close();
      });
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      eventStore.close();
      opsStore.close();
    }
  };
}

async function main(): Promise<void> {
  const handle = await startMissionControlServer();
  process.stdout.write(`[mission-control] listening on ${handle.baseHttpUrl}\n`);

  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
