"use client";

import { Brain, Broadcast, MagnifyingGlass, ShieldWarning } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AIExplanationModal } from "@/components/AIExplanationModal";
import { useAppState } from "@/components/AppStateProvider";
import { MarketTable } from "@/components/MarketTable";
import { MarketIntelligencePanel } from "@/components/MarketIntelligencePanel";
import { MarketTemperatureCard } from "@/components/MarketTemperatureCard";
import { Watchlist } from "@/components/Watchlist";
import { marketSnapshot } from "@/data/market";
import { expandedCryptoData, expandedStockData, marketUniverse } from "@/data/expandedMarket";
import { buildAssetCalmPrompt, generateAssetExplanation } from "@/services/aiAnalysis";
import { fetchMarketFeed, type MarketFeedResult, type MarketProviderSummary } from "@/services/marketProviders";
import { calculateMarketSpreads, mergeStreamQuotes } from "@/services/marketStream";
import type { AIExplanation, MarketAsset, MarketSpread, StreamQuoteSnapshot, StreamingSummary } from "@/types/market";

type Tab = "crypto" | "stocks" | "watchlist";
type SortKey = "marketCap" | "change" | "volume" | "symbol";
type FeedStatus = { source: string; mode: "loading" | "live" | "cached" | "fallback"; providers?: MarketProviderSummary[]; spreads?: MarketSpread[]; streaming?: StreamingSummary; cacheLayer?: MarketFeedResult["cacheLayer"]; updatedAt?: string };

