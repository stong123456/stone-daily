import { NextRequest, NextResponse } from "next/server";
import { accountSyncAvailable, isSameOrigin, sanitizeSyncPayload, sessionAccountId, updateAccountSync } from "@/services/server/accountStore";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "origin_rejected" }, { status: 403 });
  if (!accountSyncAvailable()) return NextResponse.json({ error: "account_sync_unavailable" }, { status: 503 });
  const accountId = sessionAccountId(request);
  if (!accountId) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  try {
    const body = await request.json() as { payload?: unknown; baseRevision?: unknown };
    const payload = sanitizeSyncPayload(body.payload);
    const baseRevision = Number(body.baseRevision);
    if (!payload || !Number.isInteger(baseRevision) || baseRevision < 1) return NextResponse.json({ error: "invalid_sync_request" }, { status: 400 });
    const result = await updateAccountSync(accountId, payload, baseRevision);
    if (!result) return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    return NextResponse.json({ account: result.snapshot, conflict: result.conflict }, { status: result.conflict ? 409 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "account_service_error" }, { status: 503 });
  }
}
