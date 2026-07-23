"use client";

import {
  ArrowClockwise,
  ArrowSquareOut,
  Broadcast,
  CheckCircle,
  Copy,
  Fire,
  ShareNetwork,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { dailyHotspots } from "@/data/editorial";
import type { EditorialFeedSnapshot, HotspotCategory } from "@/types/market";

const categories: Array<"全部" | HotspotCategory> = ["全部", "宏观", "币股", "币圈", "科技", "监管"];

function formatChinaDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatChinaTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function HotspotsPortal() {
  const [category, setCategory] = useState<(typeof categories)[number]>("全部");
  const [copied, setCopied] = useState(false);
  const [snapshot, setSnapshot] = useState<EditorialFeedSnapshot | null>(null);
  const [feedError, setFeedError] = useState(false);
  const todayLabel = formatChinaDate(new Date());

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/editorial", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("editorial feed unavailable");
        return response.json() as Promise<EditorialFeedSnapshot>;
      })
      .then((data) => {
        setSnapshot(data);
        setFeedError(false);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") setFeedError(true);
      });
    return () => controller.abort();
  }, []);

  const hotspots = useMemo(
    () => category === "全部" ? dailyHotspots : dailyHotspots.filter((item) => item.category === category),
    [category],
  );
  const liveItems = useMemo(
    () =>
      (snapshot?.items ?? [])
        .filter((item) => category === "全部" || item.category === category || item.category === "全球")
        .slice(0, 16),
    [category, snapshot],
  );
  const liveProviders = snapshot?.providers.filter((provider) => provider.status === "live").length ?? 0;
  const pulseScore = Math.min(
    100,
    58 + (snapshot?.items.filter((item) => item.urgency !== "常规").length ?? 0) * 3,
  );
  const shareText = useMemo(() => {
    const titles = liveItems.length > 0
      ? liveItems.slice(0, 3).map((item) => item.title)
      : dailyHotspots.slice(0, 3).map((item) => item.title);
    return `Stone Daily 每日热点｜${todayLabel}\n${titles.map((title, index) => `${index + 1}. ${title}`).join("\n")}\n\n来源已保留，事实与推测分开。仅作信息整理，不构成投资建议。`;
  }, [liveItems, todayLabel]);

  const copyDigest = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <header className="page-header page-header--inline editorial-header">
        <div><span>Daily pulse</span><h1>每日热点</h1><p>编辑精选负责解释主线，7×24 信息流负责补齐变化；每条内容都保留原始来源。</p></div>
        <div className="editorial-actions">
          <button className="button button--secondary" onClick={copyDigest} type="button">{copied ? <CheckCircle size={18} /> : <Copy size={18} />}{copied ? "已复制" : "复制今日摘要"}</button>
          <a className="button button--primary" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} rel="noreferrer" target="_blank"><ShareNetwork size={18} />分享到 X</a>
        </div>
      </header>

      <section className="daily-pulse-card">
        <div>
          <span>{todayLabel} · {snapshot ? `${formatChinaTime(snapshot.updatedAt)} 更新` : "正在连接信息源"}</span>
          <h2>今天，市场在交易什么？</h2>
          <p>宏观央行、监管机构、中文 7×24、加密媒体与交易所动态并行聚合；热度不等于方向，先看证据，再看价格反应。</p>
        </div>
        <div className="pulse-score"><strong>{pulseScore}</strong><span>/100 热点密度</span><small>{snapshot ? `${liveProviders}/${snapshot.providers.length} 个实时源在线 · ${snapshot.items.length} 条候选信息` : "正在并发读取多个独立来源"}</small></div>
      </section>

      <div className="category-filter" aria-label="热点分类">
        {categories.map((item) => <button aria-pressed={category === item} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}
      </div>

      <section className="hotspot-layout">
        <div className="hotspot-feed">
          {hotspots.map((item) => (
            <article className="hotspot-card" key={item.id}>
              <div className="hotspot-card__rank"><span>{String(item.rank).padStart(2, "0")}</span><Fire size={18} weight="fill" /><strong>{item.heat}</strong></div>
              <div className="hotspot-card__body">
                <div className="hotspot-card__meta"><span>{item.category}</span><span data-confidence={item.confidence}>{item.confidence}</span><time>{formatChinaTime(item.publishedAt)}</time></div>
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
                <div className="hotspot-insight"><strong>为什么重要</strong><span>{item.whyItMatters}</span></div>
                <div className="hotspot-risk"><WarningCircle size={17} /><span>{item.riskNote}</span></div>
                <div className="hotspot-card__footer"><div>{item.relatedAssets.map((asset) => <span key={asset}>{asset}</span>)}</div><div>{item.sources.map((source) => <a href={source.url} key={source.name} rel="noreferrer" target="_blank">{source.name}<ArrowSquareOut size={13} /></a>)}</div></div>
              </div>
            </article>
          ))}
        </div>
        <aside className="editorial-rail">
          <h2>Stone Daily 怎么选热点</h2>
          <ol><li><strong>价格先动了吗？</strong><span>检查成交量、波动和跨市场联动。</span></li><li><strong>有可靠来源吗？</strong><span>官方确认优先，多源一致次之。</span></li><li><strong>普通人会误会什么？</strong><span>把事实、推测和情绪分别标出来。</span></li></ol>
          <div className="source-health"><CheckCircle size={20} weight="duotone" /><div><strong>来源透明</strong><span>不把自动摘要当证据，点击来源可回到原文。</span></div></div>
          <div className="editorial-source-list">
            {(snapshot?.providers ?? []).map((provider) => (
              <a href={provider.url} key={provider.name} rel="noreferrer" target="_blank">
                <span data-status={provider.status} />
                <strong>{provider.name}</strong>
                <small>{provider.status === "live" ? `${provider.itemCount} 条` : "暂不可用"}</small>
              </a>
            ))}
          </div>
        </aside>
      </section>

      <section className="live-news-section">
        <header className="live-news-heading">
          <div><span><Broadcast size={18} weight="duotone" />7×24 市场快讯</span><h2>变化发生时，不必等到明早</h2><p>参考新浪财经的时间流阅读方式，并加入央行、监管、加密媒体和交易所来源。</p></div>
          <div className="live-news-status" data-mode={snapshot?.mode ?? "loading"}>
            {snapshot ? <CheckCircle size={17} /> : <ArrowClockwise className="spin" size={17} />}
            <span>{feedError ? "实时源重连中" : snapshot ? `${liveProviders} 个来源在线` : "正在连接"}</span>
          </div>
        </header>

        {liveItems.length > 0 ? (
          <div className="live-news-feed">
            {liveItems.map((item) => (
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
            <ArrowClockwise className={feedError ? "" : "spin"} size={22} />
            <strong>{feedError ? "实时源暂时不可用" : "正在汇总最新快讯"}</strong>
            <span>编辑精选仍可正常阅读，实时源会自动恢复。</span>
          </div>
        )}
      </section>
    </>
  );
}
