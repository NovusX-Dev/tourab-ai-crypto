import type { BotEvent } from "@tourab/shared";
import { createEvent } from "./event-factory.js";

const EVENT_TYPES: Array<BotEvent["type"]> = [
  "ProposalCreated",
  "GatekeeperDecision",
  "ProposalApproved",
  "OrderSubmitted",
  "OrderFilled",
  "OrderCancelled",
  "RiskLimitHit",
  "Error",
  "ReconciliationComplete",
  "System"
];

const EVENT_MESSAGES: Record<BotEvent["type"], string> = {
  ProposalCreated: "Proposal generated from latest market snapshot",
  GatekeeperDecision: "Gatekeeper approved proposal within constraints",
  ProposalApproved: "Manual approval token accepted",
  OrderSubmitted: "Order submitted to demo adapter",
  OrderFilled: "Order fill received",
  OrderCancelled: "Open order canceled by operator",
  Error: "Transient execution error captured and retried",
  RiskLimitHit: "Risk limit threshold reached, tightening controls",
  ReconciliationComplete: "Reconciliation completed with no critical drift",
  System: "Heartbeat and telemetry checkpoint",
  BotStateChanged: "Bot state changed",
  ControlCommandAccepted: "Control command accepted",
  ControlCommandRejected: "Control command rejected"
};

export function generateRuntimeEvent(index: number, symbol: string): BotEvent {
  const type = EVENT_TYPES[index % EVENT_TYPES.length] as BotEvent["type"];
  const severity = type === "Error" ? "error" : type === "RiskLimitHit" ? "warn" : "info";
  return createEvent(type, symbol, EVENT_MESSAGES[type], severity);
}
