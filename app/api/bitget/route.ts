import { NextRequest, NextResponse } from "next/server";
import { fetchJson } from "@/services/server/exchangeMarketAdapters";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Product = { symbol: string; baseCoin: string; quoteCoin: string; status: string };
type Ticker = { symbol: string; lastPr: string; ts: string; [key: string]: string };
type Book = { bids: string[][]; asks: string[][]; ts: string };
const base = "https://api.bitget.com";
const cache = new Map<string, { at: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
async function load<T>(path: string, ttl = 15000): Promise<T> {
 const old = cache.get(path); if (old && Date.now() - old.at < ttl) return old.value as T;
 const existing = pending.get(path); if (existing) return existing as Promise<T>;
 const job = (async () => {
  const d = await fetchJson<{ code: string; data: T }>(base + path);
  if (d.code !== "00000") throw Error("BITGET_RESPONSE_ERROR");
  if (cache.size >= 256) cache.delete(cache.keys().next().value!);
  cache.set(path, { at: Date.now(), value: d.data }); return d.data;
 })(); pending.set(path, job);
 try { return await job; } finally { pending.delete(path); }
}
export async function GET(request: NextRequest) {
 const symbol = request.nextUrl.searchParams.get("symbol");
 if (symbol !== null && !/^[A-Z0-9.]{1,16}$/.test(symbol)) return NextResponse.json({ status: "unavailable", reason: "UNSUPPORTED_ASSET" }, { status: 400 });
 try {
  const infos = (await load<Product[]>("/api/v2/spot/public/symbols", 300000)).filter(i => /^r[A-Z0-9.]{1,16}$/.test(i.baseCoin) && i.quoteCoin === "USDT" && i.symbol === i.baseCoin.toUpperCase() + "USDT");
  let data;
  if (!symbol) {
   const pairs = new Set(infos.map(i => i.symbol));
   const tickers = (await load<Ticker[]>("/api/v2/spot/market/tickers")).filter(t => pairs.has(t.symbol));
   data = { infos, tickers };
  } else {
   const pair = `R${symbol}USDT`, info = infos.find(i => i.symbol === pair);
   if (!info) return NextResponse.json({ status: "unavailable", reason: "NO_VERIFIED_RTOKEN" }, { status: 404 });
   const [tickers, book, candles] = await Promise.allSettled([
    load<Ticker[]>(`/api/v2/spot/market/tickers?symbol=${pair}`),
    load<Book>(`/api/v2/spot/market/orderbook?symbol=${pair}&type=step0&limit=5`),
    load<string[][]>(`/api/v2/spot/market/candles?symbol=${pair}&granularity=1h&limit=168`, 60000),
   ]);
   data = { info, ticker: tickers.status === "fulfilled" ? tickers.value.find(t => t.symbol === pair) : null, book: book.status === "fulfilled" ? book.value : null, candles: candles.status === "fulfilled" ? candles.value : [] };
  }
  return NextResponse.json({ status: "ok", provider: "Bitget", via: "StoneDaily", retrievedAt: new Date().toISOString(), ...data }, { headers: { "Cache-Control": "public, s-maxage=10" } });
 } catch { return NextResponse.json({ status: "unavailable", reason: "BITGET_UPSTREAM_UNAVAILABLE" }, { status: 503 }); }
}
