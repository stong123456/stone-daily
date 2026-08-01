"use client";

import { ArrowSquareOut, Bell, Brain, ChartLine, CheckCircle, Clock, Database, FirstAid, ShieldCheck, Star, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AssetLogo } from "@/components/AssetLogo";
import { useAppState } from "@/components/AppStateProvider";
import { assetProductLabel, assetVolatility, buildAssetEvidence, productIdentityFor } from "@/services/assetDetail";
import { formatCompact, formatPercent, formatPrice } from "@/services/format";
import { isRigorousDigestHeadlineSource, isShareableMarketStory } from "@/services/editorialSharing";
import { canonicalAssetId, canonicalAssetSymbol, isWatchedAsset } from "@/services/marketWeather";
import { fetchMarketFeed } from "@/services/marketProviders";
import { trackProductEvent } from "@/services/analytics";
import type { EditorialFeedSnapshot, MarketAlertKind, MarketAsset, MarketCandle, MarketIntelligence } from "@/types/market";

function chartPath(candles: MarketCandle[]) {
  if (candles.length < 2) return "";
  const values = candles.map((item) => item.close);
  const low = Math.min(...values);
  const range = Math.max(...values) - low || 1;
  return candles.map((item, index) => `${index ? "L" : "M"}${((index / (candles.length - 1)) * 720).toFixed(1)},${(190 - ((item.close - low) / range) * 160).toFixed(1)}`).join(" ");
}

function exactAsset(asset: MarketAsset, symbol: string) {
  return canonicalAssetSymbol(asset) === symbol.toUpperCase();
}

