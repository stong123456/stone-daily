import { fallbackEconomicEvents } from "@/data/economicCalendar";
import type {
  EconomicCalendarProvider,
  EconomicCalendarSnapshot,
  EconomicEvent,
  EconomicEventImportance,
} from "@/types/market";

type TradingEconomicsEvent = {
  CalendarId?: string;
  CalendarID?: string;
  Date?: string;
  Country?: string;
  Currency?: string;
  Event?: string;
  Importance?: number;
  Actual?: string;
  Forecast?: string;
  Previous?: string;
  Source?: string;
  SourceURL?: string;
  URL?: string;
};

const COUNTRY_CODES: Record<string, { code: string; currency: string; name: string }> = {
  "United States": { code: "US", currency: "USD", name: "美国" },
  China: { code: "CN", currency: "CNY", name: "中国" },
  "Euro Area": { code: "EU", currency: "EUR", name: "欧元区" },
  Japan: { code: "JP", currency: "JPY", name: "日本" },
  "United Kingdom": { code: "GB", currency: "GBP", name: "英国" },
  Australia: { code: "AU", currency: "AUD", name: "澳大利亚" },
  Canada: { code: "CA", currency: "CAD", name: "加拿大" },
  Switzerland: { code: "CH", currency: "CHF", name: "瑞士" },
};

const BLS_TRANSLATIONS: Record<string, string> = {
  "Consumer Price Index": "美国 CPI",
  "Employment Situation": "美国非农就业报告",
  "Job Openings and Labor Turnover Survey": "美国 JOLTS 职位空缺",
  "Producer Price Index": "美国 PPI",
  "Productivity and Costs (P)": "美国非农生产率与单位劳动力成本初值",
  "Productivity and Costs (R)": "美国非农生产率与单位劳动力成本修正值",
  "Real Earnings": "美国实际收入",
  "Employment Cost Index": "美国就业成本指数",
  "U.S. Import and Export Price Indexes": "美国进出口物价指数",
};

const HIGH_IMPACT = /Consumer Price Index|Employment Situation|Employment Cost Index/i;
const MEDIUM_IMPACT = /Producer Price Index|Job Openings|Productivity|Real Earnings|Import and Export/i;

function easternToUtc(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "00"] = match;
  const candidate = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(candidate)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  const represented = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return new Date(candidate - (represented - candidate)).toISOString();
}

function blsImportance(title: string): EconomicEventImportance {
  if (HIGH_IMPACT.test(title)) return 3;
  if (MEDIUM_IMPACT.test(title)) return 2;
  return 1;
}

function parseBlsCalendar(ics: string) {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  const now = Date.now();
  const min = now - 2 * 86_400_000;
  const max = now + 70 * 86_400_000;

  return blocks.flatMap((block): EconomicEvent[] => {
    const uid = block.match(/^UID:(.+)$/m)?.[1]?.trim();
    const dateValue = block.match(/^DTSTART(?:;TZID=US-Eastern)?:([0-9T]+)$/m)?.[1];
    const rawTitle = block.match(/^SUMMARY:(.+)$/m)?.[1]?.replace(/\\,/g, ",").trim();
    if (!uid || !dateValue || !rawTitle) return [];
    const scheduledAt = easternToUtc(dateValue);
    if (!scheduledAt) return [];
    const timestamp = Date.parse(scheduledAt);
    if (timestamp < min || timestamp > max) return [];
    return [{
      id: `bls-${uid}`,
      scheduledAt,
      countryCode: "US",
      countryName: "美国",
      currency: "USD",
      event: BLS_TRANSLATIONS[rawTitle] ?? rawTitle,
      importance: blsImportance(rawTitle),
      sourceName: "美国劳工统计局",
      sourceUrl: "https://www.bls.gov/schedule/news_release/bls.ics",
      status: timestamp <= now ? "released" : "scheduled",
    }];
  });
}

async function loadBlsCalendar() {
  const response = await fetch("https://www.bls.gov/schedule/news_release/bls.ics", {
    cache: "no-store",
    headers: {
      Accept: "text/calendar,*/*",
      "User-Agent": "StoneDaily/1.0 (+https://stonedaily.xyz)",
    },
    signal: AbortSignal.timeout(7_000),
  });
  if (!response.ok) throw new Error(`BLS ${response.status}`);
  const text = await response.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("BLS calendar payload unavailable");
  return parseBlsCalendar(text);
}

