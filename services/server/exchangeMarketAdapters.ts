import "server-only";

import type { MarketAsset } from "@/types/market";

export type ProviderStatus = "live" | "cached" | "catalog" | "unavailable";

export type ProviderSummary = {
  name: string;
  product: string;
  count: number;
  status: ProviderStatus;
  docsUrl: string;
  latencyMs?: number;
  updatedAt?: string;
};

export type ProviderResult = {
  assets: MarketAsset[];
  count: number;
  status?: Exclude<ProviderStatus, "unavailable" | "cached">;
};

export type MarketProviderAdapter = {
  name: string;
  product: string;
  docsUrl: string;
  load: () => Promise<ProviderResult>;
};

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
};

type OkxTicker = {
  instId: string;
  last: string;
  open24h: string;
  volCcy24h: string;
};

type OkxInstrument = {
  instId: string;
  instCategory: string;
  state: string;
};

type BitgetSymbol = {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
};

type BitgetTicker = {
  symbol: string;
  lastPr: string;
  change24h: string;
  quoteVolume: string;
};

type BybitInstrument = {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
  symbolType?: string;
  xstockMultiplier?: string;
};

type BybitTicker = {
  symbol: string;
  lastPrice: string;
  price24hPcnt: string;
  turnover24h: string;
};

type KrakenPair = {
  altname?: string;
  wsname?: string;
  base: string;
  quote: string;
  aclass_base?: string;
  status?: string;
};

type KrakenTicker = {
  c?: string[];
  o?: string;
  v?: string[];
};

type HtxTicker = {
  symbol: string;
  open: number;
  close: number;
  vol: number;
  amount: number;
};

type CoinbaseProduct = {
  product_id: string;
  price: string;
  price_percentage_change_24h: string;
  volume_24h: string;
  approximate_quote_24h_volume?: string;
  base_currency_id: string;
  quote_currency_id: string;
  product_type?: string;
  trading_disabled?: boolean;
  is_disabled?: boolean;
};

type BinanceStockListing = {
  chainId: string;
  contractAddress: string;
  symbol: string;
  ticker: string;
  multiplier: string;
};

type BinanceStockDynamic = {
  symbol: string;
  ticker: string;
  tokenInfo: {
    price: string;
    priceChangePct24h: string;
    sharesMultiplier: string;
  };
};

const STABLE_QUOTES = new Set(["USDT", "USDC", "USD", "USDG"]);
const STABLE_QUOTES_BY_LENGTH = [...STABLE_QUOTES].sort((a, b) => b.length - a.length);
const BLOCKED_SUFFIXES = ["UP", "DOWN", "BULL", "BEAR"];
const BINANCE_FEATURED_TICKERS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META", "GOOGL", "QQQ"];

const STOCK_NAMES: Record<string, string> = {
  AAPL: "苹果",
  AMZN: "亚马逊",
  GOOGL: "Alphabet",
  META: "Meta",
  MSFT: "微软",
  NVDA: "英伟达",
  QQQ: "纳斯达克 100 ETF",
  SPY: "标普 500 ETF",
  TSLA: "特斯拉",
};

