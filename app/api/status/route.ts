import { NextResponse } from "next/server";
import { collectEconomicCalendar } from "@/services/server/economicCalendar";
import { collectEditorialFeed } from "@/services/server/editorialFeeds";
import { collectMarketSnapshot, readMarketSnapshot } from "@/services/server/marketIngestion";
import type { DataProviderStatus, DataTrustSnapshot } from "@/types/market";

export const dynamic = "force-dynamic";

function ageSeconds(value?: string) {
  if (!value) return 0;
  const age = (Date.now() - Date.parse(value)) / 1000;
  return Number.isFinite(age) ? Math.max(0, Math.round(age)) : 0;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 9_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("status check timeout")), timeoutMs)),
  ]);
}

export async function GET() {
  const [cryptoResult, stocksResult, editorialResult, calendarResult] = await Promise.allSettled([
    withTimeout(readMarketSnapshot("crypto").then((value) => value?.value ?? collectMarketSnapshot("crypto"))),
    withTimeout(readMarketSnapshot("stocks").then((value) => value?.value ?? collectMarketSnapshot("stocks"))),
    withTimeout(collectEditorialFeed()),
    withTimeout(collectEconomicCalendar()),
  ]);
  const providers: DataProviderStatus[] = [];
  if (cryptoResult.status === "fulfilled") cryptoResult.value.providers.forEach((item) => providers.push({ name: item.name, surface: "crypto", status: item.status, itemCount: item.count, latencyMs: item.latencyMs, updatedAt: item.updatedAt ?? cryptoResult.value.updatedAt, url: item.docsUrl }));
  else providers.push({ name: "Crypto market aggregation", surface: "crypto", status: "unavailable", itemCount: 0 });
  if (stocksResult.status === "fulfilled") stocksResult.value.providers.forEach((item) => providers.push({ name: item.name, surface: "stocks", status: item.status, itemCount: item.count, latencyMs: item.latencyMs, updatedAt: item.updatedAt ?? stocksResult.value.updatedAt, url: item.docsUrl }));
  else providers.push({ name: "Tokenized-stock aggregation", surface: "stocks", status: "unavailable", itemCount: 0 });
  if (editorialResult.status === "fulfilled") editorialResult.value.providers.forEach((item) => providers.push({ name: item.name, surface: "editorial", status: item.status, itemCount: item.itemCount, updatedAt: editorialResult.value.updatedAt, url: item.url }));
  else providers.push({ name: "Editorial aggregation", surface: "editorial", status: "unavailable", itemCount: 0 });
  if (calendarResult.status === "fulfilled") calendarResult.value.providers.forEach((item) => providers.push({ name: item.name, surface: "calendar", status: item.status, itemCount: item.eventCount, updatedAt: calendarResult.value.updatedAt, url: item.url }));
  else providers.push({ name: "Economic calendar", surface: "calendar", status: "unavailable", itemCount: 0 });

  const live = providers.filter((item) => item.status === "live").length;
  const available = providers.filter((item) => item.status !== "unavailable").length;
  const ages = providers.map((item) => ageSeconds(item.updatedAt)).filter((value) => value > 0);
  const snapshot: DataTrustSnapshot = {
    updatedAt: new Date().toISOString(),
    overall: live >= providers.length * .65 ? "healthy" : available >= providers.length * .5 ? "partial" : "degraded",
    providers,
    checks: { live, total: providers.length, oldestAgeSeconds: ages.length ? Math.max(...ages) : 0 },
  };
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
