import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "healthy", service: "stone-daily-web" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
