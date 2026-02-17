import { useEffect, useMemo, useState } from "react";
import type { BotApiClient } from "../api/BotApiClient";
import type { ConnectionHealth } from "../api/BotApiClient";
import type { ClientDataSource } from "../api/BotApiClient";
import type {
  AlertItem,
  AuditItem,
  BotEvent,
  BotStateSnapshot,
  ExchangeStatus,
  IncidentItem,
  LogEntry,
  OpenOrdersStatus,
  OpsMetrics,
  PortfolioStatus,
  ReconciliationStatus,
  RiskStatus,
  UserRole
} from "../types";
import { filterEvents, type QuickFilter } from "../logic/eventFilters";
import type { EventSeverity, EventType } from "@tourab/shared";

const EMPTY_STATE: BotStateSnapshot = {
  state: "stopped",
  cycleCount: 0,
  cycleProgress: 0,
  activeSymbol: "BTC-USDT",
  mode: "simulation",
  lastHeartbeatAt: new Date().toISOString()
};

const EMPTY_RISK: RiskStatus = { limits: [], activeBlocks: [], recentRejects: [] };
const EMPTY_RECON: ReconciliationStatus = { positions: "in_progress", pnl: "in_progress", orders: "in_progress", lastRunAt: new Date().toISOString() };
const EMPTY_ALERTS: AlertItem[] = [];
const EMPTY_INCIDENTS: IncidentItem[] = [];
const EMPTY_EXCHANGE: ExchangeStatus = {
  connected: false,
  mode: "unknown",
  source: "none",
  lastHealthCheckAt: new Date(0).toISOString(),
  lastError: "Exchange health not yet loaded."
};
const EMPTY_METRICS: OpsMetrics = {
  controlRequestsTotal: 0,
  controlFailuresTotal: 0,
  wsConnectionsTotal: 0,
  wsDisconnectsTotal: 0,
  gatekeeperRejectsTotal: 0,
  driftEventsTotal: 0,
  heartbeatGapEventsTotal: 0,
  lastHeartbeatGapMs: 0,
  openAlerts: 0,
  openIncidents: 0,
  reconcileRunsTotal: 0
};
const EMPTY_PORTFOLIO: PortfolioStatus = {
  totalEq: "0",
  balances: [],
  lastUpdatedAt: new Date(0).toISOString(),
  lastError: "Portfolio not loaded yet."
};
const EMPTY_OPEN_ORDERS: OpenOrdersStatus = {
  orders: [],
  lastUpdatedAt: new Date(0).toISOString(),
  lastError: "Open orders not loaded yet."
};

export function useDashboardData(client: BotApiClient) {
  const [state, setState] = useState<BotStateSnapshot>(EMPTY_STATE);
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [risk, setRisk] = useState<RiskStatus>(EMPTY_RISK);
  const [reconciliation, setReconciliation] = useState<ReconciliationStatus>(EMPTY_RECON);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>(EMPTY_ALERTS);
  const [incidents, setIncidents] = useState<IncidentItem[]>(EMPTY_INCIDENTS);
  const [exchange, setExchange] = useState<ExchangeStatus>(EMPTY_EXCHANGE);
  const [portfolio, setPortfolio] = useState<PortfolioStatus>(EMPTY_PORTFOLIO);
  const [openOrders, setOpenOrders] = useState<OpenOrdersStatus>(EMPTY_OPEN_ORDERS);
  const [metrics, setMetrics] = useState<OpsMetrics>(EMPTY_METRICS);
  const [role, setRole] = useState<UserRole>("operator");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [symbolFilter, setSymbolFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<EventSeverity | "all">("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | "all">("all");
  const [pinnedSymbol, setPinnedSymbol] = useState<string>("");
  const [streamPaused, setStreamPaused] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>("live");
  const [dataSource, setDataSource] = useState<ClientDataSource>(() => client.getDataSource());

  useEffect(() => {
    let mounted = true;
    async function refreshSnapshot() {
      const snapshot = await client.getSnapshot();
      if (!mounted) {
        return;
      }
      setState(snapshot.state);
      setRisk(snapshot.risk);
      setReconciliation(snapshot.reconciliation);
      setAudit(snapshot.audit);
      setLogs(snapshot.logs);
      setAlerts(snapshot.alerts);
      setIncidents(snapshot.incidents);
      setExchange(snapshot.exchange);
      setPortfolio(snapshot.portfolio);
      setOpenOrders(snapshot.openOrders);
      setMetrics(snapshot.metrics);
      setEvents((prev) => {
        if (prev.length > 0) {
          return prev;
        }
        return snapshot.events;
      });
    }
    void refreshSnapshot();
    const snapshotTimer = setInterval(() => {
      void refreshSnapshot();
    }, 10_000);
    const unsubscribeSource = client.onDataSourceChange((source) => {
      setDataSource(source);
    });

    const unsubscribe = client.subscribeToEvents(
      (event) => {
        if (streamPaused) {
          return;
        }
        setEvents((prev) => [event, ...prev].slice(0, 400));
        const approvalTag = (event.tags || []).find((tag) => tag.startsWith("approval_"));
        const circuitTag = (event.tags || []).find((tag) => tag === "circuit_breaker");
        if (approvalTag || circuitTag) {
          const title = approvalTag
            ? approvalTag === "approval_created"
              ? "Approval created"
              : approvalTag === "approval_approved"
                ? "Approval approved"
                : approvalTag === "approval_rejected"
                  ? "Approval rejected"
                  : approvalTag === "approval_expired"
                    ? "Approval expired"
                    : "Approval lifecycle"
            : "Circuit breaker triggered";
          setAudit((prev) => [
            {
              id: `audit-live-${event.id}`,
              at: event.timestamp,
              title,
              detail: event.message,
              symbol: event.symbol,
              relatedEventType: event.type
            },
            ...prev
          ].slice(0, 300));
        }
        setState((prev) => ({ ...prev, lastHeartbeatAt: event.timestamp }));
        if (event.type === "Error") {
          setLogs((prev) => [
            {
              id: `log-${Date.now()}`,
              at: event.timestamp,
              severity: "error",
              symbol: event.symbol,
              message: event.message
            },
            ...prev
          ]);
        }
      },
      (health) => {
        setConnectionHealth(health);
      },
      (source) => {
        setDataSource(source);
      }
    );

    return () => {
      mounted = false;
      clearInterval(snapshotTimer);
      unsubscribeSource();
      unsubscribe();
    };
  }, [client, streamPaused]);

  const filteredEvents = useMemo(
    () =>
      filterEvents(events, {
        quickFilter,
        symbol: symbolFilter || undefined,
        severity: severityFilter,
        eventType: eventTypeFilter,
        pinnedSymbol: pinnedSymbol || undefined
      }),
    [events, quickFilter, symbolFilter, severityFilter, eventTypeFilter, pinnedSymbol]
  );

  return {
    state,
    setState,
    events,
    filteredEvents,
    risk,
    reconciliation,
    setReconciliation,
    audit,
    logs,
    alerts,
    incidents,
    exchange,
    portfolio,
    openOrders,
    metrics,
    role,
    setRole,
    quickFilter,
    setQuickFilter,
    symbolFilter,
    setSymbolFilter,
    severityFilter,
    setSeverityFilter,
    eventTypeFilter,
    setEventTypeFilter,
    pinnedSymbol,
    setPinnedSymbol,
    streamPaused,
    setStreamPaused,
    connectionHealth,
    dataSource
  };
}
