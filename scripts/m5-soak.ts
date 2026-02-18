import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

type ApprovalAction = "start" | "pause" | "resume" | "stop" | "cancel_all" | "emergency_stop" | "demo_order_submit";

interface ApprovalItem {
  id: string;
  action: ApprovalAction;
  status: "pending" | "approved" | "rejected" | "expired";
  requestedAt: string;
  expiresAt: string;
}

interface ManagedTradeItem {
  tradeId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  entryFilledQty: number;
  exitReason?: string;
  realizedPnlUsd: number;
  feeUsd: number;
}

interface SnapshotPayload {
  exchange?: {
    connected?: boolean;
    mode?: string;
    lastError?: string;
  };
  reconciliation: {
    positions: string;
    pnl: string;
    orders: string;
    lastRunAt: string;
  };
}

interface SoakReport {
  startedAt: string;
  endedAt: string;
  durationSec: number;
  baseUrl: string;
  samples: number;
  approvalsAutoExecuted: number;
  approvalExecFailures: number;
  totals: {
    managedTrades: number;
    filledEntries: number;
    closedTrades: number;
    deterministicClosed: number;
    manualOrCircuitClosed: number;
    tradeErrors: number;
    uniqueTradeIds: number;
    duplicateTradeIds: number;
    closedMissingRequiredFields: number;
    reconciliationNonOkSamples: number;
  };
  checks: {
    closureRatePct: number;
    closureRatePass: boolean;
    closedTradeDataPass: boolean;
    reconciliationSloObservedPass: boolean;
    reconciliation7DayEvidenceAvailable: boolean;
  };
  notes: string[];
}

function parseArgs(argv: string[]): {
  baseUrl: string;
  durationSec: number;
  pollMs: number;
  drainSec: number;
  settleMinSec: number;
  settleMaxSec: number;
  settleStableCycles: number;
  cleanStart: boolean;
  outDir: string;
  maxHoldSec: number;
  tpR: number;
  exitOffsetBps: number;
} {
  const defaults = {
    baseUrl: "http://localhost:7071",
    durationSec: 600,
    pollMs: 2000,
    drainSec: 120,
    settleMinSec: 180,
    settleMaxSec: 300,
    settleStableCycles: 20,
    cleanStart: false,
    outDir: join("logs", `m5-soak-${new Date().toISOString().replace(/[:.]/g, "-")}`),
    maxHoldSec: 90,
    tpR: 0.75,
    exitOffsetBps: 5
  };
  const out = { ...defaults };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    const v = argv[i + 1];
    if (t === "--base-url" && v) {
      out.baseUrl = v;
      i += 1;
    } else if (t === "--duration-sec" && v) {
      out.durationSec = Math.max(30, Number(v));
      i += 1;
    } else if (t === "--poll-ms" && v) {
      out.pollMs = Math.max(250, Number(v));
      i += 1;
    } else if (t === "--drain-sec" && v) {
      out.drainSec = Math.max(0, Number(v));
      i += 1;
    } else if (t === "--settle-min-sec" && v) {
      out.settleMinSec = Math.max(0, Number(v));
      i += 1;
    } else if (t === "--settle-max-sec" && v) {
      out.settleMaxSec = Math.max(0, Number(v));
      i += 1;
    } else if (t === "--settle-stable-cycles" && v) {
      out.settleStableCycles = Math.max(1, Number(v));
      i += 1;
    } else if (t === "--clean-start") {
      out.cleanStart = true;
    } else if (t === "--out-dir" && v) {
      out.outDir = v;
      i += 1;
    } else if (t === "--max-hold-sec" && v) {
      out.maxHoldSec = Math.max(30, Number(v));
      i += 1;
    } else if (t === "--tp-r" && v) {
      out.tpR = Math.max(0.25, Number(v));
      i += 1;
    } else if (t === "--exit-offset-bps" && v) {
      out.exitOffsetBps = Math.max(0, Number(v));
      i += 1;
    }
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  let lastError: Error | undefined;
  const attempts = 4;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, init);
      if (res.ok) {
        return (await res.json()) as T;
      }
      lastError = new Error(`HTTP ${res.status} for ${url}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = new Error(`Network request failed for ${url}: ${message}`);
    }
    if (i < attempts - 1) {
      await sleep(300 * (i + 1));
    }
  }
  throw lastError ?? new Error(`Request failed for ${url}`);
}

async function postJson<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

async function postRaw(url: string, headers?: Record<string, string>): Promise<Response> {
  try {
    return await fetch(url, {
      method: "POST",
      headers
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Network request failed for ${url}: ${message}`);
  }
}

