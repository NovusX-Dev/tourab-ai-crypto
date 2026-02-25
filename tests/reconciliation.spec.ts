import { describe, expect, it } from "vitest";
import { reconcileOrderLifecycle } from "../apps/dashboard/src/reconciliation.js";
import { OrderLedgerRecord } from "../apps/dashboard/src/lifecycle-store.js";
import { OkxFillRecord, OkxPendingOrder } from "@tourab/okx-demo-adapter";

describe("reconcileOrderLifecycle", () => {
  it("reconciles submitted intent to OPEN when pending order exists", () => {
    const ledger: OrderLedgerRecord[] = [
      {
        type: "ORDER_SUBMITTED",
        ts: "2026-02-16T00:00:00.000Z",
        proposalId: "p1",
        symbol: "BTC-USDT",
        side: "buy",
        qtyBase: 0.0001,
        limitPrice: 68000,
        ordId: "o1",
        clOrdId: "c1"
      }
    ];
    const pending: OkxPendingOrder[] = [
      {
        ordId: "o1",
        clOrdId: "c1",
        instId: "BTC-USDT",
        side: "buy",
        px: "68000",
        sz: "0.0001",
        accFillSz: "0",
        state: "live",
        cTime: "1",
        uTime: "1"
      }
    ];
    const fills: OkxFillRecord[] = [];

    const report = reconcileOrderLifecycle(ledger, pending, fills);
    expect(report.summary.total).toBe(1);
    expect(report.items[0].canonicalState).toBe("OPEN");
    expect(report.items[0].driftFlags).toHaveLength(0);
  });

  it("flags NO_EXCHANGE_RECORD drift for missing exchange order", () => {
    const ledger: OrderLedgerRecord[] = [
      {
        type: "ORDER_SUBMITTED",
        ts: "2026-02-16T00:00:00.000Z",
        proposalId: "p2",
        symbol: "BTC-USDT",
        side: "buy",
        qtyBase: 0.0001,
        limitPrice: 68000,
        ordId: "o2",
        clOrdId: "c2"
      }
    ];

    const report = reconcileOrderLifecycle(ledger, [], []);
    expect(report.items[0].canonicalState).toBe("UNKNOWN");
    expect(report.items[0].driftFlags).toContain("NO_EXCHANGE_RECORD");
    expect(report.summary.withDrift).toBe(1);
  });

  it("adds unexpected exchange artifacts for orphan orders and fills", () => {
    const report = reconcileOrderLifecycle(
      [],
      [
        {
          ordId: "o3",
          clOrdId: "c3",
          instId: "BTC-USDT",
          side: "sell",
          px: "70000",
          sz: "0.0001",
          accFillSz: "0",
          state: "live",
          cTime: "1",
          uTime: "1"
        }
      ],
      [
        {
          ordId: "o4",
          clOrdId: "c4",
          instId: "BTC-USDT",
          side: "buy",
          fillPx: "69000",
          fillSz: "0.00005",
          ts: "1",
          tradeId: "t1"
        }
      ]
    );

    expect(report.summary.byState.UNEXPECTED_EXCHANGE_ORDER).toBe(1);
    expect(report.summary.byState.UNEXPECTED_EXCHANGE_FILL).toBe(1);
  });

  it("marks locally canceled orders as CANCELED when no pending record remains", () => {
    const ledger: OrderLedgerRecord[] = [
      {
        type: "ORDER_SUBMITTED",
        ts: "2026-02-16T00:00:00.000Z",
        proposalId: "p3",
        symbol: "BTC-USDT",
        side: "buy",
        qtyBase: 0.0001,
        limitPrice: 68000,
        ordId: "o5",
        clOrdId: "c5"
      },
      {
        type: "ORDER_CANCELED",
        ts: "2026-02-16T00:01:00.000Z",
        symbol: "BTC-USDT",
        ordId: "o5",
        clOrdId: "c5"
      }
    ];
    const report = reconcileOrderLifecycle(ledger, [], []);
    expect(report.items[0].canonicalState).toBe("CANCELED");
    expect(report.items[0].driftFlags).toHaveLength(0);
  });

  it("marks partially filled orders as PARTIALLY_FILLED", () => {
    const ledger: OrderLedgerRecord[] = [
      {
        type: "ORDER_SUBMITTED",
        ts: "2026-02-16T00:00:00.000Z",
        proposalId: "p4",
        symbol: "BTC-USDT",
        side: "buy",
        qtyBase: 0.001,
        limitPrice: 68000,
        ordId: "o6",
        clOrdId: "c6"
      }
    ];
    const pending: OkxPendingOrder[] = [
      {
        ordId: "o6",
        clOrdId: "c6",
        instId: "BTC-USDT",
        side: "buy",
        px: "68000",
        sz: "0.001",
        accFillSz: "0.0004",
        state: "partially_filled",
        cTime: "1",
        uTime: "2"
      }
    ];
    const fills: OkxFillRecord[] = [
      {
        ordId: "o6",
        clOrdId: "c6",
        instId: "BTC-USDT",
        side: "buy",
        fillPx: "68000",
        fillSz: "0.0004",
        ts: "2",
        tradeId: "t-partial-1"
      }
    ];

    const report = reconcileOrderLifecycle(ledger, pending, fills);
    expect(report.items[0].canonicalState).toBe("PARTIALLY_FILLED");
    expect(report.items[0].fillQtyBase).toBe(0.0004);
    expect(report.items[0].driftFlags).toHaveLength(0);
  });

  it("handles cancel/replace lifecycle as canceled original plus open replacement", () => {
    const ledger: OrderLedgerRecord[] = [
      {
        type: "ORDER_SUBMITTED",
        ts: "2026-02-16T00:00:00.000Z",
        proposalId: "p5-a",
        symbol: "BTC-USDT",
        side: "buy",
        qtyBase: 0.0001,
        limitPrice: 68000,
        ordId: "o7-old",
        clOrdId: "c7-old"
      },
      {
        type: "ORDER_CANCELED",
        ts: "2026-02-16T00:00:30.000Z",
        symbol: "BTC-USDT",
        ordId: "o7-old",
        clOrdId: "c7-old"
      },
      {
        type: "ORDER_SUBMITTED",
        ts: "2026-02-16T00:00:31.000Z",
        proposalId: "p5-b",
        symbol: "BTC-USDT",
        side: "buy",
        qtyBase: 0.0001,
        limitPrice: 67990,
        ordId: "o7-new",
        clOrdId: "c7-new"
      }
    ];
    const pending: OkxPendingOrder[] = [
      {
        ordId: "o7-new",
        clOrdId: "c7-new",
        instId: "BTC-USDT",
        side: "buy",
        px: "67990",
        sz: "0.0001",
        accFillSz: "0",
        state: "live",
        cTime: "3",
        uTime: "3"
      }
    ];

    const report = reconcileOrderLifecycle(ledger, pending, []);
    const original = report.items.find((item) => item.ordId === "o7-old");
    const replacement = report.items.find((item) => item.ordId === "o7-new");

    expect(original?.canonicalState).toBe("CANCELED");
    expect(original?.driftFlags).toHaveLength(0);
    expect(replacement?.canonicalState).toBe("OPEN");
    expect(replacement?.driftFlags).toHaveLength(0);
  });

  it("flags duplicate fills as OVERFILLED drift", () => {
    const ledger: OrderLedgerRecord[] = [
      {
        type: "ORDER_SUBMITTED",
        ts: "2026-02-16T00:00:00.000Z",
        proposalId: "p6",
        symbol: "BTC-USDT",
        side: "buy",
        qtyBase: 0.0001,
        limitPrice: 68000,
        ordId: "o8",
        clOrdId: "c8"
      }
    ];
    const fills: OkxFillRecord[] = [
      {
        ordId: "o8",
        clOrdId: "c8",
        instId: "BTC-USDT",
        side: "buy",
        fillPx: "68000",
        fillSz: "0.0001",
        ts: "10",
        tradeId: "dup-trade-1"
      },
      {
        ordId: "o8",
        clOrdId: "c8",
        instId: "BTC-USDT",
        side: "buy",
        fillPx: "68000",
        fillSz: "0.0001",
        ts: "10",
        tradeId: "dup-trade-1"
      }
    ];

    const report = reconcileOrderLifecycle(ledger, [], fills);
    expect(report.items[0].driftFlags).toContain("OVERFILLED");
  });
});
