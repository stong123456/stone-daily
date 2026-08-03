import type { MarketAsset } from "@/types/market";

export interface MarketWeatherInput {
  cryptoAssets: MarketAsset[];
  stockAssets: MarketAsset[];
  cryptoProviders?: Array<{ status: string }>;
  stockProviders?: Array<{ status: string }>;
  cryptoMode?: "live" | "cached" | "fallback" | "loading";
  stockMode?: "live" | "cached" | "fallback" | "loading";
  updatedAt?: string;
}

export type MarketWeatherCondition =
  | "heat-gusts"
  | "updraft"
  | "cold-front"
  | "turbulent"
  | "crypto-clear"
  | "stocks-clear"
  | "clear-warming"
  | "sun-cloud"
  | "cold-wave"
  | "cold-rain"
  | "quiet-cloud"
  | "clearing"
  | "overcast-clearing"
  | "cloudy-rotation";

export interface LiveMarketWeather {
  score: number;
  weather: string;
  condition: MarketWeatherCondition;
  tone: "warm" | "calm" | "windy" | "cold";
  headline: string;
  riskNote: string;
  updatedAt: string;
  mode: "live" | "partial" | "fallback";
  cryptoTemperature: number;
  stockTemperature: number;
  fomoIndex: number;
  breadth: number;
  cryptoBreadth: number;
  stockBreadth: number;
  volatility: number;
  highVolatilityShare: number;
  liveProviders: number;
  totalProviders: number;
  cryptoCount: number;
  stockCount: number;
  topMovers: MarketAsset[];
  laggards: MarketAsset[];
  highlights: string[];
  watchouts: string[];
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const leveragedTokenPattern = /(?:2|3|5)(?:L|S)$|(?:UP|DOWN|BULL|BEAR)$/i;

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function canonicalAssetSymbol(asset: MarketAsset) {
  const raw = (asset.underlying || asset.symbol).toUpperCase().trim();
  if (asset.market === "stock") return raw.replace(/^R(?=[A-Z])/, "").replace(/X$/, "");
  if (raw === "XBT") return "BTC";
  if (raw === "XDG") return "DOGE";
  return raw;
}

export function canonicalAssetId(asset: MarketAsset) {
  return asset.canonicalId || `${asset.market}:${canonicalAssetSymbol(asset)}`;
}

export function isWatchedAsset(watchlistIds: string[], asset: MarketAsset) {
  return watchlistIds.includes(canonicalAssetId(asset)) || watchlistIds.includes(asset.id);
}

export function uniqueMarketAssets(assets: MarketAsset[]) {
  const bySymbol = new Map<string, MarketAsset>();
  for (const asset of assets) {
    if (!Number.isFinite(asset.price) || asset.price <= 0 || !Number.isFinite(asset.change24h)) continue;
    if (asset.market === "crypto" && leveragedTokenPattern.test(asset.symbol)) continue;
    const key = `${asset.market}:${canonicalAssetSymbol(asset)}`;
    const current = bySymbol.get(key);
    if (!current || asset.volume > current.volume) bySymbol.set(key, asset);
  }
  return [...bySymbol.values()];
}

export function topUniqueMovers(assets: MarketAsset[], limit = 20) {
  const unique = uniqueMarketAssets(assets);
  return unique
    .sort((a, b) => b.change24h - a.change24h || b.volume - a.volume)
    .slice(0, limit);
}

function marketMetrics(assets: MarketAsset[]) {
  const unique = uniqueMarketAssets(assets);
  if (!unique.length) return { assets: unique, breadth: 50, medianChange: 0, volatility: 0, temperature: 50 };
  const changes = unique.map((asset) => asset.change24h);
  const breadth = (changes.filter((change) => change > 0).length / changes.length) * 100;
  const medianChange = median(changes);
  const volatility = median(changes.map(Math.abs));
  const temperature = clamp(Math.round(22 + breadth * 0.52 + medianChange * 4.5));
  return { assets: unique, breadth, medianChange, volatility, temperature };
}

function formatMove(asset?: MarketAsset) {
  if (!asset) return "暂无有效行情";
  const sign = asset.change24h >= 0 ? "+" : "";
  return `${canonicalAssetSymbol(asset)} ${sign}${asset.change24h.toFixed(2)}%`;
}

interface WeatherSignals {
  score: number;
  fomoIndex: number;
  breadth: number;
  volatility: number;
  highVolatilityShare: number;
  cryptoBreadth: number;
  stockBreadth: number;
}

export function classifyMarketWeather(signals: WeatherSignals): { condition: MarketWeatherCondition; weather: string; tone: LiveMarketWeather["tone"] } {
  const breadthGap = signals.cryptoBreadth - signals.stockBreadth;
  const turbulent = signals.highVolatilityShare >= 28 || signals.volatility >= 5;

  if (turbulent && signals.breadth >= 62) return { condition: "updraft", weather: "强风拉升", tone: "windy" };
  if (turbulent && signals.breadth <= 38) return { condition: "cold-front", weather: "寒雨急风", tone: "cold" };
  if (signals.fomoIndex >= 76) return { condition: "heat-gusts", weather: "晴热有阵风", tone: "windy" };
  if (turbulent) return { condition: "turbulent", weather: "多云伴强风", tone: "windy" };
  if (breadthGap >= 30) return { condition: "crypto-clear", weather: "币圈晴、币股雨", tone: "calm" };
  if (breadthGap <= -30) return { condition: "stocks-clear", weather: "币股晴、币圈雨", tone: "calm" };
  if (signals.breadth >= 76 && signals.score >= 68) return { condition: "clear-warming", weather: "晴朗升温", tone: "warm" };
  if (signals.breadth >= 60) return { condition: "sun-cloud", weather: "晴间多云", tone: "warm" };
  if (signals.breadth <= 22) return { condition: "cold-wave", weather: "寒潮阴雨", tone: "cold" };
  if (signals.breadth <= 40) return { condition: "cold-rain", weather: "阴雨偏冷", tone: "cold" };
  if (signals.volatility <= 1 && signals.breadth >= 45 && signals.breadth <= 55) return { condition: "quiet-cloud", weather: "低云盘整", tone: "calm" };
  if (signals.breadth > 52) return { condition: "clearing", weather: "多云转晴", tone: "warm" };
  if (signals.breadth < 48) return { condition: "overcast-clearing", weather: "阴转多云", tone: "calm" };
  return { condition: "cloudy-rotation", weather: "多云分化", tone: "calm" };
}

export function buildMarketWeather(input: MarketWeatherInput): LiveMarketWeather {
  const crypto = marketMetrics(input.cryptoAssets);
  const stocks = marketMetrics(input.stockAssets);
  const all = [...crypto.assets, ...stocks.assets];
  const breadth = all.length ? (all.filter((asset) => asset.change24h > 0).length / all.length) * 100 : 50;
  const volatility = median(all.map((asset) => Math.abs(asset.change24h)));
  const highVolatilityShare = all.length ? (all.filter((asset) => Math.abs(asset.change24h) >= 5).length / all.length) * 100 : 0;
  const topMovers = topUniqueMovers(all, 8);
  const laggards = uniqueMarketAssets(all).sort((a, b) => a.change24h - b.change24h).slice(0, 5);
  const hotAverage = topMovers.length ? topMovers.slice(0, 5).reduce((sum, asset) => sum + Math.max(0, asset.change24h), 0) / Math.min(5, topMovers.length) : 0;
  const fomoIndex = clamp(Math.round(12 + highVolatilityShare * 0.9 + Math.min(15, hotAverage) * 2.2 + Math.max(0, breadth - 55) * 0.35));
  const score = clamp(Math.round(crypto.temperature * 0.58 + stocks.temperature * 0.42));
  const { condition, weather, tone } = classifyMarketWeather({
    score,
    fomoIndex,
    breadth,
    volatility,
    highVolatilityShare,
    cryptoBreadth: crypto.breadth,
    stockBreadth: stocks.breadth,
  });

  const cryptoProviders = input.cryptoProviders ?? [];
  const stockProviders = input.stockProviders ?? [];
  const providers = [...cryptoProviders, ...stockProviders];
  const liveProviders = providers.filter((provider) => provider.status === "live").length;
  const strongest = topMovers[0];
  const weakest = laggards[0];
  const mode = input.cryptoMode === "fallback" && input.stockMode === "fallback"
    ? "fallback"
    : input.cryptoMode === "live" && input.stockMode === "live" ? "live" : "partial";

  return {
    score,
    weather,
    condition,
    tone,
    headline: `全市场上涨家数约 ${Math.round(breadth)}%，币圈温度 ${crypto.temperature}，币股温度 ${stocks.temperature}。${strongest ? `当前领涨代表是 ${formatMove(strongest)}` : "正在等待更多有效报价"}。`,
    riskNote: fomoIndex >= 70
      ? `热点资产的涨速明显快于市场中位数，追逐 ${formatMove(strongest)} 一类快速拉升前，先核对成交深度和消息来源。`
      : volatility >= 4
        ? `市场分化和振幅偏高，最弱代表 ${formatMove(weakest)}；不要用单一交易所的一根 K 线代替全市场判断。`
        : "整体波动仍可控，但不同交易所、现货与币股产品之间的价格和权利结构不能混为一谈。",
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    mode,
    cryptoTemperature: crypto.temperature,
    stockTemperature: stocks.temperature,
    fomoIndex,
    breadth: Math.round(breadth),
    cryptoBreadth: Math.round(crypto.breadth),
    stockBreadth: Math.round(stocks.breadth),
    volatility: Number(volatility.toFixed(2)),
    highVolatilityShare: Math.round(highVolatilityShare),
    liveProviders,
    totalProviders: providers.length,
    cryptoCount: crypto.assets.length,
    stockCount: stocks.assets.length,
    topMovers,
    laggards,
    highlights: [
      `币圈上涨广度 ${Math.round(crypto.breadth)}%，中位波动 ${crypto.volatility.toFixed(2)}%。`,
      `币股上涨广度 ${Math.round(stocks.breadth)}%，中位波动 ${stocks.volatility.toFixed(2)}%。`,
      strongest ? `${formatMove(strongest)} 位于去重后的涨幅前列，代表行情来自 ${strongest.venue ?? "当前数据源"}。` : "当前没有足够的领涨资产样本。",
    ],
    watchouts: [
      fomoIndex >= 70 ? `FOMO 指数 ${fomoIndex}，短线追高风险已经升温。` : `FOMO 指数 ${fomoIndex}，情绪尚未进入极端区间。`,
      `${Math.round(highVolatilityShare)}% 的代表资产 24 小时振幅超过 5%。`,
      providers.length ? `${liveProviders}/${providers.length} 个行情源在线；离线源不会被悄悄算进结论。` : "行情源状态尚在读取，结论应视为暂时性。",
    ],
  };
}
