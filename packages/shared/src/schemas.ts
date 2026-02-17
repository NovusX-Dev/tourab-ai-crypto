import { z } from "zod";
import { RiskContext, TradeProposal } from "./types.js";

const positiveFiniteNumber = z.number().finite().positive();
const nonNegativeFiniteNumber = z.number().finite().nonnegative();

export const TradeProposalSchema: z.ZodType<TradeProposal> = z.object({
  proposalId: z.string().min(1),
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  qtyBase: positiveFiniteNumber,
  entryPrice: positiveFiniteNumber,
  stopPrice: positiveFiniteNumber,
  estimatedMaxLossUsd: nonNegativeFiniteNumber,
  leverage: positiveFiniteNumber.optional()
});

export const RiskContextSchema: z.ZodType<RiskContext> = z.object({
  account: z.object({
    equityUsd: positiveFiniteNumber,
    currentDailyLossUsd: nonNegativeFiniteNumber,
    currentWeeklyLossUsd: nonNegativeFiniteNumber,
    currentOpenExposureUsd: nonNegativeFiniteNumber,
    asOf: z.string().datetime().optional()
  }),
  instrument: z.object({
    symbol: z.string().min(1),
    minSz: positiveFiniteNumber,
    lotSz: positiveFiniteNumber,
    tickSz: positiveFiniteNumber
  }),
  market: z.object({
    markPrice: positiveFiniteNumber,
    asOf: z.string().datetime().optional()
  }),
  ordersAsOf: z.string().datetime().optional(),
  position: z
    .object({
      symbol: z.string().min(1),
      baseQty: nonNegativeFiniteNumber,
      avgEntryPrice: positiveFiniteNumber
    })
    .optional(),
  limits: z
    .object({
      maxPerTradeRiskUsd: positiveFiniteNumber,
      maxDailyLossUsd: positiveFiniteNumber,
      maxWeeklyLossUsd: positiveFiniteNumber,
      maxOpenExposureUsd: positiveFiniteNumber
    })
    .partial()
    .optional(),
  policy: z
    .object({
      allowedSymbols: z.array(z.string().min(1)).min(1),
      maxNotionalUsd: positiveFiniteNumber,
      executionMode: z.enum(["proposal_only", "demo_execution_enabled"])
    })
    .optional()
});

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export function formatZodIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    code: issue.code,
    path: issue.path.length > 0 ? issue.path.join(".") : "$",
    message: issue.message
  }));
}
