import { describe, expect, it } from "vitest";
import {
  evaluateAutoExitStaleCancelAction,
  resolveManagedTradeMark,
  resolveManagedTradeExitOrderType,
  shouldAttemptAmendLiveExitOrder
} from "../apps/dashboard/src/mission-control-server.js";

describe("evaluateAutoExitStaleCancelAction", () => {
  it("retries exit while flatten escalation has not been reached", () => {
    const result = evaluateAutoExitStaleCancelAction({
      exitRepriceCount: 2,
      autoExitMaxReprices: 8,
      forcedFlattenEscalated: false,
      exitReason: "time_stop"
    });

    expect(result).toBe("retry_exit");
  });

  it("forces closure once flatten escalation is active", () => {
    const result = evaluateAutoExitStaleCancelAction({
      exitRepriceCount: 9,
      autoExitMaxReprices: 8,
      forcedFlattenEscalated: true,
      exitReason: "flatten"
    });

    expect(result).toBe("force_close");
  });

  it("forces closure when flatten reprices have already reached the max", () => {
    const result = evaluateAutoExitStaleCancelAction({
      exitRepriceCount: 8,
      autoExitMaxReprices: 8,
      forcedFlattenEscalated: false,
      exitReason: "flatten"
    });

    expect(result).toBe("force_close");
  });

  it("forces closure for repeated stale time-stop exits before the generic max-reprice ceiling", () => {
    const result = evaluateAutoExitStaleCancelAction({
      exitRepriceCount: 3,
      autoExitMaxReprices: 8,
      forcedFlattenEscalated: false,
      exitReason: "time_stop"
    });

    expect(result).toBe("force_close");
  });

  it("uses market exits for take-profit after the trigger fires", () => {
    expect(
      resolveManagedTradeExitOrderType({
        exitReason: "take_profit",
        exitRepriceCount: 0,
        forcedFlattenEscalated: false,
        exitSide: "sell"
      })
    ).toBe("market");
    expect(
      shouldAttemptAmendLiveExitOrder({
        exitReason: "take_profit",
        exitRepriceCount: 1,
        forcedFlattenEscalated: false,
        exitSide: "sell"
      })
    ).toBe(false);
  });

  it("uses market for buy-side TP/SL exits immediately after the trigger fires", () => {
    expect(
      resolveManagedTradeExitOrderType({
        exitReason: "take_profit",
        exitRepriceCount: 0,
        forcedFlattenEscalated: false,
        exitSide: "buy"
      })
    ).toBe("market");
    expect(
      resolveManagedTradeExitOrderType({
        exitReason: "time_stop",
        exitRepriceCount: 0,
        forcedFlattenEscalated: false,
        exitSide: "buy"
      })
    ).toBe("market");
  });

  it("uses market for the initial sell-side stop-loss submit too", () => {
    expect(
      resolveManagedTradeExitOrderType({
        exitReason: "stop_loss",
        exitRepriceCount: 0,
        forcedFlattenEscalated: false,
        exitSide: "sell"
      })
    ).toBe("market");
  });

  it("uses market exits for sell-side time-stop safety closes", () => {
    expect(
      resolveManagedTradeExitOrderType({
        exitReason: "time_stop",
        exitRepriceCount: 0,
        forcedFlattenEscalated: false,
        exitSide: "sell"
      })
    ).toBe("market");
  });

  it("prefers live market last over stale fill-derived stream marks for exit triggers", () => {
    expect(
      resolveManagedTradeMark({
        streamMark: 67952,
        marketLast: 69151.5,
        cachedLast: 69090,
        fallbackEntryAvgPrice: 69136.3
      })
    ).toBe(69151.5);
  });

  it("prefers cached live prices over stale fill-derived stream marks when no fresh market tick is available", () => {
    expect(
      resolveManagedTradeMark({
        streamMark: 67952,
        cachedLast: 69090,
        fallbackEntryAvgPrice: 69136.3
      })
    ).toBe(69090);
  });
});
