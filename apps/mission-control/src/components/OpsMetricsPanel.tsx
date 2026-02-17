import type { OpsMetrics } from "../types";

interface OpsMetricsPanelProps {
  metrics: OpsMetrics;
}

export function OpsMetricsPanel({ metrics }: OpsMetricsPanelProps) {
  const items = [
    { key: "controlRequestsTotal", label: "Control Requests", value: metrics.controlRequestsTotal, detail: "Total control commands received." },
    { key: "controlFailuresTotal", label: "Control Failures", value: metrics.controlFailuresTotal, detail: "Control commands rejected or failed." },
    { key: "wsConnectionsTotal", label: "WS Connections", value: metrics.wsConnectionsTotal, detail: "WebSocket sessions opened." },
    { key: "wsDisconnectsTotal", label: "WS Disconnects", value: metrics.wsDisconnectsTotal, detail: "WebSocket sessions closed." },
    { key: "gatekeeperRejectsTotal", label: "Gatekeeper Rejects", value: metrics.gatekeeperRejectsTotal, detail: "Worker proposals rejected by policy." },
    { key: "driftEventsTotal", label: "Drift Events", value: metrics.driftEventsTotal, detail: "Reconciliation drift detections." },
    { key: "openAlerts", label: "Open Alerts", value: metrics.openAlerts, detail: "Alerts still unresolved." },
    { key: "openIncidents", label: "Open Incidents", value: metrics.openIncidents, detail: "Incidents still unresolved." },
    { key: "reconcileRunsTotal", label: "Reconcile Runs", value: metrics.reconcileRunsTotal, detail: "Continuous reconciliation cycles." }
  ] as const;

  return (
    <section className="panel-content" aria-label="Ops metrics panel">
      <div className="panel-title">Ops Metrics</div>
      <div className="ops-grid">
        {items.map((item) => (
          <article className="ops-card" key={item.key}>
            <div className="ops-label">{item.label}</div>
            <div className="ops-value">{item.value}</div>
            <div className="ops-detail">{item.detail}</div>
          </article>
        ))}
        <article className="ops-card ops-wide">
          <div className="ops-label">Heartbeat Gap</div>
          <div className="ops-inline">
            <span className="ops-value">{metrics.heartbeatGapEventsTotal}</span>
            <span className="ops-detail">events</span>
            <span className="ops-value">{metrics.lastHeartbeatGapMs}ms</span>
            <span className="ops-detail">latest gap</span>
          </div>
        </article>
      </div>
    </section>
  );
}
