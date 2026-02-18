import { createHash } from "node:crypto";
import { getDefaultResultOrder, lookup } from "node:dns";
import { promisify } from "node:util";
import process from "node:process";
import { loadOkxDemoConfigFromEnv, OkxApiError, OkxDemoAdapter, validateOkxDemoEnv } from "@tourab/okx-demo-adapter";
import { loadEnvFromProjectRoot } from "./env-loader.js";

loadEnvFromProjectRoot(process.cwd(), { override: true });
const lookupAsync = promisify(lookup);

interface CliArgs {
  ccy: string;
  baseUrl: string;
}

interface SnapshotPayload {
  exchange?: {
    connected?: boolean;
    mode?: string;
    source?: string;
    lastHealthCheckAt?: string;
    lastError?: string;
  };
  state?: {
    state?: string;
    mode?: string;
    activeSymbol?: string;
    lastHeartbeatAt?: string;
  };
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    ccy: "USDT",
    baseUrl: "http://localhost:7071"
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === "--ccy" && value) {
      out.ccy = value;
      i += 1;
      continue;
    }
    if (token === "--base-url" && value) {
      out.baseUrl = value;
      i += 1;
    }
  }
  return out;
}

function maskSecret(value: string | undefined): string {
  const v = (value ?? "").trim();
  if (!v) {
    return "<empty>";
  }
  if (v.length <= 6) {
    return "*".repeat(v.length);
  }
  return `${v.slice(0, 3)}***${v.slice(-3)}`;
}

function sha256Fingerprint(value: string | undefined): string {
  const v = (value ?? "").trim();
  if (!v) {
    return "";
  }
  return createHash("sha256").update(v, "utf8").digest("hex").slice(0, 12);
}

function resolvePassphraseSource(env: NodeJS.ProcessEnv): string {
  const api = (env.OKX_DEMO_API_PASSPHRASE ?? "").trim();
  const legacy = (env.OKX_DEMO_PASSPHRASE ?? "").trim();
  if (!api && !legacy) {
    return "none";
  }
  if (api && !legacy) {
    return "OKX_DEMO_API_PASSPHRASE";
  }
  if (!api && legacy) {
    return "OKX_DEMO_PASSPHRASE";
  }
  return api === legacy ? "both_same" : "both_conflict";
}

async function fetchBackendSnapshot(baseUrl: string): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {
    reachable: false
  };
  try {
    const health = await fetch(`${baseUrl}/health`);
    result.reachable = health.ok;
    result.healthStatus = health.status;
    if (health.ok) {
      result.health = (await health.json()) as Record<string, unknown>;
    }
  } catch (error: unknown) {
    result.healthError = error instanceof Error ? error.message : String(error);
    return result;
  }

  try {
    const snapshotRes = await fetch(`${baseUrl}/snapshot`);
    result.snapshotStatus = snapshotRes.status;
    if (snapshotRes.ok) {
      const snapshot = (await snapshotRes.json()) as SnapshotPayload;
      result.exchange = snapshot.exchange ?? {};
      result.state = snapshot.state ?? {};
    }
  } catch (error: unknown) {
    result.snapshotError = error instanceof Error ? error.message : String(error);
  }
  return result;
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const validation = validateOkxDemoEnv(process.env);

  const report: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    runtime: {
      node: process.version,
      cwd: process.cwd(),
      pid: process.pid,
      dnsDefaultResultOrder: getDefaultResultOrder()
    },
    env: {
      OKX_TRADING_MODE: (process.env.OKX_TRADING_MODE ?? "").trim(),
      OKX_DEMO_BASE_URL: (process.env.OKX_DEMO_BASE_URL ?? "").trim() || "https://www.okx.com",
      OKX_DEMO_API_KEY: {
        present: Boolean((process.env.OKX_DEMO_API_KEY ?? "").trim()),
        masked: maskSecret(process.env.OKX_DEMO_API_KEY),
        fingerprint12: sha256Fingerprint(process.env.OKX_DEMO_API_KEY)
      },
      OKX_DEMO_API_SECRET: {
        present: Boolean((process.env.OKX_DEMO_API_SECRET ?? "").trim()),
        masked: maskSecret(process.env.OKX_DEMO_API_SECRET),
        fingerprint12: sha256Fingerprint(process.env.OKX_DEMO_API_SECRET)
      },
      OKX_DEMO_API_PASSPHRASE: {
        present: Boolean((process.env.OKX_DEMO_API_PASSPHRASE ?? "").trim()),
        masked: maskSecret(process.env.OKX_DEMO_API_PASSPHRASE),
        fingerprint12: sha256Fingerprint(process.env.OKX_DEMO_API_PASSPHRASE)
      },
      OKX_DEMO_PASSPHRASE: {
        present: Boolean((process.env.OKX_DEMO_PASSPHRASE ?? "").trim()),
        masked: maskSecret(process.env.OKX_DEMO_PASSPHRASE),
        fingerprint12: sha256Fingerprint(process.env.OKX_DEMO_PASSPHRASE)
      },
      passphraseSource: resolvePassphraseSource(process.env)
    },
    validation: {
      ok: validation.ok,
      issues: validation.issues
    },
    resolvedConfig: {
      baseUrl: validation.config.baseUrl ?? "https://www.okx.com",
      apiKeyMasked: maskSecret(validation.config.apiKey),
      apiSecretMasked: maskSecret(validation.config.apiSecret),
      passphraseMasked: maskSecret(validation.config.passphrase)
    },
    backend: await fetchBackendSnapshot(args.baseUrl)
  };

  try {
    const okxLookup = await lookupAsync("www.okx.com", { all: true });
    report.network = {
      okxDns: okxLookup
    };
  } catch (error: unknown) {
    report.network = {
      okxDnsError: error instanceof Error ? error.message : String(error)
    };
  }

  const privateAuthProbe: Record<string, unknown> = {
    ok: false,
    ccy: args.ccy
  };
  try {
    const adapter = new OkxDemoAdapter(loadOkxDemoConfigFromEnv(process.env));
    const balance = await adapter.getAccountBalance(args.ccy);
    privateAuthProbe.ok = true;
    privateAuthProbe.totalEq = balance.totalEq;
    privateAuthProbe.ccyCount = balance.details.length;
  } catch (error: unknown) {
    if (error instanceof OkxApiError) {
      privateAuthProbe.error = {
        code: error.code,
        message: error.message,
        details: error.details
      };
    } else {
      privateAuthProbe.error = {
        code: "UNHANDLED_ERROR",
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
  report.privateAuthProbe = privateAuthProbe;

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!privateAuthProbe.ok) {
    process.exitCode = 1;
  }
}

void run().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
