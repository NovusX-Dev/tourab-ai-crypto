import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrdersPanel } from "../components/OrdersPanel";
import { PortfolioPanel } from "../components/PortfolioPanel";
import type { OpenOrdersStatus, PortfolioStatus } from "../types";

describe("PortfolioPanel", () => {
  it("renders balances sorted by equity descending", () => {
    const portfolio: PortfolioStatus = {
      totalEq: "1234.56",
      balances: [
        { ccy: "ETH", eq: "120", availBal: "0.03", cashBal: "0.03" },
        { ccy: "USDT", eq: "900", availBal: "900", cashBal: "900" },
        { ccy: "BTC", eq: "214.56", availBal: "0.002", cashBal: "0.002" }
      ],
      lastUpdatedAt: new Date().toISOString()
    };

    const view = render(React.createElement(PortfolioPanel, { portfolio }));
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Eq 1234.56 USD")).toBeInTheDocument();

    const currencyNodes = view.container.querySelectorAll(".portfolio-ccy");
    const currencies = Array.from(currencyNodes).map((node) => node.textContent?.trim());
    expect(currencies).toEqual(["USDT", "BTC", "ETH"]);
  });

  it("shows portfolio error when available", () => {
    const portfolio: PortfolioStatus = {
      totalEq: "0",
      balances: [],
      lastUpdatedAt: new Date().toISOString(),
      lastError: "Portfolio unavailable"
    };

    render(React.createElement(PortfolioPanel, { portfolio }));
    expect(screen.getByText("Portfolio unavailable")).toBeInTheDocument();
    expect(screen.getByText("No balances available.")).toBeInTheDocument();
  });
});

describe("OrdersPanel", () => {
  it("renders open orders metadata", () => {
    const now = Date.now().toString();
    const openOrders: OpenOrdersStatus = {
      lastUpdatedAt: new Date().toISOString(),
      orders: [
        {
          ordId: "111",
          clOrdId: "cl-111",
          instId: "BTC-USDT",
          side: "buy",
          px: "95000",
          sz: "0.001",
          accFillSz: "0",
          state: "live",
          cTime: now,
          uTime: now
        },
        {
          ordId: "222",
          clOrdId: "cl-222",
          instId: "ETH-USDT",
          side: "sell",
          px: "3200",
          sz: "0.02",
          accFillSz: "0.01",
          state: "partially_filled",
          cTime: now,
          uTime: now
        }
      ]
    };

    render(React.createElement(OrdersPanel, { openOrders }));
    expect(screen.getByText("Open Orders")).toBeInTheDocument();
    expect(screen.getByText("2 open")).toBeInTheDocument();
    expect(screen.getByText("BTC-USDT")).toBeInTheDocument();
    expect(screen.getByText("ETH-USDT")).toBeInTheDocument();
    expect(screen.getByText("partially_filled")).toBeInTheDocument();
  });

  it("renders empty and error states", () => {
    const openOrders: OpenOrdersStatus = {
      orders: [],
      lastUpdatedAt: new Date().toISOString(),
      lastError: "Orders fetch failed"
    };
    render(React.createElement(OrdersPanel, { openOrders }));
    expect(screen.getByText("Orders fetch failed")).toBeInTheDocument();
    expect(screen.getByText("No open orders.")).toBeInTheDocument();
  });
});
