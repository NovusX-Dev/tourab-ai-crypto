import type { OpsMetrics } from "../types";

interface OpsMetricsPanelProps {
  metrics: OpsMetrics;
}

export function OpsMetricsPanel({ metrics }: OpsMetricsPanelProps) {
  return (
    <section className="panel-content" aria-label="Ops metrics panel">
      <div className="panel-title">Ops Metrics</div>
      <div className="logs-list">
        <article className="log-row"><span>Control req</span><span>{metrics.controlRequestsTotal}</span><span>-</span><span>Total control requests</span></article>
        <article className="log-row"><span>Control fail</span><span>{metrics.controlFailuresTotal}</span><span>-</span><span>Control failures</span></article>
        <article className="log-row"><span>WS conn</span><span>{metrics.wsConnectionsTotal}</span><span>-</span><span>WebSocket connections</span></article>
        <article className="log-row"><span>WS disc</span><span>{metrics.wsDisconnectsTotal}</span><span>-</span><span>WebSocket disconnects</span></article>
        <article className="log-row"><span>Gate reject</span><span>{metrics.gatekeeperRejectsTotal}</span><span>-</span><span>Gatekeeper rejects</span></article>
        <article className="log-row"><span>Drift events</span><span>{metrics.driftEventsTotal}</span><span>-</span><span>Drift detections</span></article>
        <article className="log-row"><span>Heartbeat gap</span><span>{metrics.heartbeatGapEventsTotal}</span><span>{metrics.lastHeartbeatGapMs}ms</span><span>Gap detections</span></article>
        <article className="log-row"><span>Open alerts</span><span>{metrics.openAlerts}</span><span>-</span><span>Active alerts</span></article>
        <article className="log-row"><span>Open incidents</span><span>{metrics.openIncidents}</span><span>-</span><span>Active incidents</span></article>
        <article className="log-row"><span>Recon runs</span><span>{metrics.reconcileRunsTotal}</span><span>-</span><span>Continuous reconciliation runs</span></article>
      </div>
    </section>
  );
}
