import { formatZodIssues, RiskContext, RiskContextSchema, TradeProposal, TradeProposalSchema } from "@tourab/shared";

export type CliStructuredError =
  | {
      code: "USAGE_ERROR";
      message: string;
    }
  | {
      code: "INVALID_JSON";
      target: "proposal" | "context";
      file: string;
      message: string;
    }
  | {
      code: "SCHEMA_VALIDATION_FAILED";
      target: "proposal" | "context";
      issues: { code: string; path: string; message: string }[];
    };

export function parseJsonPayload(
  raw: string,
  file: string,
  target: "proposal" | "context"
): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw <CliStructuredError>{
      code: "INVALID_JSON",
      target,
      file,
      message
    };
  }
}

export function validateProposalPayload(payload: unknown): TradeProposal {
  const parsed = TradeProposalSchema.safeParse(payload);
  if (!parsed.success) {
    throw <CliStructuredError>{
      code: "SCHEMA_VALIDATION_FAILED",
      target: "proposal",
      issues: formatZodIssues(parsed.error)
    };
  }
  return parsed.data;
}

export function validateContextPayload(payload: unknown): RiskContext {
  const parsed = RiskContextSchema.safeParse(payload);
  if (!parsed.success) {
    throw <CliStructuredError>{
      code: "SCHEMA_VALIDATION_FAILED",
      target: "context",
      issues: formatZodIssues(parsed.error)
    };
  }
  return parsed.data;
}
