import assert from "node:assert/strict";
import test from "node:test";
import { canonicalAssetId, canonicalAssetSymbol, isWatchedAsset, uniqueMarketAssets } from "../services/marketWeather.ts";
import type { MarketAsset } from "../types/market.ts";

function asset(input: Partial<MarketAsset> & Pick<MarketAsset, "id" | "symbol" | "market">): MarketAsset {
  return { name: input.symbol, price: 1, change24h: 1, volume: 100, marketCap: 0, narrative: "", aiTag: "", aiHint: "", volumeChange: 0, ...input };
}

test("normalizes exchange aliases into one crypto identity", () => {
  const binance = asset({ id: "binance:BTCUSDT", symbol: "BTC", market: "crypto", venue: "Binance" });
  const kraken = asset({ id: "kraken:XBTUSD", symbol: "XBT", market: "crypto", venue: "Kraken" });
  assert.equal(canonicalAssetId(binance), "crypto:BTC");
  assert.equal(canonicalAssetId(kraken), "crypto:BTC");
  assert.equal(uniqueMarketAssets([binance, { ...kraken, volume: 200 }])[0].venue, "Kraken");
});

test("normalizes tokenized-stock wrappers without losing the venue instrument id", () => {
  const wrapped = asset({ id: "kraken:AAPLXUSD", symbol: "AAPLX", underlying: "AAPL", market: "stock", venue: "Kraken", productType: "tokenized-spot" });
  assert.equal(canonicalAssetSymbol(wrapped), "AAPL");
  assert.equal(canonicalAssetId(wrapped), "stock:AAPL");
  assert.equal(wrapped.id, "kraken:AAPLXUSD");
});

test("keeps legacy venue watchlist ids readable during migration", () => {
  const btc = asset({ id: "okx:BTC-USDT", symbol: "BTC", market: "crypto" });
  assert.equal(isWatchedAsset(["okx:BTC-USDT"], btc), true);
  assert.equal(isWatchedAsset(["crypto:BTC"], btc), true);
});
