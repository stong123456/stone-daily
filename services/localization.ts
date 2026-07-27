import { canonicalAssetSymbol, type LiveMarketWeather } from "@/services/marketWeather";
import type { MarketAsset } from "@/types/market";

export type SupportedLanguage = "zh" | "en";

function formatMove(asset?: MarketAsset) {
  if (!asset) return "no valid quote yet";
  const sign = asset.change24h >= 0 ? "+" : "";
  return `${canonicalAssetSymbol(asset)} ${sign}${asset.change24h.toFixed(2)}%`;
}

export function localizeMarketWeather(weather: LiveMarketWeather, language: SupportedLanguage): LiveMarketWeather {
  if (language === "zh") return weather;
  const strongest = weather.topMovers[0];
  const weakest = weather.laggards[0];
  const weatherLabel = weather.tone === "windy" ? "Hot with gusts" : weather.tone === "warm" ? "Mostly sunny" : weather.tone === "cold" ? "Cool and rainy" : "Mildly cloudy";
  return {
    ...weather,
    weather: weatherLabel,
    headline: `${weather.breadth}% of representative assets are higher. Crypto temperature is ${weather.cryptoTemperature}; tokenized stocks are ${weather.stockTemperature}.${strongest ? ` The current leading representative is ${formatMove(strongest)}.` : " Waiting for more valid quotes."}`,
    riskNote: weather.fomoIndex >= 70
      ? `Fast-moving assets are outrunning the market median. Before chasing moves such as ${formatMove(strongest)}, verify depth and the original source.`
      : weather.volatility >= 4
        ? `Dispersion and volatility are elevated; the weakest representative is ${formatMove(weakest)}. Do not treat one venue's candle as the whole market.`
        : "Overall volatility remains manageable, but prices and holder rights differ across venues, spot products and tokenized-stock structures.",
    highlights: [
      `Crypto breadth is ${weather.cryptoBreadth}%; median representative volatility is reflected in the live calculation.`,
      `Tokenized-stock breadth is ${weather.stockBreadth}%; venue and product structure remain separate.`,
      strongest ? `${formatMove(strongest)} leads the deduplicated gainers; the representative quote comes from ${strongest.venue ?? "the current feed"}.` : "There are not yet enough valid leaders to form a sample.",
    ],
    watchouts: [
      weather.fomoIndex >= 70 ? `The FOMO index is ${weather.fomoIndex}; short-term chase risk is elevated.` : `The FOMO index is ${weather.fomoIndex}; sentiment is not yet extreme.`,
      `${weather.highVolatilityShare}% of representative assets moved more than 5% over 24 hours.`,
      weather.totalProviders ? `${weather.liveProviders}/${weather.totalProviders} feeds are live; offline sources are excluded from the conclusion.` : "Feed health is still loading, so treat the conclusion as provisional.",
    ],
  };
}

export function localizeAssetCopy(asset: MarketAsset, language: SupportedLanguage) {
  if (language === "zh") return { name: asset.name, narrative: asset.narrative, aiTag: asset.aiTag, aiHint: asset.aiHint };
  const product = asset.productType ?? (asset.market === "crypto" ? "crypto-spot" : "tokenized-spot");
  const venue = asset.venue ?? (asset.market === "crypto" ? "Aggregated venues" : "Tokenized-stock feed");
  const quote = asset.quoteCurrency ?? "USD";
  const absMove = Math.abs(asset.change24h);
  const direction = asset.change24h >= 0 ? "higher" : "lower";
  const productLabels = {
    "crypto-spot": "crypto spot",
    "tokenized-spot": "tokenized-stock spot",
    "tokenized-onchain": "onchain tokenized stock",
    "tokenized-perpetual": "tokenized-stock perpetual",
  } as const;
  const structuralRisk = product === "tokenized-perpetual"
    ? "This is a leveraged derivative with funding, margin and liquidation risk—not stock ownership."
    : product === "tokenized-onchain"
      ? "Check custody, attestation, contract and regional eligibility; the token is not automatically the registered share."
      : product === "tokenized-spot"
        ? "The token provides venue-specific economic exposure and does not automatically carry traditional shareholder rights."
        : "Confirm the move across venues and volume before treating a 24-hour change as a durable trend.";
  return {
    name: /^[\p{Script=Han}\s]+$/u.test(asset.name) ? asset.symbol : asset.name,
    narrative: `${venue} · ${productLabels[product]} · ${quote}`,
    aiTag: absMove >= 8 ? "High volatility" : absMove >= 3 ? "Momentum move" : absMove <= 0.5 ? "Range-bound" : direction === "higher" ? "Firming" : "Pullback",
    aiHint: `${asset.symbol} is ${direction} ${absMove.toFixed(2)}% over 24 hours. ${structuralRisk}`,
  };
}
