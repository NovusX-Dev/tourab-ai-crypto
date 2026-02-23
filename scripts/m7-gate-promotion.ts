import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  evaluateM7PromotionGate,
  type M7ApprovalRecord,
  type M7IndependentValidationReport,
  type M7OfflineTrainingRun
} from "../apps/dashboard/src/learning/m7-research-pipeline.js";

function parseArgs(argv: string[]): {
  retrainDir: string;
  validationReportPath: string;
  approvalRecordPath: string;
  minTradesRequired: number;
  outDir: string;
} {
  let retrainDir = "";
  let validationReportPath = "";
  let approvalRecordPath = "";
  let minTradesRequired = 30;
  let outDir = join("logs", `m7-gate-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (token === "--retrain-dir" && value) {
      retrainDir = value;
      i += 1;
    } else if (token === "--validation-report" && value) {
      validationReportPath = value;
      i += 1;
    } else if (token === "--approval-record" && value) {
      approvalRecordPath = value;
      i += 1;
    } else if (token === "--min-trades" && value) {
      minTradesRequired = Math.max(1, Math.floor(Number(value) || minTradesRequired));
      i += 1;
    } else if (token === "--out-dir" && value) {
      outDir = value;
      i += 1;
    }
  }
  if (!retrainDir) {
    throw new Error("Missing required argument --retrain-dir");
  }
  if (!validationReportPath) {
    validationReportPath = join(retrainDir, "validation-report.json");
  }
  if (!approvalRecordPath) {
    approvalRecordPath = join(retrainDir, "approval-record.json");
  }
  return { retrainDir, validationReportPath, approvalRecordPath, minTradesRequired, outDir };
}

async function ensureWorkflowTemplates(input: {
  run: M7OfflineTrainingRun;
  validationReportPath: string;
  approvalRecordPath: string;
}): Promise<{ missingRequiredFiles: boolean; messages: string[] }> {
  const messages: string[] = [];
  let missingRequiredFiles = false;
  try {
    await readFile(input.validationReportPath, "utf-8");
  } catch {
    const template: M7IndependentValidationReport = {
      schemaVersion: "m7-independent-validation-v1",
      generatedAt: new Date().toISOString(),
      assessor: "independent-validator",
      candidateModelVersion: input.run.candidateModelVersion,
      datasetId: input.run.dataset.datasetId,
      trainingRunId: input.run.runId,
      status: "fail",
      checks: {
        independentValidationPassed: false,
        riskReviewSigned: false,
        shadowOrCanaryEvidenceAttached: false
      },
      evidence: {},
      notes: "Fill this report and set status/checks before running the gate again."
    };
    await writeFile(`${input.validationReportPath}.template.json`, JSON.stringify(template, null, 2), "utf-8");
    missingRequiredFiles = true;
    messages.push(`Missing validation report: wrote template ${input.validationReportPath}.template.json`);
  }
  try {
    await readFile(input.approvalRecordPath, "utf-8");
  } catch {
    const template: M7ApprovalRecord = {
      schemaVersion: "m7-approval-record-v1",
      candidateModelVersion: input.run.candidateModelVersion,
      approved: false,
      approvedAt: new Date().toISOString(),
      approver: "operator-id",
      approvalTicket: "ticket-id",
      notes: "Fill this approval record and set approved=true before running the gate again."
    };
    await writeFile(`${input.approvalRecordPath}.template.json`, JSON.stringify(template, null, 2), "utf-8");
    missingRequiredFiles = true;
    messages.push(`Missing approval record: wrote template ${input.approvalRecordPath}.template.json`);
  }
  return { missingRequiredFiles, messages };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.outDir, { recursive: true });
  const runRaw = await readFile(join(args.retrainDir, "training-run.json"), "utf-8");
  const run = JSON.parse(runRaw) as M7OfflineTrainingRun;
  const templates = await ensureWorkflowTemplates({
    run,
    validationReportPath: args.validationReportPath,
    approvalRecordPath: args.approvalRecordPath
  });
  if (templates.missingRequiredFiles) {
    const summaryPath = join(args.outDir, "summary.md");
    await writeFile(
      summaryPath,
      ["# M7 Promotion Gate", "", "- pass: false", "- reason: missing required workflow artifacts", "", ...templates.messages].join(
        "\n"
      ),
      "utf-8"
    );
    for (const message of templates.messages) {
      process.stdout.write(`${message}\n`);
    }
    process.exitCode = 1;
    return;
  }

  const validation = JSON.parse(await readFile(args.validationReportPath, "utf-8")) as M7IndependentValidationReport;
  const approval = JSON.parse(await readFile(args.approvalRecordPath, "utf-8")) as M7ApprovalRecord;
  const result = evaluateM7PromotionGate({
    run,
    validation,
    approval,
    minTradesRequired: args.minTradesRequired
  });
  const resultPath = join(args.outDir, "gate-result.json");
  await writeFile(resultPath, JSON.stringify(result, null, 2), "utf-8");
  await writeFile(
    join(args.outDir, "summary.md"),
    [
      "# M7 Promotion Gate",
      "",
      `- pass: ${result.pass}`,
      `- candidateModelVersion: ${result.candidateModelVersion}`,
      `- trainingRunId: ${result.trainingRunId}`,
      `- minTradesRequired: ${result.minTradesRequired}`,
      "",
      "## Checks",
      ...Object.entries(result.checks).map(([key, pass]) => `- ${key}: ${pass}`),
      "",
      "## Failed Checks",
      ...(result.failedChecks.length > 0 ? result.failedChecks.map((check) => `- ${check}`) : ["- none"])
    ].join("\n"),
    "utf-8"
  );
  process.stdout.write(`M7 promotion gate result written to ${resultPath}\n`);
  if (!result.pass) {
    process.exitCode = 1;
  }
}

void main();
