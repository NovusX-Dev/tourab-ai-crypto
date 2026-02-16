import type { RiskStatus } from "../types";

interface RiskPanelProps {
  risk: RiskStatus;
}

export function RiskPanel({ risk }: RiskPanelProps) {
  return (
    <section className="panel-content" aria-label="Risk panel">
      <div className="panel-title">Risk Shield</div>

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

      <div className="subhead">Active Blocks</div>
      {risk.activeBlocks.map((block) => (
        <div className="inline-card" key={`${block.symbol}-${block.since}`}>
          <strong>{block.symbol}</strong>: {block.reason}
        </div>
      ))}

      <div className="subhead">Recent Reject Reasons</div>
      {risk.recentRejects.map((reject) => (
        <div className="inline-card" key={reject.id}>
          <strong>{reject.symbol}</strong>: {reject.reason}
        </div>
      ))}
    </section>
  );
}
