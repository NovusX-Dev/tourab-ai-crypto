import { useEffect, useMemo, useState } from "react";
import type { BotApiClient } from "../api/BotApiClient";
import type { ConnectionHealth } from "../api/BotApiClient";
import type { ClientDataSource } from "../api/BotApiClient";
import type {
  AlertItem,
  AutoExitConfig,
  AuditItem,
  BotEvent,
  BotStateSnapshot,
  DemoQueuedIntent,
  EntryAutonomyConfig,
  EntryAutonomyStatus,
  ExchangeStatus,
  IncidentItem,
  LearningEvaluationSummary,
  LearningEvaluationTrendSummary,
  LearningAlertConfig,
  LogEntry,
  ManagedTradeItem,
  Milestone5EvidenceSummary,
  OpenOrdersStatus,
  OpsMetrics,
  PortfolioStatus,
  ReconciliationStatus,
  RiskStatus,
  StrategyDegradationConfig,
  StrategyPromotionState,
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
  lastError: "Portfolio not loaded yet.",
  performance: {
    sessionStartEqUsd: 0,
    currentEqUsd: 0,
    deltaUsd: 0,
    deltaPct: 0,
    timeline: [],
    trades: [],
    daily: {
      day: new Date().toISOString().slice(0, 10),
      realizedPnlUsd: 0,
      unrealizedPnlUsd: 0,
      feesUsd: 0,
      winRate: 0,
      wins: 0,
      losses: 0,
      closedTrades: 0
    }
  }
};
const EMPTY_OPEN_ORDERS: OpenOrdersStatus = {
  orders: [],
  lastUpdatedAt: new Date(0).toISOString(),
  lastError: "Open orders not loaded yet."
};
const EMPTY_DEMO_QUEUE: DemoQueuedIntent[] = [];
const EMPTY_AUTO_EXIT_CONFIG: AutoExitConfig = {
  enabled: true,
  maxHoldSec: 1800,
  takeProfitRMultiple: 1.5,
  exitOffsetBps: 5
};
const EMPTY_ENTRY_AUTONOMY_CONFIG: EntryAutonomyConfig = {
  approvalMode: "manual",
  allowedSymbols: ["BTC-USDT"],
  maxPerOrderNotionalUsd: 10,
  maxOpenExposureUsd: 20,
  maxDailyLossUsd: 5,
  maxWeeklyLossUsd: 15,
  lossStreakCooldownCount: 3,
  cooldownMinutes: 60,
  strategyVersion: "champion-v1",
  policyVersion: "m6-policy-v1"
};
const EMPTY_ENTRY_AUTONOMY_STATUS: EntryAutonomyStatus = {
  approvalMode: "manual",
  fallbackActive: false,
  lastPolicyAutoBlockers: []
};
const EMPTY_STRATEGY_PROMOTION: StrategyPromotionState = {
  activeVersion: "champion-v1",
  championVersion: "champion-v1",
  versions: [],
  history: []
};
const EMPTY_STRATEGY_DEGRADATION: StrategyDegradationConfig = {
  enabled: true,
  maxDailyLossUsd: 5,
  maxDrawdownPct: -5,
  maxConsecutiveLosingTrades: 4
};
const EMPTY_MANAGED_TRADES: ManagedTradeItem[] = [];
const EMPTY_MILESTONE5_EVIDENCE: Milestone5EvidenceSummary = {
  policyVersion: "calendar-day-v1",
  requiredDays: 7,
  qualifiedDays: 0,
  streakDays: 0,
  milestoneReady: false,
  generatedAt: new Date(0).toISOString(),
  today: {
    day: new Date().toISOString().slice(0, 10),
    pass: false,
    source: "live",
    blockers: [],
    closureRatePct: 0,
    filledEntries: 0,
    deterministicClosed: 0,
    reconciliationPass: true,
    tradeErrors: 0
  },
  days: []
};
const EMPTY_LEARNING_EVALUATION: LearningEvaluationSummary = {
  generatedAt: new Date(0).toISOString(),
  lookbackDays: 30,
  closedTrades: 0,
  totals: {
    expectancyNetFeesUsd: 0,
    cumulativeNetPnlUsd: 0,
    maxDrawdownUsd: 0,
    maxDrawdownPct: 0,
    slippageProxyBps: 0,
    controlViolations: 0
  },
  byModelVersion: [],
  byStrategyVersion: []
};
const EMPTY_LEARNING_EVALUATION_TREND: LearningEvaluationTrendSummary = {
  generatedAt: new Date(0).toISOString(),
  lookbackDays: 30,
  bucketDays: 1,
  thresholds: {
    enabled: true,
    lookbackDays: 30,
    limit: 2000,
    minTrades: 15,
    expectancyMinUsd: 0,
    maxDrawdownPct: 5,
    maxSlippageBps: 15,
    maxControlViolationRatePct: 20
  },
  points: []
};
const EMPTY_LEARNING_ALERT_CONFIG: LearningAlertConfig = {
  enabled: true,
  lookbackDays: 30,
  limit: 2000,
  minTrades: 15,
  expectancyMinUsd: 0,
  maxDrawdownPct: 5,
  maxSlippageBps: 15,
  maxControlViolationRatePct: 20
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
  const [demoQueue, setDemoQueue] = useState<DemoQueuedIntent[]>(EMPTY_DEMO_QUEUE);
  const [autoExitConfig, setAutoExitConfig] = useState<AutoExitConfig>(EMPTY_AUTO_EXIT_CONFIG);
  const [entryAutonomy, setEntryAutonomy] = useState<{ config: EntryAutonomyConfig; status: EntryAutonomyStatus }>({
    config: EMPTY_ENTRY_AUTONOMY_CONFIG,
    status: EMPTY_ENTRY_AUTONOMY_STATUS
  });
  const [strategyPromotion, setStrategyPromotion] = useState<StrategyPromotionState>(EMPTY_STRATEGY_PROMOTION);
  const [strategyDegradation, setStrategyDegradation] = useState<StrategyDegradationConfig>(EMPTY_STRATEGY_DEGRADATION);
  const [managedTrades, setManagedTrades] = useState<ManagedTradeItem[]>(EMPTY_MANAGED_TRADES);
  const [milestone5Evidence, setMilestone5Evidence] = useState<Milestone5EvidenceSummary>(EMPTY_MILESTONE5_EVIDENCE);
  const [learningEvaluation, setLearningEvaluation] = useState<LearningEvaluationSummary>(EMPTY_LEARNING_EVALUATION);
  const [learningEvaluationTrend, setLearningEvaluationTrend] = useState<LearningEvaluationTrendSummary>(EMPTY_LEARNING_EVALUATION_TREND);
  const [learningAlertConfig, setLearningAlertConfig] = useState<LearningAlertConfig>(EMPTY_LEARNING_ALERT_CONFIG);
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
      const [
        autoExitRes,
        managedTradesRes,
        m5EvidenceRes,
        learningEvaluationRes,
        learningEvaluationTrendRes,
        learningAlertConfigRes,
        entryAutonomyRes,
        strategyPromotionRes,
        strategyDegradationRes
      ] =
        await Promise.allSettled([
        client.getAutoExitConfig(),
        client.listManagedTrades(),
        client.getMilestone5Evidence(),
        client.getLearningEvaluation(),
        client.getLearningEvaluationTrend(),
        client.getLearningAlertConfig(),
        client.getEntryAutonomyConfig(),
        client.getStrategyPromotion(),
        client.getStrategyDegradationConfig()
        ]);
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
      setDemoQueue(snapshot.demoQueue);
      if (autoExitRes.status === "fulfilled") {
        setAutoExitConfig(autoExitRes.value);
      }
      if (managedTradesRes.status === "fulfilled") {
        setManagedTrades(managedTradesRes.value);
      }
      if (m5EvidenceRes.status === "fulfilled") {
        setMilestone5Evidence(m5EvidenceRes.value);
      }
      if (learningEvaluationRes.status === "fulfilled") {
        setLearningEvaluation(learningEvaluationRes.value);
      }
      if (learningEvaluationTrendRes.status === "fulfilled") {
        setLearningEvaluationTrend(learningEvaluationTrendRes.value);
      }
      if (learningAlertConfigRes.status === "fulfilled") {
        setLearningAlertConfig(learningAlertConfigRes.value);
      }
      if (entryAutonomyRes.status === "fulfilled") {
        setEntryAutonomy(entryAutonomyRes.value);
      }
      if (strategyPromotionRes.status === "fulfilled") {
        setStrategyPromotion(strategyPromotionRes.value.state);
      }
      if (strategyDegradationRes.status === "fulfilled") {
        setStrategyDegradation(strategyDegradationRes.value);
      }
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
    demoQueue,
    autoExitConfig,
    setAutoExitConfig,
    entryAutonomy,
    setEntryAutonomy,
    strategyPromotion,
    setStrategyPromotion,
    strategyDegradation,
    setStrategyDegradation,
    managedTrades,
    setManagedTrades,
    milestone5Evidence,
    learningEvaluation,
    learningEvaluationTrend,
    learningAlertConfig,
    setLearningAlertConfig,
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
