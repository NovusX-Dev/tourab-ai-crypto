import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { evaluateTradeProposal } from "@tourab/risk-gatekeeper";
import type { RiskContext, TradeProposal } from "@tourab/shared";

function baseContext(): RiskContext {
  return {
    account: {
      equityUsd: 50,
      currentDailyLossUsd: 0.1,
      currentWeeklyLossUsd: 0.5,
      currentOpenExposureUsd: 1
    },
    instrument: {
      symbol: "BTC-USDT",
      minSz: 0.0001,
      lotSz: 0.0001,
      tickSz: 0.1
    },
    market: {
      markPrice: 100000
    },
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

function validProposal(overrides?: Partial<TradeProposal>): TradeProposal {
  return {
    proposalId: "prop",
    symbol: "BTC-USDT",
    side: "buy",
    qtyBase: 0.0001,
    entryPrice: 100000,
    stopPrice: 99000,
    estimatedMaxLossUsd: 0.2,
    ...overrides
  };
}

describe("risk gatekeeper property tests", () => {
  it("rejects when order notional exceeds maxNotionalUsd", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.0001, max: 2, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 200000, noNaN: true, noDefaultInfinity: true }),
        (qtyBase, entryPrice) => {
          const context = baseContext();
          const proposal = validProposal({ qtyBase, entryPrice, stopPrice: Math.max(0.1, entryPrice - 1) });
          const notional = qtyBase * entryPrice;
          const decision = evaluateTradeProposal(proposal, context);

          if (notional > context.policy!.maxNotionalUsd) {
            expect(decision.status).toBe("REJECT");
            expect(decision.violations.some((v) => v.code === "MAX_NOTIONAL_EXCEEDED")).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects symbols not in allowlist", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 12 }), (symbol) => {
        fc.pre(symbol !== "BTC-USDT");
        const context = baseContext();
        const proposal = validProposal({ symbol });
        const decision = evaluateTradeProposal(proposal, context);

        expect(decision.status).toBe("REJECT");
        expect(decision.violations.some((v) => v.code === "INSTRUMENT_NOT_ALLOWED")).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("is deterministic for same inputs", () => {
    fc.assert(
      fc.property(
        fc.record({
          qtyBase: fc.constant(0.0001),
          entryPrice: fc.constant(100000),
          stopPrice: fc.constant(99000),
          estimatedMaxLossUsd: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
          leverage: fc.option(fc.constantFrom(1), { nil: undefined })
        }),
        (parts) => {
          const context = baseContext();
          const proposal: TradeProposal = {
            proposalId: "deterministic-proposal",
            symbol: "BTC-USDT",
            side: "buy",
            qtyBase: parts.qtyBase,
            entryPrice: parts.entryPrice,
            stopPrice: parts.stopPrice,
            estimatedMaxLossUsd: parts.estimatedMaxLossUsd,
            leverage: parts.leverage
          };

          const first = evaluateTradeProposal(proposal, context);
          const second = evaluateTradeProposal(proposal, context);
          expect(first).toEqual(second);
        }
      ),
      { numRuns: 100 }
    );
  });
});
