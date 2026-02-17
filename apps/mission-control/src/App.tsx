import { useEffect, useMemo, useRef, useState } from "react";
import { createDefaultBotApiClient } from "./api/LiveBotApiClient";
import { ApprovalsPanel } from "./components/ApprovalsPanel";
import { AuditTimeline } from "./components/AuditTimeline";
import { BotStatusCard } from "./components/BotStatusCard";
import { ControlDeck } from "./components/ControlDeck";
import { EventStream } from "./components/EventStream";
import { LogsPanel } from "./components/LogsPanel";
import { ReconciliationCard } from "./components/ReconciliationCard";
import { RiskPanel } from "./components/RiskPanel";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { applyTheme, getInitialTheme, type ThemeName } from "./theme";
import { useDashboardData } from "./state/useDashboardData";
import type { ApprovalRequest, AuditItem, ControlAction, EventType } from "./types";

const client = createDefaultBotApiClient();

type RightTab = "risk" | "audit" | "logs" | "approvals";
type ToastTone = "success" | "error" | "warning";

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
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [highlightedEventType, setHighlightedEventType] = useState<EventType | undefined>(undefined);
  const [highlightedSymbol, setHighlightedSymbol] = useState<string | undefined>(undefined);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState("operator-1");

  const dashboard = useDashboardData(client);

  const connectionLabel = dashboard.streamPaused
    ? "Paused"
    : dashboard.connectionHealth === "degraded"
      ? "Degraded"
      : "Live";

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

  async function refreshApprovals() {
    const items = await client.listApprovals();
    setPendingApprovals(items);
  }

  async function approveApproval(id: string) {
    const updated = await client.approveApproval(id, currentUserId);
    pushToast(
      updated.status === "approved" ? "success" : "warning",
      "APPROVAL_UPDATED",
      `${updated.id}: ${updated.approvalCount}/${updated.requiredApprovals}`
    );
    await refreshApprovals();
  }

  async function rejectApproval(id: string) {
    const updated = await client.rejectApproval(id, currentUserId, "Rejected by operator");
    pushToast("warning", "APPROVAL_REJECTED", `${updated.id} rejected by ${currentUserId}`);
    await refreshApprovals();
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
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshApprovals();
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
          currentUserId={currentUserId}
          onRefresh={() => void refreshApprovals()}
          onApprove={(id) => void approveApproval(id)}
          onReject={(id) => void rejectApproval(id)}
          onExecute={(action, approvalId) => void handleAction(action, approvalId)}
        />
      );
    }
    return <LogsPanel logs={dashboard.logs} />;
  }, [tab, dashboard.risk, dashboard.audit, dashboard.logs, pendingApprovals, selectedAuditId, currentUserId]);

  return (
    <div className="app-shell">
      <aside className="sidebar card">
        <div className="brand">Tourab Mission Control</div>
        <div className="nav-group">
          <button className="nav-item nav-active">Primary Bot</button>
          <button className="nav-item">BTC Operator</button>
          <button className="nav-item">ETH Operator</button>
        </div>
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
            <span
              className={`conn-badge ${
                dashboard.streamPaused || dashboard.connectionHealth === "degraded" ? "warn" : "ok"
              }`}
            >
              {connectionLabel}
            </span>
          </div>
        </header>

        <section className="status-row">
          <BotStatusCard state={dashboard.state} />
          <ControlDeck role={dashboard.role} state={dashboard.state.state} onAction={handleAction} />
          <ReconciliationCard status={dashboard.reconciliation} />
        </section>

        <EventStream
          events={dashboard.filteredEvents}
          quickFilter={dashboard.quickFilter}
          onQuickFilterChange={dashboard.setQuickFilter}
          symbolFilter={dashboard.symbolFilter}
          onSymbolFilterChange={dashboard.setSymbolFilter}
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
          <button className={`tab ${tab === "approvals" ? "tab-active" : ""}`} onClick={() => setTab("approvals")}>Approvals</button>
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
