import type {
  EditorialFeedCategory,
  EditorialFeedItem,
  EditorialFeedSnapshot,
  EditorialSourceHealth,
} from "@/types/market";

type SourceDefinition = {
  name: string;
  type: EditorialSourceHealth["type"];
  url: string;
  category: EditorialFeedCategory;
  parser: "rss" | "sina" | "sec";
};

const SOURCES: SourceDefinition[] = [
  {
    name: "新浪财经 7×24",
    type: "媒体",
    url: "https://finance.sina.com.cn/7x24/",
    category: "全球",
    parser: "sina",
  },
  {
    name: "美联储",
    type: "官方",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    category: "宏观",
    parser: "rss",
  },
  {
    name: "欧洲央行",
    type: "官方",
    url: "https://www.ecb.europa.eu/rss/press.html",
    category: "宏观",
    parser: "rss",
  },
  {
    name: "日本央行",
    type: "官方",
    url: "https://www.boj.or.jp/en/rss/whatsnew.xml",
    category: "宏观",
    parser: "rss",
  },
  {
    name: "美国 SEC",
    type: "官方",
    url: "https://www.sec.gov/newsroom/press-releases",
    category: "监管",
    parser: "sec",
  },
  {
    name: "Cointelegraph",
    type: "媒体",
    url: "https://cointelegraph.com/rss",
    category: "币圈",
    parser: "rss",
  },
  {
    name: "Decrypt",
    type: "媒体",
    url: "https://decrypt.co/feed",
    category: "币圈",
    parser: "rss",
  },
  {
    name: "Kraken Blog",
    type: "交易所",
    url: "https://blog.kraken.com/feed",
    category: "币圈",
    parser: "rss",
  },
];

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\"",
};

const ASSET_PATTERNS: Array<[RegExp, string]> = [
  [/\bbitcoin\b|\bBTC\b/i, "BTC"],
  [/\bethereum\b|\bETH\b/i, "ETH"],
  [/\bsolana\b|\bSOL\b/i, "SOL"],
  [/\bXRP\b|\bripple\b/i, "XRP"],
  [/\bBNB\b|\bbinance\b/i, "BNB"],
  [/\bDOGE\b|\bdogecoin\b/i, "DOGE"],
  [/\bNVDA\b|\bnvidia\b/i, "NVDA"],
  [/\bTSLA\b|\btesla\b/i, "TSLA"],
  [/\bCOIN\b|\bcoinbase\b/i, "COIN"],
  [/\boil\b|\bWTI\b|原油|石油/i, "CL"],
  [/\bgold\b|黄金/i, "XAU"],
  [/\bS&P\b|\bSPY\b|标普/i, "SPY"],
];

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, key: string) => ENTITY_MAP[key.toLowerCase()] ?? entity);
}

