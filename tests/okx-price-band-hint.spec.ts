import { describe, expect, it } from "vitest";
import { parseOkxPriceBandHint } from "../apps/dashboard/src/mission-control-server.js";

describe("parseOkxPriceBandHint", () => {
  it("extracts the trailing price hint from OKX sell-leg errors", () => {
    expect(parseOkxPriceBandHint("The lowest price limit for the sell leg is 73,937.1.")).toBe(73937.1);
  });

  it("returns undefined when no numeric hint is present", () => {
    expect(parseOkxPriceBandHint("Order cancellation failed as the order has been filled, canceled or does not exist.")).toBeUndefined();
  });
});
