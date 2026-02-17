import { describe, expect, it } from "vitest";
import {
  executeProposalWithGatekeeper,
  ExecutionInvariantError,
  OrderExecutionAdapter,
  ProposalAuditEvent
} from "../apps/dashboard/src/execution-service.js";
import { RiskContext, TradeProposal } from "@tourab/shared";

function validProposal(): TradeProposal {
  return {
    proposalId: "exec-001",
    symbol: "BTC-USDT",
    side: "buy",
    qtyBase: 0.0001,
    entryPrice: 100000,
    stopPrice: 98000,
    estimatedMaxLossUsd: 0.2
  };
}

function validContext(): RiskContext {
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

function validApproval(proposalId = "exec-001") {
  return {
    enabled: true,
    requiredToken: "correct-token",
    providedToken: "correct-token",
    approvedProposalId: proposalId,
    expiresAtIso: new Date(Date.now() + 60_000).toISOString()
  };
}

describe("executeProposalWithGatekeeper invariants", () => {
  it("does not call adapter when gatekeeper rejects", async () => {
    let callCount = 0;
    const auditEvents: ProposalAuditEvent[] = [];
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder() {
        callCount += 1;
        return {
          ordId: "1",
          clOrdId: "x",
          sCode: "0",
          sMsg: ""
        };
      }
    };

    const rejected = await executeProposalWithGatekeeper(
      { ...validProposal(), estimatedMaxLossUsd: 0.8 },
      validContext(),
      adapter,
      {
        async write(event) {
          auditEvents.push(event);
        }
      },
      validApproval(),
      {
        actor: "tester"
      }
    );

    expect(rejected.status).toBe("REJECTED_BY_GATEKEEPER");
    expect(rejected.decision.status).toBe("REJECT");
    expect(callCount).toBe(0);
    expect(auditEvents.some((event) => event.decision === "GATEKEEPER_REJECT")).toBe(true);
  });

  it("blocks execution in proposal_only mode even after gatekeeper + approval pass", async () => {
    let callCount = 0;
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder() {
        callCount += 1;
        return {
          ordId: "200",
          clOrdId: "x",
          sCode: "0",
          sMsg: ""
        };
      }
    };

    const result = await executeProposalWithGatekeeper(
      validProposal(),
      validContext(),
      adapter,
      {
        async write() {
          return;
        }
      },
      validApproval(),
      {
        actor: "tester",
        executionMode: "proposal_only"
      }
    );

    expect(result.status).toBe("BLOCKED_BY_MODE");
    expect(callCount).toBe(0);
  });

  it("submits only when mode allows and approval is valid", async () => {
    let callCount = 0;
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder(intent) {
        callCount += 1;
        return {
          ordId: "200",
          clOrdId: `tourab-${intent.proposalId}`,
          sCode: "0",
          sMsg: ""
        };
      }
    };

    const submitted = await executeProposalWithGatekeeper(
      validProposal(),
      {
        ...validContext(),
        policy: { ...validContext().policy!, executionMode: "demo_execution_enabled" }
      },
      adapter,
      {
        async write() {
          return;
        }
      },
      validApproval(),
      {
        actor: "tester",
        executionMode: "demo_execution_enabled"
      }
    );

    expect(submitted.status).toBe("SUBMITTED");
    expect(callCount).toBe(1);
  });

  it("rejects expired approval", async () => {
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder() {
        throw new Error("should not execute");
      }
    };

    const result = await executeProposalWithGatekeeper(
      validProposal(),
      validContext(),
      adapter,
      {
        async write() {
          return;
        }
      },
      {
        ...validApproval(),
        expiresAtIso: new Date(Date.now() - 10).toISOString()
      },
      {
        actor: "tester",
        executionMode: "demo_execution_enabled"
      }
    );

    expect(result.status).toBe("REJECTED_BY_APPROVAL");
    if (result.status === "REJECTED_BY_APPROVAL") {
      expect(result.code).toBe("HUMAN_APPROVAL_EXPIRED");
    }
  });

  it("rejects approval for different proposal", async () => {
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder() {
        throw new Error("should not execute");
      }
    };

    const result = await executeProposalWithGatekeeper(
      validProposal(),
      validContext(),
      adapter,
      {
        async write() {
          return;
        }
      },
      {
        ...validApproval("different-proposal")
      },
      {
        actor: "tester",
        executionMode: "demo_execution_enabled"
      }
    );

    expect(result.status).toBe("REJECTED_BY_APPROVAL");
    if (result.status === "REJECTED_BY_APPROVAL") {
      expect(result.code).toBe("HUMAN_APPROVAL_FOR_DIFFERENT_PROPOSAL");
    }
  });

  it("fails execution when approval is disabled (regression guard)", async () => {
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder() {
        throw new Error("should not execute");
      }
    };

    const result = await executeProposalWithGatekeeper(
      validProposal(),
      {
        ...validContext(),
        policy: { ...validContext().policy!, executionMode: "demo_execution_enabled" }
      },
      adapter,
      {
        async write() {
          return;
        }
      },
      {
        enabled: false
      },
      {
        actor: "tester",
        executionMode: "demo_execution_enabled"
      }
    );

    expect(result.status).toBe("REJECTED_BY_APPROVAL");
    if (result.status === "REJECTED_BY_APPROVAL") {
      expect(result.code).toBe("HUMAN_APPROVAL_REQUIRED");
    }
  });

  it("blocks stale market/account/orders data before execution", async () => {
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder() {
        throw new Error("should not execute");
      }
    };

    const staleTs = new Date(Date.now() - 10 * 60_000).toISOString();
    const result = await executeProposalWithGatekeeper(
      validProposal(),
      {
        ...validContext(),
        market: { ...validContext().market, asOf: staleTs },
        account: { ...validContext().account, asOf: staleTs },
        ordersAsOf: staleTs,
        policy: { ...validContext().policy!, executionMode: "demo_execution_enabled" }
      },
      adapter,
      {
        async write() {
          return;
        }
      },
      validApproval(),
      {
        actor: "tester",
        executionMode: "demo_execution_enabled"
      }
    );

    expect(result.status).toBe("BLOCKED_BY_FRESHNESS");
    if (result.status === "BLOCKED_BY_FRESHNESS") {
      expect(result.code).toBe("STALE_MARKET_DATA");
    }
  });

  it("fails closed when policy configuration is missing", async () => {
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder() {
        throw new Error("should not execute");
      }
    };

    await expect(
      executeProposalWithGatekeeper(
        validProposal(),
        {
          ...validContext(),
          limits: undefined,
          policy: undefined
        },
        adapter,
        {
          async write() {
            return;
          }
        },
        validApproval(),
        {
          actor: "tester",
          executionMode: "demo_execution_enabled"
        }
      )
    ).rejects.toMatchObject({
      code: "POLICY_CONFIG_MISSING"
    } satisfies Partial<ExecutionInvariantError>);
  });

  it("fails closed on malformed proposal", async () => {
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder() {
        throw new Error("should not execute");
      }
    };

    await expect(
      executeProposalWithGatekeeper(
        {
          ...(validProposal() as unknown as Record<string, unknown>),
          entryPrice: -1
        } as unknown as TradeProposal,
        validContext(),
        adapter,
        {
          async write() {
            return;
          }
        },
        validApproval(),
        {
          actor: "tester",
          executionMode: "demo_execution_enabled"
        }
      )
    ).rejects.toMatchObject({
      code: "MALFORMED_PROPOSAL"
    } satisfies Partial<ExecutionInvariantError>);
  });

  it("halts on audit storage write failure before execution", async () => {
    let callCount = 0;
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder() {
        callCount += 1;
        return {
          ordId: "200",
          clOrdId: "x",
          sCode: "0",
          sMsg: ""
        };
      }
    };

    await expect(
      executeProposalWithGatekeeper(
        validProposal(),
        {
          ...validContext(),
          policy: { ...validContext().policy!, executionMode: "demo_execution_enabled" }
        },
        adapter,
        {
          async write() {
            throw new Error("disk full");
          }
        },
        validApproval(),
        {
          actor: "tester",
          executionMode: "demo_execution_enabled"
        }
      )
    ).rejects.toMatchObject({
      code: "AUDIT_WRITE_FAILED"
    } satisfies Partial<ExecutionInvariantError>);

    expect(callCount).toBe(0);
  });
});