function plainText(value = "") {
  return decodeEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function excerpt(value: string, limit = 180) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trim()}…`;
}

function tagValue(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? plainText(match[1]) : "";
}

function linkValue(block: string) {
  const tagLink = tagValue(block, "link");
  if (tagLink.startsWith("http")) return tagLink;
  const href = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
  return href ? decodeEntities(href) : "";
}

function stableId(source: string, value: string) {
  let hash = 2166136261;
  for (const character of `${source}:${value}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${source.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${(hash >>> 0).toString(36)}`;
}

function classifyCategory(text: string, fallback: EditorialFeedCategory): EditorialFeedCategory {
  if (/SEC|CFTC|regulat|lawsuit|enforcement|监管|处罚|立法|法院/i.test(text)) return "监管";
  if (/tokenized stock|xStocks|equity|stock|shares|美股|A股|港股|股票|上市公司/i.test(text)) return "币股";
  if (/bitcoin|ethereum|crypto|blockchain|token|stablecoin|DeFi|比特币|以太坊|加密|币圈/i.test(text)) return "币圈";
  if (/AI|chip|semiconductor|technology|人工智能|芯片|算力|科技/i.test(text)) return "科技";
  if (/rate|inflation|central bank|GDP|jobs|employment|央行|利率|通胀|就业|经济/i.test(text)) return "宏观";
  return fallback;
}

function relatedAssets(text: string) {
  return ASSET_PATTERNS.flatMap(([pattern, symbol]) => (pattern.test(text) ? [symbol] : [])).slice(0, 4);
}

function urgency(text: string): EditorialFeedItem["urgency"] {
  if (/breaking|urgent|halts?|attack|explosion|emergency|突发|紧急|熔断|暂停|袭击|爆炸/i.test(text)) return "快讯";
  if (/rate decision|CPI|GDP|payroll|approval|lawsuit|ETF|利率决议|非农|通胀|获批|起诉/i.test(text)) return "重要";
  return "常规";
}

function normalizeDate(value: string, fallback = new Date().toISOString()) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function makeItem(
  source: SourceDefinition,
  title: string,
  summary: string,
  url: string,
  publishedAt: string,
): EditorialFeedItem | null {
  const cleanTitle = excerpt(plainText(title), 220);
  if (!cleanTitle || !url.startsWith("http")) return null;
  const cleanSummary = excerpt(plainText(summary || cleanTitle));
  const combined = `${cleanTitle} ${cleanSummary}`;
  return {
    id: stableId(source.name, `${url}:${cleanTitle}`),
    source: source.name,
    sourceType: source.type,
    category: classifyCategory(combined, source.category),
    title: cleanTitle,
    summary: cleanSummary === cleanTitle ? "" : cleanSummary,
    url,
    publishedAt: normalizeDate(publishedAt),
    relatedAssets: relatedAssets(combined),
    urgency: urgency(combined),
  };
}

function parseRss(source: SourceDefinition, xml: string) {
  const blocks = [
    ...(xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []),
    ...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []),
  ];

  return blocks.slice(0, 12).flatMap((block) => {
    const title = tagValue(block, "title");
    const summary =
      tagValue(block, "description") ||
      tagValue(block, "summary") ||
      tagValue(block, "content:encoded") ||
      tagValue(block, "content");
    const url = linkValue(block);
    const date =
      tagValue(block, "pubDate") ||
      tagValue(block, "published") ||
      tagValue(block, "updated") ||
      tagValue(block, "dc:date");
    const item = makeItem(source, title, summary, url, date);
    return item ? [item] : [];
  });
}

function parseSina(source: SourceDefinition, html: string) {
  const pattern =
    /<div\s+newsdata-id=["']([^"']+)["']\s+newsdata-time=["'](\d{8})["']>\s*<div>(\d{2}:\d{2}:\d{2})<\/div>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  return [...html.matchAll(pattern)].slice(0, 18).flatMap((match) => {
    const [, id, day, time, url, body] = match;
    const iso = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T${time}+08:00`;
    const title = plainText(body);
    const item = makeItem(source, title, title, url, iso);
    if (!item) return [];
    return [{ ...item, id: `sina-${id}` }];
  });
}

function parseSec(source: SourceDefinition, html: string) {
  const links = [
    ...html.matchAll(
      /<a[^>]+href=["']([^"']*\/newsroom\/press-releases\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ];
  const seen = new Set<string>();
  return links.slice(0, 24).flatMap((match) => {
    const rawUrl = decodeEntities(match[1]);
    const url = rawUrl.startsWith("http") ? rawUrl : `https://www.sec.gov${rawUrl}`;
    if (seen.has(url)) return [];
    seen.add(url);
    const title = plainText(match[2]);
    const item = makeItem(source, title, title, url, new Date().toISOString());
    return item ? [item] : [];
  });
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "StoneDaily/1.0 (+https://stonedaily.xyz)",
    },
    signal: AbortSignal.timeout(7_000),
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.text();
}

async function loadSource(source: SourceDefinition) {
  const body = await fetchText(source.url);
  if (source.parser === "sina") return parseSina(source, body);
  if (source.parser === "sec") return parseSec(source, body);
  return parseRss(source, body);
}

export async function collectEditorialFeed(): Promise<EditorialFeedSnapshot> {
  const settled = await Promise.allSettled(SOURCES.map(async (source) => ({ source, items: await loadSource(source) })));
  const providers: EditorialSourceHealth[] = [];
  const allItems: EditorialFeedItem[] = [];

  settled.forEach((result, index) => {
    const source = SOURCES[index];
    if (result.status === "fulfilled") {
      providers.push({
        name: source.name,
        type: source.type,
        status: "live",
        itemCount: result.value.items.length,
        url: source.url,
      });
      allItems.push(...result.value.items);
      return;
    }
    providers.push({
      name: source.name,
      type: source.type,
      status: "unavailable",
      itemCount: 0,
      url: source.url,
    });
  });

  const deduped: EditorialFeedItem[] = [];
  const seen = new Set<string>();
  allItems
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .forEach((item) => {
      const key = item.title.toLowerCase().replace(/\W/g, "").slice(0, 80);
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });

  const liveProviders = providers.filter((provider) => provider.status === "live").length;
  return {
    items: deduped.slice(0, 42),
    providers,
    updatedAt: new Date().toISOString(),
    mode: liveProviders === 0 ? "fallback" : liveProviders === providers.length ? "live" : "partial",
  };
}
