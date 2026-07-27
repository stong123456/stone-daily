"use client";

import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  Broadcast,
  CheckCircle,
  Funnel,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import type { EditorialFeedCategory, EditorialFeedSnapshot } from "@/types/market";

const PAGE_SIZE = 10;
const categories: Array<"全部" | EditorialFeedCategory> = ["全部", "全球", "宏观", "监管", "币股", "币圈", "科技"];

const categoryLabels: Record<(typeof categories)[number], string> = { 全部: "All", 全球: "Global", 宏观: "Macro", 监管: "Regulation", 币股: "Tokenized stocks", 币圈: "Crypto", 科技: "Technology" };
const sourceTypeLabels: Record<string, string> = { 官方: "Official", 交易所: "Exchange", 媒体: "Media" };
const urgencyLabels: Record<string, string> = { 快讯: "Breaking", 重要: "Important", 常规: "Standard" };

function formatChinaTime(value: string, language: "zh" | "en") {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatChinaDateTime(value: string, language: "zh" | "en") {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function LiveNewsPortal() {
  const { language } = useAppState();
  const en = language === "en";
  const [snapshot, setSnapshot] = useState<EditorialFeedSnapshot | null>(null);
  const [category, setCategory] = useState<(typeof categories)[number]>("全部");
  const [source, setSource] = useState("全部来源");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshKey((value) => value + 1), 120_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/editorial", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("editorial feed unavailable");
        return response.json() as Promise<EditorialFeedSnapshot>;
      })
      .then((data) => {
        setSnapshot(data);
        setLoadFailed(false);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") setLoadFailed(true);
      });
    return () => controller.abort();
  }, [refreshKey]);

  const sources = useMemo(() => ["全部来源", ...new Set(snapshot?.items.map((item) => item.source) ?? [])], [snapshot]);
  const filteredItems = useMemo(
    () => (snapshot?.items ?? []).filter((item) => {
      if (category !== "全部" && item.category !== category) return false;
      if (source !== "全部来源" && item.source !== source) return false;
      return true;
    }),
    [category, snapshot, source],
  );
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const liveProviders = snapshot?.providers.filter((provider) => provider.status === "live").length ?? 0;
  const latestItem = snapshot?.items[0];

  const changeCategory = (value: (typeof categories)[number]) => {
    setCategory(value);
    setPage(1);
  };

  return (
    <>
      <header className="page-header page-header--inline editorial-header live-portal-header">
        <div><span>Live market wire</span><h1>{en ? "7×24 Market Wire" : "7×24 市场快讯"}</h1><p>{en ? "A standalone timeline combining Chinese financial wires, central banks, regulators, crypto media and exchanges. All times use Beijing time; story text remains in its original source language." : "独立时间流持续汇总中文财经、央行、监管机构、加密媒体与交易所信息，时间统一为北京时间。"}</p></div>
        <button className="button button--secondary" disabled={!snapshot && !loadFailed} onClick={() => setRefreshKey((value) => value + 1)} type="button"><ArrowClockwise className={!snapshot && !loadFailed ? "spin" : ""} size={18} />{en ? "Refresh now" : "立即刷新"}</button>
      </header>

      <section className="live-wire-summary">
        <div><Broadcast size={22} weight="duotone" /><span><strong>{snapshot?.items.length ?? "—"}</strong><small>{en ? "Stories this cycle" : "本轮快讯"}</small></span></div>
        <div><CheckCircle size={22} weight="duotone" /><span><strong>{snapshot ? `${liveProviders}/${snapshot.providers.length}` : "—"}</strong><small>{en ? "Sources live" : "信息源在线"}</small></span></div>
        <div><ArrowClockwise size={22} weight="duotone" /><span><strong>{snapshot ? formatChinaTime(snapshot.updatedAt, language) : (en ? "Connecting" : "连接中")}</strong><small>{en ? "Last sync" : "最近同步"}</small></span></div>
      </section>

      <section className="live-news-workspace">
        <div className="live-news-toolbar">
          <div className="category-filter" aria-label={en ? "Wire categories" : "快讯分类"}>
            {categories.map((item) => <button aria-pressed={category === item} key={item} onClick={() => changeCategory(item)} type="button">{en ? categoryLabels[item] : item}</button>)}
          </div>
          <label><Funnel size={15} /><span>{en ? "Source" : "来源"}</span><select aria-label={en ? "Filter sources" : "筛选信息源"} onChange={(event) => { setSource(event.target.value); setPage(1); }} value={source}>{sources.map((item) => <option key={item} value={item}>{en && item === "全部来源" ? "All sources" : item}</option>)}</select></label>
        </div>

        {pageItems.length > 0 ? (
          <div className="live-news-feed live-news-feed--standalone">
            {pageItems.map((item) => (
              <article className="live-news-item" data-urgency={item.urgency} key={item.id}>
                <time dateTime={item.publishedAt}>{formatChinaTime(item.publishedAt, language)}</time>
                <div>
                  <div className="live-news-item__meta">
                    <span>{item.source}</span>
                    <span>{en ? sourceTypeLabels[item.sourceType] : item.sourceType}</span>
                    <span>{en ? categoryLabels[item.category] : item.category}</span>
                    {item.urgency !== "常规" ? <strong>{en ? urgencyLabels[item.urgency] : item.urgency}</strong> : null}
                  </div>
                  <a href={item.url} rel="noreferrer" target="_blank">{item.title}<ArrowSquareOut size={14} /></a>
                  {item.summary ? <p>{item.summary}</p> : null}
                  {item.relatedAssets.length > 0 ? <div className="live-news-assets">{item.relatedAssets.map((asset) => <span key={asset}>{asset}</span>)}</div> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="live-news-empty">
            <ArrowClockwise className={loadFailed ? "" : "spin"} size={22} />
            <strong>{loadFailed ? (en ? "Live sources are temporarily unavailable" : "实时信息源暂时不可用") : snapshot ? (en ? "No stories match the current filters" : "当前筛选没有快讯") : (en ? "Collecting the latest stories" : "正在汇总最新快讯")}</strong>
            <span>{loadFailed ? (en ? "The page retries automatically; you can also refresh shortly." : "页面会自动重试，稍后也可以点击刷新。") : (en ? "Change the category or source filter." : "可以切换分类或信息来源。")}</span>
          </div>
        )}

        <footer className="live-pagination">
          <span>{filteredItems.length > 0 ? (en ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredItems.length)} of ${filteredItems.length}` : `第 ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredItems.length)} 条，共 ${filteredItems.length} 条`) : (en ? "No results" : "暂无结果")}</span>
          <div><button aria-label={en ? "Previous page" : "上一页"} disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button"><ArrowLeft size={16} /></button><strong>{safePage} / {pageCount}</strong><button aria-label={en ? "Next page" : "下一页"} disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button"><ArrowRight size={16} /></button></div>
        </footer>
      </section>

      <section className="live-provider-strip">
        <div><strong>{en ? "Source status" : "信息源状态"}</strong><span>{latestItem ? (en ? `Latest: ${formatChinaDateTime(latestItem.publishedAt, language)}` : `最近一条：${formatChinaDateTime(latestItem.publishedAt, language)}`) : (en ? "Waiting for first sync" : "等待首轮同步")}</span></div>
        <div>{(snapshot?.providers ?? []).map((provider) => <a href={provider.url} key={provider.name} rel="noreferrer" target="_blank"><i data-status={provider.status} /><span>{provider.name}</span><small>{provider.status === "live" ? `${provider.itemCount} ${en ? "items" : "条"}` : (en ? "Unavailable" : "暂不可用")}</small></a>)}</div>
      </section>
    </>
  );
}
