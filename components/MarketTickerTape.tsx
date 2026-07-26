"use client";

import { AssetLogo } from "@/components/AssetLogo";
import { formatPercent, formatPrice } from "@/services/format";
import { canonicalAssetSymbol, topUniqueMovers } from "@/services/marketWeather";
import type { MarketAsset } from "@/types/market";

export function MarketTickerTape({ assets, limit = 20 }: { assets: MarketAsset[]; limit?: number }) {
  const movers = topUniqueMovers(assets, limit);
  if (!movers.length) return null;
  const loops = [movers, movers];
  return (
    <section aria-label={`去重后的24小时涨幅前 ${movers.length} 名`} className="ticker-tape ticker-tape--market">
      <strong className="ticker-tape__label">涨幅 TOP {movers.length}</strong>
      <div className="ticker-tape__viewport">
        <div className="ticker-tape__track">
          {loops.flatMap((items, loopIndex) => items.map((asset, index) => (
            <span aria-hidden={loopIndex === 1} className="ticker-tape__item" key={`${loopIndex}-${asset.id}-${index}`}>
              <em>#{index + 1}</em><AssetLogo asset={asset} size={19} /><b>{canonicalAssetSymbol(asset)}</b><span>{formatPrice(asset.price)}</span><i>{formatPercent(asset.change24h)}</i><small>{asset.venue ?? "行情源"}</small>
            </span>
          )))}
        </div>
      </div>
    </section>
  );
}
