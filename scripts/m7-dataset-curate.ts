import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildDatasetSnapshot, parseClosedTradeFeaturesNdjson, type M7DatasetManifest } from "../apps/dashboard/src/learning/m7-research-pipeline.js";

function parseArgs(argv: string[]): {
  datasetDir: string;
  outDir: string;
  symbols: string[];
  datasetTag?: string;
} {
  let datasetDir = "";
  let outDir = join("logs", `m7-dataset-curated-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  let symbolsRaw = "";
  let datasetTag: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === "--dataset-dir" && value) {
      datasetDir = value;
      i += 1;
    } else if (token === "--out-dir" && value) {
      outDir = value;
      i += 1;
    } else if (token === "--symbols" && value) {
      symbolsRaw = value;
      i += 1;
    } else if (token === "--dataset-tag" && value) {
      datasetTag = value.trim();
      i += 1;
    }
  }
  if (!datasetDir) {
    throw new Error("Missing required argument --dataset-dir");
  }
  const symbols = symbolsRaw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (symbols.length === 0) {
    throw new Error("Missing required argument --symbols (comma-separated)");
  }
  return { datasetDir, outDir, symbols, datasetTag };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.outDir, { recursive: true });

  const manifestPath = join(args.datasetDir, "dataset-manifest.json");
  const manifestRaw = await readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestRaw) as M7DatasetManifest;
  const datasetPath = join(args.datasetDir, manifest.artifact.file);
  const datasetRaw = await readFile(datasetPath, "utf-8");
  const all = parseClosedTradeFeaturesNdjson(datasetRaw);
  const keep = new Set(args.symbols);
  const filtered = all.filter((item) => keep.has(item.symbol));

  const curated = buildDatasetSnapshot({
    features: filtered,
    createdAt: new Date().toISOString(),
    sourceEndpoint: `${manifest.source.endpoint}?curatedSymbols=${args.symbols.join(",")}`,
    governanceModelVersion: manifest.source.governanceModelVersion,
    limit: manifest.filters.limit,
    lookbackDays: manifest.filters.lookbackDays,
    datasetTag: args.datasetTag ?? `curated:${args.symbols.join(",")}`,
    artifactFile: "closed-trade-features.ndjson"
  });
  const outManifest = join(args.outDir, "dataset-manifest.json");
  const outData = join(args.outDir, "closed-trade-features.ndjson");
  await writeFile(outManifest, JSON.stringify(curated.manifest, null, 2), "utf-8");
  await writeFile(outData, curated.ndjson, "utf-8");
  await writeFile(
    join(args.outDir, "summary.md"),
    [
      "# M7 Curated Dataset",
      "",
      `- sourceDataset: ${args.datasetDir}`,
      `- curatedDataset: ${args.outDir}`,
      `- includedSymbols: ${args.symbols.join(", ")}`,
      `- inputRecords: ${all.length}`,
      `- curatedRecords: ${filtered.length}`,
      `- datasetId: ${curated.manifest.datasetId}`
    ].join("\n"),
    "utf-8"
  );
  process.stdout.write(`M7 curated dataset written to ${args.outDir}\n`);
  process.stdout.write(`Manifest: ${outManifest}\n`);
  process.stdout.write(`Dataset: ${outData}\n`);
}

void main();

