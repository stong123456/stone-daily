import assert from "node:assert/strict";
import test from "node:test";

import {
  areSameEditorialEvent,
  containsHan,
  getShareDigestCategory,
  isRigorousDigestHeadlineSource,
  isShareableMarketStory,
} from "../services/editorialSharing.ts";

test("rejects roundup, newsletter, explainer and clipped source headlines", () => {
  const rejected = [
    "Here’s what happened in crypto today",
    "Crypto News Today: Bitcoin, Ethereum and XRP",
    "Morning Minute: Robinhood Posts Its Best Quarter Ever",
    "What is Zcash (ZEC)? The Privacy Coin Using Zero-Knowledge Proofs",
    "以下是今天加密货币发生的事情",
    "每日币圈简报：今天值得关注的六件事",
    "Bitcoin ETF inflows return as",
    "Bitcoin ETF inflows return...",
  ];
  rejected.forEach((headline) => assert.equal(isRigorousDigestHeadlineSource(headline), false, headline));
});

test("keeps concrete, attributable event headlines", () => {
  const accepted = [
    "US sanctions Iranian maritime firm, says it accepted Bitcoin to evade restrictions",
    "Japanese game developer launches Bitcoin, altcoin fund with SBI",
    "South Korean crypto trading surges amid stock market plunge",
    "Fake Flare Network Staking Site Drained $8.5M in XRP: Seoul Police",
  ];
  accepted.forEach((headline) => assert.equal(isRigorousDigestHeadlineSource(headline), true, headline));
});

test("detects Chinese and English originals without translating either group", () => {
  assert.equal(containsHan("美国制裁伊朗海事公司，称其接受比特币"), true);
  assert.equal(containsHan("US sanctions Iranian maritime firm over Bitcoin payments"), false);
});

test("requires the copied headline itself to name the relevant market subject", () => {
  const story = (title: string) => ({
    id: "test",
    source: "test",
    sourceType: "媒体" as const,
    category: "币股" as const,
    title,
    summary: "",
    url: "https://example.com",
    publishedAt: "2026-07-30T00:00:00.000Z",
    relatedAssets: ["NVDA"],
    urgency: "常规" as const,
  });
  assert.equal(isShareableMarketStory(story("【多家企业宣布成立开放安全AI联盟】英伟达、微软等参与。")), false);
  assert.equal(isShareableMarketStory(story("Xcel Energy预计谷歌数据中心项目将在2027年初获批")), true);
  assert.equal(getShareDigestCategory("South Korean crypto trading surges amid stock market plunge"), "币圈");
  assert.equal(getShareDigestCategory("Hedge fund owns Bitcoin miner stocks"), "币股");
});

test("clusters only the same event, not unrelated stories sharing an asset", () => {
  assert.equal(
    areSameEditorialEvent(
      "There's a New Way to Protect Bitcoin From Future Quantum Attacks, Researchers Say",
      "Bitcoin ETF inflows return as Ether funds slip into outflows",
    ),
    false,
  );
  assert.equal(
    areSameEditorialEvent(
      "US sanctions Iranian maritime firm, says it accepted Bitcoin to evade restrictions",
      "Bitcoin, Ethereum Wobble as Fed Holds Rates Steady",
    ),
    false,
  );
  assert.equal(
    areSameEditorialEvent(
      "Hungary repeals crypto checks as first MiCA license is granted",
      "Hungary scraps crypto checks after granting its first MiCA license",
    ),
    true,
  );
});
