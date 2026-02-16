import { useEffect, useMemo, useRef } from "react";
import { formatTime } from "../format";
import { isPinnedEvent, type QuickFilter } from "../logic/eventFilters";
import type { BotEvent, EventSeverity, EventType } from "../types";

interface EventStreamProps {
  events: BotEvent[];
  quickFilter: QuickFilter;
  onQuickFilterChange: (next: QuickFilter) => void;
  symbolFilter: string;
  onSymbolFilterChange: (next: string) => void;
  severityFilter: EventSeverity | "all";
  onSeverityFilterChange: (next: EventSeverity | "all") => void;
  eventTypeFilter: EventType | "all";
  onEventTypeFilterChange: (next: EventType | "all") => void;
  pinnedSymbol: string;
  onPinSymbol: (symbol: string) => void;
  streamPaused: boolean;
  onToggleStreamPaused: () => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  highlightedEventType?: EventType;
  highlightedSymbol?: string;
}

const QUICK_FILTERS: QuickFilter[] = ["all", "orders", "risk", "errors", "system"];

function eventBadgeClass(severity: EventSeverity): string {
  if (severity === "error") {
    return "sev-error";
  }
  if (severity === "warn") {
    return "sev-warn";
  }
  return "sev-info";
}

export function EventStream(props: EventStreamProps) {
  const {
    events,
    quickFilter,
    onQuickFilterChange,
    symbolFilter,
    onSymbolFilterChange,
    severityFilter,
    onSeverityFilterChange,
    eventTypeFilter,
    onEventTypeFilterChange,
    pinnedSymbol,
    onPinSymbol,
    streamPaused,
    onToggleStreamPaused,
    autoScroll,
    onToggleAutoScroll,
    highlightedEventType,
    highlightedSymbol
  } = props;

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!autoScroll || !scrollerRef.current) {
      return;
    }
    scrollerRef.current.scrollTop = 0;
  }, [events, autoScroll]);

  const knownTypes = useMemo(() => {
    const types = Array.from(new Set(events.map((event) => event.type)));
    return ["all", ...types] as Array<EventType | "all">;
  }, [events]);

  return (
    <section className="card event-stream" aria-label="Event stream">
      <div className="panel-head">
        <div className="panel-title">Event Stream</div>
        <div className="panel-controls">
          <button className="btn btn-ghost" onClick={onToggleStreamPaused}>
            {streamPaused ? "Resume Stream" : "Pause Stream"}
          </button>
          <button className="btn btn-ghost" onClick={onToggleAutoScroll}>
            {autoScroll ? "Auto-scroll On" : "Auto-scroll Off"}
          </button>
        </div>
      </div>

      <div className="event-filters">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter}
            className={`chip ${quickFilter === filter ? "chip-active" : ""}`}
            onClick={() => onQuickFilterChange(filter)}
          >
            {filter}
          </button>
        ))}

        <input
          value={symbolFilter}
          placeholder="Filter symbol"
          onChange={(event) => onSymbolFilterChange(event.target.value.toUpperCase())}
        />

        <select
          value={severityFilter}
          onChange={(event) => onSeverityFilterChange(event.target.value as EventSeverity | "all")}
        >
          <option value="all">All severities</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>

        <select value={eventTypeFilter} onChange={(event) => onEventTypeFilterChange(event.target.value as EventType | "all")}>
          {knownTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="event-list" ref={scrollerRef}>
        {events.map((event) => {
          const pinned = isPinnedEvent(event, pinnedSymbol || undefined);
          const highlighted =
            (highlightedEventType && event.type === highlightedEventType) ||
            (highlightedSymbol && event.symbol === highlightedSymbol);
          return (
            <article
              key={event.id}
              className={`event-row ${pinned ? "event-pinned" : ""} ${highlighted ? "event-highlight" : ""}`}
            >
              <div className="event-time">{formatTime(event.timestamp)}</div>
              <div className={`event-type ${eventBadgeClass(event.severity)}`}>{event.type}</div>
              <div className="event-symbol">{event.symbol}</div>
              <div className="event-message">{event.message}</div>
              <div className="event-tags">
                {(event.tags || []).map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <button className="pin-btn" onClick={() => onPinSymbol(event.symbol)}>
                {pinnedSymbol === event.symbol ? "Unpin" : "Pin"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
