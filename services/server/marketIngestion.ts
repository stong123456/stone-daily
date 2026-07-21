import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { expandedCryptoData, expandedStockData } from "@/data/expandedMarket";
import {
  cryptoProviderAdapters,
  providerSummary,
  stockProviderAdapters,
  type MarketProviderAdapter,
  type ProviderResult,
  type ProviderSummary,
} from "@/services/server/exchangeMarketAdapters";
import { readCachedJson, SNAPSHOT_KEYS, writeCachedJson, type CachedValue } from "@/services/server/marketSnapshotStore";
import type { MarketAsset, StreamQuoteSnapshot } from "@/types/market";

export type MarketFeedKind = "crypto" | "stocks";

export type MarketSnapshotEnvelope = {
  version: 2;
  kind: MarketFeedKind;
  assets: MarketAsset[];
  providers: ProviderSummary[];
  source: string;
  mode: "live" | "cached" | "fallback";
  updatedAt: string;
};

type CachedStockFeed = {
  assets: MarketAsset[];
  providers: Array<Omit<ProviderSummary, "docsUrl"> & { docsUrl?: string }>;
  source: string;
  updatedAt: string;
};

type ProviderOutcome = {
  adapter: MarketProviderAdapter;
  result?: ProviderResult;
  latencyMs: number;
};

const MAX_CRYPTO_PER_PROVIDER = 350;
const MAX_QUERY_PER_PROVIDER = 150;

function matchesQuery(asset: MarketAsset, query: string) {
  if (!query) return true;
  return [asset.symbol, asset.name, asset.venue, asset.sector, asset.narrative, asset.underlying]
    .some((value) => value?.toUpperCase().includes(query));
}

function uniqueAssets(assets: MarketAsset[]) {
  return Array.from(new Map(assets.map((asset) => [asset.id, asset])).values());
}

async function runAdapters(adapters: MarketProviderAdapter[]): Promise<ProviderOutcome[]> {
  return Promise.all(adapters.map(async (adapter) => {
    const startedAt = performance.now();
    try {
      const result = await adapter.load();
      return { adapter, result, latencyMs: Math.round(performance.now() - startedAt) };
    } catch {
      return { adapter, latencyMs: Math.round(performance.now() - startedAt) };
    }
  }));
}

async function readLegacyStockCache() {
  try {
    const cachePath = path.join(process.cwd(), "data", "runtime", "tokenized-stocks.json");
    const payload = JSON.parse(await readFile(cachePath, "utf8")) as CachedStockFeed;
    if (!payload.assets?.length || !Number.isFinite(Date.parse(payload.updatedAt))) return null;
    return payload;
  } catch {
    return null;
  }
}

async function collectCrypto(query: string): Promise<MarketSnapshotEnvelope> {
  const outcomes = await runAdapters(cryptoProviderAdapters);
  const providers = outcomes.map(({ adapter, result, latencyMs }) => providerSummary(adapter, result, latencyMs));
  const assets = uniqueAssets(outcomes.flatMap(({ result }) => {
    if (!result) return [];
    return result.assets
      .filter((asset) => matchesQuery(asset, query))
      .sort((a, b) => b.volume - a.volume || a.symbol.localeCompare(b.symbol))
      .slice(0, query ? MAX_QUERY_PER_PROVIDER : MAX_CRYPTO_PER_PROVIDER);
  }));
  const updatedAt = new Date().toISOString();

  if (assets.length) {
    const liveCount = providers.filter((provider) => provider.status === "live").length;
    return { version: 2, kind: "crypto", assets, providers, source: `${liveCount}/${providers.length} 个交易所官方现货源`, mode: "live", updatedAt };
  }

  return {
    version: 2,
    kind: "crypto",
    assets: expandedCryptoData.filter((asset) => matchesQuery(asset, query)).map((asset) => ({ ...asset, feedMode: "fallback" })),
    providers,
    source: "Stone Daily 币圈演示目录",
    mode: "fallback",
    updatedAt,
  };
}

async function collectStocks(query: string): Promise<MarketSnapshotEnvelope> {
  const [outcomes, cached] = await Promise.all([runAdapters(stockProviderAdapters), readLegacyStockCache()]);
  const cachedAssets = cached?.assets ?? [];
  const providers: ProviderSummary[] = [];
  let hasLivePrices = false;
  let hasCachedPrices = false;

  const combined = outcomes.flatMap(({ adapter, result, latencyMs }): MarketAsset[] => {
    if (result?.assets.length) {
      hasLivePrices = true;
      providers.push(providerSummary(adapter, result, latencyMs));
      return result.assets.map((asset) => ({ ...asset, feedMode: "live" }));
    }

    const providerCache = cachedAssets.filter((asset) => asset.venue === adapter.name);
    if (providerCache.length && cached) {
      hasCachedPrices = true;
      const cachedProvider = cached.providers.find((provider) => provider.name === adapter.name);
      providers.push({
        name: adapter.name,
        product: adapter.product,
        count: cachedProvider?.count ?? providerCache.length,
        status: "cached",
        docsUrl: adapter.docsUrl,
        latencyMs,
        updatedAt: cached.updatedAt,
      });
      return providerCache.map((asset) => ({ ...asset, feedMode: "cached", asOf: cached.updatedAt }));
    }

    providers.push(providerSummary(adapter, result, latencyMs));
    return [];
  });

  const assets = uniqueAssets(combined)
    .filter((asset) => matchesQuery(asset, query))
    .sort((a, b) => (a.underlying ?? a.symbol).localeCompare(b.underlying ?? b.symbol) || (a.venue ?? "").localeCompare(b.venue ?? ""))
    .slice(0, query ? 750 : 1800);
  const updatedAt = new Date().toISOString();

  if (assets.length) {
    const liveNames = providers.filter((provider) => provider.status === "live").map((provider) => provider.name);
    return {
      version: 2,
      kind: "stocks",
      assets,
      providers,
      source: `${liveNames.join(" + ") || "官方接口"}${hasCachedPrices ? " + 最近成功缓存" : ""}`,
      mode: hasLivePrices ? "live" : "cached",
      updatedAt,
    };
  }

  return {
    version: 2,
    kind: "stocks",
    assets: expandedStockData.filter((asset) => matchesQuery(asset, query)).map((asset) => ({ ...asset, feedMode: "fallback" })),
    providers,
    source: "Stone Daily 币股演示目录",
    mode: "fallback",
    updatedAt,
  };
}

export async function collectMarketSnapshot(kind: MarketFeedKind, query = "") {
  return kind === "stocks" ? collectStocks(query) : collectCrypto(query);
}

export async function collectAndStoreMarketSnapshot(kind: MarketFeedKind) {
  const snapshot = await collectMarketSnapshot(kind);
  await writeCachedJson(SNAPSHOT_KEYS[kind], snapshot, 180);
  return snapshot;
}

export async function collectAndStoreAllMarkets() {
  const [crypto, stocks] = await Promise.all([
    collectAndStoreMarketSnapshot("crypto"),
    collectAndStoreMarketSnapshot("stocks"),
  ]);
  return { crypto, stocks };
}

export async function readMarketSnapshot(kind: MarketFeedKind): Promise<CachedValue<MarketSnapshotEnvelope> | null> {
  return readCachedJson<MarketSnapshotEnvelope>(SNAPSHOT_KEYS[kind]);
}

export async function readStreamQuoteSnapshot() {
  return readCachedJson<StreamQuoteSnapshot>(SNAPSHOT_KEYS.streamQuotes, { preferRemote: true });
}
