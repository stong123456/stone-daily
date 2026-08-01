import { NextRequest, NextResponse } from "next/server";
import { accountSyncAvailable, readAccount, readAdminOverview, sessionAccountId } from "@/services/server/accountStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!accountSyncAvailable()) return NextResponse.json({ error: "admin_service_unavailable" }, { status: 503 });
  const accountId = sessionAccountId(request);
  if (!accountId) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  try {
    const account = await readAccount(accountId);
    if (!account?.isAdmin) return NextResponse.json({ error: "admin_forbidden" }, { status: 403 });
    return NextResponse.json(await readAdminOverview(), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "admin_service_unavailable" }, { status: 503 }); }
}
