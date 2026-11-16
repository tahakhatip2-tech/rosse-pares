import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api";
import bcrypt from "bcryptjs";

// Simple in-memory rate limiter: badgeNumber -> { count, firstAttempt }
const rateLimitMap = new Map<string, { count: number; blockedUntil: number }>();

function checkRateLimit(key: string): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (entry) {
    if (entry.blockedUntil > now) {
      return { blocked: true, remaining: 0 };
    }
    // Reset if window has passed (more than 5 min)
    if (now - (entry.blockedUntil - 60_000) > 5 * 60_000) {
      rateLimitMap.delete(key);
    }
  }

  return { blocked: false, remaining: 3 - (entry?.count ?? 0) };
}

function recordFailedAttempt(key: string): number {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  const count = (entry?.count ?? 0) + 1;

  if (count >= 3) {
    rateLimitMap.set(key, { count, blockedUntil: now + 60_000 }); // block 60s
    return 0;
  }

  rateLimitMap.set(key, { count, blockedUntil: 0 });
  return 3 - count;
}

function clearRateLimit(key: string) {
  rateLimitMap.delete(key);
}

async function resolveKioskBusiness(req: NextRequest) {
  const token = req.headers.get("x-kiosk-token") || "";
  if (!token) return null;

  const business = await prisma.business.findUnique({
    where: { kioskToken: token },
    select: { id: true, nameAr: true, kioskTokenExp: true },
  });

  if (!business) return null;
  if (business.kioskTokenExp && business.kioskTokenExp < new Date()) return null;
  return business;
}

export async function POST(req: NextRequest) {
  try {
    const business = await resolveKioskBusiness(req);
    if (!business) {
      return err("جلسة بوابة البصمة منتهية أو غير صالحة. أعد فتح البوابة.", 401);
    }

    const body = await req.json().catch(() => null);
    if (!body) return err("بيانات الطلب غير صالحة", 400);

    const { badgeNumber, pin, action } = body as {
      badgeNumber?: string;
      pin?: string;
      action?: string;
    };

    if (!badgeNumber?.trim()) return err("يرجى إدخال الرقم الوظيفي", 400);
    if (!pin || pin.length < 4) return err("يرجى إدخال رمز PIN المكون من 4 أرقام", 400);
    if (!["CLOCK_IN", "CLOCK_OUT"].includes(action || "")) {
      return err("نوع العملية غير صالح", 400);
    }

    const rlKey = `${business.id}:${badgeNumber.trim()}`;

    // Check rate limit
    const { blocked } = checkRateLimit(rlKey);
    if (blocked) {
      return err("تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار دقيقة.", 429);
    }

    // Find employee by badgeNumber inside this business
    const employee = await prisma.employee.findFirst({
      where: {
        businessId: business.id,
        badgeNumber: badgeNumber.trim(),
        isActive: true,
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        jobTitle: true,
        department: true,
        attendancePin: true,
        badgeNumber: true,
        branch: { select: { id: true, nameAr: true } },
      },
    });

    if (!employee || !employee.attendancePin) {
      recordFailedAttempt(rlKey);
      return err("الرقم الوظيفي غير موجود أو لم يُعيَّن رمز PIN لهذا الموظف.", 401);
    }

    // Verify PIN
    const pinOk = await bcrypt.compare(pin, employee.attendancePin);
    if (!pinOk) {
      const remaining = recordFailedAttempt(rlKey);
      const msg =
        remaining > 0
          ? `رمز PIN غير صحيح. تبقى لك ${remaining} محاولة.`
          : "رمز PIN غير صحيح. تم تجميد الرقم الوظيفي لدقيقة واحدة.";
      return err(msg, 401);
    }

    // PIN correct — clear rate limit
    clearRateLimit(rlKey);

    // Record attendance
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: employee.id,
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    let record;

    if (action === "CLOCK_IN") {
      if (existing?.clockIn) {
        // Already clocked in today — update status/notes but don't reset clockIn
        record = await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { status: "PRESENT" },
        });
      } else if (existing) {
        record = await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { clockIn: now, status: "PRESENT" },
        });
      } else {
        record = await prisma.attendanceRecord.create({
          data: {
            employeeId: employee.id,
            date: dayStart,
            clockIn: now,
            status: "PRESENT",
            breakMinutes: 0,
          },
        });
      }
    } else {
      // CLOCK_OUT
      if (existing) {
        record = await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            clockOut: now,
            clockIn: existing.clockIn ?? now,
            status: "PRESENT",
          },
        });
      } else {
        // No clock in found — create record with same time
        record = await prisma.attendanceRecord.create({
          data: {
            employeeId: employee.id,
            date: dayStart,
            clockIn: now,
            clockOut: now,
            status: "PRESENT",
            breakMinutes: 0,
            notes: "تسجيل انصراف بدون حضور مسبق",
          },
        });
      }
    }

    // Build duration string if both times available
    let durationText: string | null = null;
    if (record.clockIn && record.clockOut) {
      const diffMs = record.clockOut.getTime() - record.clockIn.getTime();
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      durationText = `${h}س ${m}د`;
    }

    return ok({
      success: true,
      action,
      employee: {
        id: employee.id,
        nameAr: employee.nameAr,
        badgeNumber: employee.badgeNumber,
        jobTitle: employee.jobTitle,
        branch: employee.branch?.nameAr,
      },
      record: {
        id: record.id,
        status: record.status,
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        durationText,
      },
      timestamp: now.toISOString(),
      message:
        action === "CLOCK_IN"
          ? `أهلاً ${employee.nameAr}! تم تسجيل حضورك بنجاح.`
          : `وداعاً ${employee.nameAr}! تم تسجيل انصرافك بنجاح.`,
    });
  } catch (error) {
    console.error("[Kiosk Punch POST Error]:", error);
    return err("حدث خطأ في تسجيل الدوام. حاول مرة أخرى.", 500);
  }
}
