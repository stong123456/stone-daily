import { NextRequest, NextResponse } from "next/server";
import {
  collectAndStoreMarketSnapshot,
  collectMarketSnapshot,
  readMarketSnapshot,
  readStreamQuoteSnapshot,
  type MarketFeedKind,
  type MarketSnapshotEnvelope,
} from "@/services/server/marketIngestion";
import { calculateMarketSpreads, mergeStreamQuotes } from "@/services/marketStream";

export const dynamic = "force-dynamic";

const FRESH_SNAPSHOT_MS = 45_000;
async function resolveSnapshot(kind: MarketFeedKind, query: string) {
  if (query) return { snapshot: await collectMarketSnapshot(kind, query), cacheLayer: "direct" as const };

  const cached = await readMarketSnapshot(kind);
  const cachedAge = cached ? Date.now() - Date.parse(cached.value.updatedAt) : Number.POSITIVE_INFINITY;
  if (cached && Number.isFinite(cachedAge) && cachedAge <= FRESH_SNAPSHOT_MS) {
    return { snapshot: cached.value, cacheLayer: cached.layer };
  }

  const collected = await collectAndStoreMarketSnapshot(kind);
  if (collected.mode === "fallback" && cached && cached.value.mode !== "fallback") {
    const staleSnapshot: MarketSnapshotEnvelope = {
      ...cached.value,
      mode: "cached",
      source: `${cached.value.source} · 后台源暂不可用，保留最后成功快照`,
    };
    return { snapshot: staleSnapshot, cacheLayer: cached.layer };
  }
  return { snapshot: collected, cacheLayer: "direct" as const };
}

export async function GET(request: NextRequest) {
  const kind: MarketFeedKind = request.nextUrl.searchParams.get("kind") === "stocks" ? "stocks" : "crypto";
  const query = request.nextUrl.searchParams.get("q")?.trim().toUpperCase() ?? "";
  const streamPromise = kind === "crypto" ? readStreamQuoteSnapshot() : Promise.resolve(null);
  const [{ snapshot, cacheLayer }, stream] = await Promise.all([resolveSnapshot(kind, query), streamPromise]);
  const merged = mergeStreamQuotes(snapshot.assets, stream?.value);
  const spreads = kind === "crypto" ? calculateMarketSpreads(merged.assets) : [];
  const updatedAt = merged.streaming?.updatedAt ?? snapshot.updatedAt;

  return NextResponse.json({
    ...snapshot,
    assets: merged.assets,
    spreads,
    streaming: merged.streaming,
    cacheLayer,
    updatedAt,
  }, {
    headers: {
      "Cache-Control": query ? "no-store" : "public, s-maxage=2, stale-while-revalidate=30",
    },
  });
}
