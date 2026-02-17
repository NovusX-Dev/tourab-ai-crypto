import { describe, expect, it } from "vitest";
import type { BotEvent } from "@tourab/shared";
import { normalizeHeartbeatEventSemantics } from "../apps/dashboard/src/mission-control-server.js";

function event(type: BotEvent["type"], message: string): BotEvent {
  return {
    id: "evt-1",
    timestamp: new Date().toISOString(),
    type,
    symbol: "BTC-USDT",
    message,
    severity: "warn",
    tags: ["seed"]
  };
}

describe("mission-control event normalization", () => {
  it("converts heartbeat execution events into System events", () => {
    const normalized = normalizeHeartbeatEventSemantics(event("OrderSubmitted", "Heartbeat checkpoint"));
    expect(normalized.type).toBe("System");
    expect(normalized.severity).toBe("info");
    expect(normalized.tags).toContain("semantic_sanitized");
    expect(normalized.tags).toContain("original_type:OrderSubmitted");
  });

  it("preserves non-heartbeat execution events", () => {
    const original = event("OrderSubmitted", "Demo order submitted ordId=1");
    const normalized = normalizeHeartbeatEventSemantics(original);
    expect(normalized).toEqual(original);
  });
});
