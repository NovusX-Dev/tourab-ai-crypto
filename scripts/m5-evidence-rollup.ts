import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface Milestone5EvidenceDay {
  day: string;
  pass: boolean;
  source: "soak_report" | "live";
  closureRatePct: number;
  filledEntries: number;
  deterministicClosed: number;
  closedTradeDataPass: boolean;
  reconciliationPass: boolean;
  tradeErrors: number;
  reportPath?: string;
}

interface Milestone5EvidenceSummary {
  policyVersion: string;
  requiredDays: number;
  qualifiedDays: number;
  streakDays: number;
  milestoneReady: boolean;
  generatedAt: string;
  today: {
    day: string;
    pass: boolean;
    source: "soak_report" | "live";
    blockers: string[];
    closureRatePct: number;
    filledEntries: number;
    deterministicClosed: number;
    reconciliationPass: boolean;
    tradeErrors: number;
  };
  days: Milestone5EvidenceDay[];
}

function parseArgs(argv: string[]): { baseUrl: string; outDir: string } {
  const defaults = {
    baseUrl: "http://localhost:7071",
    outDir: join("logs", `m5-evidence-${new Date().toISOString().replace(/[:.]/g, "-")}`)
  };
  const out = { ...defaults };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    const v = argv[i + 1];
    if (t === "--base-url" && v) {
      out.baseUrl = v;
      i += 1;
    } else if (t === "--out-dir" && v) {
      out.outDir = v;
      i += 1;
    }
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEvidenceWithRetry(baseUrl: string, attempts = 30, delayMs = 1000): Promise<Milestone5EvidenceSummary> {
  let lastError: Error | undefined;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${baseUrl}/milestone5/evidence`);
      if (!res.ok) {
        lastError = new Error(`Evidence fetch failed: HTTP ${res.status}`);
      } else {
        return (await res.json()) as Milestone5EvidenceSummary;
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    if (i < attempts - 1) {
      await sleep(delayMs);
    }
  }
  throw lastError ?? new Error("Evidence fetch failed.");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.outDir, { recursive: true });
  const payload = await fetchEvidenceWithRetry(args.baseUrl);

  const outJsonPath = join(args.outDir, "evidence.json");
  await writeFile(outJsonPath, JSON.stringify(payload, null, 2), "utf-8");

  const lines = [
    "# Milestone 5 Evidence Rollup",
    "",
    `- generatedAt: ${payload.generatedAt}`,
    `- policyVersion: ${payload.policyVersion}`,
    `- qualifiedDays: ${payload.qualifiedDays}/${payload.requiredDays}`,
    `- streakDays: ${payload.streakDays}`,
    `- milestoneReady: ${payload.milestoneReady}`,
    "",
    "## Today",
    `- day: ${payload.today.day}`,
    `- source: ${payload.today.source}`,
    `- pass: ${payload.today.pass}`,
    `- closureRatePct: ${payload.today.closureRatePct}`,
    `- filledEntries: ${payload.today.filledEntries}`,
    `- deterministicClosed: ${payload.today.deterministicClosed}`,
    `- reconciliationPass: ${payload.today.reconciliationPass}`,
    `- tradeErrors: ${payload.today.tradeErrors}`,
    "",
    "## Blockers",
    ...(payload.today.blockers.length > 0 ? payload.today.blockers.map((b) => `- ${b}`) : ["- None"]),
    "",
    "## Recent Days",
    ...payload.days.slice(0, 14).map((day) => {
      return `- ${day.day}: pass=${day.pass} source=${day.source} closure=${day.closureRatePct.toFixed(2)} filled=${day.filledEntries} detClosed=${day.deterministicClosed} tradeErrors=${day.tradeErrors}`;
    })
  ];
  const outSummaryPath = join(args.outDir, "summary.md");
  await writeFile(outSummaryPath, lines.join("\n"), "utf-8");

  process.stdout.write(`M5 evidence rollup written to ${args.outDir}\n`);
  process.stdout.write(`JSON: ${outJsonPath}\n`);
  process.stdout.write(`Summary: ${outSummaryPath}\n`);
}

void main();
