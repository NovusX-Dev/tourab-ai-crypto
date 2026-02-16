import { describe, expect, it } from "vitest";
import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import { RiskContext, TradeProposal } from "@tourab/shared";

function baseProposal(): TradeProposal {
  return {
    proposalId: "p-001",
    symbol: "BTC-USDT",
    side: "buy",
    qtyBase: 0.0001,
    entryPrice: 100000,
    stopPrice: 98000,
    estimatedMaxLossUsd: 0.2,
    leverage: 1
  };
}

function baseContext(): RiskContext {
  return {
    account: {
      equityUsd: 50,
      currentDailyLossUsd: 0.25,
      currentWeeklyLossUsd: 1.0,
      currentOpenExposureUsd: 2.5
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

describe("evaluateTradeProposal", () => {
  it("approves a valid proposal", () => {
    const decision = evaluateTradeProposal(baseProposal(), baseContext());
    expect(decision.status).toBe("APPROVE");
    expect(decision.violations).toHaveLength(0);
    expect(decision.executionIntent).toBeDefined();
  });

  it("rejects leverage > 1", () => {
    const proposal = { ...baseProposal(), leverage: 2 };
    const decision = evaluateTradeProposal(proposal, baseContext());
    expect(decision.status).toBe("REJECT");
    expect(decision.violations.some((v) => v.code === "LEVERAGE_DISABLED")).toBe(true);
  });

  it("rejects when estimated risk exceeds per-trade max", () => {
    const proposal = { ...baseProposal(), estimatedMaxLossUsd: 0.7 };
    const decision = evaluateTradeProposal(proposal, baseContext());
    expect(decision.status).toBe("REJECT");
    expect(decision.violations.some((v) => v.code === "PER_TRADE_RISK_EXCEEDED")).toBe(true);
  });

  it("rejects when daily stop is already hit", () => {
    const context: RiskContext = {
      ...baseContext(),
      account: { ...baseContext().account, currentDailyLossUsd: 1.0 }
    };
    const decision = evaluateTradeProposal(baseProposal(), context);
    expect(decision.status).toBe("REJECT");
    expect(decision.violations.some((v) => v.code === "DAILY_STOP_HIT")).toBe(true);
  });

  it("rejects when weekly stop is already hit", () => {
    const context: RiskContext = {
      ...baseContext(),
      account: { ...baseContext().account, currentWeeklyLossUsd: 2.5 }
    };
    const decision = evaluateTradeProposal(baseProposal(), context);
    expect(decision.status).toBe("REJECT");
    expect(decision.violations.some((v) => v.code === "WEEKLY_STOP_HIT")).toBe(true);
  });

  it("rejects when projected open exposure breaches cap", () => {
    const context: RiskContext = {
      ...baseContext(),
      account: { ...baseContext().account, currentOpenExposureUsd: 10 }
    };
    const decision = evaluateTradeProposal(baseProposal(), context);
    expect(decision.status).toBe("REJECT");
    expect(decision.violations.some((v) => v.code === "OPEN_EXPOSURE_EXCEEDED")).toBe(true);
  });

  it("allows sell that reduces exposure", () => {
    const proposal: TradeProposal = {
      ...baseProposal(),
      side: "sell",
      stopPrice: 102000
    };
    const context: RiskContext = {
      ...baseContext(),
      account: { ...baseContext().account, currentOpenExposureUsd: 16 }
    };
    const decision = evaluateTradeProposal(proposal, context);
    expect(decision.status).toBe("APPROVE");
  });

  it("rejects quantity lower than minSz", () => {
    const proposal = { ...baseProposal(), qtyBase: 0.00001 };
    const decision = evaluateTradeProposal(proposal, baseContext());
    expect(decision.status).toBe("REJECT");
    expect(decision.violations.some((v) => v.code === "MIN_SIZE_VIOLATION")).toBe(true);
  });

  it("rejects quantity not aligned to lotSz", () => {
    const proposal = { ...baseProposal(), qtyBase: 0.00015 };
    const decision = evaluateTradeProposal(proposal, baseContext());
    expect(decision.status).toBe("REJECT");
    expect(decision.violations.some((v) => v.code === "LOT_SIZE_VIOLATION")).toBe(true);
  });

  it("rejects price not aligned to tickSz", () => {
    const proposal = { ...baseProposal(), entryPrice: 100000.07 };
    const decision = evaluateTradeProposal(proposal, baseContext());
    expect(decision.status).toBe("REJECT");
    expect(decision.violations.some((v) => v.code === "TICK_SIZE_VIOLATION")).toBe(true);
  });

  it("rejects averaging down a losing position", () => {
    const context: RiskContext = {
      ...baseContext(),
      market: { markPrice: 99000 },
      position: {
        symbol: "BTC-USDT",
        baseQty: 0.0002,
        avgEntryPrice: 100500
      }
    };
    const decision = evaluateTradeProposal(baseProposal(), context);
    expect(decision.status).toBe("REJECT");
    expect(decision.violations.some((v) => v.code === "AVERAGING_DOWN_BLOCKED")).toBe(true);
  });

  it("rejects invalid stop placement for buy orders", () => {
    const proposal = { ...baseProposal(), stopPrice: 100500 };
    const decision = evaluateTradeProposal(proposal, baseContext());
    expect(decision.status).toBe("REJECT");
    expect(decision.violations.some((v) => v.code === "INVALIDATION_MISSING")).toBe(true);
  });
});
