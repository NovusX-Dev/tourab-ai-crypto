interface OkxEnvelope<T> {
  code: string;
  msg: string;
  data: T[];
}

type FetchLike = typeof fetch;
const DEFAULT_OKX_PUBLIC_TIMEOUT_MS = 4_000;

export interface MarketIntelligenceSnapshot {
  symbol: string;
  generatedAt: string;
  regime: "trend_up" | "trend_down" | "quiet_up" | "quiet_down" | "chop" | "dead_zone";
  recommendedSide?: "buy" | "sell";
  confidenceScore: number;
  trendAlignmentScore: number;
  recommendedEntryOffsetBps: number;
  move1mBps: number;
  move5mBps: number;
  move15mBps: number;
  realizedVolatilityBps: number;
  spreadBps: number;
  orderBookImbalancePct: number;
  continuationOverextended: boolean;
  projectedMoveBudgetBps: number;
}

interface ParsedCandle {
  ts: number;
  close: number;
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function okxGet<T>(
  fetchImpl: FetchLike,
  baseUrl: string,
  path: string,
  timeoutMs = DEFAULT_OKX_PUBLIC_TIMEOUT_MS
): Promise<OkxEnvelope<T>> {
  const controller = new AbortController();
  const fetchPromise = fetchImpl(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    signal: controller.signal
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`OKX public request timed out after ${timeoutMs}ms: ${path}`));
    }, timeoutMs);
    controller.signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
      },
      { once: true }
    );
  });
  let response: globalThis.Response;
  try {
    response = await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`OKX public request timed out after ${timeoutMs}ms: ${path}`);
    }
    throw error;
  }
  if (!response.ok) {
    throw new Error(`OKX public request failed: ${response.status}`);
  }
  const envelope = (await response.json()) as OkxEnvelope<T>;
  if (envelope.code !== "0") {
    throw new Error(`OKX public API error: ${envelope.msg || envelope.code}`);
  }
  return envelope;
}

function parsePositiveNumber(raw: string | number | undefined): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid numeric value from OKX payload.");
  }
  return value;
}

function parseCandles(rows: unknown[]): ParsedCandle[] {
  const candles: ParsedCandle[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) {
      continue;
    }
    const ts = Number(row[0]);
    const close = parsePositiveNumber(row[4]);
    if (!Number.isFinite(ts) || ts <= 0) {
      continue;
    }
    candles.push({ ts, close });
  }
  return candles.sort((a, b) => a.ts - b.ts);
}

function computeMoveBps(candles: ParsedCandle[], lookbackBars: number): number {
  if (candles.length < lookbackBars + 1) {
    return 0;
  }
  const latest = candles[candles.length - 1];
  const anchor = candles[Math.max(0, candles.length - 1 - lookbackBars)];
  if (!latest || !anchor || anchor.close <= 0) {
    return 0;
  }
  return ((latest.close - anchor.close) / anchor.close) * 10_000;
}

