import type { ApprovalRequest, DemoQueuedIntent } from "../types";

interface ApprovalTechnicalDetailsProps {
  item: ApprovalRequest;
  demoIntent?: DemoQueuedIntent;
  parsed: {
    proposalId?: string;
    side?: "buy" | "sell";
    qtyBase?: number;
    limitPrice?: number;
    symbol?: string;
    maxPositionUsd?: number;
    dailyLossCapUsd?: number;
  };
}

function formatMaybeNumber(value?: number, digits = 4): string {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return Number(value).toFixed(digits);
}

export function ApprovalTechnicalDetails({ item, demoIntent, parsed }: ApprovalTechnicalDetailsProps) {
  return (
    <details className="approval-tech">
      <summary>Technical Details</summary>
      <div className="approval-tech-grid">
        <div className="approval-tech-key">Approval ID</div>
        <div className="approval-tech-value approval-value-mono">{item.id}</div>
        <div className="approval-tech-key">Action</div>
        <div className="approval-tech-value approval-value-mono">{item.action}</div>
        <div className="approval-tech-key">Proposal ID</div>
        <div className="approval-tech-value approval-value-mono">{demoIntent?.proposalId ?? parsed.proposalId ?? "n/a"}</div>
        <div className="approval-tech-key">Symbol</div>
        <div className="approval-tech-value">{demoIntent?.symbol ?? parsed.symbol ?? "n/a"}</div>
        <div className="approval-tech-key">Side</div>
        <div className="approval-tech-value">{(demoIntent?.side ?? parsed.side ?? "n/a").toString().toUpperCase()}</div>
        <div className="approval-tech-key">Qty</div>
        <div className="approval-tech-value approval-value-mono">{formatMaybeNumber(demoIntent?.qtyBase ?? parsed.qtyBase, 6)}</div>
        <div className="approval-tech-key">Price</div>
        <div className="approval-tech-value approval-value-mono">{formatMaybeNumber(demoIntent?.limitPrice ?? parsed.limitPrice, 6)}</div>
        <div className="approval-tech-key">Max Position USD</div>
        <div className="approval-tech-value approval-value-mono">{formatMaybeNumber(parsed.maxPositionUsd, 2)}</div>
        <div className="approval-tech-key">Daily Loss Cap USD</div>
        <div className="approval-tech-value approval-value-mono">{formatMaybeNumber(parsed.dailyLossCapUsd, 2)}</div>
        <div className="approval-tech-key">Raw Reason</div>
        <div className="approval-tech-value approval-value-mono">{item.reason ?? "n/a"}</div>
        <div className="approval-tech-key">Rejected Reason</div>
        <div className="approval-tech-value approval-value-mono">{item.rejectedReason ?? "n/a"}</div>
      </div>
    </details>
  );
}
