import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const isPublicRoute = pathname === "/login" || pathname === "/register";

  // API routes are handled separately
  const isApiRoute = pathname.startsWith("/api");

  // Check for session token (NextAuth uses next-auth.session-token)
  const sessionToken = request.cookies.get("next-auth.session-token") ||
                       request.cookies.get("__Secure-next-auth.session-token");
  const isLoggedIn = !!sessionToken;

  // If user is logged in and tries to access login page, redirect to dashboard
  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is not logged in and tries to access protected route, redirect to login
  if (!isLoggedIn && !isPublicRoute && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
