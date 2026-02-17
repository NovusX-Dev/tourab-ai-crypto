import { readFile, writeFile } from "node:fs/promises";
import { buildValidSpotProposal, fetchSpotMarketInputs } from "./proposal-helper.js";
import { parseJsonPayload, validateContextPayload } from "./cli-validation.js";
import { loadEnvFromProjectRoot } from "./env-loader.js";

loadEnvFromProjectRoot(process.cwd(), { override: true });

interface CliArgs {
  symbol?: string;
  side?: "buy" | "sell";
  maxRiskUsd?: number;
  maxNotionalUsd?: number;
  entryOffsetBps?: number;
  stopDistanceBps?: number;
  proposalId?: string;
  outFile?: string;
  contextFile?: string;
  outContextFile?: string;
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
    } else if (token === "--proposal-id") {
      args.proposalId = value;
      i += 1;
    } else if (token === "--out-file") {
      args.outFile = value;
      i += 1;
    } else if (token === "--context-file") {
      args.contextFile = value;
      i += 1;
    } else if (token === "--out-context-file") {
      args.outContextFile = value;
      i += 1;
    }
  }
  return args;
}

function writeError(code: string, message: string): void {
  process.stderr.write(
    `${JSON.stringify(
      {
        status: "ERROR",
        error: { code, message }
      },
      null,
      2
    )}\n`
  );
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const symbol = args.symbol ?? "BTC-USDT";
  const side = args.side ?? "buy";
  const maxRiskUsd = args.maxRiskUsd ?? 0.2;
  const maxNotionalUsd = args.maxNotionalUsd ?? 10;
  const entryOffsetBps = args.entryOffsetBps ?? 20;
  const stopDistanceBps = args.stopDistanceBps ?? 150;
  const baseUrl = process.env.OKX_DEMO_BASE_URL ?? "https://www.okx.com";

  if (!Number.isFinite(maxRiskUsd) || maxRiskUsd <= 0) {
    throw new Error("--max-risk-usd must be a positive number.");
  }
  if (!Number.isFinite(maxNotionalUsd) || maxNotionalUsd <= 0) {
    throw new Error("--max-notional-usd must be a positive number.");
  }
  if (!Number.isFinite(entryOffsetBps) || entryOffsetBps < 0) {
    throw new Error("--entry-offset-bps must be a non-negative number.");
  }
  if (!Number.isFinite(stopDistanceBps) || stopDistanceBps <= 0) {
    throw new Error("--stop-distance-bps must be a positive number.");
  }

  const market = await fetchSpotMarketInputs(symbol, baseUrl);
  const built = buildValidSpotProposal(market, {
    symbol,
    side,
    maxRiskUsd,
    maxNotionalUsd,
    entryOffsetBps,
    stopDistanceBps,
    proposalId: args.proposalId
  });

  let updatedContext: ReturnType<typeof validateContextPayload> | undefined;
  if (args.contextFile) {
    const raw = await readFile(args.contextFile, "utf-8");
    const parsed = parseJsonPayload(raw, args.contextFile, "context");
    const context = validateContextPayload(parsed);
    updatedContext = {
      ...context,
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
  }

  const payload = JSON.stringify(
    {
      status: "OK",
      source: {
        symbol: market.symbol,
        last: market.last,
        tickSz: market.tickSz,
        lotSz: market.lotSz,
        minSz: market.minSz,
        buyLmt: market.buyLmt,
        sellLmt: market.sellLmt
      },
      proposal: built.proposal,
      diagnostics: built.diagnostics,
      contextUpdated: updatedContext !== undefined
    },
    null,
    2
  );

  if (args.outFile) {
    await writeFile(args.outFile, `${JSON.stringify(built.proposal, null, 2)}\n`, "utf-8");
  }
  if (updatedContext && args.outContextFile) {
    await writeFile(args.outContextFile, `${JSON.stringify(updatedContext, null, 2)}\n`, "utf-8");
  }

  process.stdout.write(`${payload}\n`);
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    writeError("PROPOSAL_BUILD_FAILED", message);
    process.exit(1);
  }
}

void main();
