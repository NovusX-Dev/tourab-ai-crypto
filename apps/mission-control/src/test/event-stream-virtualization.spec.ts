import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventStream } from "../components/EventStream";
import type { BotEvent } from "../types";

function makeEvents(count: number): BotEvent[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, idx) => ({
    id: `evt-${idx}`,
    timestamp: new Date(now - idx * 1000).toISOString(),
    type: "System",
    symbol: "BTC-USDT",
    message: `message-${idx}`,
    severity: "info",
    tags: ["tag_a", "tag_b", "tag_c"]
  }));
}

describe("EventStream virtualization", () => {
  it("renders a bounded window instead of all rows", () => {
    const events = makeEvents(120);
    const view = render(
      React.createElement(EventStream, {
        events,
        quickFilter: "all",
        onQuickFilterChange: () => {
          return;
        },
        symbolFilter: "",
        onSymbolFilterChange: () => {
          return;
        },
        severityFilter: "all",
        onSeverityFilterChange: () => {
          return;
        },
        eventTypeFilter: "all",
        onEventTypeFilterChange: () => {
          return;
        },
        pinnedSymbol: "",
        onPinSymbol: () => {
          return;
        },
        streamPaused: false,
        onToggleStreamPaused: () => {
          return;
        },
        autoScroll: true,
        onToggleAutoScroll: () => {
          return;
        }
      })
    );

    const rows = view.container.querySelectorAll(".event-row");
    expect(rows.length).toBeLessThan(120);
    expect(rows.length).toBeGreaterThan(0);
    expect(screen.getByText("message-0")).toBeInTheDocument();
    expect(screen.queryByText("message-100")).not.toBeInTheDocument();
    expect(screen.getAllByText("+1").length).toBeGreaterThan(0);
  });

  it("changes rendered window when scrolled", () => {
    const events = makeEvents(120);
    const view = render(
      React.createElement(EventStream, {
        events,
        quickFilter: "all",
        onQuickFilterChange: () => {
          return;
        },
        symbolFilter: "",
        onSymbolFilterChange: () => {
          return;
        },
        severityFilter: "all",
        onSeverityFilterChange: () => {
          return;
        },
        eventTypeFilter: "all",
        onEventTypeFilterChange: () => {
          return;
        },
        pinnedSymbol: "",
        onPinSymbol: () => {
          return;
        },
        streamPaused: false,
        onToggleStreamPaused: () => {
          return;
        },
        autoScroll: false,
        onToggleAutoScroll: () => {
          return;
        }
      })
    );

    const scroller = view.container.querySelector(".event-list") as HTMLDivElement;
    expect(scroller).toBeTruthy();

    Object.defineProperty(scroller, "scrollTop", {
      value: 3_200,
      writable: true
    });
    fireEvent.scroll(scroller);

    expect(screen.queryByText("message-0")).not.toBeInTheDocument();
    expect(screen.getByText("message-30")).toBeInTheDocument();
  });
});
