import type { ApprovalRequest, ControlAction, DemoQueuedIntent } from "../types";
import { ApprovalTechnicalDetails } from "./ApprovalTechnicalDetails";
import type { ApprovalLifecycleStatus } from "../logic/approvalLifecycle";

interface ApprovalTradeCardProps {
  item: ApprovalRequest;
  nowMs: number;
  uiStatus: ApprovalLifecycleStatus;
  currentUserId: string;
  demoIntent?: DemoQueuedIntent;
  formatRemaining: (expiresAt: string) => string;
  onApproveExecute: (action: ControlAction, id: string) => void;
  onReject: (id: string) => void;
  onDismissExpired: (id: string) => void;
}

interface ParsedReasonFields {
  symbol?: string;
  side?: "buy" | "sell";
  qtyBase?: number;
  limitPrice?: number;
  notionalUsd?: number;
  proposalId?: string;
  maxPositionUsd?: number;
  dailyLossCapUsd?: number;
}

const CONFIRM_NOTIONAL_THRESHOLD_USD = 1000;
const RISK_WARN_THRESHOLD_PCT = 80;

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseTradeReason(reason?: string): ParsedReasonFields {
  if (!reason) {
    return {};
  }
  const symbol = reason.match(/\b([A-Z0-9]+-[A-Z0-9]+)\b/)?.[1];
  const sideRaw = reason.match(/\b(buy|sell)\b/i)?.[1]?.toLowerCase();
  const side = sideRaw === "buy" || sideRaw === "sell" ? sideRaw : undefined;
  const qtyMatch = reason.match(/(?:qty(?:Base)?|size|sz)\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
  const priceMatch = reason.match(/(?:price|limitPrice|px)\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
  const notionalMatch = reason.match(/(?:notional(?:Usd)?|usd)\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
  const proposalId = reason.match(/proposal=([a-z0-9-]+)/i)?.[1];
  const maxPositionMatch = reason.match(/(?:maxPerOrder|maxPosition|maxExposure)(?:Notional)?(?:Usd)?\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
  const dailyLossMatch = reason.match(/(?:dailyCap|maxDailyLoss(?:Usd)?)\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
  const qtyBase = qtyMatch ? Number(qtyMatch[1]) : undefined;
  const limitPrice = priceMatch ? Number(priceMatch[1]) : undefined;
  const notionalUsd = notionalMatch ? Number(notionalMatch[1]) : undefined;
  const maxPositionUsd = maxPositionMatch ? Number(maxPositionMatch[1]) : undefined;
  const dailyLossCapUsd = dailyLossMatch ? Number(dailyLossMatch[1]) : undefined;
  return { symbol, side, qtyBase, limitPrice, notionalUsd, proposalId, maxPositionUsd, dailyLossCapUsd };
}

function fmtQty(value?: number): string {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return Number(value).toFixed(6);
}

function fmtPrice(value?: number): string {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  const amount = Number(value);
  if (amount >= 1000) {
    return amount.toFixed(2);
  }
  if (amount >= 1) {
    return amount.toFixed(4);
  }
  return amount.toFixed(6);
}

function fmtUsd(value?: number): string {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return `${Number(value).toFixed(2)} USDT`;
}

function sideBadgeClass(side?: "buy" | "sell"): string {
  if (side === "buy") {
    return "approval-side approval-side-buy";
  }
  if (side === "sell") {
    return "approval-side approval-side-sell";
  }
  return "approval-side approval-side-unknown";
}

function expiresClass(item: ApprovalRequest, nowMs: number): string {
  if (item.status !== "pending") {
    return "approval-expiry-neutral";
  }
  const remainingMs = Math.max(0, new Date(item.expiresAt).getTime() - nowMs);
  if (remainingMs < 30_000) {
    return "approval-expiry-critical";
  }
  if (remainingMs < 60_000) {
    return "approval-expiry-warn";
  }
  return "approval-expiry-neutral";
}

export function ApprovalTradeCard({
  item,
  nowMs,
  uiStatus,
  currentUserId,
  demoIntent,
  formatRemaining,
  onApproveExecute,
  onReject,
  onDismissExpired
}: ApprovalTradeCardProps) {
  const parsed = parseTradeReason(item.reason);
  const symbol = demoIntent?.symbol ?? parsed.symbol ?? item.action.replaceAll("_", " ").toUpperCase();
  const side = demoIntent?.side ?? parsed.side;
  const qtyBase = demoIntent?.qtyBase ?? parsed.qtyBase;
  const limitPrice = demoIntent?.limitPrice ?? parsed.limitPrice;
  const hasQtyAndPrice = isFiniteNumber(qtyBase) && isFiniteNumber(limitPrice);
  const notionalUsd = parsed.notionalUsd ?? (hasQtyAndPrice ? qtyBase * limitPrice : undefined);
  const [baseCcy, quoteCcy] = symbol.includes("-") ? symbol.split("-") : ["BASE", "QUOTE"];
  const maxPositionUsd = parsed.maxPositionUsd;
  const pctOfMaxPosition =
    isFiniteNumber(notionalUsd) && isFiniteNumber(maxPositionUsd) && maxPositionUsd > 0
      ? (notionalUsd / maxPositionUsd) * 100
      : undefined;
  const dailyLossCapUsd = parsed.dailyLossCapUsd;
  const dailyLossImpactPct =
    isFiniteNumber(notionalUsd) && isFiniteNumber(dailyLossCapUsd) && dailyLossCapUsd > 0
      ? (notionalUsd / dailyLossCapUsd) * 100
      : undefined;
  const nearMax = isFiniteNumber(pctOfMaxPosition)
    ? pctOfMaxPosition >= RISK_WARN_THRESHOLD_PCT
    : isFiniteNumber(notionalUsd) && notionalUsd >= CONFIRM_NOTIONAL_THRESHOLD_USD * 0.8;
  const riskTagClass = nearMax ? "approval-risk-tag approval-risk-tag-warn" : "approval-risk-tag approval-risk-tag-ok";
  const riskTagLabel = nearMax ? "Near Max Position" : "Within Limits";
  const needsConfirm =
    (isFiniteNumber(notionalUsd) && notionalUsd > CONFIRM_NOTIONAL_THRESHOLD_USD) ||
    (isFiniteNumber(pctOfMaxPosition) && pctOfMaxPosition > RISK_WARN_THRESHOLD_PCT);

  function handleApproveExecute() {
    if (uiStatus === "expired") {
      return;
    }
    if (needsConfirm) {
      const confirmed = window.confirm(
        `Confirm high-impact approval for ${symbol} (${side?.toUpperCase() ?? "N/A"}) notional ${fmtUsd(notionalUsd)}?`
      );
      if (!confirmed) {
        return;
      }
    }
    onApproveExecute(item.action, item.id);
  }

  return (
    <article className={`approval-card approval-trade-card ${uiStatus === "expired" ? "approval-card-expired" : ""}`}>
      <div className="approval-topline">
        <div className={sideBadgeClass(side)}>{side ? side.toUpperCase() : "N/A"}</div>
        <div className="approval-symbol">{symbol}</div>
        <span className={`tag ${uiStatus === "expired" ? "sev-warn" : "sev-info"}`}>{uiStatus}</span>
      </div>

      <div className="approval-metrics-grid">
        <div className="approval-metric">
          <span className="approval-metric-label">Quantity</span>
          <span className="approval-metric-value approval-value-mono">
            {fmtQty(qtyBase)} {baseCcy}
          </span>
        </div>
        <div className="approval-metric">
          <span className="approval-metric-label">Price</span>
          <span className="approval-metric-value approval-value-mono">
            {fmtPrice(limitPrice)} {quoteCcy}
          </span>
        </div>
        <div className="approval-metric">
          <span className="approval-metric-label">Notional</span>
          <span className="approval-metric-value approval-value-mono">~ {fmtUsd(notionalUsd)}</span>
        </div>
        <div className="approval-metric">
          <span className="approval-metric-label">Approvals</span>
          <span className="approval-metric-value approval-value-mono">
            {item.approvalCount}/{item.requiredApprovals}
          </span>
        </div>
      </div>

      <div className="approval-risk-block">
        <div className="approval-risk-head">
          <strong>Risk Snapshot</strong>
          <span className={riskTagClass}>{riskTagLabel}</span>
        </div>
        <ul className="approval-risk-list">
          <li>
            Post-trade position size: <span className="approval-value-mono">{fmtUsd(notionalUsd)}</span>
          </li>
          <li>
            % of max position:{" "}
            <span className="approval-value-mono">
              {isFiniteNumber(pctOfMaxPosition) ? `${pctOfMaxPosition.toFixed(1)}%` : "n/a"}
            </span>
          </li>
          <li>
            Daily loss impact:{" "}
            <span className="approval-value-mono">
              {isFiniteNumber(dailyLossImpactPct) ? `${dailyLossImpactPct.toFixed(1)}%` : "n/a"}
            </span>
          </li>
        </ul>
      </div>

      <div className="approval-metadata">
        <div className="approval-meta-line">
          Requested by: <strong>{item.requestedBy}</strong>
        </div>
        {uiStatus === "pending" || uiStatus === "expired" ? (
          <div className={`approval-meta-line ${uiStatus === "expired" ? "approval-expiry-critical" : expiresClass(item, nowMs)}`}>
            Expires in: <strong>{formatRemaining(item.expiresAt)}</strong>
          </div>
        ) : (
          <div className="approval-meta-line">
            Decision at: <strong>{item.decidedAt ?? "n/a"}</strong>
          </div>
        )}
      </div>

      <div className="approval-actions approval-actions-priority">
        <button
          className="btn btn-primary approval-btn-approve"
          onClick={handleApproveExecute}
          disabled={uiStatus !== "pending" || item.approvedBy.includes(currentUserId)}
        >
          {item.status === "approved" ? "Execute" : "Approve & Execute"}
        </button>
        <button className="btn btn-ghost approval-btn-reject" onClick={() => onReject(item.id)} disabled={uiStatus !== "pending"}>
          Reject
        </button>
        {uiStatus === "expired" ? (
          <button className="btn btn-ghost" onClick={() => onDismissExpired(item.id)}>
            Dismiss
          </button>
        ) : null}
      </div>

      {item.action === "emergency_stop" && item.status !== "approved" ? (
        <div className="approval-meta">
          Emergency stop needs {item.requiredApprovals - item.approvalCount} more distinct approval(s).
        </div>
      ) : null}
      {item.approvedBy.length > 0 ? <div className="approval-meta">Approved by: {item.approvedBy.join(", ")}</div> : null}

      <ApprovalTechnicalDetails item={item} demoIntent={demoIntent} parsed={parsed} />
    </article>
  );
}
