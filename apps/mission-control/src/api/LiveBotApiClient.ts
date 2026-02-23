import type { BotApiClient } from "./BotApiClient";
import { mockBotApiClient } from "./MockBotApiClient";
import type { ClientDataSource, ConnectionHealth } from "./BotApiClient";
import type {
  AlertItem,
  ApprovalRequest,
  ApiErrorPayload,
  BotEvent,
  ControlAction,
  ControlActionResponse,
  DashboardSnapshot,
  IncidentItem,
  UserRole,
  WsMessage
} from "@tourab/shared";
import type {
  AutoExitConfig,
  EntryAutonomyConfig,
  EntryAutonomyStatus,
  LearningEvaluationSummary,
  LearningAlertConfig,
  LearningIncidentExportReport,
  LearningEvaluationTrendSummary,
  ManagedTradeItem,
  Milestone5EvidenceSummary,
  StrategyDegradationConfig,
  StrategyPromotionStage,
  StrategyPromotionState
} from "../types";

const ACTION_PATH: Record<ControlAction, string> = {
  start: "/start",
  pause: "/pause",
  resume: "/resume",
  stop: "/stop",
  cancel_all: "/cancel-all",
  emergency_stop: "/emergency-stop",
  demo_order_submit: "/demo-order-submit"
};

export class LiveBotApiClient implements BotApiClient {
  private authToken: string | undefined;
  private dataSource: ClientDataSource = "live";
  private readonly dataSourceListeners = new Set<(source: ClientDataSource) => void>();

  constructor(
    private readonly baseHttpUrl: string,
    private readonly baseWsUrl: string,
    private readonly allowFallback: boolean
  ) {}

  setAuthToken(token: string | undefined): void {
    this.authToken = token;
  }

  getDataSource(): ClientDataSource {
    return this.dataSource;
  }

  onDataSourceChange(listener: (source: ClientDataSource) => void): () => void {
    this.dataSourceListeners.add(listener);
    listener(this.dataSource);
    return () => {
      this.dataSourceListeners.delete(listener);
    };
  }

  private setDataSource(next: ClientDataSource): void {
    if (this.dataSource === next) {
      return;
    }
    this.dataSource = next;
    for (const listener of this.dataSourceListeners) {
      listener(next);
    }
  }

