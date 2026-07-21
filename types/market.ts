export type MarketKind = "crypto" | "stock";

export type MarketProductType = "crypto-spot" | "tokenized-spot" | "tokenized-onchain" | "tokenized-perpetual";

export type UIMode = "brief" | "lens" | "calm";

export interface MarketAsset {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  narrative: string;
  aiTag: string;
  aiHint: string;
  volumeChange: number;
  market: MarketKind;
  venue?: string;
  sector?: string;
  productType?: MarketProductType;
  quoteCurrency?: string;
  underlying?: string;
  feedMode?: "live" | "cached" | "fallback";
  asOf?: string;
}

export interface MarketSpread {
  symbol: string;
  quoteCurrency: string;
  lowPrice: number;
  highPrice: number;
  spreadPct: number;
  lowVenue: string;
  highVenue: string;
  venueCount: number;
}

export interface StreamingSummary {
  venues: string[];
  quoteCount: number;
  updatedAt: string;
  lagMs: number;
}

export interface StreamQuote {
  venue: string;
  symbol: string;
  quoteCurrency: string;
  price: number;
  change24h: number;
  volume: number;
  updatedAt: string;
}

export interface StreamQuoteSnapshot {
  version: 1;
  quotes: StreamQuote[];
  updatedAt: string;
}

export interface MarketCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DerivativeVenueMetric {
  venue: string;
  markPrice: number;
  fundingRate: number;
  openInterest: number;
  openInterestValue?: number;
  nextFundingTime?: number;
}

export interface MarketIntelligence {
  symbol: string;
  updatedAt: string;
  candleVenue?: string;
  candles: MarketCandle[];
  derivatives: DerivativeVenueMetric[];
  markSpreadPct: number;
  sourceMode: "live" | "partial" | "unavailable";
}

export type HotspotCategory = "宏观" | "币股" | "币圈" | "科技" | "监管";

export interface DailyHotspot {
  id: string;
  rank: number;
  category: HotspotCategory;
  title: string;
  summary: string;
  whyItMatters: string;
  riskNote: string;
  relatedAssets: string[];
  heat: number;
  confidence: "多源一致" | "官方确认" | "单一来源" | "待复核";
  sources: Array<{ name: string; url: string }>;
  publishedAt: string;
}

export interface HistoryEvent {
  id: string;
  year: number;
  category: "宏观" | "监管" | "币股" | "币圈" | "科技";
  title: string;
  summary: string;
  whyItMatters: string;
  lesson: string;
  sourceName: string;
  sourceUrl: string;
}

export interface MarketSnapshot {
  stockTemperature: number;
  cryptoTemperature: number;
  fomoIndex: number;
  weather: string;
  headline: string;
  riskNote: string;
  updatedAt: string;
}

export interface AIExplanation {
  title: string;
  whatHappened: string;
  possibleReasons: string[];
  commonMistake: string;
  watchNext: string[];
  plainSummary: string;
}

export interface RegretAnalysis {
  title: string;
  trigger: string;
  riskScenarios: string[];
  riskiestStep: string;
  stopNow: string[];
  verifySafely: string[];
  conclusion: string;
}

export interface HotspotAnalysis {
  summary: string;
  facts: string[];
  speculation: string[];
  emotionalAmplifiers: string[];
  misleadingLine: string;
  missingInformation: string[];
  verdict: "先别急" | "可以继续研究" | "高风险上头信号";
}

export interface CalmRecord {
  id: string;
  input: string;
  type: "regret" | "detox";
  createdAt: string;
  summary: string;
}
