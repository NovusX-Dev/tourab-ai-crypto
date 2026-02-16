import { readFile } from "node:fs/promises";
import { loadOkxDemoConfigFromEnv, OkxApiError, OkxDemoAdapter } from "@tourab/okx-demo-adapter";
import { executeProposalWithGatekeeper } from "./execution-service.js";
import { HumanApprovalError, parseBooleanEnv } from "./human-approval.js";
import { appendOrderLedgerRecord } from "./lifecycle-store.js";
import {
  CliStructuredError,
  parseJsonPayload,
  validateContextPayload,
  validateProposalPayload
} from "./cli-validation.js";

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
  const humanApprovalEnabled = parseBooleanEnv(process.env.TOURAB_HUMAN_APPROVAL_ENABLED, true);
  const requiredApprovalToken = process.env.TOURAB_HUMAN_APPROVAL_TOKEN;
  const result = await executeProposalWithGatekeeper(proposal, context, adapter, {
    enabled: humanApprovalEnabled,
    requiredToken: requiredApprovalToken,
    providedToken: args.approvalToken
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
