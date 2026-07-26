import type { HistoryEvent, HistoryTodaySnapshot } from "@/types/market";

type WikiPage = {
  titles?: { normalized?: string; display?: string };
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
};

type WikiEvent = {
  year?: number;
  text?: string;
  pages?: WikiPage[];
};

type WikiFeedResponse = {
  events?: WikiEvent[];
};

type BaikeHistoryResponse = {
  status?: number;
  data?: Array<{
    title?: string;
    year?: string;
    date?: string;
    desc?: string;
    type?: string;
    link?: string;
  }>;
};

type XxHistoryResponse = {
  code?: number;
  data?: string[];
};

const FINANCE_TERMS = /经济|金融|银行|货币|汇率|证券|交易所|股票|股市|债券|基金|央行|利率|通胀|公司|企业|商业|贸易|关税|石油|黄金|美元|人民币|欧元|危机|互联网|科技|计算机|芯片|人工智能|比特币|加密|区块链|监管|法案|条约|制裁/i;
const SECONDARY_TERMS = /战争|革命|独立|政府|总统|国家|国际|能源|航运|铁路|航空|卫星|通信|发射|发现/i;

const CATEGORY_GUIDANCE = {
  宏观: {
    why: "这类制度、经济或国际关系变化，往往会通过增长预期、资金成本和风险偏好影响后续市场。",
    lesson: "先理解当时改变了什么规则和约束，再判断它与今天的市场是否真的可比。",
  },
  监管: {
    why: "法律与监管节点会改变参与者的权利、成本和风险边界，影响通常比单日价格更持久。",
    lesson: "看到新产品或新叙事时，同时确认谁负责监管、规则如何执行以及风险由谁承担。",
  },
  币股: {
    why: "公司、证券与交易制度的历史变化，是理解今天币股定价、流动性和投资者权利的背景。",
    lesson: "产品名字相似不代表权利相同，应同时核对底层资产、发行结构和交易场所。",
  },
  币圈: {
    why: "互联网、密码学与数字资产的重要节点，会改变加密市场的基础设施、参与方式和风险结构。",
    lesson: "技术突破与资产价格不是同一件事，先确认真实采用和安全边界。",
  },
  科技: {
    why: "技术与基础设施节点会重塑生产效率和商业模式，但市场通常会提前交易尚未兑现的预期。",
    lesson: "区分技术里程碑、商业化进度和价格叙事，不把三者自动画上等号。",
  },
} as const;

function beijingDateParts(value = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function decodeEntities(value: string) {
  const map: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"" };
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, key: string) => map[key.toLowerCase()] ?? entity);
}

