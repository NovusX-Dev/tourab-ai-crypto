import { createServer } from "node:http";
import type { IncomingMessage, Server } from "node:http";
import process from "node:process";
import { pathToFileURL } from "node:url";
import express, { type Request, type Response } from "express";
import { WebSocketServer, type WebSocket } from "ws";
import type {
  AuditItem,
  ApprovalRequest,
  ApiErrorPayload,
  BotEvent,
  ControlAction,
  ControlActionResponse,
  DashboardSnapshot,
  EventQuery,
  UserRole,
  WsMessage
} from "@tourab/shared";
import { authRoleMiddleware, type AuthenticatedRequest } from "./mission-control/auth.js";
import { ApprovalStore } from "./mission-control/approval-store.js";
import { EventBus } from "./mission-control/event-bus.js";
import { createEvent } from "./mission-control/event-factory.js";
import { JsonlEventStore } from "./mission-control/jsonl-event-store.js";
import { canRoleExecuteAction } from "./mission-control/policy.js";
import { controlRateLimiter } from "./mission-control/rate-limit.js";
import { RuntimeLifecycleManager } from "./mission-control/runtime-lifecycle-manager.js";
import { generateRuntimeEvent } from "./mission-control/runtime-events.js";

const DEFAULT_PORT = Number(process.env.TOURAB_MISSION_CONTROL_PORT ?? "7071");
const DEFAULT_EVENT_STORE_PATH = process.env.TOURAB_EVENT_STORE_PATH ?? "logs/mission-events.jsonl";
const REPLAY_DEFAULT = 200;

export interface MissionControlServerOptions {
  port?: number;
  eventStorePath?: string;
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

export async function startMissionControlServer(
  options: MissionControlServerOptions = {}
): Promise<MissionControlServerHandle> {
  const app = express();
  const httpServer = createServer(app);
  const wsServer = new WebSocketServer({ noServer: true });

  const port = options.port ?? DEFAULT_PORT;
  const eventStorePath = options.eventStorePath ?? DEFAULT_EVENT_STORE_PATH;
  const replayDefault = options.replayDefault ?? REPLAY_DEFAULT;
  const logRequests = options.logRequests ?? true;
  const approvalTtlMs = options.approvalTtlMs ?? Number(process.env.TOURAB_APPROVAL_TTL_MS ?? 5 * 60_000);

  const eventStore = new JsonlEventStore(eventStorePath);
  const bus = new EventBus();
  const lifecycle = new RuntimeLifecycleManager();
  const approvals = new ApprovalStore(approvalTtlMs);

  let eventCounter = 0;
  let inMemoryEvents = await eventStore.readAll();

  function appendAudit(title: string, detail: string, symbol: string, relatedEventType?: AuditItem["relatedEventType"]): void {
    lifecycle.audit.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: new Date().toISOString(),
      title,
      detail,
      symbol,
      relatedEventType
    });
    if (lifecycle.audit.length > 300) {
      lifecycle.audit.length = 300;
    }
  }

  async function sweepExpiredApprovals(): Promise<void> {
    const expired = approvals.expirePending();
    for (const item of expired) {
      const symbol = lifecycle.getSnapshotState().activeSymbol;
      appendAudit(
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
    res.json({ ok: true, service: "mission-control", state: lifecycle.getSnapshotState().state });
  });

  app.get("/snapshot", (_req, res) => {
    const snapshot: DashboardSnapshot = {
      state: lifecycle.getSnapshotState(),
      risk: lifecycle.risk,
      reconciliation: lifecycle.reconciliation,
      audit: lifecycle.audit,
      logs: lifecycle.logs,
      events: inMemoryEvents.slice(0, 200)
    };
    res.json(snapshot);
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
    appendAudit(
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
    appendAudit(
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
    appendAudit(
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
    const action = controlActionFromPath(req.path);
    if (!action) {
      writeError(res, 400, {
        ok: false,
        code: "INVALID_ACTION",
        message: `Unknown control action path: ${req.path}`,
        correlationId: typed.correlationId
      });
      return;
    }

    if (!canRoleExecuteAction(typed.role as UserRole, action)) {
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
      return;
    }

    const approvalId = req.header("x-approval-id") ?? undefined;
    const approvalCheck = approvals.isActionApproved(action, approvalId);
    if (!approvalCheck.ok) {
      if (approvalCheck.request?.status === "expired") {
        appendAudit(
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
        return;
      }

      if (approvalCheck.request?.status === "rejected") {
        appendAudit(
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
        return;
      }

      const request =
        approvalCheck.request ??
        approvals.create({
          action,
          requestedBy: typed.userId
        });
      if (!approvalCheck.request) {
        appendAudit(
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
      return;
    }

    const result = lifecycle.applyAction(action);
    const controlEvents = lifecycle.createControlEvents(action, result.ok, typed.correlationId);
    for (const event of controlEvents) {
      await publish(event);
    }
    if (!result.ok) {
      appendAudit(
        "Invalid state transition",
        `Action ${action} rejected in state ${result.state.state}; actor=${typed.userId}`,
        lifecycle.getSnapshotState().activeSymbol,
        "ControlCommandRejected"
      );
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

    wsServer.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wsServer.emit("connection", ws, req);
    });
  });

  wsServer.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const replay = Math.min(Number(url.searchParams.get("replay") ?? replayDefault), 500);

    const snapshot: DashboardSnapshot = {
      state: lifecycle.getSnapshotState(),
      risk: lifecycle.risk,
      reconciliation: lifecycle.reconciliation,
      audit: lifecycle.audit,
      logs: lifecycle.logs,
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
