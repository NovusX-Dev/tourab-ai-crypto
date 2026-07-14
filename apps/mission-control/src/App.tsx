import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDefaultBotApiClient } from "./api/LiveBotApiClient";
import { ApprovalsPanel } from "./components/ApprovalsPanel";
import { AlertsPanel } from "./components/AlertsPanel";
import { AuditTimeline } from "./components/AuditTimeline";
import { AutonomyPanel } from "./components/AutonomyPanel";
import { BotStatusCard } from "./components/BotStatusCard";
import { ControlDeck } from "./components/ControlDeck";
import { DemoReadinessCard } from "./components/DemoReadinessCard";
import { EventStream } from "./components/EventStream";
import { LogsPanel } from "./components/LogsPanel";
import { ManagedTradesPanel } from "./components/ManagedTradesPanel";
import { IncidentsPanel } from "./components/IncidentsPanel";
import { Milestone5ReadinessCard } from "./components/Milestone5ReadinessCard";
import { RolloutStatusCard } from "./components/RolloutStatusCard";
import { OpsMetricsPanel } from "./components/OpsMetricsPanel";
import { OrdersPanel } from "./components/OrdersPanel";
import { PortfolioPanel } from "./components/PortfolioPanel";
import { ReconciliationCard } from "./components/ReconciliationCard";
import { RiskPanel } from "./components/RiskPanel";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { formatEquityRoundedThousands } from "./format";
import { deriveApprovalStatus } from "./logic/approvalLifecycle";
import { applyTheme, getInitialTheme, type ThemeName } from "./theme";
import { useDashboardData } from "./state/useDashboardData";
import type { AlertItem, ApprovalRequest, AuditItem, ControlAction, EventType, IncidentItem, LearningRetentionStatus } from "./types";

const client = createDefaultBotApiClient();

type PanelName =
  | "stream"
  | "risk"
  | "audit"
  | "logs"
  | "approvals"
  | "alerts"
  | "incidents"
  | "portfolio"
  | "orders"
  | "ops"
  | "autonomy"
  | "managed_trades";
type ToastTone = "success" | "error" | "warning";
type OperatorScope = "primary" | "btc" | "eth";
type LearningTrendFocus = "expectancy" | "drawdown" | "slippage" | "controlViolationRate";

interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  body: string;
}

const EMPTY_LEARNING_RETENTION: LearningRetentionStatus = {
  config: {
    closedTradeFeatureRetentionDays: 90
  },
  stats: {
    featureCount: 0
  }
};

