import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin, SESSION_COOKIE } from "@/services/server/accountStore";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "origin_rejected" }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
