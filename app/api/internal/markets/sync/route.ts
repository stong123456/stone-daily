import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { collectAndStoreAllMarkets } from "@/services/server/marketIngestion";
import { hasRedisSnapshotStore } from "@/services/server/marketSnapshotStore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const authorization = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const headerSecret = request.headers.get("x-cron-secret") ?? "";
  return safeEqual(authorization, secret) || safeEqual(headerSecret, secret);
}

async function sync(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const startedAt = Date.now();
  const { crypto, stocks } = await collectAndStoreAllMarkets();
  return NextResponse.json({
    ok: true,
    storage: hasRedisSnapshotStore() ? "redis" : "local-fallback",
    durationMs: Date.now() - startedAt,
    updatedAt: new Date().toISOString(),
    markets: {
      crypto: { mode: crypto.mode, assets: crypto.assets.length, providers: crypto.providers },
      stocks: { mode: stocks.mode, assets: stocks.assets.length, providers: stocks.providers },
    },
  });
}

export async function GET(request: NextRequest) {
  return sync(request);
}

export async function POST(request: NextRequest) {
  return sync(request);
}
