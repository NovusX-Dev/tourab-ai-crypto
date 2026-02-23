import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

interface CliArgs {
  port: number;
  durationSec: number;
  drainSec: number;
  pollMs: number;
  maxHoldSec: number;
  tpR: number;
  exitOffsetBps: number;
  requireStage: string;
}

interface RunSummary {
  startedAt: string;
  endedAt: string;
  baseUrl: string;
  datasetDir: string;
  solReentryDir: string;
  requireStage: string;
  requiredStagePass: boolean;
  commands: Array<{ name: string; ok: boolean; code: number }>;
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    port: 7171,
    durationSec: 300,
    drainSec: 120,
    pollMs: 2000,
    maxHoldSec: 45,
    tpR: 0.5,
    exitOffsetBps: 1,
    requireStage: "moderate"
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === "--port" && value) {
      out.port = Math.max(1024, Math.floor(Number(value) || out.port));
      i += 1;
    } else if (token === "--duration-sec" && value) {
      out.durationSec = Math.max(30, Math.floor(Number(value) || out.durationSec));
      i += 1;
    } else if (token === "--drain-sec" && value) {
      out.drainSec = Math.max(0, Math.floor(Number(value) || out.drainSec));
      i += 1;
    } else if (token === "--poll-ms" && value) {
      out.pollMs = Math.max(250, Math.floor(Number(value) || out.pollMs));
      i += 1;
    } else if (token === "--max-hold-sec" && value) {
      out.maxHoldSec = Math.max(30, Math.floor(Number(value) || out.maxHoldSec));
      i += 1;
    } else if (token === "--tp-r" && value) {
      out.tpR = Math.max(0.25, Number(value) || out.tpR);
      i += 1;
    } else if (token === "--exit-offset-bps" && value) {
      out.exitOffsetBps = Math.max(0, Number(value) || out.exitOffsetBps);
      i += 1;
    } else if (token === "--require-stage" && value) {
      out.requireStage = value.trim().toLowerCase();
      i += 1;
    }
  }
  return out;
}

function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function spawnNpm(args: string[], env: NodeJS.ProcessEnv, stdio: "inherit" | "pipe"): ChildProcess {
  if (process.platform === "win32") {
    const commandLine = [npmCommand(), ...args].join(" ");
    return spawn("cmd.exe", ["/d", "/s", "/c", commandLine], { env, stdio });
  }
  return spawn(npmCommand(), args, { env, stdio });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
    promise
      .then((value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function waitForHealth(baseUrl: string, timeoutMs = 90_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) {
        return;
      }
    } catch {
      // retry
    }
    await sleep(500);
  }
  throw new Error(`Mission Control did not become healthy at ${baseUrl} within ${timeoutMs}ms`);
}

function startMissionControlServer(baseEnv: NodeJS.ProcessEnv): ChildProcess {
  return spawnNpm(["run", "mission-control:server"], baseEnv, "inherit");
}