async function waitForHealthyBaseUrl(
  baseUrl: string,
  attempts = 30,
  delayMs = 1000
): Promise<{ ok: boolean; state: string; exchangeConnected?: boolean; exchangeMode?: string }> {
  let lastError: Error | undefined;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const health = await getJson<{ ok: boolean; state: string }>(`${baseUrl}/health`);
      return health;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < attempts - 1) {
        await sleep(delayMs);
      }
    }
  }
  throw new Error(
    `Mission Control is unreachable at ${baseUrl}. Start the backend first (npm run mission-control:server). Last error: ${lastError?.message ?? "unknown"}`
  );
}

async function assertDemoExchangeReady(baseUrl: string): Promise<void> {
  const snapshot = await getJson<SnapshotPayload>(`${baseUrl}/snapshot`);
  const connected = Boolean(snapshot.exchange?.connected);
  const mode = snapshot.exchange?.mode ?? "unknown";
  if (mode !== "demo") {
    throw new Error(`Exchange mode is '${mode}', expected 'demo'. Set OKX_TRADING_MODE=demo.`);
  }
  if (!connected) {
    const lastError = snapshot.exchange?.lastError ? ` lastError=${snapshot.exchange.lastError}` : "";
    throw new Error(
      `Demo exchange is not connected.${lastError} Run 'npm run okx:demo:health -- --ccy USDT' and fix OKX demo credentials before soak.`
    );
  }
}

