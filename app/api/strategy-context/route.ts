import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { collectMarketIntelligence } from "@/services/server/marketIntelligence";
import { collectMarketSnapshot, readMarketSnapshot, type MarketFeedKind } from "@/services/server/marketIngestion";
import { buildStrategyContext } from "@/services/strategyContext";
import type { MarketIntelligence } from "@/types/market";

export const dynamic = "force-dynamic";

const MAX_SYMBOLS = 8;
const FRESH_SNAPSHOT_MS = 60_000;

function parseSymbols(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("symbols") ?? "BTC,ETH,SOL";
  return [...new Set(requested.split(",").map((value) => value.trim().toUpperCase()))]
    .filter((value) => /^[A-Z0-9]{2,10}$/.test(value))
    .slice(0, MAX_SYMBOLS);
}

async function resolveSnapshot(kind: MarketFeedKind) {
  const cached = await readMarketSnapshot(kind);
  const age = cached ? Date.now() - Date.parse(cached.value.updatedAt) : Number.POSITIVE_INFINITY;
  if (cached && Number.isFinite(age) && age <= FRESH_SNAPSHOT_MS) return cached.value;
  return collectMarketSnapshot(kind);
}

function signatureHeaders(body: string): Record<string, string> {
  const secret = process.env.STONE_STRATEGY_FEED_SECRET?.trim();
  if (!secret) return { "X-Stone-Signature-Mode": "unsigned" };
  const timestamp = Date.now().toString();
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return {
    "X-Stone-Signature-Mode": "hmac-sha256",
    "X-Stone-Timestamp": timestamp,
    "X-Stone-Signature": signature,
  };
}

export async function GET(request: NextRequest) {
  const symbols = parseSymbols(request);
  if (!symbols.length) return Response.json({ error: "No valid symbols" }, { status: 400 });

  const cryptoPromise = resolveSnapshot("crypto");
  const stocksPromise = resolveSnapshot("stocks");
  const intelligencePromise = Promise.allSettled(symbols.map((symbol) => collectMarketIntelligence(symbol)));
  const [crypto, stocks, intelligenceResults] = await Promise.all([cryptoPromise, stocksPromise, intelligencePromise]);
  const intelligenceBySymbol: Record<string, MarketIntelligence | undefined> = {};
  intelligenceResults.forEach((result, index) => {
    if (result.status === "fulfilled") intelligenceBySymbol[symbols[index]] = result.value;
  });

  const context = buildStrategyContext({
    symbols,
    cryptoAssets: crypto.assets,
    stockAssets: stocks.assets,
    cryptoProviders: crypto.providers,
    stockProviders: stocks.providers,
    cryptoMode: crypto.mode,
    stockMode: stocks.mode,
    cryptoUpdatedAt: crypto.updatedAt,
    stockUpdatedAt: stocks.updatedAt,
    intelligenceBySymbol,
  });
  const body = JSON.stringify(context);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
      ...signatureHeaders(body),
    },
  });
}
