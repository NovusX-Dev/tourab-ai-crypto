import { describe, expect, it } from "vitest";
import { OkxApiError, OkxDemoAdapter } from "@tourab/okx-demo-adapter";
import { ExecutionIntent } from "@tourab/shared";

const demoConfig = {
  apiKey: "demo-key",
  apiSecret: "demo-secret",
  passphrase: "demo-pass",
  baseUrl: "https://www.okx.com"
};

const intent: ExecutionIntent = {
  proposalId: "proposal-abc",
  symbol: "BTC-USDT",
  side: "buy",
  qtyBase: 0.0001,
  limitPrice: 100000
};

describe("OkxDemoAdapter", () => {
  it("sends signed demo order request with required headers", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ ordId: "111", clOrdId: "tourab-proposal-abc", sCode: "0", sMsg: "" }]
        }),
        { status: 200 }
      );
    };

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock, () => new Date("2026-02-16T00:00:00.000Z"));
    const result = await adapter.placeSpotLimitOrder(intent);

    expect(result.ordId).toBe("111");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://www.okx.com/api/v5/trade/order");
    expect(calls[0].init?.method).toBe("POST");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers["x-simulated-trading"]).toBe("1");
    expect(headers["OK-ACCESS-KEY"]).toBe("demo-key");
    expect(headers["OK-ACCESS-SIGN"]).toBeTruthy();
  });

  it("throws OKX_ORDER_REJECTED when exchange rejects order", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ ordId: "", clOrdId: "tourab-proposal-abc", sCode: "51000", sMsg: "Order failed" }]
        }),
        { status: 200 }
      );

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock);
    await expect(adapter.placeSpotLimitOrder(intent)).rejects.toMatchObject({
      code: "OKX_ORDER_REJECTED"
    });
  });

  it("calls private balance endpoint with signed demo headers", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ totalEq: "25.0", details: [{ ccy: "USDT", availBal: "25", cashBal: "25", eq: "25" }] }]
        }),
        { status: 200 }
      );
    };

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock, () => new Date("2026-02-16T00:00:00.000Z"));
    const balance = await adapter.getAccountBalance("USDT");

    expect(balance.totalEq).toBe("25.0");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://www.okx.com/api/v5/account/balance?ccy=USDT");
    expect(calls[0].init?.method).toBe("GET");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers["x-simulated-trading"]).toBe("1");
    expect(headers["OK-ACCESS-SIGN"]).toBeTruthy();
  });
});
