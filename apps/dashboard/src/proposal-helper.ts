import { randomUUID } from "node:crypto";
import { TradeProposal } from "@tourab/shared";

interface OkxEnvelope<T> {
  code: string;
  msg: string;
  data: T[];
}

interface OkxInstrumentRecord {
  instId: string;
  tickSz: string;
  lotSz: string;
  minSz: string;
}

interface OkxTickerRecord {
  instId: string;
  last: string;
  bidPx?: string;
  askPx?: string;
}

interface OkxPriceLimitRecord {
  instId: string;
  buyLmt?: string;
  sellLmt?: string;
}

type FetchLike = typeof fetch;
const DEFAULT_OKX_PUBLIC_TIMEOUT_MS = 4_000;

export interface SpotMarketInputs {
  symbol: string;
  last: number;
  tickSz: number;
  lotSz: number;
  minSz: number;
  bestBid?: number;
  bestAsk?: number;
  buyLmt?: number;
  sellLmt?: number;
}

export interface BuildProposalOptions {
  symbol: string;
  side: "buy" | "sell";
  maxRiskUsd: number;
  maxNotionalUsd: number;
  entryOffsetBps: number;
  stopDistanceBps: number;
  proposalId?: string;
}

export interface BuiltProposalResult {
  proposal: TradeProposal;
  diagnostics: {
    requestedRiskUsd: number;
    estimatedRiskUsd: number;
    notionalUsd: number;
    blockedByMaxNotional: boolean;
    usedPriceBand: boolean;
    notes: string[];
  };
}

