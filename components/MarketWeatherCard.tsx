"use client";

import { ArrowClockwise, Binoculars, Broadcast, ChartLineUp, CheckCircle, CloudSun, Copy, ShieldCheck, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { AssetLogo } from "@/components/AssetLogo";
import { ShareCardButton } from "@/components/ShareCardButton";
import type { BinanceWeatherLane, BinanceWeatherSnapshot } from "@/services/binanceWeather";
import { fetchMarketFeed } from "@/services/marketProviders";
import { buildMarketWeather, canonicalAssetSymbol, type LiveMarketWeather } from "@/services/marketWeather";
import { localizeMarketWeather } from "@/services/localization";
import { buildBinanceMarketShareContent, buildMarketShareContent } from "@/services/shareCard";
import type { MarketAsset } from "@/types/market";

type WeatherScope = "all" | "binance";

function formatChinaDateTime(value: string, language: "zh" | "en") {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function RankingList({ assets, direction }: { assets: MarketAsset[]; direction: "gain" | "loss" }) {
  return <ol>{assets.slice(0, 5).map((asset, index) => <li key={asset.id}><em>{index + 1}</em><AssetLogo asset={asset} size={26} /><span><strong>{canonicalAssetSymbol(asset)}</strong><small>{asset.market === "stock" ? "Binance Web3" : "Binance Spot"}</small></span><b className={direction === "gain" ? "is-positive" : "is-negative"}>{asset.change24h >= 0 ? "+" : ""}{asset.change24h.toFixed(2)}%</b></li>)}</ol>;
}

function RankingPanel({ lane, title, language }: { lane: BinanceWeatherLane; title: string; language: "zh" | "en" }) {
  const en = language === "en";
  return <section className="binance-weather-board"><header><div><span>{title}</span><strong>{en ? `Breadth ${lane.breadth}%` : `上涨广度 ${lane.breadth}%`}</strong></div><small>{lane.rankedCount} {en ? "eligible samples" : "个有效样本"}</small></header><div><article><h3>{en ? "Top gainers" : "涨幅榜"}</h3><RankingList assets={lane.gainers} direction="gain" /></article><article><h3>{en ? "Top decliners" : "跌幅榜"}</h3><RankingList assets={lane.decliners} direction="loss" /></article></div></section>;
}

export function MarketWeatherCard() {
  const { language } = useAppState();
  const en = language === "en";
  const [scope, setScope] = useState<WeatherScope>("all");
  const [wholeWeather, setWholeWeather] = useState<LiveMarketWeather | null>(null);
  const [binanceSnapshot, setBinanceSnapshot] = useState<BinanceWeatherSnapshot | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failedScopes, setFailedScopes] = useState<WeatherScope[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshKey((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([
      fetchMarketFeed("crypto"),
      fetchMarketFeed("stocks"),
      fetch("/api/binance-weather", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("Binance weather unavailable");
        return response.json() as Promise<BinanceWeatherSnapshot>;
      }),
    ]).then(([cryptoResult, stockResult, binanceResult]) => {
      if (!active) return;
      const crypto = cryptoResult.status === "fulfilled" ? cryptoResult.value : null;
      const stocks = stockResult.status === "fulfilled" ? stockResult.value : null;
      const failures: WeatherScope[] = [];
      if (crypto || stocks) {
        setWholeWeather(buildMarketWeather({
          cryptoAssets: crypto?.assets ?? [],
          stockAssets: stocks?.assets ?? [],
          cryptoProviders: crypto?.providers,
          stockProviders: stocks?.providers,
          cryptoMode: crypto?.mode ?? "fallback",
          stockMode: stocks?.mode ?? "fallback",
          updatedAt: [crypto?.updatedAt, stocks?.updatedAt].filter(Boolean).sort().at(-1),
        }));
      } else {
        failures.push("all");
      }
      if (binanceResult.status === "fulfilled") setBinanceSnapshot(binanceResult.value);
      else failures.push("binance");
      setFailedScopes(failures);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const weather = scope === "binance" ? binanceSnapshot?.weather ?? null : wholeWeather;
  const displayWeather = weather ? localizeMarketWeather(weather, language) : null;
  const failed = failedScopes.includes(scope);
  const switcher = <div className="weather-scope-switch" aria-label={en ? "Market weather scope" : "市场天气范围"} role="group"><span>{en ? "Weather scope" : "天气范围"}</span><button aria-pressed={scope === "all"} className={scope === "all" ? "is-active" : ""} onClick={() => setScope("all")} type="button">{en ? "Whole market" : "全市场"}</button><button aria-pressed={scope === "binance"} className={scope === "binance" ? "is-active" : ""} onClick={() => setScope("binance")} type="button">Binance</button><small>{scope === "binance" ? (en ? "Official Spot + Web3 Ondo feeds" : "官方 Spot + Web3 Ondo 公开源") : (en ? "Cross-venue aggregate" : "跨交易所聚合")}</small></div>;

  if (!displayWeather) {
    return <>{switcher}<section className="weather-report weather-report--empty"><CloudSun className={loading ? "spin" : ""} size={32} /><strong>{failed ? (en ? "This weather scope is temporarily unavailable" : "当前天气范围暂时不可用") : (en ? "Reading market weather" : "正在读取市场天气")}</strong><span>{failed ? (en ? "Older fixed content will not be presented as a fresh reading. Try again shortly." : "不会把旧的固定内容冒充实时读数，请稍后重试。") : scope === "binance" ? (en ? "Reading Binance Spot and Binance Web3 tokenized-stock data." : "正在读取 Binance Spot 与 Binance Web3 币股数据。") : (en ? "Combining public crypto and tokenized-stock feeds in parallel." : "正在并行汇总币圈与币股公开行情。")}</span>{failed ? <button className="button button--secondary" onClick={() => setRefreshKey((value) => value + 1)} type="button"><ArrowClockwise size={17} />{en ? "Try again" : "重新读取"}</button> : null}</section></>;
  }

  const liveProviders = scope === "binance" ? binanceSnapshot?.sources.filter((source) => source.status === "live").length ?? 0 : displayWeather.liveProviders;
  const totalProviders = scope === "binance" ? binanceSnapshot?.sources.length ?? 2 : displayWeather.totalProviders;
  const copyText = scope === "binance" ? (en ? binanceSnapshot?.copy.en : binanceSnapshot?.copy.zh) : "";
  const copyShareText = async () => {
    if (!copyText || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return <>{switcher}<section className="weather-report" data-scope={scope} data-tone={displayWeather.tone}>
    <div className="weather-report__hero">
      <img alt={en ? `${displayWeather.weather} market weather illustration` : `${displayWeather.weather}的市场天气插画`} src="/assets/market-weather.png" />
      <div className="weather-report__hero-copy"><span>{scope === "binance" ? (en ? "Binance market weather" : "Binance 单所市场天气") : (en ? "Live market weather" : "实时市场天气")}</span><h2>{displayWeather.weather}</h2><p>{displayWeather.headline}</p><div className="weather-report__sync"><Broadcast size={15} /><span>{liveProviders}/{totalProviders || "—"} {en ? "feeds live" : "个行情源在线"}</span><time dateTime={displayWeather.updatedAt}>{formatChinaDateTime(displayWeather.updatedAt, language)} {en ? "updated" : "更新"}</time><button disabled={loading} onClick={() => setRefreshKey((value) => value + 1)} type="button"><ArrowClockwise className={loading ? "spin" : ""} size={14} />{en ? "Refresh" : "刷新"}</button></div></div>
      <div className="weather-score"><strong>{displayWeather.score}</strong><span>/100</span><small>{displayWeather.mode === "live" ? (en ? "Live composite" : "实时综合温度") : displayWeather.mode === "partial" ? (en ? "Partly live" : "部分实时") : (en ? "Catalogue reference" : "目录参考")}</small></div>
    </div>

    <div className="weather-metric-grid">
      <article><small>{scope === "binance" ? (en ? "Binance crypto" : "Binance 加密温度") : (en ? "Crypto temperature" : "币圈温度")}</small><strong>{displayWeather.cryptoTemperature}</strong><span>{en ? "Breadth" : "上涨广度"} {scope === "binance" ? binanceSnapshot?.crypto.breadth : displayWeather.cryptoBreadth}% · {scope === "binance" ? binanceSnapshot?.crypto.rankedCount : displayWeather.cryptoCount} {en ? "eligible assets" : "个有效资产"}</span><div><i style={{ width: `${displayWeather.cryptoTemperature}%` }} /></div></article>
      <article><small>{scope === "binance" ? (en ? "Web3 tokenized stocks" : "Binance Web3 币股") : (en ? "Tokenized-stock temperature" : "币股温度")}</small><strong>{displayWeather.stockTemperature}</strong><span>{en ? "Breadth" : "上涨广度"} {scope === "binance" ? binanceSnapshot?.stocks.breadth : displayWeather.stockBreadth}% · {scope === "binance" ? `${binanceSnapshot?.stocks.pricedCount}/${binanceSnapshot?.stocks.catalogCount}` : displayWeather.stockCount} {en ? "priced samples" : "个报价样本"}</span><div><i style={{ width: `${displayWeather.stockTemperature}%` }} /></div></article>
      <article><small>{en ? "FOMO index" : "FOMO 指数"}</small><strong>{displayWeather.fomoIndex}</strong><span>{displayWeather.highVolatilityShare}% {en ? "of assets moved more than 5%" : "的资产振幅超过 5%"}</span><div><i style={{ width: `${displayWeather.fomoIndex}%` }} /></div></article>
      <article><small>{scope === "binance" ? (en ? "Binance breadth" : "Binance 上涨广度") : (en ? "Whole-market breadth" : "全市场广度")}</small><strong>{displayWeather.breadth}%</strong><span>{en ? "Median representative move" : "代表资产中位振幅"} {displayWeather.volatility.toFixed(2)}%</span><div><i style={{ width: `${displayWeather.breadth}%` }} /></div></article>
    </div>

    {scope === "binance" && binanceSnapshot ? <div className="binance-weather-rankings"><RankingPanel lane={binanceSnapshot.crypto} language={language} title={en ? "Binance crypto spot" : "Binance 加密现货"} /><RankingPanel lane={binanceSnapshot.stocks} language={language} title={en ? "Binance Web3 tokenized stocks" : "Binance Web3 · Ondo 链上币股"} /></div> : <div className="weather-mover-strip"><div><ChartLineUp size={20} /><span><strong>{en ? "Live leaders" : "实时领涨"}</strong><small>{en ? "Deduplicated by symbol; higher-volume venue quotes take priority" : "按代码去重，优先采用成交量更高的交易所报价"}</small></span></div><div>{displayWeather.topMovers.slice(0, 6).map((asset, index) => <span className="weather-mover" key={asset.id}><em>{index + 1}</em><AssetLogo asset={asset} size={25} /><span><b>{canonicalAssetSymbol(asset)}</b><small>{asset.venue}</small></span><strong>+{asset.change24h.toFixed(2)}%</strong></span>)}</div></div>}

    <div className="weather-report__grid">
      <article><Sparkle size={23} /><div><h3>{en ? "Three things that matter today" : "今天最重要的三件事"}</h3><ol>{displayWeather.highlights.map((item) => <li key={item}>{item}</li>)}</ol></div></article>
      <article><Binoculars size={23} /><div><h3>{en ? "Where the market is leaning" : "市场正在偏向哪里"}</h3><p>{displayWeather.breadth >= 58 ? (en ? "Advancers are the majority, but leader concentration still matters. Better breadth does not make every asset safe." : "上涨资产占多数，但领涨集中度仍值得观察；广度改善不等于每个标的都安全。") : displayWeather.breadth <= 42 ? (en ? "Decliners are the majority. Look for breadth repair before treating a bounce as a reversal." : "下跌资产占多数，先观察上涨广度是否修复，不急着把反弹当反转。") : (en ? "Advancers and decliners are near balance. This looks more like rotation than one market-wide direction." : "涨跌分布接近平衡，市场更像结构性轮动，不适合用一个方向概括全部资产。")}</p></div></article>
      <article><ShieldCheck size={23} /><div><h3>{en ? "Do not ignore this today" : "今天先别忽略什么"}</h3><ul>{displayWeather.watchouts.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
    </div>
    <div className="weather-report__summary"><WarningCircle size={22} /><p>{displayWeather.riskNote}</p></div>
    <div className="weather-report__actions">{scope === "binance" && copyText ? <button className="button button--secondary" onClick={() => void copyShareText()} type="button">{copied ? <CheckCircle size={18} /> : <Copy size={18} />}{copied ? (en ? "Copied" : "文案已复制") : (en ? "Copy rich post" : "复制丰富文案")}</button> : null}<ShareCardButton content={scope === "binance" && binanceSnapshot ? buildBinanceMarketShareContent(binanceSnapshot, language) : buildMarketShareContent(displayWeather, language)} /></div>
  </section></>;
}
