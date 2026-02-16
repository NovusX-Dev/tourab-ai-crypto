import { readFile } from "node:fs/promises";
import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import { RiskContext, TradeProposal } from "@tourab/shared";

interface CliArgs {
  proposalFile?: string;
  contextFile?: string;
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
    }
  }
  return args;
}

async function readJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as T;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.proposalFile || !args.contextFile) {
    // Keep usage strict to prevent accidental incomplete risk checks.
    throw new Error(
      "Usage: npm run gatekeeper:cli -- --proposal-file <proposal.json> --context-file <context.json>"
    );
  }

  const proposal = await readJson<TradeProposal>(args.proposalFile);
  const context = await readJson<RiskContext>(args.contextFile);
  const decision = evaluateTradeProposal(proposal, context);

  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Gatekeeper CLI failed: ${message}\n`);
  process.exit(1);
});
