import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { ok, err } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return err("البريد الإلكتروني وكلمة المرور مطلوبان", 400);
    }

    const { email, password } = body as { email: string; password: string };

    // Find user with BUSINESS_OWNER, ADMIN, or SUPER_ADMIN role
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        businessId: true,
        employee: {
          select: {
            businessId: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return err("بيانات الدخول غير صحيحة", 401);
    }

    // Only allow BUSINESS_OWNER, ADMIN, SUPER_ADMIN
    const allowedRoles = ["BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(user.role)) {
      return err("هذا الحساب غير مخوّل لفتح بوابة البصمة", 403);
    }

    // Verify password
    const passwordOk = await bcrypt.compare(password, user.passwordHash || "");
    if (!passwordOk) {
      return err("بيانات الدخول غير صحيحة", 401);
    }

    // Get businessId (from user directly, or employee, or default for SUPER_ADMIN)
    let businessId = user.businessId || user.employee?.businessId;
    if (!businessId && user.role === "SUPER_ADMIN") {
      const defaultBiz = await prisma.business.findFirst({ select: { id: true } });
      businessId = defaultBiz?.id;
    }

    if (!businessId) {
      return err("لم يتم ربط هذا الحساب بمحل تجاري. تواصل مع الدعم الفني.", 403);
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, nameAr: true, nameEn: true, logo: true },
    });

    if (!business) {
      return err("المحل التجاري المرتبط غير موجود أو تم حذفه.", 404);
    }

    // Generate kiosk session token
    const kioskToken = crypto.randomUUID();
    const kioskTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Save token to Business
    await prisma.business.update({
      where: { id: businessId },
      data: { kioskToken, kioskTokenExp },
    });

    return ok({
      kioskToken,
      expiresAt: kioskTokenExp.toISOString(),
      business: {
        id: businessId,
        nameAr: business?.nameAr,
        nameEn: business?.nameEn,
        logo: business?.logo,
      },
    });
  } catch (error) {
    console.error("[Kiosk Session POST Error]:", error);
    return err("فشل في فتح بوابة البصمة. حاول مرة أخرى.", 500);
  }
}
