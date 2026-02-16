import { readFile } from "node:fs/promises";
import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import {
  CliStructuredError,
  parseJsonPayload,
  validateContextPayload,
  validateProposalPayload
} from "./cli-validation.js";

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

async function readJson(path: string): Promise<string> {
  return readFile(path, "utf-8");
}

function writeStructuredError(error: CliStructuredError): void {
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
  if (typeof error !== "object" || error === null) {
    return false;
  }
  return "code" in error;
}

async function loadValidatedInputs(
  proposalFile: string,
  contextFile: string
): Promise<{ proposal: ReturnType<typeof validateProposalPayload>; context: ReturnType<typeof validateContextPayload> }> {
  const [proposalRaw, contextRaw] = await Promise.all([readJson(proposalFile), readJson(contextFile)]);

  const proposalPayload = parseJsonPayload(proposalRaw, proposalFile, "proposal");
  const contextPayload = parseJsonPayload(contextRaw, contextFile, "context");

  return {
    proposal: validateProposalPayload(proposalPayload),
    context: validateContextPayload(contextPayload)
  };
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.proposalFile || !args.contextFile) {
    throw <CliStructuredError>{
      code: "USAGE_ERROR",
      message:
        "Usage: npm run gatekeeper:cli -- --proposal-file <proposal.json> --context-file <context.json>"
    };
  }

  const { proposal, context } = await loadValidatedInputs(args.proposalFile, args.contextFile);
  const decision = evaluateTradeProposal(proposal, context);

  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
    if (isCliStructuredError(error)) {
      writeStructuredError(error);
      process.exit(1);
    }

    const message = error instanceof Error ? error.message : String(error);
    writeStructuredError({
      code: "USAGE_ERROR",
      message: `Unhandled CLI error: ${message}`
    });
    process.exit(1);
  }
}

void main();
