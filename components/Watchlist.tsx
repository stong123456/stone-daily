"use client";

import { Star } from "@phosphor-icons/react";
import type { MarketAsset } from "@/types/market";
import { AssetRow } from "@/components/AssetRow";

export function Watchlist({ assets, loadingId, onExplain, onCalm, onToggleWatchlist }: {
  assets: MarketAsset[];
  loadingId: string | null;
  onExplain: (asset: MarketAsset) => void;
  onCalm: (asset: MarketAsset) => void;
  onToggleWatchlist: (id: string) => void;
}) {
  if (assets.length === 0) {
    return (
      <div className="empty-state">
        <span><Star aria-hidden size={26} weight="duotone" /></span>
        <h3>你还没有添加自选资产</h3>
        <p>回到币圈或币股，点一下星标。只收下你真正想持续观察的资产。</p>
      </div>
    );
  }

  return (
    <div className="watchlist-list">
      {assets.map((asset) => (
        <AssetRow
          asset={asset}
          compact
          isWatched
          key={asset.id}
          loading={loadingId === asset.id}
          onCalm={onCalm}
          onExplain={onExplain}
          onToggleWatchlist={onToggleWatchlist}
        />
      ))}
    </div>
  );
}
