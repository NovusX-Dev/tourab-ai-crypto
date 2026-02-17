import { createServer } from "node:http";
import type { IncomingMessage, Server } from "node:http";
import process from "node:process";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import express, { type Request, type Response } from "express";
import { WebSocketServer, type WebSocket } from "ws";
import type {
  AlertItem,
  AuditItem,
  ApprovalRequest,
  ApiErrorPayload,
  BotEvent,
  ControlAction,
  ControlActionResponse,
  DashboardSnapshot,
  ExchangeMode,
  ExchangeStatus,
  EventQuery,
  IncidentItem,
  OpenOrdersStatus,
  OpsMetrics,
  PortfolioStatus,
  ReconciliationStatus,
  UserRole,
  WsMessage
} from "@tourab/shared";
import { loadOkxDemoConfigFromEnv, OkxDemoAdapter } from "@tourab/okx-demo-adapter";
import { authRoleMiddleware, type AuthenticatedRequest } from "./mission-control/auth.js";
import { ApprovalStore } from "./mission-control/approval-store.js";
import { EventBus } from "./mission-control/event-bus.js";
import { createEvent } from "./mission-control/event-factory.js";
import { JsonlAlertStore } from "./mission-control/jsonl-alert-store.js";
import { canRoleExecuteAction } from "./mission-control/policy.js";
import { controlRateLimiter } from "./mission-control/rate-limit.js";
import { RuntimeLifecycleManager } from "./mission-control/runtime-lifecycle-manager.js";
import { SqliteEventStore } from "./mission-control/sqlite-event-store.js";
import { SqliteOpsStore } from "./mission-control/sqlite-ops-store.js";
import { generateRuntimeEvent } from "./mission-control/runtime-events.js";
import { RuntimeWorkerManager } from "./mission-control/worker-manager.js";
import { createSignedAccessToken, verifySignedAccessToken } from "./mission-control/auth.js";

const DEFAULT_PORT = Number(process.env.TOURAB_MISSION_CONTROL_PORT ?? "7071");
const DEFAULT_EVENT_STORE_PATH = process.env.TOURAB_EVENT_STORE_PATH ?? "logs/mission-events.sqlite";
const DEFAULT_ALERT_STORE_PATH = process.env.TOURAB_ALERT_STORE_PATH ?? "logs/mission-alerts.jsonl";
const DEFAULT_OPS_STORE_PATH = process.env.TOURAB_OPS_STORE_PATH ?? "logs/mission-ops.sqlite";
const REPLAY_DEFAULT = 200;
const DEFAULT_DRIFT_CIRCUIT_ACTION = (process.env.TOURAB_DRIFT_CIRCUIT_ACTION ?? "pause") as "pause" | "stop";

function parseBoundedInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.floor(value);
  return Math.max(min, Math.min(max, rounded));
}

export interface MissionControlServerOptions {
  port?: number;
  eventStorePath?: string;
  alertStorePath?: string;
  opsStorePath?: string;
  replayDefault?: number;
  logRequests?: boolean;
  approvalTtlMs?: number;
}

export interface MissionControlServerHandle {
  port: number;
  baseHttpUrl: string;
  baseWsUrl: string;
  close: () => Promise<void>;
  server: Server;
}

function controlActionFromPath(path: string): ControlAction | undefined {
  if (path === "/start") return "start";
  if (path === "/pause") return "pause";
  if (path === "/resume") return "resume";
  if (path === "/stop") return "stop";
  if (path === "/cancel-all") return "cancel_all";
  if (path === "/emergency-stop") return "emergency_stop";
  return undefined;
}

function parseEventQuery(req: Request): EventQuery {
  const query = req.query as Record<string, string | undefined>;
  return {
    limit: query.limit ? Number(query.limit) : undefined,
    cursor: query.cursor,
    type: query.type as EventQuery["type"],
    symbol: query.symbol,
    severity: query.severity as EventQuery["severity"]
  };
}

function writeError(res: Response, status: number, payload: ApiErrorPayload): void {
  res.status(status).json(payload);
}

function resolveExchangeMode(raw: string | undefined): ExchangeMode {
  if (raw === "demo") {
    return "demo";
  }
  if (raw === "live") {
    return "live";
  }
  return "unknown";
}

function hasReconciliationDrift(state: ReconciliationStatus): boolean {
  return state.orders === "drift" || state.positions === "drift" || state.pnl === "drift" || state.orders === "error" || state.positions === "error" || state.pnl === "error";
}

function isWsAuthorized(req: IncomingMessage): boolean {
  const requireSigned = process.env.TOURAB_REQUIRE_SIGNED_AUTH === "1";
  if (!requireSigned) {
    return true;
  }
  const secret = process.env.TOURAB_AUTH_SECRET;
  if (!secret) {
    return false;
  }
  const authHeader = req.headers["authorization"];
  const headerToken =
    typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : undefined;
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const queryToken = url.searchParams.get("token") ?? undefined;
  const token = headerToken ?? queryToken;
  if (!token) {
    return false;
  }
  return Boolean(verifySignedAccessToken(token, secret));
}

