import assert from "node:assert/strict";
import test from "node:test";
import { fetchMarketFeed } from "../services/marketProviders.ts";

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
