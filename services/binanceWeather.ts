import { buildMarketWeather, canonicalAssetSymbol, uniqueMarketAssets, type LiveMarketWeather } from "./marketWeather.ts";
import type { MarketAsset } from "../types/market.ts";

export interface BinanceWeatherLane {
  catalogCount: number;
  pricedCount: number;
  rankedCount: number;
  breadth: number;
  gainers: MarketAsset[];
  decliners: MarketAsset[];
}

export interface BinanceWeatherSnapshot {
  version: 1;
  scope: "binance";
  updatedAt: string;
  mode: "live" | "partial" | "unavailable";
  weather: LiveMarketWeather;
  crypto: BinanceWeatherLane;
  stocks: BinanceWeatherLane;
  sources: Array<{
    name: string;
    product: string;
    status: "live" | "unavailable";
    docsUrl: string;
  }>;
  copy: { zh: string; en: string };
}

export interface BinanceWeatherInput {
  cryptoAssets: MarketAsset[];
  stockAssets: MarketAsset[];
  cryptoCatalogCount?: number;
  stockCatalogCount?: number;
  cryptoLive: boolean;
  stockLive: boolean;
  updatedAt?: string;
}

const MIN_CRYPTO_QUOTE_VOLUME = 100_000;
const stableAssets = new Set(["USDT", "USDC", "FDUSD", "USDE", "DAI", "TUSD", "USD1", "USDS", "PYUSD", "BUSD"]);

function signedMove(asset?: MarketAsset) {
  if (!asset) return "暂无有效样本";
  const sign = asset.change24h >= 0 ? "+" : "";
  return `${canonicalAssetSymbol(asset)} ${sign}${asset.change24h.toFixed(2)}%`;
}

function englishMove(asset?: MarketAsset) {
  if (!asset) return "No valid sample";
  const sign = asset.change24h >= 0 ? "+" : "";
  return `${canonicalAssetSymbol(asset)} ${sign}${asset.change24h.toFixed(2)}%`;
}

function rankLane(assets: MarketAsset[], catalogCount: number, isCrypto: boolean): BinanceWeatherLane {
  const priced = uniqueMarketAssets(assets);
  const ranked = priced.filter((asset) => {
    if (!isCrypto) return true;
    return !stableAssets.has(canonicalAssetSymbol(asset)) && asset.volume >= MIN_CRYPTO_QUOTE_VOLUME;
  });
  const breadth = ranked.length ? Math.round((ranked.filter((asset) => asset.change24h > 0).length / ranked.length) * 100) : 50;
  const gainers = ranked.filter((asset) => asset.change24h > 0).sort((a, b) => b.change24h - a.change24h || b.volume - a.volume).slice(0, 10);
  const decliners = ranked.filter((asset) => asset.change24h < 0).sort((a, b) => a.change24h - b.change24h || b.volume - a.volume).slice(0, 10);
  return {
    catalogCount: Math.max(catalogCount, priced.length),
    pricedCount: priced.length,
    rankedCount: ranked.length,
    breadth,
    gainers,
    decliners,
  };
}

function compactMoves(assets: MarketAsset[], language: "zh" | "en", limit = 3) {
  const formatter = language === "en" ? englishMove : signedMove;
  return assets.slice(0, limit).map(formatter).join("、") || (language === "en" ? "No valid sample" : "暂无有效样本");
}

