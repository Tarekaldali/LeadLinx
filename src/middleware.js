import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup");

    if (isAuthPage && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup");
        if (isAuthPage) return true; // Always allow access to auth pages (we handle redirect in middleware function)
        return !!token; // Protect other routes
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/leads/:path*",
    "/api/admin/:path*",
    "/api/harvester/:path*",
    "/login",
    "/signup"
  ],
};
