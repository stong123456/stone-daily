"use client";

import { Brain, Broadcast, MagnifyingGlass, ShieldWarning } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AIExplanationModal } from "@/components/AIExplanationModal";
import { useAppState } from "@/components/AppStateProvider";
import { ExchangeLogo } from "@/components/ExchangeLogo";
import { MarketTable } from "@/components/MarketTable";
import { MarketIntelligencePanel } from "@/components/MarketIntelligencePanel";
import { MarketTemperatureCard } from "@/components/MarketTemperatureCard";
import { Watchlist } from "@/components/Watchlist";
import { useAIUsage } from "@/hooks/useAIUsage";
import { expandedCryptoData, expandedStockData, marketUniverse } from "@/data/expandedMarket";
import { buildAssetCalmPrompt, generateCachedAssetExplanation } from "@/services/aiAnalysis";
import { fetchMarketFeed, type MarketFeedResult, type MarketProviderSummary } from "@/services/marketProviders";
import { calculateMarketSpreads, mergeStreamQuotes } from "@/services/marketStream";
import { buildMarketWeather, canonicalAssetId, isWatchedAsset } from "@/services/marketWeather";
import { localizeMarketWeather } from "@/services/localization";
import type { AIExplanation, MarketAsset, MarketSpread, StreamQuoteSnapshot, StreamingSummary } from "@/types/market";

type Tab = "crypto" | "stocks" | "watchlist";
type SortKey = "marketCap" | "change" | "volume" | "symbol";
type FeedStatus = { source: string; mode: "loading" | "live" | "cached" | "fallback"; providers?: MarketProviderSummary[]; spreads?: MarketSpread[]; streaming?: StreamingSummary; cacheLayer?: MarketFeedResult["cacheLayer"]; updatedAt?: string };

const pageSize = 12;
const defaultStreamSymbols = "BTC,ETH,SOL,XRP,DOGE,ADA,AVAX,LINK,LTC,BCH,BNB,SUI";
const defaultMarketStreamUrl = "https://stone-daily-production.up.railway.app";

const sectorTranslations: Record<string, string> = {
  全部: "All",
  公链: "Layer 1",
  跨链: "Interoperability",
  支付: "Payments",
  半导体: "Semiconductors",
  传媒: "Media",
  金融: "Financials",
  综合: "Conglomerates",
  能源: "Energy",
  医疗: "Healthcare",
  消费: "Consumer",
  交易所平台币: "Exchange tokens",
};

function englishProductLabel(value: string) {
  return value
    .replace(/币圈现货/g, "crypto spot")
    .replace(/币股现货/g, "tokenized-stock spot")
    .replace(/链上币股/g, "onchain tokenized stocks")
    .replace(/币股永续/g, "tokenized-stock perpetuals")
    .replace(/永续/g, "perpetuals")
    .replace(/现货/g, "spot");
}

function selectStreamSymbols(assets: MarketAsset[]) {
  const symbols: string[] = [];
  const candidates = [...assets].sort((a, b) => b.volume - a.volume);
  for (const asset of candidates) {
    if (!symbols.includes(asset.symbol)) symbols.push(asset.symbol);
    if (symbols.length >= 40) break;
  }
  return symbols.join(",") || defaultStreamSymbols;
}

