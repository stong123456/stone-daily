export type MarketKind = "crypto" | "stock";

export type MarketProductType = "crypto-spot" | "tokenized-spot" | "tokenized-onchain" | "tokenized-perpetual";

export type UIMode = "brief" | "lens" | "calm";

export interface MarketAsset {
  id: string;
  canonicalId?: string;
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
  confirmedFacts?: string[];
  inference?: string;
  marketReaction?: string;
  relatedAssets: string[];
  heat: number;
  confidence: "多源一致" | "官方确认" | "单一来源" | "待复核";
  sources: Array<{ name: string; url: string }>;
  publishedAt: string;
}

export type EditorialFeedCategory = HotspotCategory | "全球";

export interface EditorialFeedItem {
  id: string;
  source: string;
  sourceType: "官方" | "交易所" | "媒体";
  category: EditorialFeedCategory;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  relatedAssets: string[];
  urgency: "快讯" | "重要" | "常规";
}

export interface EditorialDigestItem {
  id: string;
  category: "币股" | "币圈";
  title: string;
  originalLanguage: "zh" | "en";
  relatedAssets: string[];
  sources: Array<{ name: string; url: string }>;
  publishedAt: string;
}

export interface EditorialDigest {
  language: "zh" | "en";
  items: EditorialDigestItem[];
  mode: "native-only";
}

export interface EditorialSourceHealth {
  name: string;
  type: "官方" | "交易所" | "媒体";
  status: "live" | "unavailable";
  itemCount: number;
  url: string;
}

export interface EditorialFeedSnapshot {
  items: EditorialFeedItem[];
  providers: EditorialSourceHealth[];
  digests?: { zh: EditorialDigest; en: EditorialDigest };
  updatedAt: string;
  mode: "live" | "partial" | "fallback";
}

export type EconomicEventImportance = 1 | 2 | 3;

export interface EconomicEvent {
  id: string;
  scheduledAt: string;
  countryCode: string;
  countryName: string;
  currency: string;
  event: string;
  importance: EconomicEventImportance;
  actual?: string;
  forecast?: string;
  previous?: string;
  sourceName: string;
  sourceUrl: string;
  status: "scheduled" | "released" | "tentative";
}

export interface EconomicCalendarProvider {
  name: string;
  status: "live" | "catalog" | "unavailable";
  eventCount: number;
  url: string;
}

export interface EconomicCalendarSnapshot {
  events: EconomicEvent[];
  providers: EconomicCalendarProvider[];
  updatedAt: string;
  mode: "live" | "partial" | "fallback";
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

export interface HistoryTodayProvider {
  name: string;
  status: "live" | "fallback" | "unavailable";
  url: string;
}

export interface HistoryTodaySnapshot {
  dateKey: string;
  month: number;
  day: number;
  events: HistoryEvent[];
  provider: HistoryTodayProvider;
  updatedAt: string;
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
  type: "ai" | "regret" | "detox";
  createdAt: string;
  summary: string;
}

export type MarketAlertKind = "price-above" | "price-below" | "move-up" | "move-down" | "news" | "funding";

export interface MarketAlert {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  market: MarketKind;
  kind: MarketAlertKind;
  threshold?: number;
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  symbol: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AssetEvidenceChain {
  confirmedFacts: string[];
  observations: string[];
  possibleExplanations: string[];
  unconfirmed: string[];
  sources: Array<{ name: string; url?: string; asOf?: string }>;
}

export interface ProductIdentity {
  productType: MarketProductType;
  label: string;
  issuer: string;
  custody: string;
  holderRights: string;
  tradingHours: string;
  dividendTreatment: string;
  regionalLimits: string;
  backing: string;
  sourceUrl?: string;
}

export interface DataProviderStatus {
  name: string;
  surface: "crypto" | "stocks" | "editorial" | "calendar";
  status: "live" | "cached" | "catalog" | "fallback" | "unavailable";
  itemCount: number;
  latencyMs?: number;
  updatedAt?: string;
  url?: string;
}

export interface DataTrustSnapshot {
  updatedAt: string;
  overall: "healthy" | "partial" | "degraded";
  providers: DataProviderStatus[];
  checks: {
    live: number;
    total: number;
    oldestAgeSeconds: number;
  };
}