async function runCommand(
  name: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number
): Promise<{ ok: boolean; code: number }> {
  return await new Promise((resolve, reject) => {
    const child = spawnNpm(args, env, "inherit");
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        void stopChildProcess(child);
        reject(new Error(`${name} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
    child.on("exit", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ ok: code === 0, code: code ?? 1 });
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function stopChildProcess(child: ChildProcess): Promise<void> {
  if (!child.pid) {
    return;
  }
  if (child.exitCode !== null || child.killed) {
    return;
  }
  if (process.platform === "win32") {
    await withTimeout(
      new Promise<void>((resolve) => {
        const killer = spawn("cmd.exe", ["/d", "/s", "/c", `taskkill /PID ${child.pid} /T /F`], { stdio: "ignore" });
        killer.on("exit", () => resolve());
        killer.on("error", () => resolve());
      }),
      10_000,
      "taskkill"
    ).catch(() => undefined);
    return;
  }
  child.kill("SIGTERM");
  await withTimeout(
    new Promise<void>((resolve) => {
      child.once("exit", () => resolve());
      child.once("close", () => resolve());
    }),
    5_000,
    "SIGTERM wait"
  ).catch(() => undefined);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

async function latestDirMatching(prefix: string, sinceEpochMs?: number): Promise<string> {
  const root = "logs";
  const entries = await readdir(root, { withFileTypes: true });
  const matched: Array<{ path: string; mtimeMs: number }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(prefix)) {
      continue;
    }
    const fullPath = join(root, entry.name);
    const meta = await stat(fullPath);
    if (typeof sinceEpochMs === "number" && meta.mtimeMs <= sinceEpochMs) {
      continue;
    }
    matched.push({ path: fullPath, mtimeMs: meta.mtimeMs });
  }
  if (matched.length === 0) {
    throw new Error(`No directories found with prefix ${prefix} under ${root}`);
  }
  matched.sort((a, b) => a.mtimeMs - b.mtimeMs);
  return matched[matched.length - 1]!.path;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const baseUrl = `http://localhost:${args.port}`;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TOURAB_MISSION_CONTROL_PORT: String(args.port),
    TOURAB_WORKER_SYMBOLS: "SOL-USDT",
    TOURAB_EXECUTION_MODE: "demo_execution_enabled",
    TOURAB_WORKER_SOL_SIDE: "auto",
    TOURAB_WORKER_SOL_MIN_EXPECTANCY_USD: "-0.03",
    TOURAB_WORKER_SOL_MAX_CONSECUTIVE_LOSSES: "100",
    TOURAB_WORKER_SOL_COOLDOWN_MINUTES: "0",
    TOURAB_WORKER_SOL_FAIL_CLOSED_ON_INSUFFICIENT_TRADES: "false",
    TOURAB_WORKER_SOL_MIN_BAND_DISTANCE_BPS: "1",
    TOURAB_WORKER_SOL_ENTRY_OFFSET_BPS: "4",
    TOURAB_WORKER_SOL_STOP_DISTANCE_BPS: "40",
    TOURAB_WORKER_SOL_BLOCKED_UTC_HOURS: "99",
    TOURAB_AUTO_EXIT_SOL_MAX_HOLD_SEC: "120",
    TOURAB_AUTO_EXIT_SOL_TP_R_MULTIPLE: "0.6",
    TOURAB_AUTO_EXIT_SOL_OFFSET_BPS: "1",
    TOURAB_AUTO_EXIT_SOL_FORCE_FLATTEN_BPS: "6"
  };

  const outDir = join("logs", `m7-sol-calibration-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  await mkdir(outDir, { recursive: true });

  const commands: RunSummary["commands"] = [];
  const serverStartEpoch = Date.now();
  process.stdout.write(`[m7-sol-calibrate] starting mission-control on ${baseUrl}\n`);
  const server = startMissionControlServer(env);
  try {
    await waitForHealth(baseUrl, 90_000);
    process.stdout.write("[m7-sol-calibrate] mission-control healthy; running soak:m5\n");
    const soak = await runCommand(
      "soak:m5",
      [
        "run",
        "soak:m5",
        "--",
        "--base-url",
        baseUrl,
        "--duration-sec",
        String(args.durationSec),
        "--drain-sec",
        String(args.drainSec),
        "--poll-ms",
        String(args.pollMs),
        "--max-hold-sec",
        String(args.maxHoldSec),
        "--tp-r",
        String(args.tpR),
        "--exit-offset-bps",
        String(args.exitOffsetBps)
      ],
      env,
      20 * 60_000
    );
    commands.push({ name: "soak:m5", ...soak });
    if (!soak.ok) {
      throw new Error("soak:m5 failed");
    }

    process.stdout.write("[m7-sol-calibrate] running snapshot:m7\n");
    const snapshot = await runCommand(
      "snapshot:m7",
      ["run", "snapshot:m7", "--", "--base-url", baseUrl, "--lookback-days", "90"],
      env,
      5 * 60_000
    );
    commands.push({ name: "snapshot:m7", ...snapshot });
    if (!snapshot.ok) {
      throw new Error("snapshot:m7 failed");
    }
  } finally {
    process.stdout.write("[m7-sol-calibrate] stopping mission-control process\n");
    await stopChildProcess(server);
  }

  const datasetDir = await latestDirMatching("m7-dataset-", serverStartEpoch);
  const reentryStartEpoch = Date.now();
  process.stdout.write(`[m7-sol-calibrate] running sol-reentry:m7 on ${datasetDir}\n`);
  const gate = await runCommand(
    "sol-reentry:m7",
    ["run", "sol-reentry:m7", "--", "--dataset-dir", datasetDir, "--require-stage", args.requireStage],
    env,
    5 * 60_000
  );
  commands.push({ name: "sol-reentry:m7", ...gate });
  const solReentryDir = await latestDirMatching("m7-sol-reentry-", reentryStartEpoch);
  const summaryPath = join(solReentryDir, "summary.md");
  const summaryMd = await readFile(summaryPath, "utf-8");
  const requiredStagePass = summaryMd.includes("requiredStagePass: true");

  const report: RunSummary = {
    startedAt,
    endedAt: new Date().toISOString(),
    baseUrl,
    datasetDir,
    solReentryDir,
    requireStage: args.requireStage,
    requiredStagePass,
    commands
  };
  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf-8");
  await writeFile(
    join(outDir, "summary.md"),
    [
      "# M7 SOL Moderate Calibration",
      "",
      `- startedAt: ${report.startedAt}`,
      `- endedAt: ${report.endedAt}`,
      `- baseUrl: ${report.baseUrl}`,
      `- datasetDir: ${report.datasetDir}`,
      `- solReentryDir: ${report.solReentryDir}`,
      `- requireStage: ${report.requireStage}`,
      `- requiredStagePass: ${report.requiredStagePass}`,
      "",
      "## Commands",
      ...report.commands.map((item) => `- ${item.name}: ok=${item.ok} code=${item.code}`)
    ].join("\n"),
    "utf-8"
  );
  process.stdout.write(`Calibration run artifacts written to ${outDir}\n`);
  process.stdout.write(`Dataset: ${datasetDir}\n`);
  process.stdout.write(`Reentry: ${solReentryDir}\n`);
  if (!requiredStagePass) {
    process.exitCode = 1;
  }
}

void main();
