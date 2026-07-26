"use client";

import { ArrowClockwise, Binoculars, Broadcast, ChartLineUp, CloudSun, ShieldCheck, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { AssetLogo } from "@/components/AssetLogo";
import { fetchMarketFeed } from "@/services/marketProviders";
import { buildMarketWeather, canonicalAssetSymbol, type LiveMarketWeather } from "@/services/marketWeather";

function formatChinaDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
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
        <strong>{failed ? "实时行情暂时不可用" : "正在读取全市场天气"}</strong>
        <span>{failed ? "不会用旧日期的固定内容冒充今天；可以稍后重试。" : "正在并行汇总币圈与币股公开行情。"}</span>
        {failed ? <button className="button button--secondary" onClick={() => setRefreshKey((value) => value + 1)} type="button"><ArrowClockwise size={17} />重新读取</button> : null}
      </section>
    );
  }

  return (
    <section className="weather-report" data-tone={weather.tone}>
      <div className="weather-report__hero">
        <img alt={`${weather.weather}的市场天气插画`} src="/assets/market-weather.png" />
        <div className="weather-report__hero-copy"><span>实时市场天气</span><h2>{weather.weather}</h2><p>{weather.headline}</p><div className="weather-report__sync"><Broadcast size={15} /><span>{weather.liveProviders}/{weather.totalProviders || "—"} 个行情源在线</span><time dateTime={weather.updatedAt}>{formatChinaDateTime(weather.updatedAt)} 更新</time><button disabled={loading} onClick={() => setRefreshKey((value) => value + 1)} type="button"><ArrowClockwise className={loading ? "spin" : ""} size={14} />刷新</button></div></div>
        <div className="weather-score"><strong>{weather.score}</strong><span>/100</span><small>{weather.mode === "live" ? "实时综合温度" : weather.mode === "partial" ? "部分实时" : "目录参考"}</small></div>
      </div>

      <div className="weather-metric-grid">
        <article><small>币圈温度</small><strong>{weather.cryptoTemperature}</strong><span>上涨广度 {weather.cryptoBreadth}% · {weather.cryptoCount} 个去重资产</span><div><i style={{ width: `${weather.cryptoTemperature}%` }} /></div></article>
        <article><small>币股温度</small><strong>{weather.stockTemperature}</strong><span>上涨广度 {weather.stockBreadth}% · {weather.stockCount} 个去重标的</span><div><i style={{ width: `${weather.stockTemperature}%` }} /></div></article>
        <article><small>FOMO 指数</small><strong>{weather.fomoIndex}</strong><span>{weather.highVolatilityShare}% 的资产振幅超过 5%</span><div><i style={{ width: `${weather.fomoIndex}%` }} /></div></article>
        <article><small>全市场广度</small><strong>{weather.breadth}%</strong><span>代表资产中位振幅 {weather.volatility.toFixed(2)}%</span><div><i style={{ width: `${weather.breadth}%` }} /></div></article>
      </div>

      <div className="weather-mover-strip">
        <div><ChartLineUp size={20} /><span><strong>实时领涨</strong><small>按代码去重，优先采用成交量更高的交易所报价</small></span></div>
        <div>{weather.topMovers.slice(0, 6).map((asset, index) => <span className="weather-mover" key={asset.id}><em>{index + 1}</em><AssetLogo asset={asset} size={25} /><span><b>{canonicalAssetSymbol(asset)}</b><small>{asset.venue}</small></span><strong>+{asset.change24h.toFixed(2)}%</strong></span>)}</div>
      </div>

      <div className="weather-report__grid">
        <article><Sparkle size={23} /><div><h3>今天最重要的三件事</h3><ol>{weather.highlights.map((item) => <li key={item}>{item}</li>)}</ol></div></article>
        <article><Binoculars size={23} /><div><h3>市场正在偏向哪里</h3><p>{weather.breadth >= 58 ? "上涨资产占多数，但领涨集中度仍值得观察；广度改善不等于每个标的都安全。" : weather.breadth <= 42 ? "下跌资产占多数，先观察是否出现跨平台同步修复，不急着把反弹当反转。" : "涨跌分布接近平衡，市场更像结构性轮动，不适合用一个方向概括全部资产。"}</p></div></article>
        <article><ShieldCheck size={23} /><div><h3>今天先别忽略什么</h3><ul>{weather.watchouts.map((item) => <li key={item}>{item}</li>)}</ul></div></article>
      </div>
      <div className="weather-report__summary"><WarningCircle size={22} /><p>{weather.riskNote}</p></div>
    </section>
  );
}
