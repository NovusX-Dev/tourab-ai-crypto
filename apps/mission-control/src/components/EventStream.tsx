import { useEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "../format";
import { isPinnedEvent, type QuickFilter } from "../logic/eventFilters";
import type { BotEvent, EventSeverity, EventType } from "../types";

interface EventStreamProps {
  events: BotEvent[];
  quickFilter: QuickFilter;
  onQuickFilterChange: (next: QuickFilter) => void;
  symbolFilter: string;
  onSymbolFilterChange: (next: string) => void;
  symbolFilterLocked?: boolean;
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
const EVENT_ROW_HEIGHT_PX = 96;
const OVERSCAN_ROWS = 8;

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
    symbolFilterLocked,
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
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(420);

  useEffect(() => {
    if (!autoScroll || !scrollerRef.current) {
      return;
    }
    scrollerRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [events, autoScroll]);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) {
      return;
    }
    const update = () => {
      setViewportHeight(element.clientHeight);
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        update();
      });
      observer.observe(element);
      return () => {
        observer.disconnect();
      };
    }
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
    };
  }, []);

  const knownTypes = useMemo(() => {
    const types = Array.from(new Set(events.map((event) => event.type)));
    return ["all", ...types] as Array<EventType | "all">;
  }, [events]);

  const visibleCount = Math.ceil(viewportHeight / EVENT_ROW_HEIGHT_PX);
  const windowStart = Math.max(0, Math.floor(scrollTop / EVENT_ROW_HEIGHT_PX) - OVERSCAN_ROWS);
  const windowEnd = Math.min(events.length, windowStart + visibleCount + OVERSCAN_ROWS * 2);
  const windowedEvents = events.slice(windowStart, windowEnd);
  const totalHeightPx = events.length * EVENT_ROW_HEIGHT_PX;

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
          placeholder={symbolFilterLocked ? "Symbol scope locked" : "Filter symbol"}
          disabled={symbolFilterLocked}
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

      <div
        className="event-list"
        ref={scrollerRef}
        onScroll={(event) => setScrollTop((event.currentTarget as HTMLDivElement).scrollTop)}
      >
        <div className="event-virtual-spacer" style={{ height: `${totalHeightPx}px` }}>
          {windowedEvents.map((event, index) => {
            const topPx = (windowStart + index) * EVENT_ROW_HEIGHT_PX;
            const tags = event.tags || [];
            const visibleTags = tags.slice(0, 2);
            const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
          const pinned = isPinnedEvent(event, pinnedSymbol || undefined);
          const highlighted =
            (highlightedEventType && event.type === highlightedEventType) ||
            (highlightedSymbol && event.symbol === highlightedSymbol);
          return (
            <article
              key={event.id}
              className={`event-row ${pinned ? "event-pinned" : ""} ${highlighted ? "event-highlight" : ""}`}
              style={{ transform: `translateY(${topPx}px)` }}
            >
              <div className="event-time">{formatTime(event.timestamp)}</div>
              <div className={`event-type ${eventBadgeClass(event.severity)}`}>{event.type}</div>
              <div className="event-symbol">{event.symbol}</div>
              <div className="event-message" title={event.message}>{event.message}</div>
              <div className="event-tags">
                {visibleTags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
                {hiddenTagCount > 0 ? <span className="tag">{`+${hiddenTagCount}`}</span> : null}
              </div>
              <button className="pin-btn" onClick={() => onPinSymbol(event.symbol)}>
                {pinnedSymbol === event.symbol ? "Unpin" : "Pin"}
              </button>
            </article>
          );
          })}
        </div>
      </div>
    </section>
  );
}