async function loadTradingEconomicsCalendar(apiKey: string) {
  const query = new URLSearchParams({
    c: apiKey,
    f: "json",
    importance: "2",
  });
  const response = await fetch(`https://api.tradingeconomics.com/calendar?${query}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Trading Economics ${response.status}`);
  const payload = (await response.json()) as TradingEconomicsEvent[];
  if (!Array.isArray(payload)) throw new Error("Trading Economics calendar payload unavailable");

  const now = Date.now();
  const min = now - 2 * 86_400_000;
  const max = now + 70 * 86_400_000;
  return payload.flatMap((item): EconomicEvent[] => {
    const scheduledAt = item.Date ? new Date(item.Date).toISOString() : "";
    const timestamp = Date.parse(scheduledAt);
    if (!item.Event || !Number.isFinite(timestamp) || timestamp < min || timestamp > max) return [];
    const country = COUNTRY_CODES[item.Country ?? ""] ?? {
      code: (item.Currency ?? "GL").slice(0, 2).toUpperCase(),
      currency: item.Currency ?? "",
      name: item.Country ?? "全球",
    };
    const detailsUrl = item.SourceURL || (item.URL ? `https://tradingeconomics.com${item.URL}` : "https://tradingeconomics.com/calendar");
    return [{
      id: `te-${item.CalendarID ?? item.CalendarId ?? `${country.code}-${timestamp}-${item.Event}`}`,
      scheduledAt,
      countryCode: country.code,
      countryName: country.name,
      currency: item.Currency || country.currency,
      event: item.Event,
      importance: Math.min(3, Math.max(1, item.Importance ?? 1)) as EconomicEventImportance,
      actual: item.Actual || undefined,
      forecast: item.Forecast || undefined,
      previous: item.Previous || undefined,
      sourceName: item.Source || "Trading Economics",
      sourceUrl: detailsUrl,
      status: timestamp <= now && item.Actual ? "released" : "scheduled",
    }];
  });
}

function mergeEvents(groups: EconomicEvent[][]) {
  const events = groups.flat().map((event) => ({
    ...event,
    status: Date.parse(event.scheduledAt) <= Date.now() && event.status === "scheduled" ? "released" as const : event.status,
  }));
  const seen = new Set<string>();
  return events
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
    .filter((event) => {
      const key = `${event.countryCode}:${event.event.toLowerCase().replace(/\W/g, "")}:${event.scheduledAt.slice(0, 10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function collectEconomicCalendar(): Promise<EconomicCalendarSnapshot> {
  const providers: EconomicCalendarProvider[] = [];
  const groups: EconomicEvent[][] = [fallbackEconomicEvents];

  const blsResult = await Promise.allSettled([loadBlsCalendar()]);
  if (blsResult[0].status === "fulfilled") {
    groups.unshift(blsResult[0].value);
    providers.push({
      name: "美国劳工统计局",
      status: "live",
      eventCount: blsResult[0].value.length,
      url: "https://www.bls.gov/schedule/news_release/bls.ics",
    });
  } else {
    providers.push({
      name: "美国劳工统计局",
      status: "catalog",
      eventCount: fallbackEconomicEvents.filter((event) => event.sourceName === "美国劳工统计局").length,
      url: "https://www.bls.gov/schedule/2026/home.htm",
    });
  }

  const apiKey = process.env.TRADING_ECONOMICS_API_KEY?.trim();
  if (apiKey) {
    try {
      const events = await loadTradingEconomicsCalendar(apiKey);
      groups.unshift(events);
      providers.push({
        name: "Trading Economics",
        status: "live",
        eventCount: events.length,
        url: "https://tradingeconomics.com/calendar",
      });
    } catch {
      providers.push({
        name: "Trading Economics",
        status: "unavailable",
        eventCount: 0,
        url: "https://tradingeconomics.com/calendar",
      });
    }
  }

  const catalogSources = [
    ["美联储", "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"],
    ["欧洲央行", "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html"],
    ["美国经济分析局", "https://www.bea.gov/news/schedule/"],
  ] as const;
  catalogSources.forEach(([name, url]) => {
    providers.push({
      name,
      status: "catalog",
      eventCount: fallbackEconomicEvents.filter((event) => event.sourceName === name).length,
      url,
    });
  });

  const liveCount = providers.filter((provider) => provider.status === "live").length;
  return {
    events: mergeEvents(groups),
    providers,
    updatedAt: new Date().toISOString(),
    mode: liveCount > 0 ? (liveCount === providers.length ? "live" : "partial") : "fallback",
  };
}
