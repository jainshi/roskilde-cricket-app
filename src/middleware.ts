import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "rcc_session";

// Public routes accessible without authentication
const PUBLIC_PATHS = [
  "/signin",
  "/forgot-password",
  "/api/auth/signin",
  "/api/auth/forgot-password",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api routes that are public, and next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // If unauthenticated and trying to access a protected path, redirect to signin
  if (!sessionToken && !isPublicPath && pathname !== "/") {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If authenticated and visiting signin, redirect to dashboard
  if (sessionToken && pathname === "/signin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
