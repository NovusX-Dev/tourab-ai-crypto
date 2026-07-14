import { createHash, createHmac } from "node:crypto";
import { ExecutionIntent } from "@tourab/shared";

export interface OkxDemoConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  baseUrl?: string;
}

export interface OkxDemoEnvValidationIssue {
  code:
    | "TRADING_MODE_NOT_DEMO"
    | "MISSING_API_KEY"
    | "MISSING_API_SECRET"
    | "MISSING_PASSPHRASE"
    | "PASSPHRASE_CONFLICT"
    | "PLACEHOLDER_VALUE"
    | "INVALID_BASE_URL";
  message: string;
  envKey?: string;
}

export interface OkxDemoEnvValidationResult {
  ok: boolean;
  issues: OkxDemoEnvValidationIssue[];
  config: OkxDemoConfig;
}

export interface OkxOrderResult {
  ordId: string;
  clOrdId: string;
  sCode: string;
  sMsg: string;
  reqId?: string;
  tag?: string;
  ts?: string;
}

interface OkxApiEnvelope<T> {
  code: string;
  msg: string;
  data: T[];
}

interface OkxErrorEnvelope {
  code?: string;
  msg?: string;
  data?: unknown[];
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
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 10);
  const prefixMax = 32 - hash.length;
  const prefix = normalized.slice(0, Math.max(0, prefixMax));
  return `${prefix}${hash}`;
}

function signRequest(timestamp: string, method: string, requestPath: string, body: string, secret: string): string {
  const prehash = `${timestamp}${method.toUpperCase()}${requestPath}${body}`;
  return createHmac("sha256", secret).update(prehash).digest("base64");
}

function tryParseOkxErrorEnvelope(bodyText: string): OkxErrorEnvelope | undefined {
  if (!bodyText || !bodyText.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(bodyText) as OkxErrorEnvelope;
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

function assertDemoConfig(config: OkxDemoConfig): void {
  if (!config.apiKey || !config.apiSecret || !config.passphrase) {
    throw new OkxApiError("OKX_CONFIG_ERROR", "Missing required OKX demo credentials.");
  }
}

function normalizeEnvValue(value: string | undefined): string {
  return (value ?? "").trim();
}

function looksLikePlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes("your_") ||
    normalized.includes("replace_me") ||
    normalized.includes("example") ||
    normalized.includes("changeme")
  );
}

