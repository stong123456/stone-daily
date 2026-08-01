import { canonicalAssetSymbol } from "@/services/marketWeather";
import type { AssetEvidenceChain, MarketAsset, MarketIntelligence, ProductIdentity } from "@/types/market";

const PRODUCT_LABELS: Record<NonNullable<MarketAsset["productType"]>, [string, string]> = {
  "crypto-spot": ["加密现货", "Crypto spot"],
  "tokenized-spot": ["币股现货", "Tokenized stock spot"],
  "tokenized-onchain": ["链上币股", "On-chain tokenized stock"],
  "tokenized-perpetual": ["币股永续", "Tokenized stock perpetual"],
};

export function assetProductLabel(asset: MarketAsset, language: "zh" | "en" = "zh") {
  return PRODUCT_LABELS[asset.productType ?? "crypto-spot"][language === "en" ? 1 : 0];
}

export function productIdentityFor(asset: MarketAsset, language: "zh" | "en" = "zh"): ProductIdentity {
  const type = asset.productType ?? "crypto-spot";
  const en = language === "en";
  const venue = asset.venue ?? (en ? "Current venue" : "当前交易场所");
  const common = { productType: type, label: assetProductLabel(asset, language), issuer: en ? "See the venue's product disclosure" : "以交易场所产品披露为准", sourceUrl: venueDocs(venue) };
  if (type === "tokenized-perpetual") return {
    ...common,
    custody: en ? "No direct custody of the underlying share" : "不直接托管基础股票",
    holderRights: en ? "No shareholder or voting rights; it is a derivative contract" : "不享有股东或投票权，属于衍生品合约",
    tradingHours: en ? "Venue-defined, often close to 24/7" : "按交易所规则，通常接近 7×24",
    dividendTreatment: en ? "Reflected only if the contract rules specify an adjustment" : "仅按合约规则进行价格或现金调整",
    regionalLimits: en ? "Trading eligibility depends on venue and region" : "交易资格受平台及地区限制",
    backing: en ? "Contract exposure; not a claim on registered shares" : "合约敞口，不是登记股票所有权",
  };
  if (type === "tokenized-spot" || type === "tokenized-onchain") return {
    ...common,
    custody: en ? "Backing and custody are defined by the issuer and venue disclosure" : "支持资产与托管安排以发行方及平台披露为准",
    holderRights: en ? "Normally no direct shareholder or voting rights" : "通常不直接享有股东或投票权",
    tradingHours: en ? "Venue-defined; may differ from the underlying exchange" : "按交易场所规则，可能不同于基础股票交易时段",
    dividendTreatment: en ? "Issuer-specific; verify cash, reinvestment or price adjustment rules" : "因发行方而异，需核对现金、再投资或价格调整规则",
    regionalLimits: en ? "Issuance, redemption and trading can be region-restricted" : "发行、赎回和交易可能受地区限制",
    backing: en ? "Token or venue claim linked to an underlying; not the registered share itself" : "与基础标的挂钩的代币或平台权利，并非登记股票本身",
  };
  return {
    ...common,
    issuer: en ? "Decentralized asset / protocol, depending on the token" : "取决于代币对应的去中心化网络或协议",
    custody: en ? "Held by the user or venue, depending on the account" : "由用户自托管或交易所托管，取决于账户方式",
    holderRights: en ? "Token rights depend on protocol rules; no equity rights by default" : "代币权利由协议规则决定，默认不包含股权",
    tradingHours: "7×24",
    dividendTreatment: en ? "Not applicable unless the protocol explicitly distributes rewards" : "通常不适用；协议明确分配奖励时除外",
    regionalLimits: en ? "Access and product availability depend on local rules and the venue" : "访问与产品可用性受当地规则和平台限制",
    backing: en ? "Native token market value; stablecoins and wrapped assets require separate reserve checks" : "原生代币由市场定价；稳定币和封装资产需另查储备",
  };
}

function venueDocs(venue: string) {
  const key = venue.toLowerCase();
  if (key.includes("kraken")) return "https://support.kraken.com/articles/xstocks";
  if (key.includes("okx")) return "https://www.okx.com/help/section/trading";
  if (key.includes("bybit")) return "https://www.bybit.com/en/help-center";
  if (key.includes("bitget")) return "https://www.bitget.com/support";
  if (key.includes("binance")) return "https://www.binance.com/en/support";
  return undefined;
}

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value >= 1 ? 4 : 8 }).format(value);
}

