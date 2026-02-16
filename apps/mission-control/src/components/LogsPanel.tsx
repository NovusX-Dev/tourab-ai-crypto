import { useMemo, useState } from "react";
import { formatTime } from "../format";
import type { LogEntry } from "../types";

interface LogsPanelProps {
  logs: LogEntry[];
}

export function LogsPanel({ logs }: LogsPanelProps) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<"all" | "info" | "warn" | "error">("all");
  const [symbol, setSymbol] = useState("");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (severity !== "all" && log.severity !== severity) {
        return false;
      }
      if (symbol && log.symbol !== symbol) {
        return false;
      }
      if (query && !log.message.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [logs, query, severity, symbol]);

  return (
    <section className="panel-content" aria-label="Logs panel">
      <div className="panel-title">Logs</div>
      <div className="log-filters">
        <input placeholder="Search logs" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)}>
          <option value="all">All levels</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <input
          placeholder="Symbol"
          value={symbol}
          onChange={(event) => setSymbol(event.target.value.toUpperCase())}
        />
      </div>
      <div className="logs-list">
        {filtered.map((log) => (
          <article className="log-row" key={log.id}>
            <span>{formatTime(log.at)}</span>
            <span className={`tag sev-${log.severity}`}>{log.severity.toUpperCase()}</span>
            <span>{log.symbol || "-"}</span>
            <span>{log.message}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
