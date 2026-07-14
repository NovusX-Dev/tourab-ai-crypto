import type { ClosedTradeFeatureRecord } from "@tourab/shared";

export interface StrategyEconomicsBucket {
  key: string;
  trades: number;
  winRatePct: number;
  netExpectancyUsd: number;
  grossExpectancyUsd: number;
  meanFeeUsd: number;
  totalNetPnlUsd: number;
  totalGrossPnlUsd: number;
  totalFeesUsd: number;
}

export interface StrategyEconomicsFinding {
  code:
    | "sample_thin"
    | "fee_dominated"
    | "gross_negative"
    | "time_stop_dominated"
    | "stop_loss_dominated"
    | "take_profit_not_paying"
    | "long_hold_weak"
    | "short_hold_weak";
  message: string;
}

export interface StrategyEconomicsReport {
  generatedAt: string;
  recordCount: number;
  filteredSymbol?: string;
  overall: StrategyEconomicsBucket;
  bySymbol: StrategyEconomicsBucket[];
  bySymbolSide: StrategyEconomicsBucket[];
  bySymbolSideRegimeStrategyVersion: StrategyEconomicsBucket[];
  byApprovalMode: StrategyEconomicsBucket[];
  byExitReason: StrategyEconomicsBucket[];
  byHoldBucket: StrategyEconomicsBucket[];
  byPlaybook: StrategyEconomicsBucket[];
  byPlaybookRegime: StrategyEconomicsBucket[];
  byEntryStyle: StrategyEconomicsBucket[];
  byRequestedNotionalBucket: StrategyEconomicsBucket[];
  byEntryOffsetBucket: StrategyEconomicsBucket[];
  byMarketRegime: StrategyEconomicsBucket[];
  byStopDistanceBucket: StrategyEconomicsBucket[];
  byTakeProfitMultipleBucket: StrategyEconomicsBucket[];
  byConfiguredMaxHoldBucket: StrategyEconomicsBucket[];
  byFeeBucket: StrategyEconomicsBucket[];
  findings: StrategyEconomicsFinding[];
  recommendations: string[];
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function holdBucket(holdSec: number): string {
  if (!Number.isFinite(holdSec) || holdSec < 0) {
    return "unknown";
  }
  if (holdSec <= 300) {
    return "0-5m";
  }
  if (holdSec <= 900) {
    return "5-15m";
  }
  if (holdSec <= 1800) {
    return "15-30m";
  }
  return "30m+";
}

function rangeBucket(value: number | undefined, boundaries: number[], labels: string[], unknown = "unknown"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return unknown;
  }
  for (let index = 0; index < boundaries.length; index += 1) {
    if (value <= boundaries[index]!) {
      return labels[index]!;
    }
  }
  return labels.at(-1) ?? unknown;
}

function requestedNotionalBucket(value: number | undefined): string {
  return rangeBucket(value, [3, 5, 8, 12], ["<=3usd", "<=5usd", "<=8usd", "<=12usd", ">12usd"]);
}

function entryOffsetBucket(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "unknown";
  }
  if (value <= -200) {
    return "<=-200bps";
  }
  if (value < -50) {
    return "-199:-51bps";
  }
  if (value <= 50) {
    return "-50:50bps";
  }
  return ">50bps";
}

function stopDistanceBucket(value: number | undefined): string {
  return rangeBucket(value, [30, 60, 100, 150], ["<=30bps", "<=60bps", "<=100bps", "<=150bps", ">150bps"]);
}

function takeProfitMultipleBucket(value: number | undefined): string {
  return rangeBucket(value, [0.5, 1, 1.5], ["<=0.5R", "<=1.0R", "<=1.5R", ">1.5R"]);
}

function configuredMaxHoldBucket(value: number | undefined): string {
  return rangeBucket(value, [300, 900, 1800], ["<=5m", "<=15m", "<=30m", ">30m"]);
}

function feeBucket(value: number | undefined): string {
  return rangeBucket(value, [5, 10, 15, 20], ["<=5bps", "<=10bps", "<=15bps", "<=20bps", ">20bps"]);
}

