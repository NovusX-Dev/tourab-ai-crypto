import { describe, expect, it } from "vitest";
import {
  executeProposalWithGatekeeper,
  OrderExecutionAdapter
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
  return {
    account: {
      equityUsd: 50,
      currentDailyLossUsd: 0.1,
      currentWeeklyLossUsd: 0.5,
      currentOpenExposureUsd: 2
    },
    instrument: {
      symbol: "BTC-USDT",
      minSz: 0.0001,
      lotSz: 0.0001,
      tickSz: 0.1
    },
    market: {
      markPrice: 100500
    }
  };
}

describe("executeProposalWithGatekeeper", () => {
  it("does not call adapter when gatekeeper rejects", async () => {
    let callCount = 0;
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
      adapter
    );

    expect(rejected.status).toBe("REJECTED_BY_GATEKEEPER");
    expect(rejected.decision.status).toBe("REJECT");
    expect(callCount).toBe(0);
  });

  it("submits order when gatekeeper approves", async () => {
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

    const submitted = await executeProposalWithGatekeeper(validProposal(), validContext(), adapter);

    expect(submitted.status).toBe("SUBMITTED");
    expect(submitted.decision.status).toBe("APPROVE");
    expect(callCount).toBe(1);
    if (submitted.status === "SUBMITTED") {
      expect(submitted.order.ordId).toBe("200");
    }
  });

  it("throws when approval is enabled but no configured token exists", async () => {
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder() {
        return {
          ordId: "1",
          clOrdId: "x",
          sCode: "0",
          sMsg: ""
        };
      }
    };

    await expect(
      executeProposalWithGatekeeper(validProposal(), validContext(), adapter, {
        enabled: true
      })
    ).rejects.toMatchObject({
      code: "HUMAN_APPROVAL_TOKEN_NOT_CONFIGURED"
    });
  });

  it("throws when approval token is invalid", async () => {
    const adapter: OrderExecutionAdapter = {
      async placeSpotLimitOrder() {
        return {
          ordId: "1",
          clOrdId: "x",
          sCode: "0",
          sMsg: ""
        };
      }
    };

    await expect(
      executeProposalWithGatekeeper(validProposal(), validContext(), adapter, {
        enabled: true,
        requiredToken: "correct-token",
        providedToken: "wrong-token"
      })
    ).rejects.toMatchObject({
      code: "HUMAN_APPROVAL_TOKEN_INVALID"
    });
  });

  it("submits when approval token is valid", async () => {
    let callCount = 0;
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

    const result = await executeProposalWithGatekeeper(validProposal(), validContext(), adapter, {
      enabled: true,
      requiredToken: "correct-token",
      providedToken: "correct-token"
    });

    expect(result.status).toBe("SUBMITTED");
    expect(callCount).toBe(1);
  });
});
