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

export function containsHan(value: string) {
  return /\p{Script=Han}/u.test(value);
}

export function isTrackedUsStockAsset(asset: string) {
  return US_STOCK_ASSETS.has(asset);
}

export function isShareableMarketStory(item: EditorialFeedItem) {
  if (item.category === "币圈") return true;
  if (item.category !== "币股") return false;
  const text = `${item.title} ${item.summary}`;
  return US_STOCK_OR_TOKENIZED_MARKER.test(text) || item.relatedAssets.some(isTrackedUsStockAsset);
}

export function extractShareHeadline(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const bracketHeadline = normalized.match(/^【([^】]+)】/)?.[1];
  const firstSentence = normalized.split(/[。！？!?]/, 1)[0];
  return (bracketHeadline || firstSentence || normalized).trim();
}

export function polishTranslatedHeadline(original: string, translated: string, language: "zh" | "en") {
  const source = extractShareHeadline(original);
  if (language === "en") return translated.replace(/\s+([,.;!?])/g, "$1").trim();

  let result = translated
    .replace(/\s*,\s*/g, "，")
    .replace(/\s*:\s*/g, "：")
    .replace(/\s+([，。！？：；）】])/g, "$1")
    .replace(/([（【])\s+/g, "$1")
    .replace(/([，。！？：；])\s+/g, "$1")
    .trim();

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

  return result.trim();
}
