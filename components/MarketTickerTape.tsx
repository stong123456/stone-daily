"use client";

import { AssetLogo } from "@/components/AssetLogo";
import { useAppState } from "@/components/AppStateProvider";
import { formatPercent, formatPrice } from "@/services/format";
import { canonicalAssetSymbol, topUniqueMovers } from "@/services/marketWeather";
import type { MarketAsset } from "@/types/market";

export function MarketTickerTape({ assets, limit = 20 }: { assets: MarketAsset[]; limit?: number }) {
  const { language } = useAppState();
  const en = language === "en";
  const movers = topUniqueMovers(assets, limit);
  if (!movers.length) return null;
  const loops = [movers, movers];
  return (
    <section aria-label={en ? `Top ${movers.length} deduplicated 24-hour gainers` : `去重后的24小时涨幅前 ${movers.length} 名`} className="ticker-tape ticker-tape--market">
      <strong className="ticker-tape__label">{en ? "GAINERS" : "涨幅"} TOP {limit}</strong>
      <div className="ticker-tape__viewport">
        <div className="ticker-tape__track">
          {loops.flatMap((items, loopIndex) => items.map((asset, index) => (
            <span aria-hidden={loopIndex === 1} className="ticker-tape__item" key={`${loopIndex}-${asset.id}-${index}`}>
              <em>#{index + 1}</em><AssetLogo asset={asset} size={19} /><b>{canonicalAssetSymbol(asset)}</b><span>{formatPrice(asset.price)}</span><i>{formatPercent(asset.change24h)}</i><small>{asset.venue ?? (en ? "Market feed" : "行情源")}</small>
            </span>
          )))}
        </div>
      </div>
    </section>
  );
}
