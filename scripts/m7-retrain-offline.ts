import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ClosedTradeFeatureRecord } from "@tourab/shared";
import {
  buildOfflineTrainingRun,
  parseClosedTradeFeaturesNdjson,
  sha256,
  type M7DatasetManifest
} from "../apps/dashboard/src/learning/m7-research-pipeline.js";

function parseArgs(argv: string[]): { datasetDir: string; outDir: string } {
  let datasetDir = "";
  let outDir = join("logs", `m7-retrain-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === "--dataset-dir" && value) {
      datasetDir = value;
      i += 1;
    } else if (token === "--out-dir" && value) {
      outDir = value;
      i += 1;
    }
  }
  if (!datasetDir) {
    throw new Error("Missing required argument --dataset-dir");
  }
  return { datasetDir, outDir };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.outDir, { recursive: true });
  const manifestPath = join(args.datasetDir, "dataset-manifest.json");
  const manifestRaw = await readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestRaw) as M7DatasetManifest;
  const datasetPath = join(args.datasetDir, manifest.artifact.file);
  const datasetRaw = await readFile(datasetPath, "utf-8");
  const records = parseClosedTradeFeaturesNdjson(datasetRaw);
  const completedAt = new Date().toISOString();
  const run = buildOfflineTrainingRun({
    startedAt,
    completedAt,
    manifest,
    manifestRawJson: manifestRaw,
    records: records as ClosedTradeFeatureRecord[]
  });
  const runPath = join(args.outDir, "training-run.json");
  const metricsPath = join(args.outDir, "metrics.json");
  const modelCardPath = join(args.outDir, "model-card.md");
  const promotionPacketPath = join(args.outDir, "promotion-packet.json");
  await writeFile(runPath, JSON.stringify(run, null, 2), "utf-8");
  await writeFile(metricsPath, JSON.stringify(run.metrics, null, 2), "utf-8");
  await writeFile(
    modelCardPath,
    [
      "# M7 Offline Model Card",
      "",
      `- runId: ${run.runId}`,
      `- candidateModelVersion: ${run.candidateModelVersion}`,
      `- datasetId: ${run.dataset.datasetId}`,
      `- totalTrades: ${run.metrics.totalTrades}`,
      `- winRatePct: ${run.metrics.winRatePct}`,
      `- meanRealizedPnlUsd: ${run.metrics.meanRealizedPnlUsd}`,
      `- meanRealizedPnlBps: ${run.metrics.meanRealizedPnlBps}`,
      "",
      "## Governance",
      "- Deployment is blocked until independent validation + explicit approval are recorded.",
      `- Required checks: ${run.governance.requiredChecks.join(", ")}`
    ].join("\n"),
    "utf-8"
  );
  await writeFile(
    promotionPacketPath,
    JSON.stringify(
      {
        schemaVersion: "m7-promotion-packet-v1",
        generatedAt: completedAt,
        candidateModelVersion: run.candidateModelVersion,
        datasetId: run.dataset.datasetId,
        trainingRunId: run.runId,
        artifactHashes: {
          runSha256: sha256(JSON.stringify(run)),
          metricsSha256: sha256(JSON.stringify(run.metrics))
        },
        governance: run.governance
      },
      null,
      2
    ),
    "utf-8"
  );
  await writeFile(
    join(args.outDir, "summary.md"),
    [
      "# M7 Offline Retraining",
      "",
      `- startedAt: ${run.startedAt}`,
      `- completedAt: ${run.completedAt}`,
      `- runId: ${run.runId}`,
      `- candidateModelVersion: ${run.candidateModelVersion}`,
      `- datasetId: ${run.dataset.datasetId}`,
      `- totalTrades: ${run.metrics.totalTrades}`,
      `- winRatePct: ${run.metrics.winRatePct}`,
      "",
      "## Artifacts",
      `- ${runPath}`,
      `- ${metricsPath}`,
      `- ${modelCardPath}`,
      `- ${promotionPacketPath}`
    ].join("\n"),
    "utf-8"
  );
  process.stdout.write(`M7 offline retraining artifacts written to ${args.outDir}\n`);
  process.stdout.write(`Run: ${runPath}\n`);
  process.stdout.write(`Model card: ${modelCardPath}\n`);
}

void main();
