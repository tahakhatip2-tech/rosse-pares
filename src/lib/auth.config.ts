/**
 * ROZE PAREES — Auth Configuration (Edge-Safe)
 * This file contains only the NextAuth config that is safe for Edge Runtime.
 * It does NOT import Prisma or any Node.js-only modules.
 * Used by: src/middleware.ts (Edge)
 * Full auth (with Prisma) is in: src/lib/auth.ts (Node.js runtime only)
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
        token.branchId = (user as any).branchId;
        token.businessId = (user as any).businessId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.permissions = token.permissions as string[];
        session.user.branchId = token.branchId as string | null;
        session.user.businessId = token.businessId as string | null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
