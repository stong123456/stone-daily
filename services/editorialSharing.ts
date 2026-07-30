import type { EditorialFeedItem } from "@/types/market";

const US_STOCK_ASSETS = new Set([
  "AAPL",
  "AMD",
  "AMZN",
  "COIN",
  "GOOG",
  "GOOGL",
  "META",
  "MSFT",
  "MSTR",
  "NFLX",
  "NVDA",
  "SPY",
  "TSLA",
]);

const US_STOCK_OR_TOKENIZED_MARKER =
  /tokenized[-\s]?(?:stock|equity)|xstocks?|rtoken|stock token|币股|代币化(?:美股|股票)|美股|纳斯达克|纽交所|标普|道琼斯|华尔街|\b(?:U\.?S\.?|US)\s+(?:stock|equity|share)s?\b|\b(?:NYSE|NASDAQ|S&P 500|Dow Jones)\b/i;

const TRACKED_US_STOCK_HEADLINE_MARKER =
  /\b(?:AAPL|Apple|NVDA|Nvidia|TSLA|Tesla|MSFT|Microsoft|AMZN|Amazon|META|Meta Platforms|GOOGL?|Google|Alphabet|AMD|Netflix|NFLX|MSTR|MicroStrategy|Strategy|COIN|Coinbase|SPY)\b|苹果公司|英伟达|特斯拉|微软|亚马逊|脸书母公司|谷歌|超威半导体|奈飞|微策略/i;
const CRYPTO_MARKET_MARKER =
  /\b(?:bitcoin|ethereum|solana|zcash|xrp|ripple|bnb|dogecoin|cryptocurrency|crypto(?:\s+(?:market|asset|exchange|wallet|trading|fund))?|blockchain|stablecoin|defi|web3|nft|altcoin|memecoin|layer[-\s]?2|tokenized?|staking|miner)\b|比特币|以太坊|加密(?:货币|资产|市场|交易|钱包)|区块链|稳定币|代币|链上|矿企|挖矿|质押|币圈/i;

export function containsHan(value: string) {
  return /\p{Script=Han}/u.test(value);
}

export function isTrackedUsStockAsset(asset: string) {
  return US_STOCK_ASSETS.has(asset);
}

export function isShareableMarketStory(item: EditorialFeedItem) {
  // Eligibility must be explicit in the exact headline users will copy. A
  // company name buried later in a long wire body cannot make a generic
  // bracket headline look market-specific.
  const headline = extractShareHeadline(item.title);
  const hasTrackedStock = US_STOCK_OR_TOKENIZED_MARKER.test(headline) || TRACKED_US_STOCK_HEADLINE_MARKER.test(headline);
  const hasCryptoMarketSubject = CRYPTO_MARKET_MARKER.test(headline);
  return hasTrackedStock || hasCryptoMarketSubject;
}

export function getShareDigestCategory(value: string): "币股" | "币圈" {
  const headline = extractShareHeadline(value);
  const hasStockSubject = US_STOCK_OR_TOKENIZED_MARKER.test(headline)
    || TRACKED_US_STOCK_HEADLINE_MARKER.test(headline)
    || /\b(?:bitcoin|crypto) miner stocks?\b/i.test(headline);
  return hasStockSubject ? "币股" : "币圈";
}

export function extractShareHeadline(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const bracketHeadline = normalized.match(/^【([^】]+)】/)?.[1];
  const firstSentence = normalized.split(/[。！？!?]/, 1)[0];
  return (bracketHeadline || firstSentence || normalized).trim();
}

