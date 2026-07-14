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

  it("recovers duplicate client order id by reconciling the existing pending order", async () => {
    const calls: string[] = [];
    let generatedClOrdId = "";
    const fetchMock: typeof fetch = async (url, init) => {
      const asString = String(url);
      calls.push(asString);
      if (asString.endsWith("/api/v5/trade/order")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { clOrdId?: string };
        generatedClOrdId = String(body.clOrdId ?? "");
        return new Response(
          JSON.stringify({
            code: "0",
            msg: "",
            data: [{ ordId: "", clOrdId: "", sCode: "51016", sMsg: "Client order ID already exists." }]
          }),
          { status: 200 }
        );
      }
      if (asString.includes("/api/v5/trade/orders-pending?instType=SPOT&instId=BTC-USDT")) {
        return new Response(
          JSON.stringify({
            code: "0",
            msg: "",
            data: [
              {
                ordId: "existing-ord-1",
                clOrdId: generatedClOrdId,
                instId: "BTC-USDT",
                side: "buy",
                px: "100000",
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
      }
      throw new Error(`unexpected url ${asString}`);
    };

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock);
    const result = await adapter.placeSpotLimitOrder(intent);

    expect(result.ordId).toBe("existing-ord-1");
    expect(calls.some((item) => item.endsWith("/api/v5/trade/order"))).toBe(true);
    expect(calls.some((item) => item.includes("/api/v5/trade/orders-pending?instType=SPOT&instId=BTC-USDT"))).toBe(true);
  });

  it("uses distinct clOrdId values for long proposal IDs that share a prefix", async () => {
    const calls: string[] = [];
    const fetchMock: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { clOrdId?: string };
      calls.push(String(body.clOrdId ?? ""));
      return new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ ordId: "111", clOrdId: String(body.clOrdId ?? ""), sCode: "0", sMsg: "" }]
        }),
        { status: 200 }
      );
    };

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock);
    const intentA: ExecutionIntent = {
      ...intent,
      proposalId: "trade-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa-time_stop-0-1771492279281"
    };
    const intentB: ExecutionIntent = {
      ...intent,
      proposalId: "trade-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa-time_stop-0-1771492279282"
    };
    await adapter.placeSpotLimitOrder(intentA);
    await adapter.placeSpotLimitOrder(intentB);

    expect(calls).toHaveLength(2);
    expect(calls[0]).not.toBe(calls[1]);
    expect(calls[0].length).toBeLessThanOrEqual(32);
    expect(calls[1].length).toBeLessThanOrEqual(32);
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

  it("amends an order through trade/amend-order", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ ordId: "o1", clOrdId: "c1", reqId: "r1", sCode: "0", sMsg: "" }]
        }),
        { status: 200 }
      );
    };

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock);
    const result = await adapter.amendOrder({ instId: "BTC-USDT", ordId: "o1", newPx: 99999, reqId: "r1" });
    expect(result.ordId).toBe("o1");
    expect(calls[0].url).toBe("https://www.okx.com/api/v5/trade/amend-order");
    expect(calls[0].init?.method).toBe("POST");
    expect(String(calls[0].init?.body)).toContain("\"newPx\":\"99999\"");
    expect(String(calls[0].init?.body)).toContain("\"reqId\":\"r1\"");
  });

  it("passes IOC ordType through place order when requested", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ ordId: "ioc-1", clOrdId: "tourab-proposal-abc", sCode: "0", sMsg: "" }]
        }),
        { status: 200 }
      );
    };

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock);
    await adapter.placeSpotLimitOrder({ ...intent, ordType: "ioc" });

    expect(calls).toHaveLength(1);
    expect(String(calls[0].init?.body)).toContain("\"ordType\":\"ioc\"");
  });

  it("sets tgtCcy=base_ccy for market buy orders so size stays in base units", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const adapter = new OkxDemoAdapter(demoConfig, async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ ordId: "mkt-1", clOrdId: "tourab-proposal-xyz", sCode: "0", sMsg: "" }]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    await adapter.placeSpotLimitOrder({
      proposalId: "proposal-xyz",
      symbol: "BTC-USDT",
      side: "buy",
      qtyBase: 0.000071,
      limitPrice: 70000,
      ordType: "market"
    });

    expect(String(calls[0].init?.body)).toContain("\"ordType\":\"market\"");
    expect(String(calls[0].init?.body)).toContain("\"tgtCcy\":\"base_ccy\"");
    expect(String(calls[0].init?.body)).not.toContain("\"px\":");
  });

  it("omits px for market orders", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          code: "0",
          msg: "",
          data: [{ ordId: "mkt-1", clOrdId: "tourab-proposal-abc", sCode: "0", sMsg: "" }]
        }),
        { status: 200 }
      );
    };

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock);
    await adapter.placeSpotLimitOrder({ ...intent, ordType: "market" });

    expect(calls).toHaveLength(1);
    expect(String(calls[0].init?.body)).toContain("\"ordType\":\"market\"");
    expect(String(calls[0].init?.body)).not.toContain("\"px\":");
  });

  it("retries a trade request once after a 401 when the same credentials still pass a balance probe", async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    let placeAttempts = 0;
    const fetchMock: typeof fetch = async (url, init) => {
      const asString = String(url);
      calls.push({ url: asString, method: init?.method });
      if (asString.endsWith("/api/v5/trade/order")) {
        placeAttempts += 1;
        if (placeAttempts === 1) {
          return new Response("unauthorized-on-trade-endpoint", { status: 401 });
        }
        return new Response(
          JSON.stringify({
            code: "0",
            msg: "",
            data: [{ ordId: "retry-ok", clOrdId: "tourab-proposal-abc", sCode: "0", sMsg: "" }]
          }),
          { status: 200 }
        );
      }
      if (asString.includes("/api/v5/account/balance?ccy=USDT")) {
        return new Response(
          JSON.stringify({
            code: "0",
            msg: "",
            data: [{ totalEq: "10", details: [{ ccy: "USDT", availBal: "10", cashBal: "10", eq: "10" }] }]
          }),
          { status: 200 }
        );
      }
      throw new Error(`unexpected url ${asString}`);
    };

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock);
    const result = await adapter.placeSpotLimitOrder(intent);

    expect(result.ordId).toBe("retry-ok");
    expect(calls.filter((item) => item.url.endsWith("/api/v5/trade/order"))).toHaveLength(2);
    expect(calls.some((item) => item.url.includes("/api/v5/account/balance?ccy=USDT"))).toBe(true);
  });

  it("surfaces request diagnostics when a trade 401 fails the auth probe too", async () => {
    const fetchMock: typeof fetch = async (url) => {
      const asString = String(url);
      if (asString.endsWith("/api/v5/trade/order")) {
        return new Response("trade-unauthorized", { status: 401 });
      }
      if (asString.includes("/api/v5/account/balance?ccy=USDT")) {
        return new Response("balance-unauthorized", { status: 401 });
      }
      throw new Error(`unexpected url ${asString}`);
    };

    const adapter = new OkxDemoAdapter(demoConfig, fetchMock);
    await expect(adapter.placeSpotLimitOrder(intent)).rejects.toMatchObject({
      code: "OKX_HTTP_ERROR",
      details: {
        status: 401,
        method: "POST",
        requestPath: "/api/v5/trade/order",
        authProbe: {
          ok: false,
          status: 401
        }
      }
    });
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
