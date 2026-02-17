import { formatTime } from "../format";
import type { ReconciliationStatus, UserRole } from "../types";

interface ReconciliationCardProps {
  status: ReconciliationStatus;
  role: UserRole;
  onSetStatus: (input: Partial<Pick<ReconciliationStatus, "positions" | "pnl" | "orders">>) => void;
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

export function ReconciliationCard({ status, role, onSetStatus }: ReconciliationCardProps) {
  return (
    <section className="card recon-card" aria-label="Reconciliation status">
      <div className="panel-title">Reconciliation</div>
      <div className="recon-grid">
        <div className={`recon-chip ${badgeClass(status.positions)}`}>Positions: {status.positions}</div>
        <div className={`recon-chip ${badgeClass(status.pnl)}`}>PnL: {status.pnl}</div>
        <div className={`recon-chip ${badgeClass(status.orders)}`}>Orders: {status.orders}</div>
      </div>
      <div className="hint">Last run: {formatTime(status.lastRunAt)}</div>
      <div className="recon-actions">
        <button className="btn btn-ghost" disabled={role === "read_only"} onClick={() => onSetStatus({ positions: "ok", pnl: "ok", orders: "ok" })}>
          Mark OK
        </button>
        <button className="btn btn-danger" disabled={role === "read_only"} onClick={() => onSetStatus({ orders: "drift" })}>
          Sim Drift
        </button>
        <button className="btn btn-danger" disabled={role === "read_only"} onClick={() => onSetStatus({ orders: "error" })}>
          Sim Error
        </button>
      </div>
    </section>
  );
}