function summarizeBucket(key: string, records: ClosedTradeFeatureRecord[]): StrategyEconomicsBucket {
  const trades = records.length;
  const wins = records.filter((item) => item.realizedPnlUsd > 0).length;
  const totalNetPnlUsd = records.reduce((sum, item) => sum + item.realizedPnlUsd, 0);
  const totalFeesUsd = records.reduce((sum, item) => sum + item.feeUsd, 0);
  const totalGrossPnlUsd = totalNetPnlUsd + totalFeesUsd;
  return {
    key,
    trades,
    winRatePct: round6(trades > 0 ? (wins / trades) * 100 : 0),
    netExpectancyUsd: round6(trades > 0 ? totalNetPnlUsd / trades : 0),
    grossExpectancyUsd: round6(trades > 0 ? totalGrossPnlUsd / trades : 0),
    meanFeeUsd: round6(trades > 0 ? totalFeesUsd / trades : 0),
    totalNetPnlUsd: round6(totalNetPnlUsd),
    totalGrossPnlUsd: round6(totalGrossPnlUsd),
    totalFeesUsd: round6(totalFeesUsd)
  };
}

function groupBy(records: ClosedTradeFeatureRecord[], keyFn: (record: ClosedTradeFeatureRecord) => string): StrategyEconomicsBucket[] {
  const buckets = new Map<string, ClosedTradeFeatureRecord[]>();
  for (const record of records) {
    const key = keyFn(record);
    const bucket = buckets.get(key) ?? [];
    bucket.push(record);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .map(([key, items]) => summarizeBucket(key, items))
    .sort((a, b) => b.trades - a.trades || a.key.localeCompare(b.key));
}

function collectFindings(records: ClosedTradeFeatureRecord[], overall: StrategyEconomicsBucket, byExitReason: StrategyEconomicsBucket[], byHoldBucket: StrategyEconomicsBucket[]): StrategyEconomicsFinding[] {
  const findings: StrategyEconomicsFinding[] = [];
  if (records.length < 30) {
    findings.push({
      code: "sample_thin",
      message: `Only ${records.length} closed trades are available. Treat conclusions as directional, not promotable.`
    });
  }
  if (overall.grossExpectancyUsd > 0 && overall.netExpectancyUsd < 0) {
    findings.push({
      code: "fee_dominated",
      message: `Gross expectancy is positive (${overall.grossExpectancyUsd}) but net expectancy is negative (${overall.netExpectancyUsd}). Fees are overwhelming the edge.`
    });
  }
  if (overall.grossExpectancyUsd < 0) {
    findings.push({
      code: "gross_negative",
      message: `Gross expectancy is already negative (${overall.grossExpectancyUsd}). This is a signal-quality problem, not only a fee problem.`
    });
  }
  const timeStop = byExitReason.find((item) => item.key === "time_stop");
  if (timeStop && timeStop.trades / Math.max(1, records.length) >= 0.5) {
    findings.push({
      code: "time_stop_dominated",
      message: `time_stop accounts for ${round6((timeStop.trades / records.length) * 100)}% of closes. Exit geometry may be mismatched to realized move size.`
    });
  }
  const stopLoss = byExitReason.find((item) => item.key === "stop_loss");
  if (stopLoss && stopLoss.trades / Math.max(1, records.length) >= 0.5) {
    findings.push({
      code: "stop_loss_dominated",
      message: `stop_loss accounts for ${round6((stopLoss.trades / records.length) * 100)}% of closes. Entry timing may be too early or too weak.`
    });
  }
  const takeProfit = byExitReason.find((item) => item.key === "take_profit");
  if (takeProfit && takeProfit.netExpectancyUsd <= 0) {
    findings.push({
      code: "take_profit_not_paying",
      message: `take_profit closes are not paying net (${takeProfit.netExpectancyUsd}). The target is being reached, but not with enough edge to beat costs.`
    });
  }
  const longHold = byHoldBucket.find((item) => item.key === "30m+");
  if (longHold && longHold.netExpectancyUsd <= 0) {
    findings.push({
      code: "long_hold_weak",
      message: `Longer holds (30m+) are not producing positive net expectancy (${longHold.netExpectancyUsd}).`
    });
  }
  const shortHold = byHoldBucket.find((item) => item.key === "0-5m");
  if (shortHold && shortHold.netExpectancyUsd <= 0) {
    findings.push({
      code: "short_hold_weak",
      message: `Very short holds (0-5m) are not producing positive net expectancy (${shortHold.netExpectancyUsd}).`
    });
  }
  return findings;
}

function buildRecommendations(findings: StrategyEconomicsFinding[]): string[] {
  const recommendations: string[] = [];
  if (findings.some((item) => item.code === "fee_dominated")) {
    recommendations.push("Raise the minimum expected-move hurdle so trades do not fire unless projected gross edge comfortably exceeds round-trip fees.");
    recommendations.push("Test fewer, higher-conviction entries rather than increasing trade count or size.");
  }
  if (findings.some((item) => item.code === "gross_negative")) {
    recommendations.push("Redesign the entry hypothesis itself before spending more time on exit tuning.");
  }
  if (findings.some((item) => item.code === "time_stop_dominated")) {
    recommendations.push("Run offline counterfactual exit studies on the same entry timestamps with tighter and looser hold/TP/SL geometry.");
  }
  if (findings.some((item) => item.code === "stop_loss_dominated")) {
    recommendations.push("Investigate entry timing and regime filters; current entries are too often wrong immediately.");
  }
  if (findings.some((item) => item.code === "take_profit_not_paying")) {
    recommendations.push("Measure slippage and fees on take-profit exits separately. Reaching target is not enough if capture is too small after costs.");
  }
  if (findings.some((item) => item.code === "sample_thin")) {
    recommendations.push("Do not promote or overfit from this sample. Use it only to rank the next controlled experiments.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Current cohorts do not show an obvious single failure mode. Continue with symbol-side and regime segmentation before changing live logic.");
  }
  return recommendations;
}

export function buildStrategyEconomicsReport(input: {
  generatedAt: string;
  records: ClosedTradeFeatureRecord[];
  symbol?: string;
}): StrategyEconomicsReport {
  const filtered = input.symbol
    ? input.records.filter((item) => item.symbol.toUpperCase() === input.symbol!.trim().toUpperCase())
    : [...input.records];
  const overall = summarizeBucket(input.symbol?.trim().toUpperCase() ?? "ALL", filtered);
  const bySymbol = groupBy(filtered, (item) => item.symbol);
  const bySymbolSide = groupBy(filtered, (item) => `${item.symbol}|${item.entrySide}`);
  const bySymbolSideRegimeStrategyVersion = groupBy(
    filtered,
    (item) => `${item.symbol}|${item.entrySide}|${item.marketRegime ?? "unknown"}|${item.strategyVersion || "unknown"}`
  );
  const byApprovalMode = groupBy(filtered, (item) => item.approvalMode ?? "unknown");
  const byExitReason = groupBy(filtered, (item) => item.exitReason);
  const byHoldBucket = groupBy(filtered, (item) => holdBucket(item.holdSec));
  const byPlaybook = groupBy(filtered, (item) => item.playbookId ?? "unknown");
  const byPlaybookRegime = groupBy(filtered, (item) => `${item.playbookId ?? "unknown"}|${item.marketRegime ?? "unknown"}`);
  const byEntryStyle = groupBy(filtered, (item) => item.entryStyle ?? "unknown");
  const byRequestedNotionalBucket = groupBy(filtered, (item) => requestedNotionalBucket(item.requestedNotionalUsd));
  const byEntryOffsetBucket = groupBy(filtered, (item) => entryOffsetBucket(item.entryOffsetBps));
  const byMarketRegime = groupBy(filtered, (item) => item.marketRegime ?? "unknown");
  const byStopDistanceBucket = groupBy(filtered, (item) => stopDistanceBucket(item.stopDistanceBps));
  const byTakeProfitMultipleBucket = groupBy(filtered, (item) => takeProfitMultipleBucket(item.takeProfitRMultiple));
  const byConfiguredMaxHoldBucket = groupBy(filtered, (item) => configuredMaxHoldBucket(item.maxHoldSecConfigured));
  const byFeeBucket = groupBy(filtered, (item) => feeBucket(item.feeBps));
  const findings = collectFindings(filtered, overall, byExitReason, byHoldBucket);
  const recommendations = buildRecommendations(findings);
  return {
    generatedAt: input.generatedAt,
    recordCount: filtered.length,
    filteredSymbol: input.symbol?.trim().toUpperCase(),
    overall,
    bySymbol,
    bySymbolSide,
    bySymbolSideRegimeStrategyVersion,
    byApprovalMode,
    byExitReason,
    byHoldBucket,
    byPlaybook,
    byPlaybookRegime,
    byEntryStyle,
    byRequestedNotionalBucket,
    byEntryOffsetBucket,
    byMarketRegime,
    byStopDistanceBucket,
    byTakeProfitMultipleBucket,
    byConfiguredMaxHoldBucket,
    byFeeBucket,
    findings,
    recommendations
  };
}
