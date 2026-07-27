"use client";

import { Brain, FirstAid, Star } from "@phosphor-icons/react";
import { AssetLogo } from "@/components/AssetLogo";
import { useAppState } from "@/components/AppStateProvider";
import { formatCompact, formatPercent, formatPrice } from "@/services/format";
import { localizeAssetCopy } from "@/services/localization";
import type { MarketAsset } from "@/types/market";

export function AssetRow({
  asset,
  isWatched,
  onExplain,
  onCalm,
  onToggleWatchlist,
  loading = false,
  compact = false,
}: {
  asset: MarketAsset;
  isWatched: boolean;
  onExplain: (asset: MarketAsset) => void;
  onCalm: (asset: MarketAsset) => void;
  onToggleWatchlist: (id: string) => void;
  loading?: boolean;
  compact?: boolean;
}) {
  const { language } = useAppState();
  const en = language === "en";
  const copy = localizeAssetCopy(asset, language);
  return (
    <div className={`asset-row ${compact ? "asset-row--compact" : ""}`} role="row">
      <div className="asset-cell asset-cell--name" role="cell">
        <AssetLogo asset={asset} />
        <span><strong>{asset.symbol}</strong><small>{copy.name}</small></span>
      </div>
      <div className="asset-cell asset-cell--price" role="cell"><strong>{formatPrice(asset.price)}</strong><small>{copy.narrative}</small></div>
      <div className={`asset-cell asset-change ${asset.change24h >= 0 ? "is-positive" : "is-negative"}`} role="cell">{formatPercent(asset.change24h)}</div>
      {compact ? null : <div className="asset-cell asset-cell--volume" role="cell">{formatCompact(asset.volume)}</div>}
      <div className="asset-cell asset-cell--ai" role="cell"><span className="status-tag">{copy.aiTag}</span><small>{copy.aiHint}</small></div>
      <div className="asset-cell asset-actions" role="cell">
        <button className="row-action" disabled={loading} onClick={() => onExplain(asset)} type="button"><Brain size={16} /> {en ? "AI brief" : "AI 解读"}</button>
        <button className="row-action" onClick={() => onCalm(asset)} type="button"><FirstAid size={16} /> {en ? "Help me pause" : "帮我冷静"}</button>
        <button aria-label={isWatched ? (en ? `Remove ${asset.symbol} from watchlist` : `移除 ${asset.symbol} 自选`) : (en ? `Add ${asset.symbol} to watchlist` : `将 ${asset.symbol} 加入自选`)} className="row-action row-action--icon" data-active={isWatched} onClick={() => onToggleWatchlist(asset.id)} type="button"><Star size={17} weight={isWatched ? "fill" : "regular"} /></button>
      </div>
    </div>
  );
}
