import { NextRequest, NextResponse } from "next/server";
import { accountSyncAvailable, readAccount, sessionAccountId } from "@/services/server/accountStore";
import { exportAdminAnalyticsCsv } from "@/services/server/analyticsStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!accountSyncAvailable()) return NextResponse.json({ error: "admin_service_unavailable" }, { status: 503 });
  const accountId = sessionAccountId(request);
  if (!accountId) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  try {
    const account = await readAccount(accountId);
    if (!account?.isAdmin) return NextResponse.json({ error: "admin_forbidden" }, { status: 403 });
    const requestedDays = Number(request.nextUrl.searchParams.get("days") || 14);
    const days = [7, 14, 30, 90].includes(requestedDays) ? requestedDays : 14;
    const csv = await exportAdminAnalyticsCsv(days);
    return new NextResponse(csv, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="stone-daily-analytics-${days}d.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json({ error: "admin_service_unavailable" }, { status: 503 });
  }
}
