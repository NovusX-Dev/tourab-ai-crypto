import { formatTime } from "../format";
import type { IncidentItem } from "../types";

interface IncidentsPanelProps {
  items: IncidentItem[];
  currentUserId: string;
  onRefresh: () => void;
  onExportLearningReport: () => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onOpenLearningTrend: (sourceAlertCode?: string) => void;
}

export function IncidentsPanel({
  items,
  currentUserId,
  onRefresh,
  onExportLearningReport,
  onAcknowledge,
  onResolve,
  onOpenLearningTrend
}: IncidentsPanelProps) {
  return (
    <section className="panel-content" aria-label="Incidents panel">
      <div className="panel-head">
        <div className="panel-title">Incidents</div>
        <div className="alert-actions">
          <button className="btn btn-ghost" onClick={onExportLearningReport}>Export M7 Incidents</button>
          <button className="btn btn-ghost" onClick={onRefresh}>Refresh</button>
        </div>
      </div>

      <div className="alerts-list">
        {items.length === 0 ? <div className="hint">No incidents</div> : null}
        {items.map((item) => (
          <article key={item.id} className="alert-card">
            <div className="alert-head">
              <span className={`tag sev-${item.severity === "sev1" ? "error" : item.severity === "sev2" ? "warn" : "info"}`}>
                {item.severity.toUpperCase()}
              </span>
              <span className={`tag alert-status-${item.status}`}>{item.status.toUpperCase()}</span>
            </div>
            <div className="alert-title">{item.title}</div>
            <div className="alert-meta">taxonomy={item.taxonomy} | owner={item.owner ?? "unassigned"}</div>
            <div className="alert-meta">{item.detail}</div>
            <div className="alert-meta">Runbook: <code>{item.runbookRef}</code></div>
            <div className="alert-meta">Created: {formatTime(item.createdAt)} | Updated: {formatTime(item.updatedAt)}</div>
            <div className="alert-meta">Actor: {currentUserId}</div>
            {item.acknowledgedBy ? <div className="alert-meta">Ack: {item.acknowledgedBy}</div> : null}
            {item.resolvedBy ? <div className="alert-meta">Resolved: {item.resolvedBy}</div> : null}
            <div className="alert-actions">
              {item.sourceAlertCode?.startsWith("LEARNING_") ? (
                <button className="btn btn-ghost" onClick={() => onOpenLearningTrend(item.sourceAlertCode)}>
                  Open M7 Trend
                </button>
              ) : null}
              <button className="btn btn-ghost" disabled={item.status !== "open"} onClick={() => onAcknowledge(item.id)}>
                Acknowledge
              </button>
              <button className="btn btn-danger" disabled={item.status === "resolved"} onClick={() => onResolve(item.id)}>
                Resolve
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
