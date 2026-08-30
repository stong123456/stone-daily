import { NextRequest, NextResponse } from "next/server";
import { collectMarketIntelligence } from "@/services/server/marketIntelligence";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") ?? "BTC").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  const intelligence = await collectMarketIntelligence(symbol);
  return NextResponse.json(intelligence, {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
  });
}
