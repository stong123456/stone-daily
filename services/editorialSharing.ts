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
  const headline = item.title;
  const hasTrackedStock = US_STOCK_OR_TOKENIZED_MARKER.test(headline) || TRACKED_US_STOCK_HEADLINE_MARKER.test(headline);
  const hasCryptoMarketSubject = CRYPTO_MARKET_MARKER.test(headline);
  return hasTrackedStock || hasCryptoMarketSubject;
}

export function extractShareHeadline(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const bracketHeadline = normalized.match(/^【([^】]+)】/)?.[1];
  const firstSentence = normalized.split(/[。！？!?]/, 1)[0];
  return (bracketHeadline || firstSentence || normalized).trim();
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
  return true;
}

const HEADLINE_ENTITY_RULES = [
  { source: /\bMichael Saylor\b/gi, targets: ["迈克尔·塞勒", "Michael Saylor"] },
  { source: /\bMorgan Stanley\b/gi, targets: ["摩根士丹利", "Morgan Stanley"] },
  { source: /\bFederal Reserve\b|\bFed\b/gi, targets: ["美联储", "Federal Reserve", "Fed"] },
  { source: /\bCelsius(?: Network)?\b/gi, targets: ["Celsius", "摄氏网络"] },
  { source: /\bIonic Digital\b/gi, targets: ["Ionic Digital"] },
  { source: /\bApple\b/gi, targets: ["苹果", "Apple"] },
  { source: /\bNvidia\b/gi, targets: ["英伟达", "Nvidia"] },
  { source: /\bNasdaq\b/gi, targets: ["纳斯达克", "Nasdaq"] },
  { source: /\bBitcoin\b/gi, targets: ["比特币", "Bitcoin"] },
  { source: /\bEthereum\b/gi, targets: ["以太坊", "Ethereum"] },
  { source: /\bSolana\b/gi, targets: ["Solana", "索拉纳"] },
  { source: /\bZcash\b/gi, targets: ["Zcash", "大零币"] },
  { source: /\bIronwood\b/gi, targets: ["Ironwood"] },
  { source: /\bKalshi\b/gi, targets: ["Kalshi"] },
  { source: /\bPolymarket\b/gi, targets: ["Polymarket"] },
  { source: /\bBinance\b/gi, targets: ["币安", "Binance"] },
  { source: /\bCoinbase\b/gi, targets: ["Coinbase"] },
  { source: /\bKraken\b/gi, targets: ["Kraken"] },
  { source: /\bBybit\b/gi, targets: ["Bybit"] },
  { source: /\bBitget\b/gi, targets: ["Bitget"] },
  { source: /\bOKX\b/g, targets: ["OKX"] },
  { source: /\bSEC\b/g, targets: ["SEC", "美国证券交易委员会"] },
  { source: /\bCFTC\b/g, targets: ["CFTC", "美国商品期货交易委员会"] },
  { source: /\bETF(?:s)?\b/gi, targets: ["ETF", "ETFs"] },
  { source: /\bETP(?:s)?\b/gi, targets: ["ETP", "ETPs"] },
] as const;

const UNPUBLISHABLE_ZH_PATTERNS = [
  /评分获胜/,
  /(?:加密|数字资产)(?:业务)?推送/,
  /摄氏度(?:挂钩|关联|相关)/,
  /防范排除了/,
  /[-—–－]\s*(?:目前|现在|暂时)(?:来看)?[。.]?$/,
  /(?:^|[，：；])\s*目前[。.]?$/,
  /([\p{Script=Han}A-Za-z][\p{Script=Han}A-Za-z· ]{1,20})将在[^，。]{0,24}超越\1/u,
  /[，：；]\s*[，：；]/,
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
  if (/^Fed decision headlines two weeks of inflation and jobs data$/i.test(source)) {
    return "美联储利率决定领衔未来两周的通胀与就业数据";
  }

  if (/^Zcash says Ironwood proof rules out undetectable counterfeiting bugs$/i.test(source)) {
    return "Zcash：Ironwood 证明机制可排除无法检测的伪造漏洞";
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
  if (!value || value.length < 6 || value.length > 140 || /[\r\n]/.test(value)) return false;
  if (language === "zh") {
    if (!containsHan(value) || UNPUBLISHABLE_ZH_PATTERNS.some((pattern) => pattern.test(value))) return false;
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
