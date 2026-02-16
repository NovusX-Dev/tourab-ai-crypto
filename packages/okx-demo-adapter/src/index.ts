import { createHmac } from "node:crypto";
import { ExecutionIntent } from "@tourab/shared";

export interface OkxDemoConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  baseUrl?: string;
}

export interface OkxOrderResult {
  ordId: string;
  clOrdId: string;
  sCode: string;
  sMsg: string;
  tag?: string;
  ts?: string;
}

interface OkxApiEnvelope<T> {
  code: string;
  msg: string;
  data: T[];
}

export interface OkxBalanceDetail {
  ccy: string;
  availBal: string;
  cashBal: string;
  eq: string;
}

export interface OkxBalanceRecord {
  totalEq: string;
  details: OkxBalanceDetail[];
}

export interface OkxPendingOrder {
  ordId: string;
  clOrdId: string;
  instId: string;
  side: "buy" | "sell";
  px: string;
  sz: string;
  accFillSz: string;
  state: string;
  cTime: string;
  uTime: string;
}

export interface OkxFillRecord {
  ordId: string;
  clOrdId: string;
  instId: string;
  side: "buy" | "sell";
  fillPx: string;
  fillSz: string;
  ts: string;
  tradeId: string;
}

type FetchLike = typeof fetch;

export class OkxApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "OkxApiError";
  }
}

function toOkxSide(side: ExecutionIntent["side"]): "buy" | "sell" {
  return side;
}

function makeClientOrderId(proposalId: string): string {
  const seed = `tourab${proposalId}`.replace(/[^a-zA-Z0-9]/g, "");
  const normalized = seed.length > 0 ? seed : "touraborder";
  return normalized.slice(0, 32);
}

function signRequest(timestamp: string, method: string, requestPath: string, body: string, secret: string): string {
  const prehash = `${timestamp}${method.toUpperCase()}${requestPath}${body}`;
  return createHmac("sha256", secret).update(prehash).digest("base64");
}

function assertDemoConfig(config: OkxDemoConfig): void {
  if (!config.apiKey || !config.apiSecret || !config.passphrase) {
    throw new OkxApiError("OKX_CONFIG_ERROR", "Missing required OKX demo credentials.");
  }
}

export class OkxDemoAdapter {
  private readonly baseUrl: string;

  constructor(
    private readonly config: OkxDemoConfig,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly now: () => Date = () => new Date()
  ) {
    assertDemoConfig(config);
    this.baseUrl = (config.baseUrl ?? "https://www.okx.com").replace(/\/+$/, "");
  }

