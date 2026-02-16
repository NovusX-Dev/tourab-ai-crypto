import { canRoleExecuteAction, isActionEnabled } from "../logic/controlAvailability";
import type { BotLifecycleState, ControlAction, UserRole } from "../types";

interface ControlDeckProps {
  role: UserRole;
  state: BotLifecycleState;
  onAction: (action: ControlAction) => void;
}

const ACTIONS: Array<{ id: ControlAction; label: string; destructive?: boolean }> = [
  { id: "start", label: "Start" },
  { id: "pause", label: "Pause" },
  { id: "resume", label: "Resume" },
  { id: "stop", label: "Stop", destructive: true },
  { id: "cancel_all", label: "Cancel-all", destructive: true },
  { id: "emergency_stop", label: "Emergency Stop", destructive: true }
];

export function ControlDeck({ role, state, onAction }: ControlDeckProps) {
  return (
    <section className="card control-deck" aria-label="Control deck">
      <div className="panel-title">Control Deck</div>
      <div className="control-grid">
        {ACTIONS.map((action) => {
          const roleAllowed = canRoleExecuteAction(role, action.id);
          const stateAllowed = isActionEnabled(state, action.id);
          const disabled = !(roleAllowed && stateAllowed);
          return (
            <button
              key={action.id}
              className={`btn ${action.destructive ? "btn-danger" : "btn-primary"}`}
              disabled={disabled}
              onClick={() => onAction(action.id)}
            >
              {action.label}
            </button>
          );
        })}
      </div>
      {role === "read_only" ? <div className="hint">Read-only role: controls disabled</div> : null}
    </section>
  );
}
