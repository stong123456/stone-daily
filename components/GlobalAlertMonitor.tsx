"use client";

import { useEffect, useRef } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { canonicalAssetId, canonicalAssetSymbol } from "@/services/marketWeather";
import { fetchMarketFeed } from "@/services/marketProviders";
import { isRigorousDigestHeadlineSource, isShareableMarketStory } from "@/services/editorialSharing";
import type { EditorialFeedSnapshot, MarketAlert, MarketAsset, MarketIntelligence } from "@/types/market";

const COOLDOWN_MS = 6 * 60 * 60 * 1000;

function shouldEvaluate(alert: MarketAlert) {
  return !alert.lastTriggeredAt || Date.now() - Date.parse(alert.lastTriggeredAt) >= COOLDOWN_MS;
}

function marketMessage(alert: MarketAlert, asset: MarketAsset) {
  const threshold = alert.threshold ?? 0;
  if (alert.kind === "price-above" && asset.price >= threshold) return `${alert.symbol} 已达到 ${asset.price}，高于提醒价 ${threshold}`;
  if (alert.kind === "price-below" && asset.price <= threshold) return `${alert.symbol} 已降至 ${asset.price}，低于提醒价 ${threshold}`;
  if (alert.kind === "move-up" && asset.change24h >= threshold) return `${alert.symbol} 24 小时涨幅 ${asset.change24h.toFixed(2)}%，已超过 ${threshold}%`;
  if (alert.kind === "move-down" && asset.change24h <= -Math.abs(threshold)) return `${alert.symbol} 24 小时跌幅 ${Math.abs(asset.change24h).toFixed(2)}%，已超过 ${threshold}%`;
  return "";
}

export function GlobalAlertMonitor() {
  const { alerts, recordAlertEvent } = useAppState();
  const running = useRef(false);

  useEffect(() => {
    const enabled = alerts.filter((alert) => alert.enabled && shouldEvaluate(alert));
    if (!enabled.length) return;
    let active = true;
    const run = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const needsMarkets = enabled.some((alert) => !["news", "funding"].includes(alert.kind));
        const needsNews = enabled.some((alert) => alert.kind === "news");
        const fundingSymbols = [...new Set(enabled.filter((alert) => alert.kind === "funding").map((alert) => alert.symbol))];
        const [marketResults, newsResult, ...fundingResults] = await Promise.allSettled([
          needsMarkets ? Promise.all([fetchMarketFeed("crypto"), fetchMarketFeed("stocks")]) : Promise.resolve(null),
          needsNews ? fetch("/api/editorial", { cache: "no-store" }).then((response) => response.ok ? response.json() as Promise<EditorialFeedSnapshot> : null) : Promise.resolve(null),
          ...fundingSymbols.map((symbol) => fetch(`/api/market-intelligence?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" }).then((response) => response.ok ? response.json() as Promise<MarketIntelligence> : null)),
        ]);
        if (!active) return;
        const feeds = marketResults.status === "fulfilled" ? marketResults.value : null;
        const assets = feeds ? [...feeds[0].assets, ...feeds[1].assets] : [];
        const news = newsResult.status === "fulfilled" ? newsResult.value : null;
        const fundingBySymbol = new Map<string, MarketIntelligence>();
        fundingResults.forEach((result, index) => { if (result.status === "fulfilled" && result.value) fundingBySymbol.set(fundingSymbols[index], result.value); });

        for (const alert of enabled) {
          let message = "";
          if (["price-above", "price-below", "move-up", "move-down"].includes(alert.kind)) {
            const candidates = assets.filter((asset) => asset.id === alert.assetId || canonicalAssetId(asset) === alert.assetId || canonicalAssetSymbol(asset) === alert.symbol).sort((left, right) => right.volume - left.volume);
            if (candidates[0]) message = marketMessage(alert, candidates[0]);
          } else if (alert.kind === "news") {
            const since = Date.parse(alert.lastTriggeredAt ?? alert.createdAt);
            const item = news?.items.find((entry) => Date.parse(entry.publishedAt) > since && isShareableMarketStory(entry) && isRigorousDigestHeadlineSource(entry.title) && (entry.relatedAssets.includes(alert.symbol) || new RegExp(`\\b${alert.symbol}\\b`, "i").test(entry.title)));
            if (item) message = `${alert.symbol} 出现相关重要消息：${item.title}`;
          } else if (alert.kind === "funding") {
            const data = fundingBySymbol.get(alert.symbol);
            const maxRate = Math.max(0, ...(data?.derivatives.map((metric) => Math.abs(metric.fundingRate * 100)) ?? []));
            if (maxRate >= (alert.threshold ?? 0)) message = `${alert.symbol} 资金费率绝对值达到 ${maxRate.toFixed(4)}%，超过提醒阈值`;
          }
          if (!message) continue;
          recordAlertEvent({ alertId: alert.id, symbol: alert.symbol, message });
          if ("Notification" in window && Notification.permission === "granted") new Notification(`Stone Daily · ${alert.symbol}`, { body: message, icon: "/icon.png", tag: `stone-${alert.id}` });
        }
      } finally {
        running.current = false;
      }
    };
    void run();
    const timer = window.setInterval(run, 90_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [alerts, recordAlertEvent]);
  return null;
}
