"use client";

import { useMemo, useState } from "react";
import { canonicalAssetSymbol } from "@/services/marketWeather";
import type { MarketAsset } from "@/types/market";

const cryptoAliases: Record<string, string> = {
  XBT: "btc",
  BCHABC: "bch",
  BCC: "bch",
  IOTA: "miota",
};

function logoCandidates(asset: MarketAsset) {
  const symbol = canonicalAssetSymbol(asset);
  if (asset.market === "stock") {
    return [
      `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(symbol)}.png`,
    ];
  }
  const baseSymbol = symbol.replace(/(?:2|3|5)(?:L|S)$/i, "");
  const normalized = cryptoAliases[baseSymbol] ?? baseSymbol.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return [
    `https://assets.coincap.io/assets/icons/${normalized}@2x.png`,
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${normalized}.png`,
    `https://cryptoicons.org/api/icon/${normalized}/200`,
  ];
}

export function AssetLogo({ asset, size = 34 }: { asset: MarketAsset; size?: number }) {
  const candidates = useMemo(() => logoCandidates(asset), [asset.market, asset.symbol, asset.underlying]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const symbol = canonicalAssetSymbol(asset);
  const src = candidates[candidateIndex];

  return (
    <span className={`asset-avatar asset-avatar--${asset.market} asset-avatar--logo`} style={{ height: size, width: size }}>
      {src ? <img alt={`${symbol} Logo`} height={size} loading="lazy" onError={() => setCandidateIndex((index) => index + 1)} referrerPolicy="no-referrer" src={src} width={size} /> : <span aria-hidden="true">{symbol.slice(0, 1)}</span>}
    </span>
  );
}
