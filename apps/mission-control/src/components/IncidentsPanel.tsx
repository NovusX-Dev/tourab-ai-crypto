import { formatTime } from "../format";
import type { IncidentItem } from "../types";
import {
  buildHumanSummary,
  formatAlertTitle,
  generateSuggestedAction,
  parseStructuredImpact,
  severityToneForIncident
} from "../logic/alertIncidentPresentation";

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
  const activeItems = items.filter((item) => item.status !== "resolved");
  const resolvedItems = items.filter((item) => item.status === "resolved");

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
        {activeItems.length === 0 ? <div className="hint">No active incidents</div> : null}
        {activeItems.map((item) => {
          const impact = parseStructuredImpact(item.detail, item.symbol);
          const readableTitle = item.sourceAlertCode ? formatAlertTitle(item.sourceAlertCode) : item.title;
          const summary = buildHumanSummary({
            code: item.sourceAlertCode,
            title: readableTitle,
            detail: item.detail,
            taxonomy: item.taxonomy,
            impact
          });
          const suggestedAction = generateSuggestedAction({
            code: item.sourceAlertCode,
            taxonomy: item.taxonomy,
            impact
          });
          const severityTone = severityToneForIncident(item);

          return (
            <article key={item.id} className={`alert-card alert-ops-card alert-severity-${severityTone}`}>
              <div className="alert-ops-head">
                <div className="alert-ops-badges">
                  <span className={`alert-severity-badge alert-severity-badge-${severityTone}`}>{severityTone.toUpperCase()}</span>
                  <span className={`tag alert-status-${item.status}`}>{item.status.toUpperCase()}</span>
                </div>
                <div className="alert-ops-symbol">{impact.symbol ?? item.symbol ?? "SYSTEM"}</div>
              </div>

              <div className="alert-title">{readableTitle}</div>
              <div className="alert-summary">{summary}</div>

              <div className="alert-impact-grid">
                <div className="alert-impact-cell">
                  <div className="alert-impact-label">Taxonomy</div>
                  <div className="alert-impact-value">{item.taxonomy.replaceAll("_", " ")}</div>
                </div>
                <div className="alert-impact-cell">
                  <div className="alert-impact-label">Owner</div>
                  <div className="alert-impact-value">{item.owner ?? "unassigned"}</div>
                </div>
                <div className="alert-impact-cell">
                  <div className="alert-impact-label">Trade ID</div>
                  <div className="alert-impact-value alert-value-mono">{impact.tradeId ?? "n/a"}</div>
                </div>
                <div className="alert-impact-cell">
                  <div className="alert-impact-label">Runbook</div>
                  <div className="alert-impact-value alert-value-mono">{item.runbookRef}</div>
                </div>
              </div>

              {suggestedAction ? <div className="alert-suggested">Suggested Action: {suggestedAction}</div> : null}

              <div className="alert-meta-grid">
                <div className="alert-meta">Created: {formatTime(item.createdAt)}</div>
                <div className="alert-meta">Updated: {formatTime(item.updatedAt)}</div>
                <div className="alert-meta">Actor: {currentUserId}</div>
                {item.acknowledgedBy ? <div className="alert-meta">Acknowledged By: {item.acknowledgedBy}</div> : null}
                {item.resolvedBy ? <div className="alert-meta">Resolved By: {item.resolvedBy}</div> : null}
              </div>

              <details className="alert-tech">
                <summary>Technical Details</summary>
                <div className="alert-tech-grid">
                  <div className="alert-tech-key">sourceAlertCode</div>
                  <div className="alert-tech-value alert-value-mono">{item.sourceAlertCode ?? "n/a"}</div>
                  <div className="alert-tech-key">incidentId</div>
                  <div className="alert-tech-value alert-value-mono">{item.id}</div>
                  <div className="alert-tech-key">raw</div>
                  <div className="alert-tech-value alert-value-mono">{item.detail}</div>
                </div>
              </details>

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
          );
        })}

        {resolvedItems.length > 0 ? (
          <details className="alert-resolved-group">
            <summary>{`Resolved (${resolvedItems.length})`}</summary>
            <div className="alerts-list">
              {resolvedItems.map((item) => (
                <article key={item.id} className="alert-card alert-ops-card alert-resolved-card">
                  <div className="alert-ops-head">
                    <div className="alert-ops-badges">
                      <span className="alert-severity-badge alert-severity-badge-info">INFO</span>
                      <span className="tag alert-status-resolved">RESOLVED</span>
                    </div>
                    <div className="alert-ops-symbol">{item.symbol ?? "SYSTEM"}</div>
                  </div>
                  <div className="alert-title">{item.title}</div>
                  <div className="alert-meta">Resolved at: {formatTime(item.resolvedAt ?? item.updatedAt)}</div>
                </article>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
