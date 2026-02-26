import { useEffect, useMemo, useState } from "react";
import { formatTime } from "../format";
import type { AlertItem } from "../types";
import {
  buildHumanSummary,
  formatAlertTitle,
  generateSuggestedAction,
  parseStructuredImpact,
  severityToneForAlert
} from "../logic/alertIncidentPresentation";

interface AlertsPanelProps {
  items: AlertItem[];
  currentUserId: string;
  canManageAlerts: boolean;
  onRefresh: () => void;
  onClearErrors: () => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onOpenLearningTrend: (code: string) => void;
}

export function AlertsPanel({
  items,
  currentUserId,
  canManageAlerts,
  onRefresh,
  onClearErrors,
  onAcknowledge,
  onResolve,
  onOpenLearningTrend
}: AlertsPanelProps) {
  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now());
  const clearableErrors = items.filter(
    (item) => item.status !== "resolved" && (item.severity === "warn" || item.severity === "error" || item.severity === "critical")
  );
  const activeItems = useMemo(() => items.filter((item) => item.status !== "resolved"), [items]);
  const resolvedItems = useMemo(
    () =>
      items.filter((item) => {
        if (item.status !== "resolved") {
          return false;
        }
        const resolvedAtEpoch = Date.parse(item.resolvedAt ?? "");
        return Number.isFinite(resolvedAtEpoch) ? resolvedAtEpoch + 60_000 > nowEpochMs : true;
      }),
    [items, nowEpochMs]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNowEpochMs(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <section className="panel-content" aria-label="Alerts panel">
      <div className="panel-head">
        <div className="panel-title">Alerts</div>
        <div className="panel-controls">
          <button className="btn btn-danger" onClick={onClearErrors} disabled={!canManageAlerts || clearableErrors.length === 0}>
            Clear warn/error
          </button>
          <button className="btn btn-ghost" onClick={onRefresh}>Refresh</button>
        </div>
      </div>

      <div className="alerts-list">
        {activeItems.length === 0 ? <div className="hint">No active alerts</div> : null}
        {activeItems.map((item) => {
          const impact = parseStructuredImpact(item.detail, item.symbol);
          const readableTitle = formatAlertTitle(item.code);
          const summary = buildHumanSummary({
            code: item.code,
            title: readableTitle,
            detail: item.detail,
            source: item.source,
            impact
          });
          const suggestedAction = generateSuggestedAction({
            code: item.code,
            source: item.source,
            impact,
            count: item.count
          });
          const severityTone = severityToneForAlert(item);

          return (
            <article key={item.id} className={`alert-card alert-ops-card alert-severity-${severityTone}`}>
              <div className="alert-ops-head">
                <div className="alert-ops-badges">
                  <span className={`alert-severity-badge alert-severity-badge-${severityTone}`}>{severityTone.toUpperCase()}</span>
                  <span className={`tag alert-status-${item.status}`}>{item.status.toUpperCase()}</span>
                  {item.count > 1 ? <span className="tag">{`x${item.count}`}</span> : null}
                </div>
                <div className="alert-ops-symbol">{impact.symbol ?? item.symbol ?? "SYSTEM"}</div>
              </div>

              <div className="alert-title">{readableTitle}</div>
              <div className="alert-summary">{summary}</div>

              <div className="alert-impact-grid">
                <div className="alert-impact-cell">
                  <div className="alert-impact-label">Side</div>
                  <div className="alert-impact-value">{impact.side ? impact.side.toUpperCase() : "n/a"}</div>
                </div>
                <div className="alert-impact-cell">
                  <div className="alert-impact-label">Qty</div>
                  <div className="alert-impact-value alert-value-mono">{Number.isFinite(impact.qty) ? impact.qty?.toFixed(6) : "n/a"}</div>
                </div>
                <div className="alert-impact-cell">
                  <div className="alert-impact-label">Price</div>
                  <div className="alert-impact-value alert-value-mono">{Number.isFinite(impact.price) ? impact.price?.toFixed(6) : "n/a"}</div>
                </div>
                <div className="alert-impact-cell">
                  <div className="alert-impact-label">Retries</div>
                  <div className="alert-impact-value alert-value-mono">{Number.isFinite(impact.retries) ? impact.retries : "n/a"}</div>
                </div>
              </div>

              {suggestedAction ? <div className="alert-suggested">Suggested Action: {suggestedAction}</div> : null}

              <div className="alert-meta-grid">
                <div className="alert-meta">First Seen: {formatTime(item.firstSeenAt)}</div>
                <div className="alert-meta">Last Seen: {formatTime(item.lastSeenAt)}</div>
                <div className="alert-meta">Occurrences: {item.count}</div>
                <div className="alert-meta">Actor: {currentUserId}</div>
                {item.acknowledgedBy ? <div className="alert-meta">Acknowledged By: {item.acknowledgedBy}</div> : null}
                {item.resolvedBy ? <div className="alert-meta">Resolved By: {item.resolvedBy}</div> : null}
              </div>

              <details className="alert-tech">
                <summary>Technical Details</summary>
                <div className="alert-tech-grid">
                  <div className="alert-tech-key">eventCode</div>
                  <div className="alert-tech-value alert-value-mono">{item.code}</div>
                  <div className="alert-tech-key">tradeId</div>
                  <div className="alert-tech-value alert-value-mono">{impact.tradeId ?? "n/a"}</div>
                  <div className="alert-tech-key">apiCode</div>
                  <div className="alert-tech-value alert-value-mono">{impact.apiCode ?? "n/a"}</div>
                  <div className="alert-tech-key">sCode</div>
                  <div className="alert-tech-value alert-value-mono">{impact.sCode ?? "n/a"}</div>
                  <div className="alert-tech-key">okxCode</div>
                  <div className="alert-tech-value alert-value-mono">{impact.okxCode ?? "n/a"}</div>
                  <div className="alert-tech-key">raw</div>
                  <div className="alert-tech-value alert-value-mono">{item.detail}</div>
                </div>
              </details>

              <div className="alert-actions">
                {item.code.startsWith("LEARNING_") ? (
                  <button className="btn btn-ghost" onClick={() => onOpenLearningTrend(item.code)}>
                    Open M7 Trend
                  </button>
                ) : null}
                <button
                  className="btn btn-ghost"
                  disabled={!canManageAlerts || item.status !== "open"}
                  onClick={() => onAcknowledge(item.id)}
                >
                  Acknowledge
                </button>
                <button
                  className="btn btn-danger"
                  disabled={!canManageAlerts || item.status === "resolved"}
                  onClick={() => onResolve(item.id)}
                >
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
                  <div className="alert-title">{formatAlertTitle(item.code)}</div>
                  <div className="alert-meta">Resolved at: {formatTime(item.resolvedAt ?? item.lastSeenAt)}</div>
                </article>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
