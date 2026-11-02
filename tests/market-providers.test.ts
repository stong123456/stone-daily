import assert from "node:assert/strict";
import test from "node:test";
import { fetchMarketFeed } from "../services/marketProviders.ts";
import { fetchFirstValidFromEndpointGroups, fetchValidWithRetry } from "../services/server/providerResilience.ts";

test("deduplicates concurrent client market-feed requests and reuses the short cache", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return new Response(JSON.stringify({ assets: [], source: "test", mode: "live", updatedAt: new Date().toISOString() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const query = `dedupe-${Date.now()}`;
    const [first, second] = await Promise.all([fetchMarketFeed("crypto", query), fetchMarketFeed("crypto", query)]);
    const third = await fetchMarketFeed("crypto", query);
    assert.equal(calls, 1);
    assert.strictEqual(first, second);
    assert.strictEqual(second, third);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("falls through blocked Binance endpoint groups and keeps the first valid payload", async () => {
  const requested: string[] = [];
  const payload = await fetchFirstValidFromEndpointGroups([
    ["https://first.example/tickers", "https://second.example/tickers"],
    ["https://working.example/tickers"],
  ], {
    service: "Binance Spot",
    load: async (url) => {
      requested.push(url);
      if (!url.includes("working")) throw new Error("451 unavailable by location");
      return [{ symbol: "BTCUSDT" }];
    },
    validate: (value) => value.length > 0,
  });

  assert.deepEqual(payload, [{ symbol: "BTCUSDT" }]);
  assert.deepEqual(requested, [
    "https://first.example/tickers",
    "https://second.example/tickers",
    "https://working.example/tickers",
  ]);
});

test("retries an invalid OKX response before accepting live data", async () => {
  let calls = 0;
  const payload = await fetchValidWithRetry("https://www.okx.com/tickers", 2, {
    service: "OKX Spot",
    load: async () => {
      calls += 1;
      return calls === 1 ? { code: "0", data: [] } : { code: "0", data: [{ instId: "BTC-USDT" }] };
    },
    validate: (value) => value.code === "0" && value.data.length > 0,
  });

  assert.equal(calls, 2);
  assert.equal(payload.data[0]?.instId, "BTC-USDT");
});
