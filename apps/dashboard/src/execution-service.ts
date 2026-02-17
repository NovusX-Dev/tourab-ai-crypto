import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import { OkxOrderResult } from "@tourab/okx-demo-adapter";
import {
  ExecutionIntent,
  RiskContext,
  RiskDecision,
  RiskLimits,
  TradeProposal,
  TradeProposalSchema,
  RiskContextSchema
} from "@tourab/shared";
import { enforceHumanApproval, HumanApprovalOptions } from "./human-approval.js";

/**
 * Milestone 3 safety invariants (production-grade):
 * 1) No executable action without gatekeeper APPROVE + valid human approval.
 * 2) Missing policy configuration fails closed before any execution attempt.
 * 3) Execution mode defaults to proposal_only and blocks trading path activation.
 * 4) Every reject/approval/mode decision emits structured audit with machine-readable reason.
 * 5) If audit storage write fails, execution halts (fail-closed).
 */

const REQUIRED_LIMIT_KEYS: Array<keyof RiskLimits> = [
  "maxPerTradeRiskUsd",
  "maxDailyLossUsd",
  "maxWeeklyLossUsd",
  "maxOpenExposureUsd"
];

export interface OrderExecutionAdapter {
  placeSpotLimitOrder(intent: ExecutionIntent): Promise<OkxOrderResult>;
}

export interface ProposalAuditEvent {
  proposal_id: string;
  timestamp: string;
  actor: string;
  decision:
    | "PROPOSAL_RECEIVED"
    | "GATEKEEPER_REJECT"
    | "APPROVAL_REJECT"
    | "APPROVAL_EXPIRED"
    | "MODE_BLOCK"
    | "POLICY_CONFIG_MISSING"
    | "VALIDATION_REJECT"
    | "EXECUTION_ATTEMPT"
    | "EXECUTION_SUBMITTED";
  reason: string;
  reason_code: string;
}

export interface ProposalAuditSink {
  write(event: ProposalAuditEvent): Promise<void>;
}

export interface ExecutionPolicyOptions {
  actor: string;
  executionMode?: "proposal_only" | "demo_execution_enabled";
}

export class ExecutionInvariantError extends Error {
  constructor(
    public readonly code:
      | "MALFORMED_PROPOSAL"
      | "MALFORMED_CONTEXT"
      | "POLICY_CONFIG_MISSING"
      | "AUDIT_WRITE_FAILED",
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ExecutionInvariantError";
  }
}

export type ExecutionResult =
  | {
      status: "REJECTED_BY_GATEKEEPER";
      decision: RiskDecision;
    }
  | {
      status: "REJECTED_BY_APPROVAL";
      decision: RiskDecision;
      reason: string;
      code: string;
    }
  | {
      status: "BLOCKED_BY_MODE";
      decision: RiskDecision;
      reason: string;
      code: "MODE_EXECUTION_DISABLED";
    }
  | {
      status: "SUBMITTED";
      decision: RiskDecision;
      order: OkxOrderResult;
    };

function nowIso(): string {
  return new Date().toISOString();
}

function hasCompletePolicyConfig(context: RiskContext): boolean {
  if (!context.policy || context.policy.allowedSymbols.length === 0 || context.policy.maxNotionalUsd <= 0) {
    return false;
  }

  if (!context.limits) {
    return false;
  }

  return REQUIRED_LIMIT_KEYS.every((key) => {
    const value = context.limits?.[key];
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  });
}

async function writeAudit(sink: ProposalAuditSink, event: ProposalAuditEvent): Promise<void> {
  try {
    await sink.write(event);
  } catch (error: unknown) {
    throw new ExecutionInvariantError("AUDIT_WRITE_FAILED", "Audit write failed; execution halted.", {
      cause: error instanceof Error ? error.message : String(error),
      event
    });
  }
}

