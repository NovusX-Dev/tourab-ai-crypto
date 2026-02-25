import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface StepResult {
  step: string;
  status: number;
  ok: boolean;
  body: unknown;
}

interface M5Evidence {
  qualifiedDays: number;
  requiredDays: number;
  milestoneReady: boolean;
  today: { pass: boolean };
}

function parseArgs(argv: string[]): { baseUrl: string } {
  let baseUrl = "http://localhost:7071";
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--base-url" && next) {
      baseUrl = next;
      i += 1;
    }
  }
  return { baseUrl: baseUrl.replace(/\/+$/, "") };
}

async function getJson(baseUrl: string, path: string): Promise<StepResult> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      "x-tourab-role": "operator",
      "x-user-id": "m6-live-governance"
    }
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { step: `GET ${path}`, status: res.status, ok: res.ok, body };
}

async function postJson(baseUrl: string, path: string, payload: unknown): Promise<StepResult> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tourab-role": "operator",
      "x-user-id": "m6-live-governance"
    },
    body: JSON.stringify(payload)
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { step: `POST ${path}`, status: res.status, ok: res.ok, body };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join("logs", `m6-live-governance-${runStamp}`);
  await mkdir(outDir, { recursive: true });

  const version = `challenger-m6-live-${Date.now()}`;
  const steps: StepResult[] = [];
  let previousApprovalMode: "manual" | "policy_auto" = "manual";
  let previousPolicyVersion = "m6-policy-v1";

  try {
    steps.push(await getJson(args.baseUrl, "/milestone5/evidence"));
    const m5 = steps[0]?.body as M5Evidence;
    if (!steps[0]?.ok || !m5?.today?.pass || !m5?.milestoneReady || m5.qualifiedDays < m5.requiredDays) {
      throw new Error(
        `M5 readiness gate not satisfied: todayPass=${m5?.today?.pass} milestoneReady=${m5?.milestoneReady} qualifiedDays=${m5?.qualifiedDays}/${m5?.requiredDays}`
      );
    }

    const autonomyBefore = await getJson(args.baseUrl, "/entry-autonomy/config");
    steps.push(autonomyBefore);
    const autonomyPayload = autonomyBefore.body as
      | {
          config?: {
            approvalMode?: "manual" | "policy_auto";
            policyVersion?: string;
          };
        }
      | undefined;
    previousApprovalMode = autonomyPayload?.config?.approvalMode ?? "manual";
    previousPolicyVersion = autonomyPayload?.config?.policyVersion ?? "m6-policy-v1";
    steps.push(
      await postJson(args.baseUrl, "/entry-autonomy/config", {
        approvalMode: "policy_auto",
        policyVersion: `m6-live-governance-${runStamp}`
      })
    );

    steps.push(
      await postJson(args.baseUrl, "/reconciliation", {
        positions: "ok",
        pnl: "ok",
        orders: "ok"
      })
    );
    steps.push(
      await postJson(args.baseUrl, "/strategy/register", {
        version,
        notes: "M6 live governance completion check",
        challenger: true,
        artifacts: {
          researchReportUrl: "https://example.test/m6/live-governance"
        }
      })
    );
    steps.push(await postJson(args.baseUrl, "/strategy/promote", { version, targetStage: "shadow" }));
    steps.push(await postJson(args.baseUrl, "/strategy/promote", { version, targetStage: "paper_canary" }));
    steps.push(await postJson(args.baseUrl, "/strategy/promote", { version, targetStage: "limited_prod" }));
    steps.push(await getJson(args.baseUrl, "/strategy/promotion"));
    steps.push(await getJson(args.baseUrl, "/entry-autonomy/config"));

    const promotion = steps.find((item) => item.step === "GET /strategy/promotion")?.body as
      | {
          state?: { activeVersion?: string; versions?: Array<{ version: string; stage: string }> };
        }
      | undefined;
    const limitedProdReached = Boolean(
      promotion?.state?.activeVersion === version &&
        promotion?.state?.versions?.some((item) => item.version === version && item.stage === "limited_prod")
    );
    const allStepsOk = steps.every((item) => item.ok);

    const report = {
      runAt: new Date().toISOString(),
      baseUrl: args.baseUrl,
      outDir,
      candidateVersion: version,
      checks: {
        allStepsOk,
        limitedProdReached,
        m5QualifiedDays: m5.qualifiedDays,
        m5RequiredDays: m5.requiredDays,
        m5TodayPass: m5.today.pass,
        m5MilestoneReady: m5.milestoneReady
      },
      steps
    };

    await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf-8");
    await writeFile(
      join(outDir, "summary.md"),
      [
        "# M6 Live Governance Check",
        "",
        `- runAt: ${report.runAt}`,
        `- baseUrl: ${report.baseUrl}`,
        `- candidateVersion: ${version}`,
        `- allStepsOk: ${allStepsOk}`,
        `- limitedProdReached: ${limitedProdReached}`,
        `- m5QualifiedDays: ${m5.qualifiedDays}/${m5.requiredDays}`,
        `- m5TodayPass: ${m5.today.pass}`,
        `- m5MilestoneReady: ${m5.milestoneReady}`,
        "",
        "## Steps",
        ...steps.map((item) => `- ${item.step}: status=${item.status} ok=${item.ok}`)
      ].join("\n"),
      "utf-8"
    );

    process.stdout.write(`M6 live governance check written to ${outDir}\n`);
    process.stdout.write(`Report: ${join(outDir, "report.json")}\n`);
    process.stdout.write(`Summary: ${join(outDir, "summary.md")}\n`);

    if (!allStepsOk || !limitedProdReached) {
      process.exitCode = 1;
    }
  } finally {
    await postJson(args.baseUrl, "/entry-autonomy/config", {
      approvalMode: previousApprovalMode,
      policyVersion: previousPolicyVersion
    });
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
