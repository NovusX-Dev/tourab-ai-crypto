import { loadOkxDemoConfigFromEnv, OkxApiError, OkxDemoAdapter, validateOkxDemoEnv } from "@tourab/okx-demo-adapter";
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

function maskSecret(value: string): string {
  if (!value) {
    return "<empty>";
  }
  if (value.length <= 6) {
    return "*".repeat(value.length);
  }
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const validation = validateOkxDemoEnv(process.env);
  if (!validation.ok) {
    throw new OkxApiError("OKX_CONFIG_ERROR", "Invalid OKX demo environment configuration.", {
      issues: validation.issues
    });
  }
  const adapter = new OkxDemoAdapter(loadOkxDemoConfigFromEnv(process.env));
  const balance = await adapter.getAccountBalance(args.ccy);

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "OK",
        check: "okx_demo_private_balance",
        config: {
          tradingMode: process.env.OKX_TRADING_MODE ?? "",
          baseUrl: validation.config.baseUrl ?? "https://www.okx.com",
          apiKeyMask: maskSecret(validation.config.apiKey),
          passphraseMask: maskSecret(validation.config.passphrase)
        },
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
      const enhancedDetails: Record<string, unknown> = {
        ...(error.details ?? {})
      };
      if (error.code === "OKX_HTTP_ERROR" && Number(error.details?.status) === 401) {
        enhancedDetails.hint =
          "Auth rejected by OKX demo. Verify API key/secret/passphrase match the same Demo Trading key, API permissions include trading, and key is active.";
      }
      writeError({
        code: error.code,
        message: error.message,
        details: enhancedDetails
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
