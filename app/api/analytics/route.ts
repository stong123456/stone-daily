import { NextRequest, NextResponse } from "next/server";
import { isAnalyticsEventName, sanitizeAnalyticsPath } from "@/services/analyticsPrivacy";
import { recordAnalyticsEvent } from "@/services/server/analyticsStore";
import { isSameOrigin } from "@/services/server/accountStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403 });
    const body = await request.json() as { name?: unknown; path?: unknown; properties?: unknown; referrer?: unknown };
    const path = sanitizeAnalyticsPath(body.path);
    if (!isAnalyticsEventName(body.name) || !path) return NextResponse.json({ ok: false }, { status: 400 });
    const stored = await recordAnalyticsEvent(request, { name: body.name, path, properties: body.properties, referrer: body.referrer });
    return NextResponse.json({ ok: true, stored }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: true, stored: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
