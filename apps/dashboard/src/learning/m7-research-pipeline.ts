import { createHash } from "node:crypto";
import type { ClosedTradeFeatureRecord } from "@tourab/shared";

export interface M7DatasetManifest {
  schemaVersion: "m7-dataset-manifest-v1";
  datasetId: string;
  createdAt: string;
  datasetTag?: string;
  source: {
    type: "mission_control_api";
    endpoint: string;
    governanceModelVersion: string;
  };
  filters: {
    limit: number;
    lookbackDays: number;
  };
  recordCount: number;
  range: {
    minClosedAt?: string;
    maxClosedAt?: string;
  };
  distinct: {
    symbols: string[];
    exitReasons: string[];
    policyVersions: string[];
    strategyVersions: string[];
    modelVersions: string[];
    featureSchemaVersions: string[];
  };
  artifact: {
    file: string;
    sha256: string;
    format: "ndjson";
  };
}

export interface M7OfflineTrainingRun {
  schemaVersion: "m7-offline-training-run-v1";
  runId: string;
  startedAt: string;
  completedAt: string;
  dataset: {
    datasetId: string;
    manifestSha256: string;
    recordCount: number;
  };
  trainer: {
    id: "deterministic-baseline-v1";
    seed: 0;
    description: string;
  };
  candidateModelVersion: string;
  metrics: {
    totalTrades: number;
    winRatePct: number;
    meanRealizedPnlUsd: number;
    expectancyUsd: number;
    meanHoldSec: number;
    meanRealizedPnlBps: number;
    bySymbol: Array<{
      symbol: string;
      trades: number;
      winRatePct: number;
      meanPnlUsd: number;
    }>;
  };
  governance: {
    deployAction: "blocked_until_validation_and_approval";
    requiredChecks: string[];
  };
}

export interface M7IndependentValidationReport {
  schemaVersion: "m7-independent-validation-v1";
  generatedAt: string;
  assessor: string;
  candidateModelVersion: string;
  datasetId: string;
  trainingRunId: string;
  status: "pass" | "fail";
  checks: {
    independentValidationPassed: boolean;
    riskReviewSigned: boolean;
    shadowOrCanaryEvidenceAttached: boolean;
  };
  evidence: {
    validationReportUrl?: string;
    riskReviewTicket?: string;
    shadowOrCanaryReportUrl?: string;
  };
  notes?: string;
}

export interface M7ApprovalRecord {
  schemaVersion: "m7-approval-record-v1";
  candidateModelVersion: string;
  approved: boolean;
  approvedAt: string;
  approver: string;
  approvalTicket: string;
  notes?: string;
}

export interface M7PromotionGateResult {
  schemaVersion: "m7-promotion-gate-v1";
  generatedAt: string;
  candidateModelVersion: string;
  trainingRunId: string;
  pass: boolean;
  minTradesRequired: number;
  checks: {
    datasetVolumePass: boolean;
    independentValidationPass: boolean;
    riskReviewPass: boolean;
    shadowOrCanaryEvidencePass: boolean;
    approvalRecordedPass: boolean;
    modelVersionMatchPass: boolean;
    walkForwardStabilityPass: boolean;
  };
  failedChecks: string[];
}

export interface M7WalkForwardWindowSummary {
  index: number;
  testStart: string;
  testEnd: string;
  trades: number;
  expectancyUsd: number;
  winRatePct: number;
  controlViolationRatePct: number;
  pass: boolean;
}

export interface M7WalkForwardReport {
  schemaVersion: "m7-walk-forward-report-v1";
  generatedAt: string;
  candidateModelVersion: string;
  datasetId: string;
  config: {
    minTradesPerWindow: number;
    minWindows: number;
    minPassRatePct: number;
    minExpectancyUsd: number;
    maxControlViolationRatePct: number;
  };
  summary: {
    windowsEvaluated: number;
    windowsPassed: number;
    passRatePct: number;
    pass: boolean;
  };
  windows: M7WalkForwardWindowSummary[];
}

