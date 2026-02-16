import type { BotApiClient } from "./BotApiClient";
import { mockBotApiClient } from "./MockBotApiClient";
import type { ConnectionHealth } from "./BotApiClient";
import type {
  ApiErrorPayload,
  BotEvent,
  ControlAction,
  ControlActionResponse,
  DashboardSnapshot,
  UserRole,
  WsMessage
} from "@tourab/shared";

const ACTION_PATH: Record<ControlAction, string> = {
  start: "/start",
  pause: "/pause",
  resume: "/resume",
  stop: "/stop",
  cancel_all: "/cancel-all",
  emergency_stop: "/emergency-stop"
};

export class LiveBotApiClient implements BotApiClient {
  constructor(
    private readonly baseHttpUrl: string,
    private readonly baseWsUrl: string,
    private readonly allowFallback: boolean
  ) {}

  async getSnapshot(): Promise<DashboardSnapshot> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/snapshot`);
      if (!res.ok) {
        throw new Error(`Snapshot request failed: ${res.status}`);
      }
      return (await res.json()) as DashboardSnapshot;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      return mockBotApiClient.getSnapshot();
    }
  }

  subscribeToEvents(
    onEvent: (event: BotEvent) => void,
    onConnectionHealthChange?: (health: ConnectionHealth) => void
  ): () => void {
    const url = `${this.baseWsUrl}/events?replay=200`;
    let ws: WebSocket | undefined;
    let reconnectRef: ReturnType<typeof setTimeout> | undefined;
    let fallbackUnsubscribe: (() => void) | undefined;
    let closed = false;

    const emitHealth = (health: ConnectionHealth) => {
      onConnectionHealthChange?.(health);
    };

    const ensureFallback = () => {
      if (!this.allowFallback || fallbackUnsubscribe) {
        return;
      }
      fallbackUnsubscribe = mockBotApiClient.subscribeToEvents(onEvent);
    };

    const clearFallback = () => {
      if (!fallbackUnsubscribe) {
        return;
      }
      fallbackUnsubscribe();
      fallbackUnsubscribe = undefined;
    };

    const scheduleReconnect = () => {
      if (closed || reconnectRef) {
        return;
      }
      reconnectRef = setTimeout(() => {
        reconnectRef = undefined;
        connect();
      }, 2000);
    };

    const handleDegraded = () => {
      emitHealth("degraded");
      ensureFallback();
      scheduleReconnect();
    };

    const connect = () => {
      if (closed) {
        return;
      }

      try {
        ws = new WebSocket(url);
      } catch (_error: unknown) {
        handleDegraded();
        return;
      }

      ws.onopen = () => {
        emitHealth("live");
        clearFallback();
      };

      ws.onmessage = (message) => {
        const payload = JSON.parse(String(message.data)) as WsMessage;
        if (payload.kind === "event") {
          onEvent(payload.data);
        }
      };

      ws.onerror = () => {
        if (closed) {
          return;
        }
        handleDegraded();
      };

      ws.onclose = () => {
        if (closed) {
          return;
        }
        handleDegraded();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectRef) {
        clearTimeout(reconnectRef);
        reconnectRef = undefined;
      }
      clearFallback();
      ws?.close();
    };
  }

  async performAction(action: ControlAction, role: UserRole): Promise<ControlActionResponse> {
    try {
      const path = ACTION_PATH[action];
      const res = await fetch(`${this.baseHttpUrl}${path}`, {
        method: "POST",
        headers: {
          "x-tourab-role": role
        }
      });
      if (res.ok) {
        return (await res.json()) as ControlActionResponse;
      }

      const errorPayload = (await res.json()) as ApiErrorPayload;
      const state = (await this.getSnapshot()).state.state;
      return {
        ok: false,
        code: errorPayload.code ?? "REQUEST_FAILED",
        message: errorPayload.message ?? "Control request failed",
        state
      };
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      return mockBotApiClient.performAction(action, role);
    }
  }
}

export function createDefaultBotApiClient(): BotApiClient {
  if (import.meta.env.VITE_TOURAB_USE_MOCK === "1") {
    return mockBotApiClient;
  }

  const httpBase = import.meta.env.VITE_TOURAB_API_BASE ?? "http://localhost:7071";
  const wsBase = import.meta.env.VITE_TOURAB_WS_BASE ?? "ws://localhost:7071";
  const allowFallback = import.meta.env.VITE_TOURAB_API_FALLBACK !== "0";
  return new LiveBotApiClient(httpBase, wsBase, allowFallback);
}
