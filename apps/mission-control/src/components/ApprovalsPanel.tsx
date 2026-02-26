import { useEffect, useState } from "react";
import type { ApprovalRequest, ControlAction, DemoQueuedIntent } from "../types";
import { ApprovalTradeCard } from "./ApprovalTradeCard";
import { deriveApprovalStatus } from "../logic/approvalLifecycle";

interface ApprovalsPanelProps {
  items: ApprovalRequest[];
  demoQueue: DemoQueuedIntent[];
  currentUserId: string;
  executedApprovalIds: ReadonlySet<string>;
  onRefresh: () => void;
  onApproveExecute: (action: ControlAction, id: string) => void;
  onReject: (id: string) => void;
}

export function ApprovalsPanel({
  items,
  demoQueue,
  currentUserId,
  executedApprovalIds,
  onRefresh,
  onApproveExecute,
  onReject,
}: ApprovalsPanelProps) {
  const [nowMs, setNowMs] = useState(Date.now());
  const [dismissedExpiredIds, setDismissedExpiredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  function formatRemaining(expiresAt: string): string {
    const remaining = Math.max(0, new Date(expiresAt).getTime() - nowMs);
    const totalSec = Math.floor(remaining / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  }

  function parseReasonTradeHints(reason?: string): { symbol?: string; side?: "buy" | "sell" } {
    if (!reason) {
      return {};
    }
    const symbol = reason.match(/\b([A-Z0-9]+-[A-Z0-9]+)\b/)?.[1];
    const sideRaw = reason.match(/\b(buy|sell)\b/i)?.[1]?.toLowerCase();
    const side = sideRaw === "buy" || sideRaw === "sell" ? sideRaw : undefined;
    return { symbol, side };
  }

  const visibleApprovals = items.filter((item) => {
    const uiStatus = deriveApprovalStatus(item, nowMs, executedApprovalIds);
    if (uiStatus !== "pending" && uiStatus !== "expired") {
      return false;
    }
    if (dismissedExpiredIds.has(item.id)) {
      return false;
    }

    // Keep non-trade approvals visible. For trade approvals, ensure essential trade fields exist.
    if (item.action !== "demo_order_submit") {
      return true;
    }

    const fromQueue = demoQueue.find((queued) => queued.approvalId === item.id);
    const fromReason = parseReasonTradeHints(item.reason);
    return Boolean(fromQueue?.symbol ?? fromReason.symbol) && Boolean(fromQueue?.side ?? fromReason.side);
  });

  return (
    <section className="panel-content" aria-label="Approvals panel">
      <div className="panel-head">
        <div className="panel-title">Approvals</div>
        <button className="btn btn-ghost" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="approvals-list">
        <article className="approval-card queue-panel">
          <div className="approval-head">
            <strong>Queued Demo Intents</strong>
            <span className={`tag ${demoQueue.length > 0 ? "sev-info" : "sev-warn"}`}>{demoQueue.length}</span>
          </div>
          {demoQueue.length === 0 ? <div className="approval-meta">No queued demo intents.</div> : null}
          {demoQueue.map((item) => (
            <div className="approval-meta queue-row" key={item.approvalId}>
              <strong>{item.symbol}</strong>
              <span className="queue-meta">{item.side.toUpperCase()}</span>
              <span className="queue-meta approval-value-mono">
                {item.qtyBase.toFixed(6)} @ {item.limitPrice.toFixed(4)}
              </span>
            </div>
          ))}
        </article>

        {visibleApprovals.length === 0 ? <div className="hint">No pending or expired approvals</div> : null}
        {visibleApprovals.map((item) => (
          <ApprovalTradeCard
            key={item.id}
            item={item}
            nowMs={nowMs}
            uiStatus={deriveApprovalStatus(item, nowMs, executedApprovalIds)}
            currentUserId={currentUserId}
            demoIntent={demoQueue.find((queued) => queued.approvalId === item.id)}
            formatRemaining={formatRemaining}
            onApproveExecute={onApproveExecute}
            onReject={onReject}
            onDismissExpired={(id) => {
              setDismissedExpiredIds((prev) => {
                const next = new Set(prev);
                next.add(id);
                return next;
              });
            }}
          />
        ))}
      </div>
    </section>
  );
}
