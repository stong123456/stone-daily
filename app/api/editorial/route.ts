import { NextResponse } from "next/server";
import { collectEditorialFeed } from "@/services/server/editorialFeeds";
import { buildEditorialDigests } from "@/services/server/editorialDigest";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await collectEditorialFeed();
  const digests = await buildEditorialDigests(snapshot.items);
  return NextResponse.json({ ...snapshot, digests }, {
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
    },
  });
}
