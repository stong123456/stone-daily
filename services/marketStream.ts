import type { MarketAsset, MarketSpread, StreamQuoteSnapshot, StreamingSummary } from "@/types/market";

const FRESH_STREAM_MS = 20_000;

function quoteKey(venue: string, symbol: string, quoteCurrency: string) {
  return `${venue}|${symbol}|${quoteCurrency}`.toUpperCase();
}

export function mergeStreamQuotes(assets: MarketAsset[], stream?: StreamQuoteSnapshot) {
  if (!stream) return { assets };
  const streamTime = Date.parse(stream.updatedAt);
  if (!Number.isFinite(streamTime) || Date.now() - streamTime > FRESH_STREAM_MS) return { assets };

  const quoteMap = new Map(stream.quotes.map((quote) => [quoteKey(quote.venue, quote.symbol, quote.quoteCurrency), quote]));
  let applied = 0;
  const merged = assets.map((asset) => {
    if (asset.productType !== "crypto-spot" || !asset.venue || !asset.quoteCurrency) return asset;
    const quote = quoteMap.get(quoteKey(asset.venue, asset.symbol, asset.quoteCurrency));
    if (!quote || Date.now() - Date.parse(quote.updatedAt) > FRESH_STREAM_MS) return asset;
    applied += 1;
    return {
      ...asset,
      price: quote.price,
      change24h: quote.change24h,
      volume: quote.volume,
      feedMode: "live" as const,
      asOf: quote.updatedAt,
    };
  });

  if (!applied) return { assets };
  const streaming: StreamingSummary = {
    venues: Array.from(new Set(stream.quotes.map((quote) => quote.venue))).sort(),
    quoteCount: applied,
    updatedAt: stream.updatedAt,
    lagMs: Math.max(0, Date.now() - streamTime),
  };
  return { assets: merged, streaming };
}

export function calculateMarketSpreads(assets: MarketAsset[]): MarketSpread[] {
  const groups = new Map<string, MarketAsset[]>();
  for (const asset of assets) {
    if (asset.productType !== "crypto-spot" || !asset.venue || !asset.quoteCurrency || asset.price <= 0 || asset.volume < 50_000) continue;
    const key = `${asset.symbol.toUpperCase()}|${asset.quoteCurrency.toUpperCase()}`;
    const current = groups.get(key);
    if (current) current.push(asset);
    else groups.set(key, [asset]);
  }

  const spreads: MarketSpread[] = [];
  for (const [key, rows] of groups) {
    const byVenue = Array.from(new Map(rows.map((row) => [row.venue, row])).values());
    if (byVenue.length < 2) continue;
    let low = byVenue[0];
    let high = byVenue[0];
    for (const row of byVenue.slice(1)) {
      if (row.price < low.price) low = row;
      if (row.price > high.price) high = row;
    }
    const spreadPct = low.price ? ((high.price - low.price) / low.price) * 100 : 0;
    if (!Number.isFinite(spreadPct) || spreadPct <= 0 || spreadPct > 20) continue;
    const [symbol, quoteCurrency] = key.split("|");
    spreads.push({
      symbol,
      quoteCurrency,
      lowPrice: low.price,
      highPrice: high.price,
      spreadPct,
      lowVenue: low.venue ?? "-",
      highVenue: high.venue ?? "-",
      venueCount: byVenue.length,
    });
  }
  return spreads.sort((a, b) => b.spreadPct - a.spreadPct).slice(0, 8);
}
