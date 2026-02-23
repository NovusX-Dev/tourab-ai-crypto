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
          totals: { filledEntries: 20, deterministicClosed: 19, tradeErrors: 0 },
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

async function postJson(baseHttpUrl: string, path: string, body: unknown, userId = "ops-user"): Promise<HttpStepResult> {
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
  return { step: `POST ${path}`, status: res.status, ok: res.ok, body: payload };
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
  return { step: `GET ${path}`, status: res.status, ok: res.ok, body: payload };
}

async function main(): Promise<void> {
  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join("logs", `m7-rollback-drill-${runStamp}`);
  const tempDir = await mkdtemp(join(tmpdir(), "tourab-m7-rollback-drill-"));
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
      const candidate = `m7-rollback-drill-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
      const steps: HttpStepResult[] = [];
      steps.push(await getJson(handle.baseHttpUrl, "/milestone5/evidence"));
      steps.push(
        await postJson(handle.baseHttpUrl, "/entry-autonomy/config", {
          approvalMode: "policy_auto",
          policyVersion: "m7-rollback-drill-v1"
        })
      );
      steps.push(await postJson(handle.baseHttpUrl, "/reconciliation", { positions: "ok", pnl: "ok", orders: "ok" }));
      steps.push(
        await postJson(handle.baseHttpUrl, "/strategy/register", {
          version: candidate,
          notes: "M7 rollback drill end-to-end",
          challenger: true,
          artifacts: {
            researchReportUrl: "logs/m7-retrain-2026-02-20T12-33-37-385Z/model-card.md",
            shadowReportUrl: "logs/m7-decision-bundle-2026-02-21T19-52-16-512Z/summary.md",
            canaryReportUrl: "logs/m7-governance-rehearsal-rerun-2026-02-21T19-55-02-943Z/summary.md"
          }
        })
      );
      steps.push(
        await postJson(handle.baseHttpUrl, "/strategy/promote", {
          version: candidate,
          targetStage: "shadow",
          reason: "rollback drill shadow stage"
        })
      );
      steps.push(
        await postJson(handle.baseHttpUrl, "/strategy/promote", {
          version: candidate,
          targetStage: "paper_canary",
          reason: "rollback drill canary stage"
        })
      );
      steps.push(
        await postJson(handle.baseHttpUrl, "/strategy/promote", {
          version: candidate,
          targetStage: "limited_prod",
          reason: "rollback drill limited-prod stage"
        })
      );
      steps.push(await getJson(handle.baseHttpUrl, "/strategy/promotion"));
      steps.push(await postJson(handle.baseHttpUrl, "/strategy/rollback", { reason: "rollback drill verification" }));
      steps.push(await getJson(handle.baseHttpUrl, "/strategy/promotion"));
      steps.push(await getJson(handle.baseHttpUrl, "/events?limit=200"));

      const afterLimited = steps[7].body as
        | { state?: { activeVersion?: string; versions?: Array<{ version: string; stage: string }> } }
        | undefined;
      const afterRollback = steps[9].body as
        | { state?: { activeVersion?: string } }
        | undefined;
      const evidence = steps[0].body as
        | { qualifiedDays?: number; requiredDays?: number; today?: { pass?: boolean } }
        | undefined;

      const limitedProdReached = Boolean(
        afterLimited?.state?.activeVersion === candidate &&
          afterLimited?.state?.versions?.some((v) => v.version === candidate && v.stage === "limited_prod")
      );
      const rollbackSucceeded = Boolean(afterRollback?.state?.activeVersion && afterRollback.state.activeVersion !== candidate);
      const allStepsOk = steps.every((s) => s.ok);

      const report = {
        runAt: new Date().toISOString(),
        outDir,
        candidate,
        seededEvidenceDirs: seededDirs,
        checks: {
          allStepsOk,
          m5TodayPass: evidence?.today?.pass ?? false,
          m5QualifiedDays: evidence?.qualifiedDays ?? 0,
          m5RequiredDays: evidence?.requiredDays ?? 7,
          limitedProdReached,
          rollbackSucceeded
        },
        steps
      };

      await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf-8");
      await writeFile(
        join(outDir, "summary.md"),
        [
          "# M7 Rollback Drill (Gate-Valid, Isolated)",
          "",
          `- runAt: ${report.runAt}`,
          `- candidate: ${candidate}`,
          `- allStepsOk: ${report.checks.allStepsOk}`,
          `- m5QualifiedDays: ${report.checks.m5QualifiedDays}/${report.checks.m5RequiredDays}`,
          `- m5TodayPass: ${report.checks.m5TodayPass}`,
          `- limitedProdReached: ${report.checks.limitedProdReached}`,
          `- rollbackSucceeded: ${report.checks.rollbackSucceeded}`,
          "",
          "## Steps",
          ...steps.map((s) => `- ${s.step}: status=${s.status} ok=${s.ok}`)
        ].join("\n"),
        "utf-8"
      );

      process.stdout.write(`M7 rollback drill written to ${outDir}\n`);
      process.stdout.write(`Report: ${join(outDir, "report.json")}\n`);
      process.stdout.write(`Summary: ${join(outDir, "summary.md")}\n`);
      if (!allStepsOk || !limitedProdReached || !rollbackSucceeded) {
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
