import { readFile } from "node:fs/promises";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { loadOkxDemoConfigFromEnv, OkxApiError, OkxDemoAdapter } from "@tourab/okx-demo-adapter";
import { executeProposalWithGatekeeper } from "./execution-service.js";
import { HumanApprovalError, parseBooleanEnv } from "./human-approval.js";
import { appendOrderLedgerRecord } from "./lifecycle-store.js";
import { fetchSpotMarketInputs } from "./proposal-helper.js";
import {
  CliStructuredError,
  parseJsonPayload,
  validateContextPayload,
  validateProposalPayload
} from "./cli-validation.js";
import { ExecutionInvariantError } from "./execution-service.js";

interface CliArgs {
  proposalFile?: string;
  contextFile?: string;
  approvalToken?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--proposal-file") {
      args.proposalFile = argv[i + 1];
      i += 1;
    } else if (token === "--context-file") {
      args.contextFile = argv[i + 1];
      i += 1;
    } else if (token === "--approval-token") {
      args.approvalToken = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function readJson(path: string): Promise<string> {
  return readFile(path, "utf-8");
}

function writeError(error: CliStructuredError | { code: string; message: string; details?: Record<string, unknown> }): void {
  process.stderr.write(
    `${JSON.stringify(
      {
        status: "ERROR",
        error
      },
      null,
      2
    )}\n`
  );
}

function isCliStructuredError(error: unknown): error is CliStructuredError {
  return typeof error === "object" && error !== null && "code" in error;
}

function isOkxApiError(error: unknown): error is OkxApiError {
  return error instanceof OkxApiError;
}

function isHumanApprovalError(error: unknown): error is HumanApprovalError {
  return error instanceof HumanApprovalError;
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.proposalFile || !args.contextFile) {
    throw <CliStructuredError>{
      code: "USAGE_ERROR",
      message:
        "Usage: npm run okx:demo:execute -- --proposal-file <proposal.json> --context-file <context.json> [--approval-token <token>]"
    };
  }

  const [proposalRaw, contextRaw] = await Promise.all([readJson(args.proposalFile), readJson(args.contextFile)]);
  const proposal = validateProposalPayload(parseJsonPayload(proposalRaw, args.proposalFile, "proposal"));
  const context = validateContextPayload(parseJsonPayload(contextRaw, args.contextFile, "context"));

  const config = loadOkxDemoConfigFromEnv(process.env);
  const adapter = new OkxDemoAdapter(config);
  const freshnessEnabled = parseBooleanEnv(process.env.TOURAB_FRESHNESS_GUARD_ENABLED, true);
  if (freshnessEnabled) {
    const [accountBalance, pendingOrders, market] = await Promise.all([
      adapter.getAccountBalance("USDT"),
      adapter.getPendingOrders(proposal.symbol),
      fetchSpotMarketInputs(proposal.symbol, config.baseUrl)
    ]);
    const now = new Date().toISOString();
    const totalEq = Number(accountBalance.totalEq);
    context.account = {
      ...context.account,
      equityUsd: Number.isFinite(totalEq) && totalEq > 0 ? totalEq : context.account.equityUsd,
      asOf: now
    };
    context.market = {
      ...context.market,
      markPrice: market.last,
      asOf: now
    };
    context.ordersAsOf = pendingOrders ? now : context.ordersAsOf;
  }
  const humanApprovalEnabled = parseBooleanEnv(process.env.TOURAB_HUMAN_APPROVAL_ENABLED, true);
  const requiredApprovalToken = process.env.TOURAB_HUMAN_APPROVAL_TOKEN;
  const result = await executeProposalWithGatekeeper(proposal, context, adapter, {
    async write(event) {
      const auditPath = process.env.TOURAB_PROPOSAL_AUDIT_PATH ?? "logs/proposal-audit.jsonl";
      await mkdir(dirname(auditPath), { recursive: true });
      await appendFile(auditPath, `${JSON.stringify(event)}\n`, "utf-8");
    }
  }, {
    enabled: humanApprovalEnabled,
    requiredToken: requiredApprovalToken,
    providedToken: args.approvalToken,
    approvedProposalId: proposal.proposalId,
    expiresAtIso: process.env.TOURAB_HUMAN_APPROVAL_EXPIRES_AT
  }, {
    actor: "cli-operator",
    executionMode: (process.env.TOURAB_EXECUTION_MODE as "proposal_only" | "demo_execution_enabled" | undefined) ?? "proposal_only",
    freshness: {
      enabled: freshnessEnabled,
      maxMarketAgeMs: Number(process.env.TOURAB_MAX_MARKET_AGE_MS ?? "15000"),
      maxAccountAgeMs: Number(process.env.TOURAB_MAX_ACCOUNT_AGE_MS ?? "60000"),
      maxOrdersAgeMs: Number(process.env.TOURAB_MAX_ORDERS_AGE_MS ?? "60000")
    }
  });
  if (result.status === "SUBMITTED") {
    const ledgerPath = process.env.TOURAB_ORDER_LEDGER_PATH ?? "logs/order-intents.jsonl";
    await appendOrderLedgerRecord(ledgerPath, {
      type: "ORDER_SUBMITTED",
      ts: new Date().toISOString(),
      proposalId: proposal.proposalId,
      symbol: proposal.symbol,
      side: proposal.side,
      qtyBase: proposal.qtyBase,
      limitPrice: proposal.entryPrice,
      ordId: result.order.ordId,
      clOrdId: result.order.clOrdId
    });
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
    if (isOkxApiError(error)) {
      writeError({
        code: error.code,
        message: error.message,
        details: error.details
      });
      process.exit(1);
    }
    if (isHumanApprovalError(error)) {
      writeError({
        code: error.code,
        message: error.message
      });
      process.exit(1);
    }
    if (error instanceof ExecutionInvariantError) {
      writeError({
        code: error.code,
        message: error.message,
        details: error.details
      });
      process.exit(1);
    }
    if (isCliStructuredError(error)) {
      writeError(error);
      process.exit(1);
    }

    const message = error instanceof Error ? error.message : String(error);
    writeError({
      code: "UNHANDLED_ERROR",
      message
    });
    process.exit(1);
  }
}

void main();
