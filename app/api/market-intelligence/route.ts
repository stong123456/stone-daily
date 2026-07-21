import { NextRequest, NextResponse } from "next/server";
import type { DerivativeVenueMetric, MarketCandle, MarketIntelligence } from "@/types/market";

export const dynamic = "force-dynamic";

type VenueBundle = {
  metric: DerivativeVenueMetric;
  candles: MarketCandle[];
};

function numberOrZero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { next: { revalidate: 10 }, signal: AbortSignal.timeout(5_500) });
  if (!response.ok) throw new Error(`${new URL(url).hostname} ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchBinance(symbol: string): Promise<VenueBundle> {
  const pair = `${symbol}USDT`;
  const [premium, interest, klines] = await Promise.all([
    fetchJson<{ markPrice: string; lastFundingRate: string; nextFundingTime: number }>(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${pair}`),
    fetchJson<{ openInterest: string }>(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${pair}`),
    fetchJson<Array<[number, string, string, string, string, string]>>(`https://fapi.binance.com/fapi/v1/klines?symbol=${pair}&interval=1h&limit=24`),
  ]);
  const markPrice = numberOrZero(premium.markPrice);
  const openInterest = numberOrZero(interest.openInterest);
  return {
    metric: {
      venue: "Binance Futures",
      markPrice,
      fundingRate: numberOrZero(premium.lastFundingRate),
      openInterest,
      openInterestValue: openInterest * markPrice,
      nextFundingTime: numberOrZero(premium.nextFundingTime),
    },
    candles: klines.map((row) => ({
      time: row[0],
      open: numberOrZero(row[1]),
      high: numberOrZero(row[2]),
      low: numberOrZero(row[3]),
      close: numberOrZero(row[4]),
      volume: numberOrZero(row[5]),
    })),
  };
}

async function fetchBybit(symbol: string): Promise<VenueBundle> {
  const pair = `${symbol}USDT`;
  const [tickerPayload, klinePayload] = await Promise.all([
    fetchJson<{ result?: { list?: Array<{ markPrice: string; fundingRate: string; openInterest: string; openInterestValue?: string; nextFundingTime: string }> } }>(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${pair}`),
    fetchJson<{ result?: { list?: string[][] } }>(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${pair}&interval=60&limit=24`),
  ]);
  const ticker = tickerPayload.result?.list?.[0];
  if (!ticker) throw new Error("Bybit derivative ticker unavailable");
  const candles = (klinePayload.result?.list ?? []).map((row) => ({
    time: numberOrZero(row[0]),
    open: numberOrZero(row[1]),
    high: numberOrZero(row[2]),
    low: numberOrZero(row[3]),
    close: numberOrZero(row[4]),
    volume: numberOrZero(row[5]),
  })).reverse();
  return {
    metric: {
      venue: "Bybit Linear",
      markPrice: numberOrZero(ticker.markPrice),
      fundingRate: numberOrZero(ticker.fundingRate),
      openInterest: numberOrZero(ticker.openInterest),
      openInterestValue: numberOrZero(ticker.openInterestValue),
      nextFundingTime: numberOrZero(ticker.nextFundingTime),
    },
    candles,
  };
}

async function fetchOkx(symbol: string): Promise<VenueBundle> {
  const instrument = `${symbol}-USDT-SWAP`;
  const [fundingPayload, interestPayload, markPayload, candlePayload] = await Promise.all([
    fetchJson<{ data?: Array<{ fundingRate: string; nextFundingTime: string }> }>(`https://www.okx.com/api/v5/public/funding-rate?instId=${instrument}`),
    fetchJson<{ data?: Array<{ oi: string; oiUsd?: string }> }>(`https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=${instrument}`),
    fetchJson<{ data?: Array<{ markPx: string }> }>(`https://www.okx.com/api/v5/public/mark-price?instType=SWAP&instId=${instrument}`),
    fetchJson<{ data?: string[][] }>(`https://www.okx.com/api/v5/market/candles?instId=${instrument}&bar=1H&limit=24`),
  ]);
  const funding = fundingPayload.data?.[0];
  const interest = interestPayload.data?.[0];
  const mark = markPayload.data?.[0];
  if (!funding || !interest || !mark) throw new Error("OKX derivative ticker unavailable");
  const markPrice = numberOrZero(mark.markPx);
  const openInterest = numberOrZero(interest.oi);
  const candles = (candlePayload.data ?? []).map((row) => ({
    time: numberOrZero(row[0]),
    open: numberOrZero(row[1]),
    high: numberOrZero(row[2]),
    low: numberOrZero(row[3]),
    close: numberOrZero(row[4]),
    volume: numberOrZero(row[5]),
  })).reverse();
  return {
    metric: {
      venue: "OKX Swap",
      markPrice,
      fundingRate: numberOrZero(funding.fundingRate),
      openInterest,
      openInterestValue: numberOrZero(interest.oiUsd) || openInterest * markPrice,
      nextFundingTime: numberOrZero(funding.nextFundingTime),
    },
    candles,
  };
}

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") ?? "BTC").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  const results = await Promise.allSettled([fetchBinance(symbol), fetchBybit(symbol), fetchOkx(symbol)]);
  const bundles = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const derivatives = bundles.map((bundle) => bundle.metric).filter((metric) => metric.markPrice > 0);
  const prices = derivatives.map((metric) => metric.markPrice);
  const low = prices.length ? Math.min(...prices) : 0;
  const high = prices.length ? Math.max(...prices) : 0;
  const candleBundle = bundles.find((bundle) => bundle.candles.length >= 12);
  const intelligence: MarketIntelligence = {
    symbol,
    updatedAt: new Date().toISOString(),
    candleVenue: candleBundle?.metric.venue,
    candles: candleBundle?.candles ?? [],
    derivatives,
    markSpreadPct: low ? ((high - low) / low) * 100 : 0,
    sourceMode: bundles.length === 3 ? "live" : bundles.length ? "partial" : "unavailable",
  };

  return NextResponse.json(intelligence, {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
  });
}
