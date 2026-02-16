import { formatDuration, timeSinceMs } from "../format";
import type { BotStateSnapshot } from "../types";

interface BotStatusCardProps {
  state: BotStateSnapshot;
}

export function BotStatusCard({ state }: BotStatusCardProps) {
  const latency = formatDuration(timeSinceMs(state.lastHeartbeatAt));
  const statusClass = `status-pill status-${state.state}`;

  return (
    <section className="card bot-status-card" aria-label="Bot status">
      <div className="bot-status-head">
        <span className={statusClass}>{state.state.toUpperCase()}</span>
        <div className="heartbeat">Heartbeat: {latency} ago</div>
      </div>

      <div className="progress-wrap" aria-label="Cycle progress">
        <div className="progress-label">Cycle Progress</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${state.cycleProgress}%` }} />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">Symbol</div>
          <div className="stat-value">{state.activeSymbol}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Mode</div>
          <div className="stat-value">{state.mode}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Cycles</div>
          <div className="stat-value">{state.cycleCount}</div>
        </div>
      </div>
    </section>
  );
}
