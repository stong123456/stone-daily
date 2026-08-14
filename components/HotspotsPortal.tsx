"use client";

import {
  ArrowClockwise,
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  Copy,
  Fire,
  GlobeHemisphereEast,
  ShareNetwork,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { ShareCardButton } from "@/components/ShareCardButton";
import { trackProductEvent } from "@/services/analytics";
import { buildDailyHotspots } from "@/services/editorialRanking";
import { containsHan, isRigorousDigestHeadlineSource, isShareableMarketStory } from "@/services/editorialSharing";
import type {
  DailyHotspot,
  EditorialDigestItem,
  EditorialFeedSnapshot,
  HotspotCategory,
} from "@/types/market";

const categories: Array<"全部" | HotspotCategory> = ["全部", "币圈", "币股", "监管", "宏观", "科技"];

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

function sourceLanguage(value: string): "zh" | "en" {
  return containsHan(value) ? "zh" : "en";
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

function numberedDigest(items: EditorialDigestItem[]) {
  return items.map((item, index) => `${index + 1}. ${item.title}`).join("\n");
}

function HotspotCard({ item, contentLanguage, interfaceEnglish }: {
  item: DailyHotspot;
  contentLanguage: "zh" | "en";
  interfaceEnglish: boolean;
}) {
  const contentEnglish = contentLanguage === "en";
  return (
    <article className="hotspot-card" data-language={contentLanguage} lang={contentEnglish ? "en" : "zh-CN"}>
      <div className="hotspot-card__rank"><span>{String(item.rank).padStart(2, "0")}</span><Fire size={18} weight="fill" /><strong>{item.heat}</strong></div>
      <div className="hotspot-card__body">
        <div className="hotspot-card__meta">
          <span className="hotspot-card__language">{contentEnglish ? "EN" : "中文"}</span>
          <span>{contentEnglish ? categoryLabels[item.category] : item.category}</span>
          <span data-confidence={item.confidence}>{contentEnglish ? confidenceLabels[item.confidence] : item.confidence}</span>
          <time>{formatChinaTime(item.publishedAt, contentLanguage)}</time>
        </div>
        <h2>{item.title}</h2>
        <p>{item.summary}</p>
        <div className="hotspot-evidence-grid">
          <div data-tone="fact"><strong>{contentEnglish ? "Confirmed facts" : "已确认事实"}</strong><ul>{(item.confirmedFacts ?? [item.title]).map((fact) => <li key={fact}>{fact}</li>)}</ul></div>
          <div data-tone="inference"><strong>{contentEnglish ? "Market relevance · inference" : "市场相关性 · 推断"}</strong><span>{item.inference ?? item.whyItMatters}</span></div>
          <div data-tone="reaction"><strong>{contentEnglish ? "Price response" : "价格反应"}</strong><span>{item.marketReaction ?? (contentEnglish ? "Verify related price, volume and venue consistency before attributing a move." : "归因前请核对相关资产的价格、量能与跨所一致性。")}</span></div>
        </div>
        <div className="hotspot-risk"><WarningCircle size={17} /><span><strong>{contentEnglish ? "Still unconfirmed: " : "尚待确认："}</strong>{item.riskNote}</span></div>
        <div className="hotspot-card__footer"><div>{item.relatedAssets.map((asset) => <Link href={`/asset/${encodeURIComponent(asset)}`} key={asset}>{asset}</Link>)}</div><div>{item.sources.map((source) => <a href={source.url} key={source.name} rel="noreferrer" target="_blank">{source.name}<ArrowSquareOut size={13} /></a>)}</div></div>
        {contentEnglish ? <small className="hotspot-browser-translate">{interfaceEnglish ? "Original English · use your browser translation if needed" : "英文原文 · 如需中文可使用浏览器内置翻译"}</small> : null}
      </div>
    </article>
  );
}

function HotspotLanguageSection({ language, items, interfaceEnglish, loading, feedError }: {
  language: "zh" | "en";
  items: DailyHotspot[];
  interfaceEnglish: boolean;
  loading: boolean;
  feedError: boolean;
}) {
  const contentEnglish = language === "en";
  const title = contentEnglish ? "English News" : "中文资讯";
  const description = contentEnglish
    ? (interfaceEnglish ? "Original English reporting, with no machine translation." : "保留英文原文，不经过机器翻译；需要时可使用浏览器内置翻译。")
    : (interfaceEnglish ? "Original Chinese reporting, kept separate from English stories." : "中文来源保留中文原文，与英文资讯分开展示。")
  return (
    <section className="hotspot-language-section" data-language={language} lang={contentEnglish ? "en" : "zh-CN"} translate="yes">
      <header className="hotspot-language-section__header">
        <span className="hotspot-language-mark">{contentEnglish ? "EN" : "中"}</span>
        <div><small>{contentEnglish ? "Original-language wire" : "中文原文资讯"}</small><h2>{title}</h2><p>{description}</p></div>
        <strong>{items.length} {interfaceEnglish ? "stories" : "条"}</strong>
      </header>
      <div className="hotspot-feed">
        {items.length > 0 ? items.map((item) => <HotspotCard contentLanguage={language} interfaceEnglish={interfaceEnglish} item={item} key={item.id} />) : (
          <div className="hotspot-daily-empty">
            <ArrowClockwise className={!feedError && loading ? "spin" : ""} size={24} />
            <strong>{feedError ? (interfaceEnglish ? "This source group is temporarily unavailable" : "该语言信息源暂时不可用") : (interfaceEnglish ? "No stories in this language and category" : "该语言与分类下暂无热点")}</strong>
            <span>{interfaceEnglish ? "The page will keep checking the original sources without filling the section with translations." : "页面会继续检查原始来源，不会用机器译文填充该区域。"}</span>
          </div>
        )}
      </div>
    </section>
  );
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
      fetch("/api/editorial?digest=native-v1", { cache: "no-store", signal: controller.signal })
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

  const languageHotspots = useMemo(() => {
    const candidates = (snapshot?.items ?? []).filter((item) => isShareableMarketStory(item) && isRigorousDigestHeadlineSource(item.title));
    const filterCategory = (items: DailyHotspot[]) => category === "全部" ? items : items.filter((item) => item.category === category);
    return {
      zh: filterCategory(buildDailyHotspots(candidates.filter((item) => sourceLanguage(item.title) === "zh"), 6, "zh")),
      en: filterCategory(buildDailyHotspots(candidates.filter((item) => sourceLanguage(item.title) === "en"), 6, "en")),
      candidateCount: candidates.length,
    };
  }, [category, snapshot]);

  const chineseShareItems = snapshot?.digests?.zh.items ?? [];
  const englishShareItems = snapshot?.digests?.en.items ?? [];
  const shareItemCount = chineseShareItems.length + englishShareItems.length;
  const liveProviders = snapshot?.providers.filter((provider) => provider.status === "live").length ?? 0;
  const pulseScore = Math.min(100, 58 + (snapshot?.items.filter((item) => item.urgency !== "常规").length ?? 0) * 3);
  const shareText = useMemo(() => {
    const sections = [
      chineseShareItems.length ? `【中文资讯】\n${numberedDigest(chineseShareItems)}` : "",
      englishShareItems.length ? `【English News】\n${numberedDigest(englishShareItems)}` : "",
    ].filter(Boolean).join("\n\n");
    const digest = sections || (isEnglish ? "Original-language sources are syncing. Check back shortly." : "中英文原文信息源正在同步，请稍后再看。");
    return isEnglish
      ? `Stone Daily · Daily Pulse | ${todayLabel}\n${digest}\n\nOriginal sources · Browser translation optional · Not investment advice.`
      : `Stone Daily 每日热点｜${todayLabel}\n${digest}\n\n保留原文｜可使用浏览器翻译｜不构成投资建议`;
  }, [chineseShareItems, englishShareItems, isEnglish, todayLabel]);

  const shareCardSummary = useMemo(() => {
    const zh = chineseShareItems.slice(0, 2).map((item, index) => `中${index + 1}. ${item.title}`);
    const en = englishShareItems.slice(0, 2).map((item, index) => `EN${index + 1}. ${item.title}`);
    return [...zh, ...en].join("  ") || (isEnglish ? "Original-language sources are syncing." : "中英文原文信息源正在同步。");
  }, [chineseShareItems, englishShareItems, isEnglish]);

  const copyDigest = async () => {
    const success = await writeClipboardText(shareText);
    if (success) trackProductEvent("digest_copy", { count: shareItemCount });
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
        <div><span>Daily pulse</span><h1>{isEnglish ? "Daily Pulse" : "每日热点"}</h1><p>{isEnglish ? "Chinese and English reporting are ranked separately and shown in their original language, with every source link preserved." : "中文与英文资讯分别排序、分区展示并保留原文；不再使用机器翻译，每条内容都可回到原始来源。"}</p></div>
        <div className="editorial-actions">
          <button className="button button--secondary" onClick={copyDigest} type="button">{copied ? <CheckCircle size={18} /> : <Copy size={18} />}{copied ? (isEnglish ? "Copied" : "已复制") : copyFailed ? (isEnglish ? "Copy failed" : "复制失败") : (isEnglish ? "Copy today's digest" : "复制今日摘要")}</button>
          <ShareCardButton content={{ kind: "daily", title: isEnglish ? `Daily Pulse · ${todayLabel}` : `Stone Daily 每日热点｜${todayLabel}`, summary: shareCardSummary, detail: isEnglish ? "Chinese + English originals · Browser translation optional" : "中英文原文分区｜可使用浏览器翻译" }} />
          <a className="button button--primary" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} rel="noreferrer" target="_blank"><ShareNetwork size={18} />{isEnglish ? "Share on X" : "分享到 X"}</a>
        </div>
      </header>

      <section className="daily-pulse-card">
        <div>
          <span>{todayLabel} · {snapshot ? `${formatChinaTime(snapshot.updatedAt, language)} ${isEnglish ? "updated" : "更新"}` : (isEnglish ? "Connecting to sources" : "正在连接信息源")}</span>
          <h2>{isEnglish ? "Original reporting, clearly separated" : "原文呈现，中英文分区"}</h2>
          <p>{isEnglish ? "Stories are still filtered, deduplicated, clustered and ranked. Only the translation step has been removed to reduce cost and avoid altered meaning." : "系统仍会筛选、去重、聚类和排序；只移除翻译环节，以降低成本并避免译文改变新闻原意。"}</p>
          <div className="editorial-quality-badge" data-mode="native-only">
            <GlobeHemisphereEast size={16} weight="fill" />
            <strong>{isEnglish ? "Native-language mode" : "原文模式"}</strong>
            <span>{isEnglish ? "No AI translation · browser translation optional" : "不调用 AI 翻译 · 可使用浏览器内置翻译"}</span>
          </div>
        </div>
        <div className="pulse-score"><strong>{pulseScore}</strong><span>/100 {isEnglish ? "pulse density" : "热点密度"}</span><small>{snapshot ? (isEnglish ? `${liveProviders}/${snapshot.providers.length} live sources · ${languageHotspots.candidateCount} original candidates` : `${liveProviders}/${snapshot.providers.length} 个实时源在线 · ${languageHotspots.candidateCount} 条原文候选`) : feedError ? (isEnglish ? "Live sources temporarily unavailable" : "实时信息源暂不可用") : (isEnglish ? "Reading independent sources in parallel" : "正在并发读取多个独立来源")}</small></div>
      </section>

      <div className="category-filter" aria-label={isEnglish ? "Pulse categories" : "热点分类"}>
        {categories.map((item) => <button aria-pressed={category === item} key={item} onClick={() => setCategory(item)} type="button">{isEnglish ? categoryLabels[item] : item}</button>)}
      </div>

      <section className="hotspot-layout">
        <div className="hotspot-language-stack">
          <HotspotLanguageSection feedError={feedError} interfaceEnglish={isEnglish} items={languageHotspots.zh} language="zh" loading={!snapshot} />
          <HotspotLanguageSection feedError={feedError} interfaceEnglish={isEnglish} items={languageHotspots.en} language="en" loading={!snapshot} />
        </div>
        <aside className="editorial-rail">
          <h2>{isEnglish ? "How Stone Daily ranks stories" : "Stone Daily 怎么选热点"}</h2>
          <ol><li><strong>{isEnglish ? "Original language first" : "优先保留原文"}</strong><span>{isEnglish ? "Chinese and English stories remain in separate, clearly labelled groups." : "中文与英文新闻保持原始语言，并放入清晰标注的独立区域。"}</span></li><li><strong>{isEnglish ? "Is the source reliable?" : "有可靠来源吗？"}</strong><span>{isEnglish ? "Official confirmation first, multiple sources second." : "官方确认优先，多源一致次之。"}</span></li><li><strong>{isEnglish ? "What could readers misread?" : "普通人会误会什么？"}</strong><span>{isEnglish ? "Facts, inference and price reaction stay separated." : "把事实、推测和价格反应分别标出来。"}</span></li></ol>
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
