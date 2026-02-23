import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ClosedTradeFeatureRecord } from "@tourab/shared";
import { buildDatasetSnapshot } from "../apps/dashboard/src/learning/m7-research-pipeline.js";

interface LearningFeatureResponse {
  governance: {
    activeModelVersion: string;
  };
  items: ClosedTradeFeatureRecord[];
}

function parseArgs(argv: string[]): {
  baseUrl: string;
  limit: number;
  lookbackDays: number;
  outDir: string;
  datasetTag?: string;
} {
  const defaults = {
    baseUrl: "http://localhost:7071",
    limit: 2000,
    lookbackDays: 90,
    outDir: join("logs", `m7-dataset-${new Date().toISOString().replace(/[:.]/g, "-")}`),
    datasetTag: undefined as string | undefined
  };
  const out = { ...defaults };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === "--base-url" && value) {
      out.baseUrl = value;
      i += 1;
    } else if (token === "--limit" && value) {
      out.limit = Math.max(1, Math.floor(Number(value) || defaults.limit));
      i += 1;
    } else if (token === "--lookback-days" && value) {
      out.lookbackDays = Math.max(1, Math.floor(Number(value) || defaults.lookbackDays));
      i += 1;
    } else if (token === "--out-dir" && value) {
      out.outDir = value;
      i += 1;
    } else if (token === "--dataset-tag" && value) {
      out.datasetTag = value.trim();
      i += 1;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.outDir, { recursive: true });

  const response = await fetch(`${args.baseUrl}/learning/features?limit=${args.limit}`);
  if (!response.ok) {
    throw new Error(`Learning features fetch failed: HTTP ${response.status}`);
  }
  const payload = (await response.json()) as LearningFeatureResponse;
  const now = new Date();
  const minEpoch = now.getTime() - args.lookbackDays * 24 * 60 * 60 * 1000;
  const filtered = payload.items.filter((item) => {
    const epoch = Date.parse(item.closedAt);
    return Number.isFinite(epoch) && epoch >= minEpoch;
  });

  const datasetArtifactFile = "closed-trade-features.ndjson";
  const { manifest, ndjson } = buildDatasetSnapshot({
    features: filtered,
    createdAt: now.toISOString(),
    sourceEndpoint: `${args.baseUrl}/learning/features`,
    governanceModelVersion: payload.governance.activeModelVersion,
    limit: args.limit,
    lookbackDays: args.lookbackDays,
    datasetTag: args.datasetTag,
    artifactFile: datasetArtifactFile
  });
  const manifestPath = join(args.outDir, "dataset-manifest.json");
  const datasetPath = join(args.outDir, datasetArtifactFile);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  await writeFile(datasetPath, ndjson, "utf-8");
  await writeFile(
    join(args.outDir, "summary.md"),
    [
      "# M7 Dataset Snapshot",
      "",
      `- createdAt: ${manifest.createdAt}`,
      `- datasetId: ${manifest.datasetId}`,
      `- recordCount: ${manifest.recordCount}`,
      `- lookbackDays: ${manifest.filters.lookbackDays}`,
      `- source: ${manifest.source.endpoint}`,
      `- governanceModelVersion: ${manifest.source.governanceModelVersion}`,
      `- symbols: ${manifest.distinct.symbols.join(", ") || "none"}`,
      `- strategies: ${manifest.distinct.strategyVersions.join(", ") || "none"}`,
      `- modelVersions: ${manifest.distinct.modelVersions.join(", ") || "none"}`,
      "",
      "## Artifacts",
      `- manifest: ${manifestPath}`,
      `- dataset: ${datasetPath}`
    ].join("\n"),
    "utf-8"
  );
  process.stdout.write(`M7 dataset snapshot written to ${args.outDir}\n`);
  process.stdout.write(`Manifest: ${manifestPath}\n`);
  process.stdout.write(`Dataset: ${datasetPath}\n`);
}

void main();