function plainText(value: string) {
  return decodeEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function classifyEvent(text: string): HistoryEvent["category"] {
  if (/证券|交易所|股票|股市|公司|企业|商业|上市|股份/i.test(text)) return "币股";
  if (/比特币|加密|区块链|密码学|数字货币/i.test(text)) return "币圈";
  if (/监管|法律|法案|条例|制裁|法院|条约/i.test(text)) return "监管";
  if (/互联网|科技|计算机|芯片|人工智能|卫星|通信|发射|发明/i.test(text)) return "科技";
  return "宏观";
}

function relevanceScore(event: WikiEvent) {
  const text = `${event.text ?? ""} ${event.pages?.map((page) => page.titles?.normalized ?? "").join(" ") ?? ""}`;
  return (FINANCE_TERMS.test(text) ? 30 : 0) + (SECONDARY_TERMS.test(text) ? 10 : 0) + Math.min(6, event.pages?.length ?? 0);
}

function eventTitle(event: WikiEvent, text: string) {
  const pageTitle = event.pages?.find((page) => page.titles?.normalized)?.titles?.normalized;
  if (pageTitle && !/^\d+年$/.test(pageTitle)) return pageTitle;
  const withoutYear = text.replace(/^\s*\d{1,4}年[：:，,、\s-]*/, "");
  return withoutYear.length > 42 ? `${withoutYear.slice(0, 42).trim()}…` : withoutYear;
}

function eventUrl(event: WikiEvent, month: number, day: number) {
  return event.pages?.find((page) => page.content_urls?.desktop?.page)?.content_urls?.desktop?.page
    ?? `https://zh.wikipedia.org/wiki/${month}%E6%9C%88${day}%E6%97%A5`;
}

function normalizeEvents(events: WikiEvent[], month: number, day: number) {
  const ranked = [...events]
    .filter((event) => event.year && event.text)
    .sort((left, right) => relevanceScore(right) - relevanceScore(left));
  const relevant = ranked.filter((event) => relevanceScore(event) >= 30);
  const selected = (relevant.length >= 3 ? relevant : ranked).slice(0, 4);

  return selected.map((event, index): HistoryEvent => {
    const text = plainText(event.text ?? "");
    const category = classifyEvent(text);
    return {
      id: `wiki-${month}-${day}-${event.year}-${index}`,
      year: event.year ?? 0,
      category,
      title: eventTitle(event, text),
      summary: text,
      whyItMatters: CATEGORY_GUIDANCE[category].why,
      lesson: CATEGORY_GUIDANCE[category].lesson,
      sourceName: "中文维基百科",
      sourceUrl: eventUrl(event, month, day),
    };
  });
}

function normalizeStructuredEvents(
  events: Array<{ year: number; title: string; description: string; url: string }>,
  month: number,
  day: number,
  sourceName: string,
) {
  const ranked = [...events]
    .filter((event) => event.year && event.title)
    .sort((left, right) => {
      const leftScore = (FINANCE_TERMS.test(`${left.title} ${left.description}`) ? 30 : 0) + (SECONDARY_TERMS.test(`${left.title} ${left.description}`) ? 10 : 0);
      const rightScore = (FINANCE_TERMS.test(`${right.title} ${right.description}`) ? 30 : 0) + (SECONDARY_TERMS.test(`${right.title} ${right.description}`) ? 10 : 0);
      return rightScore - leftScore;
    });
  const relevant = ranked.filter((event) => FINANCE_TERMS.test(`${event.title} ${event.description}`));
  const selected = (relevant.length >= 3 ? relevant : ranked).slice(0, 4);

  return selected.map((event, index): HistoryEvent => {
    const category = classifyEvent(`${event.title} ${event.description}`);
    return {
      id: `history-${month}-${day}-${event.year}-${index}`,
      year: event.year,
      category,
      title: event.title,
      summary: event.description || event.title,
      whyItMatters: CATEGORY_GUIDANCE[category].why,
      lesson: CATEGORY_GUIDANCE[category].lesson,
      sourceName,
      sourceUrl: event.url,
    };
  });
}

function mergeHistoryEvents(groups: HistoryEvent[][]) {
  const seen = new Set<string>();
  const ranked = groups.flat()
    .filter((event) => {
      const key = event.title.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const leftText = `${left.title} ${left.summary}`;
      const rightText = `${right.title} ${right.summary}`;
      const leftScore = (FINANCE_TERMS.test(leftText) ? 30 : 0) + (SECONDARY_TERMS.test(leftText) ? 10 : 0);
      const rightScore = (FINANCE_TERMS.test(rightText) ? 30 : 0) + (SECONDARY_TERMS.test(rightText) ? 10 : 0);
      return rightScore - leftScore;
    });
  const relevant = ranked.filter((event) => FINANCE_TERMS.test(`${event.title} ${event.summary}`));
  return (relevant.length >= 3 ? relevant : ranked).slice(0, 4);
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Api-User-Agent": "StoneDaily/1.0 (https://stonedaily.xyz; public market education portal)",
      "User-Agent": "StoneDaily/1.0 (+https://stonedaily.xyz)",
    },
    signal: AbortSignal.timeout(7_000),
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json() as Promise<T>;
}

async function loadFeed(month: number, day: number) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const payload = await fetchJson<WikiFeedResponse>(`https://zh.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`);
  return normalizeEvents(payload.events ?? [], month, day);
}

