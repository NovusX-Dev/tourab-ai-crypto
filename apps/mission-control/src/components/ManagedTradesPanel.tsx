import { useMemo, useState } from "react";
import { formatDuration, formatTime, timeSinceMs } from "../format";
import type { ManagedTradeItem } from "../types";

interface ManagedTradesPanelProps {
  trades: ManagedTradeItem[];
  onRefresh: () => Promise<void>;
}

function fmtUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function ManagedTradesPanel({ trades, onRefresh }: ManagedTradesPanelProps) {
  const [showClosedAll, setShowClosedAll] = useState(false);
  const openTrades = useMemo(() => trades.filter((item) => item.status !== "closed"), [trades]);
  const closedTrades = useMemo(() => trades.filter((item) => item.status === "closed"), [trades]);
  const visibleClosedTrades = useMemo(
    () => (showClosedAll ? closedTrades : closedTrades.slice(0, 25)),
    [closedTrades, showClosedAll]
  );

  return (
    <section className="panel-content" aria-label="Managed trades panel">
      <div className="panel-head">
        <div className="panel-title">Managed Trades</div>
        <div className="panel-controls">
          <span className="tag">{`Open ${openTrades.length}`}</span>
          <span className="tag">{`Closed ${closedTrades.length}`}</span>
          <button className="btn btn-ghost" onClick={() => void onRefresh()}>
            Refresh
          </button>
        </div>
      </div>

      {trades.length === 0 ? <div className="hint">No managed trades yet.</div> : null}

      <div className="subhead">{`Open Trades (${openTrades.length})`}</div>
      <div className="orders-list">
        {openTrades.map((trade) => (
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
            <div className={`order-meta ${trade.realizedPnlUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>
              {`Realized ${fmtUsd(trade.realizedPnlUsd)} (fee ${fmtUsd(trade.feeUsd)})`}
            </div>
            <div className="hint">{`Updated ${formatTime(trade.updatedAt)}`}</div>
          </article>
        ))}
      </div>

      <div className="subhead managed-trades-closed-head">
        <span>{`Closed (${closedTrades.length})`}</span>
        {closedTrades.length > 25 ? (
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
            <div className={`order-meta ${trade.realizedPnlUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>{`Realized ${fmtUsd(trade.realizedPnlUsd)}`}</div>
            <div className="hint">{`Closed ${trade.closedAt ? formatTime(trade.closedAt) : "-"}`}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