export function round6(value: number): number {
  return Number(value.toFixed(6));
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((acc, item) => acc + item, 0);
  return total / values.length;
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function toWindowSummary(input: {
  index: number;
  testStart: string;
  testEnd: string;
  records: ClosedTradeFeatureRecord[];
  minTradesPerWindow: number;
  minExpectancyUsd: number;
  maxControlViolationRatePct: number;
}): M7WalkForwardWindowSummary {
  const trades = input.records.length;
  const wins = input.records.filter((item) => item.realizedPnlUsd > 0).length;
  const expectancyUsd = round6(mean(input.records.map((item) => item.realizedPnlUsd)));
  const winRatePct = round6(trades > 0 ? (wins / trades) * 100 : 0);
  const violations = input.records.filter((item) => item.exitReason === "manual" || item.exitReason === "circuit_breaker").length;
  const controlViolationRatePct = round6(trades > 0 ? (violations / trades) * 100 : 0);
  const pass =
    trades >= input.minTradesPerWindow &&
    expectancyUsd >= input.minExpectancyUsd &&
    controlViolationRatePct <= input.maxControlViolationRatePct;
  return {
    index: input.index,
    testStart: input.testStart,
    testEnd: input.testEnd,
    trades,
    expectancyUsd,
    winRatePct,
    controlViolationRatePct,
    pass
  };
}

export function buildWalkForwardReport(input: {
  generatedAt: string;
  candidateModelVersion: string;
  datasetId: string;
  records: ClosedTradeFeatureRecord[];
  windowCount: number;
  minTradesPerWindow: number;
  minWindows: number;
  minPassRatePct: number;
  minExpectancyUsd: number;
  maxControlViolationRatePct: number;
}): M7WalkForwardReport {
  const sorted = [...input.records].sort((a, b) => a.closedAt.localeCompare(b.closedAt));
  const windows: M7WalkForwardWindowSummary[] = [];
  const boundedWindowCount = Math.max(1, Math.floor(input.windowCount));
  const sliceSize = Math.max(1, Math.floor(sorted.length / boundedWindowCount));
  let index = 0;
  for (let i = 0; i < sorted.length; i += sliceSize) {
    const bucket = sorted.slice(i, i + sliceSize);
    if (bucket.length === 0) {
      continue;
    }
    windows.push(
      toWindowSummary({
        index,
        testStart: bucket[0].closedAt,
        testEnd: bucket[bucket.length - 1].closedAt,
        records: bucket,
        minTradesPerWindow: input.minTradesPerWindow,
        minExpectancyUsd: input.minExpectancyUsd,
        maxControlViolationRatePct: input.maxControlViolationRatePct
      })
    );
    index += 1;
  }
  const windowsEvaluated = windows.length;
  const windowsPassed = windows.filter((item) => item.pass).length;
  const passRatePct = round6(windowsEvaluated > 0 ? (windowsPassed / windowsEvaluated) * 100 : 0);
  const pass =
    windowsEvaluated >= Math.max(1, Math.floor(input.minWindows)) && passRatePct >= clampPct(input.minPassRatePct);
  return {
    schemaVersion: "m7-walk-forward-report-v1",
    generatedAt: input.generatedAt,
    candidateModelVersion: input.candidateModelVersion,
    datasetId: input.datasetId,
    config: {
      minTradesPerWindow: Math.max(1, Math.floor(input.minTradesPerWindow)),
      minWindows: Math.max(1, Math.floor(input.minWindows)),
      minPassRatePct: clampPct(input.minPassRatePct),
      minExpectancyUsd: input.minExpectancyUsd,
      maxControlViolationRatePct: clampPct(input.maxControlViolationRatePct)
    },
    summary: {
      windowsEvaluated,
      windowsPassed,
      passRatePct,
      pass
    },
    windows
  };
}

export function buildDatasetSnapshot(input: {
  features: ClosedTradeFeatureRecord[];
  createdAt: string;
  sourceEndpoint: string;
  governanceModelVersion: string;
  limit: number;
  lookbackDays: number;
  datasetTag?: string;
  artifactFile: string;
}): { manifest: M7DatasetManifest; ndjson: string } {
  const sorted = [...input.features].sort((a, b) => a.closedAt.localeCompare(b.closedAt));
  const ndjson = sorted.map((item) => JSON.stringify(item)).join("\n");
  const minClosedAt = sorted[0]?.closedAt;
  const maxClosedAt = sorted.at(-1)?.closedAt;
  const datasetSeed = [
    input.createdAt,
    input.sourceEndpoint,
    input.governanceModelVersion,
    String(input.limit),
    String(input.lookbackDays),
    sha256(ndjson)
  ].join("|");
  const datasetId = `m7ds_${sha256(datasetSeed).slice(0, 16)}`;
  const distinct = {
    symbols: [...new Set(sorted.map((item) => item.symbol))].sort(),
    exitReasons: [...new Set(sorted.map((item) => item.exitReason))].sort(),
    policyVersions: [...new Set(sorted.map((item) => item.policyVersion))].sort(),
    strategyVersions: [...new Set(sorted.map((item) => item.strategyVersion))].sort(),
    modelVersions: [...new Set(sorted.map((item) => item.modelVersion))].sort(),
    featureSchemaVersions: [...new Set(sorted.map((item) => item.featureSchemaVersion))].sort()
  };
  return {
    manifest: {
      schemaVersion: "m7-dataset-manifest-v1",
      datasetId,
      createdAt: input.createdAt,
      datasetTag: input.datasetTag,
      source: {
        type: "mission_control_api",
        endpoint: input.sourceEndpoint,
        governanceModelVersion: input.governanceModelVersion
      },
      filters: {
        limit: input.limit,
        lookbackDays: input.lookbackDays
      },
      recordCount: sorted.length,
      range: {
        minClosedAt,
        maxClosedAt
      },
      distinct,
      artifact: {
        file: input.artifactFile,
        sha256: sha256(ndjson),
        format: "ndjson"
      }
    },
    ndjson
  };
}

export function buildOfflineTrainingRun(input: {
  startedAt: string;
  completedAt: string;
  manifest: M7DatasetManifest;
  manifestRawJson: string;
  records: ClosedTradeFeatureRecord[];
}): M7OfflineTrainingRun {
  const records = [...input.records];
  const wins = records.filter((item) => item.realizedPnlUsd > 0).length;
  const winRatePct = records.length > 0 ? (wins / records.length) * 100 : 0;
  const meanRealizedPnlUsd = mean(records.map((item) => item.realizedPnlUsd));
  const meanHoldSec = mean(records.map((item) => item.holdSec));
  const meanRealizedPnlBps = mean(records.map((item) => item.realizedPnlBps));
  const bySymbolMap = new Map<string, ClosedTradeFeatureRecord[]>();
  for (const item of records) {
    const bucket = bySymbolMap.get(item.symbol) ?? [];
    bucket.push(item);
    bySymbolMap.set(item.symbol, bucket);
  }
  const bySymbol = [...bySymbolMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([symbol, items]) => {
      const symbolWins = items.filter((item) => item.realizedPnlUsd > 0).length;
      return {
        symbol,
        trades: items.length,
        winRatePct: round6(items.length > 0 ? (symbolWins / items.length) * 100 : 0),
        meanPnlUsd: round6(mean(items.map((item) => item.realizedPnlUsd)))
      };
    });
  const runSeed = [input.manifest.datasetId, input.startedAt, input.completedAt, sha256(input.manifestRawJson)].join("|");
  const runId = `m7run_${sha256(runSeed).slice(0, 16)}`;
  const candidateModelVersion = `m7-offline-${input.completedAt.slice(0, 10)}-${sha256(runSeed).slice(0, 8)}`;
  return {
    schemaVersion: "m7-offline-training-run-v1",
    runId,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    dataset: {
      datasetId: input.manifest.datasetId,
      manifestSha256: sha256(input.manifestRawJson),
      recordCount: records.length
    },
    trainer: {
      id: "deterministic-baseline-v1",
      seed: 0,
      description: "Deterministic summary trainer used for governed offline baseline reporting."
    },
    candidateModelVersion,
    metrics: {
      totalTrades: records.length,
      winRatePct: round6(winRatePct),
      meanRealizedPnlUsd: round6(meanRealizedPnlUsd),
      expectancyUsd: round6(meanRealizedPnlUsd),
      meanHoldSec: round6(meanHoldSec),
      meanRealizedPnlBps: round6(meanRealizedPnlBps),
      bySymbol
    },
    governance: {
      deployAction: "blocked_until_validation_and_approval",
      requiredChecks: [
        "independent_validation_passed",
        "risk_review_signed",
        "operator_approval_recorded",
        "shadow_or_canary_evidence_attached"
      ]
    }
  };
}

export function parseClosedTradeFeaturesNdjson(ndjson: string): ClosedTradeFeatureRecord[] {
  return ndjson
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ClosedTradeFeatureRecord);
}

