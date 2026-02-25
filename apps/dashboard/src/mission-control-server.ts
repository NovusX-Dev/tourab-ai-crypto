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
import { RuntimeWorkerManager, type WorkerSidePreference, type WorkerSymbolOverride } from "./mission-control/worker-manager.js";
import { createSignedAccessToken, verifySignedAccessToken } from "./mission-control/auth.js";
import { loadEnvFromProjectRoot } from "./env-loader.js";
import { fetchSpotMarketInputs } from "./proposal-helper.js";

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
const DEFAULT_AUTO_EXIT_STALE_TIMEOUT_SEC = 20;
const DEFAULT_AUTO_EXIT_MAX_REPRICES = 3;
const DEFAULT_AUTO_EXIT_FORCE_FLATTEN_BPS = 30;
const DEFAULT_ENTRY_AUTONOMY_POLICY_VERSION = "m6-policy-v1";
const DEFAULT_ENTRY_AUTONOMY_STRATEGY_VERSION = "champion-v1";
const DEFAULT_STRATEGY_MAX_DAILY_LOSS_USD = 5;
const DEFAULT_STRATEGY_MAX_DRAWDOWN_PCT = -5;
const DEFAULT_STRATEGY_MAX_CONSEC_LOSSES = 4;
const DEFAULT_LEARNING_MODEL_VERSION = "m7-baseline-v1";
const DEFAULT_LEARNING_FEATURE_SCHEMA_VERSION = "m7-closed-trade-v1";
const DEFAULT_LEARNING_ALERT_LOOKBACK_DAYS = 30;
const DEFAULT_LEARNING_ALERT_LIMIT = 2000;
const DEFAULT_LEARNING_ALERT_MIN_TRADES = 15;
const DEFAULT_LEARNING_ALERT_EXPECTANCY_MIN_USD = 0;
const DEFAULT_LEARNING_ALERT_MAX_DRAWDOWN_PCT = 5;
const DEFAULT_LEARNING_ALERT_MAX_SLIPPAGE_BPS = 15;
const DEFAULT_LEARNING_ALERT_MAX_CONTROL_VIOLATION_RATE_PCT = 20;
const DEFAULT_LEARNING_ALERT_CHECK_INTERVAL_MS = 60_000;
const DEFAULT_WORKER_SYMBOL_QUALITY_LOOKBACK_TRADES = 120;
const DEFAULT_WORKER_SYMBOL_QUALITY_MIN_TRADES = 20;
const DEFAULT_WORKER_SYMBOL_MIN_EXPECTANCY_USD = -0.01;
const DEFAULT_WORKER_SYMBOL_MAX_CONSECUTIVE_LOSSES = 12;
const DEFAULT_WORKER_SYMBOL_COOLDOWN_MINUTES = 120;
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
    forcedFlattenEscalated: record.forcedFlattenEscalated
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
    forcedFlattenEscalated: trade.forcedFlattenEscalated
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
  const createdEpoch = Date.parse(trade.createdAt);
  const closedEpoch = Date.parse(trade.closedAt);
  const holdSec =
    Number.isFinite(createdEpoch) && Number.isFinite(closedEpoch) && closedEpoch >= createdEpoch
      ? Math.max(0, Math.round((closedEpoch - createdEpoch) / 1000))
      : 0;
  const entryNotional = Math.max(0, trade.entryFilledQty * trade.entryAvgPrice);
  const realizedPnlBps = entryNotional > 0 ? round6((trade.realizedPnlUsd / entryNotional) * 10_000) : 0;
  return {
    tradeId: trade.tradeId,
    symbol: trade.symbol,
    entrySide: trade.entrySide,
    exitReason: trade.exitReason,
    status: "closed",
    closedAt: trade.closedAt,
    holdSec,
    entryFilledQty: round6(Math.max(0, trade.entryFilledQty)),
    exitFilledQty: round6(Math.max(0, trade.exitFilledQty)),
    entryAvgPrice: round6(Math.max(0, trade.entryAvgPrice)),
    exitAvgPrice: round6(Math.max(0, trade.exitAvgPrice)),
    feeUsd: round6(Math.max(0, trade.feeUsd)),
    realizedPnlUsd: round6(trade.realizedPnlUsd),
    realizedPnlBps,
    featureSchemaVersion: DEFAULT_LEARNING_FEATURE_SCHEMA_VERSION,
    policyVersion: input.policyVersion,
    strategyVersion: input.strategyVersion,
    modelVersion: input.modelVersion,
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
      allowedSymbols: parseCsvEnv(process.env.TOURAB_POLICY_AUTO_ALLOWED_SYMBOLS, ["BTC-USDT", "ETH-USDT", "SOL-USDT"]),
      maxPerOrderNotionalUsd: Math.max(1, Number(process.env.TOURAB_POLICY_AUTO_MAX_PER_ORDER_NOTIONAL_USD ?? "12")),
      maxOpenExposureUsd: Math.max(1, Number(process.env.TOURAB_POLICY_AUTO_MAX_OPEN_EXPOSURE_USD ?? "20")),
      maxDailyLossUsd: Math.max(0.5, Number(process.env.TOURAB_POLICY_AUTO_MAX_DAILY_LOSS_USD ?? "5")),
      maxWeeklyLossUsd: Math.max(1, Number(process.env.TOURAB_POLICY_AUTO_MAX_WEEKLY_LOSS_USD ?? "15")),
      lossStreakCooldownCount: parseBoundedInt(process.env.TOURAB_POLICY_AUTO_LOSS_STREAK_COUNT, 3, 1, 20),
      cooldownMinutes: parseBoundedInt(process.env.TOURAB_POLICY_AUTO_COOLDOWN_MINUTES, 60, 1, 24 * 60),
      strategyVersion: (process.env.TOURAB_STRATEGY_VERSION ?? DEFAULT_ENTRY_AUTONOMY_STRATEGY_VERSION).trim(),
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
  const autoExitStaleTimeoutSec = parseBoundedInt(
    process.env.TOURAB_AUTO_EXIT_STALE_TIMEOUT_SEC,
    DEFAULT_AUTO_EXIT_STALE_TIMEOUT_SEC,
    5,
    15 * 60
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
  entryAutonomyConfig.strategyVersion = strategyPromotionState.activeVersion;
  entryAutonomyStatus.approvalMode = entryAutonomyConfig.approvalMode;
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
      evaluateSymbolEligibility: async (symbol, nowIso) => {
        const features = opsStore.listClosedTradeFeatures(workerSymbolQualityGate.lookbackTrades);
        return evaluateWorkerSymbolQualityGate({
          symbol,
          nowIso,
          features,
          config: workerSymbolQualityGate
        });
      },
      queueDemoExecutionApproval: async ({ symbol, proposal, intent }) => {
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
            await fallbackApprovalModeToManual(
              `policy_auto guardrails failed: ${policyAuto.blockers.join(" | ")}`,
              symbol,
              "warn"
            );
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
        const effectiveTpRMultiple = symbol === "SOL-USDT" ? solAutoExitTpRMultiple : autoExitConfig.takeProfitRMultiple;
        const effectiveMaxHoldSec = symbol === "SOL-USDT" ? solAutoExitMaxHoldSec : autoExitConfig.maxHoldSec;
        const takeProfitPrice =
          intent.side === "buy"
            ? round6(entryPrice + riskDistance * effectiveTpRMultiple)
            : round6(entryPrice - riskDistance * effectiveTpRMultiple);
        const flattenAt = nextFlattenAtIso(autoExitConfig.flattenTimeUtc);
        const effectiveStrategyVersion = strategyPromotionState.activeVersion || entryAutonomyConfig.strategyVersion;
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
              const message = error instanceof Error ? error.message : String(error);
              pendingDemoOrders.delete(request.id);
              await upsertAlert({
                code: "POLICY_AUTO_SUBMIT_FAILED",
                severity: "error",
                source: "exchange",
                title: "Policy-auto demo submit failed",
                detail: message,
                symbol
              });
              await publish(
                createEvent(
                  "Error",
                  symbol,
                  `Policy-auto demo submit failed approval=${request.id} error=${message}`,
                  "error",
                  ["entry_autonomy", "policy_auto", "okx_error"]
                )
              );
              await fallbackApprovalModeToManual(`policy_auto submit failure: ${message}`, symbol, "critical");
              return { queued: false, reason: message };
            }
          }
        }
        return { queued: true, approvalId: request.id };
      }
    },
    {
      symbolUniverse: (process.env.TOURAB_WORKER_SYMBOLS ?? "BTC-USDT,ETH-USDT,SOL-USDT")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      baseUrl: process.env.OKX_DEMO_BASE_URL ?? "https://www.okx.com",
      intervalMs: parseBoundedInt(process.env.TOURAB_WORKER_INTERVAL_MS, 7_500, 2_000, 120_000),
      maxRiskUsd: Number(process.env.TOURAB_WORKER_MAX_RISK_USD ?? "0.2"),
      maxNotionalUsd: Number(process.env.TOURAB_WORKER_MAX_NOTIONAL_USD ?? "12"),
      entryOffsetBps: Number(process.env.TOURAB_WORKER_ENTRY_OFFSET_BPS ?? "20"),
      stopDistanceBps: Number(process.env.TOURAB_WORKER_STOP_DISTANCE_BPS ?? "150"),
      retryMaxAttempts: parseBoundedInt(process.env.TOURAB_WORKER_RETRY_MAX_ATTEMPTS, 3, 1, 10),
      retryBudgetPerHour: parseBoundedInt(process.env.TOURAB_WORKER_RETRY_BUDGET_PER_HOUR, 30, 1, 1000),
      executionMode: workerExecutionMode,
      defaultSide: (process.env.TOURAB_WORKER_DEFAULT_SIDE as "buy" | "sell" | undefined) ?? "buy",
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

  function upsertStrategyVersion(record: StrategyVersionRecord): void {
    const next = strategyPromotionState.versions.filter((item) => item.version !== record.version);
    next.unshift(record);
    strategyPromotionState.versions = next.slice(0, 200);
  }

  function setActiveStrategyVersion(nextVersion: string): void {
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
    const active = findStrategy(strategyPromotionState.activeVersion);
    const previous = strategyPromotionState.previousStableVersion ? findStrategy(strategyPromotionState.previousStableVersion) : undefined;
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

  async function evaluatePolicyAutoEligibility(input: {
    symbol: string;
    intent: ExecutionIntent;
    nowIso: string;
  }): Promise<{ ok: boolean; blockers: string[] }> {
    const blockers: string[] = [];
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
    if (!m5.today.pass || m5.qualifiedDays < m5.requiredDays) {
      blockers.push(`Demo readiness not fully green (qualifiedDays=${m5.qualifiedDays}/${m5.requiredDays}, todayPass=${m5.today.pass}).`);
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
      forcedFlattenEscalated: false
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
          `policy_version:${input.queued.policyVersion}`
        ],
        input.correlationId
      )
    );
    await appendAudit(
      "Demo order submitted",
      `Approval ${input.approvedId} executed by ${input.actor}; ordId=${order.ordId} proposal=${input.queued.proposal.proposalId} approvalMode=${input.queued.approvalModeAtDecision} strategy=${input.queued.strategyVersion} policy=${input.queued.policyVersion}`,
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
    const nowEpoch = Date.parse(input.nowIso);

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

    function resolveExitOffsetBps(trade: ManagedTrade, reason: ExitReason): number {
      const baseOffsetBps = trade.symbol === "SOL-USDT" ? Math.min(autoExitConfig.exitOffsetBps, solAutoExitOffsetBps) : autoExitConfig.exitOffsetBps;
      const forceFlattenFloorBps =
        trade.symbol === "SOL-USDT" ? Math.min(autoExitForceFlattenBps, solAutoExitForceFlattenBps) : autoExitForceFlattenBps;
      if (reason === "flatten" || reason === "time_stop") {
        return Math.min(autoExitMaxOffsetBps, Math.max(forceFlattenFloorBps, baseOffsetBps + trade.exitRepriceCount * 10));
      }
      if (trade.forcedFlattenEscalated) {
        return Math.min(autoExitMaxOffsetBps, Math.max(forceFlattenFloorBps, baseOffsetBps + trade.exitRepriceCount * 10));
      }
      return Math.min(autoExitMaxOffsetBps, baseOffsetBps + trade.exitRepriceCount * 5);
    }

    function classifyTransientExitSubmitFailure(error: unknown): { transient: boolean; message: string } {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof OkxApiError) {
        if (error.code === "OKX_ORDER_REJECTED" || error.code === "OKX_CANCEL_INPUT_ERROR" || error.code === "OKX_CONFIG_ERROR") {
          return { transient: false, message };
        }
        if (error.code === "OKX_NETWORK_ERROR") {
          return { transient: true, message };
        }
        if (error.code === "OKX_HTTP_ERROR") {
          const status = Number((error.details ?? {}).status);
          if (status === 408 || status === 425 || status === 429 || status >= 500) {
            return { transient: true, message };
          }
        }
      }
      const normalized = message.toLowerCase();
      if (
        normalized.includes("fetch failed") ||
        normalized.includes("network") ||
        normalized.includes("timeout")
      ) {
        return { transient: true, message };
      }
      return { transient: false, message };
    }

    function formatAutoExitErrorDetail(error: unknown): string {
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
      const parts = [`error=${message}`, `okxCode=${error.code}`];
      if (status !== undefined) {
        parts.push(`httpStatus=${status}`);
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
      return parts.join(" ");
    }

    for (const trade of managedTrades.values()) {
      if (trade.status === "closed") {
        continue;
      }
      const entryStats = fillStatsForOrder(input.fills, trade.entryOrdId);
      if (entryStats.qty > 0) {
        trade.entryFilledQty = entryStats.qty;
        trade.entryAvgPrice = entryStats.avgPrice;
        trade.status = entryStats.qty + 1e-9 < trade.requestedQty ? "entry_partially_filled" : "entry_filled";
        // Never allow pending exit quantity to exceed what has actually filled.
        trade.remainingQty = Math.max(0, round6(Math.min(trade.remainingQty, trade.entryFilledQty)));
      } else if (trade.status === "planned") {
        trade.status = "entry_submitted";
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
          trade.status = "exit_pending";
          trade.exitOrdId = undefined;
          trade.exitClOrdId = undefined;
          trade.exitSubmittedAt = undefined;
        } else {
          const submittedEpoch = trade.exitSubmittedAt ? Date.parse(trade.exitSubmittedAt) : Number.NaN;
          const isStale =
            Number.isFinite(nowEpoch) &&
            Number.isFinite(submittedEpoch) &&
            nowEpoch - submittedEpoch >= autoExitStaleTimeoutSec * 1000;
          if (isStale) {
            try {
              await input.adapter.cancelOrder({
                instId: trade.symbol,
                ordId: trade.exitOrdId,
                clOrdId: trade.exitClOrdId
              });
              trade.status = "exit_pending";
              trade.exitOrdId = undefined;
              trade.exitClOrdId = undefined;
              trade.exitSubmittedAt = undefined;
              trade.exitRepriceCount += 1;
              if (trade.exitRepriceCount > autoExitMaxReprices) {
                trade.forcedFlattenEscalated = true;
                trade.exitReason = "flatten";
              }
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
      let mark =
        input.marksBySymbol.get(trade.symbol) ??
        markCache.get(trade.symbol) ??
        (trade.entryAvgPrice > 0 ? trade.entryAvgPrice : undefined);
      const marketInputs = await loadMarketInputs(trade.symbol);
      if (marketInputs?.last && marketInputs.last > 0) {
        markCache.set(trade.symbol, marketInputs.last);
        if (mark === undefined || mark <= 0) {
          mark = marketInputs.last;
        }
      }
      if (mark === undefined || mark <= 0) {
        try {
          const market = await fetchSpotMarketInputs(trade.symbol, process.env.OKX_DEMO_BASE_URL ?? "https://www.okx.com");
          mark = market.last;
          markCache.set(trade.symbol, mark);
        } catch {
          mark = trade.entryAvgPrice;
        }
      }

      const createdEpoch = Date.parse(trade.createdAt);
      const elapsedSec = Number.isFinite(createdEpoch) && Number.isFinite(nowEpoch) ? (nowEpoch - createdEpoch) / 1000 : 0;
      const staleEscalatedClosureSec = trade.maxHoldSec + autoExitStaleTimeoutSec * Math.max(3, autoExitMaxReprices);
      const staleEscalatedClosureEligible =
        (trade.status === "exit_pending" || trade.status === "error") &&
        trade.forcedFlattenEscalated &&
        elapsedSec >= staleEscalatedClosureSec;
      if (staleEscalatedClosureEligible) {
        const staleQty = Math.max(0, round6(trade.remainingQty));
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

      let reason: ExitReason | undefined;
      if (trade.forcedFlattenEscalated) {
        reason = "flatten";
      } else if (trade.exitReason && (trade.status === "exit_pending" || trade.status === "error")) {
        reason = trade.exitReason;
      } else if (flattenTriggered) {
        reason = "flatten";
      } else if (timeTriggered) {
        reason = "time_stop";
      } else if (stopTriggered) {
        reason = "stop_loss";
      } else if (tpTriggered) {
        reason = "take_profit";
      }
      if (!reason) {
        continue;
      }

      if (trade.exitRepriceCount > autoExitMaxReprices) {
        trade.forcedFlattenEscalated = true;
        reason = "flatten";
      }

      const exitSide: "buy" | "sell" = trade.entrySide === "buy" ? "sell" : "buy";
      const offsetBps = resolveExitOffsetBps(trade, reason);
      const offsetMultiplier = exitSide === "sell" ? 1 - offsetBps / 10_000 : 1 + offsetBps / 10_000;
      let limitPrice = round6(Math.max(0.00000001, mark * offsetMultiplier));
      if (
        marketInputs &&
        Number.isFinite(marketInputs.buyLmt) &&
        Number.isFinite(marketInputs.sellLmt) &&
        marketInputs.buyLmt !== undefined &&
        marketInputs.sellLmt !== undefined &&
        marketInputs.buyLmt >= marketInputs.sellLmt
      ) {
        limitPrice = Math.max(marketInputs.sellLmt, Math.min(marketInputs.buyLmt, limitPrice));
      }
      if (marketInputs && Number.isFinite(marketInputs.tickSz) && marketInputs.tickSz > 0) {
        limitPrice = alignPriceToTick(limitPrice, marketInputs.tickSz, exitSide);
      }
      if (
        marketInputs &&
        Number.isFinite(marketInputs.buyLmt) &&
        Number.isFinite(marketInputs.sellLmt) &&
        marketInputs.buyLmt !== undefined &&
        marketInputs.sellLmt !== undefined &&
        marketInputs.buyLmt >= marketInputs.sellLmt
      ) {
        limitPrice = Math.max(marketInputs.sellLmt, Math.min(marketInputs.buyLmt, limitPrice));
      }
      limitPrice = round6(Math.max(0.00000001, limitPrice));
      const exitQty = Math.max(0.00000001, round6(Math.min(trade.remainingQty, Math.max(0, trade.entryFilledQty - trade.exitFilledQty))));
      // Use unique proposal IDs per retry attempt to avoid clOrdId collisions on repeated exit submissions.
      const exitProposalId = `${trade.tradeId}-${reason}-${trade.exitRepriceCount}-${Date.parse(input.nowIso)}`;
      try {
        const order = await input.adapter.placeSpotLimitOrder({
          proposalId: exitProposalId,
          symbol: trade.symbol,
          side: exitSide,
          qtyBase: exitQty,
          limitPrice
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
            `Auto-exit submitted tradeId=${trade.tradeId} reason=${reason} ordId=${order.ordId} repriceCount=${trade.exitRepriceCount} offsetBps=${offsetBps}`,
            "info",
            ["managed_trade", "auto_exit", reason]
          )
        );
        await appendAudit(
          "Auto-exit submitted",
          `tradeId=${trade.tradeId} reason=${reason} ordId=${order.ordId} limitPrice=${limitPrice} repriceCount=${trade.exitRepriceCount} offsetBps=${offsetBps}`,
          trade.symbol,
          "OrderSubmitted"
        );
      } catch (error: unknown) {
        const detail = formatAutoExitErrorDetail(error);
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
    const { auditDeleted, incidentsDeleted } = opsStore.clearAllOps();
    const logsCleared = lifecycle.logs.length;
    lifecycle.logs.length = 0;
    lifecycle.audit.length = 0;
    inMemoryEvents = [];
    inMemoryIncidents = [];
    managedTrades.clear();
    metrics.openIncidents = 0;
    return {
      eventsDeleted,
      auditDeleted,
      incidentsDeleted,
      logsCleared
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
    if (
      saved.severity === "critical" ||
      saved.code.startsWith("APPROVAL_") ||
      saved.code.startsWith("STALE_") ||
      saved.code.startsWith("LEARNING_")
    ) {
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
      metrics.openIncidents = inMemoryIncidents.filter((item) => item.status !== "resolved").length;
    }
    if (inMemoryIncidents.some((item) => item.status !== "resolved")) {
      await fallbackApprovalModeToManual(
        `open incident present (count=${inMemoryIncidents.filter((item) => item.status !== "resolved").length})`,
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
  const workerStallTimer = setInterval(() => {
    const state = lifecycle.getSnapshotState();
    if (state.state !== "running") {
      return;
    }
    const now = Date.now();
    const proposalGap = now - lastProposalCreatedAtEpoch;
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
    void (async () => {
      const open = await alertStore.findByFingerprint(WORKER_STALL_ALERT_CODE, undefined);
      if (!open) {
        return;
      }
      await alertStore.updateStatus(open.id, "resolved", "system");
      inMemoryAlerts = await alertStore.readAll();
      metrics.openAlerts = inMemoryAlerts.filter((item) => item.status === "open").length;
    })();
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
      setActiveStrategyVersion(version);
      strategyPromotionState.championVersion = version;
    } else if (targetStage === "paper_canary") {
      strategyPromotionState.challengerVersion = version;
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
    const rolled = await rollbackStrategyOnDegradation(
      reason,
      typed.userId,
      lifecycle.getSnapshotState().activeSymbol,
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
