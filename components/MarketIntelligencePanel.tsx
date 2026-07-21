"use client";

import { ArrowsLeftRight, ChartLine, Database, Pulse, Waveform } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { formatCompact, formatPrice } from "@/services/format";
import type { MarketCandle, MarketIntelligence, MarketSpread, StreamingSummary } from "@/types/market";

const symbols = ["BTC", "ETH", "SOL"];

function chartPath(candles: MarketCandle[]) {
  if (candles.length < 2) return "";
  const closes = candles.map((candle) => candle.close);
  const low = Math.min(...closes);
  const high = Math.max(...closes);
  const range = high - low || 1;
  return candles.map((candle, index) => {
    const x = (index / (candles.length - 1)) * 600;
    const y = 145 - ((candle.close - low) / range) * 125;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

export function MarketIntelligencePanel({ spreads, streaming }: { spreads: MarketSpread[]; streaming?: StreamingSummary }) {
  const [symbol, setSymbol] = useState("BTC");
  const [data, setData] = useState<MarketIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setData(null);
    fetch(`/api/market-intelligence?symbol=${symbol}`, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Market intelligence unavailable");
        return response.json() as Promise<MarketIntelligence>;
      })
      .then((result) => setData(result))
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [symbol]);

  const path = useMemo(() => chartPath(data?.candles ?? []), [data?.candles]);
  const selectedSpread = spreads.find((item) => item.symbol === symbol && item.quoteCurrency === "USDT") ?? spreads[0];

  return (
    <section className="market-intelligence" aria-label="专业行情雷达">
      <div className="market-intelligence__header">
        <div><span><Pulse size={17} weight="duotone" /> Professional radar</span><h2>跨所价差与衍生品雷达</h2><p>价格、资金费率和持仓量都保留交易所口径，不做不可靠的简单相加。</p></div>
        <div className="market-intelligence__symbols" aria-label="专业数据资产">
          {symbols.map((item) => <button aria-pressed={symbol === item} key={item} onClick={() => setSymbol(item)} type="button">{item}</button>)}
        </div>
      </div>

      <div className="market-intelligence__grid">
        <article className="market-chart-card">
          <div className="market-card-heading"><span><ChartLine size={17} />{symbol} · 1小时 K 线</span><small>{data?.candleVenue ?? "等待官方数据"}</small></div>
          {path ? <svg aria-label={`${symbol} 最近 24 小时价格走势`} preserveAspectRatio="none" role="img" viewBox="0 0 600 160"><defs><linearGradient id="market-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".2"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path d={`${path} L600,160 L0,160 Z`} fill="url(#market-area)"/><path d={path} fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg> : <div className="market-radar-empty">{loading ? "正在读取 K 线…" : error ? "专业数据源暂不可用" : "暂无足够 K 线"}</div>}
          <div className="market-chart-card__footer"><span>{data?.candles.length ?? 0} 根 K 线</span><strong>标记价跨所差 {data ? data.markSpreadPct.toFixed(3) : "—"}%</strong></div>
        </article>

        <article className="market-spread-card">
          <div className="market-card-heading"><span><ArrowsLeftRight size={17} />现货跨所价差</span><small>{selectedSpread ? `${selectedSpread.venueCount} 个交易所` : "等待多源报价"}</small></div>
          {selectedSpread ? <><strong>{selectedSpread.symbol}<em>{selectedSpread.spreadPct.toFixed(3)}%</em></strong><div><span>低价 · {selectedSpread.lowVenue}<b>{formatPrice(selectedSpread.lowPrice)}</b></span><span>高价 · {selectedSpread.highVenue}<b>{formatPrice(selectedSpread.highPrice)}</b></span></div></> : <div className="market-radar-empty">暂无可比较的高流动性报价</div>}
          <p>展示价差不代表可套利；手续费、深度、充提状态和延迟都会改变结果。</p>
        </article>

        <article className="market-stream-card">
          <div className="market-card-heading"><span><Waveform size={17} />流式行情</span><small>{streaming ? `${streaming.lagMs}ms 延迟` : "REST 快照"}</small></div>
          <strong>{streaming ? `${streaming.quoteCount} 条` : "待连接"}<small>{streaming?.venues.join(" · ") ?? "配置 Railway 流服务后启用"}</small></strong>
          <div><Database size={17} /><span>Railway 流网关直接推送；Redis/KV 仅作为可选的短时回退层。</span></div>
        </article>
      </div>

      {data?.derivatives.length ? <div className="derivative-metrics">{data.derivatives.map((metric) => <article key={metric.venue}><span>{metric.venue}</span><strong>{formatPrice(metric.markPrice)}</strong><dl><div><dt>资金费率</dt><dd className={metric.fundingRate >= 0 ? "is-positive" : "is-negative"}>{(metric.fundingRate * 100).toFixed(4)}%</dd></div><div><dt>持仓名义价值</dt><dd>{metric.openInterestValue ? formatCompact(metric.openInterestValue) : "—"}</dd></div></dl></article>)}</div> : null}
    </section>
  );
}
