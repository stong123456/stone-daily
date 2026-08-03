import type { AIExplanation, MarketAsset } from "../types/market";
import { canonicalAssetSymbol, uniqueMarketAssets } from "./marketWeather.ts";

export const featuredCryptoSymbols = ["BTC", "ETH", "SOL", "BNB", "OKB", "DOGE", "PEPE"] as const;
export const featuredStockSymbols = ["NVDA", "TSLA", "AAPL", "MSFT", "META", "COIN", "MSTR", "HOOD"] as const;

function sourceScore(asset: MarketAsset) {
  const feed = asset.feedMode === "live" ? 3 : asset.feedMode === "cached" ? 2 : 1;
  const venue = asset.venue && asset.venue !== "Global" ? 1 : 0;
  return feed * 1_000_000_000_000_000 + venue * 100_000_000_000_000 + Math.max(0, asset.volume);
}

export function selectFeaturedAssets(assets: MarketAsset[], symbols: readonly string[]) {
  const candidates = new Map<string, MarketAsset>();
  for (const asset of assets) {
    const symbol = canonicalAssetSymbol(asset);
    if (!symbols.includes(symbol)) continue;
    const current = candidates.get(symbol);
    if (!current || sourceScore(asset) > sourceScore(current)) candidates.set(symbol, asset);
  }
  return symbols.flatMap((symbol) => {
    const asset = candidates.get(symbol);
    return asset ? [asset] : [];
  });
}

export function buildDailyRankings(assets: MarketAsset[], limit = 5) {
  const unique = uniqueMarketAssets(assets);
  const comparableVolumeChanges = unique.filter((asset) => Math.abs(asset.volumeChange) >= 0.01);
  return {
    gainers: [...unique].sort((left, right) => right.change24h - left.change24h || right.volume - left.volume).slice(0, limit),
    losers: [...unique].sort((left, right) => left.change24h - right.change24h || right.volume - left.volume).slice(0, limit),
    volumeSurges: comparableVolumeChanges.sort((left, right) => Math.abs(right.volumeChange) - Math.abs(left.volumeChange) || right.volume - left.volume).slice(0, limit),
  };
}

export function buildFocusShortlist(assets: MarketAsset[], limit = 3) {
  return uniqueMarketAssets(assets)
    .filter((asset) => Number.isFinite(asset.change24h))
    .sort((left, right) => Math.abs(right.change24h) - Math.abs(left.change24h) || right.volume - left.volume)
    .slice(0, Math.max(0, limit));
}

function firstSentence(value: string) {
  const trimmed = value.trim();
  const cjkSentence = trimmed.match(/^.*?[。！？!?]/)?.[0];
  const englishSentence = trimmed.match(/^.*?\.(?=\s|$)/)?.[0];
  return (cjkSentence ?? englishSentence ?? trimmed).trim();
}

export function compactExplanation(explanation: AIExplanation) {
  return {
    surface: firstSentence(explanation.whatHappened),
    watch: firstSentence(explanation.watchNext[0] ?? explanation.possibleReasons[0] ?? explanation.plainSummary),
    misread: firstSentence(explanation.commonMistake),
    summary: firstSentence(explanation.plainSummary),
  };
}
