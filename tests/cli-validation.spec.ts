import { describe, expect, it } from "vitest";
import {
  parseJsonPayload,
  validateContextPayload,
  validateProposalPayload
} from "../apps/dashboard/src/cli-validation.js";

describe("CLI schema validation boundary", () => {
  it("throws INVALID_JSON for malformed proposal payload", () => {
    try {
      parseJsonPayload("{ bad json", "proposal.json", "proposal");
      throw new Error("Expected parseJsonPayload to throw.");
    } catch (error: unknown) {
      const structured = error as { code: string; target: string; file: string };
      expect(structured.code).toBe("INVALID_JSON");
      expect(structured.target).toBe("proposal");
      expect(structured.file).toBe("proposal.json");
    }
  });

  it("throws SCHEMA_VALIDATION_FAILED for malformed proposal schema", () => {
    try {
      validateProposalPayload({
        proposalId: "p-1",
        symbol: "BTC-USDT",
        side: "buy",
        qtyBase: "0.1"
      });
      throw new Error("Expected validateProposalPayload to throw.");
    } catch (error: unknown) {
      const structured = error as { code: string; target: string; issues: { path: string }[] };
      expect(structured.code).toBe("SCHEMA_VALIDATION_FAILED");
      expect(structured.target).toBe("proposal");
      expect(structured.issues.length).toBeGreaterThan(0);
      expect(structured.issues.some((i) => i.path === "qtyBase")).toBe(true);
    }
  });

  it("throws SCHEMA_VALIDATION_FAILED for malformed context schema", () => {
    try {
      validateContextPayload({
        account: {
          equityUsd: 50
        }
      });
      throw new Error("Expected validateContextPayload to throw.");
    } catch (error: unknown) {
      const structured = error as { code: string; target: string; issues: { path: string }[] };
      expect(structured.code).toBe("SCHEMA_VALIDATION_FAILED");
      expect(structured.target).toBe("context");
      expect(structured.issues.length).toBeGreaterThan(0);
    }
  });

  it("accepts valid proposal and context payloads", () => {
    const proposal = validateProposalPayload({
      proposalId: "p-2",
      symbol: "BTC-USDT",
      side: "buy",
      qtyBase: 0.0001,
      entryPrice: 100000,
      stopPrice: 98000,
      estimatedMaxLossUsd: 0.2,
      leverage: 1
    });

    const context = validateContextPayload({
      account: {
        equityUsd: 50,
        currentDailyLossUsd: 0.25,
        currentWeeklyLossUsd: 1,
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
    });

    expect(proposal.symbol).toBe("BTC-USDT");
    expect(context.instrument.tickSz).toBe(0.1);
  });
});
