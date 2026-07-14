import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  AuditItem,
  BotStateSnapshot,
  ClosedTradeFeatureRecord,
  IncidentItem,
  IncidentStatus,
  ReconciliationStatus
} from "@tourab/shared";

export interface ManagedTradeRecord {
  tradeId: string;
  status: string;
  symbol: string;
  entrySide: "buy" | "sell";
  entryOrdId: string;
  entryClOrdId: string;
  requestedQty: number;
  entryLimitPrice?: number;
  entrySubmittedAt?: string;
  entryFirstFilledAt?: string;
  entryRepriceCount?: number;
  entryFilledQty: number;
  entryAvgPrice: number;
  exitOrdId?: string;
  exitClOrdId?: string;
  exitFilledQty: number;
  exitAvgPrice: number;
  remainingQty: number;
  exitReason?: string;
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
  approvalModeAtDecision?: "manual" | "policy_auto";
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

interface IncidentCreateInput {
  id: string;
  severity: IncidentItem["severity"];
  taxonomy: IncidentItem["taxonomy"];
  title: string;
  detail: string;
  runbookRef: string;
  symbol?: string;
  sourceAlertCode?: string;
  owner?: string;
}

export class SqliteOpsStore {
  private constructor(private readonly db: DatabaseSync) {}

  static async open(filePath: string): Promise<SqliteOpsStore> {
    await mkdir(dirname(filePath), { recursive: true });
    const db = new DatabaseSync(filePath);
    const store = new SqliteOpsStore(db);
    store.init();
    return store;
  }