async function performControlAction(
  baseUrl: string,
  actionPath: "/start" | "/resume" | "/pause",
  headers: Record<string, string>
): Promise<{ ok: boolean; code?: string; details?: Record<string, unknown> }> {
  const res = await postRaw(`${baseUrl}${actionPath}`, headers);
  let payload: Record<string, unknown> | undefined;
  try {
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    payload = undefined;
  }
  if (res.ok) {
    return { ok: true, code: String(payload?.code ?? "OK"), details: payload?.details as Record<string, unknown> | undefined };
  }
  return { ok: false, code: String(payload?.code ?? `HTTP_${res.status}`), details: payload?.details as Record<string, unknown> | undefined };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.outDir, { recursive: true });

  const operatorHeaders = {
    "x-tourab-role": "operator",
    "x-user-id": "m5-soak-runner"
  };

  const notes: string[] = [];
  const startedAt = new Date().toISOString();
  const health = await waitForHealthyBaseUrl(args.baseUrl);
  if (!health.ok) {
    throw new Error("Mission control health endpoint returned not-ok.");
  }
  await assertDemoExchangeReady(args.baseUrl);

  if (args.cleanStart) {
    const clearResult = await postJson<{ ok: boolean; code?: string; details?: Record<string, unknown> }>(
      `${args.baseUrl}/maintenance/clear-streams`,
      {},
      operatorHeaders
    );
    notes.push(`Clean-start maintenance clear result: ${clearResult.code ?? (clearResult.ok ? "OK" : "UNKNOWN")}`);
  }

  await postJson<{ config: unknown }>(
    `${args.baseUrl}/auto-exit/config`,
    {
      enabled: true,
      maxHoldSec: args.maxHoldSec,
      takeProfitRMultiple: args.tpR,
      exitOffsetBps: args.exitOffsetBps
    },
    operatorHeaders
  );

  const startAttempt = await performControlAction(args.baseUrl, "/start", operatorHeaders);
  if (!startAttempt.ok) {
    const resumeAttempt = await performControlAction(args.baseUrl, "/resume", operatorHeaders);
    if (!resumeAttempt.ok) {
      notes.push(`Unable to move bot to running state: start=${startAttempt.code} resume=${resumeAttempt.code}`);
    }
  }
  const postStartHealth = await getJson<{ ok: boolean; state: string }>(`${args.baseUrl}/health`);
  if (postStartHealth.state !== "running") {
    throw new Error(`Bot state is '${postStartHealth.state}' after start/resume attempts; soak requires running state.`);
  }

  const endEpoch = Date.now() + args.durationSec * 1000;
  let approvalsAutoExecuted = 0;
  let approvalExecFailures = 0;
  let samples = 0;
  let reconciliationNonOkSamples = 0;
  const seenApprovals = new Set<string>();

  while (Date.now() < endEpoch) {
    const approvalsPayload = await getJson<{ items: ApprovalItem[] }>(`${args.baseUrl}/approvals?status=pending`);
    for (const approval of approvalsPayload.items) {
      if (approval.action !== "demo_order_submit" || seenApprovals.has(approval.id)) {
        continue;
      }
      seenApprovals.add(approval.id);
      try {
        await postRaw(`${args.baseUrl}/approvals/${approval.id}/approve`, operatorHeaders);
        const execute = await postRaw(`${args.baseUrl}/demo-order-submit`, {
          ...operatorHeaders,
          "x-approval-id": approval.id
        });
        if (execute.ok) {
          approvalsAutoExecuted += 1;
        } else {
          approvalExecFailures += 1;
        }
      } catch {
        approvalExecFailures += 1;
      }
    }

    const snapshot = await getJson<SnapshotPayload>(`${args.baseUrl}/snapshot`);
    samples += 1;
    if (snapshot.reconciliation.positions !== "ok" || snapshot.reconciliation.pnl !== "ok" || snapshot.reconciliation.orders !== "ok") {
      reconciliationNonOkSamples += 1;
    }

    await sleep(args.pollMs);
  }

  const pauseAttempt = await performControlAction(args.baseUrl, "/pause", operatorHeaders);
  notes.push(`Drain phase pause action result: ${pauseAttempt.code ?? (pauseAttempt.ok ? "OK" : "UNKNOWN")}`);
  const drainEndEpoch = Date.now() + args.drainSec * 1000;
  while (Date.now() < drainEndEpoch) {
    const snapshot = await getJson<SnapshotPayload>(`${args.baseUrl}/snapshot`);
    samples += 1;
    if (snapshot.reconciliation.positions !== "ok" || snapshot.reconciliation.pnl !== "ok" || snapshot.reconciliation.orders !== "ok") {
      reconciliationNonOkSamples += 1;
    }
    await sleep(args.pollMs);
  }

  const soakStartEpoch = Date.parse(startedAt);
  const inWindow = (item: ManagedTradeItem, soakEndEpoch: number): boolean => {
    const ref = item.createdAt ?? item.updatedAt;
    if (!ref) {
      return true;
    }
    const epoch = Date.parse(ref);
    if (!Number.isFinite(epoch)) {
      return true;
    }
    return epoch >= soakStartEpoch && epoch <= soakEndEpoch;
  };

  const fetchWindowTrades = async (soakEndEpoch: number): Promise<ManagedTradeItem[]> => {
    const managedTradesPayload = await getJson<{ items: ManagedTradeItem[] }>(`${args.baseUrl}/managed-trades`);
    return managedTradesPayload.items.filter((item) => inWindow(item, soakEndEpoch));
  };

  // After pause+drain, wait for in-window filled trades to settle before scoring.
  const settleDeadlineEpoch = Date.now() + args.settleMaxSec * 1000;
  let settleCycles = 0;
  let stableCycles = 0;
  let previousPendingFilled = Number.POSITIVE_INFINITY;
  const settleStartEpoch = Date.now();
  let managedTrades: ManagedTradeItem[] = [];
  while (true) {
    const settleNowIso = new Date().toISOString();
    const settleNowEpoch = Date.parse(settleNowIso);
    managedTrades = await fetchWindowTrades(settleNowEpoch);
    const pendingFilled = managedTrades.filter((item) => item.entryFilledQty > 0 && item.status !== "closed").length;
    settleCycles += 1;
    if (pendingFilled === previousPendingFilled) {
      stableCycles += 1;
    } else {
      stableCycles = 0;
      previousPendingFilled = pendingFilled;
    }
    if (pendingFilled === 0) {
      notes.push(`Settlement convergence reached: no pending filled trades after ${settleCycles} settle cycles.`);
      break;
    }
    if (Date.now() >= settleDeadlineEpoch) {
      notes.push(
        `Settlement convergence timeout after ${args.settleMaxSec}s; pending filled trades=${pendingFilled}.`
      );
      break;
    }
    const settleElapsedSec = Math.floor((Date.now() - settleStartEpoch) / 1000);
    if (settleElapsedSec >= args.settleMinSec && stableCycles >= args.settleStableCycles) {
      notes.push(
        `Settlement plateau detected after ${settleCycles} settle cycles (${settleElapsedSec}s); pending filled trades=${pendingFilled}.`
      );
      break;
    }
    const snapshot = await getJson<SnapshotPayload>(`${args.baseUrl}/snapshot`);
    samples += 1;
    if (snapshot.reconciliation.positions !== "ok" || snapshot.reconciliation.pnl !== "ok" || snapshot.reconciliation.orders !== "ok") {
      reconciliationNonOkSamples += 1;
    }
    await sleep(args.pollMs);
  }

  const endedAt = new Date().toISOString();

  const filledEntries = managedTrades.filter((item) => item.entryFilledQty > 0);
  const closedTrades = managedTrades.filter((item) => item.status === "closed");
  const deterministicClosed = closedTrades.filter((item) =>
    item.exitReason === "stop_loss" || item.exitReason === "take_profit" || item.exitReason === "time_stop" || item.exitReason === "flatten"
  );
  const manualOrCircuitClosed = closedTrades.filter((item) => item.exitReason === "manual" || item.exitReason === "circuit_breaker");
  const tradeErrors = managedTrades.filter((item) => item.status === "error");
  const uniqueTradeIds = new Set(managedTrades.map((item) => item.tradeId));
  const duplicateTradeIds = managedTrades.length - uniqueTradeIds.size;
  const closedMissingRequiredFields = closedTrades.filter((item) => {
    return !item.exitReason || !Number.isFinite(item.realizedPnlUsd) || !Number.isFinite(item.feeUsd);
  }).length;

  const closureRatePct = filledEntries.length > 0 ? (deterministicClosed.length / filledEntries.length) * 100 : 0;
  const closureRatePass = filledEntries.length > 0 && closureRatePct >= 95;
  const closedTradeDataPass = closedMissingRequiredFields === 0 && duplicateTradeIds === 0;
  const reconciliationSloObservedPass = reconciliationNonOkSamples === 0;

  notes.push("Criterion #3 requires 7 qualifying calendar demo days. This run provides baseline only.");
  notes.push(`Run duration was ${args.durationSec}s with ${samples} samples.`);

  const report: SoakReport = {
    startedAt,
    endedAt,
    durationSec: args.durationSec,
    baseUrl: args.baseUrl,
    samples,
    approvalsAutoExecuted,
    approvalExecFailures,
    totals: {
      managedTrades: managedTrades.length,
      filledEntries: filledEntries.length,
      closedTrades: closedTrades.length,
      deterministicClosed: deterministicClosed.length,
      manualOrCircuitClosed: manualOrCircuitClosed.length,
      tradeErrors: tradeErrors.length,
      uniqueTradeIds: uniqueTradeIds.size,
      duplicateTradeIds,
      closedMissingRequiredFields,
      reconciliationNonOkSamples
    },
    checks: {
      closureRatePct: Number(closureRatePct.toFixed(2)),
      closureRatePass,
      closedTradeDataPass,
      reconciliationSloObservedPass,
      reconciliation7DayEvidenceAvailable: false
    },
    notes
  };

  const reportPath = join(args.outDir, "report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");

  const summaryLines = [
    "# Milestone 5 Soak Report",
    "",
    `- startedAt: ${report.startedAt}`,
    `- endedAt: ${report.endedAt}`,
    `- durationSec: ${report.durationSec}`,
    `- cleanStart: ${args.cleanStart}`,
    `- drainSec: ${args.drainSec}`,
    `- approvalsAutoExecuted: ${report.approvalsAutoExecuted}`,
    `- approvalExecFailures: ${report.approvalExecFailures}`,
    `- filledEntries: ${report.totals.filledEntries}`,
    `- deterministicClosed: ${report.totals.deterministicClosed}`,
    `- closureRatePct: ${report.checks.closureRatePct}`,
    `- closureRatePass(>=95): ${report.checks.closureRatePass}`,
    `- closedTradeDataPass: ${report.checks.closedTradeDataPass}`,
    `- reconciliationSloObservedPass: ${report.checks.reconciliationSloObservedPass}`,
    `- reconciliation7DayEvidenceAvailable: ${report.checks.reconciliation7DayEvidenceAvailable}`,
    "",
    "## Notes",
    ...report.notes.map((n) => `- ${n}`)
  ];
  await writeFile(join(args.outDir, "summary.md"), summaryLines.join("\n"), "utf-8");

  process.stdout.write(`M5 soak artifacts written to ${args.outDir}\n`);
  process.stdout.write(`Report: ${reportPath}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
