import type { Milestone5EvidenceSummary } from "../types";

interface Milestone5ReadinessCardProps {
  evidence: Milestone5EvidenceSummary;
}

export function Milestone5ReadinessCard({ evidence }: Milestone5ReadinessCardProps) {
  const today = evidence.today;
  return (
    <section className="card m5-readiness-card" aria-label="Milestone 5 readiness">
      <div className="panel-head">
        <div className="panel-title">M5 Evidence</div>
        <span className={`status-pill ${evidence.milestoneReady ? "status-running" : "status-paused"}`}>
          {evidence.qualifiedDays}/{evidence.requiredDays}
        </span>
      </div>
      <div className="m5-readiness-grid">
        <div className={`m5-pill ${today.pass ? "ok" : "fail"}`}>Today: {today.pass ? "PASS" : "FAIL"}</div>
        <div className="m5-pill">Streak: {evidence.streakDays}d</div>
        <div className="m5-pill">Closure: {today.closureRatePct.toFixed(2)}%</div>
        <div className="m5-pill">Errors: {today.tradeErrors}</div>
      </div>
      {today.blockers.length > 0 ? (
        <ul className="m5-blockers">
          {today.blockers.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="m5-all-clear">No blockers for today.</div>
      )}
    </section>
  );
}
