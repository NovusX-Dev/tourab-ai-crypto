import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

type EntryApprovalMode = "manual" | "policy_auto";

interface AutoExitDecisionTraceItem {
  at: string;
  tradeId: string;
  symbol: string;
  status: string;
  remainingQty: number;
  mark: number;
  reason?: string;
  action: string;
  detail?: string;
  repriceCount: number;
  offsetBps?: number;
  limitPrice?: number;
  exitQty?: number;
}

interface DiagnosticReport {
  startedAt: string;
  endedAt: string;
  durationSec: number;
  baseUrl: string;
  sampleCount: number;
  drainSec: number;
  pauseOnDrain: boolean;
  drainApplied: boolean;
  drainWaitSec: number;
  drainTimedOut: boolean;
  unsettledExitTradesAtDrainStart: number;
  unsettledExitTradesAfterDrain: number;
  policyAutoViolations: number;
  fallbackViolations: number;
  m5TodayPassViolations: number;
  openLearningAlertViolations: number;
  autoExitDecisionCount: number;
  autoExitSubmitFailCount: number;
  autoExitSubmittedCount: number;
  filledOpenTrades: number;
  exitPendingTrades: number;
  exitSubmittedTrades: number;
  errorTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  grossBeforeFeesRealizedPnlUsd: number;
  feesUsd: number;
  netRealizedPnlUsd: number;
  averageGrossBeforeFeesPnlPerClosedTradeUsd: number;
  averageNetPnlPerClosedTradeUsd: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  perTrade: Array<{
    tradeId: string;
    symbol: string;
    decisions: number;
    submitAttempts: number;
    submitOk: number;
    submitFailed: number;
    retries: number;
    lastAction: string;
    lastReason?: string;
    lastDetail?: string;
  }>;
  stuckTrades: Array<{
    tradeId: string;
    symbol: string;
    status: string;
    remainingQty: number;
    entryFilledQty: number;
    exitReason?: string;
    exitRepriceCount?: number;
    forcedFlattenEscalated?: boolean;
    updatedAt: string;
  }>;
}

interface ManagedTradeSnapshot {
  tradeId: string;
  symbol: string;
  status: string;
  remainingQty: number;
  entryFilledQty: number;
  feeUsd: number;
  realizedPnlUsd: number;
  exitReason?: string;
  exitRepriceCount?: number;
  forcedFlattenEscalated?: boolean;
  updatedAt: string;
}

function parseArgs(argv: string[]): {
  baseUrl: string;
  durationSec: number;
  pollMs: number;
  outDir: string;
  drainSec: number;
  pauseOnDrain: boolean;
} {
  const defaults = {
    baseUrl: "http://localhost:7071",
    durationSec: 300,
    pollMs: 5000,
    outDir: join("logs", `auto-exit-diag-${new Date().toISOString().replace(/[:.]/g, "-")}`),
    drainSec: 0,
    pauseOnDrain: true
  };
  const out = { ...defaults };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--base-url" && next) {
      out.baseUrl = next;
      i += 1;
    } else if (token === "--duration-sec" && next) {
      out.durationSec = Math.max(30, Number(next));
      i += 1;
    } else if (token === "--poll-ms" && next) {
      out.pollMs = Math.max(500, Number(next));
      i += 1;
    } else if (token === "--out-dir" && next) {
      out.outDir = next;
      i += 1;
    } else if (token === "--drain-sec" && next) {
      out.drainSec = Math.max(0, Number(next));
      i += 1;
    } else if (token === "--pause-on-drain" && next) {
      out.pauseOnDrain = next !== "0" && next.toLowerCase() !== "false";
      i += 1;
    }
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

