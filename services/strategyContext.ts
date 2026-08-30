import { buildMarketWeather, canonicalAssetSymbol } from "./marketWeather.ts";
import type { MarketAsset, MarketIntelligence } from "../types/market.ts";

export type StrategyBias = "bullish" | "neutral" | "bearish";

export interface StrategyProviderSummary {
  name: string;
  status: string;
  updatedAt?: string;
}

export interface StrategyContextInput {
  symbols: string[];
  cryptoAssets: MarketAsset[];
  stockAssets: MarketAsset[];
  cryptoProviders: StrategyProviderSummary[];
  stockProviders: StrategyProviderSummary[];
  cryptoMode: "live" | "cached" | "fallback";
  stockMode: "live" | "cached" | "fallback";
  cryptoUpdatedAt: string;
  stockUpdatedAt: string;
  intelligenceBySymbol: Record<string, MarketIntelligence | undefined>;
  now?: Date;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 4) => Number(value.toFixed(digits));

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function ageSeconds(value: string, now: Date) {
  const age = (now.getTime() - Date.parse(value)) / 1_000;
  return Number.isFinite(age) ? Math.max(0, Math.round(age)) : 9_999;
}

function exactVenueObservations(assets: MarketAsset[], symbol: string) {
  const byVenue = new Map<string, MarketAsset>();
  for (const asset of assets) {
    if (canonicalAssetSymbol(asset) !== symbol) continue;
    if (!Number.isFinite(asset.price) || asset.price <= 0 || !Number.isFinite(asset.change24h)) continue;
    const venue = asset.venue?.trim() || "Unknown";
    const current = byVenue.get(venue);
    if (!current || asset.volume > current.volume) byVenue.set(venue, asset);
  }
  return [...byVenue.values()].map((asset) => ({
    venue: asset.venue?.trim() || "Unknown",
    price: asset.price,
    change24h: asset.change24h,
    volume: asset.volume,
    feedMode: asset.feedMode ?? "live",
    asOf: asset.asOf,
  }));
}

function candleTrendPct(intelligence?: MarketIntelligence) {
  const candles = intelligence?.candles ?? [];
  const first = candles[0];
  const last = candles.at(-1);
  if (!first || !last || first.open <= 0 || last.close <= 0) return 0;
  return ((last.close - first.open) / first.open) * 100;
}

