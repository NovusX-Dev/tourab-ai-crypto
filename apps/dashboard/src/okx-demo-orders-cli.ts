import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadOkxDemoConfigFromEnv, OkxApiError, OkxDemoAdapter } from "@tourab/okx-demo-adapter";

interface CliArgs {
  symbol?: string;
  fillsLimit?: number;
  outFile?: string;
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
    } else if (token === "--out-file") {
      args.outFile = value;
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
  const symbol = args.symbol;
  const fillsLimit = Number.isFinite(args.fillsLimit) ? Math.max(1, Math.floor(args.fillsLimit!)) : 100;
  const adapter = new OkxDemoAdapter(loadOkxDemoConfigFromEnv(process.env));
  const [pendingOrders, fills] = await Promise.all([
    adapter.getPendingOrders(symbol),
    adapter.getFills(symbol, fillsLimit)
  ]);

  const snapshot = {
    status: "OK",
    ts: new Date().toISOString(),
    symbol: symbol ?? null,
    pendingOrders,
    fills
  };

  const outFile = args.outFile;
  if (outFile) {
    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");
  }

  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
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
