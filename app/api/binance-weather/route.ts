import { NextResponse } from "next/server";
import { buildBinanceWeatherSnapshot, type BinanceWeatherSnapshot } from "@/services/binanceWeather";
import { fetchBinanceWeatherMarkets } from "@/services/server/exchangeMarketAdapters";

export const dynamic = "force-dynamic";

const FRESH_MS = 90_000;
const STALE_IF_ERROR_MS = 30 * 60_000;
let cached: { value: BinanceWeatherSnapshot; storedAt: number } | null = null;
let pending: Promise<BinanceWeatherSnapshot> | null = null;

async function collectSnapshot() {
  const result = await fetchBinanceWeatherMarkets();
  const cryptoLive = Boolean(result.crypto?.assets.length);
  const stockLive = Boolean(result.stocks?.assets.length && result.stocks.status === "live");
  if (!cryptoLive && !stockLive) throw new Error(result.errors.join(" | ") || "Binance public market data unavailable");

  return buildBinanceWeatherSnapshot({
    cryptoAssets: result.crypto?.assets ?? [],
    stockAssets: result.stocks?.assets ?? [],
    cryptoCatalogCount: result.crypto?.count,
    stockCatalogCount: result.stocks?.count,
    cryptoLive,
    stockLive,
    updatedAt: new Date().toISOString(),
  });
}

async function resolveSnapshot() {
  const now = Date.now();
  if (cached && now - cached.storedAt <= FRESH_MS) return cached.value;
  if (!pending) {
    pending = collectSnapshot()
      .then((value) => {
        cached = { value, storedAt: Date.now() };
        return value;
      })
      .finally(() => {
        pending = null;
      });
  }
  try {
    return await pending;
  } catch (error) {
    if (cached && now - cached.storedAt <= STALE_IF_ERROR_MS) return { ...cached.value, mode: "partial" as const };
    throw error;
  }
}

export async function GET() {
  try {
    const snapshot = await resolveSnapshot();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Binance 市场天气暂时不可用", detail }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
