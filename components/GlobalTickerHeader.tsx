"use client";

import { useEffect, useState } from "react";
import { MarketTickerTape } from "@/components/MarketTickerTape";
import { NewsTickerTape } from "@/components/NewsTickerTape";
import { cryptoData } from "@/data/market";
import { fetchMarketFeed } from "@/services/marketProviders";
import type { EditorialFeedItem, EditorialFeedSnapshot, MarketAsset } from "@/types/market";

export function GlobalTickerHeader() {
  const [assets, setAssets] = useState<MarketAsset[]>(cryptoData);
  const [newsItems, setNewsItems] = useState<EditorialFeedItem[]>([]);

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
            if (active) setNewsItems(snapshot.items);
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

  return <div className="home-top-tickers"><MarketTickerTape assets={assets} /><NewsTickerTape items={newsItems} /></div>;
}