function incidentTemplateFromAlert(alert: AlertItem): Pick<IncidentItem, "taxonomy" | "severity" | "runbookRef"> {
  if (alert.code === "RECONCILIATION_DRIFT_CIRCUIT") {
    return {
      taxonomy: "reconciliation_drift",
      severity: "sev1",
      runbookRef: "docs/runbooks/reconciliation-drift-circuit.md"
    };
  }
  if (alert.code.startsWith("STALE_")) {
    return {
      taxonomy: "freshness_guard",
      severity: "sev2",
      runbookRef: "docs/runbooks/freshness-guard.md"
    };
  }
  if (alert.code.startsWith("APPROVAL_")) {
    return {
      taxonomy: "approval_governance",
      severity: "sev2",
      runbookRef: "docs/runbooks/approval-governance.md"
    };
  }
  if (alert.code === "RUNTIME_ERROR_EVENT") {
    return {
      taxonomy: "exchange_reliability",
      severity: "sev2",
      runbookRef: "docs/runbooks/exchange-reliability.md"
    };
  }
  return {
    taxonomy: "control_plane",
    severity: alert.severity === "critical" ? "sev1" : "sev3",
    runbookRef: "docs/runbooks/control-plane-incident.md"
  };
}

export async function startMissionControlServer(
  options: MissionControlServerOptions = {}
): Promise<MissionControlServerHandle> {
  const app = express();
  const httpServer = createServer(app);
  const wsServer = new WebSocketServer({ noServer: true });

  const port = options.port ?? DEFAULT_PORT;
  const eventStorePath = options.eventStorePath ?? DEFAULT_EVENT_STORE_PATH;
  const alertStorePath = options.alertStorePath ?? DEFAULT_ALERT_STORE_PATH;
  const opsStorePath = options.opsStorePath ?? (process.env.TOURAB_OPS_STORE_PATH ?? join(dirname(eventStorePath), "mission-ops.sqlite"));
  const replayDefault = options.replayDefault ?? REPLAY_DEFAULT;
  const logRequests = options.logRequests ?? true;
  const approvalTtlMs = options.approvalTtlMs ?? Number(process.env.TOURAB_APPROVAL_TTL_MS ?? 5 * 60_000);
  const driftCircuitAction = DEFAULT_DRIFT_CIRCUIT_ACTION;
  const driftMinConsecutive = parseBoundedInt(process.env.TOURAB_DRIFT_CIRCUIT_MIN_CONSECUTIVE, 2, 1, 20);
  const driftMaxGraceMs = parseBoundedInt(process.env.TOURAB_DRIFT_CIRCUIT_MAX_GRACE_MS, 90_000, 1_000, 86_400_000);

  const eventStore = await SqliteEventStore.open(eventStorePath);
  const alertStore = new JsonlAlertStore(alertStorePath);
  const opsStore = await SqliteOpsStore.open(opsStorePath);
  const bus = new EventBus();
  const lifecycle = new RuntimeLifecycleManager();
  const approvals = new ApprovalStore(approvalTtlMs);
  let exchangeStatus: ExchangeStatus = {
    connected: false,
    mode: resolveExchangeMode(process.env.OKX_TRADING_MODE),
    source: "none",
    lastHealthCheckAt: new Date(0).toISOString(),
    lastError: "Exchange health not checked yet."
  };
  let portfolioStatus: PortfolioStatus = {
    totalEq: "0",
    balances: [],
    lastUpdatedAt: new Date(0).toISOString(),
    lastError: "Portfolio health not checked yet."
  };
  let openOrdersStatus: OpenOrdersStatus = {
    orders: [],
    lastUpdatedAt: new Date(0).toISOString(),
    lastError: "Open orders health not checked yet."
  };

  let eventCounter = 0;
  let inMemoryEvents = await eventStore.readAll();
  let inMemoryAlerts = await alertStore.readAll();
  let inMemoryIncidents = opsStore.listIncidents();
  const persistedAudit = opsStore.listAudit(300);
  if (persistedAudit.length > 0) {
    lifecycle.audit.length = 0;
    lifecycle.audit.push(...persistedAudit);
  }
  const persistedState = opsStore.loadBotState();
  if (persistedState) {
    lifecycle.patchState(persistedState);
  }
  const persistedRecon = opsStore.loadReconciliation();
  if (persistedRecon) {
    lifecycle.updateReconciliation(persistedRecon);
  }

  const metrics: OpsMetrics = {
    controlRequestsTotal: 0,
    controlFailuresTotal: 0,
    wsConnectionsTotal: 0,
    wsDisconnectsTotal: 0,
    gatekeeperRejectsTotal: 0,
    driftEventsTotal: 0,
    heartbeatGapEventsTotal: 0,
    lastHeartbeatGapMs: 0,
    openAlerts: inMemoryAlerts.filter((item) => item.status === "open").length,
    openIncidents: inMemoryIncidents.filter((item) => item.status !== "resolved").length,
    reconcileRunsTotal: 0
  };
  let driftConsecutive = 0;
  let driftFirstSeenAtEpoch: number | undefined;
  const worker = new RuntimeWorkerManager(
    {
      onEvent: async (event) => {
        await publish(event);
      },
      onStateUpdate: (next) => {
        const updated = lifecycle.patchState(next);
        opsStore.saveBotState(updated);
      },
      getState: () => lifecycle.getSnapshotState()
    },
    {
      symbolUniverse: (process.env.TOURAB_WORKER_SYMBOLS ?? "BTC-USDT,ETH-USDT,SOL-USDT")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      baseUrl: process.env.OKX_DEMO_BASE_URL ?? "https://www.okx.com",
      intervalMs: parseBoundedInt(process.env.TOURAB_WORKER_INTERVAL_MS, 7_500, 2_000, 120_000),
      maxRiskUsd: Number(process.env.TOURAB_WORKER_MAX_RISK_USD ?? "0.2"),
      maxNotionalUsd: Number(process.env.TOURAB_WORKER_MAX_NOTIONAL_USD ?? "10"),
      entryOffsetBps: Number(process.env.TOURAB_WORKER_ENTRY_OFFSET_BPS ?? "20"),
      stopDistanceBps: Number(process.env.TOURAB_WORKER_STOP_DISTANCE_BPS ?? "150"),
      retryMaxAttempts: parseBoundedInt(process.env.TOURAB_WORKER_RETRY_MAX_ATTEMPTS, 3, 1, 10),
      retryBudgetPerHour: parseBoundedInt(process.env.TOURAB_WORKER_RETRY_BUDGET_PER_HOUR, 30, 1, 1000)
    }
  );

  async function refreshExchangeStatus(): Promise<void> {
    const now = new Date().toISOString();
    const mode = resolveExchangeMode(process.env.OKX_TRADING_MODE);
    if (mode !== "demo") {
      exchangeStatus = {
        connected: false,
        mode,
        source: "none",
        lastHealthCheckAt: now,
        lastError:
          mode === "live"
            ? "Live mode connectivity checks are not wired in Mission Control yet."
            : "Set OKX_TRADING_MODE=demo to enable Mission Control demo exchange checks."
      };
      portfolioStatus = {
        totalEq: "0",
        balances: [],
        lastUpdatedAt: now,
        lastError: exchangeStatus.lastError
      };
      openOrdersStatus = {
        orders: [],
        lastUpdatedAt: now,
        lastError: exchangeStatus.lastError
      };
      return;
    }
    try {
      const adapter = new OkxDemoAdapter(loadOkxDemoConfigFromEnv(process.env));
      const [balance, pendingOrders] = await Promise.all([
        adapter.getAccountBalance(),
        adapter.getPendingOrders()
      ]);
      exchangeStatus = {
        connected: true,
        mode,
        source: "okx_demo",
        lastHealthCheckAt: now
      };
      portfolioStatus = {
        totalEq: balance.totalEq,
        balances: balance.details.map((item) => ({
          ccy: item.ccy,
          availBal: item.availBal,
          cashBal: item.cashBal,
          eq: item.eq
        })),
        lastUpdatedAt: now
      };
      openOrdersStatus = {
        orders: pendingOrders.map((item) => ({
          ordId: item.ordId,
          clOrdId: item.clOrdId,
          instId: item.instId,
          side: item.side,
          px: item.px,
          sz: item.sz,
          accFillSz: item.accFillSz,
          state: item.state,
          cTime: item.cTime,
          uTime: item.uTime
        })),
        lastUpdatedAt: now
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      exchangeStatus = {
        connected: false,
        mode,
        source: "okx_demo",
        lastHealthCheckAt: now,
        lastError: message
      };
      portfolioStatus = {
        totalEq: "0",
        balances: [],
        lastUpdatedAt: now,
        lastError: message
      };
      openOrdersStatus = {
        orders: [],
        lastUpdatedAt: now,
        lastError: message
      };
    }
  }
  await refreshExchangeStatus();

  async function enforceDriftCircuitBreaker(actor = "system"): Promise<void> {
    const reconciliation = lifecycle.reconciliation;
    if (!hasReconciliationDrift(reconciliation)) {
      return;
    }
    const state = lifecycle.getSnapshotState();
    if (state.state !== "running") {
      return;
    }
    const nowEpoch = Date.now();
    const graceElapsed = driftFirstSeenAtEpoch ? nowEpoch - driftFirstSeenAtEpoch >= driftMaxGraceMs : false;
    if (driftConsecutive < driftMinConsecutive && !graceElapsed) {
      return;
    }
    const result = lifecycle.applyAction(driftCircuitAction);
    if (!result.ok) {
      return;
    }
    const symbol = state.activeSymbol;
    await upsertAlert({
      code: "RECONCILIATION_DRIFT_CIRCUIT",
      severity: "critical",
      source: "system",
      title: "Drift circuit breaker triggered",
      detail: `Auto-${driftCircuitAction} due to reconciliation drift/error.`,
      symbol
    });
    await appendAudit(
      "Circuit breaker triggered",
      `Auto-${driftCircuitAction} triggered by reconciliation drift; actor=${actor}`,
      symbol,
      "ControlCommandRejected"
    );
    await publish(
      createEvent(
        "ControlCommandRejected",
        symbol,
        `Circuit breaker auto-${driftCircuitAction} due to reconciliation drift/error`,
        "error",
        ["circuit_breaker", "reconciliation_drift"]
      )
    );
    await publish(
      createEvent(
        "BotStateChanged",
        symbol,
        `Bot state is now ${result.state.state} (circuit breaker)`,
        "warn",
        ["circuit_breaker", "state_change"]
      )
    );
    driftConsecutive = 0;
    driftFirstSeenAtEpoch = undefined;
  }

  async function appendAudit(title: string, detail: string, symbol: string, relatedEventType?: AuditItem["relatedEventType"]): Promise<void> {
    const item: AuditItem = {
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: new Date().toISOString(),
      title,
      detail,
      symbol,
      relatedEventType
    };
    lifecycle.audit.unshift(item);
    opsStore.appendAudit(item);
    if (lifecycle.audit.length > 300) {
      lifecycle.audit.length = 300;
    }
  }

  async function sweepExpiredApprovals(): Promise<void> {
    const expired = approvals.expirePending();
    for (const item of expired) {
      const symbol = lifecycle.getSnapshotState().activeSymbol;
      await appendAudit(
        "Approval expired",
        `Approval ${item.id} expired for ${item.action}; actor=system requester=${item.requestedBy}`,
        symbol,
        "System"
      );
      await publish(
        createEvent(
          "System",
          symbol,
          `Approval expired: ${item.id} (${item.action}) actor=system requester=${item.requestedBy}`,
          "warn",
          ["approval_expired"]
        )
      );
    }
  }

  async function publish(event: BotEvent): Promise<void> {
    inMemoryEvents = [event, ...inMemoryEvents].slice(0, 500);
    bus.publish(event);
    await eventStore.append(event);
    if (event.tags?.includes("gatekeeper_reject")) {
      metrics.gatekeeperRejectsTotal += 1;
    }
    if (event.tags?.includes("reconciliation_drift")) {
      metrics.driftEventsTotal += 1;
    }
    if (event.severity === "error" || event.type === "Error") {
      await upsertAlert({
        code: "RUNTIME_ERROR_EVENT",
        severity: "error",
        source: "system",
        title: "Runtime error event",
        detail: event.message,
        symbol: event.symbol
      });
    }
  }

  async function upsertAlert(input: {
    code: string;
    severity: AlertItem["severity"];
    source: AlertItem["source"];
    title: string;
    detail: string;
    symbol?: string;
  }): Promise<AlertItem> {
    const existing = await alertStore.findByFingerprint(input.code, input.symbol);
    const now = new Date().toISOString();
    const next: AlertItem = existing
      ? {
          ...existing,
          severity: input.severity,
          source: input.source,
          title: input.title,
          detail: input.detail,
          status: "open",
          lastSeenAt: now,
          count: existing.count + 1
        }
      : {
          id: `alert-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          code: input.code,
          severity: input.severity,
          source: input.source,
          title: input.title,
          detail: input.detail,
          symbol: input.symbol,
          status: "open",
          firstSeenAt: now,
          lastSeenAt: now,
          count: 1
        };
    const saved = await alertStore.upsert(next);
    inMemoryAlerts = await alertStore.readAll();
    metrics.openAlerts = inMemoryAlerts.filter((item) => item.status === "open").length;
    if (saved.severity === "critical" || saved.code.startsWith("APPROVAL_") || saved.code.startsWith("STALE_")) {
      const existingIncident = opsStore.findOpenIncidentByAlert(saved.code, saved.symbol);
      if (!existingIncident) {
        const template = incidentTemplateFromAlert(saved);
        opsStore.createIncident({
          id: `incident-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          severity: template.severity,
          taxonomy: template.taxonomy,
          title: saved.title,
          detail: saved.detail,
          runbookRef: template.runbookRef,
          symbol: saved.symbol,
          sourceAlertCode: saved.code
        });
      }
      inMemoryIncidents = opsStore.listIncidents();
      metrics.openIncidents = inMemoryIncidents.filter((item) => item.status !== "resolved").length;
    }
    return saved;
  }

  if (inMemoryEvents.length === 0) {
    await publish(createEvent("System", "BTC-USDT", "Mission control backend initialized", "info", ["bootstrap"]));
  }

  lifecycle.startTick((message) => {
    const state = lifecycle.getSnapshotState();
    const event = generateRuntimeEvent(eventCounter, state.activeSymbol);
    eventCounter += 1;
    void publish({ ...event, message });
  });

  const reconcileIntervalMs = parseBoundedInt(process.env.TOURAB_RECONCILE_INTERVAL_MS, 20_000, 5_000, 120_000);
  const heartbeatGapMs = parseBoundedInt(process.env.TOURAB_HEARTBEAT_GAP_MS, 30_000, 5_000, 300_000);
  const exchangeHealthIntervalMs = parseBoundedInt(process.env.TOURAB_EXCHANGE_HEALTH_INTERVAL_MS, 15_000, 5_000, 300_000);
  const reconcileTimer = setInterval(() => {
    const state = lifecycle.getSnapshotState();
    const nowIso = new Date().toISOString();
    const hasDrift = inMemoryAlerts.some(
      (item) => item.status === "open" && (item.code === "RECONCILIATION_DRIFT_CIRCUIT" || item.code.includes("DRIFT"))
    );
    lifecycle.updateReconciliation({
      positions: hasDrift ? "drift" : "ok",
      pnl: hasDrift ? "drift" : "ok",
      orders: hasDrift ? "drift" : "ok",
      lastRunAt: nowIso
    });
    opsStore.saveReconciliation(lifecycle.reconciliation);
    metrics.reconcileRunsTotal += 1;
    void publish(
      createEvent(
        "ReconciliationComplete",
        state.activeSymbol,
        `Continuous reconciliation tick: positions=${lifecycle.reconciliation.positions} pnl=${lifecycle.reconciliation.pnl} orders=${lifecycle.reconciliation.orders}`,
        hasDrift ? "warn" : "info",
        [hasDrift ? "reconciliation_drift" : "reconciliation_ok", "continuous_reconcile"]
      )
    );
  }, reconcileIntervalMs);

  const heartbeatTimer = setInterval(() => {
    const state = lifecycle.getSnapshotState();
    const gap = Date.now() - Date.parse(state.lastHeartbeatAt);
    metrics.lastHeartbeatGapMs = Number.isFinite(gap) ? Math.max(0, Math.floor(gap)) : 0;
    if (state.state === "running" && metrics.lastHeartbeatGapMs > heartbeatGapMs) {
      metrics.heartbeatGapEventsTotal += 1;
      void upsertAlert({
        code: "HEARTBEAT_GAP",
        severity: "warn",
        source: "system",
        title: "Heartbeat gap detected",
        detail: `Heartbeat gap ${metrics.lastHeartbeatGapMs}ms exceeded threshold ${heartbeatGapMs}ms`,
        symbol: state.activeSymbol
      });
    }
  }, 5_000);
  const exchangeHealthTimer = setInterval(() => {
    void refreshExchangeStatus();
  }, exchangeHealthIntervalMs);

  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, x-tourab-role, x-correlation-id, x-user-id, x-actor-id, x-approval-id");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(authRoleMiddleware);
  if (logRequests) {
    app.use((req: Request, _res: Response, next) => {
      const typed = req as AuthenticatedRequest;
      process.stdout.write(
        `[mission-control] ${new Date().toISOString()} ${req.method} ${req.path} role=${typed.role} corr=${typed.correlationId}\n`
      );
      next();
    });
  }

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "mission-control",
      state: lifecycle.getSnapshotState().state,
      exchangeConnected: exchangeStatus.connected,
      exchangeMode: exchangeStatus.mode
    });
  });

  app.post("/auth/dev-token", async (req, res) => {
    const secret = process.env.TOURAB_AUTH_SECRET;
    if (!secret) {
      writeError(res, 400, {
        ok: false,
        code: "AUTH_SECRET_MISSING",
        message: "TOURAB_AUTH_SECRET is required to mint dev tokens."
      });
      return;
    }
    const userId = typeof req.body?.userId === "string" ? req.body.userId : "operator-1";
    const role = (req.body?.role === "admin" || req.body?.role === "operator" || req.body?.role === "read_only"
      ? req.body.role
      : "operator") as "admin" | "operator" | "read_only";
    const ttlSec = parseBoundedInt(String(req.body?.ttlSec ?? "3600"), 3600, 60, 86_400);
    const nowSec = Math.floor(Date.now() / 1000);
    const token = createSignedAccessToken(
      {
        sub: userId,
        role,
        iat: nowSec,
        exp: nowSec + ttlSec
      },
      secret
    );
    res.json({ token, userId, role, exp: nowSec + ttlSec });
  });

  app.get("/snapshot", (_req, res) => {
    const snapshot: DashboardSnapshot = {
      state: lifecycle.getSnapshotState(),
      risk: lifecycle.risk,
      reconciliation: lifecycle.reconciliation,
      audit: lifecycle.audit,
      logs: lifecycle.logs,
      alerts: inMemoryAlerts,
      incidents: inMemoryIncidents,
      metrics,
      exchange: exchangeStatus,
      portfolio: portfolioStatus,
      openOrders: openOrdersStatus,
      events: inMemoryEvents.slice(0, 200)
    };
    res.json(snapshot);
  });

  app.get("/metrics", (_req, res) => {
    res.json(metrics);
  });

  app.post("/reconciliation", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }

    const body = req.body as Partial<ReconciliationStatus> | undefined;
    const allowed = new Set(["ok", "drift", "error", "in_progress"]);
    const invalid =
      (body?.positions && !allowed.has(body.positions)) ||
      (body?.pnl && !allowed.has(body.pnl)) ||
      (body?.orders && !allowed.has(body.orders));
    if (invalid) {
      writeError(res, 400, {
        ok: false,
        code: "INVALID_RECONCILIATION_STATUS",
        message: "Invalid reconciliation status payload",
        correlationId: typed.correlationId
      });
      return;
    }

    lifecycle.updateReconciliation({
      positions: body?.positions,
      pnl: body?.pnl,
      orders: body?.orders,
      lastRunAt: new Date().toISOString()
    });
    opsStore.saveReconciliation(lifecycle.reconciliation);
    metrics.reconcileRunsTotal += 1;
    if (hasReconciliationDrift(lifecycle.reconciliation)) {
      driftConsecutive += 1;
      if (!driftFirstSeenAtEpoch) {
        driftFirstSeenAtEpoch = Date.now();
      }
    } else {
      driftConsecutive = 0;
      driftFirstSeenAtEpoch = undefined;
    }

    const symbol = lifecycle.getSnapshotState().activeSymbol;
    await publish(
      createEvent(
        "ReconciliationComplete",
        symbol,
        `Reconciliation updated: positions=${lifecycle.reconciliation.positions} pnl=${lifecycle.reconciliation.pnl} orders=${lifecycle.reconciliation.orders}`,
        hasReconciliationDrift(lifecycle.reconciliation) ? "warn" : "info",
        [hasReconciliationDrift(lifecycle.reconciliation) ? "reconciliation_drift" : "reconciliation_ok"],
        typed.correlationId
      )
    );
    await appendAudit(
      "Reconciliation updated",
      `positions=${lifecycle.reconciliation.positions} pnl=${lifecycle.reconciliation.pnl} orders=${lifecycle.reconciliation.orders} actor=${typed.userId}`,
      symbol,
      "ReconciliationComplete"
    );

    await enforceDriftCircuitBreaker(typed.userId);
    res.json({ ok: true, reconciliation: lifecycle.reconciliation });
  });

  app.get("/alerts", async (req, res) => {
    const statusRaw = String(req.query.status ?? "");
    const status =
      statusRaw === "open" || statusRaw === "acknowledged" || statusRaw === "resolved"
        ? statusRaw
        : undefined;
    const items = await alertStore.list(status);
    inMemoryAlerts = items;
    res.json({ items });
  });

  app.post("/alerts/:id/ack", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const item = await alertStore.updateStatus(req.params.id, "acknowledged", typed.userId);
    if (!item) {
      writeError(res, 404, {
        ok: false,
        code: "ALERT_NOT_FOUND",
        message: `Alert ${req.params.id} not found`,
        correlationId: typed.correlationId
      });
      return;
    }
    inMemoryAlerts = await alertStore.readAll();
    metrics.openAlerts = inMemoryAlerts.filter((entry) => entry.status === "open").length;
    res.json(item);
  });

  app.post("/alerts/:id/resolve", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const item = await alertStore.updateStatus(req.params.id, "resolved", typed.userId);
    if (!item) {
      writeError(res, 404, {
        ok: false,
        code: "ALERT_NOT_FOUND",
        message: `Alert ${req.params.id} not found`,
        correlationId: typed.correlationId
      });
      return;
    }
    inMemoryAlerts = await alertStore.readAll();
    metrics.openAlerts = inMemoryAlerts.filter((entry) => entry.status === "open").length;
    res.json(item);
  });

  app.get("/incidents", async (req, res) => {
    const statusRaw = String(req.query.status ?? "");
    const status =
      statusRaw === "open" || statusRaw === "acknowledged" || statusRaw === "resolved"
        ? statusRaw
        : undefined;
    const items = opsStore.listIncidents(status);
    inMemoryIncidents = items;
    metrics.openIncidents = opsStore.listIncidents().filter((entry) => entry.status !== "resolved").length;
    res.json({ items });
  });

  app.post("/incidents/:id/ack", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const item = opsStore.updateIncidentStatus(req.params.id, "acknowledged", typed.userId);
    if (!item) {
      writeError(res, 404, {
        ok: false,
        code: "INCIDENT_NOT_FOUND",
        message: `Incident ${req.params.id} not found`,
        correlationId: typed.correlationId
      });
      return;
    }
    inMemoryIncidents = opsStore.listIncidents();
    metrics.openIncidents = inMemoryIncidents.filter((entry) => entry.status !== "resolved").length;
    await appendAudit(
      "Incident acknowledged",
      `Incident ${item.id} acknowledged by ${typed.userId}; runbook=${item.runbookRef}`,
      item.symbol ?? lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    res.json(item);
  });

  app.post("/incidents/:id/resolve", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    if (typed.role === "read_only") {
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      return;
    }
    const item = opsStore.updateIncidentStatus(req.params.id, "resolved", typed.userId);
    if (!item) {
      writeError(res, 404, {
        ok: false,
        code: "INCIDENT_NOT_FOUND",
        message: `Incident ${req.params.id} not found`,
        correlationId: typed.correlationId
      });
      return;
    }
    inMemoryIncidents = opsStore.listIncidents();
    metrics.openIncidents = inMemoryIncidents.filter((entry) => entry.status !== "resolved").length;
    await appendAudit(
      "Incident resolved",
      `Incident ${item.id} resolved by ${typed.userId}; runbook=${item.runbookRef}`,
      item.symbol ?? lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    res.json(item);
  });

  app.get("/incidents/export", async (_req, res) => {
    const items = opsStore.listIncidents();
    const body = {
      exportedAt: new Date().toISOString(),
      count: items.length,
      items
    };
    res.json(body);
  });

  app.get("/events", async (req, res) => {
    const query = parseEventQuery(req);
    const events = await eventStore.query(query);
    res.json({ items: events, nextCursor: events.at(-1)?.id ?? null });
  });

  app.get("/approvals", async (req, res) => {
    await sweepExpiredApprovals();
    const statusRaw = String(req.query.status ?? "");
    const status =
      statusRaw === "pending" || statusRaw === "approved" || statusRaw === "rejected" || statusRaw === "expired"
        ? statusRaw
        : undefined;
    const items = approvals.list(status);
    res.json({ items });
  });

  app.post("/approvals", async (req, res) => {
    const typed = req as unknown as AuthenticatedRequest;
    const action = req.body?.action as ControlAction | undefined;
    const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;

    if (!action) {
      writeError(res, 400, {
        ok: false,
        code: "INVALID_APPROVAL_ACTION",
        message: "Approval action is required",
        correlationId: typed.correlationId
      });
      return;
    }

    if (!approvals.isApprovalRequired(action)) {
      writeError(res, 400, {
        ok: false,
        code: "APPROVAL_NOT_REQUIRED",
        message: `Action ${action} does not require approval`,
        correlationId: typed.correlationId
      });
      return;
    }

    const request = approvals.create({
      action,
      requestedBy: typed.userId,
      reason
    });
    const symbol = lifecycle.getSnapshotState().activeSymbol;
    await appendAudit(
      "Approval created",
      `Approval ${request.id} created for ${action} by ${typed.userId}`,
      symbol,
      "System"
    );

    await publish(
      createEvent(
        "System",
        symbol,
        `Approval requested for ${action} (${request.id}) actor=${typed.userId}`,
        "warn",
        ["approval_created"],
        typed.correlationId
      )
    );

    res.status(201).json(request satisfies ApprovalRequest);
  });

  app.post("/approvals/:id/approve", async (req, res) => {
    await sweepExpiredApprovals();
    const typed = req as unknown as AuthenticatedRequest;
    const approvalId = req.params.id;
    const actor = String(req.header("x-actor-id") ?? typed.userId);
    const request = approvals.approve(approvalId, actor);
    if (!request) {
      writeError(res, 404, {
        ok: false,
        code: "APPROVAL_NOT_FOUND",
        message: `Approval ${approvalId} not found`,
        correlationId: typed.correlationId
      });
      return;
    }

    await publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        `Approval ${request.id} updated by ${actor}: ${request.approvalCount}/${request.requiredApprovals}`,
        request.status === "approved" ? "info" : "warn",
        [request.status === "approved" ? "approval_approved" : "approval_progress"],
        typed.correlationId
      )
    );
    await appendAudit(
      request.status === "approved" ? "Approval approved" : "Approval updated",
      `Approval ${request.id} action=${request.action} actor=${actor} ${request.approvalCount}/${request.requiredApprovals}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );

    res.json(request);
  });

  app.post("/approvals/:id/reject", async (req, res) => {
    await sweepExpiredApprovals();
    const typed = req as unknown as AuthenticatedRequest;
    const approvalId = req.params.id;
    const actor = typed.userId;
    const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
    const request = approvals.reject(approvalId, actor, reason);
    if (!request) {
      writeError(res, 404, {
        ok: false,
        code: "APPROVAL_NOT_FOUND",
        message: `Approval ${approvalId} not found`,
        correlationId: typed.correlationId
      });
      return;
    }

    await publish(
      createEvent(
        "System",
        lifecycle.getSnapshotState().activeSymbol,
        `Approval ${request.id} rejected by ${actor}`,
        "warn",
        ["approval_rejected"],
        typed.correlationId
      )
    );
    await appendAudit(
      "Approval rejected",
      `Approval ${request.id} action=${request.action} rejected by ${actor}${reason ? ` reason=${reason}` : ""}`,
      lifecycle.getSnapshotState().activeSymbol,
      "System"
    );
    res.json(request);
  });

  app.post(["/start", "/pause", "/resume", "/stop", "/cancel-all", "/emergency-stop"], controlRateLimiter, async (req, res) => {
    await sweepExpiredApprovals();
    const typed = req as unknown as AuthenticatedRequest;
    metrics.controlRequestsTotal += 1;
    const action = controlActionFromPath(req.path);
    if (!action) {
      writeError(res, 400, {
        ok: false,
        code: "INVALID_ACTION",
        message: `Unknown control action path: ${req.path}`,
        correlationId: typed.correlationId
      });
      metrics.controlFailuresTotal += 1;
      return;
    }

    if (!canRoleExecuteAction(typed.role as UserRole, action)) {
      await upsertAlert({
        code: "UNAUTHORIZED_CONTROL_ATTEMPT",
        severity: "warn",
        source: "control",
        title: "Unauthorized control attempt",
        detail: `Role ${typed.role} attempted ${action}`,
        symbol: lifecycle.getSnapshotState().activeSymbol
      });
      await publish(
        createEvent(
          "ControlCommandRejected",
          lifecycle.getSnapshotState().activeSymbol,
          `Role ${typed.role} is not allowed to run ${action}`,
          "warn",
          ["unauthorized"],
          typed.correlationId
        )
      );
      writeError(res, 403, {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Role is not allowed for this action",
        correlationId: typed.correlationId
      });
      metrics.controlFailuresTotal += 1;
      return;
    }

    const approvalId = req.header("x-approval-id") ?? undefined;
    const approvalCheck = approvals.isActionApproved(action, approvalId);
    if (!approvalCheck.ok) {
      if (approvalCheck.request?.status === "expired") {
        await upsertAlert({
          code: "APPROVAL_EXPIRED",
          severity: "warn",
          source: "control",
          title: "Approval expired",
          detail: `Approval ${approvalCheck.request.id} expired for ${action}`,
          symbol: lifecycle.getSnapshotState().activeSymbol
        });
        await appendAudit(
          "Approval expired",
          `Approval ${approvalCheck.request.id} expired for ${action}; requester=${approvalCheck.request.requestedBy}`,
          lifecycle.getSnapshotState().activeSymbol,
          "System"
        );
        writeError(res, 409, {
          ok: false,
          code: "APPROVAL_EXPIRED",
          message: `Approval expired for action ${action}`,
          correlationId: typed.correlationId,
          details: {
            approvalId: approvalCheck.request.id
          }
        });
        metrics.controlFailuresTotal += 1;
        return;
      }

      if (approvalCheck.request?.status === "rejected") {
        await upsertAlert({
          code: "APPROVAL_REJECTED",
          severity: "warn",
          source: "control",
          title: "Approval rejected",
          detail: `Rejected approval ${approvalCheck.request.id} blocked ${action}`,
          symbol: lifecycle.getSnapshotState().activeSymbol
        });
        await appendAudit(
          "Approval rejected",
          `Rejected approval ${approvalCheck.request.id} blocked ${action}; rejectedBy=${approvalCheck.request.rejectedBy ?? "unknown"}`,
          lifecycle.getSnapshotState().activeSymbol,
          "System"
        );
        writeError(res, 409, {
          ok: false,
          code: "APPROVAL_REJECTED",
          message: `Approval rejected for action ${action}`,
          correlationId: typed.correlationId,
          details: {
            approvalId: approvalCheck.request.id,
            rejectedBy: approvalCheck.request.rejectedBy ?? "unknown"
          }
        });
        metrics.controlFailuresTotal += 1;
        return;
      }

      const request =
        approvalCheck.request ??
        approvals.create({
          action,
          requestedBy: typed.userId
        });
      if (!approvalCheck.request) {
        await appendAudit(
          "Approval created",
          `Approval ${request.id} created for ${action} by ${typed.userId}`,
          lifecycle.getSnapshotState().activeSymbol,
          "System"
        );
      }
      await publish(
        createEvent(
          "ControlCommandRejected",
          lifecycle.getSnapshotState().activeSymbol,
          `Approval required before ${action} (${request.id}) actor=${typed.userId}`,
          "warn",
          ["approval_created"],
          typed.correlationId
        )
      );
      writeError(res, 409, {
        ok: false,
        code: "APPROVAL_REQUIRED",
        message: `Approval required for action ${action}`,
        correlationId: typed.correlationId,
        details: {
          approvalId: request.id,
          requiredApprovals: request.requiredApprovals,
          approvalCount: request.approvalCount
        }
      });
      metrics.controlFailuresTotal += 1;
      return;
    }

    const result = lifecycle.applyAction(action);
    if (result.ok) {
      opsStore.saveBotState(result.state);
    }
    if (result.ok) {
      if (action === "start" || action === "resume") {
        worker.start();
      } else if (action === "pause") {
        worker.pause();
      } else if (action === "stop" || action === "emergency_stop") {
        worker.stop();
      }
    }
    const controlEvents = lifecycle.createControlEvents(action, result.ok, typed.correlationId);
    for (const event of controlEvents) {
      await publish(event);
    }
    if (!result.ok) {
      await upsertAlert({
        code: "INVALID_STATE_TRANSITION",
        severity: "warn",
        source: "control",
        title: "Invalid control transition",
        detail: `Action ${action} rejected in state ${result.state.state}`,
        symbol: lifecycle.getSnapshotState().activeSymbol
      });
      await appendAudit(
        "Invalid state transition",
        `Action ${action} rejected in state ${result.state.state}; actor=${typed.userId}`,
        lifecycle.getSnapshotState().activeSymbol,
        "ControlCommandRejected"
      );
      metrics.controlFailuresTotal += 1;
    }

    const payload: ControlActionResponse = {
      ok: result.ok,
      code: result.code,
      message: result.message,
      state: result.state.state,
      details: approvalId
        ? {
            approvalId
          }
        : undefined
    };
    res.status(result.ok ? 200 : 409).json(payload);
  });

  httpServer.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    if (url.pathname !== "/events") {
      socket.destroy();
      return;
    }
    if (!isWsAuthorized(req)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wsServer.emit("connection", ws, req);
    });
  });

  wsServer.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    metrics.wsConnectionsTotal += 1;
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const replay = Math.min(Number(url.searchParams.get("replay") ?? replayDefault), 500);

    const snapshot: DashboardSnapshot = {
      state: lifecycle.getSnapshotState(),
      risk: lifecycle.risk,
      reconciliation: lifecycle.reconciliation,
      audit: lifecycle.audit,
      logs: lifecycle.logs,
      alerts: inMemoryAlerts,
      incidents: inMemoryIncidents,
      metrics,
      exchange: exchangeStatus,
      portfolio: portfolioStatus,
      openOrders: openOrdersStatus,
      events: inMemoryEvents.slice(0, replay)
    };

    const snapshotMsg: WsMessage = { kind: "snapshot", data: snapshot };
    ws.send(JSON.stringify(snapshotMsg));

    const unsubscribe = bus.subscribe((event) => {
      const msg: WsMessage = { kind: "event", data: event };
      ws.send(JSON.stringify(msg));
    });

    ws.on("close", () => {
      unsubscribe();
      metrics.wsDisconnectsTotal += 1;
    });
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      resolve();
    });
  });

  const address = httpServer.address();
  const boundPort = typeof address === "object" && address ? address.port : port;

  return {
    port: boundPort,
    baseHttpUrl: `http://localhost:${boundPort}`,
    baseWsUrl: `ws://localhost:${boundPort}`,
    server: httpServer,
    close: async () => {
      lifecycle.stopTick();
      worker.stop();
      clearInterval(reconcileTimer);
      clearInterval(heartbeatTimer);
      clearInterval(exchangeHealthTimer);
      wsServer.clients.forEach((client: WebSocket) => {
        client.close();
      });
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      eventStore.close();
      opsStore.close();
    }
  };
}

async function main(): Promise<void> {
  const handle = await startMissionControlServer();
  process.stdout.write(`[mission-control] listening on ${handle.baseHttpUrl}\n`);

  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
