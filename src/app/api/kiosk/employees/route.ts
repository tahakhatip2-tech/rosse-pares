import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api";

async function resolveKioskBusiness(req: NextRequest) {
  const token =
    req.headers.get("x-kiosk-token") ||
    req.nextUrl.searchParams.get("kioskToken") ||
    "";

  if (!token) return null;

  const business = await prisma.business.findUnique({
    where: { kioskToken: token },
    select: { id: true, nameAr: true, nameEn: true, logo: true, kioskTokenExp: true },
  });

  if (!business) return null;
  if (business.kioskTokenExp && business.kioskTokenExp < new Date()) return null;

  return business;
}

export async function GET(req: NextRequest) {
  try {
    const business = await resolveKioskBusiness(req);
    if (!business) {
      return err("جلسة بوابة البصمة منتهية أو غير صالحة. أعد فتح البوابة.", 401);
    }

    // ── Single employee lookup by badge number ──────────────────────────
    const badge = req.nextUrl.searchParams.get("badge");
    if (badge) {
      const cleanBadge = badge.trim();
      const numOnly = cleanBadge.replace(/\D/g, "");
      const variants = Array.from(
        new Set(
          [
            cleanBadge,
            cleanBadge.toUpperCase(),
            cleanBadge.toLowerCase(),
            numOnly ? `EMP${numOnly}` : "",
            numOnly ? `EMP-${numOnly}` : "",
            numOnly,
          ].filter(Boolean)
        )
      );

      const employee = await prisma.employee.findFirst({
        where: {
          businessId: business.id,
          isActive: true,
          OR: variants.map((v) => ({
            badgeNumber: { equals: v, mode: "insensitive" },
          })),
        },
        select: {
          id: true,
          nameAr: true,
          jobTitle: true,
          fingerprintEnrolled: true,
          badgeNumber: true,
          branch: { select: { id: true, nameAr: true } },
        },
      });
      if (!employee) {
        return err("الرقم الوظيفي غير موجود أو الموظف غير نشط", 404);
      }
      return ok({ employee });
    }

    // ── Full list (for admin/enrollment use) ────────────────────────────
    const employees = await prisma.employee.findMany({
      where: { businessId: business.id, isActive: true },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        badgeNumber: true,
        jobTitle: true,
        department: true,
        fingerprintEnrolled: true,
        // ⚠️ attendancePin and webAuthnPublicKey are NEVER sent to client
        branch: { select: { id: true, nameAr: true } },
      },
      orderBy: { nameAr: "asc" },
    });

    // Also fetch today's attendance for each employee
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todayRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        employeeId: { in: employees.map((e) => e.id) },
      },
      select: { employeeId: true, clockIn: true, clockOut: true, status: true },
    });

    const recordMap = new Map(todayRecords.map((r) => [r.employeeId, r]));

    const enriched = employees.map((emp) => ({
      ...emp,
      todayRecord: recordMap.get(emp.id) || null,
    }));

    return ok({
      business: { id: business.id, nameAr: business.nameAr, logo: business.logo },
      employees: enriched,
      count: enriched.length,
    });
  } catch (error) {
    console.error("[Kiosk Employees GET Error]:", error);
    return err("فشل في جلب بيانات الموظفين", 500);
  }
}
