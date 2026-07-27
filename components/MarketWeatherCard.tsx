"use client";

import { ArrowClockwise, Binoculars, Broadcast, ChartLineUp, CloudSun, ShieldCheck, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { AssetLogo } from "@/components/AssetLogo";
import { fetchMarketFeed } from "@/services/marketProviders";
import { buildMarketWeather, canonicalAssetSymbol, type LiveMarketWeather } from "@/services/marketWeather";
import { localizeMarketWeather } from "@/services/localization";

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

export function MarketWeatherCard() {
  const { language } = useAppState();
  const en = language === "en";
  const [weather, setWeather] = useState<LiveMarketWeather | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshKey((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([fetchMarketFeed("crypto"), fetchMarketFeed("stocks")]).then(([cryptoResult, stockResult]) => {
      if (!active) return;
      const crypto = cryptoResult.status === "fulfilled" ? cryptoResult.value : null;
      const stocks = stockResult.status === "fulfilled" ? stockResult.value : null;
      if (!crypto && !stocks) {
        setFailed(true);
        setLoading(false);
        return;
      }
      setWeather(buildMarketWeather({
        cryptoAssets: crypto?.assets ?? [],
        stockAssets: stocks?.assets ?? [],
        cryptoProviders: crypto?.providers,
        stockProviders: stocks?.providers,
        cryptoMode: crypto?.mode ?? "fallback",
        stockMode: stocks?.mode ?? "fallback",
        updatedAt: [crypto?.updatedAt, stocks?.updatedAt].filter(Boolean).sort().at(-1),
      }));
      setFailed(false);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (!weather) {
    return (
      <section className="weather-report weather-report--empty">
        <CloudSun className={loading ? "spin" : ""} size={32} />
        <strong>{failed ? (en ? "Live markets are temporarily unavailable" : "实时行情暂时不可用") : (en ? "Reading whole-market weather" : "正在读取全市场天气")}</strong>
        <span>{failed ? (en ? "Older fixed content will not be presented as today's reading. Try again shortly." : "不会用旧日期的固定内容冒充今天；可以稍后重试。") : (en ? "Combining public crypto and tokenized-stock feeds in parallel." : "正在并行汇总币圈与币股公开行情。")}</span>
        {failed ? <button className="button button--secondary" onClick={() => setRefreshKey((value) => value + 1)} type="button"><ArrowClockwise size={17} />{en ? "Try again" : "重新读取"}</button> : null}
      </section>
    );
  }

  const displayWeather = localizeMarketWeather(weather, language);

  return (
    <section className="weather-report" data-tone={displayWeather.tone}>
      <div className="weather-report__hero">
        <img alt={en ? `${displayWeather.weather} market weather illustration` : `${displayWeather.weather}的市场天气插画`} src="/assets/market-weather.png" />
        <div className="weather-report__hero-copy"><span>{en ? "Live market weather" : "实时市场天气"}</span><h2>{displayWeather.weather}</h2><p>{displayWeather.headline}</p><div className="weather-report__sync"><Broadcast size={15} /><span>{displayWeather.liveProviders}/{displayWeather.totalProviders || "—"} {en ? "feeds live" : "个行情源在线"}</span><time dateTime={displayWeather.updatedAt}>{formatChinaDateTime(displayWeather.updatedAt, language)} {en ? "updated" : "更新"}</time><button disabled={loading} onClick={() => setRefreshKey((value) => value + 1)} type="button"><ArrowClockwise className={loading ? "spin" : ""} size={14} />{en ? "Refresh" : "刷新"}</button></div></div>
        <div className="weather-score"><strong>{displayWeather.score}</strong><span>/100</span><small>{displayWeather.mode === "live" ? (en ? "Live composite" : "实时综合温度") : displayWeather.mode === "partial" ? (en ? "Partly live" : "部分实时") : (en ? "Catalogue reference" : "目录参考")}</small></div>
      </div>

      <div className="weather-metric-grid">
        <article><small>{en ? "Crypto temperature" : "币圈温度"}</small><strong>{displayWeather.cryptoTemperature}</strong><span>{en ? "Breadth" : "上涨广度"} {displayWeather.cryptoBreadth}% · {displayWeather.cryptoCount} {en ? "deduplicated assets" : "个去重资产"}</span><div><i style={{ width: `${displayWeather.cryptoTemperature}%` }} /></div></article>
        <article><small>{en ? "Tokenized-stock temperature" : "币股温度"}</small><strong>{displayWeather.stockTemperature}</strong><span>{en ? "Breadth" : "上涨广度"} {displayWeather.stockBreadth}% · {displayWeather.stockCount} {en ? "deduplicated underlyings" : "个去重标的"}</span><div><i style={{ width: `${displayWeather.stockTemperature}%` }} /></div></article>
        <article><small>{en ? "FOMO index" : "FOMO 指数"}</small><strong>{displayWeather.fomoIndex}</strong><span>{displayWeather.highVolatilityShare}% {en ? "of assets moved more than 5%" : "的资产振幅超过 5%"}</span><div><i style={{ width: `${displayWeather.fomoIndex}%` }} /></div></article>
        <article><small>{en ? "Whole-market breadth" : "全市场广度"}</small><strong>{displayWeather.breadth}%</strong><span>{en ? "Median representative move" : "代表资产中位振幅"} {displayWeather.volatility.toFixed(2)}%</span><div><i style={{ width: `${displayWeather.breadth}%` }} /></div></article>
      </div>

      <div className="weather-mover-strip">
        <div><ChartLineUp size={20} /><span><strong>{en ? "Live leaders" : "实时领涨"}</strong><small>{en ? "Deduplicated by symbol; higher-volume venue quotes take priority" : "按代码去重，优先采用成交量更高的交易所报价"}</small></span></div>
        <div>{displayWeather.topMovers.slice(0, 6).map((asset, index) => <span className="weather-mover" key={asset.id}><em>{index + 1}</em><AssetLogo asset={asset} size={25} /><span><b>{canonicalAssetSymbol(asset)}</b><small>{asset.venue}</small></span><strong>+{asset.change24h.toFixed(2)}%</strong></span>)}</div>
      </div>

      <div className="weather-report__grid">
        <article><Sparkle size={23} /><div><h3>{en ? "Three things that matter today" : "今天最重要的三件事"}</h3><ol>{displayWeather.highlights.map((item) => <li key={item}>{item}</li>)}</ol></div></article>
        <article><Binoculars size={23} /><div><h3>{en ? "Where the market is leaning" : "市场正在偏向哪里"}</h3><p>{displayWeather.breadth >= 58 ? (en ? "Advancers are the majority, but leader concentration still matters. Better breadth does not make every asset safe." : "上涨资产占多数，但领涨集中度仍值得观察；广度改善不等于每个标的都安全。") : displayWeather.breadth <= 42 ? (en ? "Decliners are the majority. Look for cross-venue repair before treating a bounce as a reversal." : "下跌资产占多数，先观察是否出现跨平台同步修复，不急着把反弹当反转。") : (en ? "Advancers and decliners are near balance. This looks more like rotation than one market-wide direction." : "涨跌分布接近平衡，市场更像结构性轮动，不适合用一个方向概括全部资产。")}</p></div></article>
        <article><ShieldCheck size={23} /><div><h3>{en ? "Do not ignore this today" : "今天先别忽略什么"}</h3><ul>{displayWeather.watchouts.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
      </div>
      <div className="weather-report__summary"><WarningCircle size={22} /><p>{displayWeather.riskNote}</p></div>
    </section>
  );
}
