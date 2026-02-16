import type { BotApiClient } from "./BotApiClient";
import type { BotEvent, ControlAction, DashboardSnapshot, UserRole } from "../types";
import { isActionEnabled, canRoleExecuteAction, transitionState } from "../logic/controlAvailability";
import {
  applyLifecycleAction,
  bumpState,
  initialAudit,
  initialEvents,
  initialLogs,
  initialReconciliation,
  initialRisk,
  initialState,
  nextEvent
} from "../mock/mockData";

export class MockBotApiClient implements BotApiClient {
  private state = initialState();
  private events = initialEvents();
  private risk = initialRisk();
  private reconciliation = initialReconciliation();
  private audit = initialAudit();
  private logs = initialLogs();
  private intervalRef: ReturnType<typeof setInterval> | undefined;
  private eventIndex = 0;

  async getSnapshot(): Promise<DashboardSnapshot> {
    return {
      state: this.state,
      events: [...this.events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      risk: this.risk,
      reconciliation: this.reconciliation,
      audit: this.audit,
      logs: this.logs
    };
  }

  subscribeToEvents(onEvent: (event: BotEvent) => void): () => void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
    this.intervalRef = setInterval(() => {
      this.state = bumpState(this.state);
      const event = nextEvent(this.eventIndex, this.state);
      this.eventIndex += 1;
      this.events = [event, ...this.events].slice(0, 400);
      if (event.type === "Error") {
        this.logs = [
          {
            id: `log-${Date.now()}`,
            at: event.timestamp,
            severity: "error",
            symbol: event.symbol,
            message: event.message
          },
          ...this.logs
        ].slice(0, 300);
      }
      onEvent(event);
    }, 2000);

    return () => {
      if (this.intervalRef) {
        clearInterval(this.intervalRef);
        this.intervalRef = undefined;
      }
    };
  }

  async performAction(action: ControlAction, role: UserRole): Promise<{ ok: boolean; message: string }> {
    if (!canRoleExecuteAction(role, action)) {
      return { ok: false, message: "Not authorized for this action" };
    }
    if (!isActionEnabled(this.state.state, action)) {
      return { ok: false, message: `Action ${action} is not available while bot is ${this.state.state}` };
    }

    this.state = applyLifecycleAction(this.state, transitionState(this.state.state, action));
    const actionEvent: BotEvent = {
      id: `evt-action-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "System",
      symbol: this.state.activeSymbol,
      message: `Control action executed: ${action}`,
      severity: "info",
      tags: ["manual_override"]
    };
    this.events = [actionEvent, ...this.events].slice(0, 400);
    this.logs = [
      {
        id: `log-action-${Date.now()}`,
        at: actionEvent.timestamp,
        severity: "info",
        symbol: this.state.activeSymbol,
        message: actionEvent.message
      },
      ...this.logs
    ].slice(0, 300);

    return { ok: true, message: actionEvent.message };
  }
}

export const mockBotApiClient = new MockBotApiClient();
