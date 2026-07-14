import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface Args {
  baseUrl: string;
  durationSec: number;
  pollMs: number;
  progressSec: number;
  drainSec: number;
  outDir?: string;
  label: string;
}

interface EntryAutonomyConfigResponse {
  status: {
    approvalMode: "manual" | "policy_auto";
    fallbackActive: boolean;
    lastPolicyAutoBlockers?: string[];
  };
}

interface ManagedTradesResponse {
  items: Array<{ status: string }>;
}

interface AlertsResponse {
  items: Array<{ code: string; severity: string; status: string }>;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    baseUrl: "http://localhost:7071",
    durationSec: 300,
    pollMs: 5000,
    progressSec: 30,
    drainSec: 0,
    label: "policy-auto",
    outDir: undefined
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--base-url" && next) {
      out.baseUrl = next;
      i += 1;
    } else if (token === "--duration-sec" && next) {
      out.durationSec = Math.max(30, Number(next));
      i += 1;
    } else if (token === "--poll-ms" && next) {
      out.pollMs = Math.max(500, Number(next));
      i += 1;
    } else if (token === "--progress-sec" && next) {
      out.progressSec = Math.max(5, Number(next));
      i += 1;
    } else if (token === "--drain-sec" && next) {
      out.drainSec = Math.max(0, Number(next));
      i += 1;
    } else if (token === "--out-dir" && next) {
      out.outDir = next;
      i += 1;
    } else if (token === "--label" && next) {
      out.label = next;
      i += 1;
    }
  }
  return out;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

function formatDuration(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function resolveTsxPath(): string {
  const candidate = join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
  if (!existsSync(candidate)) {
    throw new Error(`tsx executable not found at ${candidate}`);
  }
  return candidate;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const startedAtEpoch = Date.now();
  const headers = {
    "x-tourab-role": "operator",
    "x-user-id": "policy-auto-progress"
  };

  const childArgs = [
    "scripts/auto-exit-decision-diagnostic.ts",
    "--base-url",
    args.baseUrl,
    "--duration-sec",
    String(args.durationSec),
    "--poll-ms",
    String(args.pollMs)
  ];
  if (args.drainSec > 0) {
    childArgs.push("--drain-sec", String(args.drainSec), "--pause-on-drain", "true");
  }
  if (args.outDir) {
    childArgs.push("--out-dir", args.outDir);
  }

  process.stdout.write(
    `[${new Date().toISOString()}] starting ${args.label} duration=${formatDuration(args.durationSec)} drain=${formatDuration(args.drainSec)} baseUrl=${args.baseUrl}\n`
  );

  const tsxPath = resolveTsxPath();
  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/c", tsxPath, ...childArgs], {
          cwd: process.cwd(),
          stdio: ["ignore", "pipe", "pipe"]
        })
      : spawn(tsxPath, childArgs, {
          cwd: process.cwd(),
          stdio: ["ignore", "pipe", "pipe"]
        });

  let finalStdout = "";
  let finalStderr = "";
  child.stdout.on("data", (chunk: Buffer | string) => {
    const text = String(chunk);
    finalStdout += text;
  });
  child.stderr.on("data", (chunk: Buffer | string) => {
    const text = String(chunk);
    finalStderr += text;
    process.stderr.write(text);
  });

  const progressTimer = setInterval(() => {
    void (async () => {
      const elapsedSec = (Date.now() - startedAtEpoch) / 1000;
      const remainingSec = Math.max(0, args.durationSec - elapsedSec);
      try {
        const [entry, managedTrades, alerts] = await Promise.all([
          getJson<EntryAutonomyConfigResponse>(`${args.baseUrl}/entry-autonomy/config`, { headers }),
          getJson<ManagedTradesResponse>(`${args.baseUrl}/managed-trades`, { headers }),
          getJson<AlertsResponse>(`${args.baseUrl}/alerts?status=open`, { headers })
        ]);
        const byStatus = managedTrades.items.reduce((acc, item) => {
          acc.set(item.status, (acc.get(item.status) ?? 0) + 1);
          return acc;
        }, new Map<string, number>());
        const openCriticalAlerts = alerts.items.filter((item) => item.severity === "critical").length;
        const closed = byStatus.get("closed") ?? 0;
        const canceled = byStatus.get("canceled") ?? 0;
        const entrySubmitted = byStatus.get("entry_submitted") ?? 0;
        const exitSubmitted = byStatus.get("exit_submitted") ?? 0;
        process.stdout.write(
          `[${new Date().toISOString()}] progress ${args.label} elapsed=${formatDuration(elapsedSec)} remaining=${formatDuration(remainingSec)} approvalMode=${entry.status.approvalMode} fallback=${entry.status.fallbackActive ? "yes" : "no"} closed=${closed} canceled=${canceled} entrySubmitted=${entrySubmitted} exitSubmitted=${exitSubmitted} openCriticalAlerts=${openCriticalAlerts}\n`
        );
      } catch (error: unknown) {
        process.stdout.write(
          `[${new Date().toISOString()}] progress ${args.label} elapsed=${formatDuration(elapsedSec)} remaining=${formatDuration(remainingSec)} status=unavailable error=${error instanceof Error ? error.message : String(error)}\n`
        );
      }
    })();
  }, args.progressSec * 1000);

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", (error) => reject(error));
    child.once("close", (code) => resolve(code ?? 1));
  });
  clearInterval(progressTimer);

  if (finalStdout.trim().length > 0) {
    process.stdout.write(finalStdout);
  }

  if (exitCode !== 0) {
    throw new Error(finalStderr.trim().length > 0 ? finalStderr.trim() : `${args.label} failed with exit code ${exitCode}`);
  }

  process.stdout.write(`[${new Date().toISOString()}] completed ${args.label}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
