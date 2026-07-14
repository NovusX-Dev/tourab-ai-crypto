import { describe, expect, it } from "vitest";
import { buildValidSpotProposal } from "../apps/dashboard/src/proposal-helper.js";

function isAligned(value: number, step: number): boolean {
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-9;
}

describe("buildValidSpotProposal", () => {
  it("aligns price and quantity to tickSz/lotSz and respects price bands", () => {
    const result = buildValidSpotProposal(
      {
        symbol: "BTC-USDT",
        last: 70000.123,
        tickSz: 0.1,
        lotSz: 0.0001,
        minSz: 0.0001,
        bestBid: 70000,
        bestAsk: 70000.2,
        buyLmt: 71000,
        sellLmt: 69000
      },
      {
        symbol: "BTC-USDT",
        side: "buy",
        maxRiskUsd: 0.2,
        maxNotionalUsd: 10,
        entryOffsetBps: 20,
        stopDistanceBps: 150,
        proposalId: "helper-1"
      }
    );

    expect(isAligned(result.proposal.entryPrice, 0.1)).toBe(true);
    expect(isAligned(result.proposal.qtyBase, 0.0001)).toBe(true);
    expect(result.proposal.entryPrice).toBeGreaterThanOrEqual(69000);
    expect(result.proposal.entryPrice).toBeLessThanOrEqual(71000);
    expect(result.diagnostics.usedPriceBand).toBe(true);
  });

  it("raises quantity to minSz when risk-derived qty is too small", () => {
    const result = buildValidSpotProposal(
      {
        symbol: "BTC-USDT",
        last: 70000,
        tickSz: 0.1,
        lotSz: 0.0001,
        minSz: 0.001,
        bestBid: 69999.9,
        bestAsk: 70000.1,
        buyLmt: 71000,
        sellLmt: 69000
      },
      {
        symbol: "BTC-USDT",
        side: "buy",
        maxRiskUsd: 0.05,
        maxNotionalUsd: 10,
        entryOffsetBps: 20,
        stopDistanceBps: 150,
        proposalId: "helper-2"
      }
    );

    expect(result.proposal.qtyBase).toBe(0.001);
    expect(result.diagnostics.notes.some((n) => n.includes("minSz"))).toBe(true);
  });

  it("works when price band is unavailable", () => {
    const result = buildValidSpotProposal(
      {
        symbol: "BTC-USDT",
        last: 70000,
        tickSz: 0.1,
        lotSz: 0.0001,
        minSz: 0.0001
      },
      {
        symbol: "BTC-USDT",
        side: "sell",
        maxRiskUsd: 0.2,
        maxNotionalUsd: 10,
        entryOffsetBps: 10,
        stopDistanceBps: 120,
        proposalId: "helper-3"
      }
    );

    expect(result.diagnostics.usedPriceBand).toBe(false);
    expect(result.diagnostics.notes.some((n) => n.includes("Price band not available"))).toBe(true);
  });

  it("supports aggressive buy entries above market when offset is negative", () => {
    const result = buildValidSpotProposal(
      {
        symbol: "BTC-USDT",
        last: 70000,
        tickSz: 0.1,
        lotSz: 0.0001,
        minSz: 0.0001,
        bestBid: 69999.8,
        bestAsk: 70000.2,
        buyLmt: 71000,
        sellLmt: 69000
      },
      {
        symbol: "BTC-USDT",
        side: "buy",
        maxRiskUsd: 0.2,
        maxNotionalUsd: 10,
        entryOffsetBps: -5,
        stopDistanceBps: 150,
        proposalId: "helper-4"
      }
    );

    expect(result.proposal.entryPrice).toBeGreaterThan(70000);
    expect(result.proposal.entryPrice).toBeLessThanOrEqual(71000);
  });

  it("supports aggressive sell entries below the best bid when offset is negative", () => {
    const result = buildValidSpotProposal(
      {
        symbol: "BTC-USDT",
        last: 70000,
        tickSz: 0.1,
        lotSz: 0.0001,
        minSz: 0.0001,
        bestBid: 69999.8,
        bestAsk: 70000.2,
        buyLmt: 71000,
        sellLmt: 69000
      },
      {
        symbol: "BTC-USDT",
        side: "sell",
        maxRiskUsd: 0.2,
        maxNotionalUsd: 10,
        entryOffsetBps: -5,
        stopDistanceBps: 150,
        proposalId: "helper-4b"
      }
    );

    expect(result.proposal.entryPrice).toBeLessThan(69999.8);
    expect(result.proposal.entryPrice).toBeGreaterThanOrEqual(69000);
  });

  it("does not collapse BTC-sized scientific-notation lotSz to minSz", () => {
    const result = buildValidSpotProposal(
      {
        symbol: "BTC-USDT",
        last: 70448.3,
        tickSz: 0.1,
        lotSz: 1e-8,
        minSz: 0.00001,
        bestBid: 70448.2,
        bestAsk: 70448.4,
        buyLmt: 70809.9,
        sellLmt: 70105.2
      },
      {
        symbol: "BTC-USDT",
        side: "buy",
        maxRiskUsd: 0.2,
        maxNotionalUsd: 12,
        entryOffsetBps: -250,
        stopDistanceBps: 150,
        proposalId: "helper-5"
      }
    );

    expect(isAligned(result.proposal.qtyBase, 1e-8)).toBe(true);
    expect(result.proposal.qtyBase).toBeGreaterThan(0.00001);
    expect(result.diagnostics.notionalUsd).toBeGreaterThan(10);
    expect(result.diagnostics.notes.some((n) => n.includes("minSz"))).toBe(false);
  });
});
