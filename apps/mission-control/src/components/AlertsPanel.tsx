import { useEffect, useMemo, useState } from "react";
import { formatTime } from "../format";
import type { AlertItem } from "../types";

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
  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (item.status !== "resolved") {
          return true;
        }
        const resolvedAtEpoch = Date.parse(item.resolvedAt ?? "");
        if (!Number.isFinite(resolvedAtEpoch)) {
          return false;
        }
        return resolvedAtEpoch + 10_000 > nowEpochMs;
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
        {visibleItems.length === 0 ? <div className="hint">No alerts</div> : null}
        {visibleItems.map((item) => (
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
        ))}
      </div>
    </section>
  );
}
