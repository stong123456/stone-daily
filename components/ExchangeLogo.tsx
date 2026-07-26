"use client";

import { useMemo, useState } from "react";

const exchangeSlugs: Record<string, string> = {
  Binance: "binance",
  "Binance Web3": "binance",
  OKX: "okx",
  Bitget: "bitget",
  Bybit: "bybit",
  HTX: "htx",
  Kraken: "kraken",
  KuCoin: "kucoin",
  Gate: "gateio",
  MEXC: "mexc",
  Coinbase: "coinbase",
};

const exchangeDomains: Record<string, string> = {
  Binance: "www.binance.com",
  "Binance Web3": "www.binance.com",
  OKX: "www.okx.com",
  Bitget: "www.bitget.com",
  Bybit: "www.bybit.com",
  HTX: "www.htx.com",
  Kraken: "www.kraken.com",
  KuCoin: "www.kucoin.com",
  Gate: "www.gate.com",
  MEXC: "www.mexc.com",
  Coinbase: "www.coinbase.com",
};

const exchangeImageFallbacks: Record<string, string> = {
  HTX: "https://s2.coinmarketcap.com/static/img/exchanges/64x64/102.png",
  MEXC: "https://s2.coinmarketcap.com/static/img/exchanges/64x64/544.png",
};

export function ExchangeLogo({ name, size = 24 }: { name: string; size?: number }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const slug = exchangeSlugs[name];
  const domain = exchangeDomains[name];
  const imageFallback = exchangeImageFallbacks[name];
  const candidates = useMemo(() => [
    slug ? `https://cdn.simpleicons.org/${slug}` : "",
    imageFallback ?? "",
    domain ? `https://${domain}/favicon.ico` : "",
  ].filter(Boolean), [domain, imageFallback, slug]);
  const src = candidates[candidateIndex];
  return (
    <span className="exchange-logo" style={{ height: size, width: size }}>
      {src ? <img alt={`${name} Logo`} height={size} loading="lazy" onError={() => setCandidateIndex((index) => index + 1)} referrerPolicy="no-referrer" src={src} width={size} /> : <span aria-hidden="true">{name.slice(0, 1)}</span>}
    </span>
  );
}