const NON_EVENT_HEADLINE_PATTERNS = [
  /^(?:here(?:'|’)s|here are)\s+(?:what|the|today)\b/i,
  /\bwhat happened in (?:crypto|cryptocurrency|bitcoin|web3)(?: today)?\b/i,
  /^(?:today in crypto|crypto today|cryptocurrency today)\b/i,
  /^(?:morning|evening|daily|weekly)\s+(?:minute|brief|briefing|roundup|digest)\b/i,
  /^(?:crypto|cryptocurrency|bitcoin|web3)\s+(?:news|roundup|briefing|digest)(?:\s+today)?(?:\s*[:|—–-]|$)/i,
  /^(?:top|biggest)\s+\d+\s+(?:crypto|cryptocurrency|bitcoin|web3)?\s*(?:stories|headlines|news)\b/i,
  /^(?:everything|all)\s+you need to know\b/i,
  /^(?:what is|how to|a guide to|beginner(?:'|’)s guide to|explained\s*:)\b/i,
  /(?:今天|今日)(?:的)?(?:加密货币|币圈|比特币|Web3).{0,10}(?:发生了什么|发生的事情|新闻汇总|要闻汇总|热点汇总)/i,
  /^(?:以下是|这里是).{0,12}(?:发生的事情|新闻|要闻|热点|汇总)/,
  /^(?:每日|今日|早间|午间|晚间|本周)(?:加密|币圈|市场)?(?:简报|早报|晚报|速览|汇总|回顾|综述|要闻|热点)(?:[：:—–-]|$)/,
  /^(?:一文(?:看懂|了解)|盘点|速览).{0,18}(?:币圈|加密|比特币|市场|今日|本周)/,
] as const;

const DANGLING_HEADLINE_END = /(?:[,:：，;；—–-]|\.{3}|…|\b(?:and|or|as|after|with|amid|for|to)\b|(?:与|和|及|以及|但|而|因|随着|称|表示|关于|为了))$/i;

function hasBalancedHeadlinePairs(value: string) {
  const pairs: Array<[string, string]> = [["(", ")"], ["[", "]"], ["（", "）"], ["【", "】"]];
  return pairs.every(([open, close]) => value.split(open).length === value.split(close).length);
}

function isMetaEditorialHeadline(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return NON_EVENT_HEADLINE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isRigorousDigestHeadlineSource(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  // Question and prediction headlines usually omit the assumptions needed to
  // turn them into a factual Chinese statement. Keep them on the full feed,
  // but do not promote them into the compact share digest.
  if (/[?？]/.test(normalized)) return false;
  if (/\b(?:price prediction|which will|what happens next|could .*? (?:rise|fall|surge|crash))\b/i.test(normalized)) return false;
  if (/(?:价格预测|谁将|会不会|能否|是否会|或将).{0,28}[？?]/.test(normalized)) return false;
  if (isMetaEditorialHeadline(normalized)) return false;
  if (DANGLING_HEADLINE_END.test(normalized) || !hasBalancedHeadlinePairs(normalized)) return false;
  return true;
}

type HeadlineEntityRule = {
  source: RegExp;
  targets: readonly string[];
  orderSensitive?: boolean;
};

const HEADLINE_ENTITY_RULES: readonly HeadlineEntityRule[] = [
  { source: /\bMichael Saylor\b/gi, targets: ["迈克尔·塞勒", "Michael Saylor"] },
  { source: /\bMorgan Stanley\b/gi, targets: ["摩根士丹利", "Morgan Stanley"] },
  { source: /\bFederal Reserve\b|\bFed\b/gi, targets: ["美联储", "Federal Reserve", "Fed"] },
  { source: /\bCelsius(?: Network)?\b/gi, targets: ["Celsius", "摄氏网络"] },
  { source: /\bIonic Digital\b/gi, targets: ["Ionic Digital"] },
  { source: /\bApple\b/gi, targets: ["苹果", "Apple"] },
  { source: /\bNvidia\b/gi, targets: ["英伟达", "Nvidia"] },
  { source: /\bNasdaq\b/gi, targets: ["纳斯达克", "Nasdaq"] },
  { source: /\bBitcoin\b/gi, targets: ["比特币", "Bitcoin"], orderSensitive: true },
  { source: /\bAltcoin(?:s)?\b/gi, targets: ["山寨币", "Altcoin", "Altcoins"], orderSensitive: true },
  { source: /\bEthereum\b/gi, targets: ["以太坊", "Ethereum"], orderSensitive: true },
  { source: /\bXRP\b/g, targets: ["XRP"], orderSensitive: true },
  { source: /\bSolana\b/gi, targets: ["Solana", "索拉纳"], orderSensitive: true },
  { source: /\bZcash\b/gi, targets: ["Zcash", "大零币"], orderSensitive: true },
  { source: /\bIronwood\b/gi, targets: ["Ironwood"] },
  { source: /\bKalshi\b/gi, targets: ["Kalshi"] },
  { source: /\bPolymarket\b/gi, targets: ["Polymarket"] },
  { source: /\bBinance\b/gi, targets: ["币安", "Binance"] },
  { source: /\bCoinbase\b/gi, targets: ["Coinbase"] },
  { source: /\bKraken\b/gi, targets: ["Kraken"] },
  { source: /\bBybit\b/gi, targets: ["Bybit"] },
  { source: /\bBitget\b/gi, targets: ["Bitget"] },
  { source: /\bOKX\b/g, targets: ["OKX"] },
  { source: /\bSBI\b/g, targets: ["SBI"] },
  { source: /\bSEC\b/g, targets: ["SEC", "美国证券交易委员会"] },
  { source: /\bCFTC\b/g, targets: ["CFTC", "美国商品期货交易委员会"] },
  { source: /\bETF(?:s)?\b/gi, targets: ["ETF", "ETFs"], orderSensitive: true },
  { source: /\bETP(?:s)?\b/gi, targets: ["ETP", "ETPs"], orderSensitive: true },
];

const UNPUBLISHABLE_ZH_PATTERNS = [
  /评分获胜/,
  /(?:加密|数字资产)(?:业务)?推送/,
  /加密(?:货币)?检查/,
  /摄氏度(?:挂钩|关联|相关)/,
  /防范排除了/,
  /[-—–－]\s*(?:目前|现在|暂时)(?:来看)?[。.]?$/,
  /(?:^|[，：；])\s*目前[。.]?$/,
  /([\p{Script=Han}A-Za-z][\p{Script=Han}A-Za-z· ]{1,20})将在[^，。]{0,24}超越\1/u,
  /[，：；]\s*[，：；]/,
  /以下是今天(?:加密货币|币圈).{0,8}(?:发生的事情|新闻|要闻)/,
  /(?:加密货币|币圈)(?:今日|每天)(?:新闻|汇总|简报)/,
  /(?:山寨币基金比特币|以太坊基金比特币|基金山寨币比特币)/,
  /敲诈骗(?!局)/,
] as const;

function countMatches(value: string, matcher: RegExp) {
  return [...value.matchAll(new RegExp(matcher.source, matcher.flags.includes("g") ? matcher.flags : `${matcher.flags}g`))].length;
}

function countTargetMentions(value: string, targets: readonly string[]) {
  return targets.reduce((total, target) => {
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const bounded = /^[A-Za-z0-9]/.test(target) && /[A-Za-z0-9]$/.test(target)
      ? `\\b${escaped}\\b`
      : escaped;
    return total + (value.match(new RegExp(bounded, "gi"))?.length ?? 0);
  }, 0);
}

function sourceNumbers(value: string) {
  return value.match(/\b\d+(?:\.\d+)?%?/g) ?? [];
}

function collectSourceEntitySequence(value: string, orderSensitiveOnly = false) {
  const matches: Array<{ index: number; ruleIndex: number }> = [];
  HEADLINE_ENTITY_RULES.forEach((rule, ruleIndex) => {
    if (orderSensitiveOnly && !rule.orderSensitive) return;
    const matcher = new RegExp(rule.source.source, rule.source.flags.includes("g") ? rule.source.flags : `${rule.source.flags}g`);
    for (const match of value.matchAll(matcher)) matches.push({ index: match.index ?? 0, ruleIndex });
  });
  return matches.sort((left, right) => left.index - right.index || left.ruleIndex - right.ruleIndex).map((match) => match.ruleIndex);
}

function collectCandidateEntitySequence(value: string, orderSensitiveOnly = false) {
  const matches: Array<{ index: number; ruleIndex: number }> = [];
  HEADLINE_ENTITY_RULES.forEach((rule, ruleIndex) => {
    if (orderSensitiveOnly && !rule.orderSensitive) return;
    rule.targets.forEach((target) => {
      const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const bounded = /^[A-Za-z0-9]/.test(target) && /[A-Za-z0-9]$/.test(target)
        ? `\\b${escaped}\\b`
        : escaped;
      const matcher = new RegExp(bounded, "gi");
      for (const match of value.matchAll(matcher)) matches.push({ index: match.index ?? 0, ruleIndex });
    });
  });
  return matches.sort((left, right) => left.index - right.index || left.ruleIndex - right.ruleIndex).map((match) => match.ruleIndex);
}

const EVENT_GENERIC_WORDS = new Set([
  "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "is", "of", "on", "or", "the", "to", "with",
  "after", "amid", "before", "new", "over", "say", "says",
  "bitcoin", "btc", "crypto", "cryptocurrency", "ethereum", "ether", "eth", "market", "markets", "price", "prices",
  "stock", "stocks", "token", "tokens", "today", "daily", "latest", "news", "fund", "funds",
]);

function normalizedEventText(value: string) {
  return value.toLowerCase().replace(/[’']/g, "").replace(/[\s\p{P}\p{S}]+/gu, "");
}

function latinEventTokens(value: string) {
  const tokens = value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(tokens.filter((token) => token.length >= 3 && !EVENT_GENERIC_WORDS.has(token)));
}

function hanEventBigrams(value: string) {
  const compact = value
    .toLowerCase()
    .replace(/比特币|以太坊|加密货币|加密资产|币圈|市场|价格|股票|代币|基金|今日|今天|新闻|热点|最新/g, "")
    .replace(/[\s\p{P}\p{S}A-Za-z0-9]+/gu, "");
  const grams = new Set<string>();
  for (let index = 0; index < compact.length - 1; index += 1) grams.add(compact.slice(index, index + 2));
  return grams;
}

function overlapStats(left: Set<string>, right: Set<string>) {
  let shared = 0;
  left.forEach((token) => {
    if (right.has(token)) shared += 1;
  });
  return {
    shared,
    containment: shared / Math.max(1, Math.min(left.size, right.size)),
    jaccard: shared / Math.max(1, left.size + right.size - shared),
  };
}

export function areSameEditorialEvent(left: string, right: string) {
  if (normalizedEventText(left) === normalizedEventText(right)) return true;
  const leftHasHan = containsHan(left);
  const rightHasHan = containsHan(right);
  if (leftHasHan !== rightHasHan) return false;

  if (leftHasHan) {
    const stats = overlapStats(hanEventBigrams(left), hanEventBigrams(right));
    return stats.shared >= 4 && stats.containment >= 0.52 && stats.jaccard >= 0.34;
  }

  const stats = overlapStats(latinEventTokens(left), latinEventTokens(right));
  return stats.shared >= 3 && stats.containment >= 0.55 && stats.jaccard >= 0.34;
}

function translateShortTimePhrase(value: string) {
  const months: Record<string, string> = {
    january: "1月",
    february: "2月",
    march: "3月",
    april: "4月",
    may: "5月",
    june: "6月",
    july: "7月",
    august: "8月",
    september: "9月",
    october: "10月",
    november: "11月",
    december: "12月",
  };
  return value
    .replace(/^two weeks of inflation and jobs data$/i, "未来两周的通胀与就业数据")
    .replace(/^end of ([A-Za-z]+)$/i, (_, month: string) => `${months[month.toLowerCase()] ?? month}底`)
    .replace(/^Nasdaq debut$/i, "纳斯达克首秀");
}

function naturalRewriteFromEnglish(source: string, translated: string) {
  if (/^There(?:'|’)s a New Way to Protect Bitcoin From Future Quantum Attacks, Researchers Say$/i.test(source)) {
    return "研究人员提出一种帮助比特币抵御未来量子攻击的新方案";
  }

  if (/^US sanctions Iranian maritime firm, says it accepted Bitcoin to evade restrictions$/i.test(source)) {
    return "美国制裁伊朗海事公司，称其接受比特币以规避限制";
  }

  if (/^Ethereum Price Stalls as Fed Rate Decision Looms$/i.test(source)) {
    return "美联储利率决议临近之际，以太坊价格走势趋于停滞";
  }

  if (/^South Korean crypto trading surges amid stock market plunge$/i.test(source)) {
    return "韩国股市大跌之际，当地加密货币交易量激增";
  }

  if (/^Japanese game developer launches Bitcoin, altcoin fund with SBI$/i.test(source)) {
    return "日本游戏开发商与 SBI 合作推出比特币和山寨币基金";
  }

  if (/^Chinese newspaper warns of Bitcoin extortion scam using its name$/i.test(source)) {
    return "一家中国报纸警告，有人冒用其名义实施比特币敲诈骗局";
  }

  if (/^Fed decision headlines two weeks of inflation and jobs data$/i.test(source)) {
    return "美联储利率决定领衔未来两周的通胀与就业数据";
  }

  if (/^Zcash says Ironwood proof rules out undetectable counterfeiting bugs$/i.test(source)) {
    return "Zcash：Ironwood 证明机制可排除无法检测的伪造漏洞";
  }

  if (/^Hungary repeals crypto checks as first MiCA license is granted$/i.test(source)) {
    return "匈牙利取消加密货币兑换的第三方强制审查，并颁发首张 MiCA 牌照";
  }

  if (/^South Korea plans stablecoin rules as opposition pushes crypto tax repeal$/i.test(source)) {
    return "韩国拟制定稳定币监管规则，反对党推动废除加密货币税";
  }

  const expandsCrypto = source.match(/^(.+?)\s+expands?\s+(?:its\s+)?crypto push\s+with\s+(.+)$/i);
  if (expandsCrypto) {
    const subject = expandsCrypto[1].replace(/^Morgan Stanley$/i, "摩根士丹利");
    const products = expandsCrypto[2]
      .replace(/\bEthereum\b/gi, "以太坊")
      .replace(/\bSolana\b/gi, "Solana")
      .replace(/\bETPs?\b/gi, "ETP")
      .replace(/\s+and\s+/gi, "和");
    return `${subject}借助${products}扩大加密资产布局`;
  }

  const overtakes = source.match(/^(.+?)\s+overtakes\s+(.+?)[—–-]+which will be bigger by end of\s+(.+)$/i);
  if (overtakes) {
    const leader = overtakes[1].replace(/^Apple$/i, "苹果");
    const runnerUp = overtakes[2].replace(/^Nvidia$/i, "英伟达");
    const deadline = translateShortTimePhrase(`end of ${overtakes[3]}`);
    return `${leader}市值超过${runnerUp}，两家公司截至${deadline}的市值排名仍待观察`;
  }

  const linkedGain = source.match(/^(.+?)-linked\s+(.+?)\s+gains?\s+(\d+(?:\.\d+)?%)\s+in\s+(.+)$/i);
  if (linkedGain) {
    const relatedParty = linkedGain[1].replace(/^Celsius(?: Network)?$/i, "Celsius");
    const subject = linkedGain[2]
      .replace(/^Bitcoin miner\s+/i, "比特币矿企 ")
      .replace(/\s+/g, " ");
    const event = translateShortTimePhrase(linkedGain[4]);
    return `与${relatedParty}有关联的${subject}在${event}中上涨${linkedGain[3]}`;
  }

  return translated;
}

function normalizeChineseHeadline(source: string, value: string) {
  let result = naturalRewriteFromEnglish(source, value)
    .replace(/^法律资讯网站消息[：:]/, "据法律资讯网站报道，")
    .replace(/\s*,\s*/g, "，")
    .replace(/\s*:\s*/g, "：")
    .replace(/\s+([，。！？：；）】])/g, "$1")
    .replace(/([（【])\s+/g, "$1")
    .replace(/([，。！？：；])\s+/g, "$1")
    .replace(/摄氏度(?=(?:挂钩|关联|相关))/g, "Celsius")
    .replace(/加密(?:业务)?推送/g, "加密资产布局")
    .replace(/纳斯达克首次亮相/g, "纳斯达克首秀")
    .replace(/比特币矿工(?=\s*[A-Z])/g, "比特币矿企")
    .replace(/([\p{Script=Han}])([A-Za-z][A-Za-z0-9.-]*)/gu, "$1 $2")
    .replace(/([A-Za-z][A-Za-z0-9.-]*)([\p{Script=Han}])/gu, "$1 $2")
    .replace(/^(关键财报(?:公布|发布)前)(?![，,])/, "$1，")
    .trim();

  result = result
    .replace(/[。.]$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return result;
}

export function isPublishableTranslatedHeadline(original: string, candidate: string, language: "zh" | "en") {
  const source = extractShareHeadline(original);
  const value = candidate.trim();
  if (!isRigorousDigestHeadlineSource(original)) return false;
  if (!value || value.length < 6 || value.length > 140 || /[\r\n]/.test(value)) return false;
  if (isMetaEditorialHeadline(value) || DANGLING_HEADLINE_END.test(value) || !hasBalancedHeadlinePairs(value)) return false;
  if (language === "zh") {
    if (!containsHan(value) || UNPUBLISHABLE_ZH_PATTERNS.some((pattern) => pattern.test(value))) return false;
    if (!/\b(?:cause[sd]?|drive[sn]?|drove|trigger(?:s|ed)?|lead(?:s|ing)? to|because|push(?:es|ed)?)\b/i.test(source)
      && /(?:导致|引发|促使)/.test(value)) return false;
    if (/\b(?:alleged|allegedly)\b/i.test(source) && !/(?:涉嫌|据称|被控|指控|alleged)/i.test(value)) return false;
  } else if (containsHan(value) || /[-—–]\s*(?:currently|at present)\s*$/i.test(value)) {
    return false;
  }

  const candidateNumbers = new Set(sourceNumbers(value));
  if (sourceNumbers(source).some((number) => !candidateNumbers.has(number))) return false;

  for (const rule of HEADLINE_ENTITY_RULES) {
    const expectedCount = countMatches(source, rule.source);
    if (expectedCount === 0) continue;
    const actualCount = countTargetMentions(value, rule.targets);
    if (actualCount !== expectedCount) return false;
  }
  const sourceEntitySequence = collectSourceEntitySequence(source, true);
  const candidateEntitySequence = collectCandidateEntitySequence(value, true);
  if (sourceEntitySequence.length > 1
    && sourceEntitySequence.some((ruleIndex, index) => candidateEntitySequence[index] !== ruleIndex)) return false;
  return true;
}

export function polishTranslatedHeadline(original: string, translated: string, language: "zh" | "en") {
  const source = extractShareHeadline(original);
  if (language === "en") return translated.replace(/\s+([,.;!?])/g, "$1").trim();

  let result = normalizeChineseHeadline(source, translated);

  const scoreWin = source.match(/^([^,]+),\s*([^,]+?)\s+score(?:s|d)?\s+(?:a\s+)?win\b/i);
  if (scoreWin) {
    const leftName = scoreWin[1].trim();
    const rightName = scoreWin[2].trim();
    const translatedPrefix = `${leftName}，${rightName}`;
    if (result.startsWith(translatedPrefix)) {
      const remainder = result.slice(translatedPrefix.length).replace(/^(?:评分)?获胜/, "取得阶段性胜利");
      result = `${leftName} 与 ${rightName} ${remainder}`;
    } else {
      result = result.replace(/评分获胜|获得胜利/, "取得阶段性胜利");
    }
    if (/\bas\s+(?:a\s+)?judge\b/i.test(source)) {
      result = result.replace(/(取得阶段性胜利)，(?=法官)/, "$1：");
    }
  }

  const forNow = /[—–-]\s*for now\s*$/i.test(source);
  if (forNow) {
    result = result.replace(/[-—–－]\s*(?:目前|现在|暂时)(?:来看)?[。.]?$/, "").trim();
    if (!result.includes("暂时")) {
      const withNaturalAdverb = result.replace(/法官(?=(?:已)?(?:阻止|叫停|暂停|裁定))/, "法官暂时");
      result = withNaturalAdverb === result ? `${result}（暂时）` : withNaturalAdverb;
    }
  }

  if (/\bblocks?\b.+\bprediction market ban\b/i.test(source)) {
    result = result.replace(/阻止([^，。；：]*?)(预测市场禁令)/, "阻止$1实施$2");
  }

  return normalizeChineseHeadline(source, result);
}
