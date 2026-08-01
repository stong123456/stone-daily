import assert from "node:assert/strict";
import test from "node:test";

import {
  areSameEditorialEvent,
  getShareDigestCategory,
  isPublishableTranslatedHeadline,
  isRigorousDigestHeadlineSource,
  isShareableMarketStory,
  polishTranslatedHeadline,
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

test("post-edits current English headlines into precise natural Chinese", () => {
  const cases = [
    [
      "There's a New Way to Protect Bitcoin From Future Quantum Attacks, Researchers Say",
      "研究人员提出一种帮助比特币抵御未来量子攻击的新方案",
    ],
    [
      "US sanctions Iranian maritime firm, says it accepted Bitcoin to evade restrictions",
      "美国制裁伊朗海事公司，称其接受比特币以规避限制",
    ],
    [
      "Ethereum Price Stalls as Fed Rate Decision Looms",
      "美联储利率决议临近之际，以太坊价格走势趋于停滞",
    ],
    [
      "South Korean crypto trading surges amid stock market plunge",
      "韩国股市大跌之际，当地加密货币交易量激增",
    ],
    [
      "Japanese game developer launches Bitcoin, altcoin fund with SBI",
      "日本游戏开发商与 SBI 合作推出比特币和山寨币基金",
    ],
    [
      "Chinese newspaper warns of Bitcoin extortion scam using its name",
      "一家中国报纸警告，有人冒用其名义实施比特币敲诈骗局",
    ],
  ] as const;

  cases.forEach(([source, expected]) => {
    const polished = polishTranslatedHeadline(source, "机器翻译占位", "zh");
    assert.equal(polished, expected);
    assert.equal(isPublishableTranslatedHeadline(source, polished, "zh"), true);
  });
});

test("normalizes attributable native Chinese wire prefixes", () => {
  const source = "法律资讯网站消息：针对 Coinbase 产品发售的证券诉讼范围遭到缩减。";
  const polished = polishTranslatedHeadline(source, source, "zh");
  assert.equal(polished, "据法律资讯网站报道，针对 Coinbase 产品发售的证券诉讼范围遭到缩减");
  assert.equal(isPublishableTranslatedHeadline(source, polished, "zh"), true);
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

test("rejects entity reordering, unsupported causality and lost uncertainty", () => {
  assert.equal(
    isPublishableTranslatedHeadline(
      "Japanese game developer launches Bitcoin, altcoin fund with SBI",
      "日本游戏开发商与 SBI 合作推出山寨币基金比特币",
      "zh",
    ),
    false,
  );
  assert.equal(
    isPublishableTranslatedHeadline(
      "South Korean crypto trading surges amid stock market plunge",
      "股市暴跌导致韩国加密货币交易激增",
      "zh",
    ),
    false,
  );
  assert.equal(
    isPublishableTranslatedHeadline(
      "BitRiver founder charged in Russia over alleged $8M fraud",
      "BitRiver 创始人在俄罗斯因 8M 美元欺诈被起诉",
      "zh",
    ),
    false,
  );
});

test("rejects partially translated Chinese headlines with an English sentence skeleton", () => {
  assert.equal(isPublishableTranslatedHeadline(
    "Google yanks Google Earth AI image tool one day after launch over deepfake fears",
    "Google Yanks Google Earth AI 图像工具在 Deepfake Fears 发布后的第二天推出",
    "zh",
  ), false);
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
