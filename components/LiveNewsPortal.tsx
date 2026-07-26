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
import { NewsTickerTape } from "@/components/NewsTickerTape";
import type { EditorialFeedCategory, EditorialFeedSnapshot } from "@/types/market";

const PAGE_SIZE = 10;
const categories: Array<"全部" | EditorialFeedCategory> = ["全部", "全球", "宏观", "监管", "币股", "币圈", "科技"];

function formatChinaTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatChinaDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
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
        <div><span>Live market wire</span><h1>7×24 市场快讯</h1><p>独立时间流持续汇总中文财经、央行、监管机构、加密媒体与交易所信息，时间统一为北京时间。</p></div>
        <button className="button button--secondary" disabled={!snapshot && !loadFailed} onClick={() => setRefreshKey((value) => value + 1)} type="button"><ArrowClockwise className={!snapshot && !loadFailed ? "spin" : ""} size={18} />立即刷新</button>
      </header>

      <NewsTickerTape items={snapshot?.items ?? []} />

      <section className="live-wire-summary">
        <div><Broadcast size={22} weight="duotone" /><span><strong>{snapshot?.items.length ?? "—"}</strong><small>本轮快讯</small></span></div>
        <div><CheckCircle size={22} weight="duotone" /><span><strong>{snapshot ? `${liveProviders}/${snapshot.providers.length}` : "—"}</strong><small>信息源在线</small></span></div>
        <div><ArrowClockwise size={22} weight="duotone" /><span><strong>{snapshot ? formatChinaTime(snapshot.updatedAt) : "连接中"}</strong><small>最近同步</small></span></div>
      </section>

      <section className="live-news-workspace">
        <div className="live-news-toolbar">
          <div className="category-filter" aria-label="快讯分类">
            {categories.map((item) => <button aria-pressed={category === item} key={item} onClick={() => changeCategory(item)} type="button">{item}</button>)}
          </div>
          <label><Funnel size={15} /><span>来源</span><select aria-label="筛选信息源" onChange={(event) => { setSource(event.target.value); setPage(1); }} value={source}>{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        {pageItems.length > 0 ? (
          <div className="live-news-feed live-news-feed--standalone">
            {pageItems.map((item) => (
              <article className="live-news-item" data-urgency={item.urgency} key={item.id}>
                <time dateTime={item.publishedAt}>{formatChinaTime(item.publishedAt)}</time>
                <div>
                  <div className="live-news-item__meta">
                    <span>{item.source}</span>
                    <span>{item.sourceType}</span>
                    <span>{item.category}</span>
                    {item.urgency !== "常规" ? <strong>{item.urgency}</strong> : null}
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
            <strong>{loadFailed ? "实时信息源暂时不可用" : snapshot ? "当前筛选没有快讯" : "正在汇总最新快讯"}</strong>
            <span>{loadFailed ? "页面会自动重试，稍后也可以点击刷新。" : "可以切换分类或信息来源。"}</span>
          </div>
        )}

        <footer className="live-pagination">
          <span>{filteredItems.length > 0 ? `第 ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredItems.length)} 条，共 ${filteredItems.length} 条` : "暂无结果"}</span>
          <div><button aria-label="上一页" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button"><ArrowLeft size={16} /></button><strong>{safePage} / {pageCount}</strong><button aria-label="下一页" disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button"><ArrowRight size={16} /></button></div>
        </footer>
      </section>

      <section className="live-provider-strip">
        <div><strong>信息源状态</strong><span>{latestItem ? `最近一条：${formatChinaDateTime(latestItem.publishedAt)}` : "等待首轮同步"}</span></div>
        <div>{(snapshot?.providers ?? []).map((provider) => <a href={provider.url} key={provider.name} rel="noreferrer" target="_blank"><i data-status={provider.status} /><span>{provider.name}</span><small>{provider.status === "live" ? `${provider.itemCount} 条` : "暂不可用"}</small></a>)}</div>
      </section>
    </>
  );
}
