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
});
