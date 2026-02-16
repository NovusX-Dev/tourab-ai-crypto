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
}

interface OkxPriceLimitRecord {
  instId: string;
  buyLmt?: string;
  sellLmt?: string;
}

type FetchLike = typeof fetch;

export interface SpotMarketInputs {
  symbol: string;
  last: number;
  tickSz: number;
  lotSz: number;
  minSz: number;
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

async function okxGet<T>(fetchImpl: FetchLike, baseUrl: string, path: string): Promise<OkxEnvelope<T>> {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });
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
    buyLmt: priceLimit.buyLmt,
    sellLmt: priceLimit.sellLmt
  };
}

export function buildValidSpotProposal(
  market: SpotMarketInputs,
  options: BuildProposalOptions
): BuiltProposalResult {
  const notes: string[] = [];
  const direction = options.side === "buy" ? -1 : 1;
  const rawEntry = market.last * (1 + direction * (options.entryOffsetBps / 10_000));
  let entry = rawEntry;
  const hasBand = Number.isFinite(market.buyLmt) && Number.isFinite(market.sellLmt);

  if (hasBand && market.buyLmt !== undefined && market.sellLmt !== undefined) {
    entry = clamp(entry, market.sellLmt, market.buyLmt);
  }

  const entryPrice = normalizeToStep(entry, market.tickSz);
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
  const qtyBase = Math.max(alignedQty, market.minSz);
  const effectiveNotional = qtyBase * entryPrice;
  const estimatedRiskUsd = effectiveNotional * stopDistanceFraction;

  if (qtyBase === market.minSz && alignedQty < market.minSz) {
    notes.push("Quantity raised to minSz to satisfy exchange constraints.");
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
      usedPriceBand: hasBand,
      notes
    }
  };
}
