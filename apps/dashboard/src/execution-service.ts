import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import { OkxOrderResult } from "@tourab/okx-demo-adapter";
import { ExecutionIntent, RiskContext, RiskDecision, TradeProposal } from "@tourab/shared";

export interface OrderExecutionAdapter {
  placeSpotLimitOrder(intent: ExecutionIntent): Promise<OkxOrderResult>;
}

export interface HumanApprovalOptions {
  enabled: boolean;
  requiredToken?: string;
  providedToken?: string;
}

export class HumanApprovalError extends Error {
  constructor(
    public readonly code:
      | "HUMAN_APPROVAL_TOKEN_NOT_CONFIGURED"
      | "HUMAN_APPROVAL_TOKEN_REQUIRED"
      | "HUMAN_APPROVAL_TOKEN_INVALID",
    message: string
  ) {
    super(message);
    this.name = "HumanApprovalError";
  }
}

export type ExecutionResult =
  | {
      status: "REJECTED_BY_GATEKEEPER";
      decision: RiskDecision;
    }
  | {
      status: "SUBMITTED";
      decision: RiskDecision;
      order: OkxOrderResult;
    };

function enforceHumanApproval(options?: HumanApprovalOptions): void {
  if (!options?.enabled) {
    return;
  }
  if (!options.requiredToken) {
    throw new HumanApprovalError(
      "HUMAN_APPROVAL_TOKEN_NOT_CONFIGURED",
      "Human approval is enabled, but no server-side token is configured."
    );
  }
  if (!options.providedToken) {
    throw new HumanApprovalError(
      "HUMAN_APPROVAL_TOKEN_REQUIRED",
      "Human approval token is required before order submission."
    );
  }
  if (options.providedToken !== options.requiredToken) {
    throw new HumanApprovalError(
      "HUMAN_APPROVAL_TOKEN_INVALID",
      "Human approval token is invalid."
    );
  }
}

export async function executeProposalWithGatekeeper(
  proposal: TradeProposal,
  context: RiskContext,
  adapter: OrderExecutionAdapter,
  approval?: HumanApprovalOptions
): Promise<ExecutionResult> {
  const decision = evaluateTradeProposal(proposal, context);
  if (decision.status !== "APPROVE" || !decision.executionIntent) {
    return {
      status: "REJECTED_BY_GATEKEEPER",
      decision
    };
  }

  enforceHumanApproval(approval);

  const order = await adapter.placeSpotLimitOrder(decision.executionIntent);
  return {
    status: "SUBMITTED",
    decision,
    order
  };
}
