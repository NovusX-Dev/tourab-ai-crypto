import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ClosedTradeFeatureRecord } from "@tourab/shared";
import { buildStrategyEconomicsReport } from "../apps/dashboard/src/learning/strategy-economics.js";

function parseArgs(argv: string[]): {
  dbPath: string;
  outDir: string;
  limit: number;
  symbol?: string;
} {
  const out = {
    dbPath: join("logs", "mission-ops.sqlite"),
    outDir: join("logs", `strategy-economics-${new Date().toISOString().replace(/[:.]/g, "-")}`),
    limit: 5000,
    symbol: undefined as string | undefined
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === "--db-path" && value) {
      out.dbPath = value;
      i += 1;
    } else if (token === "--out-dir" && value) {
      out.outDir = value;
      i += 1;
    } else if (token === "--limit" && value) {
      out.limit = Math.max(1, Math.floor(Number(value) || out.limit));
      i += 1;
    } else if (token === "--symbol" && value) {
      out.symbol = value.trim().toUpperCase();
      i += 1;
    }
  }
  return out;
}

function readClosedTradeFeatures(dbPath: string, limit: number): ClosedTradeFeatureRecord[] {
  const db = new DatabaseSync(dbPath, { readonly: true });
  const columns = new Set(
    (db.prepare(`PRAGMA table_info(closed_trade_features)`).all() as Array<{ name: string }>).map((row) => row.name)
  );
  const hasMarketRegime = columns.has("market_regime");
  const hasSignalConfidence = columns.has("signal_confidence_score");
  const hasTrendAlignment = columns.has("trend_alignment_score");
  const hasMove1m = columns.has("move_1m_bps");
  const hasMove5m = columns.has("move_5m_bps");
  const hasMove15m = columns.has("move_15m_bps");
  const hasRealizedVolatility = columns.has("realized_volatility_bps");
  const hasSpread = columns.has("spread_bps");
  const hasOrderBookImbalance = columns.has("order_book_imbalance_pct");
  const rows = db
    .prepare(
      `SELECT
         trade_id, symbol, entry_side, exit_reason, status, closed_at, hold_sec,
         entry_filled_qty, exit_filled_qty, entry_avg_price, exit_avg_price,
         requested_qty, requested_notional_usd, approval_mode, stop_price, take_profit_price,
         max_hold_sec_configured, entry_offset_bps, stop_distance_bps, take_profit_r_multiple,
         risk_distance_bps, target_distance_bps,
         ${hasMarketRegime ? "market_regime" : "NULL as market_regime"},
         ${hasSignalConfidence ? "signal_confidence_score" : "NULL as signal_confidence_score"},
         ${hasTrendAlignment ? "trend_alignment_score" : "NULL as trend_alignment_score"},
         ${hasMove1m ? "move_1m_bps" : "NULL as move_1m_bps"},
         ${hasMove5m ? "move_5m_bps" : "NULL as move_5m_bps"},
         ${hasMove15m ? "move_15m_bps" : "NULL as move_15m_bps"},
         ${hasRealizedVolatility ? "realized_volatility_bps" : "NULL as realized_volatility_bps"},
         ${hasSpread ? "spread_bps" : "NULL as spread_bps"},
         ${hasOrderBookImbalance ? "order_book_imbalance_pct" : "NULL as order_book_imbalance_pct"},
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
    approval_mode: "manual" | "policy_auto" | null;
    stop_price: number | null;
    take_profit_price: number | null;
    max_hold_sec_configured: number | null;
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
    approvalMode: row.approval_mode ?? undefined,
    stopPrice: row.stop_price ?? undefined,
    takeProfitPrice: row.take_profit_price ?? undefined,
    maxHoldSecConfigured: row.max_hold_sec_configured ?? undefined,
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

function bucketLines(title: string, buckets: Array<{ key: string; trades: number; winRatePct: number; grossExpectancyUsd: number; meanFeeUsd: number; netExpectancyUsd: number }>, top = 8): string[] {
  return [
    `## ${title}`,
    ...buckets.slice(0, top).map((item) => `- ${item.key}: trades=${item.trades} winRatePct=${item.winRatePct} grossExpUsd=${item.grossExpectancyUsd} meanFeeUsd=${item.meanFeeUsd} netExpUsd=${item.netExpectancyUsd}`)
  ];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.outDir, { recursive: true });
  const records = readClosedTradeFeatures(args.dbPath, args.limit);
  const report = buildStrategyEconomicsReport({
    generatedAt: new Date().toISOString(),
    records,
    symbol: args.symbol
  });
  const reportPath = join(args.outDir, "report.json");
  const summaryPath = join(args.outDir, "summary.md");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  const lines = [
    "# Strategy Economics Report",
    "",
    `- generatedAt: ${report.generatedAt}`,
    `- dbPath: ${args.dbPath}`,
    `- filteredSymbol: ${report.filteredSymbol ?? "ALL"}`,
    `- recordCount: ${report.recordCount}`,
    "",
    "## Overall",
    `- trades: ${report.overall.trades}`,
    `- winRatePct: ${report.overall.winRatePct}`,
    `- grossExpectancyUsd: ${report.overall.grossExpectancyUsd}`,
    `- meanFeeUsd: ${report.overall.meanFeeUsd}`,
    `- netExpectancyUsd: ${report.overall.netExpectancyUsd}`,
    `- totalGrossPnlUsd: ${report.overall.totalGrossPnlUsd}`,
    `- totalFeesUsd: ${report.overall.totalFeesUsd}`,
    `- totalNetPnlUsd: ${report.overall.totalNetPnlUsd}`,
    "",
    "## Findings",
    ...report.findings.map((item) => `- ${item.code}: ${item.message}`),
    "",
    "## Recommendations",
    ...report.recommendations.map((item) => `- ${item}`),
    "",
    ...bucketLines("By Symbol", report.bySymbol),
    "",
    ...bucketLines("By Symbol Side", report.bySymbolSide),
    "",
    ...bucketLines("By Symbol Side Regime Strategy", report.bySymbolSideRegimeStrategyVersion),
    "",
    ...bucketLines("By Approval Mode", report.byApprovalMode),
    "",
    ...bucketLines("By Exit Reason", report.byExitReason),
    "",
    ...bucketLines("By Hold Bucket", report.byHoldBucket),
    "",
    ...bucketLines("By Requested Notional", report.byRequestedNotionalBucket),
    "",
    ...bucketLines("By Entry Offset", report.byEntryOffsetBucket),
    "",
    ...bucketLines("By Market Regime", report.byMarketRegime),
    "",
    ...bucketLines("By Stop Distance", report.byStopDistanceBucket),
    "",
    ...bucketLines("By Take-Profit Multiple", report.byTakeProfitMultipleBucket),
    "",
    ...bucketLines("By Configured Max Hold", report.byConfiguredMaxHoldBucket),
    "",
    ...bucketLines("By Fee Bucket", report.byFeeBucket),
    "",
    "## Artifacts",
    `- summary: ${summaryPath}`,
    `- report: ${reportPath}`
  ];
  await writeFile(summaryPath, lines.join("\n"), "utf-8");
  process.stdout.write(`Strategy economics report written to ${args.outDir}\n`);
  process.stdout.write(`Summary: ${summaryPath}\n`);
  process.stdout.write(`Report: ${reportPath}\n`);
}

void main();
