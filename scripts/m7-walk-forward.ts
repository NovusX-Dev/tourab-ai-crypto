import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildWalkForwardReport,
  parseClosedTradeFeaturesNdjson,
  type M7DatasetManifest,
  type M7OfflineTrainingRun
} from "../apps/dashboard/src/learning/m7-research-pipeline.js";

function parseArgs(argv: string[]): {
  datasetDir: string;
  retrainDir: string;
  outDir: string;
  windows: number;
  minTradesPerWindow: number;
  minWindows: number;
  minPassRatePct: number;
  minExpectancyUsd: number;
  maxControlViolationRatePct: number;
} {
  let datasetDir = "";
  let retrainDir = "";
  let outDir = join("logs", `m7-walk-forward-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  let windows = 4;
  let minTradesPerWindow = 5;
  let minWindows = 3;
  let minPassRatePct = 75;
  let minExpectancyUsd = 0;
  let maxControlViolationRatePct = 35;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === "--dataset-dir" && value) {
      datasetDir = value;
      i += 1;
    } else if (token === "--retrain-dir" && value) {
      retrainDir = value;
      i += 1;
    } else if (token === "--out-dir" && value) {
      outDir = value;
      i += 1;
    } else if (token === "--windows" && value) {
      windows = Math.max(1, Math.floor(Number(value) || windows));
      i += 1;
    } else if (token === "--min-trades-per-window" && value) {
      minTradesPerWindow = Math.max(1, Math.floor(Number(value) || minTradesPerWindow));
      i += 1;
    } else if (token === "--min-windows" && value) {
      minWindows = Math.max(1, Math.floor(Number(value) || minWindows));
      i += 1;
    } else if (token === "--min-pass-rate-pct" && value) {
      minPassRatePct = Math.max(0, Math.min(100, Number(value) || minPassRatePct));
      i += 1;
    } else if (token === "--min-expectancy-usd" && value) {
      minExpectancyUsd = Number(value) || minExpectancyUsd;
      i += 1;
    } else if (token === "--max-control-violation-rate-pct" && value) {
      maxControlViolationRatePct = Math.max(0, Math.min(100, Number(value) || maxControlViolationRatePct));
      i += 1;
    }
  }
  if (!datasetDir) {
    throw new Error("Missing required argument --dataset-dir");
  }
  if (!retrainDir) {
    throw new Error("Missing required argument --retrain-dir");
  }
  return {
    datasetDir,
    retrainDir,
    outDir,
    windows,
    minTradesPerWindow,
    minWindows,
    minPassRatePct,
    minExpectancyUsd,
    maxControlViolationRatePct
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.outDir, { recursive: true });
  const manifestRaw = await readFile(join(args.datasetDir, "dataset-manifest.json"), "utf-8");
  const manifest = JSON.parse(manifestRaw) as M7DatasetManifest;
  const trainingRunRaw = await readFile(join(args.retrainDir, "training-run.json"), "utf-8");
  const trainingRun = JSON.parse(trainingRunRaw) as M7OfflineTrainingRun;
  const datasetRaw = await readFile(join(args.datasetDir, manifest.artifact.file), "utf-8");
  const records = parseClosedTradeFeaturesNdjson(datasetRaw);

  const report = buildWalkForwardReport({
    generatedAt: new Date().toISOString(),
    candidateModelVersion: trainingRun.candidateModelVersion,
    datasetId: manifest.datasetId,
    records,
    windowCount: args.windows,
    minTradesPerWindow: args.minTradesPerWindow,
    minWindows: args.minWindows,
    minPassRatePct: args.minPassRatePct,
    minExpectancyUsd: args.minExpectancyUsd,
    maxControlViolationRatePct: args.maxControlViolationRatePct
  });
  const reportPath = join(args.outDir, "walk-forward-report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  await writeFile(
    join(args.outDir, "summary.md"),
    [
      "# M7 Walk-Forward Stability",
      "",
      `- generatedAt: ${report.generatedAt}`,
      `- candidateModelVersion: ${report.candidateModelVersion}`,
      `- datasetId: ${report.datasetId}`,
      `- windowsEvaluated: ${report.summary.windowsEvaluated}`,
      `- windowsPassed: ${report.summary.windowsPassed}`,
      `- passRatePct: ${report.summary.passRatePct}`,
      `- pass: ${report.summary.pass}`,
      "",
      "## Config",
      `- minTradesPerWindow: ${report.config.minTradesPerWindow}`,
      `- minWindows: ${report.config.minWindows}`,
      `- minPassRatePct: ${report.config.minPassRatePct}`,
      `- minExpectancyUsd: ${report.config.minExpectancyUsd}`,
      `- maxControlViolationRatePct: ${report.config.maxControlViolationRatePct}`,
      "",
      "## Artifact",
      `- report: ${reportPath}`
    ].join("\n"),
    "utf-8"
  );
  process.stdout.write(`M7 walk-forward report written to ${args.outDir}\n`);
  process.stdout.write(`Report: ${reportPath}\n`);
  if (!report.summary.pass) {
    process.exitCode = 1;
  }
}

void main();

