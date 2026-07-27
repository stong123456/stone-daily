"use client";

import {
  ArrowRight,
  Brain,
  CalendarCheck,
  CalendarDots,
  ChartLineUp,
  CheckCircle,
  CloudSun,
  FirstAid,
  Leaf,
  Newspaper,
  ShieldCheck,
  Sparkle,
  Star,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { AssetLogo } from "@/components/AssetLogo";
import { FeatureCard } from "@/components/FeatureCard";
import { MarketTemperatureCard } from "@/components/MarketTemperatureCard";
import { allAssets, cryptoData, stockData } from "@/data/market";
import { formatPercent, formatPrice } from "@/services/format";
import { fetchMarketFeed } from "@/services/marketProviders";
import { buildMarketWeather, type LiveMarketWeather } from "@/services/marketWeather";
import { localizeAssetCopy, localizeMarketWeather } from "@/services/localization";
import type { MarketAsset } from "@/types/market";

const fallbackPreviewAssets = [cryptoData[0], cryptoData[1], cryptoData[2], stockData[2], stockData[3]];
const fallbackWeather = buildMarketWeather({ cryptoAssets: cryptoData, stockAssets: stockData, cryptoMode: "fallback", stockMode: "fallback" });

function Hero() {
  const { language } = useAppState();
  const en = language === "en";
  return (
    <section className="home-hero">
      <img alt={en ? "A calm coast and lighthouse" : "平静海岸与灯塔"} className="home-hero__landscape" src="/assets/calm-coast.png" />
      <div className="home-hero__copy"><h1>{en ? "AI market intelligence, made understandable" : "普通人也能看懂的 AI 行情站"}</h1><p>{en ? "Follow tokenized stocks, crypto and daily market stories—while noticing when emotion takes over. Stone Daily does not issue calls or promise returns; it translates the market into plain language." : "看币股、看币圈、看热点，也看自己有没有上头。Stone Daily 不喊单，不承诺收益，只帮你把市场翻译成人话。"}</p></div>
      <div className="home-hero__actions">
        <Link className="button button--primary" href="/markets"><ChartLineUp size={19} />{en ? "Open live markets" : "看实时行情"}</Link>
        <Link className="button button--secondary" href="/weather"><CloudSun size={19} />{en ? "Market weather" : "今日市场天气"}</Link>
        <Link className="button button--soft" href="/regret"><FirstAid size={19} />{en ? "Help me pause" : "帮我冷静一下"}</Link>
      </div>
      <div className="home-hero__meta"><span>{en ? "Live updates · Beijing time" : "北京时间实时更新"}</span><span>{en ? "Refer to each page for feed status" : "行情源状态以页面标识为准"}</span></div>
    </section>
  );
}

function HomeMarketSpotlight({ assets, feedLabel, weather }: { assets: MarketAsset[]; feedLabel: string; weather: LiveMarketWeather }) {
  const { language, watchlistIds, toggleWatchlist } = useAppState();
  const en = language === "en";
  return (
    <section className="home-market-spotlight" aria-labelledby="home-live-market-title">
      <div className="home-market-spotlight__table" role="table" aria-label={en ? "Live market quotes" : "实时市场行情"}>
        <header className="home-market-spotlight__header">
          <div>
            <h2 id="home-live-market-title">{en ? "Live markets" : "实时行情"}</h2>
            <span className="home-market-spotlight__status"><i />{en ? "Live data updating" : "数据实时更新中"}</span>
            <small>{feedLabel}</small>
          </div>
          <Link href="/markets">{en ? "View all markets" : "查看全部行情"} <ArrowRight size={16} /></Link>
        </header>
        <div className="home-market-spotlight__head" role="row">
          <span role="columnheader">{en ? "Asset" : "资产"}</span><span role="columnheader">{en ? "Price (USD)" : "价格 (USD)"}</span><span role="columnheader">{en ? "24H change" : "24H 涨跌"}</span><span role="columnheader">{en ? "Source / venue" : "来源 / 交易所"}</span><span role="columnheader">{en ? "AI signal (plain language)" : "AI 信号（简明解读）"}</span><span role="columnheader">{en ? "Actions" : "操作"}</span>
        </div>
        <div className="home-market-spotlight__rows">
          {assets.map((asset) => {
            const copy = localizeAssetCopy(asset, language);
            return (
            <div className="home-market-spotlight__row" key={asset.id} role="row">
              <div className="home-market-spotlight__asset" role="cell"><AssetLogo asset={asset} size={32} /><span><strong>{asset.symbol}</strong><small>{copy.name}</small></span></div>
              <div className="home-market-spotlight__price" role="cell"><strong>{formatPrice(asset.price)}</strong><small>{copy.narrative}</small></div>
              <strong className={asset.change24h >= 0 ? "is-positive" : "is-negative"} role="cell">{formatPercent(asset.change24h)}</strong>
              <span className="home-market-spotlight__venue" role="cell">{asset.venue ?? (asset.market === "crypto" ? (en ? "Multi-venue aggregate" : "多交易所聚合") : (en ? "Tokenized-stock aggregate" : "币股聚合"))}</span>
              <div className="home-market-spotlight__signal" role="cell"><span className="status-tag">{copy.aiTag}</span><small>{copy.aiHint}</small></div>
              <div className="home-market-spotlight__actions" role="cell">
                <Link className="row-action" href="/markets"><Brain size={15} />{en ? "AI brief" : "AI 解读"}</Link>
                <button aria-label={watchlistIds.includes(asset.id) ? (en ? `Remove ${asset.symbol} from watchlist` : `移除 ${asset.symbol} 自选`) : (en ? `Add ${asset.symbol} to watchlist` : `将 ${asset.symbol} 加入自选`)} className="row-action row-action--icon" data-active={watchlistIds.includes(asset.id)} onClick={() => toggleWatchlist(asset.id)} type="button"><Star size={16} weight={watchlistIds.includes(asset.id) ? "fill" : "regular"} /></button>
              </div>
            </div>
          )})}
        </div>
        <div className="home-market-spotlight__foot"><span>{en ? "Add more assets and build a watchlist stored on this device." : "支持自选与更多资产添加，创建你自己的关注列表。"}</span><Link href="/markets">{en ? "Manage watchlist" : "自选管理"} <ArrowRight size={14} /></Link></div>
      </div>
      <aside className="home-market-spotlight__metrics" aria-label={en ? "Live market metrics" : "实时市场指标"}>
        <article><small>{en ? "Market breadth" : "市场广度"}</small><strong>{weather.breadth}<span>/100</span></strong><div className="meter"><span style={{ width: `${weather.breadth}%` }} /></div><p>{en ? "Tokenized stocks" : "币股"} {weather.stockBreadth}% · {en ? "Crypto" : "币圈"} {weather.cryptoBreadth}%</p></article>
        <article><small>{en ? "Sentiment temperature" : "情绪温度"}</small><strong>{weather.score}<span>/100</span></strong><div className="meter"><span style={{ width: `${weather.score}%` }} /></div><p>{weather.weather}</p></article>
        <article className="home-market-spotlight__fomo"><small>{en ? "FOMO index" : "FOMO 指数"}</small><strong>{weather.fomoIndex}<span>/100</span></strong><em>{weather.fomoIndex >= 70 ? (en ? "Hot" : "偏热") : weather.fomoIndex >= 45 ? (en ? "Neutral" : "中性") : (en ? "Calm" : "平静")}</em><div className="meter"><span style={{ width: `${weather.fomoIndex}%` }} /></div><p>{weather.headline}</p></article>
        <Link href="/weather">{en ? "More market data" : "更多市场数据"} <ArrowRight size={14} /></Link>
      </aside>
    </section>
  );
}

function BriefDashboard({ weather }: { weather: LiveMarketWeather }) {
  const { language } = useAppState();
  const en = language === "en";
  return (
    <section className="brief-dashboard" aria-label={en ? "Today's market overview" : "今日市场总览"}>
      <div className="brief-dashboard__main">
        <article className="weather-brief">
          <img alt={weather.weather} src="/assets/market-weather.png" />
          <div className="weather-brief__copy"><span>{en ? "Live market weather" : "实时市场天气"}</span><h2>{weather.weather}</h2><p>{weather.headline}</p></div>
          <div className="weather-brief__score"><strong>{weather.score}</strong><span>/100</span><small>{weather.mode === "live" ? (en ? "Live composite" : "实时综合温度") : (en ? "Market reference" : "行情参考")}</small></div>
          <div className="weather-brief__stats"><span><small>{en ? "Tokenized-stock temperature" : "币股温度"}</small><strong>{weather.stockTemperature} · {en ? "Breadth" : "广度"} {weather.stockBreadth}%</strong></span><span><small>{en ? "Crypto temperature" : "币圈温度"}</small><strong>{weather.cryptoTemperature} · {en ? "Breadth" : "广度"} {weather.cryptoBreadth}%</strong></span><span><small>{en ? "FOMO index" : "FOMO 指数"}</small><strong>{weather.fomoIndex} · {en ? "Median move" : "振幅"} {weather.volatility}%</strong></span></div>
        </article>
      </div>
      <aside className="risk-rail">
        <div className="risk-rail__title"><WarningCircle size={21} /><h2>{en ? "Today's impulse check" : "今日上头提醒"}</h2></div>
        <div className="risk-score"><span>{en ? "Sentiment temperature" : "情绪温度"}</span><strong>{weather.fomoIndex}<small>/100</small></strong><div className="meter"><span style={{ width: `${weather.fomoIndex}%` }} /></div><p>{en ? "Energy is elevated. Keep size and expectations inside your plan." : "有点兴奋，记得控制仓位与预期。"}</p></div>
        <div className="risk-list"><h3>{en ? "Main risks to watch" : "主要风险关注"}</h3><p><strong>{en ? "Cross-market dispersion" : "跨市场分化"}</strong><span>{en ? "One venue may not represent the whole market." : "单一平台不代表全市场。"}</span></p><p><strong>{en ? "Volatility expansion" : "振幅扩大"}</strong><span>{en ? "Fast moves can magnify poor entries." : "快速波动会放大错误入场。"}</span></p><p><strong>{en ? "Crowded narratives" : "热门叙事拥挤"}</strong><span>{en ? "Popularity is not confirmation." : "热度不等于趋势确认。"}</span></p></div>
        <blockquote>{en ? "“The trend may be intact. Slow the pace and protect the plan.”" : "“趋势未坏，节奏放慢，守住计划。”"}</blockquote>
        <Link className="risk-rail__action" href="/regret"><CheckCircle size={19} /><span><strong>{en ? "Review first, decide second" : "先复盘，再决定"}</strong><small>{en ? "Take five minutes to test your reasons" : "花 5 分钟检查自己的理由"}</small></span><ArrowRight size={16} /></Link>
      </aside>
    </section>
  );
}

function LensDashboard({ previewAssets, weather }: { previewAssets: MarketAsset[]; weather: LiveMarketWeather }) {
  const { language } = useAppState();
  const en = language === "en";
  return (
    <section className="lens-dashboard" aria-label={en ? "Signal lens" : "信号透镜"}>
      <article className="plain-briefing">
        <div className="section-heading"><div><span>{en ? "Generated by Stone Daily AI" : "Stone Daily AI 生成"}</span><h2>{en ? "Today's market, in plain language" : "今天的市场，人话版"}</h2></div><span className="status-tag">{en ? "AI brief" : "AI 早报"}</span></div>
        <p className="plain-briefing__lead">{weather.headline}</p>
        <div className="plain-briefing__points"><article><ChartLineUp size={21} /><div><h3>{en ? "What happened" : "发生了什么"}</h3><p>{en ? `Breadth is ${weather.breadth}% and the median representative move is ${weather.volatility}%.` : `全市场上涨广度 ${weather.breadth}%，代表资产中位振幅 ${weather.volatility}%。`}</p></div></article><article><Sparkle size={21} /><div><h3>{en ? "What may matter" : "可能相关的因素"}</h3><p>{en ? "Venue flows, product structure and macro expectations can move together, but correlation is not proof of cause." : "平台资金、产品结构与宏观预期可能共同作用，但相关不等于因果。"}</p></div></article><article><ShieldCheck size={21} /><div><h3>{en ? "Do not overread it" : "别过度解读"}</h3><p>{en ? "One data point does not define a trend, and a rebound is not automatically a reversal." : "一次数据不决定趋势，反弹也不等于反转。"}</p></div></article></div>
        <div className="plain-briefing__note"><Leaf size={18} />{en ? "Risk note: stay diversified and leave room between information and action." : "风险提醒：保持分散，给决定留一点缓冲。"}</div>
      </article>
      <aside className="lens-meters">
        <MarketTemperatureCard detail={en ? `Breadth ${weather.stockBreadth}%; underlying symbols deduplicated.` : `上涨广度 ${weather.stockBreadth}%，基础标的已去重。`} label={en ? "Tokenized stocks" : "币股温度"} value={weather.stockTemperature} />
        <MarketTemperatureCard detail={en ? `Breadth ${weather.cryptoBreadth}%; symbols deduplicated.` : `上涨广度 ${weather.cryptoBreadth}%，币种代码已去重。`} label={en ? "Crypto" : "币圈温度"} value={weather.cryptoTemperature} />
        <MarketTemperatureCard detail={en ? `${weather.highVolatilityShare}% of representative assets moved more than 5%.` : `${weather.highVolatilityShare}% 的代表资产振幅超过 5%。`} kind="fomo" label={en ? "FOMO index" : "FOMO 指数"} value={weather.fomoIndex} />
      </aside>
      <div className="ticker-rail">{previewAssets.map((asset) => <span key={asset.id}><small>{asset.symbol}</small><strong>{asset.price.toLocaleString()}</strong><em className={asset.change24h >= 0 ? "is-positive" : "is-negative"}>{asset.change24h >= 0 ? "+" : ""}{asset.change24h}%</em></span>)}</div>
      <div className="lens-table"><div className="section-heading"><div><span>{en ? "Core assets" : "核心资产"}</span><h2>{en ? "Signal quality matters as much as direction" : "不只看涨跌，也看信号质量"}</h2></div><Link href="/markets">{en ? "Full markets" : "完整行情"} <ArrowRight size={16} /></Link></div>{previewAssets.map((asset) => { const copy = localizeAssetCopy(asset, language); return <div className="lens-row" key={asset.id}><strong>{asset.symbol}</strong><span>{copy.name}</span><em>{asset.change24h >= 0 ? "+" : ""}{asset.change24h}%</em><p>{copy.aiHint}</p><span className="status-tag">{copy.aiTag}</span></div>; })}</div>
    </section>
  );
}

function CalmDashboard({ cryptoAssets, stockAssets, weather }: { cryptoAssets: MarketAsset[]; stockAssets: MarketAsset[]; weather: LiveMarketWeather }) {
  const { language } = useAppState();
  const en = language === "en";
  return (
    <section className="calm-dashboard" aria-label={en ? "Calm check-in" : "冷静打卡"}>
      <article className="calm-checkin">
        <img alt={weather.weather} src="/assets/market-weather.png" />
        <div className="calm-checkin__weather"><strong>{weather.weather}</strong><span>{en ? "Market breadth" : "全市场上涨广度"} {weather.breadth}%</span></div>
        <div className="calm-checkin__main"><h2>{en ? "Could today's market pull you into an impulsive decision?" : "今天的市场，会让你上头吗？"}</h2><div className="calm-meter"><span>{en ? "Market FOMO index" : "市场 FOMO 指数"}</span><strong>{weather.fomoIndex}<small>/100</small></strong><div className="meter"><span style={{ width: `${weather.fomoIndex}%` }} /></div><div><small>{en ? "Clear" : "理性"}</small><small>{en ? "Neutral" : "中性"}</small><small>{en ? "Impulsive" : "容易上头"}</small></div></div></div>
        <div className="calm-checkin__quote"><span>{en ? "One line from AI" : "AI 今日一句话"}</span><p>{weather.headline}</p></div>
        <div className="calm-checkin__bottom"><p><ShieldCheck size={17} />{en ? "A quote is information, not an instruction. Understand first, decide second." : "行情只是信息，不是行动指令。先看清，再决定。"}</p><Link href="/regret"><FirstAid size={17} />{en ? "Pause button" : "后悔药按钮"}</Link></div>
      </article>
      <div className="calm-markets"><MarketMini title={en ? "Tokenized stocks" : "币股"} assets={stockAssets.slice(0, 4)} /><MarketMini title={en ? "Crypto" : "币圈"} assets={cryptoAssets.slice(0, 4)} /></div>
      <Link className="detox-strip" href="/detox"><span className="detox-strip__icon"><Brain size={26} weight="duotone" /></span><span><strong>{en ? "Hype detox" : "热点拆弹器"}</strong><small>{en ? "Give AI a bold claim and separate its facts, inference and emotional pressure." : "把让你心动的“暴论”交给 AI，拆出事实、推测与情绪。"}</small></span><span className="detox-strip__input">{en ? "Paste the market claim you saw…" : "把你看到的热点观点贴在这里…"}</span><span className="button button--warning">{en ? "Analyze" : "拆解一下"}</span></Link>
    </section>
  );
}

function MarketMini({ title, assets }: { title: string; assets: typeof allAssets }) {
  const { language } = useAppState();
  const en = language === "en";
  return <section className="market-mini"><div className="section-heading"><div><span>{en ? "Intraday updates" : "盘中更新"}</span><h2>{title}</h2></div><Link href="/markets">{en ? "More" : "更多"} <ArrowRight size={14} /></Link></div>{assets.map((asset) => { const copy = localizeAssetCopy(asset, language); return <div className="market-mini__row" key={asset.id}><AssetLogo asset={asset} size={28} /><span><strong>{asset.symbol}</strong><small>{copy.name}</small></span><strong>${asset.price.toLocaleString()}</strong><em className={asset.change24h >= 0 ? "is-positive" : "is-negative"}>{asset.change24h >= 0 ? "+" : ""}{asset.change24h}%</em><p>{copy.aiHint}</p></div>; })}</section>;
}

export function HomeDashboard() {
  const { language, mode } = useAppState();
  const en = language === "en";
  const [previewAssets, setPreviewAssets] = useState<MarketAsset[]>(fallbackPreviewAssets);
  const [cryptoAssets, setCryptoAssets] = useState<MarketAsset[]>(cryptoData.slice(0, 4));
  const [stockAssets, setStockAssets] = useState<MarketAsset[]>(stockData.slice(0, 4));
  const [feedStatus, setFeedStatus] = useState<{ crypto: "live" | "cached" | "fallback" | "loading"; stocks: "live" | "cached" | "fallback" | "loading"; cryptoSources: number; stockSources: number }>({ crypto: "loading", stocks: "loading", cryptoSources: 0, stockSources: 0 });
  const [weather, setWeather] = useState<LiveMarketWeather>(fallbackWeather);

  useEffect(() => {
    let active = true;
    Promise.all([fetchMarketFeed("crypto"), fetchMarketFeed("stocks")])
      .then(([cryptoFeed, stockFeed]) => {
        if (!active) return;
        const liveCrypto = cryptoFeed.assets;
        const availableStocks = stockFeed.assets;
        const btc = liveCrypto.find((asset) => asset.symbol === "BTC") ?? liveCrypto[0];
        const eth = liveCrypto.find((asset) => asset.symbol === "ETH") ?? liveCrypto[1];
        const sol = liveCrypto.find((asset) => asset.symbol === "SOL") ?? liveCrypto[2];
        const nvda = availableStocks.find((asset) => asset.symbol.toUpperCase().includes("NVDA")) ?? availableStocks[0];
        const tsla = availableStocks.find((asset) => asset.symbol.toUpperCase().includes("TSLA")) ?? availableStocks[1];
        setCryptoAssets(liveCrypto.slice(0, 4));
        setStockAssets(availableStocks.slice(0, 4));
        setPreviewAssets([btc, eth, sol, nvda, tsla].filter((asset): asset is MarketAsset => Boolean(asset)));
        setWeather(buildMarketWeather({ cryptoAssets: liveCrypto, stockAssets: availableStocks, cryptoProviders: cryptoFeed.providers, stockProviders: stockFeed.providers, cryptoMode: cryptoFeed.mode, stockMode: stockFeed.mode, updatedAt: [cryptoFeed.updatedAt, stockFeed.updatedAt].sort().at(-1) }));
        const cryptoSources = cryptoFeed.providers?.filter((provider) => provider.status === "live").length ?? 0;
        const stockSources = stockFeed.providers?.filter((provider) => provider.status === "live").length ?? 0;
        setFeedStatus({ crypto: cryptoFeed.mode, stocks: stockFeed.mode, cryptoSources, stockSources });
      })
      .catch(() => {
        if (active) setFeedStatus({ crypto: "fallback", stocks: "fallback", cryptoSources: 0, stockSources: 0 });
      });
    return () => {
      active = false;
    };
  }, []);

  const feedLabel = en
    ? `${feedStatus.crypto === "live" ? `Crypto · ${feedStatus.cryptoSources} near-live feeds` : feedStatus.crypto === "cached" ? "Crypto · official cache" : feedStatus.crypto === "loading" ? "Crypto · checking feeds" : "Crypto · demo"} · ${feedStatus.stocks === "live" ? `Tokenized stocks · ${feedStatus.stockSources} near-live feeds` : feedStatus.stocks === "cached" ? "Tokenized stocks · official cache" : feedStatus.stocks === "loading" ? "Tokenized stocks · checking feeds" : "Tokenized stocks · demo"}`
    : `${feedStatus.crypto === "live" ? `币圈 ${feedStatus.cryptoSources} 源准实时` : feedStatus.crypto === "cached" ? "币圈官方缓存" : feedStatus.crypto === "loading" ? "币圈行情检查中" : "币圈演示"} · ${feedStatus.stocks === "live" ? `币股 ${feedStatus.stockSources} 源准实时` : feedStatus.stocks === "cached" ? "币股官方缓存" : feedStatus.stocks === "loading" ? "币股行情检查中" : "币股演示"}`;
  const displayWeather = localizeMarketWeather(weather, language);

  return (
    <>
      <HomeMarketSpotlight assets={previewAssets} feedLabel={feedLabel} weather={displayWeather} />
      <Hero />
      {mode === "brief" ? <BriefDashboard weather={displayWeather} /> : mode === "lens" ? <LensDashboard previewAssets={previewAssets} weather={displayWeather} /> : <CalmDashboard cryptoAssets={cryptoAssets} stockAssets={stockAssets} weather={displayWeather} />}
      <section className="daily-entry-grid" aria-label={en ? "Daily content" : "每日内容入口"}>
        <Link className="daily-entry-card daily-entry-card--hot" href="/hotspots"><span><Newspaper size={24} weight="duotone" /></span><div><small>Daily pulse</small><h2>{en ? "Daily Pulse" : "每日热点"}</h2><p>{en ? "Understand the themes moving tokenized stocks, crypto and sentiment in three minutes." : "三分钟看懂今天真正影响币股、币圈和市场情绪的主线。"}</p></div><ArrowRight size={18} /></Link>
        <Link className="daily-entry-card" href="/calendar"><span><CalendarCheck size={24} weight="duotone" /></span><div><small>Macro schedule</small><h2>{en ? "Economic Calendar" : "财经日历"}</h2><p>{en ? "View central-bank decisions, inflation, jobs and growth releases in Beijing time." : "按北京时间查看央行决议、通胀、就业和增长数据等高影响事件。"}</p></div><ArrowRight size={18} /></Link>
        <Link className="daily-entry-card" href="/today"><span><CalendarDots size={24} weight="duotone" /></span><div><small>Market memory</small><h2>{en ? "On This Day" : "历史上的今天"}</h2><p>{en ? "Use past institutions, crises and cycles as reference points for understanding today." : "从过去的制度、危机和周期里，找到理解今天的参照物。"}</p></div><ArrowRight size={18} /></Link>
      </section>
      <section className="home-section"><div className="section-intro"><span>{en ? "Three things are enough" : "三件事，足够了"}</span><h2>{en ? "Understand the market. Remove noise. Slow impulse." : "看懂行情，拆掉噪音，拦住冲动"}</h2><p>{en ? "Stone Daily does not decide for you. It makes information clearer and emotion more visible." : "Stone Daily 不试图替你决定，只把信息变得更清楚，把情绪变得更可见。"}</p></div><div className="feature-grid"><FeatureCard Icon={ChartLineUp} number="01" title={en ? "Search the whole market" : "全市场行情搜索"}>{en ? "Explore crypto and tokenized-stock catalogues while keeping spot, onchain tokens and perpetuals distinct." : "覆盖币圈与币股目录，并明确区分现货、链上代币和永续合约。"}</FeatureCard><FeatureCard Icon={Brain} number="02" title={en ? "AI move explanations" : "AI 涨跌解释"}>{en ? "See not only how much an asset moved, but possible context and common interpretation errors." : "不只告诉你动了多少，还用人话解释可能原因和常见误区。"}</FeatureCard><FeatureCard Icon={FirstAid} number="03" title={en ? "Decision pause button" : "后悔药按钮"}>{en ? "Before acting, let your future self challenge the reasons driving you now." : "做决定之前，让未来的自己回来提醒现在的自己。"}</FeatureCard></div></section>
      <section className="principles"><div><span>{en ? "Our principles" : "我们的原则"}</span><h2>{en ? "Protect understanding before optimizing speed" : "先保护理解，再谈速度"}</h2></div><ul><li><CheckCircle size={19} />{en ? "No investment advice" : "不提供投资建议"}</li><li><CheckCircle size={19} />{en ? "No promised returns" : "不承诺任何收益"}</li><li><CheckCircle size={19} />{en ? "No manufactured anxiety" : "不制造焦虑"}</li><li><CheckCircle size={19} />{en ? "No decisions made for users" : "不替用户做决定"}</li><li><CheckCircle size={19} />{en ? "Only clearer information, visible risk and slower impulse" : "只帮助理解信息、识别风险、延迟冲动"}</li></ul></section>
    </>
  );
}
