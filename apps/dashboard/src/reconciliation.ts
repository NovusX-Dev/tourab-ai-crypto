import { OkxFillRecord, OkxPendingOrder } from "@tourab/okx-demo-adapter";
import { OrderLedgerRecord } from "./lifecycle-store.js";

export type CanonicalOrderState =
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELED"
  | "UNKNOWN"
  | "UNEXPECTED_EXCHANGE_ORDER"
  | "UNEXPECTED_EXCHANGE_FILL";

export interface ReconciledOrderItem {
  proposalId?: string;
  symbol: string;
  ordId?: string;
  clOrdId?: string;
  qtyBase?: number;
  submittedAt?: string;
  exchangeState?: string;
  fillQtyBase: number;
  canonicalState: CanonicalOrderState;
  driftFlags: string[];
}

export interface ReconciliationReport {
  generatedAt: string;
  summary: {
    total: number;
    byState: Record<CanonicalOrderState, number>;
    withDrift: number;
  };
  items: ReconciledOrderItem[];
}

function normalizeExchangeState(state: string | undefined, fillQty: number, expectedQty?: number): CanonicalOrderState {
  if (!state) {
    if (fillQty > 0 && expectedQty !== undefined && fillQty >= expectedQty - 1e-12) {
      return "FILLED";
    }
    if (fillQty > 0) {
      return "PARTIALLY_FILLED";
    }
    return "UNKNOWN";
  }
  if (state === "live") {
    return "OPEN";
  }
  if (state === "partially_filled") {
    return "PARTIALLY_FILLED";
  }
  if (state === "filled") {
    return "FILLED";
  }
  if (state === "canceled") {
    return "CANCELED";
  }
  return "UNKNOWN";
}

function sumFills(fills: OkxFillRecord[], ordId?: string, clOrdId?: string): number {
  return fills
    .filter((f) => (ordId && f.ordId === ordId) || (clOrdId && f.clOrdId === clOrdId))
    .reduce((sum, f) => sum + Number(f.fillSz || "0"), 0);
}

interface SubmittedIntent {
  proposalId?: string;
  symbol: string;
  side?: "buy" | "sell";
  qtyBase?: number;
  limitPrice?: number;
  ordId?: string;
  clOrdId?: string;
  submittedAt?: string;
}

function latestSubmittedIntents(ledger: OrderLedgerRecord[]): SubmittedIntent[] {
  return ledger
    .filter((r) => r.type === "ORDER_SUBMITTED")
    .map((r) => ({
      proposalId: r.proposalId,
      symbol: r.symbol,
      side: r.side,
      qtyBase: r.qtyBase,
      limitPrice: r.limitPrice,
      ordId: r.ordId,
      clOrdId: r.clOrdId,
      submittedAt: r.ts
    }));
}

function canceledKeys(ledger: OrderLedgerRecord[]): Set<string> {
  const keys = new Set<string>();
  for (const r of ledger) {
    if (r.type !== "ORDER_CANCELED") {
      continue;
    }
    if (r.ordId) {
      keys.add(`ord:${r.ordId}`);
    }
    if (r.clOrdId) {
      keys.add(`cl:${r.clOrdId}`);
    }
  }
  return keys;
}

export function reconcileOrderLifecycle(
  ledger: OrderLedgerRecord[],
  pendingOrders: OkxPendingOrder[],
  fills: OkxFillRecord[]
): ReconciliationReport {
  const intents = latestSubmittedIntents(ledger);
  const canceled = canceledKeys(ledger);
  const usedPending = new Set<string>();
  const usedFillKeys = new Set<string>();
  const items: ReconciledOrderItem[] = [];

  for (const intent of intents) {
    const matchingPending = pendingOrders.find(
      (o) => (intent.ordId && o.ordId === intent.ordId) || (intent.clOrdId && o.clOrdId === intent.clOrdId)
    );
    if (matchingPending) {
      usedPending.add(matchingPending.ordId || matchingPending.clOrdId);
    }
    const fillQty = sumFills(fills, intent.ordId, intent.clOrdId);
    if (fillQty > 0) {
      if (intent.ordId) {
        usedFillKeys.add(`ord:${intent.ordId}`);
      }
      if (intent.clOrdId) {
        usedFillKeys.add(`cl:${intent.clOrdId}`);
      }
    }
    const canceledByLedger =
      (intent.ordId && canceled.has(`ord:${intent.ordId}`)) || (intent.clOrdId && canceled.has(`cl:${intent.clOrdId}`));
    const canonicalState =
      !matchingPending && fillQty <= 0 && canceledByLedger
        ? "CANCELED"
        : normalizeExchangeState(matchingPending?.state, fillQty, intent.qtyBase);
    const driftFlags: string[] = [];
    if (!matchingPending && fillQty <= 0 && !canceledByLedger) {
      driftFlags.push("NO_EXCHANGE_RECORD");
    }
    if (intent.qtyBase !== undefined && fillQty > intent.qtyBase + 1e-12) {
      driftFlags.push("OVERFILLED");
    }
    if (matchingPending && matchingPending.instId !== intent.symbol) {
      driftFlags.push("SYMBOL_MISMATCH");
    }

    items.push({
      proposalId: intent.proposalId,
      symbol: intent.symbol,
      ordId: intent.ordId,
      clOrdId: intent.clOrdId,
      qtyBase: intent.qtyBase,
      submittedAt: intent.submittedAt,
      exchangeState: matchingPending?.state,
      fillQtyBase: Number(fillQty.toFixed(12)),
      canonicalState,
      driftFlags
    });
  }

  for (const pending of pendingOrders) {
    const key = pending.ordId || pending.clOrdId;
    if (usedPending.has(key)) {
      continue;
    }
    items.push({
      symbol: pending.instId,
      ordId: pending.ordId,
      clOrdId: pending.clOrdId,
      exchangeState: pending.state,
      fillQtyBase: Number(Number(pending.accFillSz || "0").toFixed(12)),
      canonicalState: "UNEXPECTED_EXCHANGE_ORDER",
      driftFlags: ["NO_LOCAL_INTENT"]
    });
  }

  for (const fill of fills) {
    const ordKey = `ord:${fill.ordId}`;
    const clKey = `cl:${fill.clOrdId}`;
    if (usedFillKeys.has(ordKey) || usedFillKeys.has(clKey)) {
      continue;
    }
    items.push({
      symbol: fill.instId,
      ordId: fill.ordId,
      clOrdId: fill.clOrdId,
      fillQtyBase: Number(Number(fill.fillSz || "0").toFixed(12)),
      canonicalState: "UNEXPECTED_EXCHANGE_FILL",
      driftFlags: ["NO_LOCAL_INTENT"]
    });
  }

  const byState: Record<CanonicalOrderState, number> = {
    OPEN: 0,
    PARTIALLY_FILLED: 0,
    FILLED: 0,
    CANCELED: 0,
    UNKNOWN: 0,
    UNEXPECTED_EXCHANGE_ORDER: 0,
    UNEXPECTED_EXCHANGE_FILL: 0
  };
  let withDrift = 0;
  for (const item of items) {
    byState[item.canonicalState] += 1;
    if (item.driftFlags.length > 0) {
      withDrift += 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      total: items.length,
      byState,
      withDrift
    },
    items
  };
}