export function evaluateM7PromotionGate(input: {
  run: M7OfflineTrainingRun;
  validation: M7IndependentValidationReport;
  approval: M7ApprovalRecord;
  walkForward: M7WalkForwardReport;
  minTradesRequired: number;
}): M7PromotionGateResult {
  const modelVersionMatchPass =
    input.validation.candidateModelVersion === input.run.candidateModelVersion &&
    input.approval.candidateModelVersion === input.run.candidateModelVersion &&
    input.walkForward.candidateModelVersion === input.run.candidateModelVersion;
  const datasetVolumePass = input.run.metrics.totalTrades >= input.minTradesRequired;
  const independentValidationPass = input.validation.status === "pass" && input.validation.checks.independentValidationPassed;
  const riskReviewPass = input.validation.checks.riskReviewSigned;
  const shadowOrCanaryEvidencePass = input.validation.checks.shadowOrCanaryEvidenceAttached;
  const approvalRecordedPass = input.approval.approved;
  const walkForwardStabilityPass = input.walkForward.summary.pass;
  const checks = {
    datasetVolumePass,
    independentValidationPass,
    riskReviewPass,
    shadowOrCanaryEvidencePass,
    approvalRecordedPass,
    modelVersionMatchPass,
    walkForwardStabilityPass
  };
  const failedChecks = Object.entries(checks)
    .filter(([, pass]) => !pass)
    .map(([check]) => check);
  return {
    schemaVersion: "m7-promotion-gate-v1",
    generatedAt: new Date().toISOString(),
    candidateModelVersion: input.run.candidateModelVersion,
    trainingRunId: input.run.runId,
    pass: failedChecks.length === 0,
    minTradesRequired: input.minTradesRequired,
    checks,
    failedChecks
  };
}