  async getSnapshot(): Promise<DashboardSnapshot> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/snapshot`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Snapshot request failed: ${res.status}`);
      }
      this.setDataSource("live");
      return (await res.json()) as DashboardSnapshot;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.getSnapshot();
    }
  }

  subscribeToEvents(
    onEvent: (event: BotEvent) => void,
    onConnectionHealthChange?: (health: ConnectionHealth) => void,
    onDataSourceChange?: (source: ClientDataSource) => void
  ): () => void {
    const tokenSuffix = this.authToken ? `&token=${encodeURIComponent(this.authToken)}` : "";
    const url = `${this.baseWsUrl}/events?replay=200${tokenSuffix}`;
    let ws: WebSocket | undefined;
    let reconnectRef: ReturnType<typeof setTimeout> | undefined;
    let fallbackUnsubscribe: (() => void) | undefined;
    let closed = false;

    const emitHealth = (health: ConnectionHealth) => {
      onConnectionHealthChange?.(health);
    };
    const emitSource = (source: ClientDataSource) => {
      this.setDataSource(source);
      onDataSourceChange?.(source);
    };

    const ensureFallback = () => {
      if (!this.allowFallback || fallbackUnsubscribe) {
        return;
      }
      emitSource("mock_fallback");
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
        emitSource("live");
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

  async performAction(action: ControlAction, role: UserRole, userId: string, approvalId?: string): Promise<ControlActionResponse> {
    try {
      const path = ACTION_PATH[action];
      const res = await fetch(`${this.baseHttpUrl}${path}`, {
        method: "POST",
        headers: {
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
          ...(approvalId ? { "x-approval-id": approvalId } : {})
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
        state,
        details: errorPayload.details
      };
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.performAction(action, role, userId, approvalId);
    }
  }

  async listApprovals(status?: "pending" | "approved" | "rejected" | "expired"): Promise<ApprovalRequest[]> {
    try {
      const query = status ? `?status=${status}` : "";
      const res = await fetch(`${this.baseHttpUrl}/approvals${query}`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Approval list failed: ${res.status}`);
      }
      const payload = (await res.json()) as { items: ApprovalRequest[] };
      return payload.items;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.listApprovals(status);
    }
  }

  async approveApproval(id: string, userId: string): Promise<ApprovalRequest> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/approvals/${id}/approve`, {
        method: "POST",
        headers: {
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Approval update failed: ${res.status}`);
      }
      return (await res.json()) as ApprovalRequest;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.approveApproval(id, userId);
    }
  }

  async rejectApproval(id: string, userId: string, reason?: string): Promise<ApprovalRequest> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/approvals/${id}/reject`, {
        method: "POST",
        headers: {
          "x-user-id": userId,
          "Content-Type": "application/json",
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        },
        body: JSON.stringify(reason ? { reason } : {})
      });
      if (!res.ok) {
        throw new Error(`Approval reject failed: ${res.status}`);
      }
      return (await res.json()) as ApprovalRequest;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.rejectApproval(id, userId, reason);
    }
  }

  async listAlerts(status?: "open" | "acknowledged" | "resolved"): Promise<AlertItem[]> {
    try {
      const query = status ? `?status=${status}` : "";
      const res = await fetch(`${this.baseHttpUrl}/alerts${query}`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Alert list failed: ${res.status}`);
      }
      const payload = (await res.json()) as { items: AlertItem[] };
      return payload.items;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.listAlerts(status);
    }
  }

  async acknowledgeAlert(id: string, role: UserRole, userId: string): Promise<AlertItem> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/alerts/${id}/ack`, {
        method: "POST",
        headers: {
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Alert acknowledge failed: ${res.status}`);
      }
      return (await res.json()) as AlertItem;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.acknowledgeAlert(id, role, userId);
    }
  }

  async resolveAlert(id: string, role: UserRole, userId: string): Promise<AlertItem> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/alerts/${id}/resolve`, {
        method: "POST",
        headers: {
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Alert resolve failed: ${res.status}`);
      }
      return (await res.json()) as AlertItem;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.resolveAlert(id, role, userId);
    }
  }

  async updateReconciliation(
    role: UserRole,
    userId: string,
    input: Partial<Pick<DashboardSnapshot["reconciliation"], "positions" | "pnl" | "orders">>
  ): Promise<DashboardSnapshot["reconciliation"]> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/reconciliation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        },
        body: JSON.stringify(input)
      });
      if (!res.ok) {
        throw new Error(`Reconciliation update failed: ${res.status}`);
      }
      const payload = (await res.json()) as { reconciliation: DashboardSnapshot["reconciliation"] };
      return payload.reconciliation;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.updateReconciliation(role, userId, input);
    }
  }

  async listIncidents(status?: "open" | "acknowledged" | "resolved"): Promise<IncidentItem[]> {
    try {
      const query = status ? `?status=${status}` : "";
      const res = await fetch(`${this.baseHttpUrl}/incidents${query}`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Incident list failed: ${res.status}`);
      }
      const payload = (await res.json()) as { items: IncidentItem[] };
      return payload.items;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.listIncidents(status);
    }
  }

  async acknowledgeIncident(id: string, role: UserRole, userId: string): Promise<IncidentItem> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/incidents/${id}/ack`, {
        method: "POST",
        headers: {
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Incident acknowledge failed: ${res.status}`);
      }
      return (await res.json()) as IncidentItem;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.acknowledgeIncident(id, role, userId);
    }
  }

  async resolveIncident(id: string, role: UserRole, userId: string): Promise<IncidentItem> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/incidents/${id}/resolve`, {
        method: "POST",
        headers: {
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Incident resolve failed: ${res.status}`);
      }
      return (await res.json()) as IncidentItem;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.resolveIncident(id, role, userId);
    }
  }

  async clearEventStreamsAndLogs(role: UserRole, userId: string): Promise<ControlActionResponse> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/maintenance/clear-streams`, {
        method: "POST",
        headers: {
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
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
        message: errorPayload.message ?? "Clear streams request failed",
        state,
        details: errorPayload.details
      };
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.clearEventStreamsAndLogs(role, userId);
    }
  }

  async getAutoExitConfig(): Promise<AutoExitConfig> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/auto-exit/config`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Auto-exit config fetch failed: ${res.status}`);
      }
      const payload = (await res.json()) as { config: AutoExitConfig };
      return payload.config;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.getAutoExitConfig();
    }
  }

  async updateAutoExitConfig(role: UserRole, userId: string, input: Partial<AutoExitConfig>): Promise<AutoExitConfig> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/auto-exit/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        },
        body: JSON.stringify(input)
      });
      if (!res.ok) {
        throw new Error(`Auto-exit config update failed: ${res.status}`);
      }
      const payload = (await res.json()) as { config: AutoExitConfig };
      return payload.config;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.updateAutoExitConfig(role, userId, input);
    }
  }

  async listManagedTrades(): Promise<ManagedTradeItem[]> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/managed-trades`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Managed trades fetch failed: ${res.status}`);
      }
      const payload = (await res.json()) as { items: ManagedTradeItem[] };
      return payload.items;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.listManagedTrades();
    }
  }

  async getMilestone5Evidence(): Promise<Milestone5EvidenceSummary> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/milestone5/evidence`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Milestone5 evidence fetch failed: ${res.status}`);
      }
      return (await res.json()) as Milestone5EvidenceSummary;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.getMilestone5Evidence();
    }
  }

  async getLearningEvaluation(lookbackDays = 30, limit = 2000): Promise<LearningEvaluationSummary> {
    try {
      const query = `?lookbackDays=${Math.max(1, Math.floor(lookbackDays))}&limit=${Math.max(1, Math.floor(limit))}`;
      const res = await fetch(`${this.baseHttpUrl}/learning/evaluation${query}`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Learning evaluation fetch failed: ${res.status}`);
      }
      return (await res.json()) as LearningEvaluationSummary;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.getLearningEvaluation(lookbackDays, limit);
    }
  }

  async getLearningEvaluationTrend(lookbackDays = 30, bucketDays = 1, limit = 2000): Promise<LearningEvaluationTrendSummary> {
    try {
      const query = `?lookbackDays=${Math.max(1, Math.floor(lookbackDays))}&bucketDays=${Math.max(1, Math.floor(bucketDays))}&limit=${Math.max(1, Math.floor(limit))}`;
      const res = await fetch(`${this.baseHttpUrl}/learning/evaluation-trend${query}`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Learning evaluation trend fetch failed: ${res.status}`);
      }
      return (await res.json()) as LearningEvaluationTrendSummary;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.getLearningEvaluationTrend(lookbackDays, bucketDays, limit);
    }
  }

  async getLearningIncidentReport(
    lookbackDays = 30,
    status?: "open" | "acknowledged" | "resolved"
  ): Promise<LearningIncidentExportReport> {
    try {
      const params = new URLSearchParams();
      params.set("lookbackDays", String(Math.max(1, Math.floor(lookbackDays))));
      if (status) {
        params.set("status", status);
      }
      const query = `?${params.toString()}`;
      const res = await fetch(`${this.baseHttpUrl}/learning/incidents/export${query}`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Learning incident report fetch failed: ${res.status}`);
      }
      return (await res.json()) as LearningIncidentExportReport;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.getLearningIncidentReport(lookbackDays, status);
    }
  }

  async getLearningAlertConfig(): Promise<LearningAlertConfig> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/learning/alert-config`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Learning alert config fetch failed: ${res.status}`);
      }
      const payload = (await res.json()) as { config: LearningAlertConfig };
      return payload.config;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.getLearningAlertConfig();
    }
  }

  async updateLearningAlertConfig(
    role: UserRole,
    userId: string,
    input: Partial<LearningAlertConfig>
  ): Promise<LearningAlertConfig> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/learning/alert-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        },
        body: JSON.stringify(input)
      });
      if (!res.ok) {
        throw new Error(`Learning alert config update failed: ${res.status}`);
      }
      const payload = (await res.json()) as { config: LearningAlertConfig };
      return payload.config;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.updateLearningAlertConfig(role, userId, input);
    }
  }

  async getEntryAutonomyConfig(): Promise<{ config: EntryAutonomyConfig; status: EntryAutonomyStatus }> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/entry-autonomy/config`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Entry autonomy config fetch failed: ${res.status}`);
      }
      return (await res.json()) as { config: EntryAutonomyConfig; status: EntryAutonomyStatus };
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.getEntryAutonomyConfig();
    }
  }

  async updateEntryAutonomyConfig(
    role: UserRole,
    userId: string,
    input: Partial<EntryAutonomyConfig>
  ): Promise<{ config: EntryAutonomyConfig; status: EntryAutonomyStatus }> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/entry-autonomy/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        },
        body: JSON.stringify(input)
      });
      if (!res.ok) {
        throw new Error(`Entry autonomy config update failed: ${res.status}`);
      }
      return (await res.json()) as { config: EntryAutonomyConfig; status: EntryAutonomyStatus };
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.updateEntryAutonomyConfig(role, userId, input);
    }
  }

  async getStrategyPromotion(): Promise<{ state: StrategyPromotionState }> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/strategy/promotion`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Strategy promotion fetch failed: ${res.status}`);
      }
      return (await res.json()) as { state: StrategyPromotionState };
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.getStrategyPromotion();
    }
  }

  async registerStrategyVersion(
    role: UserRole,
    userId: string,
    input: {
      version: string;
      notes?: string;
      challenger?: boolean;
      artifacts?: { researchReportUrl?: string; shadowReportUrl?: string; canaryReportUrl?: string };
    }
  ): Promise<{ state: StrategyPromotionState }> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/strategy/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        },
        body: JSON.stringify(input)
      });
      if (!res.ok) {
        throw new Error(`Strategy register failed: ${res.status}`);
      }
      return (await res.json()) as { state: StrategyPromotionState };
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.registerStrategyVersion(role, userId, input);
    }
  }

  async promoteStrategyVersion(
    role: UserRole,
    userId: string,
    input: {
      version: string;
      targetStage: StrategyPromotionStage;
      reason?: string;
      artifacts?: { researchReportUrl?: string; shadowReportUrl?: string; canaryReportUrl?: string };
    }
  ): Promise<{ state: StrategyPromotionState }> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/strategy/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        },
        body: JSON.stringify(input)
      });
      if (!res.ok) {
        throw new Error(`Strategy promote failed: ${res.status}`);
      }
      return (await res.json()) as { state: StrategyPromotionState };
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.promoteStrategyVersion(role, userId, input);
    }
  }

  async rollbackStrategy(role: UserRole, userId: string, reason?: string): Promise<{ state: StrategyPromotionState }> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/strategy/rollback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        },
        body: JSON.stringify(reason ? { reason } : {})
      });
      if (!res.ok) {
        throw new Error(`Strategy rollback failed: ${res.status}`);
      }
      return (await res.json()) as { state: StrategyPromotionState };
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.rollbackStrategy(role, userId, reason);
    }
  }

  async getStrategyDegradationConfig(): Promise<StrategyDegradationConfig> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/strategy/degradation-config`, {
        headers: {
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error(`Strategy degradation config fetch failed: ${res.status}`);
      }
      const payload = (await res.json()) as { config: StrategyDegradationConfig };
      return payload.config;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.getStrategyDegradationConfig();
    }
  }

  async updateStrategyDegradationConfig(
    role: UserRole,
    userId: string,
    input: Partial<StrategyDegradationConfig>
  ): Promise<StrategyDegradationConfig> {
    try {
      const res = await fetch(`${this.baseHttpUrl}/strategy/degradation-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tourab-role": role,
          "x-user-id": userId,
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        },
        body: JSON.stringify(input)
      });
      if (!res.ok) {
        throw new Error(`Strategy degradation config update failed: ${res.status}`);
      }
      const payload = (await res.json()) as { config: StrategyDegradationConfig };
      return payload.config;
    } catch (error: unknown) {
      if (!this.allowFallback) {
        throw error;
      }
      this.setDataSource("mock_fallback");
      return mockBotApiClient.updateStrategyDegradationConfig(role, userId, input);
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
