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
  "/settings",
];

export function resolveProxyRedirect(
  pathname: string,
  hasSessionCookie: boolean,
): string | null {
  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isProtectedPath && !hasSessionCookie) {
    return "/login";
  }

  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
  const redirectPath = resolveProxyRedirect(pathname, hasSessionCookie);

  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
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
    "/settings/:path*",
    "/login",
  ],
};