function parsePositiveNumber(raw: string, field: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid numeric field '${field}' from OKX payload.`);
  }
  return value;
}

function floorToStep(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function decimalsForStep(step: number): number {
  const s = step.toString();
  const scientific = s.match(/e-(\d+)$/i);
  if (scientific) {
    return Number(scientific[1]);
  }
  if (!s.includes(".")) {
    return 0;
  }
  return s.length - s.indexOf(".") - 1;
}

function normalizeToStep(value: number, step: number): number {
  const floored = floorToStep(value, step);
  const decimals = decimalsForStep(step);
  return Number(floored.toFixed(decimals));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeSpotEntryPrice(
  market: SpotMarketInputs,
  side: "buy" | "sell",
  entryOffsetBps: number
): { entryPrice: number; referencePrice: number; usedPriceBand: boolean } {
  const direction = side === "buy" ? -1 : 1;
  const useAggressiveAnchor = entryOffsetBps < 0;
  const referencePrice =
    side === "buy"
      ? useAggressiveAnchor
        ? market.bestAsk ?? market.last
        : market.bestBid ?? market.last
      : useAggressiveAnchor
        ? market.bestBid ?? market.last
        : market.bestAsk ?? market.last;
  const rawEntry = referencePrice * (1 + direction * (entryOffsetBps / 10_000));
  let entry = rawEntry;
  const hasBand = Number.isFinite(market.buyLmt) && Number.isFinite(market.sellLmt);
  if (hasBand && market.buyLmt !== undefined && market.sellLmt !== undefined) {
    entry = clamp(entry, market.sellLmt, market.buyLmt);
  }
  return {
    entryPrice: normalizeToStep(entry, market.tickSz),
    referencePrice,
    usedPriceBand: hasBand
  };
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

async function fetchPriceLimit(
  fetchImpl: FetchLike,
  baseUrl: string,
  symbol: string
): Promise<{ buyLmt?: number; sellLmt?: number }> {
  try {
    const envelope = await okxGet<OkxPriceLimitRecord>(
      fetchImpl,
      baseUrl,
      `/api/v5/public/price-limit?instId=${encodeURIComponent(symbol)}`
    );
    const record = envelope.data[0];
    if (!record) {
      return {};
    }
    const buyLmt = record.buyLmt ? Number(record.buyLmt) : undefined;
    const sellLmt = record.sellLmt ? Number(record.sellLmt) : undefined;
    return {
      buyLmt: Number.isFinite(buyLmt) ? buyLmt : undefined,
      sellLmt: Number.isFinite(sellLmt) ? sellLmt : undefined
    };
  } catch {
    return {};
  }
}

export async function fetchSpotMarketInputs(
  symbol: string,
  baseUrl = "https://www.okx.com",
  fetchImpl: FetchLike = fetch
): Promise<SpotMarketInputs> {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const [instrumentEnvelope, tickerEnvelope, priceLimit] = await Promise.all([
    okxGet<OkxInstrumentRecord>(
      fetchImpl,
      trimmedBase,
      `/api/v5/public/instruments?instType=SPOT&instId=${encodeURIComponent(symbol)}`
    ),
    okxGet<OkxTickerRecord>(fetchImpl, trimmedBase, `/api/v5/market/ticker?instId=${encodeURIComponent(symbol)}`),
    fetchPriceLimit(fetchImpl, trimmedBase, symbol)
  ]);

  const instrument = instrumentEnvelope.data[0];
  const ticker = tickerEnvelope.data[0];
  if (!instrument) {
    throw new Error(`No SPOT instrument data for '${symbol}'.`);
  }
  if (!ticker) {
    throw new Error(`No ticker data for '${symbol}'.`);
  }

  return {
    symbol,
    last: parsePositiveNumber(ticker.last, "last"),
    tickSz: parsePositiveNumber(instrument.tickSz, "tickSz"),
    lotSz: parsePositiveNumber(instrument.lotSz, "lotSz"),
    minSz: parsePositiveNumber(instrument.minSz, "minSz"),
    bestBid: ticker.bidPx ? Number(ticker.bidPx) : undefined,
    bestAsk: ticker.askPx ? Number(ticker.askPx) : undefined,
    buyLmt: priceLimit.buyLmt,
    sellLmt: priceLimit.sellLmt
  };
}

export function buildValidSpotProposal(
  market: SpotMarketInputs,
  options: BuildProposalOptions
): BuiltProposalResult {
  const notes: string[] = [];
  const { entryPrice, usedPriceBand: hasBand } = computeSpotEntryPrice(market, options.side, options.entryOffsetBps);
  const stopMultiplier = options.stopDistanceBps / 10_000;
  const rawStop =
    options.side === "buy" ? entryPrice * (1 - stopMultiplier) : entryPrice * (1 + stopMultiplier);
  const stopPrice = normalizeToStep(rawStop, market.tickSz);

  const stopDistance = Math.abs(entryPrice - stopPrice);
  const stopDistanceFraction = stopDistance / entryPrice;
  const requestedRiskUsd = options.maxRiskUsd;
  const notionalByRisk =
    stopDistanceFraction > 0 ? requestedRiskUsd / stopDistanceFraction : options.maxNotionalUsd;
  const notionalUsd = Math.min(options.maxNotionalUsd, notionalByRisk);
  const rawQty = notionalUsd / entryPrice;
  const alignedQty = normalizeToStep(rawQty, market.lotSz);
  const minNotionalUsd = market.minSz * entryPrice;
  const blockedByMaxNotional = minNotionalUsd > options.maxNotionalUsd;
  const qtyBase = Math.max(alignedQty, market.minSz);
  const effectiveNotional = qtyBase * entryPrice;
  const estimatedRiskUsd = effectiveNotional * stopDistanceFraction;

  if (qtyBase === market.minSz && alignedQty < market.minSz) {
    notes.push("Quantity raised to minSz to satisfy exchange constraints.");
  }
  if (blockedByMaxNotional) {
    notes.push(`Min notional ${minNotionalUsd.toFixed(6)} exceeds maxNotionalUsd ${options.maxNotionalUsd}.`);
  }
  if (estimatedRiskUsd > requestedRiskUsd) {
    notes.push("Estimated risk exceeds requested risk after lot/min-size normalization.");
  }
  if (!hasBand) {
    notes.push("Price band not available; entry validated only against tickSz.");
  }

  const proposal: TradeProposal = {
    proposalId: options.proposalId ?? randomUUID(),
    symbol: options.symbol,
    side: options.side,
    qtyBase,
    entryPrice,
    stopPrice,
    estimatedMaxLossUsd: Number(estimatedRiskUsd.toFixed(6)),
    leverage: 1
  };

  return {
    proposal,
    diagnostics: {
      requestedRiskUsd,
      estimatedRiskUsd: Number(estimatedRiskUsd.toFixed(6)),
      notionalUsd: Number(effectiveNotional.toFixed(6)),
      blockedByMaxNotional,
      usedPriceBand: hasBand,
      notes
    }
  };
}