export function validateOkxDemoEnv(
  env: Record<string, string | undefined> = process.env
): OkxDemoEnvValidationResult {
  const apiKey = normalizeEnvValue(env.OKX_DEMO_API_KEY);
  const apiSecret = normalizeEnvValue(env.OKX_DEMO_API_SECRET);
  const apiPassphrase = normalizeEnvValue(env.OKX_DEMO_API_PASSPHRASE);
  const legacyPassphrase = normalizeEnvValue(env.OKX_DEMO_PASSPHRASE);
  const passphrase = apiPassphrase || legacyPassphrase;
  const baseUrl = normalizeEnvValue(env.OKX_DEMO_BASE_URL);
  const mode = normalizeEnvValue(env.OKX_TRADING_MODE);

  const config: OkxDemoConfig = {
    apiKey,
    apiSecret,
    passphrase,
    baseUrl: baseUrl || undefined
  };

  const issues: OkxDemoEnvValidationIssue[] = [];
  if (mode && mode !== "demo") {
    issues.push({
      code: "TRADING_MODE_NOT_DEMO",
      envKey: "OKX_TRADING_MODE",
      message: "OKX_TRADING_MODE must be 'demo' for demo adapter usage."
    });
  }
  if (!apiKey) {
    issues.push({
      code: "MISSING_API_KEY",
      envKey: "OKX_DEMO_API_KEY",
      message: "Missing OKX demo API key."
    });
  }
  if (!apiSecret) {
    issues.push({
      code: "MISSING_API_SECRET",
      envKey: "OKX_DEMO_API_SECRET",
      message: "Missing OKX demo API secret."
    });
  }
  if (!passphrase) {
    issues.push({
      code: "MISSING_PASSPHRASE",
      envKey: "OKX_DEMO_API_PASSPHRASE",
      message: "Missing OKX demo passphrase (set OKX_DEMO_API_PASSPHRASE or OKX_DEMO_PASSPHRASE)."
    });
  }
  if (apiPassphrase && legacyPassphrase && apiPassphrase !== legacyPassphrase) {
    issues.push({
      code: "PASSPHRASE_CONFLICT",
      message: "OKX_DEMO_API_PASSPHRASE and OKX_DEMO_PASSPHRASE are both set but different."
    });
  }
  if (apiKey && looksLikePlaceholder(apiKey)) {
    issues.push({
      code: "PLACEHOLDER_VALUE",
      envKey: "OKX_DEMO_API_KEY",
      message: "OKX_DEMO_API_KEY looks like a placeholder value."
    });
  }
  if (apiSecret && looksLikePlaceholder(apiSecret)) {
    issues.push({
      code: "PLACEHOLDER_VALUE",
      envKey: "OKX_DEMO_API_SECRET",
      message: "OKX_DEMO_API_SECRET looks like a placeholder value."
    });
  }
  if (passphrase && looksLikePlaceholder(passphrase)) {
    issues.push({
      code: "PLACEHOLDER_VALUE",
      envKey: apiPassphrase ? "OKX_DEMO_API_PASSPHRASE" : "OKX_DEMO_PASSPHRASE",
      message: "Demo passphrase looks like a placeholder value."
    });
  }
  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        issues.push({
          code: "INVALID_BASE_URL",
          envKey: "OKX_DEMO_BASE_URL",
          message: "OKX_DEMO_BASE_URL must use http:// or https://."
        });
      }
    } catch {
      issues.push({
        code: "INVALID_BASE_URL",
        envKey: "OKX_DEMO_BASE_URL",
        message: "OKX_DEMO_BASE_URL is not a valid URL."
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    config
  };
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

  private buildPrivateHeaders(method: "GET" | "POST", requestPath: string, body: string): Record<string, string> {
    const timestamp = this.now().toISOString();
    const signature = signRequest(timestamp, method, requestPath, body, this.config.apiSecret);
    return {
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": this.config.apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": this.config.passphrase,
      "x-simulated-trading": "1"
    };
  }

  private async sendPrivateHttpRequest(method: "GET" | "POST", requestPath: string, body: string): Promise<Response> {
    return await this.fetchImpl(`${this.baseUrl}${requestPath}`, {
      method,
      headers: this.buildPrivateHeaders(method, requestPath, body),
      body: method === "POST" ? body : undefined,
      signal: AbortSignal.timeout(15_000)
    });
  }

  private async probePrivateAuth(): Promise<{ ok: boolean; status?: number; body?: string; error?: string }> {
    try {
      const response = await this.sendPrivateHttpRequest("GET", "/api/v5/account/balance?ccy=USDT", "");
      const body = await response.text().catch(() => "");
      return {
        ok: response.ok,
        status: response.status,
        body: body.slice(0, 300)
      };
    } catch (error: unknown) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async recoverDuplicateClientOrder(
    instId: string,
    clOrdId: string
  ): Promise<OkxOrderResult | undefined> {
    const pending = await this.getPendingOrders(instId);
    const existingPending = pending.find((item) => item.clOrdId === clOrdId);
    if (existingPending) {
      return {
        ordId: existingPending.ordId,
        clOrdId: existingPending.clOrdId,
        sCode: "0",
        sMsg: ""
      };
    }

    const fills = await this.getFills(instId, 100);
    const existingFill = fills.find((item) => item.clOrdId === clOrdId);
    if (existingFill) {
      return {
        ordId: existingFill.ordId,
        clOrdId: existingFill.clOrdId,
        sCode: "0",
        sMsg: ""
      };
    }

    return undefined;
  }

  private async privateRequest<T>(
    method: "GET" | "POST",
    requestPath: string,
    body: string
  ): Promise<OkxApiEnvelope<T>> {
    const maxAttempts = 4;
    let lastError: OkxApiError | undefined;
    let recoveredAuthRetryUsed = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await this.sendPrivateHttpRequest(method, requestPath, body);

        if (!response.ok) {
          const bodyText = await response.text().catch(() => "");
          const parsedError = tryParseOkxErrorEnvelope(bodyText);
          const apiCode =
            typeof parsedError?.code === "string" || typeof parsedError?.code === "number"
              ? String(parsedError.code)
              : undefined;
          const apiMsg = typeof parsedError?.msg === "string" ? parsedError.msg : undefined;
          const retryable = response.status === 429 || response.status >= 500;
          const requestBodyHash = createHash("sha256").update(body).digest("hex").slice(0, 12);
          const isTradeEndpoint = requestPath.startsWith("/api/v5/trade/");
          const permanentAuthFailure =
            apiCode === "50110" ||
            (apiMsg?.toLowerCase().includes("whitelist") ?? false) ||
            (apiMsg?.toLowerCase().includes("api key") ?? false);
          const shouldProbe401 =
            response.status === 401 &&
            isTradeEndpoint &&
            !permanentAuthFailure &&
            !recoveredAuthRetryUsed &&
            attempt < maxAttempts;
          let authProbe: { ok: boolean; status?: number; body?: string; error?: string } | undefined;
          if (shouldProbe401) {
            authProbe = await this.probePrivateAuth();
          }
          lastError = new OkxApiError("OKX_HTTP_ERROR", `OKX HTTP request failed with status ${response.status}.`, {
            status: response.status,
            body: bodyText.slice(0, 300),
            code: apiCode,
            msg: apiMsg,
            attempt,
            method,
            requestPath,
            requestBodyHash,
            authProbe
          });
          if (shouldProbe401 && authProbe?.ok) {
            recoveredAuthRetryUsed = true;
            await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
            continue;
          }
          if (retryable && attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
            continue;
          }
          throw lastError;
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
      } catch (error: unknown) {
        if (error instanceof OkxApiError) {
          throw error;
        }
        lastError = new OkxApiError("OKX_NETWORK_ERROR", `OKX network request failed: ${error instanceof Error ? error.message : String(error)}`, {
          attempt
        });
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
          continue;
        }
      }
    }
    throw lastError ?? new OkxApiError("OKX_NETWORK_ERROR", "OKX network request failed.");
  }

  async placeSpotLimitOrder(intent: ExecutionIntent): Promise<OkxOrderResult> {
    const requestPath = "/api/v5/trade/order";
    const clOrdId = makeClientOrderId(intent.proposalId);
    const payload = {
      instId: intent.symbol,
      tdMode: "cash",
      side: toOkxSide(intent.side),
      ordType: intent.ordType ?? "limit",
      sz: intent.qtyBase.toString(),
      clOrdId
    } as Record<string, string>;
    if ((intent.ordType ?? "limit") === "market" && intent.side === "buy") {
      payload.tgtCcy = "base_ccy";
    }
    if ((intent.ordType ?? "limit") !== "market") {
      payload.px = intent.limitPrice.toString();
    }
    const body = JSON.stringify(payload);
    const envelope = await this.privateRequest<OkxOrderResult>("POST", requestPath, body);
    if (envelope.data.length === 0) {
      throw new OkxApiError("OKX_API_ERROR", "OKX returned no order data.");
    }

    const result = envelope.data[0];
    if (result.sCode !== "0") {
      if (result.sCode === "51016") {
        const recovered = await this.recoverDuplicateClientOrder(intent.symbol, clOrdId);
        if (recovered) {
          return recovered;
        }
      }
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

  async amendOrder(params: {
    instId: string;
    ordId?: string;
    clOrdId?: string;
    newPx?: number;
    newSz?: number;
    reqId?: string;
    cxlOnFail?: boolean;
  }): Promise<OkxOrderResult> {
    if (!params.ordId && !params.clOrdId) {
      throw new OkxApiError("OKX_CANCEL_INPUT_ERROR", "ordId or clOrdId must be provided for amend.");
    }
    if (
      (params.newPx === undefined || !Number.isFinite(params.newPx) || params.newPx <= 0) &&
      (params.newSz === undefined || !Number.isFinite(params.newSz) || params.newSz <= 0)
    ) {
      throw new OkxApiError("OKX_CANCEL_INPUT_ERROR", "newPx or newSz must be provided for amend.");
    }

    const requestPath = "/api/v5/trade/amend-order";
    const payload: Record<string, string | boolean> = {
      instId: params.instId
    };
    if (params.ordId) {
      payload.ordId = params.ordId;
    }
    if (params.clOrdId) {
      payload.clOrdId = params.clOrdId;
    }
    if (params.newPx !== undefined && Number.isFinite(params.newPx) && params.newPx > 0) {
      payload.newPx = params.newPx.toString();
    }
    if (params.newSz !== undefined && Number.isFinite(params.newSz) && params.newSz > 0) {
      payload.newSz = params.newSz.toString();
    }
    if (params.reqId) {
      payload.reqId = params.reqId;
    }
    if (params.cxlOnFail !== undefined) {
      payload.cxlOnFail = params.cxlOnFail;
    }
    const body = JSON.stringify(payload);
    const envelope = await this.privateRequest<OkxOrderResult>("POST", requestPath, body);
    if (envelope.data.length === 0) {
      throw new OkxApiError("OKX_API_ERROR", "OKX returned no amend-order data.");
    }

    const result = envelope.data[0];
    if (result.sCode !== "0") {
      throw new OkxApiError("OKX_ORDER_REJECTED", result.sMsg || "Order amend rejected by OKX.", {
        sCode: result.sCode,
        sMsg: result.sMsg,
        ordId: result.ordId,
        clOrdId: result.clOrdId,
        reqId: result.reqId
      });
    }

    return result;
  }
}

export function loadOkxDemoConfigFromEnv(
  env: Record<string, string | undefined> = process.env
): OkxDemoConfig {
  const validation = validateOkxDemoEnv(env);
  if (!validation.ok) {
    throw new OkxApiError("OKX_CONFIG_ERROR", "Invalid OKX demo environment configuration.", {
      issues: validation.issues
    });
  }
  return validation.config;
}
