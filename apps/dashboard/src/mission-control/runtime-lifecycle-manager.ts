import type {
  AuditItem,
  BotStateSnapshot,
  ControlAction,
  LogEntry,
  ReconciliationStatus,
  RiskStatus
} from "@tourab/shared";
import { createEvent, nowIso } from "./event-factory.js";
import { isActionEnabled, transitionState } from "./policy.js";

const SYMBOLS = ["BTC-USDT", "ETH-USDT", "SOL-USDT"];

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

export class RuntimeLifecycleManager {
  private state: BotStateSnapshot = {
    state: "stopped",
    cycleCount: 0,
    cycleProgress: 0,
    activeSymbol: "BTC-USDT",
    mode: "simulation",
    lastHeartbeatAt: nowIso()
  };

  readonly risk: RiskStatus = {
    limits: [
      { key: "max_pos", label: "Max Position Size", current: 0.36, limit: 1, unit: "BTC" },
      { key: "max_daily_loss", label: "Max Daily Loss", current: 180, limit: 1200, unit: "USDT" },
      { key: "notional", label: "Max Notional", current: 8500, limit: 30000, unit: "USDT" }
    ],
    activeBlocks: [
      {
        symbol: "BTC-USDT",
        reason: "Trading blocked due to volatility spike",
        since: new Date(Date.now() - 10 * 60_000).toISOString()
      }
    ],
    recentRejects: [
      {
        id: "reject-seed-1",
        symbol: "BTC-USDT",
        reason: "Proposal rejected: slippage threshold exceeded",
        at: new Date(Date.now() - 20 * 60_000).toISOString()
      }
    ]
  };

  reconciliation: ReconciliationStatus = {
    positions: "ok",
    pnl: "ok",
    orders: "in_progress",
    lastRunAt: new Date(Date.now() - 5 * 60_000).toISOString()
  };

  readonly audit: AuditItem[] = [
    {
      id: "audit-seed-1",
      at: new Date(Date.now() - 35 * 60_000).toISOString(),
      title: "Run started",
      detail: "Automation run started in simulation mode",
      symbol: "BTC-USDT",
      relatedEventType: "ProposalCreated"
    }
  ];

  readonly logs: LogEntry[] = [
    {
      id: "log-seed-1",
      at: new Date(Date.now() - 20 * 60_000).toISOString(),
      severity: "info",
      symbol: "BTC-USDT",
      message: "Cycle complete: proposal evaluated"
    }
  ];

  private timer: ReturnType<typeof setInterval> | undefined;

  getSnapshotState(): BotStateSnapshot {
    return { ...this.state };
  }

  patchState(next: Partial<BotStateSnapshot>): BotStateSnapshot {
    this.state = {
      ...this.state,
      ...next
    };
    return { ...this.state };
  }

  updateReconciliation(next: Partial<ReconciliationStatus>): ReconciliationStatus {
    this.reconciliation = {
      ...this.reconciliation,
      ...next,
      lastRunAt: next.lastRunAt ?? nowIso()
    };
    return { ...this.reconciliation };
  }

  startTick(onHeartbeatEvent: (eventMessage: string) => void): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.state.lastHeartbeatAt = nowIso();
      if (this.state.state === "running") {
        const nextProgress = Math.min(100, this.state.cycleProgress + 20);
        this.state.cycleProgress = nextProgress;
        if (nextProgress >= 100) {
          this.state.cycleProgress = 0;
          this.state.cycleCount += 1;
          this.state.activeSymbol = randomItem(SYMBOLS);
          onHeartbeatEvent("Cycle completed");
        } else {
          onHeartbeatEvent("Heartbeat checkpoint");
        }
      }
    }, 2000);
  }

  stopTick(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  applyAction(action: ControlAction): { ok: boolean; code: string; message: string; state: BotStateSnapshot } {
    if (!isActionEnabled(this.state.state, action)) {
      return {
        ok: false,
        code: "INVALID_STATE_TRANSITION",
        message: `Action ${action} is not allowed while bot is ${this.state.state}`,
        state: this.getSnapshotState()
      };
    }

    const nextState = transitionState(this.state.state, action);
    this.state = {
      ...this.state,
      state: nextState,
      cycleProgress: nextState === "stopped" ? 0 : this.state.cycleProgress,
      lastHeartbeatAt: nowIso()
    };

    return {
      ok: true,
      code: "OK",
      message: `Action ${action} accepted`,
      state: this.getSnapshotState()
    };
  }

  createControlEvents(action: ControlAction, ok: boolean, correlationId: string) {
    if (ok) {
      return [
        createEvent(
          "ControlCommandAccepted",
          this.state.activeSymbol,
          `Control action executed: ${action}`,
          "info",
          ["manual_override"],
          correlationId
        ),
        createEvent(
          "BotStateChanged",
          this.state.activeSymbol,
          `Bot state is now ${this.state.state}`,
          "info",
          ["state_change"],
          correlationId
        )
      ];
    }

    return [
      createEvent(
        "ControlCommandRejected",
        this.state.activeSymbol,
        `Control action rejected: ${action}`,
        "warn",
        ["invalid_transition"],
        correlationId
      )
    ];
  }
}
