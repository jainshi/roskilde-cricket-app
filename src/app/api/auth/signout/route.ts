import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getCurrentSession } from "@/modules/auth-rbac/services/session-guard";
import { revokeSession } from "@/modules/auth-rbac/services/session.service";

async function handleSignOut(request: NextRequest) {
  const session = await getCurrentSession();
  if (session) {
    await revokeSession(session.sessionToken);
  }
  await clearSessionCookie();

  const reason = request.nextUrl.searchParams.get("reason") || "signedout";
  const url = new URL("/signin", request.url);
  url.searchParams.set("reason", reason);

  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(request: NextRequest) {
  return handleSignOut(request);
}

export async function POST(request: NextRequest) {
  return handleSignOut(request);
}
