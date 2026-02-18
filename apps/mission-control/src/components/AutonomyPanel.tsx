import { useEffect, useState } from "react";
import { formatDuration, formatTime, timeSinceMs } from "../format";
import type { AutoExitConfig, ManagedTradeItem } from "../types";

interface AutonomyPanelProps {
  config: AutoExitConfig;
  managedTrades: ManagedTradeItem[];
  canEdit: boolean;
  onSaveConfig: (next: Partial<AutoExitConfig>) => Promise<void>;
  onRefreshTrades: () => Promise<void>;
}

function fmtUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function AutonomyPanel({ config, managedTrades, canEdit, onSaveConfig, onRefreshTrades }: AutonomyPanelProps) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [maxHoldSec, setMaxHoldSec] = useState(String(config.maxHoldSec));
  const [takeProfitRMultiple, setTakeProfitRMultiple] = useState(String(config.takeProfitRMultiple));
  const [flattenTimeUtc, setFlattenTimeUtc] = useState(config.flattenTimeUtc ?? "");
  const [exitOffsetBps, setExitOffsetBps] = useState(String(config.exitOffsetBps));

  useEffect(() => {
    setEnabled(config.enabled);
    setMaxHoldSec(String(config.maxHoldSec));
    setTakeProfitRMultiple(String(config.takeProfitRMultiple));
    setFlattenTimeUtc(config.flattenTimeUtc ?? "");
    setExitOffsetBps(String(config.exitOffsetBps));
  }, [config]);

  async function save(): Promise<void> {
    const parsedMaxHold = Number(maxHoldSec);
    const parsedTp = Number(takeProfitRMultiple);
    const parsedOffset = Number(exitOffsetBps);
    await onSaveConfig({
      enabled,
      maxHoldSec: Number.isFinite(parsedMaxHold) ? parsedMaxHold : config.maxHoldSec,
      takeProfitRMultiple: Number.isFinite(parsedTp) ? parsedTp : config.takeProfitRMultiple,
      flattenTimeUtc: flattenTimeUtc.trim() || undefined,
      exitOffsetBps: Number.isFinite(parsedOffset) ? parsedOffset : config.exitOffsetBps
    });
  }

  const openTrades = managedTrades.filter((item) => item.status !== "closed");
  const closedTrades = managedTrades.filter((item) => item.status === "closed");

  return (
    <section className="panel-content" aria-label="Autonomy panel">
      <div className="panel-head">
        <div className="panel-title">Autonomy</div>
        <span className={`tag ${config.enabled ? "sev-info" : "sev-warn"}`}>{config.enabled ? "AUTO-EXIT ON" : "AUTO-EXIT OFF"}</span>
      </div>

      <div className="risk-card">
        <div className="panel-title">Auto-Exit Config</div>
        <div className="hint">Deterministic exits for every approved entry order.</div>
        <div className="log-filters">
          <label>
            Enabled
            <select value={enabled ? "1" : "0"} onChange={(event) => setEnabled(event.target.value === "1")} disabled={!canEdit}>
              <option value="1">On</option>
              <option value="0">Off</option>
            </select>
          </label>
          <label>
            Max Hold (sec)
            <input value={maxHoldSec} onChange={(event) => setMaxHoldSec(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            TP R-Multiple
            <input value={takeProfitRMultiple} onChange={(event) => setTakeProfitRMultiple(event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Flatten (UTC HH:MM)
            <input value={flattenTimeUtc} onChange={(event) => setFlattenTimeUtc(event.target.value)} placeholder="23:45" disabled={!canEdit} />
          </label>
          <label>
            Exit Offset (bps)
            <input value={exitOffsetBps} onChange={(event) => setExitOffsetBps(event.target.value)} disabled={!canEdit} />
          </label>
        </div>
        <div className="approval-actions">
          <button className="btn btn-primary" onClick={() => void save()} disabled={!canEdit}>Save Config</button>
          <button className="btn btn-ghost" onClick={() => void onRefreshTrades()}>Refresh Trades</button>
        </div>
      </div>

      <div className="subhead">{`Managed Trades (${managedTrades.length})`}</div>
      {managedTrades.length === 0 ? <div className="hint">No managed trades yet.</div> : null}
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
            <div className={`order-meta ${trade.realizedPnlUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>{`Realized ${fmtUsd(trade.realizedPnlUsd)} (fee ${fmtUsd(trade.feeUsd)})`}</div>
            <div className="hint">{`Updated ${formatTime(trade.updatedAt)}`}</div>
          </article>
        ))}
      </div>

      {closedTrades.length > 0 ? <div className="subhead">{`Closed (${closedTrades.length})`}</div> : null}
      <div className="orders-list">
        {closedTrades.slice(0, 25).map((trade) => (
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
