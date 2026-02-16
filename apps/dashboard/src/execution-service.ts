import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import { OkxOrderResult } from "@tourab/okx-demo-adapter";
import { ExecutionIntent, RiskContext, RiskDecision, TradeProposal } from "@tourab/shared";
import { enforceHumanApproval, HumanApprovalOptions } from "./human-approval.js";

export interface OrderExecutionAdapter {
  placeSpotLimitOrder(intent: ExecutionIntent): Promise<OkxOrderResult>;
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
