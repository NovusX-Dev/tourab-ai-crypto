import { formatTime } from "../format";
import type { AuditItem, EventType } from "../types";

interface AuditTimelineProps {
  items: AuditItem[];
  selectedId?: string;
  onSelect: (item: AuditItem) => void;
  onClear: () => void;
}

export function AuditTimeline({ items, selectedId, onSelect, onClear }: AuditTimelineProps) {
  return (
    <section className="panel-content" aria-label="Audit timeline">
      <div className="panel-head">
        <div className="panel-title">Mission Log</div>
        <button className="btn btn-ghost" onClick={onClear}>
          Clear highlight
        </button>
      </div>
      <div className="timeline">
        {items.map((item) => (
          <button
            key={item.id}
            className={`timeline-item ${selectedId === item.id ? "selected" : ""}`}
            onClick={() => onSelect(item)}
          >
            <div className="timeline-at">{formatTime(item.at)}</div>
            <div className="timeline-body">
              <div className="timeline-title">{item.title}</div>
              <div className="timeline-detail">{item.detail}</div>
              {item.relatedEventType ? <div className="tag">{item.relatedEventType as EventType}</div> : null}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
