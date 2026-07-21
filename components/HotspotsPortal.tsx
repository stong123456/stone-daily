"use client";

import { ArrowSquareOut, CheckCircle, Copy, Fire, ShareNetwork, WarningCircle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { dailyHotspots } from "@/data/editorial";
import type { HotspotCategory } from "@/types/market";

const categories: Array<"全部" | HotspotCategory> = ["全部", "宏观", "币股", "币圈", "科技", "监管"];

const shareText = `Stone Daily 每日热点｜7月21日
① 能源与航运风险重回定价主线
② AI 芯片进入“投入能否兑现”的检验期
③ BTC 与宏观风险资产联动增强

一句话：今天最重要的不是追涨，而是看清油价、利率与风险偏好如何互相影响。
仅作信息整理，不构成投资建议。`;

export function HotspotsPortal() {
  const [category, setCategory] = useState<(typeof categories)[number]>("全部");
  const [copied, setCopied] = useState(false);
  const hotspots = useMemo(() => category === "全部" ? dailyHotspots : dailyHotspots.filter((item) => item.category === category), [category]);

  const copyDigest = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <header className="page-header page-header--inline editorial-header">
        <div><span>Daily pulse</span><h1>每日热点</h1><p>不是把所有新闻堆给你，而是选出真正影响币股、币圈和普通人情绪的几件事。</p></div>
        <div className="editorial-actions">
          <button className="button button--secondary" onClick={copyDigest} type="button">{copied ? <CheckCircle size={18} /> : <Copy size={18} />}{copied ? "已复制" : "复制今日摘要"}</button>
          <a className="button button--primary" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} rel="noreferrer" target="_blank"><ShareNetwork size={18} />分享到 X</a>
        </div>
      </header>

      <section className="daily-pulse-card">
        <div><span>7 月 21 日 · 08:00 更新</span><h2>今天，市场在交易什么？</h2><p>能源风险抬升通胀担忧，AI 资产进入兑现检验期，币圈重新跟随宏观风险偏好。</p></div>
        <div className="pulse-score"><strong>72</strong><span>/100 热点密度</span><small>信息很多，但真正需要关注的只有三条主线</small></div>
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
                <div className="hotspot-card__meta"><span>{item.category}</span><span data-confidence={item.confidence}>{item.confidence}</span><time>{new Date(item.publishedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time></div>
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
          <div className="source-health"><CheckCircle size={20} weight="duotone" /><div><strong>来源透明</strong><span>每条热点保留原始出处，不用 AI 摘要替代证据。</span></div></div>
        </aside>
      </section>
    </>
  );
}
