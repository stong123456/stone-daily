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

export function compactShareHeadline(value: string, language: "zh" | "en") {
  const headline = extractShareHeadline(value);
  const limit = language === "zh" ? 26 : 56;
  const characters = Array.from(headline);
  return characters.length > limit ? `${characters.slice(0, limit).join("")}…` : headline;
}
