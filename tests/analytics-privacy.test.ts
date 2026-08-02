import assert from "node:assert/strict";
import test from "node:test";
import {
  anonymizedVisitorKey,
  coarseBrowser,
  coarseDevice,
  isAnalyticsEventName,
  publicReferrerHost,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsProperties,
} from "../services/analyticsPrivacy.ts";

test("analytics accepts only allow-listed event names and safe route paths", () => {
  assert.equal(isAnalyticsEventName("page_view"), true);
  assert.equal(isAnalyticsEventName("wallet_connect"), true);
  assert.equal(isAnalyticsEventName("arbitrary_event"), false);
  assert.equal(sanitizeAnalyticsPath("/asset/BTC?private=1#chart"), "/asset/BTC");
  assert.equal(sanitizeAnalyticsPath("https://example.com/private"), null);
  assert.equal(sanitizeAnalyticsPath("//example.com"), null);
});

test("analytics stores only coarse browser, device and public referrer fields", () => {
  const mobileChrome = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125.0 Mobile Safari/537.36";
  assert.equal(coarseDevice(mobileChrome), "mobile");
  assert.equal(coarseBrowser(mobileChrome), "Chrome");
  assert.equal(publicReferrerHost("https://www.google.com/search?q=stone", "stonedaily.xyz"), "google.com");
  assert.equal(publicReferrerHost("https://stonedaily.xyz/markets", "stonedaily.xyz"), "direct");
});

test("visitor identifiers are deterministic inside a month and rotate across months", () => {
  const input = { secret: "a".repeat(32), ip: "203.0.113.2", userAgent: "test-browser" };
  const january = anonymizedVisitorKey({ ...input, at: new Date("2030-01-12T00:00:00Z") });
  const januaryAgain = anonymizedVisitorKey({ ...input, at: new Date("2030-01-12T00:05:00Z") });
  const february = anonymizedVisitorKey({ ...input, at: new Date("2030-02-12T00:00:00Z") });
  assert.equal(january.visitor, januaryAgain.visitor);
  assert.notEqual(january.visitor, february.visitor);
  assert.equal(january.visitor.length, 40);
  assert.equal(january.session.length, 40);
});

test("analytics properties discard nested and unsupported values", () => {
  assert.deepEqual(sanitizeAnalyticsProperties({ kind: "news", enabled: true, count: 3, nested: { secret: true }, unsafe$key: "drop" }), {
    kind: "news",
    enabled: true,
    count: 3,
    unsafekey: "drop",
  });
});
