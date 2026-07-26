import { NextResponse } from "next/server";
import { collectHistoryToday } from "@/services/server/historyToday";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await collectHistoryToday();
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
