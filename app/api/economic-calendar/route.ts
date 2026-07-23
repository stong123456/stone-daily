import { NextResponse } from "next/server";
import { collectEconomicCalendar } from "@/services/server/economicCalendar";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await collectEconomicCalendar();
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
