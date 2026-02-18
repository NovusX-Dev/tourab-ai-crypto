import { describe, expect, it } from "vitest";
import { OkxApiError, OkxDemoAdapter, loadOkxDemoConfigFromEnv, validateOkxDemoEnv } from "@tourab/okx-demo-adapter";
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

  it("fetches pending orders from trade/orders-pending", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [
            {
              ordId: "o1",
              clOrdId: "c1",
              instId: "BTC-USDT",
              side: "buy",
              px: "68000",
              sz: "0.0001",
              accFillSz: "0",
              state: "live",
              cTime: "1",
              uTime: "1"
            }
          ]
        }),
        { status: 200 }
      );
    };

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock);
    const orders = await adapter.getPendingOrders("BTC-USDT");
    expect(orders).toHaveLength(1);
    expect(calls[0].url).toContain("/api/v5/trade/orders-pending");
  });

  it("cancels an order through trade/cancel-order", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ ordId: "o1", clOrdId: "c1", sCode: "0", sMsg: "" }]
        }),
        { status: 200 }
      );
    };

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock);
    const result = await adapter.cancelOrder({ instId: "BTC-USDT", ordId: "o1" });
    expect(result.ordId).toBe("o1");
    expect(calls[0].url).toBe("https://www.okx.com/api/v5/trade/cancel-order");
    expect(calls[0].init?.method).toBe("POST");
  });

  it("validates demo env and trims values", () => {
    const result = validateOkxDemoEnv({
      OKX_TRADING_MODE: "demo",
      OKX_DEMO_API_KEY: "  demo-key  ",
      OKX_DEMO_API_SECRET: "  demo-secret ",
      OKX_DEMO_PASSPHRASE: " demo-pass ",
      OKX_DEMO_BASE_URL: " https://www.okx.com "
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.config.apiKey).toBe("demo-key");
    expect(result.config.apiSecret).toBe("demo-secret");
    expect(result.config.passphrase).toBe("demo-pass");
    expect(result.config.baseUrl).toBe("https://www.okx.com");
  });

  it("flags conflicting passphrase aliases", () => {
    const result = validateOkxDemoEnv({
      OKX_TRADING_MODE: "demo",
      OKX_DEMO_API_KEY: "demo-key",
      OKX_DEMO_API_SECRET: "demo-secret",
      OKX_DEMO_API_PASSPHRASE: "pass-a",
      OKX_DEMO_PASSPHRASE: "pass-b"
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((item) => item.code === "PASSPHRASE_CONFLICT")).toBe(true);
  });

  it("throws config error with issues when env is invalid", () => {
    expect(() =>
      loadOkxDemoConfigFromEnv({
        OKX_TRADING_MODE: "demo",
        OKX_DEMO_API_KEY: "your_demo_api_key",
        OKX_DEMO_API_SECRET: "",
        OKX_DEMO_PASSPHRASE: ""
      })
    ).toThrowError(OkxApiError);

    try {
      loadOkxDemoConfigFromEnv({
        OKX_TRADING_MODE: "demo",
        OKX_DEMO_API_KEY: "your_demo_api_key",
        OKX_DEMO_API_SECRET: "",
        OKX_DEMO_PASSPHRASE: ""
      });
      throw new Error("expected config error");
    } catch (error: unknown) {
      const typed = error as OkxApiError;
      expect(typed.code).toBe("OKX_CONFIG_ERROR");
      const issues = typed.details?.issues as Array<{ code: string }> | undefined;
      expect(Array.isArray(issues)).toBe(true);
      expect(issues?.some((item) => item.code === "PLACEHOLDER_VALUE")).toBe(true);
      expect(issues?.some((item) => item.code === "MISSING_API_SECRET")).toBe(true);
      expect(issues?.some((item) => item.code === "MISSING_PASSPHRASE")).toBe(true);
    }
  });
});
