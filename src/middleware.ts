import { NextResponse } from "next/server";

// Bypass authentication - auto-login as default user for development
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