export function AssetDetailPortal({ symbol }: { symbol: string }) {
  const { language, watchlistIds, toggleWatchlist, addAlert } = useAppState();
  const en = language === "en";
  const normalized = symbol.toUpperCase();
  const [venues, setVenues] = useState<MarketAsset[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [intelligence, setIntelligence] = useState<MarketIntelligence | null>(null);
  const [editorial, setEditorial] = useState<EditorialFeedSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertKind, setAlertKind] = useState<MarketAlertKind>("price-above");
  const [threshold, setThreshold] = useState("");
  const [alertSaved, setAlertSaved] = useState(false);

  useEffect(() => {
    trackProductEvent("asset_open", { symbol: normalized });
    const controller = new AbortController();
    setLoading(true);
    void Promise.allSettled([
      Promise.all([fetchMarketFeed("crypto", normalized), fetchMarketFeed("stocks", normalized)]).then(([crypto, stocks]) => {
        if (controller.signal.aborted) return;
        const matches = [...crypto.assets, ...stocks.assets].filter((asset) => exactAsset(asset, normalized));
        setVenues(matches);
        setSelectedId((current) => current || matches[0]?.id || "");
      }),
      fetch(`/api/market-intelligence?symbol=${encodeURIComponent(normalized)}`, { cache: "no-store", signal: controller.signal }).then((response) => response.ok ? response.json() as Promise<MarketIntelligence> : null).then((value) => { if (!controller.signal.aborted) setIntelligence(value); }),
      fetch("/api/editorial?detail=asset", { cache: "no-store", signal: controller.signal }).then((response) => response.ok ? response.json() as Promise<EditorialFeedSnapshot> : null).then((value) => { if (!controller.signal.aborted) setEditorial(value); }),
    ]).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [normalized]);

  const selected = venues.find((asset) => asset.id === selectedId) ?? venues[0];
  const evidence = useMemo(() => selected ? buildAssetEvidence(selected, venues, intelligence, language) : null, [intelligence, language, selected, venues]);
  const identity = useMemo(() => selected ? productIdentityFor(selected, language) : null, [language, selected]);
  const path = useMemo(() => chartPath(intelligence?.candles ?? []), [intelligence]);
  const volatility = assetVolatility(intelligence?.candles ?? []);
  const events = useMemo(() => (editorial?.items ?? []).filter((item) => isShareableMarketStory(item) && isRigorousDigestHeadlineSource(item.title) && (item.relatedAssets.some((asset) => asset.toUpperCase() === normalized) || new RegExp(`\\b${normalized}\\b`, "i").test(item.title))).slice(0, 5), [editorial, normalized]);

  const saveAlert = () => {
    if (!selected) return;
    const needsValue = alertKind !== "news";
    const value = Number(threshold);
    if (needsValue && (!Number.isFinite(value) || value <= 0)) return;
    addAlert({ assetId: canonicalAssetId(selected), symbol: normalized, name: selected.name, market: selected.market, kind: alertKind, threshold: needsValue ? value : undefined, enabled: true });
    setAlertSaved(true);
    window.setTimeout(() => { setAlertSaved(false); setAlertOpen(false); }, 1100);
  };

  if (loading && !selected) return <div className="asset-detail-empty"><ChartLine className="spin" size={28} /><strong>{en ? `Building ${normalized} market view…` : `正在汇总 ${normalized} 的跨所行情…`}</strong></div>;
  if (!selected) return <div className="asset-detail-empty"><WarningCircle size={30} /><strong>{en ? "No exact market record was found" : "没有找到完全匹配的行情记录"}</strong><p>{en ? "Try the symbol used by the underlying asset, such as BTC, ETH, NVDA or TSLA." : "请尝试基础资产代码，例如 BTC、ETH、NVDA 或 TSLA。"}</p><Link className="button button--primary" href="/markets">{en ? "Back to markets" : "返回实时行情"}</Link></div>;

  const watched = isWatchedAsset(watchlistIds, selected);
  const calmPrompt = `资产：${normalized}；交易所：${selected.venue ?? "综合行情"}；产品：${assetProductLabel(selected, "zh")}；24h：${selected.change24h.toFixed(2)}%；当前冲动：想立刻行动。请结合这个资产的产品结构帮我冷静。`;
  return <div className="asset-detail">
    <header className="asset-detail__header">
      <div className="asset-detail__identity"><AssetLogo asset={selected} size={54} /><div><span>{assetProductLabel(selected, language)} · {selected.venue ?? (en ? "Aggregated" : "综合行情")}</span><h1>{normalized} <small>{selected.name}</small></h1><p>{selected.narrative} · {en ? "All venue records retain their own product and volume methodology." : "不同交易场所的产品类型与成交量口径分别保留。"}</p></div></div>
      <div className="asset-detail__hero-price"><small>{en ? "Selected venue price" : "当前场所价格"}</small><strong>{formatPrice(selected.price)}</strong><span className={selected.change24h >= 0 ? "is-positive" : "is-negative"}>{formatPercent(selected.change24h)} / 24h</span></div>
      <div className="asset-detail__actions"><button className="button button--secondary" data-active={watched} onClick={() => toggleWatchlist(canonicalAssetId(selected), selected.id)} type="button"><Star size={17} weight={watched ? "fill" : "regular"} />{watched ? (en ? "Watched" : "已自选") : (en ? "Watch" : "加自选")}</button><button className="button button--secondary" onClick={() => { setAlertOpen((value) => !value); setThreshold(selected.price.toString()); }} type="button"><Bell size={17} />{en ? "Set alert" : "设提醒"}</button><Link className="button button--primary" href={`/regret?text=${encodeURIComponent(calmPrompt)}`}><FirstAid size={17} />{en ? "Help me pause" : "帮我冷静"}</Link></div>
    </header>

    {alertOpen ? <section className="alert-composer"><div><Bell size={20} /><span><strong>{en ? `Create a ${normalized} alert` : `创建 ${normalized} 提醒`}</strong><small>{en ? "Stored in this browser; optional system notifications require permission." : "默认保存在本浏览器；系统通知需由你主动授权。"}</small></span></div><label>{en ? "Condition" : "条件"}<select value={alertKind} onChange={(event) => setAlertKind(event.target.value as MarketAlertKind)}><option value="price-above">{en ? "Price above" : "价格高于"}</option><option value="price-below">{en ? "Price below" : "价格低于"}</option><option value="move-up">{en ? "24h gain above %" : "24h 涨幅超过 %"}</option><option value="move-down">{en ? "24h loss above %" : "24h 跌幅超过 %"}</option><option value="funding">{en ? "Funding magnitude above %" : "资金费率绝对值超过 %"}</option><option value="news">{en ? "Important related news" : "出现重要相关消息"}</option></select></label>{alertKind === "news" ? null : <label>{en ? "Threshold" : "阈值"}<input inputMode="decimal" onChange={(event) => setThreshold(event.target.value)} value={threshold} /></label>}<button className="button button--primary" onClick={saveAlert} type="button">{alertSaved ? <CheckCircle size={17} /> : <Bell size={17} />}{alertSaved ? (en ? "Saved" : "已保存") : (en ? "Save alert" : "保存提醒")}</button></section> : null}

    <section className="asset-detail__grid">
      <article className="asset-price-card"><div className="asset-card-heading"><span><ChartLine size={18} />{en ? "24-hour price path" : "24 小时价格路径"}</span><small>{intelligence?.candleVenue ?? (en ? "No derivative candle source" : "暂无衍生品 K 线源")}</small></div>{path ? <svg aria-label={`${normalized} 24 hour price chart`} preserveAspectRatio="none" role="img" viewBox="0 0 720 210"><defs><linearGradient id="asset-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".21"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path d={`${path} L720,210 L0,210 Z`} fill="url(#asset-area)"/><path d={path} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg> : <div className="asset-chart-empty">{en ? "No comparable 1-hour candle path is available for this product." : "当前产品暂无可比较的 1 小时 K 线路径。"}</div>}<footer><span>{intelligence?.candles.length ?? 0} {en ? "hourly candles" : "根小时 K 线"}</span><strong>{en ? "Average hourly move" : "平均小时波动"} {volatility.toFixed(2)}%</strong></footer></article>
      <aside className="asset-metric-rail"><article><small>{en ? "Venue records" : "交易场所记录"}</small><strong>{venues.length}</strong><p>{en ? "Spot, tokenized products and derivatives stay separated." : "现货、币股及衍生品分别标识。"}</p></article><article><small>{en ? "Reported volume" : "当前场所成交量"}</small><strong>{formatCompact(selected.volume)}</strong><p>{en ? "Venue-level, never treated as an all-market total." : "保留单所口径，不当作全市场总量。"}</p></article><article><small>{en ? "Mark spread" : "衍生品标记价差"}</small><strong>{intelligence ? `${intelligence.markSpreadPct.toFixed(3)}%` : "—"}</strong><p>{en ? "Screen difference, not an arbitrage signal." : "屏幕差异，不等于套利信号。"}</p></article></aside>
    </section>

    <section className="venue-comparison"><div className="asset-section-heading"><span>{en ? "Venue comparison" : "跨场所比较"}</span><h2>{en ? `Where ${normalized} is being quoted` : `${normalized} 在哪里被报价`}</h2><p>{en ? "Choose a row to change the primary price. Product structure remains explicit." : "点击行可切换主报价；产品结构不会被合并隐藏。"}</p></div><div className="venue-comparison__table"><div className="venue-comparison__head"><span>{en ? "Venue / product" : "场所 / 产品"}</span><span>{en ? "Price" : "价格"}</span><span>24h</span><span>{en ? "Volume" : "成交量"}</span><span>{en ? "Status" : "状态"}</span></div>{venues.map((asset) => <button data-selected={asset.id === selected.id} key={asset.id} onClick={() => setSelectedId(asset.id)} type="button"><span><strong>{asset.venue ?? (en ? "Market feed" : "行情源")}</strong><small>{assetProductLabel(asset, language)} · {asset.quoteCurrency ?? "—"}</small></span><strong>{formatPrice(asset.price)}</strong><b className={asset.change24h >= 0 ? "is-positive" : "is-negative"}>{formatPercent(asset.change24h)}</b><span>{formatCompact(asset.volume)}</span><em data-mode={asset.feedMode ?? "live"}>{asset.feedMode ?? "live"}</em></button>)}</div></section>

    {evidence ? <section className="evidence-chain"><div className="asset-section-heading"><span>Evidence-chain AI</span><h2>{en ? "Evidence before explanation" : "先证据，再解释"}</h2><p>{en ? "Facts, observations and hypotheses are never presented as one paragraph." : "事实、数据观察与可能解释不再混成一段结论。"}</p></div><div className="evidence-chain__grid"><article data-tone="fact"><header><CheckCircle size={20} /><strong>{en ? "Confirmed facts" : "已确认事实"}</strong></header><ul>{evidence.confirmedFacts.map((item) => <li key={item}>{item}</li>)}</ul></article><article data-tone="data"><header><Database size={20} /><strong>{en ? "Data observations" : "数据观察"}</strong></header><ul>{evidence.observations.map((item) => <li key={item}>{item}</li>)}</ul></article><article data-tone="idea"><header><Brain size={20} /><strong>{en ? "Possible explanations" : "可能解释"}</strong></header><ul>{evidence.possibleExplanations.map((item) => <li key={item}>{item}</li>)}</ul></article><article data-tone="risk"><header><WarningCircle size={20} /><strong>{en ? "Still unconfirmed" : "尚待确认"}</strong></header><ul>{evidence.unconfirmed.map((item) => <li key={item}>{item}</li>)}</ul></article></div><footer><Clock size={16} /><span>{en ? "Sources and timestamps" : "来源与时间"}</span>{evidence.sources.length ? evidence.sources.map((source, index) => <span key={`${source.name}-${index}`}>{source.name}{source.asOf ? ` · ${new Date(source.asOf).toLocaleTimeString(en ? "en-US" : "zh-CN", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>) : <span>{en ? "No current source timestamp" : "暂无当前来源时间"}</span>}</footer></section> : null}

    <section className="asset-lower-grid"><article className="product-identity-card"><div className="asset-section-heading"><span>{en ? "Product identity" : "产品身份证"}</span><h2>{identity?.label}</h2></div>{identity ? <dl><div><dt>Stone ID</dt><dd>{canonicalAssetId(selected)}</dd></div><div><dt>{en ? "Issuer" : "发行主体"}</dt><dd>{identity.issuer}</dd></div><div><dt>{en ? "Custody" : "托管安排"}</dt><dd>{identity.custody}</dd></div><div><dt>{en ? "Holder rights" : "持有人权利"}</dt><dd>{identity.holderRights}</dd></div><div><dt>{en ? "Trading hours" : "交易时段"}</dt><dd>{identity.tradingHours}</dd></div><div><dt>{en ? "Dividend treatment" : "分红处理"}</dt><dd>{identity.dividendTreatment}</dd></div><div><dt>{en ? "Regional limits" : "地区限制"}</dt><dd>{identity.regionalLimits}</dd></div><div><dt>{en ? "Backing" : "支持资产"}</dt><dd>{identity.backing}</dd></div></dl> : null}{identity?.sourceUrl ? <a href={identity.sourceUrl} rel="noreferrer" target="_blank"><ShieldCheck size={16} />{en ? "Open venue disclosure" : "查看平台披露"}<ArrowSquareOut size={13} /></a> : null}</article><article className="asset-event-card"><div className="asset-section-heading"><span>{en ? "Related events" : "相关事件"}</span><h2>{en ? "Source-linked market context" : "有来源的市场背景"}</h2></div>{events.length ? <ol>{events.map((item) => <li key={item.id}><time>{new Date(item.publishedAt).toLocaleString(en ? "en-US" : "zh-CN", { hour: "2-digit", minute: "2-digit", month: "numeric", day: "numeric" })}</time><div><strong>{item.title}</strong><span>{item.source} · {item.sourceType}</span></div><a aria-label={en ? "Open original source" : "打开原始来源"} href={item.url} rel="noreferrer" target="_blank"><ArrowSquareOut size={15} /></a></li>)}</ol> : <p className="asset-event-empty">{en ? "No exact related event is currently available. Stone Daily will not fill this area with loosely related headlines." : "当前没有精确相关事件；Stone Daily 不会用宽泛新闻填充这个位置。"}</p>}</article></section>
  </div>;
}
