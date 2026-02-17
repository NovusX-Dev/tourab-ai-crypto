import { loadOkxDemoConfigFromEnv, OkxApiError, OkxDemoAdapter } from "@tourab/okx-demo-adapter";
import { loadEnvFromProjectRoot } from "./env-loader.js";

loadEnvFromProjectRoot(process.cwd(), { override: true });

interface CliArgs {
  ccy?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--ccy") {
      args.ccy = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function writeError(error: { code: string; message: string; details?: Record<string, unknown> }): void {
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

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const adapter = new OkxDemoAdapter(loadOkxDemoConfigFromEnv(process.env));
  const balance = await adapter.getAccountBalance(args.ccy);

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "OK",
        check: "okx_demo_private_balance",
        totalEq: balance.totalEq,
        currencies: balance.details.map((d) => ({
          ccy: d.ccy,
          availBal: d.availBal,
          cashBal: d.cashBal,
          eq: d.eq
        }))
      },
      null,
      2
    )}\n`
  );
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
    if (error instanceof OkxApiError) {
      writeError({
        code: error.code,
        message: error.message,
        details: error.details
      });
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
