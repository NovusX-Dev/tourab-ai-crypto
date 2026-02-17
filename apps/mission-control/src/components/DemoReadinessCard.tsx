interface ReadinessItem {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

interface DemoReadinessCardProps {
  items: ReadinessItem[];
  compact?: boolean;
}

export function DemoReadinessCard({ items, compact = false }: DemoReadinessCardProps) {
  const allOk = items.every((item) => item.ok);

  return (
    <section className={`card readiness-card ${compact ? "readiness-card-compact" : ""}`.trim()} aria-label="Demo readiness">
      <div className="panel-head">
        <div className="panel-title">Demo Readiness</div>
        <span className={`status-pill ${allOk ? "status-running" : "status-paused"}`}>{allOk ? "READY" : "NOT READY"}</span>
      </div>
      {compact ? (
        <ul className="readiness-checklist">
          {items.map((item) => (
            <li key={item.key} className={`readiness-check ${item.ok ? "ready" : "not-ready"}`} title={item.detail}>
              <span className="check-dot" aria-hidden="true">{item.ok ? "✓" : "!"}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="readiness-list">
          {items.map((item) => (
            <article key={item.key} className="readiness-item">
              <span className={`tag ${item.ok ? "sev-info" : "sev-warn"}`}>{item.ok ? "PASS" : "FAIL"}</span>
              <strong>{item.label}</strong>
              <span className="timeline-detail">{item.detail}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
