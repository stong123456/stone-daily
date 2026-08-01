"use client";

import { Pause, Play } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { MarketTickerTape } from "@/components/MarketTickerTape";
import { NewsTickerTape } from "@/components/NewsTickerTape";
import { cryptoData } from "@/data/market";
import { fetchMarketFeed } from "@/services/marketProviders";
import type { EditorialFeedItem, EditorialFeedSnapshot, MarketAsset } from "@/types/market";

export function GlobalTickerHeader() {
  const { language } = useAppState();
  const [assets, setAssets] = useState<MarketAsset[]>(cryptoData);
  const [editorial, setEditorial] = useState<EditorialFeedSnapshot | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => {
      void Promise.allSettled([
        fetchMarketFeed("crypto").then((result) => {
          if (active && result.assets.length) setAssets(result.assets);
        }),
        fetch("/api/editorial", { cache: "no-store" })
          .then((response) => {
            if (!response.ok) throw new Error("editorial feed unavailable");
            return response.json() as Promise<EditorialFeedSnapshot>;
          })
          .then((snapshot) => {
            if (active) setEditorial(snapshot);
          }),
      ]);
    };

    load();
    const timer = window.setInterval(load, 120_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const newsItems = useMemo<EditorialFeedItem[]>(() => {
    const digest = editorial?.digests?.[language]?.items ?? [];
    if (digest.length) return digest.map((item) => ({ id: `ticker-${item.id}`, source: item.sources.map((source) => source.name).join(" + "), sourceType: "媒体", category: item.category, title: item.title, summary: "", url: item.sources[0]?.url ?? "/hotspots", publishedAt: item.publishedAt, relatedAssets: item.relatedAssets, urgency: "重要" }));
    return editorial?.items ?? [];
  }, [editorial, language]);

  return <div className="global-ticker-stack" data-paused={paused}><button aria-label={paused ? (language === "en" ? "Resume moving headlines" : "继续滚动横幅") : (language === "en" ? "Pause moving headlines" : "暂停滚动横幅")} className="global-ticker-control" onClick={() => setPaused((value) => !value)} type="button">{paused ? <Play size={12} weight="fill" /> : <Pause size={12} weight="fill" />}</button><div className="home-top-tickers"><MarketTickerTape assets={assets} /><NewsTickerTape items={newsItems} /></div></div>;
}
