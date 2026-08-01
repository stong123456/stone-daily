import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EVENTS = new Set(["page_view", "asset_open", "watchlist_change", "alert_create", "digest_copy", "calm_open"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { name?: string; path?: string; properties?: unknown; timestamp?: string };
    if (!body.name || !EVENTS.has(body.name) || !body.path?.startsWith("/")) return NextResponse.json({ ok: false }, { status: 400 });
    const event = { name: body.name, path: body.path.slice(0, 160), properties: body.properties && typeof body.properties === "object" ? body.properties : {}, timestamp: body.timestamp ?? new Date().toISOString() };
    console.info("stone_daily_product_event", JSON.stringify(event));
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
}
