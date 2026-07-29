"use client";

import {
  ArrowClockwise,
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  Copy,
  Fire,
  ShareNetwork,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { buildDailyHotspots } from "@/services/editorialRanking";
import type { EditorialFeedSnapshot, HotspotCategory } from "@/types/market";

const categories: Array<"全部" | HotspotCategory> = ["全部", "宏观", "币股", "币圈", "科技", "监管"];

const categoryLabels: Record<(typeof categories)[number], string> = {
  全部: "All",
  宏观: "Macro",
  币股: "Tokenized stocks",
  币圈: "Crypto",
  科技: "Technology",
  监管: "Regulation",
};

const confidenceLabels: Record<string, string> = {
  官方确认: "Official",
  多源一致: "Multiple sources",
  单一来源: "Single source",
  待复核: "Needs review",
};

function matchesLanguage(value: string, language: "zh" | "en") {
  const containsHan = /\p{Script=Han}/u.test(value);
  return language === "zh" ? containsHan : !containsHan;
}

async function writeClipboardText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the selection-based copy path for restricted browsers.
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function formatChinaDate(date: Date, language: "zh" | "en") {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatChinaTime(value: string, language: "zh" | "en") {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function HotspotsPortal() {
  const { language } = useAppState();
  const isEnglish = language === "en";
  const [category, setCategory] = useState<(typeof categories)[number]>("全部");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [snapshot, setSnapshot] = useState<EditorialFeedSnapshot | null>(null);
  const [feedError, setFeedError] = useState(false);
  const todayLabel = formatChinaDate(new Date(), language);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      fetch("/api/editorial?digest=full-v4", { cache: "no-store", signal: controller.signal })
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
    };
    load();
    const refreshTimer = window.setInterval(load, 300_000);
    return () => {
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, []);

  const languageItems = useMemo(
    () => (snapshot?.items ?? []).filter((item) => matchesLanguage(item.title, language)),
    [language, snapshot],
  );
  const rankedHotspots = useMemo(() => buildDailyHotspots(languageItems, 5, language), [language, languageItems]);
  const dailyItems = rankedHotspots;
  const shareItems = snapshot?.digests?.[language]?.items ?? [];
  const hotspots = useMemo(
    () => category === "全部" ? dailyItems : dailyItems.filter((item) => item.category === category),
    [category, dailyItems],
  );
  const liveProviders = snapshot?.providers.filter((provider) => provider.status === "live").length ?? 0;
  const pulseScore = Math.min(
    100,
    58 + (snapshot?.items.filter((item) => item.urgency !== "常规").length ?? 0) * 3,
  );
  const shareText = useMemo(() => {
    const titles = shareItems.map((item) => item.title);
    const digest = titles.length > 0
      ? titles.map((title, index) => `${index + 1}. ${title}`).join("\n")
      : isEnglish ? "Crypto and tokenized-stock sources are syncing. Check back shortly." : "币圈与币股信息源正在同步，请稍后再看。";
    return isEnglish
      ? `Stone Daily · Daily Pulse | ${todayLabel}\n${digest}\n\nSource-linked · Not investment advice.`
      : `Stone Daily 每日热点｜${todayLabel}\n${digest}\n\n来源可回溯｜不构成投资建议`;
  }, [isEnglish, shareItems, todayLabel]);

  const copyDigest = async () => {
    const success = await writeClipboardText(shareText);
    setCopied(success);
    setCopyFailed(!success);
    window.setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 1800);
  };

  return (
    <>
      <header className="page-header page-header--inline editorial-header">
        <div><span>Daily pulse</span><h1>{isEnglish ? "Daily Pulse" : "每日热点"}</h1><p>{isEnglish ? "Rebuilt every day in Beijing time from multiple sources, then deduplicated, clustered and ranked with original links preserved." : "每天按北京时间重新读取多源信息、去重聚类并排序；每条内容都保留原始来源。"}</p></div>
        <div className="editorial-actions">
          <button className="button button--secondary" onClick={copyDigest} type="button">{copied ? <CheckCircle size={18} /> : <Copy size={18} />}{copied ? (isEnglish ? "Copied" : "已复制") : copyFailed ? (isEnglish ? "Copy failed" : "复制失败") : (isEnglish ? "Copy today's digest" : "复制今日摘要")}</button>
          <a className="button button--primary" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} rel="noreferrer" target="_blank"><ShareNetwork size={18} />{isEnglish ? "Share on X" : "分享到 X"}</a>
        </div>
      </header>

      <section className="daily-pulse-card">
        <div>
          <span>{todayLabel} · {snapshot ? `${formatChinaTime(snapshot.updatedAt, language)} ${isEnglish ? "updated" : "更新"}` : (isEnglish ? "Connecting to sources" : "正在连接信息源")}</span>
          <h2>{isEnglish ? "What is the market trading today?" : "今天，市场在交易什么？"}</h2>
          <p>{isEnglish ? "Themes are ranked by source quality, freshness, importance and cross-source agreement. Attention is not direction—check evidence, then price response." : "系统按来源质量、时效、重要性和跨源一致性生成今日主线；热度不等于方向，先看证据，再看价格反应。"}</p>
        </div>
        <div className="pulse-score"><strong>{pulseScore}</strong><span>/100 {isEnglish ? "pulse density" : "热点密度"}</span><small>{snapshot ? (isEnglish ? `${liveProviders}/${snapshot.providers.length} live sources · ${languageItems.length} same-language candidates` : `${liveProviders}/${snapshot.providers.length} 个实时源在线 · ${languageItems.length} 条中文候选信息`) : feedError ? (isEnglish ? "Live sources unavailable; showing the offline editorial catalogue" : "实时源暂不可用，正在显示离线编辑目录") : (isEnglish ? "Reading independent sources in parallel" : "正在并发读取多个独立来源")}</small></div>
      </section>

      <div className="category-filter" aria-label={isEnglish ? "Pulse categories" : "热点分类"}>
        {categories.map((item) => <button aria-pressed={category === item} key={item} onClick={() => setCategory(item)} type="button">{isEnglish ? categoryLabels[item] : item}</button>)}
      </div>

      <section className="hotspot-layout">
        <div className="hotspot-feed">
          {hotspots.length > 0 ? hotspots.map((item) => (
            <article className="hotspot-card" key={item.id}>
              <div className="hotspot-card__rank"><span>{String(item.rank).padStart(2, "0")}</span><Fire size={18} weight="fill" /><strong>{item.heat}</strong></div>
              <div className="hotspot-card__body">
                <div className="hotspot-card__meta"><span>{isEnglish ? categoryLabels[item.category] : item.category}</span><span data-confidence={item.confidence}>{isEnglish ? confidenceLabels[item.confidence] : item.confidence}</span><time>{formatChinaTime(item.publishedAt, language)}</time></div>
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
                <div className="hotspot-insight"><strong>{isEnglish ? "Why it matters" : "为什么重要"}</strong><span>{item.whyItMatters}</span></div>
                <div className="hotspot-risk"><WarningCircle size={17} /><span>{item.riskNote}</span></div>
                <div className="hotspot-card__footer"><div>{item.relatedAssets.map((asset) => <span key={asset}>{asset}</span>)}</div><div>{item.sources.map((source) => <a href={source.url} key={source.name} rel="noreferrer" target="_blank">{source.name}<ArrowSquareOut size={13} /></a>)}</div></div>
              </div>
            </article>
          )) : (
            <div className="hotspot-daily-empty">
              <ArrowClockwise className={feedError ? "" : "spin"} size={24} />
              <strong>{feedError ? (isEnglish ? "Today's sources are temporarily unavailable" : "今日热点源暂时不可用") : snapshot ? (isEnglish ? "No same-language stories in this category" : "当前分类没有今日热点") : (isEnglish ? "Building today's pulse" : "正在生成今日热点")}</strong>
              <span>{feedError ? (isEnglish ? "Older content will not be presented as today's pulse. The page will reconnect automatically." : "不会用旧日期内容冒充今日热点，页面会自动重新连接。") : (isEnglish ? "Deduplicating, clustering and ranking multiple sources." : "正在进行多源去重、聚类和重要性排序。")}</span>
            </div>
          )}
        </div>
        <aside className="editorial-rail">
          <h2>{isEnglish ? "How Stone Daily ranks stories" : "Stone Daily 怎么选热点"}</h2>
          <ol><li><strong>{isEnglish ? "Did price move first?" : "价格先动了吗？"}</strong><span>{isEnglish ? "Check volume, volatility and cross-market moves." : "检查成交量、波动和跨市场联动。"}</span></li><li><strong>{isEnglish ? "Is the source reliable?" : "有可靠来源吗？"}</strong><span>{isEnglish ? "Official confirmation first, multiple sources second." : "官方确认优先，多源一致次之。"}</span></li><li><strong>{isEnglish ? "What could readers misread?" : "普通人会误会什么？"}</strong><span>{isEnglish ? "Separate facts, inference and emotion." : "把事实、推测和情绪分别标出来。"}</span></li></ol>
          <div className="source-health"><CheckCircle size={20} weight="duotone" /><div><strong>{isEnglish ? "Transparent sourcing" : "来源透明"}</strong><span>{isEnglish ? "Automated summaries are not evidence. Every source link returns to the original." : "不把自动摘要当证据，点击来源可回到原文。"}</span></div></div>
          <Link className="editorial-live-link" href="/live"><span>{isEnglish ? "Open the standalone 7×24 wire" : "进入独立 7×24 快讯页"}</span><ArrowRight size={16} /></Link>
          <div className="editorial-source-list">
            {(snapshot?.providers ?? []).map((provider) => (
              <a href={provider.url} key={provider.name} rel="noreferrer" target="_blank">
                <span data-status={provider.status} />
                <strong>{provider.name}</strong>
                <small>{provider.status === "live" ? `${provider.itemCount} ${isEnglish ? "items" : "条"}` : (isEnglish ? "Unavailable" : "暂不可用")}</small>
              </a>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}