function buildSymbolContext(
  symbol: string,
  assets: MarketAsset[],
  intelligence: MarketIntelligence | undefined,
  market: ReturnType<typeof buildMarketWeather>,
  providerRatio: number,
) {
  const observations = exactVenueObservations(assets, symbol);
  const changes = observations.map((item) => item.change24h);
  const positiveVenueShare = changes.length ? changes.filter((value) => value > 0).length / changes.length : 0.5;
  const medianChange24h = median(changes);
  const trend24hPct = candleTrendPct(intelligence);
  const fundingRatesPct = (intelligence?.derivatives ?? []).map((item) => item.fundingRate * 100);
  const fundingMedianPct = median(fundingRatesPct);
  const fundingMaxAbsPct = fundingRatesPct.length ? Math.max(...fundingRatesPct.map(Math.abs)) : 0;
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  if (market.breadth >= 60) {
    score += 1;
    reasons.push(`全市场上涨广度 ${market.breadth}%`);
  } else if (market.breadth <= 40) {
    score -= 1;
    reasons.push(`全市场上涨广度仅 ${market.breadth}%`);
  }
  if (medianChange24h >= 2) {
    score += 2;
    reasons.push(`跨所 24h 中位涨幅 ${medianChange24h.toFixed(2)}%`);
  } else if (medianChange24h <= -2) {
    score -= 2;
    reasons.push(`跨所 24h 中位跌幅 ${medianChange24h.toFixed(2)}%`);
  }
  if (observations.length >= 2 && positiveVenueShare >= 2 / 3) {
    score += 2;
    reasons.push(`${Math.round(positiveVenueShare * 100)}% 现货来源同向上涨`);
  } else if (observations.length >= 2 && positiveVenueShare <= 1 / 3) {
    score -= 2;
    reasons.push(`${Math.round((1 - positiveVenueShare) * 100)}% 现货来源同向下跌`);
  }
  if (trend24hPct >= 1) {
    score += 2;
    reasons.push(`衍生品小时路径 ${trend24hPct.toFixed(2)}%`);
  } else if (trend24hPct <= -1) {
    score -= 2;
    reasons.push(`衍生品小时路径 ${trend24hPct.toFixed(2)}%`);
  }
  if (fundingMaxAbsPct >= 0.08) {
    if (fundingMedianPct > 0 && score > 0) score -= 1;
    if (fundingMedianPct < 0 && score < 0) score += 1;
    warnings.push(`资金费率拥挤，绝对值最高 ${fundingMaxAbsPct.toFixed(3)}%`);
  }
  if (market.fomoIndex >= 75 && score > 0) {
    score -= 1;
    warnings.push(`FOMO 指数 ${market.fomoIndex}，追涨降权`);
  }
  if ((intelligence?.markSpreadPct ?? 0) >= 0.35) warnings.push(`跨所标记价差 ${intelligence?.markSpreadPct.toFixed(3)}%`);
  if (observations.length < 2) warnings.push("精确现货来源不足两家");
  if (!intelligence || intelligence.sourceMode === "unavailable") warnings.push("衍生品确认不可用");

  score = clamp(score, -8, 8);
  const bias: StrategyBias = score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";
  const confidence = clamp(Math.round(
    20
    + Math.min(observations.length, 4) * 8
    + Math.min(intelligence?.derivatives.length ?? 0, 3) * 10
    + providerRatio * 18
    - (intelligence?.sourceMode === "partial" ? 8 : intelligence?.sourceMode === "unavailable" ? 20 : 0),
  ), 0, 100);

  return {
    symbol,
    observations,
    consensus: {
      medianChange24h: round(medianChange24h),
      positiveVenueShare: round(positiveVenueShare),
      venueCount: observations.length,
    },
    derivatives: {
      sourceMode: intelligence?.sourceMode ?? "unavailable",
      candleVenue: intelligence?.candleVenue,
      candleCount: intelligence?.candles.length ?? 0,
      trend24hPct: round(trend24hPct),
      markSpreadPct: round(intelligence?.markSpreadPct ?? 0),
      fundingMedianPct: round(fundingMedianPct, 6),
      fundingMaxAbsPct: round(fundingMaxAbsPct, 6),
      venues: (intelligence?.derivatives ?? []).map((item) => ({
        venue: item.venue,
        markPrice: item.markPrice,
        fundingRatePct: round(item.fundingRate * 100, 6),
        openInterest: item.openInterest,
        openInterestValue: item.openInterestValue,
      })),
    },
    shadow: { score, bias, confidence, reasons, warnings },
  };
}

export function buildStrategyContext(input: StrategyContextInput) {
  const now = input.now ?? new Date();
  const providers = [...input.cryptoProviders, ...input.stockProviders];
  const liveProviders = providers.filter((provider) => provider.status === "live").length;
  const providerRatio = providers.length ? liveProviders / providers.length : 0;
  const cryptoAgeSeconds = ageSeconds(input.cryptoUpdatedAt, now);
  const stockAgeSeconds = ageSeconds(input.stockUpdatedAt, now);
  const oldestAgeSeconds = Math.max(cryptoAgeSeconds, stockAgeSeconds);
  const overall = providerRatio >= 0.65 && oldestAgeSeconds <= 60
    ? "healthy"
    : providerRatio >= 0.5 && oldestAgeSeconds <= 180 ? "partial" : "degraded";
  const market = buildMarketWeather({
    cryptoAssets: input.cryptoAssets,
    stockAssets: input.stockAssets,
    cryptoProviders: input.cryptoProviders,
    stockProviders: input.stockProviders,
    cryptoMode: input.cryptoMode,
    stockMode: input.stockMode,
    updatedAt: [input.cryptoUpdatedAt, input.stockUpdatedAt].sort().at(-1),
  });
  const symbols = input.symbols.map((symbol) => buildSymbolContext(
    symbol,
    input.cryptoAssets,
    input.intelligenceBySymbol[symbol],
    market,
    providerRatio,
  ));

  return {
    schemaVersion: 1 as const,
    mode: "shadow" as const,
    generatedAt: now.toISOString(),
    validForSeconds: 60,
    trust: {
      overall,
      liveProviders,
      totalProviders: providers.length,
      oldestAgeSeconds,
      cryptoMode: input.cryptoMode,
      stockMode: input.stockMode,
    },
    market: {
      score: market.score,
      condition: market.condition,
      weather: market.weather,
      breadth: market.breadth,
      cryptoBreadth: market.cryptoBreadth,
      stockBreadth: market.stockBreadth,
      fomoIndex: market.fomoIndex,
      volatility: market.volatility,
      highVolatilityShare: market.highVolatilityShare,
    },
    symbols,
  };
}
