import { NextRequest, NextResponse } from "next/server";
import { accountSyncAvailable, allowAccountAttempt, authenticateWallet, consumeWalletChallenge, createSessionToken, isSameOrigin, logAccountServiceError, normalizeWalletAddress, sanitizeSyncPayload, SESSION_COOKIE, SESSION_MAX_AGE } from "@/services/server/accountStore";
import type { Hex } from "viem";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "origin_rejected" }, { status: 403 });
  if (!accountSyncAvailable()) return NextResponse.json({ error: "account_sync_unavailable" }, { status: 503 });
  try {
    const body = await request.json() as { address?: unknown; chainId?: unknown; nonce?: unknown; message?: unknown; signature?: unknown; payload?: unknown };
    const address = normalizeWalletAddress(body.address);
    const chainId = Number(body.chainId);
    const payload = sanitizeSyncPayload(body.payload);
    if (!address || !Number.isSafeInteger(chainId) || chainId <= 0 || typeof body.nonce !== "string" || !/^[a-f0-9]{32}$/i.test(body.nonce) || typeof body.message !== "string" || body.message.length > 4_000 || typeof body.signature !== "string" || !/^0x[a-f0-9]+$/i.test(body.signature) || !payload) return NextResponse.json({ error: "invalid_wallet_signature" }, { status: 400 });
    if (!allowAccountAttempt(request, address)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const valid = await consumeWalletChallenge({ address, chainId, nonce: body.nonce, message: body.message, signature: body.signature as Hex });
    if (!valid) return NextResponse.json({ error: "invalid_wallet_signature" }, { status: 401 });
    const result = await authenticateWallet(address, payload);
    if (!result) return NextResponse.json({ error: "account_service_error" }, { status: 503 });
    const response = NextResponse.json({ authenticated: true, account: result.account, created: result.created });
    response.cookies.set(SESSION_COOKIE, createSessionToken(result.accountId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_MAX_AGE });
    return response;
  } catch (error) { logAccountServiceError("wallet_verify", error); return NextResponse.json({ error: "account_service_error" }, { status: 503 }); }
}
