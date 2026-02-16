import { useEffect, useMemo, useState } from "react";
import type { BotApiClient } from "../api/BotApiClient";
import type { AuditItem, BotEvent, BotStateSnapshot, LogEntry, ReconciliationStatus, RiskStatus, UserRole } from "../types";
import { filterEvents, type EventFilterInput, type QuickFilter } from "../logic/eventFilters";

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

export function useDashboardData(client: BotApiClient) {
  const [state, setState] = useState<BotStateSnapshot>(EMPTY_STATE);
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [risk, setRisk] = useState<RiskStatus>(EMPTY_RISK);
  const [reconciliation, setReconciliation] = useState<ReconciliationStatus>(EMPTY_RECON);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [role, setRole] = useState<UserRole>("operator");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [symbolFilter, setSymbolFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<EventFilterInput["severity"]>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventFilterInput["eventType"]>("all");
  const [pinnedSymbol, setPinnedSymbol] = useState<string>("");
  const [streamPaused, setStreamPaused] = useState(false);

  useEffect(() => {
    let mounted = true;
    void client.getSnapshot().then((snapshot) => {
      if (!mounted) {
        return;
      }
      setState(snapshot.state);
      setEvents(snapshot.events);
      setRisk(snapshot.risk);
      setReconciliation(snapshot.reconciliation);
      setAudit(snapshot.audit);
      setLogs(snapshot.logs);
    });

    const unsubscribe = client.subscribeToEvents((event) => {
      if (streamPaused) {
        return;
      }
      setEvents((prev) => [event, ...prev].slice(0, 400));
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
    });

    return () => {
      mounted = false;
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
    audit,
    logs,
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
    setStreamPaused
  };
}
