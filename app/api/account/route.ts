import { NextRequest, NextResponse } from "next/server";
import { accountSyncAvailable, readAccount, sessionAccountId } from "@/services/server/accountStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!accountSyncAvailable()) return NextResponse.json({ available: false, authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  const accountId = sessionAccountId(request);
  if (!accountId) return NextResponse.json({ available: true, authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  try {
    const account = await readAccount(accountId);
    return NextResponse.json(account ? { available: true, authenticated: true, account } : { available: true, authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ available: false, authenticated: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