  private init(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA synchronous = NORMAL;
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_entries (
        id TEXT PRIMARY KEY,
        at TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        symbol TEXT,
        related_event_type TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_entries_at ON audit_entries(at DESC);

      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        severity TEXT NOT NULL,
        taxonomy TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        runbook_ref TEXT NOT NULL,
        symbol TEXT,
        source_alert_code TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        owner TEXT,
        acknowledged_by TEXT,
        acknowledged_at TEXT,
        resolved_by TEXT,
        resolved_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_incidents_alert ON incidents(source_alert_code, status);

      CREATE TABLE IF NOT EXISTS runtime_state (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS managed_trades (
        trade_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        symbol TEXT NOT NULL,
        entry_side TEXT NOT NULL,
        entry_ord_id TEXT NOT NULL,
        entry_cl_ord_id TEXT NOT NULL,
        requested_qty REAL NOT NULL,
        entry_filled_qty REAL NOT NULL,
        entry_avg_price REAL NOT NULL,
        exit_ord_id TEXT,
        exit_cl_ord_id TEXT,
        exit_filled_qty REAL NOT NULL,
        exit_avg_price REAL NOT NULL,
        remaining_qty REAL NOT NULL,
        exit_reason TEXT,
        stop_price REAL NOT NULL,
        take_profit_price REAL NOT NULL,
        max_hold_sec INTEGER NOT NULL,
        flatten_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        closed_at TEXT,
        fee_usd REAL NOT NULL,
        realized_pnl_usd REAL NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_managed_trades_status ON managed_trades(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_managed_trades_symbol ON managed_trades(symbol, updated_at DESC);

      CREATE TABLE IF NOT EXISTS closed_trade_features (
        trade_id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        entry_side TEXT NOT NULL,
        exit_reason TEXT NOT NULL,
        status TEXT NOT NULL,
        closed_at TEXT NOT NULL,
        hold_sec INTEGER NOT NULL,
        entry_filled_qty REAL NOT NULL,
        exit_filled_qty REAL NOT NULL,
        entry_avg_price REAL NOT NULL,
        exit_avg_price REAL NOT NULL,
        fee_usd REAL NOT NULL,
        realized_pnl_usd REAL NOT NULL,
        realized_pnl_bps REAL NOT NULL,
        feature_schema_version TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        strategy_version TEXT NOT NULL,
        model_version TEXT NOT NULL,
        extracted_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_closed_trade_features_closed_at ON closed_trade_features(closed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_closed_trade_features_symbol ON closed_trade_features(symbol, closed_at DESC);
    `);
    this.ensureManagedTradeColumn("exit_submitted_at", "TEXT");
    this.ensureManagedTradeColumn("exit_reprice_count", "INTEGER NOT NULL DEFAULT 0");
    this.ensureManagedTradeColumn("forced_flatten_escalated", "INTEGER NOT NULL DEFAULT 0");
    this.ensureManagedTradeColumn("requested_notional_usd", "REAL");
    this.ensureManagedTradeColumn("approval_mode_at_decision", "TEXT");
    this.ensureManagedTradeColumn("policy_version_at_decision", "TEXT");
    this.ensureManagedTradeColumn("strategy_version_at_decision", "TEXT");
    this.ensureManagedTradeColumn("model_version_at_decision", "TEXT");
    this.ensureManagedTradeColumn("intelligence_version_at_decision", "TEXT");
    this.ensureManagedTradeColumn("playbook_id_at_decision", "TEXT");
    this.ensureManagedTradeColumn("entry_style_at_decision", "TEXT");
    this.ensureManagedTradeColumn("thesis_summary_at_decision", "TEXT");
    this.ensureManagedTradeColumn("invalidation_summary_at_decision", "TEXT");
    this.ensureManagedTradeColumn("thesis_confidence_score_at_decision", "REAL");
    this.ensureManagedTradeColumn("tradeability_score_at_decision", "REAL");
    this.ensureManagedTradeColumn("entry_offset_bps", "REAL");
    this.ensureManagedTradeColumn("stop_distance_bps", "REAL");
    this.ensureManagedTradeColumn("take_profit_r_multiple", "REAL");
    this.ensureManagedTradeColumn("entry_limit_price", "REAL");
    this.ensureManagedTradeColumn("entry_submitted_at", "TEXT");
    this.ensureManagedTradeColumn("entry_first_filled_at", "TEXT");
    this.ensureManagedTradeColumn("entry_reprice_count", "INTEGER NOT NULL DEFAULT 0");
    this.ensureManagedTradeColumn("market_regime_at_decision", "TEXT");
    this.ensureManagedTradeColumn("signal_confidence_score_at_decision", "REAL");
    this.ensureManagedTradeColumn("trend_alignment_score_at_decision", "REAL");
    this.ensureManagedTradeColumn("move_1m_bps_at_decision", "REAL");
    this.ensureManagedTradeColumn("move_5m_bps_at_decision", "REAL");
    this.ensureManagedTradeColumn("move_15m_bps_at_decision", "REAL");
    this.ensureManagedTradeColumn("realized_volatility_bps_at_decision", "REAL");
    this.ensureManagedTradeColumn("spread_bps_at_decision", "REAL");
    this.ensureManagedTradeColumn("order_book_imbalance_pct_at_decision", "REAL");
    this.ensureClosedTradeFeatureColumn("requested_qty", "REAL");
    this.ensureClosedTradeFeatureColumn("requested_notional_usd", "REAL");
    this.ensureClosedTradeFeatureColumn("entry_limit_price", "REAL");
    this.ensureClosedTradeFeatureColumn("entry_submitted_at", "TEXT");
    this.ensureClosedTradeFeatureColumn("entry_first_filled_at", "TEXT");
    this.ensureClosedTradeFeatureColumn("entry_reprice_count", "INTEGER");
    this.ensureClosedTradeFeatureColumn("approval_mode", "TEXT");
    this.ensureClosedTradeFeatureColumn("stop_price", "REAL");
    this.ensureClosedTradeFeatureColumn("take_profit_price", "REAL");
    this.ensureClosedTradeFeatureColumn("max_hold_sec_configured", "INTEGER");
    this.ensureClosedTradeFeatureColumn("intelligence_version", "TEXT");
    this.ensureClosedTradeFeatureColumn("playbook_id", "TEXT");
    this.ensureClosedTradeFeatureColumn("entry_style", "TEXT");
    this.ensureClosedTradeFeatureColumn("thesis_summary", "TEXT");
    this.ensureClosedTradeFeatureColumn("invalidation_summary", "TEXT");
    this.ensureClosedTradeFeatureColumn("thesis_confidence_score", "REAL");
    this.ensureClosedTradeFeatureColumn("tradeability_score", "REAL");
    this.ensureClosedTradeFeatureColumn("entry_offset_bps", "REAL");
    this.ensureClosedTradeFeatureColumn("stop_distance_bps", "REAL");
    this.ensureClosedTradeFeatureColumn("take_profit_r_multiple", "REAL");
    this.ensureClosedTradeFeatureColumn("risk_distance_bps", "REAL");
    this.ensureClosedTradeFeatureColumn("target_distance_bps", "REAL");
    this.ensureClosedTradeFeatureColumn("market_regime", "TEXT");
    this.ensureClosedTradeFeatureColumn("signal_confidence_score", "REAL");
    this.ensureClosedTradeFeatureColumn("trend_alignment_score", "REAL");
    this.ensureClosedTradeFeatureColumn("move_1m_bps", "REAL");
    this.ensureClosedTradeFeatureColumn("move_5m_bps", "REAL");
    this.ensureClosedTradeFeatureColumn("move_15m_bps", "REAL");
    this.ensureClosedTradeFeatureColumn("realized_volatility_bps", "REAL");
    this.ensureClosedTradeFeatureColumn("spread_bps", "REAL");
    this.ensureClosedTradeFeatureColumn("order_book_imbalance_pct", "REAL");
    this.ensureClosedTradeFeatureColumn("fee_bps", "REAL");
    this.ensureClosedTradeFeatureColumn("gross_pnl_usd", "REAL");
    this.ensureClosedTradeFeatureColumn("gross_pnl_bps", "REAL");
  }

  private ensureManagedTradeColumn(name: string, definition: string): void {
    const rows = this.db.prepare(`PRAGMA table_info(managed_trades)`).all() as Array<{ name: string }>;
    if (rows.some((row) => row.name === name)) {
      return;
    }
    this.db.exec(`ALTER TABLE managed_trades ADD COLUMN ${name} ${definition}`);
  }

  private ensureClosedTradeFeatureColumn(name: string, definition: string): void {
    const rows = this.db.prepare(`PRAGMA table_info(closed_trade_features)`).all() as Array<{ name: string }>;
    if (rows.some((row) => row.name === name)) {
      return;
    }
    this.db.exec(`ALTER TABLE closed_trade_features ADD COLUMN ${name} ${definition}`);
  }

  loadRuntimeState<T>(key: string): T | undefined {
    const row = this.db.prepare(`SELECT value_json FROM runtime_state WHERE key = ?`).get(key) as
      | { value_json: string }
      | undefined;
    if (!row) {
      return undefined;
    }
    return JSON.parse(row.value_json) as T;
  }

  saveRuntimeState(key: string, value: unknown): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO runtime_state (key, value_json, updated_at)
         VALUES (?, ?, ?)`
      )
      .run(key, JSON.stringify(value), new Date().toISOString());
  }

  loadBotState(): BotStateSnapshot | undefined {
    return this.loadRuntimeState<BotStateSnapshot>("bot_state");
  }

  saveBotState(state: BotStateSnapshot): void {
    this.saveRuntimeState("bot_state", state);
  }

  loadReconciliation(): ReconciliationStatus | undefined {
    return this.loadRuntimeState<ReconciliationStatus>("reconciliation");
  }

  saveReconciliation(state: ReconciliationStatus): void {
    this.saveRuntimeState("reconciliation", state);
  }

  listManagedTrades(limit = 500): ManagedTradeRecord[] {
    const rows = this.db
      .prepare(
        `SELECT
           trade_id, status, symbol, entry_side, entry_ord_id, entry_cl_ord_id,
           requested_qty, entry_limit_price, entry_submitted_at, entry_first_filled_at, entry_reprice_count,
           entry_filled_qty, entry_avg_price,
           exit_ord_id, exit_cl_ord_id, exit_filled_qty, exit_avg_price,
           remaining_qty, exit_reason,
           stop_price, take_profit_price, max_hold_sec, flatten_at,
           created_at, updated_at, closed_at, fee_usd, realized_pnl_usd,
           exit_submitted_at, exit_reprice_count, forced_flatten_escalated,
           requested_notional_usd, approval_mode_at_decision, policy_version_at_decision,
           strategy_version_at_decision, model_version_at_decision, intelligence_version_at_decision,
           playbook_id_at_decision, entry_style_at_decision, thesis_summary_at_decision,
           invalidation_summary_at_decision, thesis_confidence_score_at_decision, tradeability_score_at_decision,
           entry_offset_bps,
           stop_distance_bps, take_profit_r_multiple, market_regime_at_decision,
           signal_confidence_score_at_decision, trend_alignment_score_at_decision,
           move_1m_bps_at_decision, move_5m_bps_at_decision, move_15m_bps_at_decision,
           realized_volatility_bps_at_decision, spread_bps_at_decision,
           order_book_imbalance_pct_at_decision
         FROM managed_trades
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .all(limit) as Array<{
      trade_id: string;
      status: string;
      symbol: string;
      entry_side: "buy" | "sell";
      entry_ord_id: string;
      entry_cl_ord_id: string;
      requested_qty: number;
      entry_limit_price: number | null;
      entry_submitted_at: string | null;
      entry_first_filled_at: string | null;
      entry_reprice_count: number | null;
      entry_filled_qty: number;
      entry_avg_price: number;
      exit_ord_id: string | null;
      exit_cl_ord_id: string | null;
      exit_filled_qty: number;
      exit_avg_price: number;
      remaining_qty: number;
      exit_reason: string | null;
      stop_price: number;
      take_profit_price: number;
      max_hold_sec: number;
      flatten_at: string | null;
      created_at: string;
      updated_at: string;
      closed_at: string | null;
      fee_usd: number;
      realized_pnl_usd: number;
      exit_submitted_at: string | null;
      exit_reprice_count: number | null;
      forced_flatten_escalated: number | null;
      requested_notional_usd: number | null;
      approval_mode_at_decision: "manual" | "policy_auto" | null;
      policy_version_at_decision: string | null;
      strategy_version_at_decision: string | null;
      model_version_at_decision: string | null;
      intelligence_version_at_decision: string | null;
      playbook_id_at_decision: string | null;
      entry_style_at_decision: string | null;
      thesis_summary_at_decision: string | null;
      invalidation_summary_at_decision: string | null;
      thesis_confidence_score_at_decision: number | null;
      tradeability_score_at_decision: number | null;
      entry_offset_bps: number | null;
      stop_distance_bps: number | null;
      take_profit_r_multiple: number | null;
      market_regime_at_decision: string | null;
      signal_confidence_score_at_decision: number | null;
      trend_alignment_score_at_decision: number | null;
      move_1m_bps_at_decision: number | null;
      move_5m_bps_at_decision: number | null;
      move_15m_bps_at_decision: number | null;
      realized_volatility_bps_at_decision: number | null;
      spread_bps_at_decision: number | null;
      order_book_imbalance_pct_at_decision: number | null;
    }>;
    return rows.map((row) => ({
      tradeId: row.trade_id,
      status: row.status,
      symbol: row.symbol,
      entrySide: row.entry_side,
      entryOrdId: row.entry_ord_id,
      entryClOrdId: row.entry_cl_ord_id,
      requestedQty: row.requested_qty,
      entryLimitPrice: row.entry_limit_price ?? undefined,
      entrySubmittedAt: row.entry_submitted_at ?? undefined,
      entryFirstFilledAt: row.entry_first_filled_at ?? undefined,
      entryRepriceCount: row.entry_reprice_count ?? 0,
      entryFilledQty: row.entry_filled_qty,
      entryAvgPrice: row.entry_avg_price,
      exitOrdId: row.exit_ord_id ?? undefined,
      exitClOrdId: row.exit_cl_ord_id ?? undefined,
      exitFilledQty: row.exit_filled_qty,
      exitAvgPrice: row.exit_avg_price,
      remainingQty: row.remaining_qty,
      exitReason: row.exit_reason ?? undefined,
      stopPrice: row.stop_price,
      takeProfitPrice: row.take_profit_price,
      maxHoldSec: row.max_hold_sec,
      flattenAt: row.flatten_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at ?? undefined,
      feeUsd: row.fee_usd,
      realizedPnlUsd: row.realized_pnl_usd,
      exitSubmittedAt: row.exit_submitted_at ?? undefined,
      exitRepriceCount: row.exit_reprice_count ?? 0,
      forcedFlattenEscalated: (row.forced_flatten_escalated ?? 0) > 0,
      requestedNotionalUsd: row.requested_notional_usd ?? undefined,
      approvalModeAtDecision: row.approval_mode_at_decision ?? undefined,
      policyVersionAtDecision: row.policy_version_at_decision ?? undefined,
      strategyVersionAtDecision: row.strategy_version_at_decision ?? undefined,
      modelVersionAtDecision: row.model_version_at_decision ?? undefined,
      intelligenceVersionAtDecision: row.intelligence_version_at_decision ?? undefined,
      playbookIdAtDecision: row.playbook_id_at_decision ?? undefined,
      entryStyleAtDecision: row.entry_style_at_decision ?? undefined,
      thesisSummaryAtDecision: row.thesis_summary_at_decision ?? undefined,
      invalidationSummaryAtDecision: row.invalidation_summary_at_decision ?? undefined,
      thesisConfidenceScoreAtDecision: row.thesis_confidence_score_at_decision ?? undefined,
      tradeabilityScoreAtDecision: row.tradeability_score_at_decision ?? undefined,
      entryOffsetBps: row.entry_offset_bps ?? undefined,
      stopDistanceBps: row.stop_distance_bps ?? undefined,
      takeProfitRMultiple: row.take_profit_r_multiple ?? undefined,
      marketRegimeAtDecision: row.market_regime_at_decision ?? undefined,
      signalConfidenceScoreAtDecision: row.signal_confidence_score_at_decision ?? undefined,
      trendAlignmentScoreAtDecision: row.trend_alignment_score_at_decision ?? undefined,
      move1mBpsAtDecision: row.move_1m_bps_at_decision ?? undefined,
      move5mBpsAtDecision: row.move_5m_bps_at_decision ?? undefined,
      move15mBpsAtDecision: row.move_15m_bps_at_decision ?? undefined,
      realizedVolatilityBpsAtDecision: row.realized_volatility_bps_at_decision ?? undefined,
      spreadBpsAtDecision: row.spread_bps_at_decision ?? undefined,
      orderBookImbalancePctAtDecision: row.order_book_imbalance_pct_at_decision ?? undefined
    }));
  }

  upsertManagedTrade(trade: ManagedTradeRecord): void {
    const values = [
      trade.tradeId,
      trade.status,
      trade.symbol,
      trade.entrySide,
      trade.entryOrdId,
      trade.entryClOrdId,
      trade.requestedQty,
      trade.entryLimitPrice ?? null,
      trade.entrySubmittedAt ?? null,
      trade.entryFirstFilledAt ?? null,
      trade.entryRepriceCount ?? 0,
      trade.entryFilledQty,
      trade.entryAvgPrice,
      trade.exitOrdId ?? null,
      trade.exitClOrdId ?? null,
      trade.exitFilledQty,
      trade.exitAvgPrice,
      trade.remainingQty,
      trade.exitReason ?? null,
      trade.stopPrice,
      trade.takeProfitPrice,
      trade.maxHoldSec,
      trade.flattenAt ?? null,
      trade.createdAt,
      trade.updatedAt,
      trade.closedAt ?? null,
      trade.feeUsd,
      trade.realizedPnlUsd,
      trade.exitSubmittedAt ?? null,
      trade.exitRepriceCount,
      trade.forcedFlattenEscalated ? 1 : 0,
      trade.requestedNotionalUsd ?? null,
      trade.approvalModeAtDecision ?? null,
      trade.policyVersionAtDecision ?? null,
      trade.strategyVersionAtDecision ?? null,
      trade.modelVersionAtDecision ?? null,
      trade.intelligenceVersionAtDecision ?? null,
      trade.playbookIdAtDecision ?? null,
      trade.entryStyleAtDecision ?? null,
      trade.thesisSummaryAtDecision ?? null,
      trade.invalidationSummaryAtDecision ?? null,
      trade.thesisConfidenceScoreAtDecision ?? null,
      trade.tradeabilityScoreAtDecision ?? null,
      trade.entryOffsetBps ?? null,
      trade.stopDistanceBps ?? null,
      trade.takeProfitRMultiple ?? null,
      trade.marketRegimeAtDecision ?? null,
      trade.signalConfidenceScoreAtDecision ?? null,
      trade.trendAlignmentScoreAtDecision ?? null,
      trade.move1mBpsAtDecision ?? null,
      trade.move5mBpsAtDecision ?? null,
      trade.move15mBpsAtDecision ?? null,
      trade.realizedVolatilityBpsAtDecision ?? null,
      trade.spreadBpsAtDecision ?? null,
      trade.orderBookImbalancePctAtDecision ?? null
    ];
    this.db
      .prepare(
        `INSERT OR REPLACE INTO managed_trades (
          trade_id, status, symbol, entry_side, entry_ord_id, entry_cl_ord_id,
          requested_qty, entry_limit_price, entry_submitted_at, entry_first_filled_at, entry_reprice_count,
          entry_filled_qty, entry_avg_price,
          exit_ord_id, exit_cl_ord_id, exit_filled_qty, exit_avg_price,
          remaining_qty, exit_reason,
          stop_price, take_profit_price, max_hold_sec, flatten_at,
          created_at, updated_at, closed_at, fee_usd, realized_pnl_usd,
          exit_submitted_at, exit_reprice_count, forced_flatten_escalated,
          requested_notional_usd, approval_mode_at_decision, policy_version_at_decision,
          strategy_version_at_decision, model_version_at_decision, intelligence_version_at_decision,
          playbook_id_at_decision, entry_style_at_decision, thesis_summary_at_decision,
          invalidation_summary_at_decision, thesis_confidence_score_at_decision, tradeability_score_at_decision, entry_offset_bps,
          stop_distance_bps, take_profit_r_multiple, market_regime_at_decision,
          signal_confidence_score_at_decision, trend_alignment_score_at_decision,
          move_1m_bps_at_decision, move_5m_bps_at_decision, move_15m_bps_at_decision,
          realized_volatility_bps_at_decision, spread_bps_at_decision,
          order_book_imbalance_pct_at_decision
        ) VALUES (${new Array(values.length).fill("?").join(", ")})`
      )
      .run(...values);
  }

  deleteManagedTradesOlderThan(cutoffIso: string): number {
    const result = this.db
      .prepare(
        `DELETE FROM managed_trades
         WHERE COALESCE(closed_at, updated_at) < ?`
      )
      .run(cutoffIso) as { changes?: number };
    return result.changes ?? 0;
  }

  listClosedTradeFeatures(limit = 500): ClosedTradeFeatureRecord[] {
    const rows = this.db
      .prepare(
        `SELECT
           trade_id, symbol, entry_side, exit_reason, status, closed_at, hold_sec,
           entry_filled_qty, exit_filled_qty, entry_avg_price, exit_avg_price,
           requested_qty, requested_notional_usd, entry_limit_price, entry_submitted_at, entry_first_filled_at, entry_reprice_count,
           approval_mode, stop_price, take_profit_price,
           max_hold_sec_configured, intelligence_version, playbook_id, entry_style, thesis_summary, invalidation_summary,
           thesis_confidence_score, tradeability_score, entry_offset_bps, stop_distance_bps, take_profit_r_multiple,
           risk_distance_bps, target_distance_bps, market_regime, signal_confidence_score,
           trend_alignment_score, move_1m_bps, move_5m_bps, move_15m_bps,
           realized_volatility_bps, spread_bps, order_book_imbalance_pct,
           fee_usd, fee_bps, gross_pnl_usd, gross_pnl_bps,
           realized_pnl_usd, realized_pnl_bps, feature_schema_version,
           policy_version, strategy_version, model_version, extracted_at
         FROM closed_trade_features
         ORDER BY closed_at DESC
         LIMIT ?`
      )
      .all(limit) as Array<{
      trade_id: string;
      symbol: string;
      entry_side: "buy" | "sell";
      exit_reason: string;
      status: "closed";
      closed_at: string;
      hold_sec: number;
      entry_filled_qty: number;
      exit_filled_qty: number;
      entry_avg_price: number;
      exit_avg_price: number;
      requested_qty: number | null;
      requested_notional_usd: number | null;
      entry_limit_price: number | null;
      entry_submitted_at: string | null;
      entry_first_filled_at: string | null;
      entry_reprice_count: number | null;
      approval_mode: "manual" | "policy_auto" | null;
      stop_price: number | null;
      take_profit_price: number | null;
      max_hold_sec_configured: number | null;
      intelligence_version: string | null;
      playbook_id: string | null;
      entry_style: string | null;
      thesis_summary: string | null;
      invalidation_summary: string | null;
      thesis_confidence_score: number | null;
      tradeability_score: number | null;
      entry_offset_bps: number | null;
      stop_distance_bps: number | null;
      take_profit_r_multiple: number | null;
      risk_distance_bps: number | null;
      target_distance_bps: number | null;
      market_regime: string | null;
      signal_confidence_score: number | null;
      trend_alignment_score: number | null;
      move_1m_bps: number | null;
      move_5m_bps: number | null;
      move_15m_bps: number | null;
      realized_volatility_bps: number | null;
      spread_bps: number | null;
      order_book_imbalance_pct: number | null;
      fee_usd: number;
      fee_bps: number | null;
      gross_pnl_usd: number | null;
      gross_pnl_bps: number | null;
      realized_pnl_usd: number;
      realized_pnl_bps: number;
      feature_schema_version: string;
      policy_version: string;
      strategy_version: string;
      model_version: string;
      extracted_at: string;
    }>;
    return rows.map((row) => ({
      tradeId: row.trade_id,
      symbol: row.symbol,
      entrySide: row.entry_side,
      exitReason: row.exit_reason,
      status: row.status,
      closedAt: row.closed_at,
      holdSec: row.hold_sec,
      entryFilledQty: row.entry_filled_qty,
      exitFilledQty: row.exit_filled_qty,
      entryAvgPrice: row.entry_avg_price,
      exitAvgPrice: row.exit_avg_price,
      requestedQty: row.requested_qty ?? undefined,
      requestedNotionalUsd: row.requested_notional_usd ?? undefined,
      entryLimitPrice: row.entry_limit_price ?? undefined,
      entrySubmittedAt: row.entry_submitted_at ?? undefined,
      entryFirstFilledAt: row.entry_first_filled_at ?? undefined,
      entryRepriceCount: row.entry_reprice_count ?? undefined,
      approvalMode: row.approval_mode ?? undefined,
      stopPrice: row.stop_price ?? undefined,
      takeProfitPrice: row.take_profit_price ?? undefined,
      maxHoldSecConfigured: row.max_hold_sec_configured ?? undefined,
      intelligenceVersion: row.intelligence_version ?? undefined,
      playbookId: row.playbook_id ?? undefined,
      entryStyle: row.entry_style ?? undefined,
      thesisSummary: row.thesis_summary ?? undefined,
      invalidationSummary: row.invalidation_summary ?? undefined,
      thesisConfidenceScore: row.thesis_confidence_score ?? undefined,
      tradeabilityScore: row.tradeability_score ?? undefined,
      entryOffsetBps: row.entry_offset_bps ?? undefined,
      stopDistanceBps: row.stop_distance_bps ?? undefined,
      takeProfitRMultiple: row.take_profit_r_multiple ?? undefined,
      riskDistanceBps: row.risk_distance_bps ?? undefined,
      targetDistanceBps: row.target_distance_bps ?? undefined,
      marketRegime: row.market_regime ?? undefined,
      signalConfidenceScore: row.signal_confidence_score ?? undefined,
      trendAlignmentScore: row.trend_alignment_score ?? undefined,
      move1mBps: row.move_1m_bps ?? undefined,
      move5mBps: row.move_5m_bps ?? undefined,
      move15mBps: row.move_15m_bps ?? undefined,
      realizedVolatilityBps: row.realized_volatility_bps ?? undefined,
      spreadBps: row.spread_bps ?? undefined,
      orderBookImbalancePct: row.order_book_imbalance_pct ?? undefined,
      feeUsd: row.fee_usd,
      feeBps: row.fee_bps ?? undefined,
      grossPnlUsd: row.gross_pnl_usd ?? undefined,
      grossPnlBps: row.gross_pnl_bps ?? undefined,
      realizedPnlUsd: row.realized_pnl_usd,
      realizedPnlBps: row.realized_pnl_bps,
      featureSchemaVersion: row.feature_schema_version,
      policyVersion: row.policy_version,
      strategyVersion: row.strategy_version,
      modelVersion: row.model_version,
      extractedAt: row.extracted_at
    }));
  }

  upsertClosedTradeFeature(item: ClosedTradeFeatureRecord): void {
    const values = [
      item.tradeId,
      item.symbol,
      item.entrySide,
      item.exitReason,
      item.status,
      item.closedAt,
      item.holdSec,
      item.entryFilledQty,
      item.exitFilledQty,
      item.entryAvgPrice,
      item.exitAvgPrice,
      item.requestedQty ?? null,
      item.requestedNotionalUsd ?? null,
      item.entryLimitPrice ?? null,
      item.entrySubmittedAt ?? null,
      item.entryFirstFilledAt ?? null,
      item.entryRepriceCount ?? null,
      item.approvalMode ?? null,
      item.stopPrice ?? null,
      item.takeProfitPrice ?? null,
      item.maxHoldSecConfigured ?? null,
      item.intelligenceVersion ?? null,
      item.playbookId ?? null,
      item.entryStyle ?? null,
      item.thesisSummary ?? null,
      item.invalidationSummary ?? null,
      item.thesisConfidenceScore ?? null,
      item.tradeabilityScore ?? null,
      item.entryOffsetBps ?? null,
      item.stopDistanceBps ?? null,
      item.takeProfitRMultiple ?? null,
      item.riskDistanceBps ?? null,
      item.targetDistanceBps ?? null,
      item.marketRegime ?? null,
      item.signalConfidenceScore ?? null,
      item.trendAlignmentScore ?? null,
      item.move1mBps ?? null,
      item.move5mBps ?? null,
      item.move15mBps ?? null,
      item.realizedVolatilityBps ?? null,
      item.spreadBps ?? null,
      item.orderBookImbalancePct ?? null,
      item.feeUsd,
      item.feeBps ?? null,
      item.grossPnlUsd ?? null,
      item.grossPnlBps ?? null,
      item.realizedPnlUsd,
      item.realizedPnlBps,
      item.featureSchemaVersion,
      item.policyVersion,
      item.strategyVersion,
      item.modelVersion,
      item.extractedAt
    ];
    this.db
      .prepare(
        `INSERT OR REPLACE INTO closed_trade_features (
           trade_id, symbol, entry_side, exit_reason, status, closed_at, hold_sec,
           entry_filled_qty, exit_filled_qty, entry_avg_price, exit_avg_price,
           requested_qty, requested_notional_usd, entry_limit_price, entry_submitted_at, entry_first_filled_at, entry_reprice_count, approval_mode, stop_price, take_profit_price,
           max_hold_sec_configured, intelligence_version, playbook_id, entry_style, thesis_summary, invalidation_summary,
           thesis_confidence_score, tradeability_score, entry_offset_bps, stop_distance_bps, take_profit_r_multiple,
           risk_distance_bps, target_distance_bps, market_regime, signal_confidence_score,
           trend_alignment_score, move_1m_bps, move_5m_bps, move_15m_bps,
           realized_volatility_bps, spread_bps, order_book_imbalance_pct,
           fee_usd, fee_bps, gross_pnl_usd, gross_pnl_bps,
           realized_pnl_usd, realized_pnl_bps, feature_schema_version,
           policy_version, strategy_version, model_version, extracted_at
         ) VALUES (${new Array(values.length).fill("?").join(", ")})`
      )
      .run(...values);
  }

  deleteClosedTradeFeaturesOlderThan(cutoffIso: string): number {
    const result = this.db
      .prepare(
        `DELETE FROM closed_trade_features
         WHERE closed_at < ?`
      )
      .run(cutoffIso) as { changes?: number };
    return result.changes ?? 0;
  }

  getClosedTradeFeatureStats(): { count: number; oldestClosedAt?: string; newestClosedAt?: string } {
    const row = this.db
      .prepare(
        `SELECT
           COUNT(*) as count,
           MIN(closed_at) as oldest_closed_at,
           MAX(closed_at) as newest_closed_at
         FROM closed_trade_features`
      )
      .get() as
      | {
          count?: number;
          oldest_closed_at?: string | null;
          newest_closed_at?: string | null;
        }
      | undefined;
    return {
      count: Math.max(0, Math.floor(Number(row?.count ?? 0))),
      oldestClosedAt: row?.oldest_closed_at ?? undefined,
      newestClosedAt: row?.newest_closed_at ?? undefined
    };
  }

  listAudit(limit = 300): AuditItem[] {
    const rows = this.db
      .prepare(
        `SELECT id, at, title, detail, symbol, related_event_type
         FROM audit_entries
         ORDER BY at DESC
         LIMIT ?`
      )
      .all(limit) as Array<{
      id: string;
      at: string;
      title: string;
      detail: string;
      symbol: string | null;
      related_event_type: AuditItem["relatedEventType"] | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      at: row.at,
      title: row.title,
      detail: row.detail,
      symbol: row.symbol ?? undefined,
      relatedEventType: row.related_event_type ?? undefined
    }));
  }

  appendAudit(item: AuditItem): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO audit_entries (id, at, title, detail, symbol, related_event_type)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(item.id, item.at, item.title, item.detail, item.symbol ?? null, item.relatedEventType ?? null);

    this.db
      .prepare(
        `DELETE FROM audit_entries
         WHERE id IN (
           SELECT id FROM audit_entries
           ORDER BY at DESC
           LIMIT -1 OFFSET 300
         )`
      )
      .run();
  }

  deleteAuditOlderThan(cutoffIso: string): number {
    const result = this.db.prepare(`DELETE FROM audit_entries WHERE at < ?`).run(cutoffIso) as { changes?: number };
    return result.changes ?? 0;
  }

  deleteIncidentsOlderThan(cutoffIso: string): number {
    const result = this.db.prepare(`DELETE FROM incidents WHERE updated_at < ?`).run(cutoffIso) as { changes?: number };
    return result.changes ?? 0;
  }

  clearTransientOps(): { auditDeleted: number; incidentsDeleted: number } {
    const auditResult = this.db.prepare(`DELETE FROM audit_entries`).run() as { changes?: number };
    const incidentResult = this.db.prepare(`DELETE FROM incidents`).run() as { changes?: number };
    return {
      auditDeleted: auditResult.changes ?? 0,
      incidentsDeleted: incidentResult.changes ?? 0
    };
  }

  listIncidents(status?: IncidentStatus, limit = 300): IncidentItem[] {
    const rows = (status
      ? this.db
          .prepare(
            `SELECT * FROM incidents
             WHERE status = ?
             ORDER BY updated_at DESC
             LIMIT ?`
          )
          .all(status, limit)
      : this.db
          .prepare(
            `SELECT * FROM incidents
             ORDER BY updated_at DESC
             LIMIT ?`
          )
          .all(limit)) as Array<{
      id: string;
      status: IncidentItem["status"];
      severity: IncidentItem["severity"];
      taxonomy: IncidentItem["taxonomy"];
      title: string;
      detail: string;
      runbook_ref: string;
      symbol: string | null;
      source_alert_code: string | null;
      created_at: string;
      updated_at: string;
      owner: string | null;
      acknowledged_by: string | null;
      acknowledged_at: string | null;
      resolved_by: string | null;
      resolved_at: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      severity: row.severity,
      taxonomy: row.taxonomy,
      title: row.title,
      detail: row.detail,
      runbookRef: row.runbook_ref,
      symbol: row.symbol ?? undefined,
      sourceAlertCode: row.source_alert_code ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      owner: row.owner ?? undefined,
      acknowledgedBy: row.acknowledged_by ?? undefined,
      acknowledgedAt: row.acknowledged_at ?? undefined,
      resolvedBy: row.resolved_by ?? undefined,
      resolvedAt: row.resolved_at ?? undefined
    }));
  }

  findOpenIncidentByAlert(code: string, symbol?: string): IncidentItem | undefined {
    const row = this.db
      .prepare(
        `SELECT * FROM incidents
         WHERE source_alert_code = ?
           AND COALESCE(symbol, '') = COALESCE(?, '')
           AND status != 'resolved'
         ORDER BY updated_at DESC
         LIMIT 1`
      )
      .get(code, symbol ?? null) as
      | {
          id: string;
          status: IncidentItem["status"];
          severity: IncidentItem["severity"];
          taxonomy: IncidentItem["taxonomy"];
          title: string;
          detail: string;
          runbook_ref: string;
          symbol: string | null;
          source_alert_code: string | null;
          created_at: string;
          updated_at: string;
          owner: string | null;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      status: row.status,
      severity: row.severity,
      taxonomy: row.taxonomy,
      title: row.title,
      detail: row.detail,
      runbookRef: row.runbook_ref,
      symbol: row.symbol ?? undefined,
      sourceAlertCode: row.source_alert_code ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      owner: row.owner ?? undefined,
      acknowledgedBy: row.acknowledged_by ?? undefined,
      acknowledgedAt: row.acknowledged_at ?? undefined,
      resolvedBy: row.resolved_by ?? undefined,
      resolvedAt: row.resolved_at ?? undefined
    };
  }

  createIncident(input: IncidentCreateInput): IncidentItem {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO incidents (
          id, status, severity, taxonomy, title, detail, runbook_ref,
          symbol, source_alert_code, created_at, updated_at, owner,
          acknowledged_by, acknowledged_at, resolved_by, resolved_at
        ) VALUES (?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`
      )
      .run(
        input.id,
        input.severity,
        input.taxonomy,
        input.title,
        input.detail,
        input.runbookRef,
        input.symbol ?? null,
        input.sourceAlertCode ?? null,
        now,
        now,
        input.owner ?? null
      );

    return {
      id: input.id,
      status: "open",
      severity: input.severity,
      taxonomy: input.taxonomy,
      title: input.title,
      detail: input.detail,
      runbookRef: input.runbookRef,
      symbol: input.symbol,
      sourceAlertCode: input.sourceAlertCode,
      createdAt: now,
      updatedAt: now,
      owner: input.owner
    };
  }

  updateIncidentStatus(id: string, status: IncidentStatus, actor: string): IncidentItem | undefined {
    const current = this.db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(id) as
      | {
          id: string;
          status: IncidentItem["status"];
          severity: IncidentItem["severity"];
          taxonomy: IncidentItem["taxonomy"];
          title: string;
          detail: string;
          runbook_ref: string;
          symbol: string | null;
          source_alert_code: string | null;
          created_at: string;
          updated_at: string;
          owner: string | null;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
        }
      | undefined;

    if (!current) {
      return undefined;
    }

    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE incidents
         SET status = ?,
             updated_at = ?,
             acknowledged_by = CASE WHEN ? = 'acknowledged' THEN ? ELSE acknowledged_by END,
             acknowledged_at = CASE WHEN ? = 'acknowledged' THEN ? ELSE acknowledged_at END,
             resolved_by = CASE WHEN ? = 'resolved' THEN ? ELSE resolved_by END,
             resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE resolved_at END
         WHERE id = ?`
      )
      .run(status, now, status, actor, status, now, status, actor, status, now, id);

    const updated = this.db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(id) as {
      id: string;
      status: IncidentItem["status"];
      severity: IncidentItem["severity"];
      taxonomy: IncidentItem["taxonomy"];
      title: string;
      detail: string;
      runbook_ref: string;
      symbol: string | null;
      source_alert_code: string | null;
      created_at: string;
      updated_at: string;
      owner: string | null;
      acknowledged_by: string | null;
      acknowledged_at: string | null;
      resolved_by: string | null;
      resolved_at: string | null;
    };

    return {
      id: updated.id,
      status: updated.status,
      severity: updated.severity,
      taxonomy: updated.taxonomy,
      title: updated.title,
      detail: updated.detail,
      runbookRef: updated.runbook_ref,
      symbol: updated.symbol ?? undefined,
      sourceAlertCode: updated.source_alert_code ?? undefined,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      owner: updated.owner ?? undefined,
      acknowledgedBy: updated.acknowledged_by ?? undefined,
      acknowledgedAt: updated.acknowledged_at ?? undefined,
      resolvedBy: updated.resolved_by ?? undefined,
      resolvedAt: updated.resolved_at ?? undefined
    };
  }

  close(): void {
    this.db.close();
  }
}