function asSetKey(item: AutoExitDecisionTraceItem): string {
  return `${item.at}|${item.tradeId}|${item.action}|${item.reason ?? ""}|${item.repriceCount}`;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.outDir, { recursive: true });

  const headers = {
    "x-tourab-role": "operator",
    "x-user-id": "auto-exit-diag"
  };

  const startedAt = new Date().toISOString();
  const endEpoch = Date.now() + args.durationSec * 1000;

  const samples: Array<{
    at: string;
    approvalMode: EntryApprovalMode;
    fallbackActive: boolean;
    m5TodayPass: boolean;
    openLearningAlerts: number;
  }> = [];
  const decisionsByKey = new Map<string, AutoExitDecisionTraceItem>();
  let drainWaitSec = 0;
  let drainTimedOut = false;
  let unsettledExitTradesAtDrainStart = 0;
  let unsettledExitTradesAfterDrain = 0;

  while (Date.now() < endEpoch) {
    const [entry, evidence, openAlerts, decisionPayload] = await Promise.all([
      getJson<{ status: { approvalMode: EntryApprovalMode; fallbackActive: boolean } }>(
        `${args.baseUrl}/entry-autonomy/config`,
        { headers }
      ),
      getJson<{ today: { pass: boolean } }>(`${args.baseUrl}/milestone5/evidence`, { headers }),
      getJson<{ items: Array<{ code: string }> }>(`${args.baseUrl}/alerts?status=open`, { headers }),
      getJson<{ items: AutoExitDecisionTraceItem[] }>(`${args.baseUrl}/auto-exit/decision-trace?limit=5000`, {
        headers
      })
    ]);

    const now = new Date().toISOString();
    const openLearningAlerts = openAlerts.items.filter((item) => item.code.startsWith("LEARNING_")).length;
    samples.push({
      at: now,
      approvalMode: entry.status.approvalMode,
      fallbackActive: entry.status.fallbackActive,
      m5TodayPass: evidence.today.pass,
      openLearningAlerts
    });

    for (const item of decisionPayload.items) {
      decisionsByKey.set(asSetKey(item), item);
    }
    await sleep(args.pollMs);
  }

  if (args.drainSec > 0) {
    if (args.pauseOnDrain) {
      try {
        await fetch(`${args.baseUrl}/pause`, {
          method: "POST",
          headers
        });
      } catch {}
    }
    const drainDeadline = Date.now() + args.drainSec * 1000;
    const drainStartedEpoch = Date.now();
    while (Date.now() < drainDeadline) {
      const managedTradesPayload = await getJson<{ items: ManagedTradeSnapshot[] }>(`${args.baseUrl}/managed-trades`, { headers });
      const managedTrades = managedTradesPayload.items;
      const unsettledExitCount = managedTrades.filter((item) => item.status === "exit_pending" || item.status === "exit_submitted").length;
      if (unsettledExitTradesAtDrainStart === 0) {
        unsettledExitTradesAtDrainStart = unsettledExitCount;
      }
      unsettledExitTradesAfterDrain = unsettledExitCount;
      if (unsettledExitCount === 0) {
        break;
      }
      await sleep(args.pollMs);
    }
    drainWaitSec = round6((Date.now() - drainStartedEpoch) / 1000);
    drainTimedOut = unsettledExitTradesAfterDrain > 0;
  }

  const endedAt = new Date().toISOString();
  const decisions = [...decisionsByKey.values()].sort((a, b) => a.at.localeCompare(b.at));
  const managedTradesPayload = await getJson<{ items: ManagedTradeSnapshot[] }>(`${args.baseUrl}/managed-trades`, { headers });
  const managedTrades = managedTradesPayload.items;
  const byTrade = new Map<
    string,
    {
      tradeId: string;
      symbol: string;
      decisions: number;
      submitAttempts: number;
      submitOk: number;
      submitFailed: number;
      retries: number;
      lastAction: string;
      lastReason?: string;
      lastDetail?: string;
    }
  >();

  for (const item of decisions) {
    const key = item.tradeId;
    const bucket =
      byTrade.get(key) ??
      {
        tradeId: item.tradeId,
        symbol: item.symbol,
        decisions: 0,
        submitAttempts: 0,
        submitOk: 0,
        submitFailed: 0,
        retries: 0,
        lastAction: item.action,
        lastReason: item.reason,
        lastDetail: item.detail
      };
    bucket.decisions += 1;
    if (item.action === "submit_attempt") bucket.submitAttempts += 1;
    if (item.action === "submit_ok") bucket.submitOk += 1;
    if (item.action === "submit_failed") bucket.submitFailed += 1;
    if (item.action === "submit_retry") bucket.retries += 1;
    bucket.lastAction = item.action;
    bucket.lastReason = item.reason;
    bucket.lastDetail = item.detail;
    byTrade.set(key, bucket);
  }

  const policyAutoViolations = samples.filter((item) => item.approvalMode !== "policy_auto").length;
  const fallbackViolations = samples.filter((item) => item.fallbackActive).length;
  const m5TodayPassViolations = samples.filter((item) => !item.m5TodayPass).length;
  const openLearningAlertViolations = samples.filter((item) => item.openLearningAlerts > 0).length;
  const autoExitSubmitFailCount = decisions.filter((item) => item.action === "submit_failed").length;
  const autoExitSubmittedCount = decisions.filter((item) => item.action === "submit_ok").length;
  const filledOpenTrades = managedTrades.filter((item) => item.entryFilledQty > 0 && item.status !== "closed").length;
  const exitPendingTrades = managedTrades.filter((item) => item.status === "exit_pending").length;
  const exitSubmittedTrades = managedTrades.filter((item) => item.status === "exit_submitted").length;
  const errorTrades = managedTrades.filter((item) => item.status === "error").length;
  const closedTrades = managedTrades.filter((item) => item.status === "closed");
  const netRealizedPnlUsd = round6(closedTrades.reduce((sum, item) => sum + item.realizedPnlUsd, 0));
  const feesUsd = round6(closedTrades.reduce((sum, item) => sum + item.feeUsd, 0));
  const grossBeforeFeesRealizedPnlUsd = round6(netRealizedPnlUsd + feesUsd);
  const winningTrades = closedTrades.filter((item) => item.realizedPnlUsd > 0).length;
  const losingTrades = closedTrades.filter((item) => item.realizedPnlUsd < 0).length;
  const breakevenTrades = closedTrades.length - winningTrades - losingTrades;
  const averageGrossBeforeFeesPnlPerClosedTradeUsd = round6(
    grossBeforeFeesRealizedPnlUsd / Math.max(1, closedTrades.length)
  );
  const averageNetPnlPerClosedTradeUsd = round6(netRealizedPnlUsd / Math.max(1, closedTrades.length));
  const statusBreakdown = [...managedTrades.reduce((map, item) => {
    map.set(item.status, (map.get(item.status) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
  const stuckTrades = managedTrades
    .filter((item) => item.entryFilledQty > 0 && item.status !== "closed")
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(0, 20);

  const report: DiagnosticReport = {
    startedAt,
    endedAt,
    durationSec: (Date.parse(endedAt) - Date.parse(startedAt)) / 1000,
    baseUrl: args.baseUrl,
    sampleCount: samples.length,
    drainSec: args.drainSec,
    pauseOnDrain: args.pauseOnDrain,
    drainApplied: args.drainSec > 0,
    drainWaitSec,
    drainTimedOut,
    unsettledExitTradesAtDrainStart,
    unsettledExitTradesAfterDrain,
    policyAutoViolations,
    fallbackViolations,
    m5TodayPassViolations,
    openLearningAlertViolations,
    autoExitDecisionCount: decisions.length,
    autoExitSubmitFailCount,
    autoExitSubmittedCount,
    filledOpenTrades,
    exitPendingTrades,
    exitSubmittedTrades,
    errorTrades,
    closedTrades: closedTrades.length,
    winningTrades,
    losingTrades,
    breakevenTrades,
    grossBeforeFeesRealizedPnlUsd,
    feesUsd,
    netRealizedPnlUsd,
    averageGrossBeforeFeesPnlPerClosedTradeUsd,
    averageNetPnlPerClosedTradeUsd,
    statusBreakdown,
    perTrade: [...byTrade.values()].sort((a, b) => b.decisions - a.decisions),
    stuckTrades
  };

  await writeFile(join(args.outDir, "samples.json"), JSON.stringify(samples, null, 2), "utf-8");
  await writeFile(join(args.outDir, "decision-trace.json"), JSON.stringify(decisions, null, 2), "utf-8");
  await writeFile(join(args.outDir, "report.json"), JSON.stringify(report, null, 2), "utf-8");

  const summary = [
    "# Auto-Exit Decision Diagnostic",
    "",
    `- startedAt: ${startedAt}`,
    `- endedAt: ${endedAt}`,
    `- durationSec: ${report.durationSec}`,
    `- sampleCount: ${report.sampleCount}`,
    `- drainApplied: ${report.drainApplied ? "yes" : "no"}`,
    `- drainSec: ${report.drainSec}`,
    `- pauseOnDrain: ${report.pauseOnDrain ? "yes" : "no"}`,
    `- drainWaitSec: ${report.drainWaitSec}`,
    `- drainTimedOut: ${report.drainTimedOut ? "yes" : "no"}`,
    `- unsettledExitTradesAtDrainStart: ${report.unsettledExitTradesAtDrainStart}`,
    `- unsettledExitTradesAfterDrain: ${report.unsettledExitTradesAfterDrain}`,
    `- policyAutoViolations: ${policyAutoViolations}`,
    `- fallbackViolations: ${fallbackViolations}`,
    `- m5TodayPassViolations: ${m5TodayPassViolations}`,
    `- openLearningAlertViolations: ${openLearningAlertViolations}`,
    `- autoExitDecisionCount: ${report.autoExitDecisionCount}`,
    `- autoExitSubmittedCount: ${report.autoExitSubmittedCount}`,
    `- autoExitSubmitFailCount: ${report.autoExitSubmitFailCount}`,
    `- closedTrades: ${report.closedTrades}`,
    `- winningTrades: ${report.winningTrades}`,
    `- losingTrades: ${report.losingTrades}`,
    `- breakevenTrades: ${report.breakevenTrades}`,
    `- grossBeforeFeesRealizedPnlUsd: ${report.grossBeforeFeesRealizedPnlUsd}`,
    `- feesUsd: ${report.feesUsd}`,
    `- netRealizedPnlUsd: ${report.netRealizedPnlUsd}`,
    `- averageGrossBeforeFeesPnlPerClosedTradeUsd: ${report.averageGrossBeforeFeesPnlPerClosedTradeUsd}`,
    `- averageNetPnlPerClosedTradeUsd: ${report.averageNetPnlPerClosedTradeUsd}`,
    `- filledOpenTrades: ${report.filledOpenTrades}`,
    `- exitPendingTrades: ${report.exitPendingTrades}`,
    `- exitSubmittedTrades: ${report.exitSubmittedTrades}`,
    `- errorTrades: ${report.errorTrades}`,
    "",
    "## Status Breakdown",
    ...report.statusBreakdown.map((item) => `- ${item.status}: ${item.count}`),
    "",
    "## Per-Trade (Top 20)",
    ...report.perTrade.slice(0, 20).map((item) => {
      return `- tradeId=${item.tradeId} symbol=${item.symbol} decisions=${item.decisions} attempts=${item.submitAttempts} ok=${item.submitOk} failed=${item.submitFailed} retries=${item.retries} last=${item.lastAction} reason=${item.lastReason ?? "n/a"}`;
    }),
    "",
    "## Stuck Trades (Top 20)",
    ...report.stuckTrades.map((item) => {
      return `- tradeId=${item.tradeId} symbol=${item.symbol} status=${item.status} filled=${item.entryFilledQty} remaining=${item.remainingQty} reason=${item.exitReason ?? "n/a"} reprices=${item.exitRepriceCount ?? 0} forcedFlatten=${item.forcedFlattenEscalated ? "yes" : "no"} updatedAt=${item.updatedAt}`;
    })
  ];
  await writeFile(join(args.outDir, "summary.md"), summary.join("\n"), "utf-8");

  process.stdout.write(`Auto-exit diagnostic written to ${args.outDir}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
