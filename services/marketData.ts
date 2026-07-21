import { cryptoData, marketSnapshot, stockData } from "@/data/market";
import type { MarketAsset, MarketSnapshot } from "@/types/market";

const simulateLatency = (ms = 420) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  await simulateLatency(180);
  return marketSnapshot;
}

export async function fetchCryptoMarkets(): Promise<MarketAsset[]> {
  await simulateLatency();
  return cryptoData;
}

export async function fetchStockMarkets(): Promise<MarketAsset[]> {
  await simulateLatency();
  return stockData;
}

export async function fetchAssetQuote(symbol: string): Promise<MarketAsset | null> {
  await simulateLatency(260);
  const normalized = symbol.trim().toUpperCase();
  return [...cryptoData, ...stockData].find((asset) => asset.symbol === normalized) ?? null;
}
