import assert from "node:assert/strict";
import test from "node:test";
import { buildStrategyContext } from "../services/strategyContext.ts";
import type { MarketAsset, MarketIntelligence } from "../types/market.ts";

function asset(input: Partial<MarketAsset> & Pick<MarketAsset, "id" | "symbol" | "market">): MarketAsset {
  return {
    name: input.symbol,
    price: 100,
    change24h: 1,
    volume: 100,
    marketCap: 0,
    narrative: "",
    aiTag: "",
    aiHint: "",
    volumeChange: 0,
    ...input,
  };
}

function intelligence(symbol = "BTC"): MarketIntelligence {
  const base = Date.parse("2026-08-30T00:00:00.000Z");
  return {
    symbol,
    updatedAt: "2026-08-30T01:00:00.000Z",
    candleVenue: "Binance Futures",
    candles: Array.from({ length: 24 }, (_, index) => ({
      time: base + index * 3_600_000,
      open: 100 + index * 0.1,
      high: 101 + index * 0.1,
      low: 99 + index * 0.1,
      close: 100.2 + index * 0.1,
      volume: 1_000 + index,
    })),
    derivatives: [
      { venue: "Binance Futures", markPrice: 102.5, fundingRate: 0.0001, openInterest: 10, openInterestValue: 1_025 },
      { venue: "Bybit Linear", markPrice: 102.6, fundingRate: 0.00012, openInterest: 20, openInterestValue: 2_052 },
      { venue: "OKX Swap", markPrice: 102.55, fundingRate: 0.00008, openInterest: 30, openInterestValue: 3_076.5 },
    ],
    markSpreadPct: 0.0976,
    sourceMode: "live",
  };
}

test("strategy context keeps exact venue observations and exposes shadow-only evidence", () => {
  const now = new Date("2026-08-30T01:00:10.000Z");
  const result = buildStrategyContext({
    symbols: ["BTC"],
    cryptoAssets: [
      asset({ id: "binance:BTCUSDT", symbol: "BTC", market: "crypto", venue: "Binance", change24h: 3.2, volume: 1_000 }),
      asset({ id: "okx:BTC-USDT", symbol: "BTC", market: "crypto", venue: "OKX", change24h: 3.0, volume: 900 }),
      asset({ id: "bybit:BTCUSDT", symbol: "BTC", market: "crypto", venue: "Bybit", change24h: 2.8, volume: 800 }),
      asset({ id: "binance:BTC3LUSDT", symbol: "BTC3L", market: "crypto", venue: "Binance", change24h: 99, volume: 99_999 }),
      asset({ id: "binance:ETHUSDT", symbol: "ETH", market: "crypto", venue: "Binance", change24h: 1, volume: 700 }),
    ],
    stockAssets: [asset({ id: "stock:AAPL", symbol: "AAPL", market: "stock", venue: "Kraken", change24h: 1 })],
    cryptoProviders: [
      { name: "Binance", status: "live", updatedAt: now.toISOString() },
      { name: "OKX", status: "live", updatedAt: now.toISOString() },
      { name: "Bybit", status: "live", updatedAt: now.toISOString() },
    ],
    stockProviders: [{ name: "Kraken", status: "live", updatedAt: now.toISOString() }],
    cryptoMode: "live",
    stockMode: "live",
    cryptoUpdatedAt: now.toISOString(),
    stockUpdatedAt: now.toISOString(),
    intelligenceBySymbol: { BTC: intelligence() },
    now,
  });

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.mode, "shadow");
  assert.equal(result.symbols[0].observations.length, 3);
  assert.equal(result.symbols[0].observations.some((item) => item.price === 100 && item.change24h === 99), false);
  assert.equal(result.symbols[0].consensus.medianChange24h, 3);
  assert.equal(result.symbols[0].derivatives.venues.length, 3);
  assert.equal(result.symbols[0].derivatives.venues.map((item) => item.openInterest).reduce((sum, value) => sum + value, 0), 60);
  assert.equal("combinedOpenInterest" in result.symbols[0].derivatives, false);
  assert.equal(result.symbols[0].shadow.bias, "bullish");
  assert.ok(result.symbols[0].shadow.score > 0);
  assert.ok(result.symbols[0].shadow.confidence >= 70);
});

test("strategy context degrades stale coverage without manufacturing conviction", () => {
  const result = buildStrategyContext({
    symbols: ["BTC"],
    cryptoAssets: [asset({ id: "btc", symbol: "BTC", market: "crypto", venue: "Only", change24h: 0 })],
    stockAssets: [],
    cryptoProviders: [{ name: "Only", status: "unavailable" }],
    stockProviders: [],
    cryptoMode: "fallback",
    stockMode: "fallback",
    cryptoUpdatedAt: "2026-08-30T00:00:00.000Z",
    stockUpdatedAt: "2026-08-30T00:00:00.000Z",
    intelligenceBySymbol: {},
    now: new Date("2026-08-30T01:00:00.000Z"),
  });

  assert.equal(result.trust.overall, "degraded");
  assert.equal(result.symbols[0].shadow.bias, "neutral");
  assert.ok(result.symbols[0].shadow.confidence <= 30);
  assert.ok(result.symbols[0].shadow.warnings.includes("精确现货来源不足两家"));
  assert.ok(result.symbols[0].shadow.warnings.includes("衍生品确认不可用"));
});
