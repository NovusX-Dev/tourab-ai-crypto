import { useEffect, useMemo, useRef, useState } from "react";
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
import { IncidentsPanel } from "./components/IncidentsPanel";
import { Milestone5ReadinessCard } from "./components/Milestone5ReadinessCard";
import { OpsMetricsPanel } from "./components/OpsMetricsPanel";
import { OrdersPanel } from "./components/OrdersPanel";
import { PortfolioPanel } from "./components/PortfolioPanel";
import { ReconciliationCard } from "./components/ReconciliationCard";
import { RiskPanel } from "./components/RiskPanel";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { formatEquityRoundedThousands } from "./format";
import { applyTheme, getInitialTheme, type ThemeName } from "./theme";
import { useDashboardData } from "./state/useDashboardData";
import type { AlertItem, ApprovalRequest, AuditItem, ControlAction, EventType, IncidentItem } from "./types";

const client = createDefaultBotApiClient();

type RightTab = "risk" | "audit" | "logs" | "approvals" | "alerts" | "incidents" | "portfolio" | "orders" | "ops" | "autonomy";
type ToastTone = "success" | "error" | "warning";
type OperatorScope = "primary" | "btc" | "eth";

interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  body: string;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const initial = getInitialTheme();
    applyTheme(initial);
    return initial;
  });
  const [tab, setTab] = useState<RightTab>("risk");
  const [operatorScope, setOperatorScope] = useState<OperatorScope>("primary");
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [highlightedEventType, setHighlightedEventType] = useState<EventType | undefined>(undefined);
  const [highlightedSymbol, setHighlightedSymbol] = useState<string | undefined>(undefined);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
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

  function playApprovalChime() {
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
  }

  function playAlertChime() {
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
  }

  function handleTheme(next: ThemeName) {
    setTheme(next);
    applyTheme(next);
  }

  function pushToast(tone: ToastTone, title: string, body: string) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [{ id, tone, title, body }, ...prev].slice(0, 5));
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }

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
  }, [dashboard.connectionHealth]);

  useEffect(() => {
    dashboard.setSymbolFilter(scopedSymbol);
    dashboard.setPinnedSymbol("");
  }, [scopedSymbol]);

  const lastCircuitEventRef = useRef<string>("");
  useEffect(() => {
    const latest = dashboard.events[0];
    if (!latest || latest.id === lastCircuitEventRef.current) {
      return;
    }
    if (latest.tags?.includes("circuit_breaker")) {
      lastCircuitEventRef.current = latest.id;
      setTab("alerts");
      pushToast("error", "CIRCUIT_BREAKER", latest.message);
      void refreshAlerts();
    }
  }, [dashboard.events]);

  useEffect(() => {
    const pending = pendingApprovals.filter((item) => item.status === "pending");
    const nextPendingIds = pending.map((item) => item.id).sort();
    const previousPendingIds = previousPendingApprovalIdsRef.current;
    const newPendingExists = nextPendingIds.some((id) => !previousPendingIds.includes(id));
    if (newPendingExists && tab !== "approvals") {
      setApprovalsAttention(true);
      playApprovalChime();
    }
    previousPendingApprovalIdsRef.current = nextPendingIds;
  }, [pendingApprovals, tab]);

  useEffect(() => {
    if (tab === "approvals") {
      setApprovalsAttention(false);
    }
  }, [tab]);

  useEffect(() => {
    const openAlerts = alerts.filter((item) => item.status === "open");
    const nextOpenIds = openAlerts.map((item) => item.id).sort();
    const previousOpenIds = previousOpenAlertIdsRef.current;
    const newOpenAlertExists = nextOpenIds.some((id) => !previousOpenIds.includes(id));
    if (newOpenAlertExists && tab !== "alerts") {
      setAlertsAttention(true);
      playAlertChime();
    }
    previousOpenAlertIdsRef.current = nextOpenIds;
  }, [alerts, tab]);

  useEffect(() => {
    if (tab === "alerts") {
      setAlertsAttention(false);
    }
  }, [tab]);

  async function refreshApprovals() {
    const items = await client.listApprovals();
    setPendingApprovals(items);
  }

  async function refreshAlerts() {
    const items = await client.listAlerts();
    setAlerts(items);
  }

  async function refreshIncidents() {
    const items = await client.listIncidents();
    setIncidents(items);
  }

  async function refreshManagedTrades() {
    const items = await client.listManagedTrades();
    dashboard.setManagedTrades(items);
  }

  async function refreshM6AutonomyState() {
    const [entryAutonomyRes, strategyPromotionRes, strategyDegradationRes] = await Promise.allSettled([
      client.getEntryAutonomyConfig(),
      client.getStrategyPromotion(),
      client.getStrategyDegradationConfig()
    ]);
    if (entryAutonomyRes.status === "fulfilled") {
      dashboard.setEntryAutonomy(entryAutonomyRes.value);
    }
    if (strategyPromotionRes.status === "fulfilled") {
      dashboard.setStrategyPromotion(strategyPromotionRes.value.state);
    }
    if (strategyDegradationRes.status === "fulfilled") {
      dashboard.setStrategyDegradation(strategyDegradationRes.value);
    }
  }

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

  async function approveAndExecuteApproval(action: ControlAction, id: string) {
    const existing = pendingApprovals.find((item) => item.id === id);
    if (!existing) {
      await refreshApprovals();
      return;
    }
    if (existing.status === "pending") {
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
    await handleAction(action, id);
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

  async function handleAction(action: ControlAction, approvalId?: string) {
    const destructive = action === "stop" || action === "cancel_all" || action === "emergency_stop";
    if (destructive && !approvalId) {
      const confirmed = window.confirm(`Confirm action: ${action.replace("_", " ")}?`);
      if (!confirmed) {
        return;
      }
    }
    const result = await client.performAction(action, dashboard.role, currentUserId, approvalId);
    if (!result.ok) {
      if (result.code === "APPROVAL_REQUIRED") {
        setTab("approvals");
        setApprovalsAttention(true);
        await refreshApprovals();
        pushToast("warning", "APPROVAL_REQUIRED", result.message);
        return;
      }
      if (result.code === "APPROVAL_EXPIRED" || result.code === "APPROVAL_REJECTED") {
        setTab("approvals");
        await refreshApprovals();
        pushToast("warning", result.code, result.message);
        return;
      }
      pushToast("error", `${result.code}`, result.message);
      return;
    }
    dashboard.setState((prev) => ({ ...prev, state: result.state }));
    pushToast("success", `${result.code}`, result.message);
    await refreshApprovals();
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
  }, []);

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
  }, []);

  const rightPanel = useMemo(() => {
    if (tab === "risk") {
      return <RiskPanel risk={dashboard.risk} />;
    }
    if (tab === "audit") {
      return (
        <AuditTimeline
          items={dashboard.audit}
          selectedId={selectedAuditId}
          onSelect={onSelectAudit}
          onClear={clearAuditHighlight}
        />
      );
    }
    if (tab === "approvals") {
      return (
        <ApprovalsPanel
          items={pendingApprovals}
          demoQueue={dashboard.demoQueue}
          currentUserId={currentUserId}
          onRefresh={() => void refreshApprovals()}
          onApproveExecute={(action, id) => void approveAndExecuteApproval(action, id)}
          onReject={(id) => void rejectApproval(id)}
        />
      );
    }
    if (tab === "alerts") {
      return (
        <AlertsPanel
          items={alerts}
          currentUserId={currentUserId}
          canManageAlerts={dashboard.role !== "read_only"}
          onRefresh={() => void refreshAlerts()}
          onClearErrors={() => void clearErrorAlerts()}
          onAcknowledge={(id) => void acknowledgeAlert(id)}
          onResolve={(id) => void resolveAlert(id)}
        />
      );
    }
    if (tab === "incidents") {
      return (
        <IncidentsPanel
          items={incidents}
          currentUserId={currentUserId}
          onRefresh={() => void refreshIncidents()}
          onAcknowledge={(id) => void acknowledgeIncident(id)}
          onResolve={(id) => void resolveIncident(id)}
        />
      );
    }
    if (tab === "portfolio") {
      return <PortfolioPanel portfolio={dashboard.portfolio} />;
    }
    if (tab === "orders") {
      return <OrdersPanel openOrders={dashboard.openOrders} />;
    }
    if (tab === "ops") {
      return <OpsMetricsPanel metrics={dashboard.metrics} />;
    }
    if (tab === "autonomy") {
      return (
        <AutonomyPanel
          config={dashboard.autoExitConfig}
          managedTrades={dashboard.managedTrades}
          entryAutonomy={dashboard.entryAutonomy}
          strategyPromotion={dashboard.strategyPromotion}
          strategyDegradation={dashboard.strategyDegradation}
          canEdit={dashboard.role !== "read_only"}
          onSaveConfig={saveAutoExitConfig}
          onRefreshTrades={refreshManagedTrades}
          onSaveEntryAutonomy={saveEntryAutonomyConfig}
          onRegisterStrategy={registerStrategyVersion}
          onPromoteStrategy={promoteStrategyVersion}
          onRollbackStrategy={rollbackStrategy}
          onSaveDegradationConfig={saveStrategyDegradationConfig}
        />
      );
    }
    return <LogsPanel logs={dashboard.logs} onClearStreamsAndLogs={() => void clearStreamsAndLogs()} />;
  }, [
    tab,
    dashboard.risk,
    dashboard.audit,
    dashboard.logs,
    dashboard.metrics,
    dashboard.portfolio,
    dashboard.openOrders,
    dashboard.autoExitConfig,
    dashboard.entryAutonomy,
    dashboard.strategyPromotion,
    dashboard.strategyDegradation,
    dashboard.managedTrades,
    dashboard.demoQueue,
    pendingApprovals,
    selectedAuditId,
    currentUserId,
    alerts,
    incidents,
    dashboard.role
  ]);

  const readinessItems = useMemo(() => {
    const now = Date.now();
    const pending = pendingApprovals.filter((item) => item.status === "pending");
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
    pendingApprovals
  ]);

  return (
    <div className="app-shell">
      <aside className="sidebar card">
        <div className="brand">Tourab Mission Control</div>
        <div className="nav-group">
          <button
            className={`nav-item ${operatorScope === "primary" ? "nav-active" : ""}`}
            onClick={() => setOperatorScope("primary")}
            aria-pressed={operatorScope === "primary"}
          >
            Primary Bot
          </button>
          <button
            className={`nav-item ${operatorScope === "btc" ? "nav-active" : ""}`}
            onClick={() => setOperatorScope("btc")}
            aria-pressed={operatorScope === "btc"}
          >
            BTC Operator
          </button>
          <button
            className={`nav-item ${operatorScope === "eth" ? "nav-active" : ""}`}
            onClick={() => setOperatorScope("eth")}
            aria-pressed={operatorScope === "eth"}
          >
            ETH Operator
          </button>
        </div>
        <DemoReadinessCard items={readinessItems} compact />
        <Milestone5ReadinessCard evidence={dashboard.milestone5Evidence} />
        <ThemeSwitcher value={theme} onChange={handleTheme} />
      </aside>

      <main className="main-grid">
        <header className="topbar card">
          <div className="topbar-title">AI Bot Mission Control</div>
          <div className="topbar-meta">
            <span className="env-badge">DEMO</span>
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
      </main>

      <aside className="right-panel card">
        <div className="tab-row">
          <button className={`tab ${tab === "risk" ? "tab-active" : ""}`} onClick={() => setTab("risk")}>Risk</button>
          <button className={`tab ${tab === "audit" ? "tab-active" : ""}`} onClick={() => setTab("audit")}>Audit</button>
          <button className={`tab ${tab === "logs" ? "tab-active" : ""}`} onClick={() => setTab("logs")}>Logs</button>
          <button
            className={`tab ${tab === "approvals" ? "tab-active" : ""} ${approvalsAttention && tab !== "approvals" ? "tab-attention" : ""}`}
            onClick={() => setTab("approvals")}
          >
            Approvals
          </button>
          <button
            className={`tab ${tab === "alerts" ? "tab-active" : ""} ${alertsAttention && tab !== "alerts" ? "tab-attention" : ""}`}
            onClick={() => setTab("alerts")}
          >
            Alerts
          </button>
          <button className={`tab ${tab === "incidents" ? "tab-active" : ""}`} onClick={() => setTab("incidents")}>Incidents</button>
          <button className={`tab ${tab === "portfolio" ? "tab-active" : ""}`} onClick={() => setTab("portfolio")}>Portfolio</button>
          <button className={`tab ${tab === "orders" ? "tab-active" : ""}`} onClick={() => setTab("orders")}>Orders</button>
          <button className={`tab ${tab === "ops" ? "tab-active" : ""}`} onClick={() => setTab("ops")}>Ops</button>
          <button className={`tab ${tab === "autonomy" ? "tab-active" : ""}`} onClick={() => setTab("autonomy")}>Autonomy</button>
          <button
            className="tab sound-toggle"
            onClick={() => setApprovalSoundMuted((prev) => !prev)}
            aria-pressed={!approvalSoundMuted}
            title="Toggle approval sound"
          >
            {approvalSoundMuted ? "Sound Off" : "Sound On"}
          </button>
        </div>
        {rightPanel}
      </aside>

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
