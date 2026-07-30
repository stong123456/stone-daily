import { areSameEditorialEvent } from "@/services/editorialSharing";
import type { DailyHotspot, EditorialFeedItem, HotspotCategory } from "@/types/market";

type EditorialCluster = {
  primary: EditorialFeedItem;
  items: EditorialFeedItem[];
  score: number;
};

const CATEGORY_WEIGHT: Record<HotspotCategory | "全球", number> = {
  宏观: 8,
  监管: 7,
  币股: 7,
  币圈: 6,
  科技: 5,
  全球: 4,
};

const WHY_IT_MATTERS: Record<HotspotCategory, (assets: string) => string> = {
  宏观: (assets) => `宏观预期会通过利率、美元和风险偏好传导到${assets || "多个市场"}，价格反应通常不只持续一根 K 线。`,
  监管: (assets) => `监管变化会影响准入、流动性与合规成本，${assets || "相关产品"}的交易条件可能先于基本面发生变化。`,
  币股: (assets) => `币股同时承受标的公司和加密交易场所两层风险，${assets || "相关资产"}还要关注交易时段、锚定与做市深度。`,
  币圈: (assets) => `这类变化可能直接影响${assets || "相关代币"}的资金流、杠杆和短线情绪，但热度本身不等于方向。`,
  科技: (assets) => `科技叙事最终要回到收入、成本与交付，${assets || "相关资产"}的价格容易先交易预期、再检验兑现。`,
};

const WHY_IT_MATTERS_EN: Record<HotspotCategory, (assets: string) => string> = {
  宏观: (assets) => `Macro expectations move through rates, the dollar and risk appetite into ${assets || "multiple markets"}; the reaction often lasts longer than one candle.`,
  监管: (assets) => `Regulatory changes affect access, liquidity and compliance costs, so trading conditions for ${assets || "related products"} may shift before fundamentals do.`,
  币股: (assets) => `Tokenized stocks carry both issuer and crypto-venue risk. For ${assets || "related assets"}, also check trading hours, price anchoring and market-making depth.`,
  币圈: (assets) => `This development may affect flows, leverage and short-term sentiment around ${assets || "related tokens"}, but attention alone does not imply direction.`,
  科技: (assets) => `Technology narratives eventually meet revenue, cost and delivery. ${assets || "Related assets"} often price expectations first and execution later.`,
};

function chinaDayKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function freshnessScore(publishedAt: string) {
  const ageHours = Math.max(0, (Date.now() - Date.parse(publishedAt)) / 3_600_000);
  return Math.max(0, 24 - ageHours / 3);
}

function itemScore(item: EditorialFeedItem) {
  const sourceScore = item.sourceType === "官方" ? 18 : item.sourceType === "交易所" ? 13 : 9;
  const urgencyScore = item.urgency === "快讯" ? 16 : item.urgency === "重要" ? 11 : 4;
  return sourceScore + urgencyScore + CATEGORY_WEIGHT[item.category] + item.relatedAssets.length * 2 + freshnessScore(item.publishedAt);
}

function toHotspotCategory(category: EditorialFeedItem["category"]): HotspotCategory {
  return category === "全球" ? "宏观" : category;
}

function riskNote(cluster: EditorialCluster, language: "zh" | "en") {
  if (language === "en") {
    if (cluster.items.length > 1) return "Several sources describe a similar theme, but markets can price the same fact very differently. Watch price and volume for confirmation.";
    if (cluster.primary.sourceType === "官方") return "This is an official release, but its market impact still depends on implementation details and the gap versus expectations.";
    if (cluster.primary.sourceType === "交易所") return "An exchange announcement only describes that venue and should not be extrapolated into a market-wide trend.";
    return "This item currently relies mainly on one media source. Wait for official confirmation or independent cross-checks.";
  }
  if (cluster.items.length > 1) return "多家来源对主线描述相近，但市场对同一事实的定价可能完全不同，仍要观察价格与成交量。";
  if (cluster.primary.sourceType === "官方") return "这是官方信息，但政策或公告的实际影响仍取决于执行细节与市场预期差。";
  if (cluster.primary.sourceType === "交易所") return "交易所公告只代表该平台安排，不能自动外推为全市场趋势。";
  return "当前主要来自单一媒体来源，应继续等待官方确认或更多独立来源交叉验证。";
}

function clusterItems(items: EditorialFeedItem[]) {
  const sorted = [...items].sort((left, right) => itemScore(right) - itemScore(left));
  const clusters: EditorialCluster[] = [];

  sorted.forEach((item) => {
    const match = clusters.find((cluster) => {
      if (cluster.primary.category !== item.category) return false;
      if (cluster.items.some((entry) => entry.source === item.source)) return false;
      return areSameEditorialEvent(cluster.primary.title, item.title);
    });
    if (match) {
      match.items.push(item);
      match.score += itemScore(item) * 0.35;
      return;
    }
    clusters.push({ primary: item, items: [item], score: itemScore(item) });
  });

  return clusters.sort((left, right) => right.score - left.score);
}

export function buildDailyHotspots(items: EditorialFeedItem[], limit = 5, language: "zh" | "en" = "zh"): DailyHotspot[] {
  const cutoff = Date.now() - 72 * 3_600_000;
  const recentItems = items.filter((item) => Date.parse(item.publishedAt) >= cutoff);
  const sourceItems = recentItems.length >= 3 ? recentItems : items;
  const selected: EditorialCluster[] = [];
  const categoryCounts = new Map<HotspotCategory, number>();

  for (const cluster of clusterItems(sourceItems)) {
    const category = toHotspotCategory(cluster.primary.category);
    const categoryCount = categoryCounts.get(category) ?? 0;
    if (categoryCount >= 2 && selected.length < Math.min(limit, 4)) continue;
    selected.push(cluster);
    categoryCounts.set(category, categoryCount + 1);
    if (selected.length >= limit) break;
  }

  return selected.map((cluster, index) => {
    const item = cluster.primary;
    const category = toHotspotCategory(item.category);
    const assets = [...new Set(cluster.items.flatMap((entry) => entry.relatedAssets))].slice(0, 5);
    const sourceMap = new Map<string, { name: string; url: string }>();
    cluster.items.forEach((entry) => {
      if (!sourceMap.has(entry.source)) sourceMap.set(entry.source, { name: entry.source, url: entry.url });
    });
    const sources = [...sourceMap.values()];
    return {
      id: `${chinaDayKey()}-${item.id}`,
      rank: index + 1,
      category,
      title: item.title,
      summary: item.summary || (language === "en" ? `Latest information from ${item.source}; the original source and publication time are preserved.` : `来自${item.source}的最新信息，原始来源与发布时间已保留。`),
      whyItMatters: (language === "en" ? WHY_IT_MATTERS_EN : WHY_IT_MATTERS)[category](assets.join(language === "en" ? ", " : "、")),
      riskNote: riskNote(cluster, language),
      relatedAssets: assets,
      heat: Math.min(99, Math.round(52 + cluster.score * 0.65)),
      confidence: item.sourceType === "官方" ? "官方确认" : cluster.items.length > 1 ? "多源一致" : "单一来源",
      sources,
      publishedAt: item.publishedAt,
    };
  });
}
