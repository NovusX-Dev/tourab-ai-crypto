import { formatTime } from "../format";
import type { OpenOrdersStatus } from "../types";

interface OrdersPanelProps {
  openOrders: OpenOrdersStatus;
}

function formatOrderTime(raw: string): string {
  const asEpoch = Number(raw);
  if (Number.isFinite(asEpoch) && asEpoch > 0) {
    return formatTime(new Date(asEpoch).toISOString());
  }
  const asDate = Date.parse(raw);
  if (Number.isFinite(asDate)) {
    return formatTime(new Date(asDate).toISOString());
  }
  return raw;
}

export function OrdersPanel({ openOrders }: OrdersPanelProps) {
  return (
    <section className="panel-content" aria-label="Open orders panel">
      <div className="panel-head">
        <div className="panel-title">Open Orders</div>
        <span className="tag">{`${openOrders.orders.length} open`}</span>
      </div>
      <div className="hint">{`Updated: ${formatTime(openOrders.lastUpdatedAt)}`}</div>
      {openOrders.lastError ? <div className="inline-card">{openOrders.lastError}</div> : null}

      <div className="orders-list">
        {openOrders.orders.length === 0 ? <div className="hint">No open orders.</div> : null}
        {openOrders.orders.map((order) => (
          <article key={`${order.ordId}-${order.instId}`} className="order-row">
            <div className="order-main">
              <strong>{order.instId}</strong>
              <span className={`tag ${order.side === "buy" ? "sev-info" : "sev-warn"}`}>{order.side}</span>
              <span className="tag">{order.state}</span>
            </div>
            <div className="order-meta">{`Px ${order.px} | Sz ${order.sz} | Fill ${order.accFillSz}`}</div>
            <div className="order-meta">{`Ord ${order.ordId}`}</div>
            <div className="order-meta">{`Updated ${formatOrderTime(order.uTime)}`}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
