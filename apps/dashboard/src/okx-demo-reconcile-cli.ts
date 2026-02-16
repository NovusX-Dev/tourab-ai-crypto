import { readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { loadOkxDemoConfigFromEnv, OkxApiError, OkxDemoAdapter, OkxFillRecord, OkxPendingOrder } from "@tourab/okx-demo-adapter";
import { readOrderLedger } from "./lifecycle-store.js";
import { reconcileOrderLifecycle } from "./reconciliation.js";

interface CliArgs {
  symbol?: string;
  fillsLimit?: number;
  ledgerFile?: string;
  snapshotFile?: string;
  outFile?: string;
}

interface SnapshotPayload {
  pendingOrders: OkxPendingOrder[];
  fills: OkxFillRecord[];
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === "--symbol") {
      args.symbol = value;
      i += 1;
    } else if (token === "--fills-limit") {
      args.fillsLimit = Number(value);
      i += 1;
    } else if (token === "--ledger-file") {
      args.ledgerFile = value;
      i += 1;
    } else if (token === "--snapshot-file") {
      args.snapshotFile = value;
      i += 1;
    } else if (token === "--out-file") {
      args.outFile = value;
      i += 1;
    }
  }
  return args;
}

async function loadSnapshotFromFile(path: string): Promise<SnapshotPayload> {
  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw) as Partial<SnapshotPayload>;
  if (!Array.isArray(parsed.pendingOrders) || !Array.isArray(parsed.fills)) {
    throw new Error("Invalid snapshot file payload.");
  }
  return {
    pendingOrders: parsed.pendingOrders as OkxPendingOrder[],
    fills: parsed.fills as OkxFillRecord[]
  };
}

function writeError(code: string, message: string, details?: Record<string, unknown>): void {
  process.stderr.write(`${JSON.stringify({ status: "ERROR", error: { code, message, details } }, null, 2)}\n`);
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const ledgerFile = args.ledgerFile ?? process.env.TOURAB_ORDER_LEDGER_PATH ?? "logs/order-intents.jsonl";
  const ledger = await readOrderLedger(ledgerFile);

  let pendingOrders: OkxPendingOrder[];
  let fills: OkxFillRecord[];
  if (args.snapshotFile) {
    const snapshot = await loadSnapshotFromFile(args.snapshotFile);
    pendingOrders = snapshot.pendingOrders;
    fills = snapshot.fills;
  } else {
    const adapter = new OkxDemoAdapter(loadOkxDemoConfigFromEnv(process.env));
    const fillsLimit = Number.isFinite(args.fillsLimit) ? Math.max(1, Math.floor(args.fillsLimit!)) : 100;
    [pendingOrders, fills] = await Promise.all([
      adapter.getPendingOrders(args.symbol),
      adapter.getFills(args.symbol, fillsLimit)
    ]);
  }

  const report = reconcileOrderLifecycle(ledger, pendingOrders, fills);
  if (args.outFile) {
    await mkdir(dirname(args.outFile), { recursive: true });
    await writeFile(args.outFile, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
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
