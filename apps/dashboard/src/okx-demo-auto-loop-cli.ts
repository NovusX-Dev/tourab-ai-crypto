import { readFile } from "node:fs/promises";
import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import { loadOkxDemoConfigFromEnv, OkxApiError, OkxDemoAdapter } from "@tourab/okx-demo-adapter";
import { executeProposalWithGatekeeper } from "./execution-service.js";
import { HumanApprovalError, parseBooleanEnv } from "./human-approval.js";
import { appendOrderLedgerRecord, readOrderLedger } from "./lifecycle-store.js";
import { buildValidSpotProposal, fetchSpotMarketInputs } from "./proposal-helper.js";
import { reconcileOrderLifecycle } from "./reconciliation.js";
import { parseJsonPayload, validateContextPayload } from "./cli-validation.js";

type Mode = "propose" | "execute";

interface CliArgs {
  symbol?: string;
  side?: "buy" | "sell";
  mode?: Mode;
  intervalSec?: number;
  maxCycles?: number;
  contextFile?: string;
  approvalToken?: string;
  maxRiskUsd?: number;
  maxNotionalUsd?: number;
  entryOffsetBps?: number;
  stopDistanceBps?: number;
}

interface AutoLoopEvent {
  ts: string;
  cycle: number;
  mode: Mode;
  symbol: string;
  proposalId?: string;
  status: string;
  details?: Record<string, unknown>;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === "--symbol") {
      args.symbol = value;
      i += 1;
    } else if (token === "--side" && (value === "buy" || value === "sell")) {
      args.side = value;
      i += 1;
    } else if (token === "--mode" && (value === "propose" || value === "execute")) {
      args.mode = value;
      i += 1;
    } else if (token === "--interval-sec") {
      args.intervalSec = Number(value);
      i += 1;
    } else if (token === "--max-cycles") {
      args.maxCycles = Number(value);
      i += 1;
    } else if (token === "--context-file") {
      args.contextFile = value;
      i += 1;
    } else if (token === "--approval-token") {
      args.approvalToken = value;
      i += 1;
    } else if (token === "--max-risk-usd") {
      args.maxRiskUsd = Number(value);
      i += 1;
    } else if (token === "--max-notional-usd") {
      args.maxNotionalUsd = Number(value);
      i += 1;
    } else if (token === "--entry-offset-bps") {
      args.entryOffsetBps = Number(value);
      i += 1;
    } else if (token === "--stop-distance-bps") {
      args.stopDistanceBps = Number(value);
      i += 1;
    }
  }
  return args;
}

function writeError(code: string, message: string, details?: Record<string, unknown>): void {
  process.stderr.write(`${JSON.stringify({ status: "ERROR", error: { code, message, details } }, null, 2)}\n`);
}