function chinaStamp(value: string, language: "zh" | "en") {
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function buildBinanceWeatherCopy(snapshot: Omit<BinanceWeatherSnapshot, "copy">) {
  const { weather, crypto, stocks, updatedAt } = snapshot;
  const zhStamp = chinaStamp(updatedAt, "zh");
  const enStamp = chinaStamp(updatedAt, "en");
  const direction = weather.breadth >= 58
    ? "上涨面占优，但仍要分辨普涨与少数标的拉动。"
    : weather.breadth <= 42
      ? "下跌面占优，先观察广度修复，不把单点反弹当成反转。"
      : "涨跌接近平衡，当前更像结构性轮动。";
  const directionEn = weather.breadth >= 58
    ? "Advancers lead, but distinguish broad participation from a narrow rally."
    : weather.breadth <= 42
      ? "Decliners lead; wait for breadth to repair before calling a reversal."
      : "Advancers and decliners are close to balance, pointing to rotation rather than one-way risk appetite.";

  return {
    zh: [
      `Binance 市场天气｜${zhStamp}`,
      "",
      `今日天气：${weather.weather}｜综合温度 ${weather.score}/100｜FOMO ${weather.fomoIndex}/100`,
      `Binance 样本上涨广度 ${weather.breadth}%，中位绝对波动 ${weather.volatility.toFixed(2)}%。${direction}`,
      "",
      `【加密货币现货】上涨广度 ${crypto.breadth}%｜有效样本 ${crypto.rankedCount} 个`,
      `涨幅前三：${compactMoves(crypto.gainers, "zh")}`,
      `跌幅前三：${compactMoves(crypto.decliners, "zh")}`,
      "",
      `【Binance Web3 · Ondo 链上币股】上涨广度 ${stocks.breadth}%｜实时报价 ${stocks.pricedCount}/${stocks.catalogCount} 个目录标的`,
      `涨幅前三：${compactMoves(stocks.gainers, "zh")}`,
      `跌幅前三：${compactMoves(stocks.decliners, "zh")}`,
      "",
      "普通人怎么看：先看上涨广度是否持续，再看领涨资产的成交深度；不要因为一个极端涨幅就把整个市场理解成牛市。币股代币不等于登记股票，价格还受换算倍数、链上流动性、托管和地区规则影响。",
      "",
      "数据源：Binance Spot 官方 24h ticker；Binance Web3 Ondo 币股公开目录与动态行情。加密榜已剔除稳定币、杠杆币和 24h 成交额低于 10 万 USDT 的极低流动性样本。",
      "Stone Daily｜@Stone141319｜信息仅供参考，不构成投资建议",
      "#Binance #币安 #加密货币 #币股 #StoneDaily",
    ].join("\n"),
    en: [
      `Binance Market Weather | ${enStamp} Beijing time`,
      "",
      `Weather: ${weather.weather} | Composite ${weather.score}/100 | FOMO ${weather.fomoIndex}/100`,
      `Breadth is ${weather.breadth}% and median absolute move is ${weather.volatility.toFixed(2)}%. ${directionEn}`,
      "",
      `Crypto spot: breadth ${crypto.breadth}% across ${crypto.rankedCount} eligible pairs`,
      `Top gainers: ${compactMoves(crypto.gainers, "en")}`,
      `Top decliners: ${compactMoves(crypto.decliners, "en")}`,
      "",
      `Binance Web3 Ondo tokenized stocks: breadth ${stocks.breadth}% with live prices for ${stocks.pricedCount}/${stocks.catalogCount} catalogue underlyings`,
      `Top gainers: ${compactMoves(stocks.gainers, "en")}`,
      `Top decliners: ${compactMoves(stocks.decliners, "en")}`,
      "",
      "Read it calmly: confirm breadth and depth before extrapolating one extreme mover to the whole market. Tokenized stocks are not registered shares and remain subject to multipliers, on-chain liquidity, custody and regional rules.",
      "",
      "Sources: official Binance Spot 24h tickers and Binance Web3 public Ondo tokenized-stock data. Stablecoins, leveraged tokens and crypto pairs below 100k USDT in 24h quote volume are excluded from rankings.",
      "Stone Daily | @Stone141319 | Information only, not investment advice",
      "#Binance #Crypto #TokenizedStocks #StoneDaily",
    ].join("\n"),
  };
}

export function buildBinanceWeatherSnapshot(input: BinanceWeatherInput): BinanceWeatherSnapshot {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const crypto = rankLane(input.cryptoAssets, input.cryptoCatalogCount ?? input.cryptoAssets.length, true);
  const stocks = rankLane(input.stockAssets, input.stockCatalogCount ?? input.stockAssets.length, false);
  const eligibleCryptoAssets = input.cryptoAssets.filter((asset) => !stableAssets.has(canonicalAssetSymbol(asset)) && asset.volume >= MIN_CRYPTO_QUOTE_VOLUME);
  const weatherBase = buildMarketWeather({
    cryptoAssets: input.cryptoLive ? eligibleCryptoAssets : [],
    stockAssets: input.stockLive ? input.stockAssets : [],
    cryptoProviders: [{ status: input.cryptoLive ? "live" : "unavailable" }],
    stockProviders: [{ status: input.stockLive ? "live" : "unavailable" }],
    cryptoMode: input.cryptoLive ? "live" : "fallback",
    stockMode: input.stockLive ? "live" : "fallback",
    updatedAt,
  });
  const strongest = [...crypto.gainers, ...stocks.gainers].sort((a, b) => b.change24h - a.change24h)[0];
  const weakest = [...crypto.decliners, ...stocks.decliners].sort((a, b) => a.change24h - b.change24h)[0];
  const weather: LiveMarketWeather = {
    ...weatherBase,
    headline: `Binance 样本上涨家数约 ${weatherBase.breadth}%，加密现货温度 ${weatherBase.cryptoTemperature}，Web3 币股温度 ${weatherBase.stockTemperature}。${strongest ? `当前领涨代表是 ${signedMove(strongest)}` : "正在等待更多有效报价"}。`,
    riskNote: `Binance 单所行情适合观察本平台结构，不代表全市场共识。${weakest ? `当前领跌代表 ${signedMove(weakest)}；` : ""}币股代币不等于登记股票，需同时核对换算倍数、流动性、托管与地区规则。`,
    highlights: [
      `Binance 加密现货上涨广度 ${crypto.breadth}%，榜单纳入 ${crypto.rankedCount} 个有效 USDT 样本。`,
      `Binance Web3 币股上涨广度 ${stocks.breadth}%，${stocks.pricedCount}/${stocks.catalogCount} 个目录标的取得动态报价。`,
      strongest ? `${signedMove(strongest)} 位于 Binance 两类样本的涨幅前列。` : "当前没有足够的领涨样本。",
    ],
    watchouts: [
      `FOMO 指数 ${weatherBase.fomoIndex}，${weatherBase.highVolatilityShare}% 的代表样本 24 小时波动超过 5%。`,
      "加密榜单仅按 Binance USDT 现货 24 小时数据计算，并过滤稳定币、杠杆币与极低成交样本。",
      "币股榜单来自 Binance Web3 的 Ondo 公开数据，不是 Binance CEX 股票现货市场。",
    ],
  };
  const snapshotWithoutCopy: Omit<BinanceWeatherSnapshot, "copy"> = {
    version: 1,
    scope: "binance",
    updatedAt,
    mode: input.cryptoLive && input.stockLive ? "live" : input.cryptoLive || input.stockLive ? "partial" : "unavailable",
    weather,
    crypto,
    stocks,
    sources: [
      { name: "Binance", product: "Spot USDT 现货", status: input.cryptoLive ? "live" : "unavailable", docsUrl: "https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints" },
      { name: "Binance Web3", product: "Ondo 链上币股", status: input.stockLive ? "live" : "unavailable", docsUrl: "https://www.binance.com/skills/detail/binance-web3/binance-tokenized-securities-info" },
    ],
  };
  return { ...snapshotWithoutCopy, copy: buildBinanceWeatherCopy(snapshotWithoutCopy) };
}
