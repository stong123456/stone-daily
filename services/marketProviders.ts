import type { MarketAsset } from "@/types/market";
import type { MarketSpread, StreamingSummary } from "@/types/market";

export interface MarketFeedResult {
  assets: MarketAsset[];
  source: string;
  mode: "live" | "cached" | "fallback";
  updatedAt: string;
  providers?: MarketProviderSummary[];
  spreads?: MarketSpread[];
  streaming?: StreamingSummary;
  cacheLayer?: "redis" | "memory" | "file" | "direct";
}

export interface MarketProviderSummary {
  name: string;
  product: string;
  count: number;
  status: "live" | "cached" | "catalog" | "unavailable";
  docsUrl?: string;
  latencyMs?: number;
  updatedAt?: string;
}

const CLIENT_CACHE_TTL_MS = 15_000;
const clientFeedCache = new Map<string, { expiresAt: number; value: MarketFeedResult }>();
const pendingFeeds = new Map<string, Promise<MarketFeedResult>>();

export async function fetchMarketFeed(kind: "crypto" | "stocks", query = ""): Promise<MarketFeedResult> {
  const normalizedQuery = query.trim();
  const cacheKey = `${kind}:${normalizedQuery.toUpperCase()}`;
  const cached = clientFeedCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = pendingFeeds.get(cacheKey);
  if (pending) return pending;

  const params = new URLSearchParams({ kind });
  if (normalizedQuery) params.set("q", normalizedQuery);
  const request = fetch(`/api/markets?${params.toString()}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("行情服务暂时不可用");
      return response.json() as Promise<MarketFeedResult>;
    })
    .then((value) => {
      clientFeedCache.set(cacheKey, { expiresAt: Date.now() + CLIENT_CACHE_TTL_MS, value });
      return value;
    })
    .finally(() => pendingFeeds.delete(cacheKey));
  pendingFeeds.set(cacheKey, request);
  return request;
}

export const providerPlan = [
  { market: "币股现货", provider: "Bitget", coverage: "Reality rToken / USDT 现货目录与 ticker", requirement: "公开行情接口；交易资格按地区判断" },
  { market: "币股现货", provider: "Bybit", coverage: "symbolType=xstocks 的现货目录、ticker 与换算倍数", requirement: "公开 V5 行情接口；保留 xstockMultiplier" },
  { market: "币股现货", provider: "Kraken", coverage: "xStocks 后缀及 tokenized_asset 分类兼容的目录与 ticker", requirement: "公开 Spot REST；明确 API/地区限制和非股东权利" },
  { market: "币股永续", provider: "OKX", coverage: "instCategory=3 的币股永续合约、ticker 与 K 线", requirement: "公开行情接口；明确标注合约风险" },
  { market: "链上币股", provider: "Binance Web3", coverage: "Ondo 币股目录、链上价格、市场状态、鉴证与 K 线", requirement: "按标的读取动态数据，并保留 multiplier" },
  { market: "币圈", provider: "主流交易所聚合", coverage: "Binance、OKX、Bitget、Bybit、HTX、Kraken、KuCoin、Gate、MEXC、Coinbase", requirement: "公开市场接口并发；单源超时和故障隔离" },
  { market: "币圈目录", provider: "CoinGecko", coverage: "全币种目录、市值、元数据与跨交易所价格", requirement: "生产版 API 套餐" },
] as const;
