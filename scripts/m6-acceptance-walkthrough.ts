import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startMissionControlServer } from "../apps/dashboard/src/mission-control-server.js";

interface HttpStepResult {
  step: string;
  status: number;
  ok: boolean;
  body: unknown;
}

function utcDayOffset(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function seedPassingM5Evidence(baseDir: string): Promise<string[]> {
  const created: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = utcDayOffset(i);
    const dir = join(baseDir, `m5-soak-${day}T12-00-00-000Z`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "report.json"),
      JSON.stringify(
        {
          startedAt: `${day}T12:00:00.000Z`,
          endedAt: `${day}T12:20:00.000Z`,
          durationSec: 1200,
          totals: {
            filledEntries: 20,
            deterministicClosed: 19,
            tradeErrors: 0
          },
          checks: {
            closureRatePct: 95,
            closureRatePass: true,
            closedTradeDataPass: true,
            reconciliationSloObservedPass: true
          }
        },
        null,
        2
      ),
      "utf-8"
    );
    created.push(dir);
  }
  return created;
}

async function postJson(
  baseHttpUrl: string,
  path: string,
  body: unknown,
  userId = "ops-user"
): Promise<HttpStepResult> {
  const res = await fetch(`${baseHttpUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tourab-role": "operator",
      "x-user-id": userId
    },
    body: JSON.stringify(body)
  });
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    payload = await res.text();
  }
  return {
    step: `POST ${path}`,
    status: res.status,
    ok: res.ok,
    body: payload
  };
}

async function getJson(baseHttpUrl: string, path: string): Promise<HttpStepResult> {
  const res = await fetch(`${baseHttpUrl}${path}`, {
    headers: {
      "x-tourab-role": "operator",
      "x-user-id": "ops-user"
    }
  });
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    payload = await res.text();
  }
  return {
    step: `GET ${path}`,
    status: res.status,
    ok: res.ok,
    body: payload
  };
}

async function main(): Promise<void> {
  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join("logs", `m6-acceptance-${runStamp}`);
  const tempDir = await mkdtemp(join(tmpdir(), "tourab-m6-acceptance-"));
  const evidenceDir = join(tempDir, "m5-evidence");
  await mkdir(outDir, { recursive: true });
  await mkdir(evidenceDir, { recursive: true });
  const previousEvidenceDir = process.env.TOURAB_M5_EVIDENCE_DIR;

  try {
    const seededDirs = await seedPassingM5Evidence(evidenceDir);
    process.env.TOURAB_M5_EVIDENCE_DIR = evidenceDir;

    const handle = await startMissionControlServer({
      port: 0,
      eventStorePath: join(tempDir, "events.sqlite"),
      alertStorePath: join(tempDir, "alerts.jsonl"),
      opsStorePath: join(tempDir, "ops.sqlite"),
      logRequests: false
    });

    try {
      const steps: HttpStepResult[] = [];
      steps.push(await getJson(handle.baseHttpUrl, "/milestone5/evidence"));
      steps.push(
        await postJson(handle.baseHttpUrl, "/entry-autonomy/config", {
          approvalMode: "policy_auto",
          policyVersion: "m6-acceptance-v1"
        })
      );
      steps.push(
        await postJson(handle.baseHttpUrl, "/reconciliation", {
          positions: "ok",
          pnl: "ok",
          orders: "ok"
        })
      );
      steps.push(
        await postJson(handle.baseHttpUrl, "/strategy/register", {
          version: "challenger-m6-v3",
          notes: "M6 acceptance walkthrough",
          challenger: true,
          artifacts: {
            researchReportUrl: "https://example.test/m6/research"
          }
        })
      );
      steps.push(await postJson(handle.baseHttpUrl, "/strategy/promote", { version: "challenger-m6-v3", targetStage: "shadow" }));
      steps.push(await postJson(handle.baseHttpUrl, "/strategy/promote", { version: "challenger-m6-v3", targetStage: "paper_canary" }));
      steps.push(await postJson(handle.baseHttpUrl, "/strategy/promote", { version: "challenger-m6-v3", targetStage: "limited_prod" }));
      steps.push(await getJson(handle.baseHttpUrl, "/strategy/promotion"));
      steps.push(await getJson(handle.baseHttpUrl, "/entry-autonomy/config"));
      steps.push(await getJson(handle.baseHttpUrl, "/snapshot"));

      const finalPromotion = steps.find((s) => s.step === "GET /strategy/promotion")?.body as
        | {
            state?: {
              activeVersion?: string;
              championVersion?: string;
              versions?: Array<{ version: string; stage: string }>;
            };
          }
        | undefined;
      const evidence = steps.find((s) => s.step === "GET /milestone5/evidence")?.body as
        | {
            qualifiedDays?: number;
            requiredDays?: number;
            today?: { pass?: boolean };
          }
        | undefined;

      const limitedProdReached = Boolean(
        finalPromotion?.state?.activeVersion === "challenger-m6-v3" &&
          finalPromotion?.state?.versions?.some((v) => v.version === "challenger-m6-v3" && v.stage === "limited_prod")
      );
      const allStepsOk = steps.every((s) => s.ok);

      const report = {
        runAt: new Date().toISOString(),
        outDir,
        seededEvidenceDirs: seededDirs,
        checks: {
          allStepsOk,
          limitedProdReached,
          m5TodayPass: evidence?.today?.pass ?? false,
          m5QualifiedDays: evidence?.qualifiedDays ?? 0,
          m5RequiredDays: evidence?.requiredDays ?? 7
        },
        steps
      };

      await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf-8");
      await writeFile(
        join(outDir, "summary.md"),
        [
          "# M6 Acceptance Walkthrough",
          "",
          `- runAt: ${report.runAt}`,
          `- allStepsOk: ${report.checks.allStepsOk}`,
          `- limitedProdReached: ${report.checks.limitedProdReached}`,
          `- m5QualifiedDays: ${report.checks.m5QualifiedDays}/${report.checks.m5RequiredDays}`,
          `- m5TodayPass: ${report.checks.m5TodayPass}`,
          "",
          "## Steps",
          ...steps.map((s) => `- ${s.step}: status=${s.status} ok=${s.ok}`)
        ].join("\n"),
        "utf-8"
      );

      process.stdout.write(`M6 acceptance walkthrough written to ${outDir}\n`);
      process.stdout.write(`Report: ${join(outDir, "report.json")}\n`);
      process.stdout.write(`Summary: ${join(outDir, "summary.md")}\n`);
      if (!allStepsOk || !limitedProdReached) {
        process.exitCode = 1;
      }
    } finally {
      await handle.close();
    }
  } finally {
    if (previousEvidenceDir === undefined) {
      delete process.env.TOURAB_M5_EVIDENCE_DIR;
    } else {
      process.env.TOURAB_M5_EVIDENCE_DIR = previousEvidenceDir;
    }
    await rm(tempDir, { recursive: true, force: true });
  }
}

void main();