const pageSize = 12;
const defaultStreamSymbols = "BTC,ETH,SOL,XRP,DOGE,ADA,AVAX,LINK,LTC,BCH,BNB,SUI";
const defaultMarketStreamUrl = "https://stone-daily-production.up.railway.app";

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
  const { watchlistIds, toggleWatchlist } = useAppState();
  const [tab, setTab] = useState<Tab>("crypto");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("全部");
  const [venue, setVenue] = useState("全部交易所");
  const [sort, setSort] = useState<SortKey>("volume");
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
    return Array.from(new Map(currentUniverse.map((asset) => [asset.id, asset])).values()).filter((asset) => watchlistIds.includes(asset.id));
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

  const switchTab = (nextTab: Tab) => {
    setTab(nextTab);
    setQuery("");
    setSector("全部");
    setVenue("全部交易所");
    setRemoteSearch(null);
    setSort(nextTab === "stocks" ? "symbol" : "volume");
    setVisibleCount(pageSize);
  };

  const explain = async (asset: MarketAsset) => {
    setSelected(asset);
    setExplanation(null);
    setLoadingId(asset.id);
    const result = await generateAssetExplanation(asset);
    setExplanation(result);
    setLoadingId(null);
  };

  const calm = (asset: MarketAsset) => {
    const text = buildAssetCalmPrompt(asset);
    router.push(`/regret?text=${encodeURIComponent(text)}`);
  };

  return (
    <>
      <header className="page-header page-header--market">
        <div><span>Crypto + tokenized stocks</span><h1>币圈与币股行情</h1><p>搜索加密资产、币股现货、链上币股和币股永续，先分清产品结构，再看价格与风险。</p></div>
        <div className="market-coverage"><Broadcast size={22} weight="duotone" /><div><strong>{cryptoFeed && stockFeed ? `${cryptoFeed.length} 个币圈 + ${stockFeed.length} 个币股行情` : "正在连接币圈与币股行情"}</strong><span>10 个币圈现货源 · 5 个币股产品源 · 单源故障隔离</span></div></div>
      </header>

      <section className="temperature-grid">
        <MarketTemperatureCard detail="热门币股跟随基础股票波动，产品结构和流动性也会放大差异。" label="币股温度" value={marketSnapshot.stockTemperature} />
        <MarketTemperatureCard detail="BTC 稳住，山寨开始活跃，波动有所放大。" label="币圈温度" value={marketSnapshot.cryptoTemperature} />
        <MarketTemperatureCard detail="总体仍平静，局部热点更容易诱发冲动。" kind="fomo" label="FOMO 指数" value={marketSnapshot.fomoIndex} />
        <article className="risk-note-card"><ShieldWarning size={23} weight="duotone" /><div><span>今日风险提示</span><p>{marketSnapshot.riskNote}</p></div></article>
      </section>

      <section className="market-workspace">
        <div className="market-toolbar">
          <div className="tab-list" role="tablist" aria-label="行情类别">
            <button aria-selected={tab === "crypto"} onClick={() => switchTab("crypto")} role="tab" type="button">币圈 <span>{cryptoFeed?.length ?? expandedCryptoData.length}</span></button>
            <button aria-selected={tab === "stocks"} onClick={() => switchTab("stocks")} role="tab" type="button">币股 <span>{stockFeed?.length ?? expandedStockData.length}</span></button>
            <button aria-selected={tab === "watchlist"} onClick={() => switchTab("watchlist")} role="tab" type="button">自选 <span>{watchlistIds.length}</span></button>
          </div>
          <label className="market-search"><MagnifyingGlass size={18} /><input aria-label="搜索资产" onChange={(event) => { setQuery(event.target.value); setVisibleCount(pageSize); }} placeholder="搜索代码、名称、赛道…" value={query} /></label>
          <div className="market-selectors">
            <label className="market-venue"><span>交易所</span><select aria-label="交易所筛选" onChange={(event) => { setVenue(event.target.value); setVisibleCount(pageSize); }} value={venue}>{venues.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="market-sort"><span>排序</span><select aria-label="行情排序" onChange={(event) => setSort(event.target.value as SortKey)} value={sort}>{tab === "crypto" ? <option value="volume">成交量</option> : null}<option value="change">24h 涨幅</option><option value="symbol">代码</option></select></label>
          </div>
        </div>
        <div className="market-sector-list" aria-label="资产赛道筛选">
          {sectors.map((item) => <button aria-pressed={sector === item} key={item} onClick={() => { setSector(item); setVisibleCount(pageSize); }} type="button">{item}</button>)}
        </div>
        {tab !== "watchlist" && feedStatus.providers?.length ? <div className="market-provider-strip" aria-label="交易所行情源，点击筛选">{feedStatus.providers.map((provider) => {
          const isSelected = venue === provider.name;
          const isUnavailable = provider.status === "unavailable" && provider.count === 0;
          const statusLabel = provider.status === "live" ? "在线" : provider.status === "cached" ? "缓存" : provider.status === "catalog" ? "目录" : "暂不可用";
          return <div className="market-provider-card" data-selected={isSelected} data-status={provider.status} key={`${tab}-${provider.name}`}>
            <button aria-label={`${isSelected ? "取消" : "只看"} ${provider.name} ${provider.product}`} aria-pressed={isSelected} disabled={isUnavailable} onClick={() => { setVenue(isSelected ? "全部交易所" : provider.name); setVisibleCount(pageSize); }} type="button"><span><strong>{provider.name}</strong><small>{provider.product} · {provider.count} 个 · {statusLabel}{typeof provider.latencyMs === "number" ? ` · ${provider.latencyMs}ms` : ""}</small></span></button>
            {provider.docsUrl ? <a aria-label={`${provider.name} 官方接口文档`} href={provider.docsUrl} rel="noreferrer" target="_blank">接口</a> : null}
          </div>;
        })}</div> : null}
        <div className="market-workspace__meta"><Brain size={17} /><p>{feedStatus.mode === "live" ? `${feedStatus.source}已连接，${directStreamConnected ? "币圈报价由 Railway 流网关直接推送" : feedStatus.streaming ? "币圈报价正在读取共享流快照" : "页面按快照刷新"}。各交易所价格保留为独立行；成交量仅用于单平台内比较，不做误导性的全网加总。币股现货、链上代币和永续合约也不会混成同一种产品。` : feedStatus.mode === "cached" ? `${feedStatus.source}。这是官方接口最近一次成功同步的快照，不冒充实时流；生产部署恢复直连后会自动切换为准实时。` : "当前使用本地演示目录；恢复后会自动重新连接交易所公开行情。"}</p><span className="feed-badge" data-mode={feedStatus.mode}>{feedStatus.mode === "loading" ? "连接中" : feedStatus.streaming ? `秒级流 · ${feedStatus.streaming.lagMs}ms` : feedStatus.mode === "live" ? "后台快照" : feedStatus.mode === "cached" ? "官方缓存" : "演示"}</span><strong>{filteredAssets.length} 个结果</strong></div>
        {tab === "crypto" ? <MarketIntelligencePanel spreads={feedStatus.spreads ?? []} streaming={feedStatus.streaming} /> : null}
        {tab === "watchlist" ? (
          <Watchlist assets={visibleAssets} loadingId={loadingId} onCalm={calm} onExplain={explain} onToggleWatchlist={toggleWatchlist} />
        ) : (
          <MarketTable assets={visibleAssets} loadingId={loadingId} onCalm={calm} onExplain={explain} onToggleWatchlist={toggleWatchlist} watchlistIds={watchlistIds} />
        )}
        {filteredAssets.length > visibleCount ? <div className="market-load-more"><button className="button button--secondary" onClick={() => setVisibleCount((count) => count + pageSize)} type="button">继续加载 {Math.min(pageSize, filteredAssets.length - visibleCount)} 个资产</button></div> : null}
      </section>
      <AIExplanationModal asset={selected} explanation={explanation} onClose={() => setSelected(null)} open={Boolean(selected)} />
    </>
  );
}
