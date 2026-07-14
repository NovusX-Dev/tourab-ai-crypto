import { describe, expect, it } from "vitest";
import { evaluateManagedTradeEntryAging } from "../apps/dashboard/src/mission-control-server.js";

describe("evaluateManagedTradeEntryAging", () => {
  it("marks zero-fill orders canceled when they are no longer pending at the venue", () => {
    const result = evaluateManagedTradeEntryAging({
      status: "entry_submitted",
      requestedQty: 0.00001,
      entryFilledQty: 0,
      submittedAt: "2026-03-17T14:00:00.000Z",
      nowIso: "2026-03-17T14:02:00.000Z",
      hasSubmittedOrder: true,
      isPendingAtVenue: false,
      staleTimeoutSec: 60
    });

    expect(result.action).toBe("mark_canceled");
  });

  it("cancels fully unfilled orders once the stale timeout is exceeded", () => {
    const result = evaluateManagedTradeEntryAging({
      status: "entry_submitted",
      requestedQty: 0.00001,
      entryFilledQty: 0,
      submittedAt: "2026-03-17T14:00:00.000Z",
      nowIso: "2026-03-17T14:01:30.000Z",
      hasSubmittedOrder: true,
      isPendingAtVenue: true,
      staleTimeoutSec: 60
    });

    expect(result.action).toBe("cancel_unfilled");
  });

  it("cancels only the remainder for stale partial fills", () => {
    const result = evaluateManagedTradeEntryAging({
      status: "entry_partially_filled",
      requestedQty: 0.001,
      entryFilledQty: 0.0004,
      submittedAt: "2026-03-17T14:00:00.000Z",
      nowIso: "2026-03-17T14:01:30.000Z",
      hasSubmittedOrder: true,
      isPendingAtVenue: true,
      staleTimeoutSec: 60
    });

    expect(result.action).toBe("cancel_remainder");
  });

  it("does nothing before the stale timeout is exceeded", () => {
    const result = evaluateManagedTradeEntryAging({
      status: "entry_submitted",
      requestedQty: 0.00001,
      entryFilledQty: 0,
      submittedAt: "2026-03-17T14:00:00.000Z",
      nowIso: "2026-03-17T14:00:20.000Z",
      hasSubmittedOrder: true,
      isPendingAtVenue: true,
      staleTimeoutSec: 60
    });

    expect(result.action).toBe("none");
  });

  it("does nothing for planned trades that have not been submitted to the venue", () => {
    const result = evaluateManagedTradeEntryAging({
      status: "planned",
      requestedQty: 0.00001,
      entryFilledQty: 0,
      submittedAt: "2026-03-17T14:00:00.000Z",
      nowIso: "2026-03-17T14:02:00.000Z",
      hasSubmittedOrder: false,
      isPendingAtVenue: false,
      staleTimeoutSec: 60
    });

    expect(result.action).toBe("none");
  });
});
