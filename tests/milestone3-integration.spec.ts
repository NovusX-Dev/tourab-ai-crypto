import { describe, expect, it } from "vitest";
import { executeProposalWithGatekeeper, type OrderExecutionAdapter } from "../apps/dashboard/src/execution-service.js";
import type { RiskContext, TradeProposal } from "@tourab/shared";

function context(): RiskContext {
  const now = new Date().toISOString();
  return {
    account: {
      equityUsd: 50,
      currentDailyLossUsd: 0.1,
      currentWeeklyLossUsd: 0.5,
      currentOpenExposureUsd: 2,
      asOf: now
    },
    instrument: {
      symbol: "BTC-USDT",
      minSz: 0.0001,
      lotSz: 0.0001,
      tickSz: 0.1
    },
    market: {
      markPrice: 100500,
      asOf: now
    },
    ordersAsOf: now,
    limits: {
      maxPerTradeRiskUsd: 0.5,
      maxDailyLossUsd: 1,
      maxWeeklyLossUsd: 2.5,
      maxOpenExposureUsd: 15
    },
    policy: {
      allowedSymbols: ["BTC-USDT"],
      maxNotionalUsd: 20,
      executionMode: "proposal_only"
    }
  };
}

function proposal(overrides?: Partial<TradeProposal>): TradeProposal {
  return {
    proposalId: "milestone3-proposal",
    symbol: "BTC-USDT",
    side: "buy",
    qtyBase: 0.0001,
    entryPrice: 100000,
    stopPrice: 98000,
    estimatedMaxLossUsd: 0.2,
    ...overrides
  };
}

function approval(overrides?: Record<string, unknown>) {
  return {
    enabled: true,
    requiredToken: "token",
    providedToken: "token",
    approvedProposalId: "milestone3-proposal",
    expiresAtIso: new Date(Date.now() + 60_000).toISOString(),
    ...overrides
  };
}

function adapter(callRef: { count: number }): OrderExecutionAdapter {
  return {
    async placeSpotLimitOrder() {
      callRef.count += 1;
      return {
        ordId: "1",
        clOrdId: "cl-1",
        sCode: "0",
        sMsg: ""
      };
    }
  };
}

describe("Milestone 3 integration contracts", () => {
  it("Proposal -> reject", async () => {
    const calls = { count: 0 };
    const result = await executeProposalWithGatekeeper(
      proposal({ estimatedMaxLossUsd: 5 }),
      context(),
      adapter(calls),
      { async write() {} },
      approval(),
      { actor: "tester", executionMode: "proposal_only" }
    );

    expect(result.status).toBe("REJECTED_BY_GATEKEEPER");
    expect(calls.count).toBe(0);
  });

  it("Proposal -> approve -> still no execution allowed", async () => {
    const calls = { count: 0 };
    const result = await executeProposalWithGatekeeper(
      proposal(),
      context(),
      adapter(calls),
      { async write() {} },
      approval(),
      { actor: "tester", executionMode: "proposal_only" }
    );

    expect(result.status).toBe("BLOCKED_BY_MODE");
    expect(calls.count).toBe(0);
  });

  it("Expired approval -> execution blocked", async () => {
    const calls = { count: 0 };
    const result = await executeProposalWithGatekeeper(
      proposal(),
      { ...context(), policy: { ...context().policy!, executionMode: "demo_execution_enabled" } },
      adapter(calls),
      { async write() {} },
      approval({ expiresAtIso: new Date(Date.now() - 1_000).toISOString() }),
      { actor: "tester", executionMode: "demo_execution_enabled" }
    );

    expect(result.status).toBe("REJECTED_BY_APPROVAL");
    if (result.status === "REJECTED_BY_APPROVAL") {
      expect(result.code).toBe("HUMAN_APPROVAL_EXPIRED");
    }
    expect(calls.count).toBe(0);
  });

  it("Double approval attempt (same approver metadata) stays blocked in proposal_only", async () => {
    const calls = { count: 0 };
    const first = await executeProposalWithGatekeeper(
      proposal(),
      context(),
      adapter(calls),
      { async write() {} },
      approval(),
      { actor: "tester", executionMode: "proposal_only" }
    );
    const second = await executeProposalWithGatekeeper(
      proposal(),
      context(),
      adapter(calls),
      { async write() {} },
      approval(),
      { actor: "tester", executionMode: "proposal_only" }
    );

    expect(first.status).toBe("BLOCKED_BY_MODE");
    expect(second.status).toBe("BLOCKED_BY_MODE");
    expect(calls.count).toBe(0);
  });

  it("Approval on modified proposal fails", async () => {
    const calls = { count: 0 };
    const result = await executeProposalWithGatekeeper(
      proposal({ proposalId: "modified-proposal" }),
      { ...context(), policy: { ...context().policy!, executionMode: "demo_execution_enabled" } },
      adapter(calls),
      { async write() {} },
      approval({ approvedProposalId: "milestone3-proposal" }),
      { actor: "tester", executionMode: "demo_execution_enabled" }
    );

    expect(result.status).toBe("REJECTED_BY_APPROVAL");
    if (result.status === "REJECTED_BY_APPROVAL") {
      expect(result.code).toBe("HUMAN_APPROVAL_FOR_DIFFERENT_PROPOSAL");
    }
    expect(calls.count).toBe(0);
  });
});
