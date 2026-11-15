/**
 * ROZE PAREES — Full Auth (Node.js Runtime Only)
 * This file imports Prisma and runs only in Node.js (API routes, Server Components).
 * Do NOT import this in middleware.ts — use src/lib/auth.config.ts instead.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
            permissions: true,
            branchId: true,
            businessId: true,
            isActive: true,
            employee: { select: { nameAr: true, nameEn: true } },
            customer: { select: { nameAr: true, nameEn: true } },
            merchant: { select: { businessName: true, status: true } },
          },
        });

        if (!user || !user.isActive) return null;

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) return null;

        // Update lastLoginAt (fire and forget)
        prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {});

        const name =
          user.employee?.nameAr ||
          user.customer?.nameAr ||
          user.merchant?.businessName ||
          email;

        return {
          id: user.id,
          email: user.email,
          name,
          role: user.role,
          permissions: user.permissions,
          branchId: user.branchId,
          businessId: user.businessId,
        };
      },
    }),
  ],
});
