import type { RiskStatus } from "../types";

interface RiskPanelProps {
  risk: RiskStatus;
}

export function RiskPanel({ risk }: RiskPanelProps) {
  return (
    <section className="panel-content" aria-label="Risk panel">
      <div className="panel-title">Risk Shield</div>
      <details className="risk-section" open>
        <summary className="subhead risk-summary">Limits</summary>
        <div className="risk-limits">
          {risk.limits.map((limit) => {
            const pct = Math.min(100, (limit.current / limit.limit) * 100);
            return (
              <article key={limit.key} className="risk-card">
                <div className="risk-label">{limit.label}</div>
                <div className="risk-values">
                  {limit.current} / {limit.limit} {limit.unit}
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill ${pct > 80 ? "warn" : "safe"}`} style={{ width: `${pct}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      </details>

      <details className="risk-section" open>
        <summary className="subhead risk-summary">Active Blocks</summary>
        {risk.activeBlocks.length === 0 ? <div className="hint">No active blocks.</div> : null}
        {risk.activeBlocks.map((block) => (
          <div className="inline-card" key={`${block.symbol}-${block.since}`}>
            <strong>{block.symbol}</strong>: {block.reason}
          </div>
        ))}
      </details>

      <details className="risk-section" open>
        <summary className="subhead risk-summary">Recent Reject Reasons</summary>
        {risk.recentRejects.length === 0 ? <div className="hint">No recent reject reasons.</div> : null}
        {risk.recentRejects.map((reject) => (
          <div className="inline-card" key={reject.id}>
            <strong>{reject.symbol}</strong>: {reject.reason}
          </div>
        ))}
      </details>
    </section>
  );
}
