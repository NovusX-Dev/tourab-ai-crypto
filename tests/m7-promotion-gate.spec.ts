import { describe, expect, it } from "vitest";
import {
  evaluateM7PromotionGate,
  type M7ApprovalRecord,
  type M7IndependentValidationReport,
  type M7OfflineTrainingRun
} from "../apps/dashboard/src/learning/m7-research-pipeline.js";

const RUN: M7OfflineTrainingRun = {
  schemaVersion: "m7-offline-training-run-v1",
  runId: "m7run_x",
  startedAt: "2026-02-20T01:00:00.000Z",
  completedAt: "2026-02-20T01:01:00.000Z",
  dataset: {
    datasetId: "m7ds_x",
    manifestSha256: "abc",
    recordCount: 50
  },
  trainer: {
    id: "deterministic-baseline-v1",
    seed: 0,
    description: "baseline"
  },
  candidateModelVersion: "m7-offline-2026-02-20-abcdef01",
  metrics: {
    totalTrades: 50,
    winRatePct: 54,
    meanRealizedPnlUsd: 0.02,
    expectancyUsd: 0.02,
    meanHoldSec: 240,
    meanRealizedPnlBps: 3,
    bySymbol: [
      {
        symbol: "BTC-USDT",
        trades: 50,
        winRatePct: 54,
        meanPnlUsd: 0.02
      }
    ]
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

const VALIDATION: M7IndependentValidationReport = {
  schemaVersion: "m7-independent-validation-v1",
  generatedAt: "2026-02-20T01:02:00.000Z",
  assessor: "validator-1",
  candidateModelVersion: RUN.candidateModelVersion,
  datasetId: RUN.dataset.datasetId,
  trainingRunId: RUN.runId,
  status: "pass",
  checks: {
    independentValidationPassed: true,
    riskReviewSigned: true,
    shadowOrCanaryEvidenceAttached: true
  },
  evidence: {
    validationReportUrl: "https://example.test/validation",
    riskReviewTicket: "RISK-123",
    shadowOrCanaryReportUrl: "https://example.test/shadow"
  }
};

const APPROVAL: M7ApprovalRecord = {
  schemaVersion: "m7-approval-record-v1",
  candidateModelVersion: RUN.candidateModelVersion,
  approved: true,
  approvedAt: "2026-02-20T01:03:00.000Z",
  approver: "ops-admin",
  approvalTicket: "APP-123"
};

describe("m7 promotion gate", () => {
  it("passes when all required checks are green", () => {
    const result = evaluateM7PromotionGate({
      run: RUN,
      validation: VALIDATION,
      approval: APPROVAL,
      minTradesRequired: 30
    });
    expect(result.pass).toBe(true);
    expect(result.failedChecks).toHaveLength(0);
  });

  it("fails when independent validation or approval constraints are missing", () => {
    const result = evaluateM7PromotionGate({
      run: {
        ...RUN,
        metrics: {
          ...RUN.metrics,
          totalTrades: 5
        }
      },
      validation: {
        ...VALIDATION,
        status: "fail",
        checks: {
          ...VALIDATION.checks,
          independentValidationPassed: false
        }
      },
      approval: {
        ...APPROVAL,
        approved: false
      },
      minTradesRequired: 30
    });
    expect(result.pass).toBe(false);
    expect(result.failedChecks).toContain("datasetVolumePass");
    expect(result.failedChecks).toContain("independentValidationPass");
    expect(result.failedChecks).toContain("approvalRecordedPass");
  });
});
