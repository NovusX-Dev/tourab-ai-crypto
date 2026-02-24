import { useEffect, useState } from "react";
import { formatEquityRoundedThousands, formatTime } from "../format";
import type { PortfolioStatus } from "../types";

interface PortfolioPanelProps {
  portfolio: PortfolioStatus;
}

function toNum(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmtUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function fmtPct(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

export function PortfolioPanel({ portfolio }: PortfolioPanelProps) {
  const [dayBasis, setDayBasis] = useState<"utc" | "exchange">(() => {
    if (typeof window === "undefined") {
      return "utc";
    }
    const saved = window.localStorage.getItem("tourab_daily_basis");
    return saved === "exchange" ? "exchange" : "utc";
  });
  const [showAllBalances, setShowAllBalances] = useState(false);
  const balances = [...portfolio.balances].sort((a, b) => toNum(b.eq) - toNum(a.eq));
  const visibleBalances = showAllBalances ? balances : balances.slice(0, 8);
  const perf = portfolio.performance;
  const selectedDaily =
    perf.dailyByBasis?.[dayBasis] ??
    (dayBasis === "exchange" ? perf.dailyByBasis?.exchange : perf.dailyByBasis?.utc) ??
    perf.daily;
  const selectedBasisLabel =
    dayBasis === "exchange"
      ? perf.exchangeTimezoneLabel ?? "Exchange TZ"
      : "UTC";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("tourab_daily_basis", dayBasis);
  }, [dayBasis]);
  const timeline = perf.timeline.slice(-120);
  const minEq = timeline.length > 0 ? Math.min(...timeline.map((item) => item.equityUsd)) : 0;
  const maxEq = timeline.length > 0 ? Math.max(...timeline.map((item) => item.equityUsd)) : 0;
  const minDd = timeline.length > 0 ? Math.min(...timeline.map((item) => item.drawdownPct)) : -1;
  const maxDd = 0;

  const eqPoints =
    timeline.length <= 1 || maxEq - minEq === 0
      ? ""
      : timeline
          .map((item, index) => {
            const x = (index / (timeline.length - 1)) * 100;
            const y = 100 - ((item.equityUsd - minEq) / (maxEq - minEq)) * 100;
            return `${x},${y}`;
          })
          .join(" ");
  const ddPoints =
    timeline.length <= 1 || maxDd - minDd === 0
      ? ""
      : timeline
          .map((item, index) => {
            const x = (index / (timeline.length - 1)) * 100;
            const y = 100 - ((item.drawdownPct - minDd) / (maxDd - minDd)) * 100;
            return `${x},${y}`;
          })
          .join(" ");

  return (
    <section className="panel-content" aria-label="Portfolio panel">
      <div className="panel-head">
        <div className="panel-title">Portfolio</div>
        <span className="tag">{`Eq ${formatEquityRoundedThousands(portfolio.totalEq)} USD`}</span>
      </div>
      <div className="hint">{`Updated: ${formatTime(portfolio.lastUpdatedAt)}`}</div>
      {portfolio.lastError ? <div className="inline-card">{portfolio.lastError}</div> : null}

      <div className="pnl-day-toggle">
        <span className="hint">Daily basis</span>
        <div className="panel-controls">
          <button className={`chip ${dayBasis === "utc" ? "chip-active" : ""}`} onClick={() => setDayBasis("utc")}>
            UTC
          </button>
          <button className={`chip ${dayBasis === "exchange" ? "chip-active" : ""}`} onClick={() => setDayBasis("exchange")}>
            {perf.exchangeTimezoneLabel ? `Exchange (${perf.exchangeTimezoneLabel})` : "Exchange TZ"}
          </button>
        </div>
      </div>

      <div className="pnl-summary-grid">
        <article className="pnl-kpi-card">
          <div className="pnl-kpi-label">Session Delta</div>
          <div className={`pnl-kpi-value ${perf.deltaUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>{fmtUsd(perf.deltaUsd)}</div>
          <div className={`pnl-kpi-meta ${perf.deltaPct >= 0 ? "pnl-positive" : "pnl-negative"}`}>{fmtPct(perf.deltaPct)}</div>
        </article>
        <article className="pnl-kpi-card">
          <div className="pnl-kpi-label">Realized Today</div>
          <div className={`pnl-kpi-value ${selectedDaily.realizedPnlUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>{fmtUsd(selectedDaily.realizedPnlUsd)}</div>
          <div className="pnl-kpi-meta">{`Fees ${fmtUsd(selectedDaily.feesUsd)}`}</div>
        </article>
        <article className="pnl-kpi-card">
          <div className="pnl-kpi-label">Unrealized</div>
          <div className={`pnl-kpi-value ${selectedDaily.unrealizedPnlUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>{fmtUsd(selectedDaily.unrealizedPnlUsd)}</div>
          <div className="pnl-kpi-meta">{`Day ${selectedDaily.day} (${selectedBasisLabel})`}</div>
        </article>
        <article className="pnl-kpi-card">
          <div className="pnl-kpi-label">Win Rate</div>
          <div className="pnl-kpi-value">{fmtPct(selectedDaily.winRate)}</div>
          <div className="pnl-kpi-meta">{`${selectedDaily.wins}W / ${selectedDaily.losses}L`}</div>
        </article>
      </div>

      <div className="pnl-chart-card">
        <div className="panel-head">
          <div className="panel-title">Equity Timeline</div>
          <span className="hint">{`${timeline.length} points`}</span>
        </div>
        {timeline.length < 2 ? (
          <div className="hint">Not enough equity points yet.</div>
        ) : (
          <svg viewBox="0 0 100 100" className="pnl-chart" preserveAspectRatio="none" role="img" aria-label="Equity and drawdown timeline">
            <polyline className="pnl-chart-equity" points={eqPoints} />
            <polyline className="pnl-chart-drawdown" points={ddPoints} />
          </svg>
        )}
        <div className="pnl-chart-legend">
          <span className="legend-item"><i className="legend-line equity" />Equity</span>
          <span className="legend-item"><i className="legend-line drawdown" />Drawdown</span>
        </div>
      </div>

      <div className="portfolio-list">
        {balances.length > 8 ? (
          <div className="panel-controls">
            <button className="chip" onClick={() => setShowAllBalances((prev) => !prev)}>
              {showAllBalances ? "Show Top 8" : `Show All (${balances.length})`}
            </button>
          </div>
        ) : null}
        {balances.length === 0 ? <div className="hint">No balances available.</div> : null}
        {visibleBalances.map((item) => (
          <article key={item.ccy} className="portfolio-row">
            <div className="portfolio-ccy">{item.ccy}</div>
            <div className="portfolio-metric">{`Eq ${item.eq}`}</div>
            <div className="portfolio-metric">{`Avail ${item.availBal}`}</div>
            <div className="portfolio-metric">{`Cash ${item.cashBal}`}</div>
          </article>
        ))}
      </div>

      <div className="pnl-trades">
        <div className="panel-head">
          <div className="panel-title">Trade PnL</div>
          <span className="hint">{`${perf.trades.length} rows`}</span>
        </div>
        {perf.trades.length === 0 ? <div className="hint">No filled trades available yet.</div> : null}
        {perf.trades.map((item) => (
          <article key={`${item.tradeId}-${item.ts}`} className="pnl-trade-row">
            <div className="order-main">
              <strong>{item.symbol}</strong>
              <span className={`tag ${item.side === "buy" ? "sev-info" : "sev-warn"}`}>{item.side}</span>
              <span className="tag">{formatTime(item.ts)}</span>
            </div>
            <div className="order-meta">{`Qty ${item.qtyBase} @ ${item.price}`}</div>
            <div className="order-meta">{`Notional ${fmtUsd(item.notionalUsd)}`}</div>
            <div className={`order-meta ${item.realizedPnlUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>{`Realized ${fmtUsd(item.realizedPnlUsd)}`}</div>
            <div className={`order-meta ${item.netPnlUsd >= 0 ? "pnl-positive" : "pnl-negative"}`}>{`Net ${fmtUsd(item.netPnlUsd)} (fee ${fmtUsd(item.feeUsd)})`}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