function writeEvent(event: AutoLoopEvent): void {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadContext(path: string) {
  const raw = await readFile(path, "utf-8");
  return validateContextPayload(parseJsonPayload(raw, path, "context"));
}

async function runCycle(
  cycle: number,
  args: Required<Pick<CliArgs, "symbol" | "side" | "mode" | "contextFile">> &
    Pick<CliArgs, "approvalToken" | "maxRiskUsd" | "maxNotionalUsd" | "entryOffsetBps" | "stopDistanceBps">
): Promise<void> {
  const symbol = args.symbol;
  const side = args.side;
  const mode = args.mode;
  const baseUrl = process.env.OKX_DEMO_BASE_URL ?? "https://www.okx.com";
  const ledgerPath = process.env.TOURAB_ORDER_LEDGER_PATH ?? "logs/order-intents.jsonl";

  const [contextBase, market] = await Promise.all([loadContext(args.contextFile), fetchSpotMarketInputs(symbol, baseUrl)]);
  const built = buildValidSpotProposal(market, {
    symbol,
    side,
    maxRiskUsd: args.maxRiskUsd ?? 0.2,
    maxNotionalUsd: args.maxNotionalUsd ?? 10,
    entryOffsetBps: args.entryOffsetBps ?? 20,
    stopDistanceBps: args.stopDistanceBps ?? 150
  });

  const context = {
    ...contextBase,
    instrument: {
      symbol: market.symbol,
      minSz: market.minSz,
      lotSz: market.lotSz,
      tickSz: market.tickSz
    },
    market: {
      markPrice: market.last
    }
  };

  const decision = evaluateTradeProposal(built.proposal, context);
  if (decision.status !== "APPROVE") {
    writeEvent({
      ts: new Date().toISOString(),
      cycle,
      mode,
      symbol,
      proposalId: built.proposal.proposalId,
      status: "REJECTED_BY_GATEKEEPER",
      details: {
        violations: decision.violations
      }
    });
    return;
  }

  if (mode === "propose") {
    writeEvent({
      ts: new Date().toISOString(),
      cycle,
      mode,
      symbol,
      proposalId: built.proposal.proposalId,
      status: "PROPOSED",
      details: {
        proposal: built.proposal,
        diagnostics: built.diagnostics
      }
    });
    return;
  }

  const adapter = new OkxDemoAdapter(loadOkxDemoConfigFromEnv(process.env));
  const [pendingOrders, fills, ledger] = await Promise.all([
    adapter.getPendingOrders(symbol),
    adapter.getFills(symbol, 100),
    readOrderLedger(ledgerPath)
  ]);
  const reconcile = reconcileOrderLifecycle(ledger, pendingOrders, fills);
  if (reconcile.summary.withDrift > 0) {
    writeEvent({
      ts: new Date().toISOString(),
      cycle,
      mode,
      symbol,
      proposalId: built.proposal.proposalId,
      status: "BLOCKED_BY_DRIFT",
      details: {
        driftCount: reconcile.summary.withDrift
      }
    });
    return;
  }
  const sameSideOpen = pendingOrders.some((o) => o.instId === symbol && o.side === side && o.state === "live");
  if (sameSideOpen) {
    writeEvent({
      ts: new Date().toISOString(),
      cycle,
      mode,
      symbol,
      proposalId: built.proposal.proposalId,
      status: "BLOCKED_BY_OPEN_ORDER",
      details: {
        reason: "Existing live order on same symbol/side."
      }
    });
    return;
  }

  const humanApprovalEnabled = parseBooleanEnv(process.env.TOURAB_HUMAN_APPROVAL_ENABLED, true);
  const result = await executeProposalWithGatekeeper(built.proposal, context, adapter, {
    enabled: humanApprovalEnabled,
    requiredToken: process.env.TOURAB_HUMAN_APPROVAL_TOKEN,
    providedToken: args.approvalToken
  });

  if (result.status === "SUBMITTED") {
    await appendOrderLedgerRecord(ledgerPath, {
      type: "ORDER_SUBMITTED",
      ts: new Date().toISOString(),
      proposalId: built.proposal.proposalId,
      symbol: built.proposal.symbol,
      side: built.proposal.side,
      qtyBase: built.proposal.qtyBase,
      limitPrice: built.proposal.entryPrice,
      ordId: result.order.ordId,
      clOrdId: result.order.clOrdId
    });
  }

  writeEvent({
    ts: new Date().toISOString(),
    cycle,
    mode,
    symbol,
    proposalId: built.proposal.proposalId,
    status: result.status,
    details: result.status === "SUBMITTED" ? { order: result.order } : { decision: result.decision }
  });
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const symbol = args.symbol ?? "BTC-USDT";
  const side = args.side ?? "buy";
  const mode = args.mode ?? "propose";
  const contextFile = args.contextFile ?? "tests/fixtures/context.valid.json";
  const intervalSec = Number.isFinite(args.intervalSec) ? Math.max(1, Math.floor(args.intervalSec!)) : 300;
  const maxCycles = Number.isFinite(args.maxCycles) ? Math.max(1, Math.floor(args.maxCycles!)) : 1;

  for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
    await runCycle(cycle, {
      symbol,
      side,
      mode,
      contextFile,
      approvalToken: args.approvalToken,
      maxRiskUsd: args.maxRiskUsd,
      maxNotionalUsd: args.maxNotionalUsd,
      entryOffsetBps: args.entryOffsetBps,
      stopDistanceBps: args.stopDistanceBps
    });

    if (cycle < maxCycles) {
      await sleep(intervalSec * 1000);
    }
  }
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
    if (error instanceof OkxApiError) {
      writeError(error.code, error.message, error.details);
      process.exit(1);
    }
    if (error instanceof HumanApprovalError) {
      writeError(error.code, error.message);
      process.exit(1);
    }
    const message = error instanceof Error ? error.message : String(error);
    writeError("UNHANDLED_ERROR", message);
    process.exit(1);
  }
}

void main();
