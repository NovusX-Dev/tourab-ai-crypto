import type { RolloutStatusSummary } from "../types";

interface RolloutStatusCardProps {
  status: RolloutStatusSummary;
}

export function RolloutStatusCard({ status }: RolloutStatusCardProps) {
  return (
    <section className="card rollout-status-card" aria-label="Autonomy rollout status">
      <div className="panel-head">
        <div className="panel-title">Rollout Status</div>
        <span className={`status-pill ${status.confidenceReset.active ? "status-paused" : "status-running"}`}>
          {status.confidenceReset.active ? "RESET ACTIVE" : status.posture.toUpperCase()}
        </span>
      </div>
      <div className="rollout-stage-label">{status.currentStage.label}</div>
      <div className="rollout-stage-objective">{status.currentStage.objective}</div>
      <div className="rollout-status-grid">
        <div className="m5-pill">Evidence: {status.evidence.effectiveQualifiedDays}/{status.evidence.requiredDays}</div>
        <div className="m5-pill">Streak: {status.evidence.streakDays}d</div>
        <div className={`m5-pill ${status.evidence.fresh ? "ok" : "fail"}`}>
          {status.evidence.fresh ? "Fresh" : "Stale"} {status.evidence.ageDays ?? "-"}d
        </div>
      </div>
      <div className="rollout-next-gate">{status.nextGate.label}</div>
      {status.nextGate.blockers.length > 0 ? (
        <ul className="m5-blockers">
          {status.nextGate.blockers.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="m5-all-clear">No blockers for the next gate.</div>
      )}
      <div className="rollout-action">{status.nextRecommendedAction}</div>
    </section>
  );
}
