import type { AlertItem, IncidentItem } from "../types";

type SeverityTone = "info" | "warn" | "error" | "critical";

const ALERT_CODE_TITLE_MAP: Record<string, string> = {
  AUTO_EXIT_STALE_FORCED_CLOSED: "Auto Exit Triggered - Stale Trade Closed",
  RUNTIME_ERROR_EVENT: "Runtime Error - Execution Failed",
  OKX_API_ERROR: "Exchange Error - OKX Rejected Order",
  AUTO_EXIT_SUBMIT_FAILED: "Auto Exit Failed - Exit Order Rejected",
  AUTO_EXIT_SUBMIT_RETRYING: "Auto Exit Retrying - Temporary Exchange Failure",
  AUTO_EXIT_FORCED_CLOSED: "Auto Exit Triggered - Forced Position Closure",
  AUTO_EXIT_DUST_CLOSED: "Auto Exit Triggered - Dust Position Closed",
  AUTO_EXIT_MIN_SIZE_CLOSED: "Auto Exit Triggered - Minimum Size Closure",
  APPROVAL_REQUIRED: "Approval Required - Operator Action Needed",
  APPROVAL_EXPIRED: "Approval Expired - Action Blocked",
  APPROVAL_REJECTED: "Approval Rejected - Action Blocked",
  LEARNING_EXPECTANCY_DEGRADATION: "Learning Alert - Expectancy Degradation",
  LEARNING_DRAWDOWN_ELEVATED: "Learning Alert - Drawdown Elevated",
  LEARNING_SLIPPAGE_ELEVATED: "Learning Alert - Slippage Elevated",
  LEARNING_CONTROL_VIOLATION_RATE_ELEVATED: "Learning Alert - Control Violations Elevated"
};

export interface StructuredImpact {
  symbol?: string;
  side?: "buy" | "sell";
  qty?: number;
  price?: number;
  tradeId?: string;
  reason?: string;
  retries?: number;
  elapsedSec?: number;
  thresholdSec?: number;
  apiCode?: string;
  sCode?: string;
  okxCode?: string;
}

function toFiniteNumber(value?: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractKeyValues(input: string): Record<string, string> {
  const map: Record<string, string> = {};
  const regex = /([a-zA-Z][a-zA-Z0-9_]*)=([^\s]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    map[match[1]] = match[2];
  }
  return map;
}

export function formatAlertTitle(eventCode: string): string {
  return ALERT_CODE_TITLE_MAP[eventCode] ?? eventCode;
}

export function severityToneForAlert(item: AlertItem): SeverityTone {
  return item.severity === "critical" ? "critical" : item.severity;
}

export function severityToneForIncident(item: IncidentItem): SeverityTone {
  if (item.severity === "sev1") {
    return "critical";
  }
  if (item.severity === "sev2") {
    return "warn";
  }
  return "info";
}

export function parseStructuredImpact(detail: string, symbol?: string): StructuredImpact {
  const kv = extractKeyValues(detail);
  const sideRaw = (kv.side ?? "").toLowerCase();
  const symbolFromText = detail.match(/\b([A-Z0-9]+-[A-Z0-9]+)\b/)?.[1];
  return {
    symbol: symbol ?? kv.symbol ?? kv.instId ?? symbolFromText,
    side: sideRaw === "buy" || sideRaw === "sell" ? sideRaw : undefined,
    qty: toFiniteNumber(kv.qty ?? kv.qtyBase ?? kv.sz),
    price: toFiniteNumber(kv.price ?? kv.limitPrice ?? kv.px),
    tradeId: kv.tradeId,
    reason: kv.reason ?? kv.error ?? kv.message,
    retries: toFiniteNumber(kv.repriceCount ?? kv.retries),
    elapsedSec: toFiniteNumber(kv.elapsedSec),
    thresholdSec: toFiniteNumber(kv.thresholdSec),
    apiCode: kv.apiCode,
    sCode: kv.sCode,
    okxCode: kv.okxCode
  };
}

export function buildHumanSummary(input: {
  code?: string;
  title: string;
  detail: string;
  source?: string;
  taxonomy?: string;
  impact: StructuredImpact;
}): string {
  const { code, title, detail, source, taxonomy, impact } = input;
  const upperCode = (code ?? "").toUpperCase();
  if (upperCode.includes("OKX") || source === "exchange" || upperCode.includes("AUTO_EXIT")) {
    return impact.reason
      ? `Exchange-side issue detected: ${impact.reason.replace(/_/g, " ")}.`
      : "Exchange-side issue detected. Review order constraints and retry policy.";
  }
  if (upperCode.includes("APPROVAL")) {
    return "Operator approval flow requires attention before action can proceed.";
  }
  if (upperCode.includes("LEARNING")) {
    return "Learning and governance thresholds were breached and need review.";
  }
  if (taxonomy === "exchange_reliability") {
    return "Exchange reliability incident detected. Verify connectivity and execution settings.";
  }
  if (taxonomy === "approval_governance") {
    return "Approval governance workflow needs operator intervention.";
  }
  if (detail.length > 0) {
    return detail.split(/\s+/).slice(0, 18).join(" ");
  }
  return title;
}

export function generateSuggestedAction(input: {
  code?: string;
  source?: string;
  taxonomy?: string;
  impact: StructuredImpact;
  count?: number;
}): string | null {
  const code = (input.code ?? "").toUpperCase();
  if (code.includes("AUTO_EXIT")) {
    return "Review auto-exit timing, reprice limits, and stale-closure thresholds.";
  }
  if (code.includes("OKX") || input.source === "exchange") {
    return "Check price limits, min size rules, and retry policy before re-submitting.";
  }
  if (input.count !== undefined && input.count >= 3 && (code.includes("RUNTIME") || code.includes("ERROR"))) {
    return "Repeated runtime failures detected. Consider pausing the bot until stabilized.";
  }
  if (code.includes("APPROVAL")) {
    return "Open Approvals panel and complete or reject pending approvals.";
  }
  if (input.taxonomy === "reconciliation_drift") {
    return "Run reconciliation checks and verify position/order parity.";
  }
  return null;
}