  private async privateRequest<T>(
    method: "GET" | "POST",
    requestPath: string,
    body: string
  ): Promise<OkxApiEnvelope<T>> {
    const timestamp = this.now().toISOString();
    const signature = signRequest(timestamp, method, requestPath, body, this.config.apiSecret);
    const response = await this.fetchImpl(`${this.baseUrl}${requestPath}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "OK-ACCESS-KEY": this.config.apiKey,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": this.config.passphrase,
        "x-simulated-trading": "1"
      },
      body: method === "POST" ? body : undefined
    });

    if (!response.ok) {
      throw new OkxApiError("OKX_HTTP_ERROR", `OKX HTTP request failed with status ${response.status}.`, {
        status: response.status
      });
    }

    const envelope = (await response.json()) as OkxApiEnvelope<T>;
    if (envelope.code !== "0") {
      throw new OkxApiError("OKX_API_ERROR", envelope.msg || "OKX returned an error response.", {
        code: envelope.code,
        msg: envelope.msg,
        data: envelope.data
      });
    }

    return envelope;
  }

  async placeSpotLimitOrder(intent: ExecutionIntent): Promise<OkxOrderResult> {
    const requestPath = "/api/v5/trade/order";
    const payload = {
      instId: intent.symbol,
      tdMode: "cash",
      side: toOkxSide(intent.side),
      ordType: "limit",
      px: intent.limitPrice.toString(),
      sz: intent.qtyBase.toString(),
      clOrdId: makeClientOrderId(intent.proposalId)
    };
    const body = JSON.stringify(payload);
    const envelope = await this.privateRequest<OkxOrderResult>("POST", requestPath, body);
    if (envelope.data.length === 0) {
      throw new OkxApiError("OKX_API_ERROR", "OKX returned no order data.");
    }

    const result = envelope.data[0];
    if (result.sCode !== "0") {
      throw new OkxApiError("OKX_ORDER_REJECTED", result.sMsg || "Order rejected by OKX.", {
        sCode: result.sCode,
        sMsg: result.sMsg
      });
    }

    return result;
  }

  async getAccountBalance(ccy?: string): Promise<OkxBalanceRecord> {
    const query = ccy ? `?ccy=${encodeURIComponent(ccy)}` : "";
    const requestPath = `/api/v5/account/balance${query}`;
    const envelope = await this.privateRequest<OkxBalanceRecord>("GET", requestPath, "");
    if (envelope.data.length === 0) {
      throw new OkxApiError("OKX_API_ERROR", "OKX returned no balance data.");
    }
    return envelope.data[0];
  }

  async getPendingOrders(instId?: string): Promise<OkxPendingOrder[]> {
    const query = instId ? `?instType=SPOT&instId=${encodeURIComponent(instId)}` : "?instType=SPOT";
    const requestPath = `/api/v5/trade/orders-pending${query}`;
    const envelope = await this.privateRequest<OkxPendingOrder>("GET", requestPath, "");
    return envelope.data;
  }

  async getFills(instId?: string, limit = 100): Promise<OkxFillRecord[]> {
    const query = new URLSearchParams();
    query.set("instType", "SPOT");
    if (instId) {
      query.set("instId", instId);
    }
    query.set("limit", String(limit));
    const requestPath = `/api/v5/trade/fills?${query.toString()}`;
    const envelope = await this.privateRequest<OkxFillRecord>("GET", requestPath, "");
    return envelope.data;
  }

  async cancelOrder(params: { instId: string; ordId?: string; clOrdId?: string }): Promise<OkxOrderResult> {
    if (!params.ordId && !params.clOrdId) {
      throw new OkxApiError("OKX_CANCEL_INPUT_ERROR", "ordId or clOrdId must be provided for cancel.");
    }
    const requestPath = "/api/v5/trade/cancel-order";
    const body = JSON.stringify({
      instId: params.instId,
      ordId: params.ordId,
      clOrdId: params.clOrdId
    });
    const envelope = await this.privateRequest<OkxOrderResult>("POST", requestPath, body);
    if (envelope.data.length === 0) {
      throw new OkxApiError("OKX_API_ERROR", "OKX returned no cancel response data.");
    }
    const result = envelope.data[0];
    if (result.sCode !== "0") {
      throw new OkxApiError("OKX_ORDER_CANCEL_FAILED", result.sMsg || "Order cancel failed.", {
        sCode: result.sCode,
        sMsg: result.sMsg
      });
    }
    return result;
  }
}

export function loadOkxDemoConfigFromEnv(
  env: Record<string, string | undefined> = process.env
): OkxDemoConfig {
  if (env.OKX_TRADING_MODE && env.OKX_TRADING_MODE !== "demo") {
    throw new OkxApiError("OKX_CONFIG_ERROR", "OKX_TRADING_MODE must be 'demo' for demo adapter usage.");
  }

  return {
    apiKey: env.OKX_DEMO_API_KEY ?? "",
    apiSecret: env.OKX_DEMO_API_SECRET ?? "",
    passphrase: env.OKX_DEMO_API_PASSPHRASE ?? env.OKX_DEMO_PASSPHRASE ?? "",
    baseUrl: env.OKX_DEMO_BASE_URL
  };
}