export default function App() {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const initial = getInitialTheme();
    applyTheme(initial);
    return initial;
  });
  const [selectedPanel, setSelectedPanel] = useState<PanelName>("stream");
  const [learningTrendFocus, setLearningTrendFocus] = useState<LearningTrendFocus | undefined>(undefined);
  const [operatorScope, setOperatorScope] = useState<OperatorScope>("primary");
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [highlightedEventType, setHighlightedEventType] = useState<EventType | undefined>(undefined);
  const [highlightedSymbol, setHighlightedSymbol] = useState<string | undefined>(undefined);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [executedApprovalIds, setExecutedApprovalIds] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [learningRetention, setLearningRetention] = useState<LearningRetentionStatus>(EMPTY_LEARNING_RETENTION);
  const [isCompactLayout, setIsCompactLayout] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth <= 1080;
  });
  const [isNavDrawerOpen, setNavDrawerOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("operator-1");
  const [authToken, setAuthToken] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem("tourab_auth_token") ?? "";
  });
  const [approvalsAttention, setApprovalsAttention] = useState(false);
  const [alertsAttention, setAlertsAttention] = useState(false);
  const [approvalSoundMuted, setApprovalSoundMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("tourab_approval_sound_muted") === "1";
  });
  const previousPendingApprovalIdsRef = useRef<string[]>([]);
  const previousOpenAlertIdsRef = useRef<string[]>([]);

  const dashboard = useDashboardData(client);
  const { setSymbolFilter, setPinnedSymbol, setManagedTrades, setEntryAutonomy, setStrategyPromotion, setStrategyDegradation } =
    dashboard;

  useEffect(() => {
    client.setAuthToken(authToken || undefined);
    if (typeof window !== "undefined") {
      if (authToken) {
        window.localStorage.setItem("tourab_auth_token", authToken);
      } else {
        window.localStorage.removeItem("tourab_auth_token");
      }
    }
  }, [authToken]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("tourab_approval_sound_muted", approvalSoundMuted ? "1" : "0");
  }, [approvalSoundMuted]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const onResize = () => {
      const compact = window.innerWidth <= 1080;
      setIsCompactLayout(compact);
      if (!compact) {
        setNavDrawerOpen(false);
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const connectionLabel = dashboard.streamPaused
    ? "Paused"
    : dashboard.connectionHealth === "degraded"
      ? "Degraded"
      : "Live";
  const sourceLabel =
    dashboard.dataSource === "live"
      ? "LIVE_BACKEND"
      : dashboard.dataSource === "mock_fallback"
        ? "MOCK_FALLBACK"
        : "MOCK_FORCED";
  const exchangeLabel = dashboard.exchange.connected
    ? `EXCHANGE_${dashboard.exchange.mode.toUpperCase()}_OK`
    : "EXCHANGE_AUTH_FAIL";
  const equityLabel = `EQ ${formatEquityRoundedThousands(dashboard.portfolio.totalEq)} USD`;
  const openOrdersLabel = `OPEN ORDERS ${dashboard.openOrders.orders.length}`;

  const scopedSymbol = operatorScope === "btc" ? "BTC-USDT" : operatorScope === "eth" ? "ETH-USDT" : "";
  const playApprovalChime = useCallback(() => {
    if (approvalSoundMuted || typeof window === "undefined") {
      return;
    }
    const audioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audioContextCtor) {
      return;
    }
    const ctx = new audioContextCtor();
    const start = ctx.currentTime + 0.02;
    const notes = [740, 988];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + index * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.08, start + index * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.14 + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start + index * 0.14);
      osc.stop(start + index * 0.14 + 0.12);
    });
    const totalDurationMs = 500;
    setTimeout(() => {
      void ctx.close();
    }, totalDurationMs);
  }, [approvalSoundMuted]);

  const playAlertChime = useCallback(() => {
    if (approvalSoundMuted || typeof window === "undefined") {
      return;
    }
    const audioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audioContextCtor) {
      return;
    }
    const ctx = new audioContextCtor();
    const start = ctx.currentTime + 0.02;
    const notes = [392, 330, 262];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.09, start + index * 0.12 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.12 + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start + index * 0.12);
      osc.stop(start + index * 0.12 + 0.1);
    });
    setTimeout(() => {
      void ctx.close();
    }, 500);
  }, [approvalSoundMuted]);

  function handleTheme(next: ThemeName) {
    setTheme(next);
    applyTheme(next);
  }

  const pushToast = useCallback((tone: ToastTone, title: string, body: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [{ id, tone, title, body }, ...prev].slice(0, 5));
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const previousConnectionHealthRef = useRef(dashboard.connectionHealth);
  useEffect(() => {
    const previous = previousConnectionHealthRef.current;
    const next = dashboard.connectionHealth;
    if (previous !== next) {
      if (next === "degraded") {
        pushToast("error", "CONNECTION_DEGRADED", "Event stream connection degraded. Attempting reconnect.");
      } else if (previous === "degraded" && next === "live") {
        pushToast("success", "CONNECTION_RESTORED", "Event stream connection restored.");
      }
    }
    previousConnectionHealthRef.current = next;
  }, [dashboard.connectionHealth, pushToast]);

  useEffect(() => {
    setSymbolFilter(scopedSymbol);
    setPinnedSymbol("");
  }, [scopedSymbol, setPinnedSymbol, setSymbolFilter]);

  const lastCircuitEventRef = useRef<string>("");

  useEffect(() => {
    const pending = pendingApprovals.filter((item) => deriveApprovalStatus(item, Date.now(), executedApprovalIds) === "pending");
    const nextPendingIds = pending.map((item) => item.id).sort();
    const previousPendingIds = previousPendingApprovalIdsRef.current;
    const newPendingExists = nextPendingIds.some((id) => !previousPendingIds.includes(id));
    if (newPendingExists && selectedPanel !== "approvals") {
      setApprovalsAttention(true);
      playApprovalChime();
    }
    previousPendingApprovalIdsRef.current = nextPendingIds;
  }, [executedApprovalIds, pendingApprovals, playApprovalChime, selectedPanel]);

  useEffect(() => {
    if (selectedPanel === "approvals") {
      setApprovalsAttention(false);
    }
  }, [selectedPanel]);

  useEffect(() => {
    const openAlerts = alerts.filter((item) => item.status === "open");
    const nextOpenIds = openAlerts.map((item) => item.id).sort();
    const previousOpenIds = previousOpenAlertIdsRef.current;
    const newOpenAlertExists = nextOpenIds.some((id) => !previousOpenIds.includes(id));
    if (newOpenAlertExists && selectedPanel !== "alerts") {
      setAlertsAttention(true);
      playAlertChime();
    }
    previousOpenAlertIdsRef.current = nextOpenIds;
  }, [alerts, playAlertChime, selectedPanel]);

  useEffect(() => {
    if (selectedPanel === "alerts") {
      setAlertsAttention(false);
    }
  }, [selectedPanel]);

  const refreshApprovals = useCallback(async () => {
    const items = await client.listApprovals();
    setPendingApprovals(items);
    setExecutedApprovalIds((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const next = new Set(prev);
      for (const item of items) {
        if (item.status !== "pending" && item.status !== "expired") {
          next.delete(item.id);
        }
      }
      return next;
    });
  }, []);

  const refreshAlerts = useCallback(async () => {
    const items = await client.listAlerts();
    setAlerts(items);
  }, []);

  useEffect(() => {
    const latest = dashboard.events[0];
    if (!latest || latest.id === lastCircuitEventRef.current) {
      return;
    }
    if (latest.tags?.includes("circuit_breaker")) {
      lastCircuitEventRef.current = latest.id;
      setSelectedPanel("alerts");
      pushToast("error", "CIRCUIT_BREAKER", latest.message);
      void refreshAlerts();
    }
  }, [dashboard.events, pushToast, refreshAlerts]);

  const refreshIncidents = useCallback(async () => {
    const items = await client.listIncidents();
    setIncidents(items);
  }, []);

  const refreshManagedTrades = useCallback(async () => {
    const items = await client.listManagedTrades();
    setManagedTrades(items);
  }, [setManagedTrades]);

  const refreshM6AutonomyState = useCallback(async () => {
    const [entryAutonomyRes, strategyPromotionRes, strategyDegradationRes, learningAlertConfigRes, learningRetentionRes] = await Promise.allSettled([
      client.getEntryAutonomyConfig(),
      client.getStrategyPromotion(),
      client.getStrategyDegradationConfig(),
      client.getLearningAlertConfig(),
      client.getLearningRetentionStatus()
    ]);
    if (entryAutonomyRes.status === "fulfilled") {
      setEntryAutonomy(entryAutonomyRes.value);
    }
    if (strategyPromotionRes.status === "fulfilled") {
      setStrategyPromotion(strategyPromotionRes.value.state);
    }
    if (strategyDegradationRes.status === "fulfilled") {
      setStrategyDegradation(strategyDegradationRes.value);
    }
    if (learningAlertConfigRes.status === "fulfilled") {
      dashboard.setLearningAlertConfig(learningAlertConfigRes.value);
    }
    if (learningRetentionRes.status === "fulfilled") {
      setLearningRetention(learningRetentionRes.value);
    }
  }, [setEntryAutonomy, setStrategyDegradation, setStrategyPromotion]);

  async function saveAutoExitConfig(next: Parameters<typeof client.updateAutoExitConfig>[2]) {
    try {
      const updated = await client.updateAutoExitConfig(dashboard.role, currentUserId, next);
      dashboard.setAutoExitConfig(updated);
      pushToast("success", "AUTO_EXIT_UPDATED", "Auto-exit config updated.");
      await refreshManagedTrades();
    } catch (_error: unknown) {
      pushToast("error", "AUTO_EXIT_UPDATE_FAILED", "Failed to update auto-exit config.");
    }
  }

  async function saveEntryAutonomyConfig(next: Parameters<typeof client.updateEntryAutonomyConfig>[2]) {
    try {
      const updated = await client.updateEntryAutonomyConfig(dashboard.role, currentUserId, next);
      dashboard.setEntryAutonomy(updated);
      pushToast("success", "ENTRY_AUTONOMY_UPDATED", `Approval mode set to ${updated.status.approvalMode}.`);
    } catch (_error: unknown) {
      pushToast("error", "ENTRY_AUTONOMY_UPDATE_FAILED", "Failed to update entry autonomy policy.");
    }
  }

  async function registerStrategyVersion(input: Parameters<typeof client.registerStrategyVersion>[2]) {
    try {
      const updated = await client.registerStrategyVersion(dashboard.role, currentUserId, input);
      dashboard.setStrategyPromotion(updated.state);
      pushToast("success", "STRATEGY_REGISTERED", `Registered ${input.version}.`);
    } catch (_error: unknown) {
      pushToast("error", "STRATEGY_REGISTER_FAILED", `Failed to register ${input.version}.`);
    }
  }

  async function promoteStrategyVersion(input: Parameters<typeof client.promoteStrategyVersion>[2]) {
    try {
      const updated = await client.promoteStrategyVersion(dashboard.role, currentUserId, input);
      dashboard.setStrategyPromotion(updated.state);
      await refreshM6AutonomyState();
      pushToast("success", "STRATEGY_PROMOTED", `${input.version} -> ${input.targetStage}`);
    } catch (_error: unknown) {
      pushToast("error", "STRATEGY_PROMOTE_FAILED", `Failed to promote ${input.version}.`);
    }
  }

  async function rollbackStrategy(reason?: string) {
    try {
      const updated = await client.rollbackStrategy(dashboard.role, currentUserId, reason);
      dashboard.setStrategyPromotion(updated.state);
      await refreshM6AutonomyState();
      pushToast("warning", "STRATEGY_ROLLBACK", `Rolled back to ${updated.state.activeVersion}.`);
    } catch (_error: unknown) {
      pushToast("error", "STRATEGY_ROLLBACK_FAILED", "Rollback failed.");
    }
  }

  async function saveStrategyDegradationConfig(next: Parameters<typeof client.updateStrategyDegradationConfig>[2]) {
    try {
      const updated = await client.updateStrategyDegradationConfig(dashboard.role, currentUserId, next);
      dashboard.setStrategyDegradation(updated);
      pushToast("success", "DEGRADATION_UPDATED", "Strategy degradation thresholds updated.");
    } catch (_error: unknown) {
      pushToast("error", "DEGRADATION_UPDATE_FAILED", "Failed to update strategy degradation thresholds.");
    }
  }

  async function saveLearningAlertConfig(next: Parameters<typeof client.updateLearningAlertConfig>[2]) {
    try {
      const updated = await client.updateLearningAlertConfig(dashboard.role, currentUserId, next);
      dashboard.setLearningAlertConfig(updated);
      pushToast("success", "LEARNING_ALERT_CONFIG_UPDATED", "Learning alert thresholds updated.");
    } catch (_error: unknown) {
      pushToast("error", "LEARNING_ALERT_CONFIG_UPDATE_FAILED", "Failed to update learning alert thresholds.");
    }
  }

  async function saveLearningRetentionConfig(next: { closedTradeFeatureRetentionDays: number }) {
    try {
      const updated = await client.updateLearningRetentionConfig(dashboard.role, currentUserId, next);
      setLearningRetention(updated);
      pushToast("success", "LEARNING_RETENTION_UPDATED", "Learning retention policy updated.");
    } catch (_error: unknown) {
      pushToast("error", "LEARNING_RETENTION_UPDATE_FAILED", "Failed to update learning retention policy.");
    }
  }

  async function runLearningRetentionPrune() {
    try {
      const updated = await client.runLearningRetentionPrune(dashboard.role, currentUserId);
      setLearningRetention(updated);
      pushToast(
        "success",
        "LEARNING_RETENTION_PRUNE_APPLIED",
        `Deleted ${updated.lastPruneResult?.closedTradeFeaturesDeleted ?? 0} closed-trade feature rows.`
      );
    } catch (_error: unknown) {
      pushToast("error", "LEARNING_RETENTION_PRUNE_FAILED", "Failed to apply learning retention prune.");
    }
  }

  async function approveAndExecuteApproval(action: ControlAction, id: string) {
    const existing = pendingApprovals.find((item) => item.id === id);
    if (!existing) {
      await refreshApprovals();
      return;
    }
    if (deriveApprovalStatus(existing, Date.now(), executedApprovalIds) === "pending") {
      if (existing.approvedBy.includes(currentUserId)) {
        pushToast("warning", "APPROVAL_WAITING", `Approval ${id} already signed by ${currentUserId}. Waiting for other signer(s).`);
        return;
      }
      const updated = await client.approveApproval(id, currentUserId);
      pushToast(
        updated.status === "approved" ? "success" : "warning",
        "APPROVAL_UPDATED",
        `${updated.id}: ${updated.approvalCount}/${updated.requiredApprovals}`
      );
      if (updated.status !== "approved") {
        await refreshApprovals();
        return;
      }
    }
    const executed = await handleAction(action, id);
    if (executed) {
      setExecutedApprovalIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setPendingApprovals((prev) => prev.filter((item) => item.id !== id));
      pushToast("success", "APPROVAL_RESOLVED", `Approval ${id} executed and removed from view.`);
    }
  }

  async function rejectApproval(id: string) {
    const updated = await client.rejectApproval(id, currentUserId, "Rejected by operator");
    pushToast("warning", "APPROVAL_REJECTED", `${updated.id} rejected by ${currentUserId}`);
    await refreshApprovals();
  }

  async function acknowledgeAlert(id: string) {
    try {
      const updated = await client.acknowledgeAlert(id, dashboard.role, currentUserId);
      pushToast("warning", "ALERT_ACKNOWLEDGED", `${updated.code} acknowledged by ${currentUserId}`);
      await refreshAlerts();
    } catch (_error: unknown) {
      pushToast("error", "ALERT_ACK_FAILED", "Failed to acknowledge alert. Check role/permissions.");
    }
  }

  async function resolveAlert(id: string) {
    try {
      const updated = await client.resolveAlert(id, dashboard.role, currentUserId);
      pushToast("success", "ALERT_RESOLVED", `${updated.code} resolved by ${currentUserId}`);
      await refreshAlerts();
    } catch (_error: unknown) {
      pushToast("error", "ALERT_RESOLVE_FAILED", "Failed to resolve alert. Check role/permissions.");
    }
  }

  async function clearErrorAlerts() {
    if (dashboard.role === "read_only") {
      pushToast("warning", "UNAUTHORIZED", "Read-only role cannot clear alerts.");
      return;
    }
    const clearable = alerts.filter(
      (item) => item.status !== "resolved" && (item.severity === "warn" || item.severity === "error" || item.severity === "critical")
    );
    if (clearable.length === 0) {
      return;
    }
    const results = await Promise.allSettled(clearable.map((item) => client.resolveAlert(item.id, dashboard.role, currentUserId)));
    const resolved = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - resolved;
    if (resolved > 0) {
      pushToast("success", "ALERTS_CLEARED", `${resolved} warn/error alert(s) resolved by ${currentUserId}.`);
    }
    if (failed > 0) {
      pushToast("warning", "ALERT_CLEAR_PARTIAL", `${failed} alert(s) could not be cleared.`);
    }
    await refreshAlerts();
  }

  async function clearStreamsAndLogs() {
    const confirmed = window.confirm("Clear event streams and logs older/current data now?");
    if (!confirmed) {
      return;
    }
    const result = await client.clearEventStreamsAndLogs(dashboard.role, currentUserId);
    if (!result.ok) {
      pushToast("error", result.code, result.message);
      return;
    }
    pushToast("success", "STREAMS_CLEARED", result.message);
    await refreshApprovals();
    await refreshAlerts();
    await refreshIncidents();
    await refreshManagedTrades();
  }

  async function acknowledgeIncident(id: string) {
    const updated = await client.acknowledgeIncident(id, dashboard.role, currentUserId);
    pushToast("warning", "INCIDENT_ACKNOWLEDGED", `${updated.id} acknowledged by ${currentUserId}`);
    await refreshIncidents();
  }

  async function resolveIncident(id: string) {
    const updated = await client.resolveIncident(id, dashboard.role, currentUserId);
    pushToast("success", "INCIDENT_RESOLVED", `${updated.id} resolved by ${currentUserId}`);
    await refreshIncidents();
  }

  async function exportLearningIncidentReport() {
    try {
      const report = await client.getLearningIncidentReport(30);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `m7-learning-incidents-${stamp}.json`;
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      pushToast("success", "M7_INCIDENTS_EXPORTED", `Exported ${report.count} learning incident(s).`);
    } catch (_error: unknown) {
      pushToast("error", "M7_INCIDENT_EXPORT_FAILED", "Failed to export learning incident report.");
    }
  }

  function focusLearningTrendFromAlertCode(code?: string): void {
    if (!code || !code.startsWith("LEARNING_")) {
      return;
    }
    const focus: LearningTrendFocus | undefined =
      code === "LEARNING_EXPECTANCY_DEGRADATION"
        ? "expectancy"
        : code === "LEARNING_DRAWDOWN_ELEVATED"
          ? "drawdown"
          : code === "LEARNING_SLIPPAGE_ELEVATED"
            ? "slippage"
            : code === "LEARNING_CONTROL_VIOLATION_RATE_ELEVATED"
              ? "controlViolationRate"
              : undefined;
    setLearningTrendFocus(focus);
    setSelectedPanel("autonomy");
  }

  async function handleAction(action: ControlAction, approvalId?: string): Promise<boolean> {
    const destructive = action === "stop" || action === "cancel_all" || action === "emergency_stop";
    if (destructive && !approvalId) {
      const confirmed = window.confirm(`Confirm action: ${action.replace("_", " ")}?`);
      if (!confirmed) {
        return false;
      }
    }
    const result = await client.performAction(action, dashboard.role, currentUserId, approvalId);
    if (!result.ok) {
      if (result.code === "APPROVAL_REQUIRED") {
        setSelectedPanel("approvals");
        setApprovalsAttention(true);
        await refreshApprovals();
        pushToast("warning", "APPROVAL_REQUIRED", result.message);
        return false;
      }
      if (result.code === "APPROVAL_EXPIRED" || result.code === "APPROVAL_REJECTED") {
        setSelectedPanel("approvals");
        await refreshApprovals();
        pushToast("warning", result.code, result.message);
        return false;
      }
      pushToast("error", `${result.code}`, result.message);
      return false;
    }
    dashboard.setState((prev) => ({ ...prev, state: result.state }));
    pushToast("success", `${result.code}`, result.message);
    await refreshApprovals();
    return true;
  }

  async function setReconciliationStatus(input: Partial<Pick<typeof dashboard.reconciliation, "positions" | "pnl" | "orders">>) {
    try {
      const next = await client.updateReconciliation(dashboard.role, currentUserId, input);
      dashboard.setReconciliation(next);
      pushToast("success", "RECONCILIATION_UPDATED", `positions=${next.positions} pnl=${next.pnl} orders=${next.orders}`);
      await refreshAlerts();
      await refreshIncidents();
    } catch (_error: unknown) {
      pushToast("error", "RECONCILIATION_UPDATE_FAILED", "Failed to update reconciliation status.");
    }
  }

  function onSelectAudit(item: AuditItem) {
    setSelectedAuditId(item.id);
    setHighlightedEventType(item.relatedEventType);
    setHighlightedSymbol(item.symbol);
  }

  function clearAuditHighlight() {
    setSelectedAuditId("");
    setHighlightedEventType(undefined);
    setHighlightedSymbol(undefined);
  }

  useEffect(() => {
    void refreshApprovals();
    void refreshAlerts();
    void refreshIncidents();
    void refreshManagedTrades();
    void refreshM6AutonomyState();
  }, [refreshAlerts, refreshApprovals, refreshIncidents, refreshM6AutonomyState, refreshManagedTrades]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshApprovals();
      void refreshAlerts();
      void refreshIncidents();
      void refreshManagedTrades();
      void refreshM6AutonomyState();
    }, 5000);
    return () => {
      clearInterval(timer);
    };
  }, [refreshAlerts, refreshApprovals, refreshIncidents, refreshM6AutonomyState, refreshManagedTrades]);

  const pendingApprovalCount = useMemo(
    () => pendingApprovals.filter((item) => deriveApprovalStatus(item, Date.now(), executedApprovalIds) === "pending").length,
    [executedApprovalIds, pendingApprovals]
  );
  const openAlertCount = useMemo(
    () => alerts.filter((item) => item.status === "open").length,
    [alerts]
  );
  const unresolvedIncidentCount = useMemo(
    () => incidents.filter((item) => item.status !== "resolved").length,
    [incidents]
  );

  const rightPanelTabs: Array<{
    id: PanelName;
    label: string;
    count?: number;
    attention?: boolean;
  }> = [
    { id: "stream", label: "Event Stream" },
    { id: "risk", label: "Risk" },
    { id: "audit", label: "Audit" },
    { id: "logs", label: "Logs" },
    { id: "approvals", label: "Approvals", count: pendingApprovalCount, attention: approvalsAttention && selectedPanel !== "approvals" },
    { id: "alerts", label: "Alerts", count: openAlertCount, attention: alertsAttention && selectedPanel !== "alerts" },
    { id: "incidents", label: "Incidents", count: unresolvedIncidentCount },
    { id: "portfolio", label: "Portfolio" },
    { id: "orders", label: "Orders" },
    { id: "ops", label: "Ops" },
    { id: "autonomy", label: "Autonomy" },
    { id: "managed_trades", label: "Managed Trades", count: dashboard.managedTrades.length }
  ];

  const renderRightPanelContent = () => {
    if (selectedPanel === "stream") {
      return (
        <EventStream
          events={dashboard.filteredEvents}
          quickFilter={dashboard.quickFilter}
          onQuickFilterChange={dashboard.setQuickFilter}
          symbolFilter={dashboard.symbolFilter}
          onSymbolFilterChange={dashboard.setSymbolFilter}
          symbolFilterLocked={operatorScope !== "primary"}
          severityFilter={dashboard.severityFilter}
          onSeverityFilterChange={dashboard.setSeverityFilter}
          eventTypeFilter={dashboard.eventTypeFilter}
          onEventTypeFilterChange={dashboard.setEventTypeFilter}
          pinnedSymbol={dashboard.pinnedSymbol}
          onPinSymbol={(symbol) => dashboard.setPinnedSymbol((current) => (current === symbol ? "" : symbol))}
          streamPaused={dashboard.streamPaused}
          onToggleStreamPaused={() => dashboard.setStreamPaused((prev) => !prev)}
          autoScroll={autoScroll}
          onToggleAutoScroll={() => setAutoScroll((prev) => !prev)}
          highlightedEventType={highlightedEventType}
          highlightedSymbol={highlightedSymbol}
        />
      );
    }
    if (selectedPanel === "risk") {
      return <RiskPanel risk={dashboard.risk} />;
    }
    if (selectedPanel === "audit") {
      return (
        <AuditTimeline
          items={dashboard.audit}
          selectedId={selectedAuditId}
          onSelect={onSelectAudit}
          onClear={clearAuditHighlight}
        />
      );
    }
    if (selectedPanel === "approvals") {
      return (
        <ApprovalsPanel
          items={pendingApprovals}
          demoQueue={dashboard.demoQueue}
          currentUserId={currentUserId}
          executedApprovalIds={executedApprovalIds}
          onRefresh={() => void refreshApprovals()}
          onApproveExecute={(action, id) => void approveAndExecuteApproval(action, id)}
          onReject={(id) => void rejectApproval(id)}
        />
      );
    }
    if (selectedPanel === "alerts") {
      return (
        <AlertsPanel
          items={alerts}
          currentUserId={currentUserId}
          canManageAlerts={dashboard.role !== "read_only"}
          onRefresh={() => void refreshAlerts()}
          onClearErrors={() => void clearErrorAlerts()}
          onAcknowledge={(id) => void acknowledgeAlert(id)}
          onResolve={(id) => void resolveAlert(id)}
          onOpenLearningTrend={focusLearningTrendFromAlertCode}
        />
      );
    }
    if (selectedPanel === "incidents") {
      return (
        <IncidentsPanel
          items={incidents}
          currentUserId={currentUserId}
          onRefresh={() => void refreshIncidents()}
          onExportLearningReport={() => void exportLearningIncidentReport()}
          onAcknowledge={(id) => void acknowledgeIncident(id)}
          onResolve={(id) => void resolveIncident(id)}
          onOpenLearningTrend={focusLearningTrendFromAlertCode}
        />
      );
    }
    if (selectedPanel === "portfolio") {
      return <PortfolioPanel portfolio={dashboard.portfolio} />;
    }
    if (selectedPanel === "orders") {
      return <OrdersPanel openOrders={dashboard.openOrders} />;
    }
    if (selectedPanel === "ops") {
      return <OpsMetricsPanel metrics={dashboard.metrics} />;
    }
    if (selectedPanel === "autonomy") {
      return (
        <AutonomyPanel
          config={dashboard.autoExitConfig}
          entryAutonomy={dashboard.entryAutonomy}
          strategyPromotion={dashboard.strategyPromotion}
          strategyDegradation={dashboard.strategyDegradation}
          learningEvaluation={dashboard.learningEvaluation}
          learningEvaluationTrend={dashboard.learningEvaluationTrend}
          learningAlertConfig={dashboard.learningAlertConfig}
          learningRetention={learningRetention}
          trendFocus={learningTrendFocus}
          canEdit={dashboard.role !== "read_only"}
          onSaveConfig={saveAutoExitConfig}
          onSaveEntryAutonomy={saveEntryAutonomyConfig}
          onRegisterStrategy={registerStrategyVersion}
          onPromoteStrategy={promoteStrategyVersion}
          onRollbackStrategy={rollbackStrategy}
          onSaveDegradationConfig={saveStrategyDegradationConfig}
          onSaveLearningAlertConfig={saveLearningAlertConfig}
          onSaveLearningRetentionConfig={saveLearningRetentionConfig}
          onRunLearningRetentionPrune={runLearningRetentionPrune}
        />
      );
    }
    if (selectedPanel === "managed_trades") {
      return <ManagedTradesPanel trades={dashboard.managedTrades} onRefresh={refreshManagedTrades} />;
    }
    return <LogsPanel logs={dashboard.logs} onClearStreamsAndLogs={() => void clearStreamsAndLogs()} />;
  };

  const readinessItems = useMemo(() => {
    const now = Date.now();
    const pending = pendingApprovals.filter((item) => deriveApprovalStatus(item, now, executedApprovalIds) === "pending");
    const approvalFresh =
      pending.length === 0 || pending.every((item) => Number.isFinite(Date.parse(item.expiresAt)) && Date.parse(item.expiresAt) > now);
    const nearestApprovalExpiry = pending
      .map((item) => Date.parse(item.expiresAt))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b)[0];
    const approvalMode = dashboard.entryAutonomy.status.approvalMode;
    const managedTradeErrorCount = dashboard.managedTrades.filter((item) => item.status === "error").length;
    const autonomyReady = dashboard.autoExitConfig.enabled && managedTradeErrorCount === 0 && approvalMode === "manual";
    return [
      {
        key: "backend",
        label: "Backend data source",
        ok: dashboard.dataSource === "live",
        detail:
          dashboard.dataSource === "live"
            ? "Mission Control is using live backend data."
            : "UI is not on live backend data path."
      },
      {
        key: "ws",
        label: "WebSocket stream",
        ok: dashboard.connectionHealth === "live",
        detail:
          dashboard.connectionHealth === "live"
            ? "Event stream is connected."
            : "Event stream degraded/reconnecting."
      },
      {
        key: "exchange",
        label: "OKX demo auth",
        ok: dashboard.exchange.mode === "demo" && dashboard.exchange.connected,
        detail:
          dashboard.exchange.mode === "demo" && dashboard.exchange.connected
            ? `Demo exchange check passed at ${new Date(dashboard.exchange.lastHealthCheckAt).toLocaleTimeString()}.`
            : dashboard.exchange.lastError || "Exchange auth check failing."
      },
      {
        key: "portfolio",
        label: "Portfolio snapshot",
        ok: dashboard.exchange.connected && !dashboard.portfolio.lastError,
        detail:
          dashboard.exchange.connected && !dashboard.portfolio.lastError
            ? `Total equity: ${dashboard.portfolio.totalEq} USD (${dashboard.portfolio.balances.length} assets).`
            : dashboard.portfolio.lastError || "Portfolio data unavailable."
      },
      {
        key: "orders",
        label: "Open orders snapshot",
        ok: dashboard.exchange.connected && !dashboard.openOrders.lastError,
        detail:
          dashboard.exchange.connected && !dashboard.openOrders.lastError
            ? `Open orders: ${dashboard.openOrders.orders.length}.`
            : dashboard.openOrders.lastError || "Open orders data unavailable."
      },
      {
        key: "approval",
        label: "Approval window",
        ok: approvalFresh,
        detail:
          pending.length === 0
            ? "No pending approvals."
            : approvalFresh
              ? `Pending approvals valid until ${new Date(nearestApprovalExpiry ?? now).toLocaleTimeString()}.`
              : "One or more pending approvals are expired."
      },
      {
        key: "autonomy",
        label: "Autonomy guardrails",
        ok: autonomyReady,
        detail: `Auto-exit ${dashboard.autoExitConfig.enabled ? "enabled" : "disabled"}; managed trade errors=${managedTradeErrorCount}; approval mode=${approvalMode}.`
      }
    ];
  }, [
    dashboard.dataSource,
    dashboard.connectionHealth,
    dashboard.exchange,
    dashboard.portfolio,
    dashboard.openOrders,
    dashboard.autoExitConfig,
    dashboard.entryAutonomy,
    dashboard.managedTrades,
    pendingApprovals,
    executedApprovalIds
  ]);

  return (
    <div className="app-shell">
      <aside className={`nav-panel card ${isCompactLayout ? "compact" : ""} ${isNavDrawerOpen ? "open" : ""}`}>
        <div className="brand">Mission Panels</div>
        <div className="nav-group">
          {rightPanelTabs.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${selectedPanel === item.id ? "nav-active" : ""} ${item.attention ? "tab-attention" : ""}`}
              onClick={() => {
                setSelectedPanel(item.id);
                if (isCompactLayout) {
                  setNavDrawerOpen(false);
                }
              }}
              aria-pressed={selectedPanel === item.id}
            >
              <span>{item.label}</span>
              {typeof item.count === "number" ? <span className="tab-count">{item.count}</span> : null}
            </button>
          ))}
        </div>
        <button
          className="btn btn-ghost nav-sound-toggle"
          onClick={() => setApprovalSoundMuted((prev) => !prev)}
          aria-pressed={!approvalSoundMuted}
          title="Toggle approval sound"
        >
          {approvalSoundMuted ? "Sound Off" : "Sound On"}
        </button>
      </aside>

      <main className="main-grid">
        <header className="topbar card">
          <div className="topbar-title">AI Bot Mission Control</div>
          <div className="topbar-meta">
            {isCompactLayout ? (
              <button className="btn btn-ghost" onClick={() => setNavDrawerOpen((prev) => !prev)}>
                {isNavDrawerOpen ? "Close Panels" : "Panels"}
              </button>
            ) : null}
            <span className="env-badge">DEMO</span>
            <div className="scope-switch">
              <button
                className={`chip ${operatorScope === "primary" ? "chip-active" : ""}`}
                onClick={() => setOperatorScope("primary")}
              >
                Primary
              </button>
              <button
                className={`chip ${operatorScope === "btc" ? "chip-active" : ""}`}
                onClick={() => setOperatorScope("btc")}
              >
                BTC
              </button>
              <button
                className={`chip ${operatorScope === "eth" ? "chip-active" : ""}`}
                onClick={() => setOperatorScope("eth")}
              >
                ETH
              </button>
            </div>
            <select value={dashboard.role} onChange={(event) => dashboard.setRole(event.target.value as typeof dashboard.role)}>
              <option value="read_only">Read-only</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
            <input
              value={currentUserId}
              onChange={(event) => setCurrentUserId(event.target.value)}
              placeholder="user id"
              aria-label="User identity"
              style={{ width: 120 }}
            />
            <input
              value={authToken}
              onChange={(event) => setAuthToken(event.target.value)}
              placeholder="auth token"
              aria-label="Auth token"
              style={{ width: 180 }}
            />
            <span
              className={`conn-badge ${
                dashboard.streamPaused || dashboard.connectionHealth === "degraded" ? "warn" : "ok"
              }`}
            >
              {connectionLabel}
            </span>
            <span className={`conn-badge ${dashboard.dataSource === "live" ? "ok" : "warn"}`}>{sourceLabel}</span>
            <span className={`conn-badge ${dashboard.exchange.connected ? "ok" : "warn"}`}>{exchangeLabel}</span>
            <span className={`conn-badge ${dashboard.exchange.connected ? "ok" : "warn"}`}>{equityLabel}</span>
            <span className={`conn-badge ${dashboard.exchange.connected ? "ok" : "warn"}`}>{openOrdersLabel}</span>
          </div>
        </header>

        <section className="status-row">
          <BotStatusCard state={dashboard.state} />
          <ControlDeck role={dashboard.role} state={dashboard.state.state} onAction={handleAction} />
          <ReconciliationCard status={dashboard.reconciliation} role={dashboard.role} onSetStatus={(input) => void setReconciliationStatus(input)} />
        </section>

        <section className={`dynamic-content ${selectedPanel === "stream" ? "stream-mode" : ""}`}>
          {renderRightPanelContent()}
        </section>
      </main>

      <aside className="info-panel card">
        <DemoReadinessCard items={readinessItems} compact />
        <RolloutStatusCard status={dashboard.rolloutStatus} />
        <Milestone5ReadinessCard evidence={dashboard.milestone5Evidence} />
        <ThemeSwitcher value={theme} onChange={handleTheme} />
      </aside>

      {isCompactLayout && isNavDrawerOpen ? <div className="nav-backdrop" onClick={() => setNavDrawerOpen(false)} /> : null}

      <section className="toast-stack" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <article key={toast.id} className={`toast toast-${toast.tone}`}>
            <div className="toast-title">{toast.title}</div>
            <div className="toast-body">{toast.body}</div>
          </article>
        ))}
      </section>
    </div>
  );
}
