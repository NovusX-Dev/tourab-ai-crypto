import { useMemo, useState } from "react";
import { formatDuration, formatTime, timeSinceMs } from "../format";
import type { ManagedTradeItem } from "../types";

interface ManagedTradesPanelProps {
  trades: ManagedTradeItem[];
  onRefresh: () => Promise<void>;
}

type TradeFilter = "all" | "pending" | "closed";

function fmtUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs === 0) {
    return "$0.00";
  }
  if (abs >= 0.01) {
    return `$${value.toFixed(2)}`;
  }
  if (abs >= 0.0001) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(6)}`;
}

function renderClosedRealizedLabel(trade: ManagedTradeItem): string {
  if (trade.exitFilledQty <= 0 && trade.exitReason === "flatten") {
    return "Outcome N/A (forced flatten)";
  }
  if (trade.realizedPnlUsd > 0) {
    return `Outcome Profit ${fmtUsd(trade.realizedPnlUsd)}`;
  }
  if (trade.realizedPnlUsd < 0) {
    return `Outcome Loss ${fmtUsd(trade.realizedPnlUsd)}`;
  }
  return `Outcome Breakeven ${fmtUsd(trade.realizedPnlUsd)}`;
}

function outcomeClass(trade: ManagedTradeItem): string {
  if (trade.exitFilledQty <= 0 && trade.exitReason === "flatten") {
    return "trade-outcome-na";
  }
  if (trade.realizedPnlUsd > 0) {
    return "trade-outcome-profit";
  }
  if (trade.realizedPnlUsd < 0) {
    return "trade-outcome-loss";
  }
  return "trade-outcome-breakeven";
}

export function ManagedTradesPanel({ trades, onRefresh }: ManagedTradesPanelProps) {
  const [showClosedAll, setShowClosedAll] = useState(false);
  const [tradeFilter, setTradeFilter] = useState<TradeFilter>("all");
  const openTrades = useMemo(() => trades.filter((item) => item.status !== "closed"), [trades]);
  const closedTrades = useMemo(() => trades.filter((item) => item.status === "closed"), [trades]);
  const visibleOpenTrades = useMemo(
    () => (tradeFilter === "closed" ? [] : openTrades),
    [openTrades, tradeFilter]
  );
  const visibleClosedTrades = useMemo(
    () => {
      if (tradeFilter === "pending") {
        return [];
      }
      return showClosedAll ? closedTrades : closedTrades.slice(0, 25);
    },
    [closedTrades, showClosedAll, tradeFilter]
  );

  return (
    <section className="panel-content" aria-label="Managed trades panel">
      <div className="panel-head">
        <div className="panel-title">Managed Trades</div>
        <div className="panel-controls">
          <span className="tag">{`Open ${openTrades.length}`}</span>
          <span className="tag">{`Closed ${closedTrades.length}`}</span>
          <div className="event-filters" role="group" aria-label="Managed trade filters">
            <button
              className={`chip ${tradeFilter === "all" ? "chip-active" : ""}`}
              onClick={() => setTradeFilter("all")}
            >
              All
            </button>
            <button
              className={`chip ${tradeFilter === "pending" ? "chip-active" : ""}`}
              onClick={() => setTradeFilter("pending")}
            >
              Pending
            </button>
            <button
              className={`chip ${tradeFilter === "closed" ? "chip-active" : ""}`}
              onClick={() => setTradeFilter("closed")}
            >
              Closed
            </button>
          </div>
          <button className="btn btn-ghost" onClick={() => void onRefresh()}>
            Refresh
          </button>
        </div>
      </div>

      {trades.length === 0 ? <div className="hint">No managed trades yet.</div> : null}

      <div className="subhead">{`Open Trades (${visibleOpenTrades.length})`}</div>
      <div className="orders-list">
        {visibleOpenTrades.map((trade) => (
          <article key={trade.tradeId} className="order-row">
            <div className="order-main">
              <strong>{trade.symbol}</strong>
              <span className="tag">{trade.entrySide}</span>
              <span className="tag">{trade.status}</span>
              <span className="tag">{trade.exitReason ?? "pending"}</span>
            </div>
            <div className="order-meta">{`Entry ${trade.entryFilledQty}/${trade.requestedQty} @ ${trade.entryAvgPrice || 0}`}</div>
            <div className="order-meta">{`Exit ${trade.exitFilledQty}/${trade.entryFilledQty || trade.requestedQty} @ ${trade.exitAvgPrice || 0}`}</div>
            <div className="order-meta">{`SL ${trade.stopPrice} | TP ${trade.takeProfitPrice}`}</div>
            <div className="order-meta">{`Age ${formatDuration(timeSinceMs(trade.createdAt))} | MaxHold ${formatDuration(trade.maxHoldSec * 1000)}`}</div>
            <div className={`order-meta ${outcomeClass(trade)}`}>
              {trade.realizedPnlUsd > 0
                ? `Outcome Profit ${fmtUsd(trade.realizedPnlUsd)} (fee ${fmtUsd(trade.feeUsd)})`
                : trade.realizedPnlUsd < 0
                  ? `Outcome Loss ${fmtUsd(trade.realizedPnlUsd)} (fee ${fmtUsd(trade.feeUsd)})`
                  : `Outcome Breakeven ${fmtUsd(trade.realizedPnlUsd)} (fee ${fmtUsd(trade.feeUsd)})`}
            </div>
            <div className="hint">{`Updated ${formatTime(trade.updatedAt)}`}</div>
          </article>
        ))}
      </div>

      <div className="subhead managed-trades-closed-head">
        <span>{`Closed (${tradeFilter === "pending" ? 0 : closedTrades.length})`}</span>
        {tradeFilter !== "pending" && closedTrades.length > 25 ? (
          <button className="btn btn-ghost" onClick={() => setShowClosedAll((prev) => !prev)}>
            {showClosedAll ? "Show Recent 25" : "Show All"}
          </button>
        ) : null}
      </div>
      <div className="orders-list">
        {visibleClosedTrades.map((trade) => (
          <article key={trade.tradeId} className="order-row">
            <div className="order-main">
              <strong>{trade.symbol}</strong>
              <span className="tag">closed</span>
              <span className="tag">{trade.exitReason ?? "unknown"}</span>
            </div>
            <div className={`order-meta ${outcomeClass(trade)}`}>{renderClosedRealizedLabel(trade)}</div>
            <div className="hint">{`Closed ${trade.closedAt ? formatTime(trade.closedAt) : "-"}`}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
