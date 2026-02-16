import { loadOkxDemoConfigFromEnv, OkxApiError, OkxDemoAdapter } from "@tourab/okx-demo-adapter";
import { appendOrderLedgerRecord } from "./lifecycle-store.js";
import { enforceHumanApproval, HumanApprovalError, parseBooleanEnv } from "./human-approval.js";

interface CliArgs {
  symbol?: string;
  ordId?: string;
  clOrdId?: string;
  all?: boolean;
  approvalToken?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === "--symbol") {
      args.symbol = value;
      i += 1;
    } else if (token === "--ord-id") {
      args.ordId = value;
      i += 1;
    } else if (token === "--cl-ord-id") {
      args.clOrdId = value;
      i += 1;
    } else if (token === "--all") {
      args.all = true;
    } else if (token === "--approval-token") {
      args.approvalToken = value;
      i += 1;
    }
  }
  return args;
}

function writeError(code: string, message: string, details?: Record<string, unknown>): void {
  process.stderr.write(`${JSON.stringify({ status: "ERROR", error: { code, message, details } }, null, 2)}\n`);
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.symbol) {
    throw new Error("Missing required --symbol.");
  }

  const humanApprovalEnabled = parseBooleanEnv(process.env.TOURAB_HUMAN_APPROVAL_ENABLED, true);
  enforceHumanApproval({
    enabled: humanApprovalEnabled,
    requiredToken: process.env.TOURAB_HUMAN_APPROVAL_TOKEN,
    providedToken: args.approvalToken
  });

  const adapter = new OkxDemoAdapter(loadOkxDemoConfigFromEnv(process.env));
  const ledgerPath = process.env.TOURAB_ORDER_LEDGER_PATH ?? "logs/order-intents.jsonl";

  if (args.all) {
    const pending = await adapter.getPendingOrders(args.symbol);
    const cancelResults = [];
    for (const order of pending) {
      await appendOrderLedgerRecord(ledgerPath, {
        type: "ORDER_CANCEL_REQUESTED",
        ts: new Date().toISOString(),
        symbol: args.symbol,
        ordId: order.ordId,
        clOrdId: order.clOrdId
      });
      const canceled = await adapter.cancelOrder({
        instId: args.symbol,
        ordId: order.ordId,
        clOrdId: order.clOrdId
      });
      cancelResults.push(canceled);
      await appendOrderLedgerRecord(ledgerPath, {
        type: "ORDER_CANCELED",
        ts: new Date().toISOString(),
        symbol: args.symbol,
        ordId: canceled.ordId,
        clOrdId: canceled.clOrdId
      });
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          status: "OK",
          mode: "ALL",
          symbol: args.symbol,
          canceled: cancelResults.length,
          results: cancelResults
        },
        null,
        2
      )}\n`
    );
    return;
  }

  if (!args.ordId && !args.clOrdId) {
    throw new Error("Provide --ord-id or --cl-ord-id, or use --all.");
  }

  await appendOrderLedgerRecord(ledgerPath, {
    type: "ORDER_CANCEL_REQUESTED",
    ts: new Date().toISOString(),
    symbol: args.symbol,
    ordId: args.ordId,
    clOrdId: args.clOrdId
  });
  const canceled = await adapter.cancelOrder({
    instId: args.symbol,
    ordId: args.ordId,
    clOrdId: args.clOrdId
  });
  await appendOrderLedgerRecord(ledgerPath, {
    type: "ORDER_CANCELED",
    ts: new Date().toISOString(),
    symbol: args.symbol,
    ordId: canceled.ordId,
    clOrdId: canceled.clOrdId
  });
  process.stdout.write(`${JSON.stringify({ status: "OK", mode: "ONE", symbol: args.symbol, result: canceled }, null, 2)}\n`);
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
    if (error instanceof HumanApprovalError) {
      writeError(error.code, error.message);
      process.exit(1);
    }
    if (error instanceof OkxApiError) {
      writeError(error.code, error.message, error.details);
      process.exit(1);
    }
    const message = error instanceof Error ? error.message : String(error);
    writeError("UNHANDLED_ERROR", message);
    process.exit(1);
  }
}

void main();
