import { formatTime } from "../format";
import type { PortfolioStatus } from "../types";

interface PortfolioPanelProps {
  portfolio: PortfolioStatus;
}

function toNum(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PortfolioPanel({ portfolio }: PortfolioPanelProps) {
  const balances = [...portfolio.balances].sort((a, b) => toNum(b.eq) - toNum(a.eq));

  return (
    <section className="panel-content" aria-label="Portfolio panel">
      <div className="panel-head">
        <div className="panel-title">Portfolio</div>
        <span className="tag">{`Eq ${portfolio.totalEq} USD`}</span>
      </div>
      <div className="hint">{`Updated: ${formatTime(portfolio.lastUpdatedAt)}`}</div>
      {portfolio.lastError ? <div className="inline-card">{portfolio.lastError}</div> : null}

      <div className="portfolio-list">
        {balances.length === 0 ? <div className="hint">No balances available.</div> : null}
        {balances.map((item) => (
          <article key={item.ccy} className="portfolio-row">
            <div className="portfolio-ccy">{item.ccy}</div>
            <div className="portfolio-metric">{`Eq ${item.eq}`}</div>
            <div className="portfolio-metric">{`Avail ${item.availBal}`}</div>
            <div className="portfolio-metric">{`Cash ${item.cashBal}`}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
