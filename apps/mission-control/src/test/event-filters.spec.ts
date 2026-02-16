import { describe, expect, it } from "vitest";
import { filterEvents } from "../logic/eventFilters";
import type { BotEvent } from "../types";

const EVENTS: BotEvent[] = [
  {
    id: "1",
    timestamp: new Date().toISOString(),
    type: "OrderSubmitted",
    symbol: "BTC-USDT",
    message: "order",
    severity: "info"
  },
  {
    id: "2",
    timestamp: new Date().toISOString(),
    type: "RiskLimitHit",
    symbol: "ETH-USDT",
    message: "risk",
    severity: "warn"
  },
  {
    id: "3",
    timestamp: new Date().toISOString(),
    type: "Error",
    symbol: "BTC-USDT",
    message: "error",
    severity: "error"
  }
];

describe("filterEvents", () => {
  it("filters by quick filters", () => {
    expect(filterEvents(EVENTS, { quickFilter: "orders" }).length).toBe(1);
    expect(filterEvents(EVENTS, { quickFilter: "risk" }).length).toBe(1);
    expect(filterEvents(EVENTS, { quickFilter: "errors" }).length).toBe(1);
  });

  it("supports symbol and severity filters", () => {
    const filtered = filterEvents(EVENTS, {
      quickFilter: "all",
      symbol: "BTC-USDT",
      severity: "error"
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.type).toBe("Error");
  });
});
