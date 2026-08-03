import assert from "node:assert/strict";
import test from "node:test";
import { aiDailyLimit, normalizeAIUsage } from "../services/aiUsage.ts";
import { buildDailyRankings, buildFocusShortlist, compactExplanation, selectFeaturedAssets } from "../services/dailyMarket.ts";
import { classifyMarketWeather } from "../services/marketWeather.ts";
import type { MarketAsset } from "../types/market.ts";

function asset(input: Partial<MarketAsset> & Pick<MarketAsset, "id" | "symbol" | "market">): MarketAsset {
  return { name: input.symbol, price: 1, change24h: 1, volume: 100, marketCap: 0, narrative: "", aiTag: "", aiHint: "", volumeChange: 0, ...input };
}

test("featured markets preserve the requested order and prefer live venue rows", () => {
  const fallback = asset({ id: "fallback-btc", symbol: "BTC", market: "crypto", venue: "Global", volume: 9_000, feedMode: "fallback" });
  const live = asset({ id: "live-btc", symbol: "BTC", market: "crypto", venue: "Binance", volume: 100, feedMode: "live" });
  const eth = asset({ id: "live-eth", symbol: "ETH", market: "crypto", venue: "OKX", feedMode: "live" });
  const selected = selectFeaturedAssets([fallback, live, eth], ["ETH", "BTC"]);
  assert.deepEqual(selected.map((item) => item.id), ["live-eth", "live-btc"]);
});

test("daily rankings deduplicate venues and separate gain, loss and volume signals", () => {
  const assets = [
    asset({ id: "btc-a", symbol: "BTC", market: "crypto", change24h: 2, volume: 100, volumeChange: 9 }),
    asset({ id: "btc-b", symbol: "XBT", market: "crypto", change24h: 3, volume: 200, volumeChange: 12 }),
    asset({ id: "eth", symbol: "ETH", market: "crypto", change24h: -4, volume: 150, volumeChange: 42 }),
  ];
  const result = buildDailyRankings(assets, 2);
  assert.deepEqual(result.gainers.map((item) => item.id), ["btc-b", "eth"]);
  assert.deepEqual(result.losers.map((item) => item.id), ["eth", "btc-b"]);
  assert.equal(result.volumeSurges[0].id, "eth");
});

test("volume anomalies stay honest when comparable change data is unavailable", () => {
  const result = buildDailyRankings([
    asset({ id: "btc", symbol: "BTC", market: "crypto", volumeChange: 0 }),
    asset({ id: "eth", symbol: "ETH", market: "crypto", volumeChange: -18 }),
  ]);
  assert.deepEqual(result.volumeSurges.map((item) => item.id), ["eth"]);
});

test("daily focus shortlist prioritizes absolute moves without duplicating venues", () => {
  const result = buildFocusShortlist([
    asset({ id: "btc-a", symbol: "BTC", market: "crypto", change24h: 2, volume: 100 }),
    asset({ id: "btc-b", symbol: "XBT", market: "crypto", change24h: -4, volume: 200 }),
    asset({ id: "eth", symbol: "ETH", market: "crypto", change24h: 3, volume: 150 }),
    asset({ id: "sol", symbol: "SOL", market: "crypto", change24h: -1, volume: 120 }),
  ], 2);

  assert.deepEqual(result.map((item) => item.id), ["btc-b", "eth"]);
});

test("market weather distinguishes volatility, divergence, trend and quiet-range regimes", () => {
  const base = { score: 50, fomoIndex: 35, breadth: 50, volatility: 2, highVolatilityShare: 10, cryptoBreadth: 50, stockBreadth: 50 };
  const conditions = [
    classifyMarketWeather({ ...base, breadth: 70, volatility: 6, highVolatilityShare: 32 }).condition,
    classifyMarketWeather({ ...base, breadth: 30, volatility: 6, highVolatilityShare: 32 }).condition,
    classifyMarketWeather({ ...base, cryptoBreadth: 78, stockBreadth: 38 }).condition,
    classifyMarketWeather({ ...base, cryptoBreadth: 32, stockBreadth: 72 }).condition,
    classifyMarketWeather({ ...base, score: 75, breadth: 80, cryptoBreadth: 80, stockBreadth: 80 }).condition,
    classifyMarketWeather({ ...base, breadth: 18, cryptoBreadth: 18, stockBreadth: 18 }).condition,
    classifyMarketWeather({ ...base, breadth: 50, volatility: 0.6 }).condition,
    classifyMarketWeather(base).condition,
  ];

  assert.deepEqual(conditions, ["updraft", "cold-front", "crypto-clear", "stocks-clear", "clear-warming", "cold-wave", "quiet-cloud", "cloudy-rotation"]);
  assert.equal(new Set(conditions).size, conditions.length);
});

test("AI allowance differentiates guest and signed-in users and resets stale dates", () => {
  assert.equal(aiDailyLimit(false), 3);
  assert.equal(aiDailyLimit(true), 10);
  assert.deepEqual(normalizeAIUsage({ date: "2026-08-02", count: 2 }, "2026-08-03"), { date: "2026-08-03", count: 0 });
  assert.deepEqual(normalizeAIUsage({ date: "2026-08-03", count: 2.9 }, "2026-08-03"), { date: "2026-08-03", count: 2 });
});

test("AI explanations expose the four compact daily fields", () => {
  assert.deepEqual(compactExplanation({
    title: "BTC",
    whatHappened: "价格修复。第二句。",
    possibleReasons: ["资金回流。"],
    commonMistake: "一根阳线不等于趋势确认。",
    watchNext: ["先看成交量是否跟上。"],
    plainSummary: "可以看，但别把仓位打满。",
  }), {
    surface: "价格修复。",
    watch: "先看成交量是否跟上。",
    misread: "一根阳线不等于趋势确认。",
    summary: "可以看，但别把仓位打满。",
  });
});

test("compact AI copy never cuts a percentage at its decimal point", () => {
  const compact = compactExplanation({
    title: "BTC",
    whatHappened: "Binance 的 BTC 在 24 小时内下跌 0.99%。成交量同步回落。",
    possibleReasons: ["市场风险偏好降温。"],
    commonMistake: "不要把一天的变化当成长期趋势。",
    watchNext: ["先看成交量是否跟上。"],
    plainSummary: "先验证，再行动。",
  });
  assert.equal(compact.surface, "Binance 的 BTC 在 24 小时内下跌 0.99%。");
});
