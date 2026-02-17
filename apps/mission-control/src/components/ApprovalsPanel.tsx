import { useEffect, useState } from "react";
import type { ApprovalRequest, ControlAction } from "../types";

interface ApprovalsPanelProps {
  items: ApprovalRequest[];
  currentUserId: string;
  onRefresh: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onExecute: (action: ControlAction, approvalId: string) => void;
}

export function ApprovalsPanel({ items, currentUserId, onRefresh, onApprove, onReject, onExecute }: ApprovalsPanelProps) {
  const [nowMs, setNowMs] = useState(Date.now());

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

  return (
    <section className="panel-content" aria-label="Approvals panel">
      <div className="panel-head">
        <div className="panel-title">Approvals</div>
        <button className="btn btn-ghost" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="approvals-list">
        {items.length === 0 ? <div className="hint">No approvals</div> : null}
        {items.map((item) => (
          <article key={item.id} className="approval-card">
            <div className="approval-head">
              <strong>{item.action}</strong>
              <span className={`tag ${item.status === "approved" ? "sev-info" : "sev-warn"}`}>{item.status}</span>
            </div>
            <div className="approval-meta">
              {item.approvalCount}/{item.requiredApprovals} approvals
            </div>
            {item.status === "pending" ? (
              <div className="approval-meta">
                Expires in: <strong>{formatRemaining(item.expiresAt)}</strong>
              </div>
            ) : (
              <div className="approval-meta">
                Decision at: <strong>{item.decidedAt ?? "n/a"}</strong>
              </div>
            )}
            <div className="approval-meta">
              Requested by: <strong>{item.requestedBy}</strong>
            </div>
            <div className="approval-meta">
              Approved by: {item.approvedBy.length > 0 ? item.approvedBy.join(", ") : "none"}
            </div>
            {item.action === "emergency_stop" && item.status !== "approved" ? (
              <div className="approval-meta">
                Emergency stop needs {item.requiredApprovals - item.approvalCount} more distinct approval(s).
              </div>
            ) : null}
            {item.reason ? <div className="approval-meta">Reason: {item.reason}</div> : null}
            {item.rejectedReason ? <div className="approval-meta">Rejected reason: {item.rejectedReason}</div> : null}
            <div className="approval-meta">ID: {item.id}</div>
            <div className="approval-actions">
              <button
                className="btn btn-primary"
                onClick={() => onApprove(item.id)}
                disabled={item.status !== "pending" || item.approvedBy.includes(currentUserId)}
              >
                Approve
              </button>
              <button className="btn btn-ghost" onClick={() => onReject(item.id)} disabled={item.status !== "pending"}>
                Reject
              </button>
              <button
                className="btn btn-danger"
                onClick={() => onExecute(item.action, item.id)}
                disabled={item.status !== "approved"}
              >
                Execute
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
