"use client";

import {
  ArrowRight,
  Brain,
  CalendarDots,
  ChartLineUp,
  CheckCircle,
  CloudSun,
  FirstAid,
  Leaf,
  Newspaper,
  ShieldCheck,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { AssetRow } from "@/components/AssetRow";
import { FeatureCard } from "@/components/FeatureCard";
import { MarketTemperatureCard } from "@/components/MarketTemperatureCard";
import { allAssets, cryptoData, marketSnapshot, stockData } from "@/data/market";
import { buildAssetCalmPrompt } from "@/services/aiAnalysis";
import { fetchMarketFeed } from "@/services/marketProviders";
import type { MarketAsset } from "@/types/market";

const fallbackPreviewAssets = [cryptoData[0], cryptoData[1], stockData[2], stockData[1]];

function Hero() {
  return (
    <section className="home-hero">
      <img alt="平静海岸与灯塔" className="home-hero__landscape" src="/assets/calm-coast.png" />
      <h1>普通人也能看懂的 AI 行情站</h1>
      <p>看币股、看币圈、看热点，也看自己有没有上头。Stone Daily 不喊单，不承诺收益，只帮你把市场翻译成人话。</p>
      <div className="home-hero__actions">
        <Link className="button button--primary" href="/markets"><ChartLineUp size={19} />看实时行情</Link>
        <Link className="button button--secondary" href="/weather"><CloudSun size={19} />今日市场天气</Link>
        <Link className="button button--soft" href="/regret"><FirstAid size={19} />帮我冷静一下</Link>
      </div>
      <div className="home-hero__meta"><span>2026 年 7 月 21 日</span><span>行情源状态以页面标识为准</span></div>
    </section>
  );
}

function BriefDashboard({ previewAssets, feedLabel }: { previewAssets: MarketAsset[]; feedLabel: string }) {
  const { watchlistIds, toggleWatchlist } = useAppState();
  return (
    <section className="brief-dashboard" aria-label="今日市场总览">
      <div className="brief-dashboard__main">
        <article className="weather-brief">
          <img alt="多云偏暖" src="/assets/market-weather.png" />
          <div className="weather-brief__copy"><span>今日市场天气</span><h2>{marketSnapshot.weather}</h2><p>{marketSnapshot.headline}</p></div>
          <div className="weather-brief__score"><strong>58</strong><span>/100</span><small>中性偏乐观</small></div>
          <div className="weather-brief__stats"><span><small>币股温度</small><strong>62 · 偏热</strong></span><span><small>币圈温度</small><strong>58 · 正常偏热</strong></span><span><small>FOMO 指数</small><strong>34 · 平静</strong></span></div>
        </article>
        <div className="market-preview">
          <div className="section-heading"><div><span>市场速览 · {feedLabel}</span><h2>AI 一句话状态</h2></div><Link href="/markets">查看全部资产 <ArrowRight size={16} /></Link></div>
          <div className="market-preview__rows">
            {previewAssets.map((asset) => <AssetRow asset={asset} compact isWatched={watchlistIds.includes(asset.id)} key={asset.id} onCalm={() => { window.location.href = `/regret?text=${encodeURIComponent(buildAssetCalmPrompt(asset))}`; }} onExplain={() => { window.location.href = "/markets"; }} onToggleWatchlist={toggleWatchlist} />)}
          </div>
        </div>
      </div>
      <aside className="risk-rail">
        <div className="risk-rail__title"><WarningCircle size={21} /><h2>今日上头提醒</h2></div>
        <div className="risk-score"><span>情绪温度</span><strong>62<small>/100</small></strong><div className="meter"><span style={{ width: "62%" }} /></div><p>有点兴奋，记得控制仓位与预期。</p></div>
        <div className="risk-list"><h3>主要风险关注</h3><p><strong>地缘局势反复</strong><span>短线情绪更易扰动。</span></p><p><strong>通胀数据反复</strong><span>利率路径仍有不确定性。</span></p><p><strong>热门叙事拥挤</strong><span>部分板块波动正在放大。</span></p></div>
        <blockquote>“趋势未坏，节奏放慢，守住计划。”</blockquote>
        <Link className="risk-rail__action" href="/regret"><CheckCircle size={19} /><span><strong>先复盘，再决定</strong><small>花 5 分钟检查自己的理由</small></span><ArrowRight size={16} /></Link>
      </aside>
    </section>
  );
}

function LensDashboard({ previewAssets }: { previewAssets: MarketAsset[] }) {
  return (
    <section className="lens-dashboard" aria-label="信号透镜">
      <article className="plain-briefing">
        <div className="section-heading"><div><span>Stone Daily AI 生成</span><h2>今天的市场，人话版</h2></div><span className="status-tag">AI 早报</span></div>
        <p className="plain-briefing__lead">关税落地与降息预期拉扯，市场先抑后稳。科技类币股跟随基础股票反弹；加密市场资金回流主流币，但分区轮动明显，FOMO 指数回落。</p>
        <div className="plain-briefing__points"><article><ChartLineUp size={21} /><div><h3>发生了什么</h3><p>大盘科技股对超预期数据作出反应，加密市场出现温和轮动。</p></div></article><article><Sparkle size={21} /><div><h3>为什么会这样</h3><p>政策不确定性被风险偏好对冲，但企业盈利预期仍有分歧。</p></div></article><article><ShieldCheck size={21} /><div><h3>别过度解读</h3><p>一次数据不决定趋势，反弹也不等于反转。</p></div></article></div>
        <div className="plain-briefing__note"><Leaf size={18} />风险提醒：保持分散，给决定留一点缓冲。</div>
      </article>
      <aside className="lens-meters">
        <MarketTemperatureCard detail="基础股票、代币结构与交易所流动性共同影响价格。" label="币股温度" value={62} />
        <MarketTemperatureCard detail="资金回流主流币，波动偏温。" label="币圈温度" value={58} />
        <MarketTemperatureCard detail="讨论热度回落，适合按计划执行。" kind="fomo" label="FOMO 指数" value={34} />
      </aside>
      <div className="ticker-rail">{previewAssets.map((asset) => <span key={asset.id}><small>{asset.symbol}</small><strong>{asset.price.toLocaleString()}</strong><em className={asset.change24h >= 0 ? "is-positive" : "is-negative"}>{asset.change24h >= 0 ? "+" : ""}{asset.change24h}%</em></span>)}</div>
      <div className="lens-table"><div className="section-heading"><div><span>核心资产</span><h2>不只看涨跌，也看信号质量</h2></div><Link href="/markets">完整行情 <ArrowRight size={16} /></Link></div>{previewAssets.map((asset) => <div className="lens-row" key={asset.id}><strong>{asset.symbol}</strong><span>{asset.name}</span><em>{asset.change24h >= 0 ? "+" : ""}{asset.change24h}%</em><p>{asset.aiHint}</p><span className="status-tag">{asset.aiTag}</span></div>)}</div>
    </section>
  );
}

function CalmDashboard({ cryptoAssets, stockAssets }: { cryptoAssets: MarketAsset[]; stockAssets: MarketAsset[] }) {
  return (
    <section className="calm-dashboard" aria-label="冷静打卡">
      <article className="calm-checkin">
        <img alt="多云偏暖" src="/assets/market-weather.png" />
        <div className="calm-checkin__weather"><strong>多云偏平静</strong><span>整体温和，局部分化</span></div>
        <div className="calm-checkin__main"><h2>今天的市场，会让你上头吗？</h2><div className="calm-meter"><span>我的 FOMO 指数</span><strong>32<small>/100</small></strong><div className="meter"><span style={{ width: "32%" }} /></div><div><small>理性</small><small>中性</small><small>容易上头</small></div></div></div>
        <div className="calm-checkin__quote"><span>AI 今日一句话</span><p>{marketSnapshot.headline}</p></div>
        <div className="calm-checkin__bottom"><p><ShieldCheck size={17} />行情只是信息，不是行动指令。先看清，再决定。</p><Link href="/regret"><FirstAid size={17} />后悔药按钮</Link></div>
      </article>
      <div className="calm-markets"><MarketMini title="币股" assets={stockAssets.slice(0, 4)} /><MarketMini title="币圈" assets={cryptoAssets.slice(0, 4)} /></div>
      <Link className="detox-strip" href="/detox"><span className="detox-strip__icon"><Brain size={26} weight="duotone" /></span><span><strong>热点拆弹器</strong><small>把让你心动的“暴论”交给 AI，拆出事实、推测与情绪。</small></span><span className="detox-strip__input">把你看到的热点观点贴在这里…</span><span className="button button--warning">拆解一下</span></Link>
    </section>
  );
}

function MarketMini({ title, assets }: { title: string; assets: typeof allAssets }) {
  return <section className="market-mini"><div className="section-heading"><div><span>盘中更新</span><h2>{title}</h2></div><Link href="/markets">更多 <ArrowRight size={14} /></Link></div>{assets.map((asset) => <div className="market-mini__row" key={asset.id}><span className={`asset-avatar asset-avatar--${asset.market}`}>{asset.symbol[0]}</span><span><strong>{asset.symbol}</strong><small>{asset.name}</small></span><strong>${asset.price.toLocaleString()}</strong><em className={asset.change24h >= 0 ? "is-positive" : "is-negative"}>{asset.change24h >= 0 ? "+" : ""}{asset.change24h}%</em><p>{asset.aiHint}</p></div>)}</section>;
}

export function HomeDashboard() {
  const { mode } = useAppState();
  const [previewAssets, setPreviewAssets] = useState<MarketAsset[]>(fallbackPreviewAssets);
  const [cryptoAssets, setCryptoAssets] = useState<MarketAsset[]>(cryptoData.slice(0, 4));
  const [stockAssets, setStockAssets] = useState<MarketAsset[]>(stockData.slice(0, 4));
  const [feedLabel, setFeedLabel] = useState("行情状态检查中");

  useEffect(() => {
    let active = true;
    Promise.all([fetchMarketFeed("crypto"), fetchMarketFeed("stocks")])
      .then(([cryptoFeed, stockFeed]) => {
        if (!active) return;
        const liveCrypto = cryptoFeed.assets;
        const availableStocks = stockFeed.assets;
        const btc = liveCrypto.find((asset) => asset.symbol === "BTC") ?? liveCrypto[0];
        const eth = liveCrypto.find((asset) => asset.symbol === "ETH") ?? liveCrypto[1];
        const nvda = availableStocks.find((asset) => asset.symbol.toUpperCase().includes("NVDA")) ?? availableStocks[0];
        const qqq = availableStocks.find((asset) => asset.symbol.toUpperCase().includes("QQQ")) ?? availableStocks[1];
        setCryptoAssets(liveCrypto.slice(0, 4));
        setStockAssets(availableStocks.slice(0, 4));
        setPreviewAssets([btc, eth, nvda, qqq].filter((asset): asset is MarketAsset => Boolean(asset)));
        const cryptoSources = cryptoFeed.providers?.filter((provider) => provider.status === "live").length ?? 0;
        const stockSources = stockFeed.providers?.filter((provider) => provider.status === "live").length ?? 0;
        const cryptoLabel = cryptoFeed.mode === "live" ? `币圈 ${cryptoSources} 源准实时` : cryptoFeed.mode === "cached" ? "币圈官方缓存" : "币圈演示";
        const stockLabel = stockFeed.mode === "live" ? `币股 ${stockSources} 源准实时` : stockFeed.mode === "cached" ? "币股官方缓存" : "币股演示";
        setFeedLabel(`${cryptoLabel} · ${stockLabel}`);
      })
      .catch(() => {
        if (active) setFeedLabel("演示行情");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Hero />
      {mode === "brief" ? <BriefDashboard feedLabel={feedLabel} previewAssets={previewAssets} /> : mode === "lens" ? <LensDashboard previewAssets={previewAssets} /> : <CalmDashboard cryptoAssets={cryptoAssets} stockAssets={stockAssets} />}
      <section className="daily-entry-grid" aria-label="每日内容入口">
        <Link className="daily-entry-card daily-entry-card--hot" href="/hotspots"><span><Newspaper size={24} weight="duotone" /></span><div><small>Daily pulse</small><h2>每日热点</h2><p>三分钟看懂今天真正影响币股、币圈和市场情绪的主线。</p></div><ArrowRight size={18} /></Link>
        <Link className="daily-entry-card" href="/today"><span><CalendarDots size={24} weight="duotone" /></span><div><small>Market memory</small><h2>历史上的今天</h2><p>从过去的制度、危机和周期里，找到理解今天的参照物。</p></div><ArrowRight size={18} /></Link>
      </section>
      <section className="home-section"><div className="section-intro"><span>三件事，足够了</span><h2>看懂行情，拆掉噪音，拦住冲动</h2><p>Stone Daily 不试图替你决定，只把信息变得更清楚，把情绪变得更可见。</p></div><div className="feature-grid"><FeatureCard Icon={ChartLineUp} number="01" title="全市场行情搜索">覆盖币圈与币股目录，并明确区分现货、链上代币和永续合约。</FeatureCard><FeatureCard Icon={Brain} number="02" title="AI 涨跌解释">不只告诉你动了多少，还用人话解释可能原因和常见误区。</FeatureCard><FeatureCard Icon={FirstAid} number="03" title="后悔药按钮">做决定之前，让未来的自己回来提醒现在的自己。</FeatureCard></div></section>
      <section className="principles"><div><span>我们的原则</span><h2>先保护理解，再谈速度</h2></div><ul><li><CheckCircle size={19} />不提供投资建议</li><li><CheckCircle size={19} />不承诺任何收益</li><li><CheckCircle size={19} />不制造焦虑</li><li><CheckCircle size={19} />不替用户做决定</li><li><CheckCircle size={19} />只帮助理解信息、识别风险、延迟冲动</li></ul></section>
    </>
  );
}