async function loadBaikeHistory(month: number, day: number) {
  const payload = await fetchJson<BaikeHistoryResponse>("https://baike.deno.dev/today_in_history");
  const expectedDate = `${month}-${day}`;
  const entries = (payload.data ?? [])
    .filter((item) => item.date === expectedDate)
    .flatMap((item) => {
      const year = Number(item.year);
      if (!year || !item.title) return [];
      return [{
        year,
        title: plainText(item.title),
        description: plainText(item.desc || item.title),
        url: item.link || "https://baike.baidu.com/calendar",
      }];
    });
  return normalizeStructuredEvents(entries, month, day, "百度百科");
}

async function loadXxHistory(month: number, day: number) {
  const payload = await fetchJson<XxHistoryResponse>("https://v2.xxapi.cn/api/history");
  const entries = (payload.data ?? []).flatMap((item) => {
    const match = item.match(/^(\d{3,4})年(\d{2})月(\d{2})日\s*(.+)$/);
    if (!match || Number(match[2]) !== month || Number(match[3]) !== day) return [];
    return [{
      year: Number(match[1]),
      title: plainText(match[4]),
      description: plainText(match[4]),
      url: "https://xxapi.cn/doc/history",
    }];
  });
  return normalizeStructuredEvents(entries, month, day, "免费 API 历史档案");
}

async function loadDatePage(month: number, day: number) {
  const title = `${month}月${day}日`;
  const query = new URLSearchParams({ action: "parse", page: title, prop: "text", format: "json", origin: "*" });
  const payload = await fetchJson<{ parse?: { text?: { "*"?: string } } }>(`https://zh.wikipedia.org/w/api.php?${query}`);
  const html = payload.parse?.text?.["*"] ?? "";
  const rows = [...html.matchAll(/<li>([\s\S]*?)<\/li>/gi)].flatMap((match): WikiEvent[] => {
    const text = plainText(match[1]);
    const year = Number(text.match(/(?:^|\s)(\d{3,4})年/)?.[1]);
    if (!year || text.length < 12) return [];
    const href = match[1].match(/href=["']([^"'#]+)["']/i)?.[1];
    const url = href ? new URL(href, "https://zh.wikipedia.org").toString() : undefined;
    return [{ year, text, pages: url ? [{ content_urls: { desktop: { page: url } } }] : [] }];
  });
  return normalizeEvents(rows, month, day);
}

export async function collectHistoryToday(): Promise<HistoryTodaySnapshot> {
  const { dateKey, month, day } = beijingDateParts();
  const pageUrl = `https://zh.wikipedia.org/wiki/${month}%E6%9C%88${day}%E6%97%A5`;
  const chineseResults = await Promise.allSettled([loadBaikeHistory(month, day), loadXxHistory(month, day)]);
  const chineseGroups = chineseResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const chineseEvents = mergeHistoryEvents(chineseGroups);
  if (chineseEvents.length > 0) {
    const bothLive = chineseGroups.length === chineseResults.length;
    return {
      dateKey,
      month,
      day,
      events: chineseEvents,
      provider: {
        name: bothLive ? "百度百科 + 中文历史档案" : chineseResults[0].status === "fulfilled" ? "百度百科历史档案" : "中文历史档案备用源",
        status: bothLive ? "live" : "fallback",
        url: bothLive || chineseResults[0].status === "fulfilled" ? "https://baike.deno.dev/today_in_history" : "https://xxapi.cn/doc/history",
      },
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    const events = await loadFeed(month, day);
    if (events.length === 0) throw new Error("empty feed");
    return {
      dateKey,
      month,
      day,
      events,
      provider: { name: "中文维基百科历史档案", status: "fallback", url: pageUrl },
      updatedAt: new Date().toISOString(),
    };
  } catch {
    try {
      const events = await loadDatePage(month, day);
      if (events.length === 0) throw new Error("empty date page");
      return {
        dateKey,
        month,
        day,
        events,
        provider: { name: "中文维基百科日期页", status: "fallback", url: pageUrl },
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return {
        dateKey,
        month,
        day,
        events: [],
        provider: { name: "历史档案聚合", status: "unavailable", url: pageUrl },
        updatedAt: new Date().toISOString(),
      };
    }
  }
}