export function MarketExplorer() {
  const router = useRouter();
  const { language, watchlistIds, toggleWatchlist, addRecord } = useAppState();
  const en = language === "en";
  const aiUsage = useAIUsage();
  const [tab, setTab] = useState<Tab>("crypto");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("全部");
  const [venue, setVenue] = useState("全部交易所");
  const [sort, setSort] = useState<SortKey>("change");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [cryptoFeed, setCryptoFeed] = useState<MarketAsset[] | null>(null);
  const cryptoFeedRef = useRef<MarketAsset[] | null>(null);
  const [stockFeed, setStockFeed] = useState<MarketAsset[] | null>(null);
  const [cryptoStatus, setCryptoStatus] = useState<FeedStatus | null>(null);
  const [stockStatus, setStockStatus] = useState<FeedStatus | null>(null);
  const [remoteSearch, setRemoteSearch] = useState<{ kind: "crypto" | "stocks"; query: string; assets: MarketAsset[] } | null>(null);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>({ source: "正在连接行情源", mode: "loading" });
  const [selected, setSelected] = useState<MarketAsset | null>(null);
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [explanationBlocked, setExplanationBlocked] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [directStreamConnected, setDirectStreamConnected] = useState(false);
  const [streamSymbols, setStreamSymbols] = useState(defaultStreamSymbols);
  const deferredQuery = useDeferredValue(query);

  const applyFeed = useCallback((kind: "crypto" | "stocks", result: MarketFeedResult) => {
    const status: FeedStatus = { source: result.source, mode: result.mode, providers: result.providers, spreads: result.spreads, streaming: result.streaming, cacheLayer: result.cacheLayer, updatedAt: result.updatedAt };
    if (kind === "crypto") {
      cryptoFeedRef.current = result.assets;
      setCryptoFeed(result.assets);
      setCryptoStatus(status);
      setStreamSymbols((current) => current === defaultStreamSymbols ? selectStreamSymbols(result.assets) : current);
    } else {
      setStockFeed(result.assets);
      setStockStatus(status);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([fetchMarketFeed("crypto"), fetchMarketFeed("stocks")]).then(([cryptoResult, stockResult]) => {
      if (!active) return;
      if (cryptoResult.status === "fulfilled") applyFeed("crypto", cryptoResult.value);
      else setCryptoStatus({ source: "币圈行情暂不可用", mode: "fallback" });
      if (stockResult.status === "fulfilled") applyFeed("stocks", stockResult.value);
      else setStockStatus({ source: "币股行情暂不可用", mode: "fallback" });
    });
    return () => {
      active = false;
    };
  }, [applyFeed]);

  useEffect(() => {
    if (tab === "watchlist") return;
    const status = tab === "crypto" ? cryptoStatus : stockStatus;
    setFeedStatus(status ?? { source: "正在连接行情源", mode: "loading" });
  }, [cryptoStatus, stockStatus, tab]);

  useEffect(() => {
    const baseUrl = (process.env.NEXT_PUBLIC_MARKET_STREAM_URL || defaultMarketStreamUrl).trim().replace(/\/$/, "");
    if (!baseUrl || typeof EventSource === "undefined") return;

    let streamUrl: URL;
    try {
      streamUrl = new URL(`${baseUrl}/events`);
    } catch {
      return;
    }
    if (streamSymbols) streamUrl.searchParams.set("symbols", streamSymbols);

    const source = new EventSource(streamUrl.toString());
    const handleQuotes = (event: Event) => {
      try {
        const snapshot = JSON.parse((event as MessageEvent<string>).data) as StreamQuoteSnapshot;
        if (snapshot.version !== 1 || !Array.isArray(snapshot.quotes)) return;
        const current = cryptoFeedRef.current;
        if (!current) return;
        const merged = mergeStreamQuotes(current, snapshot);
        if (!merged.streaming) return;
        cryptoFeedRef.current = merged.assets;
        setCryptoFeed(merged.assets);
        setCryptoStatus((status) => status ? {
          ...status,
          mode: "live",
          source: status.source.includes("Railway 秒级流") ? status.source : `${status.source} + Railway 秒级流`,
          spreads: calculateMarketSpreads(merged.assets),
          streaming: merged.streaming,
          updatedAt: snapshot.updatedAt,
        } : status);
      } catch {
        // Ignore malformed events and let EventSource continue with the next snapshot.
      }
    };

    source.addEventListener("quotes", handleQuotes);
    source.onopen = () => setDirectStreamConnected(true);
    source.onerror = () => setDirectStreamConnected(false);
    return () => {
      source.removeEventListener("quotes", handleQuotes);
      source.close();
      setDirectStreamConnected(false);
    };
  }, [streamSymbols]);

  useEffect(() => {
    if (tab === "watchlist") return;
    const timer = window.setInterval(() => {
      fetchMarketFeed(tab).then((result) => applyFeed(tab, result)).catch(() => undefined);
    }, tab === "crypto" ? (directStreamConnected ? 60_000 : 5_000) : 15_000);
    return () => window.clearInterval(timer);
  }, [applyFeed, directStreamConnected, tab]);

  useEffect(() => {
    const keyword = deferredQuery.trim();
    if (tab === "watchlist" || keyword.length < 2) {
      setRemoteSearch(null);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      fetchMarketFeed(tab, keyword).then((result) => {
        if (active) setRemoteSearch({ kind: tab, query: keyword, assets: result.assets });
      }).catch(() => undefined);
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [deferredQuery, tab]);

  const baseAssets = useMemo(() => {
    const keyword = deferredQuery.trim();
    const searchAssets = keyword.length >= 2 && remoteSearch?.kind === tab && remoteSearch.query === keyword ? remoteSearch.assets : null;
    if (tab === "crypto") return searchAssets ?? cryptoFeed ?? expandedCryptoData;
    if (tab === "stocks") return searchAssets ?? stockFeed ?? expandedStockData;
    const currentUniverse = [...(cryptoFeed ?? expandedCryptoData), ...(stockFeed ?? expandedStockData), ...marketUniverse];
    const watchedAssets = Array.from(new Map(currentUniverse.map((asset) => [asset.id, asset])).values())
      .filter((asset) => isWatchedAsset(watchlistIds, asset))
      .sort((left, right) => right.volume - left.volume);
    return Array.from(new Map(watchedAssets.map((asset) => [canonicalAssetId(asset), asset])).values());
  }, [cryptoFeed, deferredQuery, remoteSearch, stockFeed, tab, watchlistIds]);

  const sectors = useMemo(() => ["全部", ...Array.from(new Set(baseAssets.map((asset) => asset.sector).filter(Boolean) as string[]))], [baseAssets]);
  const venues = useMemo(() => ["全部交易所", ...Array.from(new Set(baseAssets.map((asset) => asset.venue).filter(Boolean) as string[])).sort()], [baseAssets]);

  const filteredAssets = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();
    const result = baseAssets.filter((asset) => {
      const matchesQuery = !keyword || [asset.symbol, asset.name, asset.narrative, asset.sector, asset.venue].some((value) => value?.toLowerCase().includes(keyword));
      const matchesSector = sector === "全部" || asset.sector === sector;
      const matchesVenue = venue === "全部交易所" || asset.venue === venue;
      return matchesQuery && matchesSector && matchesVenue;
    });
    return [...result].sort((a, b) => {
      if (sort === "change") return b.change24h - a.change24h;
      if (sort === "volume") return b.volume - a.volume;
      if (sort === "symbol") return a.symbol.localeCompare(b.symbol);
      return b.marketCap - a.marketCap;
    });
  }, [baseAssets, deferredQuery, sector, sort, venue]);

  const visibleAssets = filteredAssets.slice(0, visibleCount);
  const weatherSnapshot = useMemo(() => buildMarketWeather({
    cryptoAssets: cryptoFeed ?? expandedCryptoData,
    stockAssets: stockFeed ?? expandedStockData,
    cryptoProviders: cryptoStatus?.providers,
    stockProviders: stockStatus?.providers,
    cryptoMode: cryptoStatus?.mode ?? "loading",
    stockMode: stockStatus?.mode ?? "loading",
    updatedAt: [cryptoStatus?.updatedAt, stockStatus?.updatedAt].filter(Boolean).sort().at(-1),
  }), [cryptoFeed, cryptoStatus, stockFeed, stockStatus]);

  const switchTab = (nextTab: Tab) => {
    setTab(nextTab);
    setQuery("");
    setSector("全部");
    setVenue("全部交易所");
    setRemoteSearch(null);
    setSort("change");
    setVisibleCount(pageSize);
  };

  const explain = async (asset: MarketAsset) => {
    setSelected(asset);
    setExplanation(null);
    if (!aiUsage.consume()) {
      setExplanationBlocked(true);
      return;
    }
    setExplanationBlocked(false);
    setLoadingId(asset.id);
    const result = await generateCachedAssetExplanation(asset, language);
    setExplanation(result);
    addRecord({ input: `${asset.symbol} · ${asset.venue ?? (en ? "Aggregated feed" : "综合行情")}`, type: "ai", summary: result.plainSummary });
    setLoadingId(null);
  };

  const calm = (asset: MarketAsset) => {
    const text = buildAssetCalmPrompt(asset, language);
    router.push(`/regret?text=${encodeURIComponent(text)}`);
  };

  const displayWeather = localizeMarketWeather(weatherSnapshot, language);

  return (
    <>
      <header className="page-header page-header--market">
        <div><span>Crypto + tokenized stocks</span><h1>{en ? "Crypto & tokenized-stock markets" : "币圈与币股行情"}</h1><p>{en ? "Search crypto, tokenized-stock spot, onchain products and perpetuals. Understand the structure before reading price and risk." : "搜索加密资产、币股现货、链上币股和币股永续，先分清产品结构，再看价格与风险。"}</p></div>
        <div className="market-coverage"><Broadcast size={22} weight="duotone" /><div><strong>{cryptoFeed && stockFeed ? (en ? `${cryptoFeed.length} crypto + ${stockFeed.length} tokenized-stock quotes` : `${cryptoFeed.length} 个币圈 + ${stockFeed.length} 个币股行情`) : (en ? "Connecting to crypto and tokenized-stock feeds" : "正在连接币圈与币股行情")}</strong><span>{en ? "10 crypto spot sources · 5 tokenized-stock product sources · isolated provider failures" : "10 个币圈现货源 · 5 个币股产品源 · 单源故障隔离"}</span></div></div>
      </header>

      <section className="temperature-grid">
        <MarketTemperatureCard detail={en ? `Breadth ${displayWeather.stockBreadth}%; deduplicated by underlying.` : `上涨广度 ${displayWeather.stockBreadth}%，按基础标的去重计算。`} label={en ? "Tokenized stocks" : "币股温度"} value={displayWeather.stockTemperature} />
        <MarketTemperatureCard detail={en ? `Breadth ${displayWeather.cryptoBreadth}%; deduplicated by symbol.` : `上涨广度 ${displayWeather.cryptoBreadth}%，按币种代码去重计算。`} label={en ? "Crypto" : "币圈温度"} value={displayWeather.cryptoTemperature} />
        <MarketTemperatureCard detail={en ? `${displayWeather.highVolatilityShare}% of representative assets moved more than 5%.` : `${displayWeather.highVolatilityShare}% 的代表资产振幅超过 5%。`} kind="fomo" label={en ? "FOMO index" : "FOMO 指数"} value={displayWeather.fomoIndex} />
        <article className="risk-note-card"><ShieldWarning size={23} weight="duotone" /><div><span>{en ? "Live risk note" : "实时风险提示"}</span><p>{displayWeather.riskNote}</p></div></article>
      </section>

      <section className="market-workspace">
        <div className="market-toolbar">
          <div className="tab-list" role="tablist" aria-label={en ? "Market category" : "行情类别"}>
            <button aria-selected={tab === "crypto"} onClick={() => switchTab("crypto")} role="tab" type="button">{en ? "Crypto" : "币圈"} <span>{cryptoFeed?.length ?? expandedCryptoData.length}</span></button>
            <button aria-selected={tab === "stocks"} onClick={() => switchTab("stocks")} role="tab" type="button">{en ? "Tokenized stocks" : "币股"} <span>{stockFeed?.length ?? expandedStockData.length}</span></button>
            <button aria-selected={tab === "watchlist"} onClick={() => switchTab("watchlist")} role="tab" type="button">{en ? "Watchlist" : "自选"} <span>{watchlistIds.length}</span></button>
          </div>
          <label className="market-search"><MagnifyingGlass size={18} /><input aria-label={en ? "Search assets" : "搜索资产"} onChange={(event) => { setQuery(event.target.value); setVisibleCount(pageSize); }} placeholder={en ? "Search symbol, name or sector…" : "搜索代码、名称、赛道…"} value={query} /></label>
          <div className="market-selectors">
            <label className="market-venue"><span>{en ? "Venue" : "交易所"}</span><select aria-label={en ? "Filter by venue" : "交易所筛选"} onChange={(event) => { setVenue(event.target.value); setVisibleCount(pageSize); }} value={venue}>{venues.map((item) => <option key={item} value={item}>{en && item === "全部交易所" ? "All venues" : item}</option>)}</select></label>
            <label className="market-sort"><span>{en ? "Sort" : "排序"}</span><select aria-label={en ? "Sort markets" : "行情排序"} onChange={(event) => setSort(event.target.value as SortKey)} value={sort}>{tab === "crypto" ? <option value="volume">{en ? "Volume" : "成交量"}</option> : null}<option value="change">{en ? "24h gain" : "24h 涨幅"}</option><option value="symbol">{en ? "Symbol" : "代码"}</option></select></label>
          </div>
        </div>
        <div className="market-sector-list" aria-label={en ? "Filter by asset sector" : "资产赛道筛选"}>
          {sectors.map((item) => <button aria-pressed={sector === item} key={item} onClick={() => { setSector(item); setVisibleCount(pageSize); }} type="button">{en ? (sectorTranslations[item] ?? item) : item}</button>)}
        </div>
        {tab !== "watchlist" && feedStatus.providers?.length ? <div className="market-provider-strip" aria-label={en ? "Venue feeds; click to filter" : "交易所行情源，点击筛选"}>{feedStatus.providers.map((provider) => {
          const isSelected = venue === provider.name;
          const isUnavailable = provider.status === "unavailable" && provider.count === 0;
          const statusLabel = provider.status === "live" ? (en ? "live" : "在线") : provider.status === "cached" ? (en ? "cached" : "缓存") : provider.status === "catalog" ? (en ? "catalogue" : "目录") : provider.name === "Kraken" && tab === "stocks" ? (en ? "region/API limited" : "地区/API 受限") : (en ? "unavailable" : "暂不可用");
          return <div className="market-provider-card" data-selected={isSelected} data-status={provider.status} key={`${tab}-${provider.name}`}>
            <button aria-label={`${isSelected ? (en ? "Clear" : "取消") : (en ? "Show only" : "只看")} ${provider.name} ${provider.product}`} aria-pressed={isSelected} disabled={isUnavailable} onClick={() => { setVenue(isSelected ? "全部交易所" : provider.name); setVisibleCount(pageSize); }} type="button"><ExchangeLogo name={provider.name} /><span><strong>{provider.name}</strong><small>{en ? englishProductLabel(provider.product) : provider.product} · {provider.count} {en ? "assets" : "个"} · {statusLabel}{typeof provider.latencyMs === "number" ? ` · ${provider.latencyMs}ms` : ""}</small></span></button>
            {provider.docsUrl ? <a aria-label={en ? `${provider.name} official API documentation` : `${provider.name} 官方接口文档`} href={provider.docsUrl} rel="noreferrer" target="_blank">{en ? "API" : "接口"}</a> : null}
          </div>;
        })}</div> : null}
        <div className="market-workspace__meta"><Brain size={17} /><p>{en ? (feedStatus.mode === "live" ? `${directStreamConnected ? "Crypto quotes are pushed directly by the Railway stream gateway" : feedStatus.streaming ? "Crypto quotes are using the shared stream snapshot" : "The page is refreshing from snapshots"}. Venue prices remain separate; volume is compared within each venue and never summed into a misleading global figure. Spot, onchain tokens and perpetuals remain distinct product types.` : feedStatus.mode === "cached" ? "This is the most recent successful official snapshot and is not presented as a live stream. Near-live mode returns automatically when direct access recovers." : "The local demonstration catalogue is active. Public venue feeds will reconnect automatically.") : (feedStatus.mode === "live" ? `${feedStatus.source}已连接，${directStreamConnected ? "币圈报价由 Railway 流网关直接推送" : feedStatus.streaming ? "币圈报价正在读取共享流快照" : "页面按快照刷新"}。各交易所价格保留为独立行；成交量仅用于单平台内比较，不做误导性的全网加总。币股现货、链上代币和永续合约也不会混成同一种产品。` : feedStatus.mode === "cached" ? `${feedStatus.source}。这是官方接口最近一次成功同步的快照，不冒充实时流；生产部署恢复直连后会自动切换为准实时。` : "当前使用本地演示目录；恢复后会自动重新连接交易所公开行情。")}</p><span className="feed-badge" data-mode={feedStatus.mode}>{feedStatus.mode === "loading" ? (en ? "Connecting" : "连接中") : feedStatus.streaming ? `${en ? "Second-level stream" : "秒级流"} · ${feedStatus.streaming.lagMs}ms` : feedStatus.mode === "live" ? (en ? "Background snapshot" : "后台快照") : feedStatus.mode === "cached" ? (en ? "Official cache" : "官方缓存") : (en ? "Demo" : "演示")}</span><strong>{filteredAssets.length} {en ? "results" : "个结果"}</strong></div>
        {tab === "watchlist" ? (
          <Watchlist assets={visibleAssets} loadingId={loadingId} onCalm={calm} onExplain={explain} onToggleWatchlist={toggleWatchlist} />
        ) : (
          <MarketTable assets={visibleAssets} loadingId={loadingId} onCalm={calm} onExplain={explain} onToggleWatchlist={toggleWatchlist} watchlistIds={watchlistIds} />
        )}
        {filteredAssets.length > visibleCount ? <div className="market-load-more"><button className="button button--secondary" onClick={() => setVisibleCount((count) => count + pageSize)} type="button">{en ? "Load" : "继续加载"} {Math.min(pageSize, filteredAssets.length - visibleCount)} {en ? "more assets" : "个资产"}</button></div> : null}
        {tab === "crypto" ? <MarketIntelligencePanel spreads={feedStatus.spreads ?? []} streaming={feedStatus.streaming} /> : null}
      </section>
      <AIExplanationModal asset={selected} blocked={explanationBlocked} explanation={explanation} onClose={() => setSelected(null)} open={Boolean(selected)} usage={aiUsage} />
    </>
  );
}