export function buildAssetEvidence(asset: MarketAsset, venues: MarketAsset[], intelligence: MarketIntelligence | null, language: "zh" | "en"): AssetEvidenceChain {
  const en = language === "en";
  const symbol = canonicalAssetSymbol(asset);
  const activeVenues = [...new Set(venues.map((item) => item.venue).filter(Boolean))] as string[];
  const priceValues = venues.map((item) => item.price).filter((value) => value > 0);
  const low = priceValues.length ? Math.min(...priceValues) : asset.price;
  const high = priceValues.length ? Math.max(...priceValues) : asset.price;
  const spread = low > 0 ? ((high - low) / low) * 100 : 0;
  const product = assetProductLabel(asset, language);
  return {
    confirmedFacts: en ? [
      `${asset.venue ?? "The selected feed"} reports ${symbol} at ${fmt(asset.price)} ${asset.quoteCurrency ?? ""}.`,
      `The selected ${product.toLowerCase()} quote changed ${asset.change24h >= 0 ? "+" : ""}${asset.change24h.toFixed(2)}% over 24 hours.`,
      `${activeVenues.length || 1} venue${activeVenues.length === 1 ? "" : "s"} currently provide comparable Stone Daily records.`,
    ] : [
      `${asset.venue ?? "当前行情源"} 报告 ${symbol} 价格为 ${fmt(asset.price)} ${asset.quoteCurrency ?? ""}。`,
      `当前选择的${product} 24 小时涨跌为 ${asset.change24h >= 0 ? "+" : ""}${asset.change24h.toFixed(2)}%。`,
      `Stone Daily 当前找到 ${activeVenues.length || 1} 个可比较交易场所记录。`,
    ],
    observations: en ? [
      `The displayed cross-venue price range is ${fmt(low)}–${fmt(high)}, a screen spread of ${spread.toFixed(3)}%.`,
      intelligence?.derivatives.length ? `${intelligence.derivatives.length} derivative venues report funding and open interest in their own methodologies.` : "Derivative metrics are unavailable or not applicable to this asset.",
      `Reported volume comes from individual venues and is not presented as a reliable all-market sum.`,
    ] : [
      `当前跨所报价范围为 ${fmt(low)}–${fmt(high)}，屏幕价差约 ${spread.toFixed(3)}%。`,
      intelligence?.derivatives.length ? `${intelligence.derivatives.length} 个衍生品交易场所按各自口径报告资金费率和持仓量。` : "该资产当前没有可用或适用的衍生品指标。",
      "页面成交量保留单一交易场所口径，不作为可靠的全市场简单加总。",
    ],
    possibleExplanations: en ? [
      "Market-wide risk appetite, asset-specific news and venue flows may be interacting; the data does not prove one cause.",
      Math.abs(asset.change24h) >= 5 ? "A faster move can reflect both new information and short-term crowding." : "A moderate move may reflect ordinary repricing rather than a new durable trend.",
    ] : [
      "市场风险偏好、资产自身消息和交易所资金流可能共同作用；现有数据不能证明单一因果。",
      Math.abs(asset.change24h) >= 5 ? "较快涨跌既可能包含新信息，也可能包含短线拥挤。" : "温和波动可能只是常规重新定价，并不自动构成新趋势。",
    ],
    unconfirmed: en ? [
      "No source currently proves that one headline alone caused this move.",
      "Execution quality, deposit/withdrawal status and regional eligibility must be checked on the venue before acting.",
    ] : [
      "目前没有来源能够证明某一条消息单独导致了本次涨跌。",
      "实际成交质量、充提状态和地区资格需要在行动前到交易场所核实。",
    ],
    sources: [
      ...activeVenues.map((name) => ({ name, asOf: venues.find((item) => item.venue === name)?.asOf })),
      ...(intelligence?.candleVenue ? [{ name: intelligence.candleVenue, asOf: intelligence.updatedAt }] : []),
    ],
  };
}

export function assetVolatility(candles: MarketIntelligence["candles"]) {
  if (candles.length < 2) return 0;
  const returns = candles.slice(1).map((candle, index) => Math.abs((candle.close - candles[index].close) / candles[index].close) * 100).filter(Number.isFinite);
  return returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
}
