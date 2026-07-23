import { NextResponse } from "next/server";
import { collectEditorialFeed } from "@/services/server/editorialFeeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await collectEditorialFeed();
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
    },
  });
}
