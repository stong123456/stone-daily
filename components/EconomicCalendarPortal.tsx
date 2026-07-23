"use client";

import {
  ArrowClockwise,
  ArrowSquareOut,
  CalendarCheck,
  CheckCircle,
  ClockCountdown,
  Funnel,
  Info,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { fallbackEconomicEvents } from "@/data/economicCalendar";
import type { EconomicCalendarSnapshot, EconomicEvent } from "@/types/market";

type RangeFilter = "今天" | "明天" | "本周" | "下周" | "全部";
type RegionFilter = "全球" | "美国" | "中国" | "欧元区" | "日本";
type ImportanceFilter = "全部" | "中高影响" | "高影响";

const ranges: RangeFilter[] = ["今天", "明天", "本周", "下周", "全部"];
const regions: RegionFilter[] = ["全球", "美国", "中国", "欧元区", "日本"];
const importances: ImportanceFilter[] = ["全部", "中高影响", "高影响"];

const chinaDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function chinaDaySerial(value: Date) {
  const parts = Object.fromEntries(
    chinaDayFormatter.formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day) / 86_400_000;
}

function inRange(event: EconomicEvent, range: RangeFilter, now: Date) {
  if (range === "全部") return true;
  const today = chinaDaySerial(now);
  const eventDay = chinaDaySerial(new Date(event.scheduledAt));
  const diff = eventDay - today;
  if (range === "今天") return diff === 0;
  if (range === "明天") return diff === 1;
  const weekday = (new Date(today * 86_400_000).getUTCDay() + 6) % 7;
  const remainingThisWeek = 6 - weekday;
  if (range === "本周") return diff >= 0 && diff <= remainingThisWeek;
  return diff > remainingThisWeek && diff <= remainingThisWeek + 7;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function countdown(value: string) {
  const minutes = Math.max(0, Math.floor((Date.parse(value) - Date.now()) / 60_000));
  if (minutes < 60) return `${minutes} 分钟后`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时后`;
  return `${Math.floor(hours / 24)} 天后`;
}

export function EconomicCalendarPortal() {
  const [snapshot, setSnapshot] = useState<EconomicCalendarSnapshot | null>(null);
  const [range, setRange] = useState<RangeFilter>("本周");
  const [region, setRegion] = useState<RegionFilter>("全球");
  const [importance, setImportance] = useState<ImportanceFilter>("中高影响");
  const [loadFailed, setLoadFailed] = useState(false);
  const [now] = useState(() => new Date());
  const events = snapshot?.events ?? fallbackEconomicEvents;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/economic-calendar", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("calendar unavailable");
        return response.json() as Promise<EconomicCalendarSnapshot>;
      })
      .then((data) => {
        setSnapshot(data);
        setLoadFailed(false);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") setLoadFailed(true);
      });
    return () => controller.abort();
  }, []);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (!inRange(event, range, now)) return false;
        if (region !== "全球" && event.countryName !== region) return false;
        if (importance === "高影响" && event.importance !== 3) return false;
        if (importance === "中高影响" && event.importance < 2) return false;
        return true;
      }),
    [events, importance, now, range, region],
  );
  const nextHighImpact = events.find((event) => event.importance === 3 && Date.parse(event.scheduledAt) > Date.now());
  const liveProviders = snapshot?.providers.filter((provider) => provider.status === "live").length ?? 0;

  return (
    <>
      <header className="page-header page-header--inline calendar-header">
        <div><span>Economic calendar</span><h1>财经日历</h1><p>把可能引发波动的宏观事件放到时间轴上，并区分高、中、低影响。时间统一显示为北京时间。</p></div>
        <div className="calendar-next-event">
          <ClockCountdown size={25} weight="duotone" />
          <div><span>下一项高影响事件</span><strong>{nextHighImpact?.event ?? "暂无"}</strong><small>{nextHighImpact ? `${formatDate(nextHighImpact.scheduledAt)} ${formatTime(nextHighImpact.scheduledAt)} · ${countdown(nextHighImpact.scheduledAt)}` : "等待官方日程更新"}</small></div>
        </div>
      </header>

      <section className="calendar-summary">
        <div><CalendarCheck size={23} weight="duotone" /><span><strong>{filteredEvents.length}</strong><small>当前筛选事件</small></span></div>
        <div><span className="calendar-stars" aria-label="高影响">●●●</span><span><strong>{events.filter((event) => event.importance === 3 && Date.parse(event.scheduledAt) >= Date.now()).length}</strong><small>未来高影响事件</small></span></div>
        <div className="calendar-feed-health">{snapshot ? <CheckCircle size={21} /> : <ArrowClockwise className="spin" size={21} />}<span><strong>{loadFailed ? "目录模式" : snapshot ? `${liveProviders} 个实时源` : "正在同步"}</strong><small>{snapshot ? `${snapshot.providers.length} 个官方/数据目录` : "连接官方日程"}</small></span></div>
      </section>

      <section className="calendar-workspace">
        <div className="calendar-toolbar">
          <div className="calendar-range" aria-label="日期范围">
            {ranges.map((item) => <button aria-pressed={range === item} key={item} onClick={() => setRange(item)} type="button">{item}</button>)}
          </div>
          <div className="calendar-selectors">
            <label><Funnel size={15} /><span>地区</span><select aria-label="筛选地区" onChange={(event) => setRegion(event.target.value as RegionFilter)} value={region}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>重要性</span><select aria-label="筛选重要性" onChange={(event) => setImportance(event.target.value as ImportanceFilter)} value={importance}>{importances.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
        </div>

        <div className="calendar-table">
          <div className="calendar-table__head"><span>北京时间</span><span>地区</span><span>事件</span><span>重要性</span><span>实际</span><span>预测</span><span>前值</span><span>来源</span></div>
          {filteredEvents.length > 0 ? filteredEvents.map((event) => (
            <article className="calendar-event" data-status={event.status} key={event.id}>
              <time dateTime={event.scheduledAt}><strong>{formatTime(event.scheduledAt)}</strong><small>{formatDate(event.scheduledAt)}</small></time>
              <span className="calendar-country" data-country={event.countryCode}><b>{event.countryCode}</b><small>{event.currency}</small></span>
              <div className="calendar-event__title"><strong>{event.event}</strong><small>{event.countryName} · {event.status === "released" ? "已公布/待更新数值" : event.status === "tentative" ? "时间待定" : "计划公布"}</small></div>
              <span className="calendar-importance" data-level={event.importance} aria-label={`${event.importance} 级影响`}>{Array.from({ length: 3 }, (_, index) => <i data-active={index < event.importance} key={index} />)}</span>
              <span data-label="实际">{event.actual ?? "—"}</span>
              <span data-label="预测">{event.forecast ?? "—"}</span>
              <span data-label="前值">{event.previous ?? "—"}</span>
              <a href={event.sourceUrl} rel="noreferrer" target="_blank">{event.sourceName}<ArrowSquareOut size={13} /></a>
            </article>
          )) : (
            <div className="calendar-empty"><CalendarCheck size={27} weight="duotone" /><strong>当前筛选没有事件</strong><span>可以切换到“全部”或放宽地区与重要性。</span></div>
          )}
        </div>
      </section>

      <section className="calendar-source-note">
        <Info size={20} weight="duotone" />
        <div><strong>数据说明</strong><p>页面结构参考 Investing.com 的时间、地区、事件、重要性、实际/预测/前值列；日程优先来自 BLS、美联储、欧洲央行和 BEA。部分官方源受访问限制时会回退到已核对目录，并明确显示模式。</p></div>
        <div className="calendar-provider-list">
          {(snapshot?.providers ?? []).map((provider) => <a href={provider.url} key={provider.name} rel="noreferrer" target="_blank"><span data-status={provider.status} />{provider.name}<small>{provider.eventCount}</small></a>)}
        </div>
      </section>
    </>
  );
}
