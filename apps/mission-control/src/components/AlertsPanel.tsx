import { formatTime } from "../format";
import type { AlertItem } from "../types";

interface AlertsPanelProps {
  items: AlertItem[];
  currentUserId: string;
  onRefresh: () => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}

export function AlertsPanel({ items, currentUserId, onRefresh, onAcknowledge, onResolve }: AlertsPanelProps) {
  return (
    <section className="panel-content" aria-label="Alerts panel">
      <div className="panel-head">
        <div className="panel-title">Alerts</div>
        <button className="btn btn-ghost" onClick={onRefresh}>Refresh</button>
      </div>

      <div className="alerts-list">
        {items.length === 0 ? <div className="hint">No alerts</div> : null}
        {items.map((item) => (
          <article key={item.id} className="alert-card">
            <div className="alert-head">
              <span className={`tag sev-${item.severity === "critical" ? "error" : item.severity}`}>
                {item.severity.toUpperCase()}
              </span>
              <span className={`tag alert-status-${item.status}`}>{item.status.toUpperCase()}</span>
            </div>
            <div className="alert-title">{item.title}</div>
            <div className="alert-meta">{item.code} | source={item.source} | count={item.count}</div>
            <div className="alert-meta">{item.detail}</div>
            <div className="alert-meta">First: {formatTime(item.firstSeenAt)} | Last: {formatTime(item.lastSeenAt)}</div>
            <div className="alert-meta">Actor: {currentUserId}</div>
            {item.acknowledgedBy ? <div className="alert-meta">Ack: {item.acknowledgedBy}</div> : null}
            {item.resolvedBy ? <div className="alert-meta">Resolved: {item.resolvedBy}</div> : null}
            <div className="alert-actions">
              <button
                className="btn btn-ghost"
                disabled={item.status !== "open"}
                onClick={() => onAcknowledge(item.id)}
              >
                Acknowledge
              </button>
              <button
                className="btn btn-danger"
                disabled={item.status === "resolved"}
                onClick={() => onResolve(item.id)}
              >
                Resolve
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
