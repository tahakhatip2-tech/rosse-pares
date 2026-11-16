import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

// Shared in-memory challenge store (same process)
const authChallengeStore = new Map<string, { challenge: string; exp: number; action: string }>();

function getRP(req: NextRequest) {
  const origin = req.headers.get("origin") || "http://localhost:3000";
  const url = new URL(origin);
  return { rpID: url.hostname, origin };
}

async function resolveKioskBusiness(req: NextRequest) {
  const token = req.headers.get("x-kiosk-token") || "";
  if (!token) return null;
  const business = await prisma.business.findUnique({
    where: { kioskToken: token },
    select: { id: true, kioskTokenExp: true },
  });
  if (!business) return null;
  if (business.kioskTokenExp && business.kioskTokenExp < new Date()) return null;
  return business;
}

// POST /api/kiosk/fingerprint/auth
// Step 1: Body: { badgeNumber, action: "CLOCK_IN"|"CLOCK_OUT" }
// Returns: WebAuthn authentication options (challenge)
export async function POST(req: NextRequest) {
  try {
    const business = await resolveKioskBusiness(req);
    if (!business) return err("جلسة الكشك منتهية أو غير صالحة", 401);

    const body = await req.json().catch(() => null);
    const badgeNumber = body?.badgeNumber?.trim();
    const action: string = body?.action || "CLOCK_IN";

    if (!badgeNumber) return err("يرجى إدخال الرقم الوظيفي أولاً", 400);
    if (!["CLOCK_IN", "CLOCK_OUT"].includes(action)) return err("نوع العملية غير صالح", 400);

    const cleanBadge = badgeNumber.trim();
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

    // Find employee and their WebAuthn credential
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
        fingerprintEnrolled: true,
        webAuthnCredentialId: true,
      },
    });

    if (!employee) return err("الرقم الوظيفي غير موجود أو الموظف غير نشط", 404);

    if (!employee.fingerprintEnrolled || !employee.webAuthnCredentialId) {
      return err(
        "لم يتم تسجيل بصمة لهذا الموظف بعد. يرجى تسجيل البصمة من إعدادات الموظف.",
        422
      );
    }

    const { rpID } = getRP(req);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [
        { id: employee.webAuthnCredentialId },
      ],
      userVerification: "preferred",
    });

    // Store challenge with 2-min expiry
    authChallengeStore.set(`auth:${employee.id}`, {
      challenge: options.challenge,
      exp: Date.now() + 2 * 60_000,
      action,
    });

    return ok({
      options,
      employee: {
        id: employee.id,
        nameAr: employee.nameAr,
      },
    });
  } catch (error) {
    console.error("[Fingerprint Auth Start]:", error);
    return err("فشل بدء التحقق بالبصمة", 500);
  }
}

// PATCH /api/kiosk/fingerprint/auth
// Step 2: Verify fingerprint response + record attendance
// Body: { employeeId, authResponse }
export async function PATCH(req: NextRequest) {
  try {
    const business = await resolveKioskBusiness(req);
    if (!business) return err("جلسة الكشك منتهية أو غير صالحة", 401);

    const body = await req.json().catch(() => null);
    const { employeeId, authResponse } = body as {
      employeeId: string;
      authResponse: AuthenticationResponseJSON;
    };

    if (!employeeId || !authResponse) return err("بيانات التحقق غير مكتملة", 400);

    const stored = authChallengeStore.get(`auth:${employeeId}`);
    if (!stored || stored.exp < Date.now()) {
      return err("انتهت صلاحية جلسة التحقق. ابدأ من جديد.", 400);
    }

    // Load employee with credential data
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, businessId: business.id, isActive: true },
      select: {
        id: true,
        nameAr: true,
        jobTitle: true,
        webAuthnCredentialId: true,
        webAuthnPublicKey: true,
        webAuthnCounter: true,
        branch: { select: { id: true, nameAr: true } },
      },
    });

    if (!employee || !employee.webAuthnCredentialId || !employee.webAuthnPublicKey) {
      return err("بيانات البصمة غير متوفرة", 404);
    }

    const { rpID, origin } = getRP(req);

    // Convert stored public key back from base64
    const publicKeyBytes = Buffer.from(employee.webAuthnPublicKey, "base64");

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: authResponse,
        expectedChallenge: stored.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
        credential: {
          id: employee.webAuthnCredentialId,
          publicKey: new Uint8Array(publicKeyBytes),
          counter: employee.webAuthnCounter ?? 0,
        },
      });
    } catch (verErr: any) {
      authChallengeStore.delete(`auth:${employeeId}`);
      return err("فشل التحقق من البصمة. حاول مرة أخرى.", 401);
    }

    if (!verification.verified) {
      return err("البصمة غير مطابقة. يرجى المحاولة مرة أخرى.", 401);
    }

    // Update counter to prevent replay attacks
    await prisma.employee.update({
      where: { id: employee.id },
      data: { webAuthnCounter: verification.authenticationInfo.newCounter },
    });

    authChallengeStore.delete(`auth:${employeeId}`);

    // ── Record Attendance ─────────────────────────────────────────────
    const action = stored.action as "CLOCK_IN" | "CLOCK_OUT";
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
      if (existing) {
        record = await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            clockIn: existing.clockIn ?? now,
            status: "PRESENT",
            notes: existing.notes || "تم التحقق بالبصمة الحيوية",
          },
        });
      } else {
        record = await prisma.attendanceRecord.create({
          data: {
            employeeId: employee.id,
            date: dayStart,
            clockIn: now,
            status: "PRESENT",
            breakMinutes: 0,
            notes: "تم التحقق بالبصمة الحيوية",
          },
        });
      }
    } else {
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
        record = await prisma.attendanceRecord.create({
          data: {
            employeeId: employee.id,
            date: dayStart,
            clockIn: now,
            clockOut: now,
            status: "PRESENT",
            breakMinutes: 0,
            notes: "انصراف بدون حضور مسبق — تحقق بالبصمة",
          },
        });
      }
    }

    // Build duration if both times available
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
          ? `أهلاً ${employee.nameAr}! ✅ تم تسجيل حضورك بالبصمة.`
          : `وداعاً ${employee.nameAr}! ✅ تم تسجيل انصرافك بالبصمة.`,
    });
  } catch (error) {
    console.error("[Fingerprint Auth Finish]:", error);
    return err("حدث خطأ في تسجيل الدوام", 500);
  }
}
