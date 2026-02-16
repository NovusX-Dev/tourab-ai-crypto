import { formatTime } from "../format";
import type { ReconciliationStatus } from "../types";

interface ReconciliationCardProps {
  status: ReconciliationStatus;
}

function badgeClass(value: ReconciliationStatus["orders"]): string {
  if (value === "ok") {
    return "state-ok";
  }
  if (value === "drift") {
    return "state-drift";
  }
  if (value === "error") {
    return "state-error";
  }
  return "state-progress";
}

export function ReconciliationCard({ status }: ReconciliationCardProps) {
  return (
    <section className="card recon-card" aria-label="Reconciliation status">
      <div className="panel-title">Reconciliation</div>
      <div className="recon-grid">
        <div className={`recon-chip ${badgeClass(status.positions)}`}>Positions: {status.positions}</div>
        <div className={`recon-chip ${badgeClass(status.pnl)}`}>PnL: {status.pnl}</div>
        <div className={`recon-chip ${badgeClass(status.orders)}`}>Orders: {status.orders}</div>
      </div>
      <div className="hint">Last run: {formatTime(status.lastRunAt)}</div>
    </section>
  );
}
