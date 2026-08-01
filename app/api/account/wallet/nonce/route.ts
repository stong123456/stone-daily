import { NextRequest, NextResponse } from "next/server";
import { accountSyncAvailable, allowAccountAttempt, createWalletChallenge, isSameOrigin, normalizeWalletAddress } from "@/services/server/accountStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "origin_rejected" }, { status: 403 });
  if (!accountSyncAvailable()) return NextResponse.json({ error: "account_sync_unavailable" }, { status: 503 });
  try {
    const body = await request.json() as { address?: unknown; chainId?: unknown };
    const address = normalizeWalletAddress(body.address);
    const chainId = Number(body.chainId);
    if (!address || !Number.isSafeInteger(chainId) || chainId <= 0) return NextResponse.json({ error: "invalid_wallet" }, { status: 400 });
    if (!allowAccountAttempt(request, address)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    return NextResponse.json(await createWalletChallenge(request, address, chainId), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "account_service_error" }, { status: 503 }); }
}