function numberOrZero(value: string | number | undefined | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentOrZero(value: string | undefined) {
  return numberOrZero(value?.replace("%", ""));
}

function normalizedPair(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function tokenName(ticker: string) {
  return `${STOCK_NAMES[ticker] ?? ticker} 币股`;
}

function krakenXStockUnderlying(key: string, pair: KrakenPair) {
  if (pair.aclass_base === "tokenized_asset") return pair.base.replace(/x$/i, "").toUpperCase();

  const quoteSymbols = [pair.quote, "USDT", "USDC", "USD", "EUR", "GBP"]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const candidates = [pair.base, pair.altname, pair.wsname?.split("/")[0], key];

  for (const rawCandidate of candidates) {
    if (!rawCandidate) continue;
    let candidate = rawCandidate.split(/[\/_-]/)[0];
    const quote = quoteSymbols.find((item) => candidate.endsWith(item));
    if (quote) candidate = candidate.slice(0, -quote.length);
    const match = candidate.match(/^([A-Z0-9.]{1,16})x$/);
    if (match) return match[1].toUpperCase();
  }

  return null;
}

async function fetchJson<T>(url: string, revalidate = 8, headers?: HeadersInit): Promise<T> {
  const response = await fetch(url, {
    headers,
    next: { revalidate },
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} ${response.status}`);
  return response.json() as Promise<T>;
}

function cryptoAsset(input: {
  venue: string;
  symbol: string;
  quote: string;
  price: number;
  change24h: number;
  volume: number;
}): MarketAsset {
  const highVolatility = Math.abs(input.change24h) >= 8;
  return {
    id: `${input.venue}-${input.symbol}-${input.quote}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: input.symbol,
    symbol: input.symbol,
    price: input.price,
    change24h: input.change24h,
    volume: input.volume,
    marketCap: 0,
    narrative: `${input.venue} · ${input.symbol}/${input.quote} 现货`,
    aiTag: highVolatility ? "高波动" : "交易所现货",
    aiHint: highVolatility
      ? "短线波动显著，先核对成交量口径、深度与消息来源。"
      : "这是单一交易所的最新价，不是跨平台统一参考价。",
    volumeChange: 0,
    market: "crypto",
    venue: input.venue,
    sector: "币圈现货",
    productType: "crypto-spot",
    quoteCurrency: input.quote,
  };
}

async function fetchBinanceCrypto(): Promise<ProviderResult> {
  const tickers = await fetchJson<BinanceTicker[]>("https://data-api.binance.vision/api/v3/ticker/24hr", 5);
  const assets = tickers.flatMap((ticker): MarketAsset[] => {
    if (!ticker.symbol.endsWith("USDT")) return [];
    const symbol = ticker.symbol.replace(/USDT$/, "");
    if (BLOCKED_SUFFIXES.some((suffix) => symbol.endsWith(suffix))) return [];
    const price = numberOrZero(ticker.lastPrice);
    if (!price) return [];
    return [cryptoAsset({
      venue: "Binance",
      symbol,
      quote: "USDT",
      price,
      change24h: numberOrZero(ticker.priceChangePercent),
      volume: numberOrZero(ticker.quoteVolume),
    })];
  });
  return { assets, count: assets.length };
}

async function fetchOkxCrypto(): Promise<ProviderResult> {
  const payload = await fetchJson<{ data?: OkxTicker[] }>("https://www.okx.com/api/v5/market/tickers?instType=SPOT", 5);
  const assets = (payload.data ?? []).flatMap((ticker): MarketAsset[] => {
    const parts = ticker.instId.split("-");
    const quote = parts.at(-1)?.toUpperCase() ?? "";
    const symbol = parts.slice(0, -1).join("-");
    const price = numberOrZero(ticker.last);
    if (!STABLE_QUOTES.has(quote) || !symbol || !price) return [];
    const open = numberOrZero(ticker.open24h);
    return [cryptoAsset({
      venue: "OKX",
      symbol,
      quote,
      price,
      change24h: open ? ((price - open) / open) * 100 : 0,
      volume: numberOrZero(ticker.volCcy24h),
    })];
  });
  return { assets, count: assets.length };
}

async function fetchBitgetCrypto(): Promise<ProviderResult> {
  const [symbolsPayload, tickersPayload] = await Promise.all([
    fetchJson<{ data?: BitgetSymbol[] }>("https://api.bitget.com/api/v2/spot/public/symbols", 30),
    fetchJson<{ data?: BitgetTicker[] }>("https://api.bitget.com/api/v2/spot/market/tickers", 5),
  ]);
  const symbols = new Map((symbolsPayload.data ?? []).map((item) => [item.symbol, item]));
  const assets = (tickersPayload.data ?? []).flatMap((ticker): MarketAsset[] => {
    const instrument = symbols.get(ticker.symbol);
    if (!instrument || instrument.status !== "online" || !STABLE_QUOTES.has(instrument.quoteCoin)) return [];
    if (/^r[A-Z0-9]/.test(instrument.baseCoin)) return [];
    const price = numberOrZero(ticker.lastPr);
    if (!price) return [];
    return [cryptoAsset({
      venue: "Bitget",
      symbol: instrument.baseCoin,
      quote: instrument.quoteCoin,
      price,
      change24h: numberOrZero(ticker.change24h) * 100,
      volume: numberOrZero(ticker.quoteVolume),
    })];
  });
  return { assets, count: assets.length };
}

async function fetchBybitCrypto(): Promise<ProviderResult> {
  const [instrumentsPayload, tickersPayload] = await Promise.all([
    fetchJson<{ result?: { list?: BybitInstrument[] } }>("https://api.bybit.com/v5/market/instruments-info?category=spot", 30),
    fetchJson<{ result?: { list?: BybitTicker[] } }>("https://api.bybit.com/v5/market/tickers?category=spot", 5),
  ]);
  const instruments = new Map((instrumentsPayload.result?.list ?? []).map((item) => [item.symbol, item]));
  const assets = (tickersPayload.result?.list ?? []).flatMap((ticker): MarketAsset[] => {
    const instrument = instruments.get(ticker.symbol);
    if (!instrument || instrument.status !== "Trading" || instrument.symbolType === "xstocks") return [];
    if (!STABLE_QUOTES.has(instrument.quoteCoin)) return [];
    const price = numberOrZero(ticker.lastPrice);
    if (!price) return [];
    return [cryptoAsset({
      venue: "Bybit",
      symbol: instrument.baseCoin,
      quote: instrument.quoteCoin,
      price,
      change24h: numberOrZero(ticker.price24hPcnt) * 100,
      volume: numberOrZero(ticker.turnover24h),
    })];
  });
  return { assets, count: assets.length };
}

async function fetchKrakenCrypto(): Promise<ProviderResult> {
  const [pairsPayload, tickersPayload] = await Promise.all([
    fetchJson<{ error?: string[]; result?: Record<string, KrakenPair> }>("https://api.kraken.com/0/public/AssetPairs?assetVersion=1&aclass_base=currency", 30),
    fetchJson<{ error?: string[]; result?: Record<string, KrakenTicker> }>("https://api.kraken.com/0/public/Ticker?assetVersion=1", 5),
  ]);
  if (pairsPayload.error?.length || tickersPayload.error?.length) throw new Error("Kraken market data unavailable");
  const tickerMap = new Map(Object.entries(tickersPayload.result ?? {}).map(([key, ticker]) => [normalizedPair(key), ticker]));
  const assets = Object.entries(pairsPayload.result ?? {}).flatMap(([key, pair]): MarketAsset[] => {
    if (pair.status && pair.status !== "online") return [];
    const quote = pair.quote.toUpperCase();
    if (!STABLE_QUOTES.has(quote)) return [];
    const ticker = [key, pair.altname ?? "", pair.wsname ?? ""].map(normalizedPair).map((candidate) => tickerMap.get(candidate)).find(Boolean);
    const price = numberOrZero(ticker?.c?.[0]);
    if (!ticker || !price) return [];
    const open = numberOrZero(ticker.o);
    return [cryptoAsset({
      venue: "Kraken",
      symbol: pair.base.replace(/^X(?=[A-Z]{3,5}$)/, ""),
      quote,
      price,
      change24h: open ? ((price - open) / open) * 100 : 0,
      volume: numberOrZero(ticker.v?.[1]) * price,
    })];
  });
  return { assets, count: assets.length };
}

async function fetchHtxCrypto(): Promise<ProviderResult> {
  const payload = await Promise.any([
    fetchJson<{ status?: string; data?: HtxTicker[] }>("https://api.huobi.pro/market/tickers", 5),
    fetchJson<{ status?: string; data?: HtxTicker[] }>("https://api-aws.huobi.pro/market/tickers", 5),
  ]);
  if (payload.status && payload.status !== "ok") throw new Error("HTX market data unavailable");
  const assets = (payload.data ?? []).flatMap((ticker): MarketAsset[] => {
    const pair = ticker.symbol.toUpperCase();
    const quote = STABLE_QUOTES_BY_LENGTH.find((item) => pair.endsWith(item));
    if (!quote) return [];
    const symbol = pair.slice(0, -quote.length);
    const price = numberOrZero(ticker.close);
    if (!symbol || !price || BLOCKED_SUFFIXES.some((suffix) => symbol.endsWith(suffix))) return [];
    const open = numberOrZero(ticker.open);
    return [cryptoAsset({
      venue: "HTX",
      symbol,
      quote,
      price,
      change24h: open ? ((price - open) / open) * 100 : 0,
      volume: numberOrZero(ticker.vol) || numberOrZero(ticker.amount) * price,
    })];
  });
  return { assets, count: assets.length };
}

async function fetchKucoinCrypto(): Promise<ProviderResult> {
  const payload = await fetchJson<{ code?: string; data?: { ticker?: Array<{ symbol: string; last: string; changeRate: string; volValue: string }> } }>("https://api.kucoin.com/api/v1/market/allTickers", 5);
  if (payload.code && payload.code !== "200000") throw new Error("KuCoin market data unavailable");
  const assets = (payload.data?.ticker ?? []).flatMap((ticker): MarketAsset[] => {
    const [symbol, quote] = ticker.symbol.split("-");
    const price = numberOrZero(ticker.last);
    if (!symbol || !STABLE_QUOTES.has(quote) || !price) return [];
    return [cryptoAsset({
      venue: "KuCoin",
      symbol,
      quote,
      price,
      change24h: numberOrZero(ticker.changeRate) * 100,
      volume: numberOrZero(ticker.volValue),
    })];
  });
  return { assets, count: assets.length };
}

async function fetchGateCrypto(): Promise<ProviderResult> {
  const payload = await fetchJson<Array<{ currency_pair: string; last: string; change_percentage: string; quote_volume: string }>>("https://api.gateio.ws/api/v4/spot/tickers", 5);
  const assets = payload.flatMap((ticker): MarketAsset[] => {
    const [symbol, quote] = ticker.currency_pair.split("_");
    const price = numberOrZero(ticker.last);
    if (!symbol || !STABLE_QUOTES.has(quote) || !price) return [];
    return [cryptoAsset({
      venue: "Gate",
      symbol,
      quote,
      price,
      change24h: numberOrZero(ticker.change_percentage),
      volume: numberOrZero(ticker.quote_volume),
    })];
  });
  return { assets, count: assets.length };
}

async function fetchMexcCrypto(): Promise<ProviderResult> {
  const payload = await fetchJson<Array<{ symbol: string; lastPrice: string; priceChangePercent: string; quoteVolume?: string; volume?: string }>>("https://api.mexc.com/api/v3/ticker/24hr", 5);
  const assets = payload.flatMap((ticker): MarketAsset[] => {
    const quote = STABLE_QUOTES_BY_LENGTH.find((item) => ticker.symbol.endsWith(item));
    if (!quote) return [];
    const symbol = ticker.symbol.slice(0, -quote.length);
    const price = numberOrZero(ticker.lastPrice);
    if (!symbol || !price) return [];
    return [cryptoAsset({
      venue: "MEXC",
      symbol,
      quote,
      price,
      change24h: numberOrZero(ticker.priceChangePercent) * 100,
      volume: numberOrZero(ticker.quoteVolume) || numberOrZero(ticker.volume) * price,
    })];
  });
  return { assets, count: assets.length };
}

async function fetchCoinbaseCrypto(): Promise<ProviderResult> {
  const headers: HeadersInit = {};
  if (process.env.COINBASE_CDP_BEARER_TOKEN) headers.Authorization = `Bearer ${process.env.COINBASE_CDP_BEARER_TOKEN}`;
  const payload = await fetchJson<{ products?: CoinbaseProduct[] }>("https://api.coinbase.com/api/v3/brokerage/market/products?product_type=SPOT&limit=1000", 8, headers);
  const assets = (payload.products ?? []).flatMap((product): MarketAsset[] => {
    if (product.trading_disabled || product.is_disabled || !STABLE_QUOTES.has(product.quote_currency_id)) return [];
    const price = numberOrZero(product.price);
    if (!price) return [];
    return [cryptoAsset({
      venue: "Coinbase",
      symbol: product.base_currency_id,
      quote: product.quote_currency_id,
      price,
      change24h: percentOrZero(product.price_percentage_change_24h),
      volume: numberOrZero(product.approximate_quote_24h_volume) || numberOrZero(product.volume_24h) * price,
    })];
  });
  return { assets, count: assets.length };
}

async function fetchBitgetStockTokens(): Promise<ProviderResult> {
  const [symbolsPayload, tickersPayload] = await Promise.all([
    fetchJson<{ data?: BitgetSymbol[] }>("https://api.bitget.com/api/v2/spot/public/symbols", 30),
    fetchJson<{ data?: BitgetTicker[] }>("https://api.bitget.com/api/v2/spot/market/tickers", 5),
  ]);
  const tickerBySymbol = new Map((tickersPayload.data ?? []).map((ticker) => [ticker.symbol, ticker]));
  const assets = (symbolsPayload.data ?? []).flatMap((item): MarketAsset[] => {
    if (!/^r[A-Z0-9]/.test(item.baseCoin) || item.quoteCoin !== "USDT" || item.status !== "online") return [];
    const ticker = tickerBySymbol.get(item.symbol);
    const price = numberOrZero(ticker?.lastPr);
    if (!ticker || !price) return [];
    const underlying = item.baseCoin.slice(1).toUpperCase();
    const change24h = numberOrZero(ticker.change24h) * 100;
    return [{
      id: `bitget-${item.symbol.toLowerCase()}`,
      name: tokenName(underlying),
      symbol: item.baseCoin,
      price,
      change24h,
      volume: numberOrZero(ticker.quoteVolume),
      marketCap: 0,
      narrative: "Bitget rToken · USDT 现货",
      aiTag: Math.abs(change24h) >= 8 ? "高波动" : "币股现货",
      aiHint: "这是与基础股票挂钩的代币化经济敞口，不等同于直接持有登记股票。",
      volumeChange: 0,
      market: "stock",
      venue: "Bitget",
      sector: "币股现货",
      productType: "tokenized-spot",
      quoteCurrency: "USDT",
      underlying,
    }];
  });
  return { assets, count: assets.length };
}

async function fetchOkxStockPerpetuals(): Promise<ProviderResult> {
  const [instrumentsPayload, tickersPayload] = await Promise.all([
    fetchJson<{ data?: OkxInstrument[] }>("https://www.okx.com/api/v5/public/instruments?instType=SWAP", 30),
    fetchJson<{ data?: OkxTicker[] }>("https://www.okx.com/api/v5/market/tickers?instType=SWAP", 5),
  ]);
  const tickerById = new Map((tickersPayload.data ?? []).map((ticker) => [ticker.instId, ticker]));
  const assets = (instrumentsPayload.data ?? []).flatMap((item): MarketAsset[] => {
    if (item.instCategory !== "3" || item.state !== "live") return [];
    const ticker = tickerById.get(item.instId);
    const price = numberOrZero(ticker?.last);
    if (!ticker || !price) return [];
    const underlying = item.instId.replace(/-USDT-SWAP$/, "");
    const open = numberOrZero(ticker.open24h);
    return [{
      id: `okx-${item.instId.toLowerCase()}`,
      name: `${tokenName(underlying)}永续`,
      symbol: underlying,
      price,
      change24h: open ? ((price - open) / open) * 100 : 0,
      volume: numberOrZero(ticker.volCcy24h),
      marketCap: 0,
      narrative: "OKX · 币股 USDT 永续",
      aiTag: "永续合约",
      aiHint: "这是合约价格敞口，不是股票或链上现货；需额外注意资金费率、杠杆和爆仓风险。",
      volumeChange: 0,
      market: "stock",
      venue: "OKX",
      sector: "币股永续",
      productType: "tokenized-perpetual",
      quoteCurrency: "USDT",
      underlying,
    }];
  });
  return { assets, count: assets.length };
}

async function fetchBybitStockTokens(): Promise<ProviderResult> {
  const [instrumentsPayload, tickersPayload] = await Promise.all([
    fetchJson<{ result?: { list?: BybitInstrument[] } }>("https://api.bybit.com/v5/market/instruments-info?category=spot&symbolType=xstocks", 30),
    fetchJson<{ result?: { list?: BybitTicker[] } }>("https://api.bybit.com/v5/market/tickers?category=spot", 5),
  ]);
  const tickerBySymbol = new Map((tickersPayload.result?.list ?? []).map((ticker) => [ticker.symbol, ticker]));
  const assets = (instrumentsPayload.result?.list ?? []).flatMap((item): MarketAsset[] => {
    if (item.symbolType !== "xstocks" || item.status !== "Trading") return [];
    const ticker = tickerBySymbol.get(item.symbol);
    const price = numberOrZero(ticker?.lastPrice);
    if (!ticker || !price) return [];
    const underlying = item.baseCoin.replace(/X$/i, "").toUpperCase();
    const multiplier = numberOrZero(item.xstockMultiplier) || 1;
    return [{
      id: `bybit-${item.symbol.toLowerCase()}`,
      name: tokenName(underlying),
      symbol: item.baseCoin,
      price,
      change24h: numberOrZero(ticker.price24hPcnt) * 100,
      volume: numberOrZero(ticker.turnover24h),
      marketCap: 0,
      narrative: `Bybit xStocks · ${item.quoteCoin} 现货`,
      aiTag: "xStocks 现货",
      aiHint: `Bybit 标注的换算倍数为 ${multiplier}；基础股价与代币价需要按平台倍数换算，且代币不等同于登记股票。`,
      volumeChange: 0,
      market: "stock",
      venue: "Bybit",
      sector: "币股现货",
      productType: "tokenized-spot",
      quoteCurrency: item.quoteCoin,
      underlying,
    }];
  });
  return { assets, count: assets.length };
}

async function fetchKrakenStockTokens(): Promise<ProviderResult> {
  const [pairsPayload, tickersPayload] = await Promise.all([
    fetchJson<{ error?: string[]; result?: Record<string, KrakenPair> }>("https://api.kraken.com/0/public/AssetPairs?assetVersion=1", 30),
    fetchJson<{ error?: string[]; result?: Record<string, KrakenTicker> }>("https://api.kraken.com/0/public/Ticker?assetVersion=1", 5),
  ]);
  if (pairsPayload.error?.length || tickersPayload.error?.length) throw new Error("Kraken xStocks data unavailable");
  const tickerMap = new Map(Object.entries(tickersPayload.result ?? {}).map(([key, ticker]) => [normalizedPair(key), ticker]));
  const assets = Object.entries(pairsPayload.result ?? {}).flatMap(([key, pair]): MarketAsset[] => {
    const underlying = krakenXStockUnderlying(key, pair);
    if (!underlying || (pair.status && pair.status !== "online")) return [];
    const ticker = [key, pair.altname ?? "", pair.wsname ?? ""].map(normalizedPair).map((candidate) => tickerMap.get(candidate)).find(Boolean);
    const price = numberOrZero(ticker?.c?.[0]);
    if (!ticker || !price) return [];
    const open = numberOrZero(ticker.o);
    const quote = pair.quote.replace(/^Z(?=USD$)/, "");
    return [{
      id: `kraken-${normalizedPair(key).toLowerCase()}`,
      name: tokenName(underlying),
      symbol: pair.base,
      price,
      change24h: open ? ((price - open) / open) * 100 : 0,
      volume: numberOrZero(ticker.v?.[1]) * price,
      marketCap: 0,
      narrative: `Kraken xStocks · ${quote} 现货`,
      aiTag: "1:1 支持资产",
      aiHint: "Kraken 表述为由基础资产 1:1 支持的 xStocks；持有者不因此获得传统股东投票权，且地区可用性受限。",
      volumeChange: 0,
      market: "stock",
      venue: "Kraken",
      sector: "币股现货",
      productType: "tokenized-spot",
      quoteCurrency: quote,
      underlying,
    }];
  });
  return { assets, count: assets.length };
}

async function fetchBinanceOnchainStocks(): Promise<ProviderResult> {
  const headers = { "Accept-Encoding": "identity", "User-Agent": "binance-web3/1.1 (Skill)" };
  const listPayload = await fetchJson<{ data?: BinanceStockListing[] }>("https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/stock/detail/list/ai?type=1", 30, headers);
  const listingByTicker = new Map<string, BinanceStockListing>();
  for (const listing of listPayload.data ?? []) {
    const existing = listingByTicker.get(listing.ticker);
    if (!existing || listing.chainId === "56") listingByTicker.set(listing.ticker, listing);
  }
  const featured = BINANCE_FEATURED_TICKERS.flatMap((ticker) => {
    const listing = listingByTicker.get(ticker);
    return listing ? [listing] : [];
  });
  const dynamicResults = await Promise.allSettled(featured.map(async (listing) => {
    const params = new URLSearchParams({ chainId: listing.chainId, contractAddress: listing.contractAddress });
    const payload = await fetchJson<{ data?: BinanceStockDynamic }>(`https://www.binance.com/bapi/defi/v2/public/wallet-direct/buw/wallet/market/token/rwa/dynamic/ai?${params.toString()}`, 10, headers);
    if (!payload.data) throw new Error(`Binance ${listing.ticker} missing data`);
    const data = payload.data;
    const multiplier = numberOrZero(data.tokenInfo.sharesMultiplier) || numberOrZero(listing.multiplier);
    return {
      id: `binance-rwa-${listing.ticker.toLowerCase()}`,
      name: `${tokenName(listing.ticker)}链上版`,
      symbol: data.symbol,
      price: numberOrZero(data.tokenInfo.price),
      change24h: numberOrZero(data.tokenInfo.priceChangePct24h),
      volume: 0,
      marketCap: 0,
      narrative: "Binance Web3 · Ondo 链上币股",
      aiTag: "链上币股",
      aiHint: `代币不等于股票；当前每枚代币约对应 ${multiplier.toFixed(4)} 份基础股票，并受托管、鉴证和地区规则约束。`,
      volumeChange: 0,
      market: "stock",
      venue: "Binance Web3",
      sector: "链上币股",
      productType: "tokenized-onchain",
      underlying: listing.ticker,
    } satisfies MarketAsset;
  }));
  const assets = dynamicResults.flatMap((result) => result.status === "fulfilled" && result.value.price ? [result.value] : []);
  return { assets, count: listingByTicker.size, status: assets.length ? "live" : "catalog" };
}

export const cryptoProviderAdapters: MarketProviderAdapter[] = [
  { name: "Binance", product: "币圈现货", docsUrl: "https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints", load: fetchBinanceCrypto },
  { name: "OKX", product: "币圈现货", docsUrl: "https://www.okx.com/docs-v5/en/#order-book-trading-market-data-get-tickers", load: fetchOkxCrypto },
  { name: "Bitget", product: "币圈现货", docsUrl: "https://www.bitget.com/api-doc/spot/market/Get-Tickers", load: fetchBitgetCrypto },
  { name: "Bybit", product: "币圈现货", docsUrl: "https://bybit-exchange.github.io/docs/v5/market/tickers", load: fetchBybitCrypto },
  { name: "HTX", product: "币圈现货", docsUrl: "https://huobiapi.github.io/docs/spot/v1/en/#get-latest-tickers-for-all-pairs", load: fetchHtxCrypto },
  { name: "Kraken", product: "币圈现货", docsUrl: "https://docs.kraken.com/api-reference/market-data/get-ticker-information", load: fetchKrakenCrypto },
  { name: "KuCoin", product: "币圈现货", docsUrl: "https://www.kucoin.com/docs-new/rest/spot-trading/market-data/get-all-tickers", load: fetchKucoinCrypto },
  { name: "Gate", product: "币圈现货", docsUrl: "https://www.gate.com/docs/developers/apiv4/en/#retrieve-ticker-information", load: fetchGateCrypto },
  { name: "MEXC", product: "币圈现货", docsUrl: "https://mexcdevelop.github.io/apidocs/spot_v3_en/#24hr-ticker-price-change-statistics", load: fetchMexcCrypto },
  { name: "Coinbase", product: "币圈现货", docsUrl: "https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/public/list-public-products", load: fetchCoinbaseCrypto },
];

export const stockProviderAdapters: MarketProviderAdapter[] = [
  { name: "Bitget", product: "rToken 现货", docsUrl: "https://www.bitget.com/api-doc/spot/market/Get-Tickers", load: fetchBitgetStockTokens },
  { name: "Bybit", product: "xStocks 现货", docsUrl: "https://bybit-exchange.github.io/docs/v5/market/instrument", load: fetchBybitStockTokens },
  { name: "Kraken", product: "xStocks 现货", docsUrl: "https://docs.kraken.com/api-reference/market-data/get-tradable-asset-pairs", load: fetchKrakenStockTokens },
  { name: "OKX", product: "币股永续", docsUrl: "https://www.okx.com/docs-v5/en/#public-data-rest-api-get-instruments", load: fetchOkxStockPerpetuals },
  { name: "Binance Web3", product: "Ondo 链上币股目录", docsUrl: "https://www.binance.com/skills/detail/binance-web3/binance-tokenized-securities-info", load: fetchBinanceOnchainStocks },
];

export function providerSummary(adapter: MarketProviderAdapter, result?: ProviderResult, latencyMs?: number): ProviderSummary {
  return {
    name: adapter.name,
    product: adapter.product,
    count: result?.count ?? 0,
    status: result ? (result.status ?? (result.count ? "live" : "unavailable")) : "unavailable",
    docsUrl: adapter.docsUrl,
    latencyMs,
    updatedAt: result ? new Date().toISOString() : undefined,
  };
}
