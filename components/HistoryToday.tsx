"use client";

import {
  ArrowClockwise,
  ArrowSquareOut,
  CalendarDots,
  CheckCircle,
  ClockCounterClockwise,
  Lightbulb,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import type { HistoryEvent, HistoryTodaySnapshot } from "@/types/market";

const THREADS: Record<HistoryEvent["category"], { title: string; description: string }> = {
  宏观: { title: "制度与国际环境，会在多年后继续影响市场", description: "把今天放进更长的时间轴，理解规则、增长与风险偏好如何彼此传导。" },
  监管: { title: "规则变化，往往比一天的涨跌影响更久", description: "监管节点会重新划定参与者的权利、成本和风险边界。" },
  币股: { title: "交易工具会变化，底层权利始终需要看清", description: "从公司与证券市场历史中，理解今天币股产品的结构差异。" },
  币圈: { title: "技术突破与资产价格，从来不是同一件事", description: "回看数字技术节点，同时观察采用、安全与投机如何分化。" },
  科技: { title: "技术改变生产方式，市场则提前交易未来", description: "历史能帮助我们区分真实进步、商业化进度与价格叙事。" },
};
const THREADS_EN: Record<HistoryEvent["category"], { title: string; description: string }> = {
  宏观: { title: "Institutions and the global backdrop can shape markets for decades", description: "Place today on a longer timeline to see how rules, growth and risk appetite transmit into one another." },
  监管: { title: "Rule changes often matter longer than one day's price move", description: "Regulatory turning points redraw participant rights, costs and risk boundaries." },
  币股: { title: "Trading tools change; underlying rights still need inspection", description: "Company and securities history helps explain structural differences in today's tokenized-stock products." },
  币圈: { title: "Technology breakthroughs and asset prices are not the same thing", description: "Revisit digital milestones while separating adoption, security and speculation." },
  科技: { title: "Technology changes production; markets price the future early", description: "History helps separate real progress, commercial delivery and price narratives." },
};
const categoryLabels: Record<HistoryEvent["category"], string> = { 宏观: "Macro", 监管: "Regulation", 币股: "Tokenized stocks", 币圈: "Crypto", 科技: "Technology" };

function currentChinaDate() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "numeric",
      day: "numeric",
    }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return { month: Number(parts.month), day: Number(parts.day) };
}

export function HistoryToday() {
  const { language } = useAppState();
  const en = language === "en";
  const [snapshot, setSnapshot] = useState<HistoryTodaySnapshot | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fallbackDate = currentChinaDate();

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshKey((value) => value + 1), 3_600_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/history-today", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("history today unavailable");
        return response.json() as Promise<HistoryTodaySnapshot>;
      })
      .then((data) => {
        setSnapshot(data);
        setLoadFailed(data.events.length === 0);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") setLoadFailed(true);
      });
    return () => controller.abort();
  }, [refreshKey]);

  const events = snapshot?.events ?? [];
  const date = snapshot ?? fallbackDate;
  const commonThread = useMemo(() => {
    const counts = new Map<HistoryEvent["category"], number>();
    events.forEach((event) => counts.set(event.category, (counts.get(event.category) ?? 0) + 1));
    const dominant = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "宏观";
    return (language === "en" ? THREADS_EN : THREADS)[dominant];
  }, [events, language]);

  return (
    <>
      <header className="page-header page-header--inline editorial-header">
        <div><span>Market memory</span><h1>{en ? "On This Day" : "历史上的今天"}</h1><p>{en ? "Updated automatically for the current Beijing month and day, using traceable archives as reference points for understanding today." : "页面按北京时间的月日自动更新，从可追溯档案里寻找理解今天的参照物。"}</p></div>
        <div className="today-date-card"><CalendarDots size={25} weight="duotone" /><div><strong>{en ? `${date.month}/${date.day}` : `${date.month} 月 ${date.day} 日`}</strong><span>{snapshot ? `${events.length} ${en ? "historical events" : "个历史节点"}` : (en ? "Reading today's archives" : "正在读取今日档案")}</span></div></div>
      </header>

      <section className="history-lesson-hero">
        <ClockCounterClockwise size={28} weight="duotone" />
        <div><span>{en ? "A common thread" : "今日共同线索"}</span><h2>{commonThread.title}</h2><p>{commonThread.description}</p></div>
      </section>

      {events.length > 0 ? (
        <section className="market-history-timeline">
          {events.map((event) => (
            <article className="market-history-event" key={event.id}>
              <div className="market-history-event__year"><strong>{event.year}</strong><span>{en ? categoryLabels[event.category] : event.category}</span></div>
              <div className="market-history-event__content">
                <h2>{event.title}</h2>
                <p>{event.summary}</p>
                <div className="history-event-grid"><div><strong>{en ? "Why it matters" : "为什么重要"}</strong><span>{event.whyItMatters}</span></div><div><Lightbulb size={18} /><strong>{en ? "A reminder for today" : "给今天的提醒"}</strong><span>{event.lesson}</span></div></div>
                <a href={event.sourceUrl} rel="noreferrer" target="_blank">{en ? "View original archive" : "查看原始档案"} · {event.sourceName}<ArrowSquareOut size={14} /></a>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="history-today-empty">
          <ArrowClockwise className={loadFailed ? "" : "spin"} size={25} />
          <strong>{loadFailed ? (en ? "Today's archive sources are temporarily unavailable" : "今日档案源暂时不可用") : (en ? "Organizing today's historical events" : "正在整理今天的历史节点")}</strong>
          <span>{loadFailed ? (en ? "The page retries hourly. You can also refresh later." : "页面会每小时自动重试，也可以稍后刷新页面。") : (en ? "Filtering for financial, regulatory and technology relevance." : "正在按金融、监管和科技相关度筛选。")}</span>
          {loadFailed ? <button className="button button--secondary" onClick={() => setRefreshKey((value) => value + 1)} type="button">{en ? "Try again" : "重新读取"}</button> : null}
        </section>
      )}

      <section className="history-method">
        {snapshot?.provider.status === "live" ? <CheckCircle size={23} weight="duotone" /> : <ShieldCheck size={23} weight="duotone" />}
        <div><strong>{en ? "Editorial standard & source status" : "内容标准与来源状态"}</strong><p>{en ? `Public Chinese encyclopedias and archives are read for today's month and day, then ranked for financial, regulatory, technology and international relevance. Original links are preserved; historical analogy is not treated as a forecast.${snapshot ? ` Current source: ${snapshot.provider.name}.` : ""}` : `按当天月日读取公开中文百科与历史档案，再按金融、监管、科技与国际影响排序；保留原文链接，不把历史机械套用到今天。${snapshot ? ` 当前来源：${snapshot.provider.name}。` : ""}`}</p></div>
      </section>
    </>
  );
}