function computeRealizedVolatilityBps(candles: ParsedCandle[]): number {
  if (candles.length < 3) {
    return 0;
  }
  const returns: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const prev = candles[i - 1];
    const next = candles[i];
    if (!prev || !next || prev.close <= 0 || next.close <= 0) {
      continue;
    }
    returns.push(Math.log(next.close / prev.close));
  }
  if (returns.length < 2) {
    return 0;
  }
  const mean = returns.reduce((sum, item) => sum + item, 0) / returns.length;
  const variance = returns.reduce((sum, item) => sum + (item - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 10_000;
}

function sumLevelSize(levels: unknown[]): number {
  let total = 0;
  for (const level of levels) {
    if (!Array.isArray(level) || level.length < 2) {
      continue;
    }
    const size = Number(level[1]);
    if (Number.isFinite(size) && size > 0) {
      total += size;
    }
  }
  return total;
}

function inferRegime(input: {
  move1mBps: number;
  move5mBps: number;
  move15mBps: number;
  realizedVolatilityBps: number;
  spreadBps: number;
  orderBookImbalancePct: number;
}): Pick<MarketIntelligenceSnapshot, "regime" | "recommendedSide" | "confidenceScore" | "trendAlignmentScore" | "recommendedEntryOffsetBps"> {
  const sign15 = Math.sign(input.move15mBps);
  const sign5 = Math.sign(input.move5mBps);
  const sign1 = Math.sign(input.move1mBps);
  const aligned = sign15 !== 0 && sign15 === sign5 && (sign1 === 0 || sign1 === sign15);
  const trendAlignmentScore = clamp(
    sign15 * Math.abs(input.move15mBps) * 1.5 + sign5 * Math.abs(input.move5mBps) + sign1 * Math.abs(input.move1mBps) * 0.5,
    -100,
    100
  );
  const bookAgreement =
    sign15 === 0 ? 0 : sign15 > 0 ? input.orderBookImbalancePct : -input.orderBookImbalancePct;
  const rawConfidence =
    Math.abs(input.move15mBps) * 1.4 +
    Math.abs(input.move5mBps) * 1.1 +
    Math.max(0, input.realizedVolatilityBps - 1) * 2 +
    Math.max(0, bookAgreement) * 0.7 -
    input.spreadBps * 6;
  const confidenceScore = clamp(rawConfidence, 0, 100);
  const recommendedPullbackEntryOffsetBps = clamp(
    Math.max(4, Math.abs(input.move1mBps) * 0.5, input.spreadBps * 4),
    4,
    18
  );
  const recommendedMomentumEntryOffsetBps = -clamp(
    Math.max(1, Math.abs(input.move1mBps) * 0.3, input.spreadBps * 2),
    1,
    8
  );

  if (Math.abs(input.move15mBps) < 6 && input.realizedVolatilityBps < 1.5) {
    return {
      regime: "dead_zone",
      recommendedSide: undefined,
      confidenceScore,
      trendAlignmentScore,
      recommendedEntryOffsetBps: recommendedPullbackEntryOffsetBps
    };
  }

  if (!aligned) {
    return {
      regime: "chop",
      recommendedSide: undefined,
      confidenceScore,
      trendAlignmentScore,
      recommendedEntryOffsetBps: recommendedPullbackEntryOffsetBps
    };
  }

  if (sign15 > 0) {
    return {
      regime: input.realizedVolatilityBps < 2.5 ? "quiet_up" : "trend_up",
      recommendedSide: "buy",
      confidenceScore,
      trendAlignmentScore,
      recommendedEntryOffsetBps:
        input.realizedVolatilityBps < 2.5 ? recommendedPullbackEntryOffsetBps : recommendedMomentumEntryOffsetBps
    };
  }

  return {
    regime: input.realizedVolatilityBps < 2.5 ? "quiet_down" : "trend_down",
    recommendedSide: "sell",
    confidenceScore,
    trendAlignmentScore,
    recommendedEntryOffsetBps:
      input.realizedVolatilityBps < 2.5 ? recommendedPullbackEntryOffsetBps : recommendedMomentumEntryOffsetBps
  };
}

export async function fetchMarketIntelligenceSnapshot(
  symbol: string,
  baseUrl = "https://www.okx.com",
  fetchImpl: FetchLike = fetch
): Promise<MarketIntelligenceSnapshot> {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const [candlesEnvelope, booksEnvelope] = await Promise.all([
    okxGet<unknown>(fetchImpl, trimmedBase, `/api/v5/market/candles?instId=${encodeURIComponent(symbol)}&bar=1m&limit=30`),
    okxGet<{ asks?: unknown[]; bids?: unknown[] }>(
      fetchImpl,
      trimmedBase,
      `/api/v5/market/books?instId=${encodeURIComponent(symbol)}&sz=25`
    )
  ]);
  const candles = parseCandles(candlesEnvelope.data as unknown[]);
  const book = booksEnvelope.data[0] ?? {};
  const bids = Array.isArray(book.bids) ? book.bids : [];
  const asks = Array.isArray(book.asks) ? book.asks : [];
  const bestBid = bids[0] ? parsePositiveNumber((bids[0] as unknown[])[0] as string | number) : 0;
  const bestAsk = asks[0] ? parsePositiveNumber((asks[0] as unknown[])[0] as string | number) : 0;
  const mid = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0;
  const spreadBps = mid > 0 ? ((bestAsk - bestBid) / mid) * 10_000 : 0;
  const bidSize = sumLevelSize(bids);
  const askSize = sumLevelSize(asks);
  const orderBookImbalancePct =
    bidSize + askSize > 0 ? ((bidSize - askSize) / (bidSize + askSize)) * 100 : 0;
  const move1mBps = computeMoveBps(candles, 1);
  const move5mBps = computeMoveBps(candles, 5);
  const move15mBps = computeMoveBps(candles, 15);
  const realizedVolatilityBps = computeRealizedVolatilityBps(candles.slice(-16));
  const inferred = inferRegime({
    move1mBps,
    move5mBps,
    move15mBps,
    realizedVolatilityBps,
    spreadBps,
    orderBookImbalancePct
  });
  return {
    symbol,
    generatedAt: new Date().toISOString(),
    regime: inferred.regime,
    recommendedSide: inferred.recommendedSide,
    confidenceScore: round6(inferred.confidenceScore),
    trendAlignmentScore: round6(inferred.trendAlignmentScore),
    recommendedEntryOffsetBps: round6(inferred.recommendedEntryOffsetBps),
    move1mBps: round6(move1mBps),
    move5mBps: round6(move5mBps),
    move15mBps: round6(move15mBps),
    realizedVolatilityBps: round6(realizedVolatilityBps),
    spreadBps: round6(spreadBps),
    orderBookImbalancePct: round6(orderBookImbalancePct),
    continuationOverextended:
      Math.abs(move15mBps) > 0 &&
      (Math.abs(move1mBps) > Math.abs(move15mBps) * 0.7 || Math.abs(move1mBps) > realizedVolatilityBps * 1.1),
    projectedMoveBudgetBps: round6(Math.max(0, realizedVolatilityBps * Math.sqrt(5) * 1.5))
  };
}
