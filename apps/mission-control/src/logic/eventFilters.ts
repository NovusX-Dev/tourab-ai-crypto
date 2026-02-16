import type { BotEvent, EventSeverity, EventType } from "../types";

export type QuickFilter = "all" | "orders" | "risk" | "errors" | "system";

export interface EventFilterInput {
  quickFilter: QuickFilter;
  symbol?: string;
  severity?: EventSeverity | "all";
  eventType?: EventType | "all";
  pinnedSymbol?: string;
}

const ORDER_TYPES: EventType[] = ["OrderSubmitted", "OrderFilled", "OrderCancelled"];
const RISK_TYPES: EventType[] = ["GatekeeperDecision", "RiskLimitHit"];
const SYSTEM_TYPES: EventType[] = ["System", "ReconciliationComplete", "ProposalCreated", "ProposalApproved"];

export function filterEvents(events: BotEvent[], filter: EventFilterInput): BotEvent[] {
  return events.filter((event) => {
    if (filter.quickFilter === "orders" && !ORDER_TYPES.includes(event.type)) {
      return false;
    }
    if (filter.quickFilter === "risk" && !RISK_TYPES.includes(event.type)) {
      return false;
    }
    if (filter.quickFilter === "errors" && event.severity !== "error") {
      return false;
    }
    if (filter.quickFilter === "system" && !SYSTEM_TYPES.includes(event.type)) {
      return false;
    }

    if (filter.symbol && event.symbol !== filter.symbol) {
      return false;
    }
    if (filter.severity && filter.severity !== "all" && event.severity !== filter.severity) {
      return false;
    }
    if (filter.eventType && filter.eventType !== "all" && event.type !== filter.eventType) {
      return false;
    }

    return true;
  });
}

export function isPinnedEvent(event: BotEvent, pinnedSymbol?: string): boolean {
  if (!pinnedSymbol) {
    return false;
  }
  return event.symbol === pinnedSymbol;
}
