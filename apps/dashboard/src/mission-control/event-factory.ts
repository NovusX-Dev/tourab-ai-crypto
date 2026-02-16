import { randomUUID } from "node:crypto";
import type { BotEvent, EventSeverity, EventType } from "@tourab/shared";

export function nowIso(): string {
  return new Date().toISOString();
}

export function createEvent(
  type: EventType,
  symbol: string,
  message: string,
  severity: EventSeverity = "info",
  tags?: string[],
  correlationId?: string
): BotEvent {
  return {
    id: randomUUID(),
    timestamp: nowIso(),
    type,
    symbol,
    message,
    severity,
    tags,
    correlationId
  };
}
