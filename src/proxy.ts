import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "bizmanage_session";
const PROTECTED_PATHS = [
  "/dashboard",
  "/master",
  "/sales",
  "/purchases",
  "/inventory",
  "/customer-returns",
  "/supplier-returns",
  "/expenses",
  "/change-password",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isProtectedPath && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && hasSessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/master/:path*",
    "/sales/:path*",
    "/purchases/:path*",
    "/inventory/:path*",
    "/customer-returns/:path*",
    "/supplier-returns/:path*",
    "/expenses/:path*",
    "/change-password",
    "/login",
  ],
};