export async function executeProposalWithGatekeeper(
  proposal: TradeProposal,
  context: RiskContext,
  adapter: OrderExecutionAdapter,
  auditSink: ProposalAuditSink,
  approval: HumanApprovalOptions,
  policy: ExecutionPolicyOptions
): Promise<ExecutionResult> {
  const timestamp = nowIso();

  if (!TradeProposalSchema.safeParse(proposal).success) {
    await writeAudit(auditSink, {
      proposal_id: proposal?.proposalId ?? "unknown",
      timestamp,
      actor: policy.actor,
      decision: "VALIDATION_REJECT",
      reason: "Proposal payload failed schema validation.",
      reason_code: "MALFORMED_PROPOSAL"
    });
    throw new ExecutionInvariantError("MALFORMED_PROPOSAL", "Proposal payload failed schema validation.");
  }

  if (!RiskContextSchema.safeParse(context).success) {
    await writeAudit(auditSink, {
      proposal_id: proposal.proposalId,
      timestamp,
      actor: policy.actor,
      decision: "VALIDATION_REJECT",
      reason: "Risk context payload failed schema validation.",
      reason_code: "MALFORMED_CONTEXT"
    });
    throw new ExecutionInvariantError("MALFORMED_CONTEXT", "Risk context payload failed schema validation.");
  }

  await writeAudit(auditSink, {
    proposal_id: proposal.proposalId,
    timestamp,
    actor: policy.actor,
    decision: "PROPOSAL_RECEIVED",
    reason: "Proposal accepted for policy evaluation.",
    reason_code: "PROPOSAL_RECEIVED"
  });

  if (!hasCompletePolicyConfig(context)) {
    await writeAudit(auditSink, {
      proposal_id: proposal.proposalId,
      timestamp: nowIso(),
      actor: policy.actor,
      decision: "POLICY_CONFIG_MISSING",
      reason: "Policy configuration is missing required limits/policy fields.",
      reason_code: "POLICY_CONFIG_MISSING"
    });
    throw new ExecutionInvariantError("POLICY_CONFIG_MISSING", "Policy configuration is missing required fields.");
  }

  const decision = evaluateTradeProposal(proposal, context);
  if (decision.status !== "APPROVE" || !decision.executionIntent) {
    await writeAudit(auditSink, {
      proposal_id: proposal.proposalId,
      timestamp: nowIso(),
      actor: policy.actor,
      decision: "GATEKEEPER_REJECT",
      reason: decision.violations.map((violation) => violation.code).join(",") || "REJECTED",
      reason_code: decision.violations[0]?.code ?? "GATEKEEPER_REJECT"
    });
    return {
      status: "REJECTED_BY_GATEKEEPER",
      decision
    };
  }

  try {
    enforceHumanApproval({
      ...approval,
      proposalId: proposal.proposalId
    });
  } catch (error: unknown) {
    const code =
      error instanceof Error && "code" in error && typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "HUMAN_APPROVAL_REJECT";
    const reason = error instanceof Error ? error.message : String(error);
    await writeAudit(auditSink, {
      proposal_id: proposal.proposalId,
      timestamp: nowIso(),
      actor: policy.actor,
      decision: code === "HUMAN_APPROVAL_EXPIRED" ? "APPROVAL_EXPIRED" : "APPROVAL_REJECT",
      reason,
      reason_code: code
    });
    return {
      status: "REJECTED_BY_APPROVAL",
      decision,
      reason,
      code
    };
  }

  const mode = policy.executionMode ?? context.policy?.executionMode ?? "proposal_only";
  if (mode !== "demo_execution_enabled") {
    await writeAudit(auditSink, {
      proposal_id: proposal.proposalId,
      timestamp: nowIso(),
      actor: policy.actor,
      decision: "MODE_BLOCK",
      reason: "Execution mode blocks trading path activation.",
      reason_code: "MODE_EXECUTION_DISABLED"
    });
    return {
      status: "BLOCKED_BY_MODE",
      decision,
      reason: "Execution mode blocks trading path activation.",
      code: "MODE_EXECUTION_DISABLED"
    };
  }

  await writeAudit(auditSink, {
    proposal_id: proposal.proposalId,
    timestamp: nowIso(),
    actor: policy.actor,
    decision: "EXECUTION_ATTEMPT",
    reason: "Gatekeeper approved and human approval validated.",
    reason_code: "EXECUTION_ATTEMPT"
  });

  const order = await adapter.placeSpotLimitOrder(decision.executionIntent);

  await writeAudit(auditSink, {
    proposal_id: proposal.proposalId,
    timestamp: nowIso(),
    actor: policy.actor,
    decision: "EXECUTION_SUBMITTED",
    reason: "Order submitted to execution adapter.",
    reason_code: "EXECUTION_SUBMITTED"
  });

  return {
    status: "SUBMITTED",
    decision,
    order
  };
}
