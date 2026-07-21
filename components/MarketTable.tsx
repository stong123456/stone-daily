"use client";

import type { MarketAsset } from "@/types/market";
import { AssetRow } from "@/components/AssetRow";

export function MarketTable({ assets, watchlistIds, loadingId, onExplain, onCalm, onToggleWatchlist }: {
  assets: MarketAsset[];
  watchlistIds: string[];
  loadingId: string | null;
  onExplain: (asset: MarketAsset) => void;
  onCalm: (asset: MarketAsset) => void;
  onToggleWatchlist: (id: string) => void;
}) {
  return (
    <div className="market-table" role="table" aria-label="资产行情">
      <div className="market-table__head" role="row">
        <span role="columnheader">资产</span>
        <span role="columnheader">当前价格</span>
        <span role="columnheader">24h 涨跌</span>
        <span role="columnheader">成交量</span>
        <span role="columnheader">AI 一句话</span>
        <span role="columnheader">操作</span>
      </div>
      {assets.map((asset) => (
        <AssetRow
          asset={asset}
          isWatched={watchlistIds.includes(asset.id)}
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
