/**
 * Edge Middleware — uses Edge-safe auth config (NO Prisma).
 * Full auth (with Prisma) lives in src/lib/auth.ts for Node.js runtime only.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Protected route prefixes and their required roles
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/superadmin": ["SUPER_ADMIN"],
  "/admin": ["SUPER_ADMIN", "BUSINESS_OWNER", "BRANCH_MANAGER", "CASHIER", "WAREHOUSE_STAFF", "PRODUCTION_STAFF", "CONTENT_MANAGER"],
  "/pos": ["SUPER_ADMIN", "BUSINESS_OWNER", "BRANCH_MANAGER", "CASHIER"],
  "/customer": ["CUSTOMER", "SUPER_ADMIN", "BUSINESS_OWNER"],
  "/merchant": ["MERCHANT", "SUPER_ADMIN", "BUSINESS_OWNER"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Static files with extensions
  if (pathname.includes(".") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // Public routes — always allowed
  const publicPaths = [
    "/",
    "/login",
    "/register",
    "/menu",
    "/b2b",
    "/checkout",
    "/cart",
    "/forgot-password",
    "/about",
    "/products",
    "/blog",
    "/contact",
    "/wholesale",
    "/branches",
    "/news",
    "/account",
    "/orders",
    "/api/auth",
    "/api/products",
    "/api/categories",
    "/api/news",
    "/api/chat",
    "/api/orders/track",
  ];
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  // API routes that need auth checked separately
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = session.user?.role;

  // Check role-based access
  for (const [prefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
