import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

// Store challenges temporarily in memory (server-side only, keyed by employeeId)
// In production, use Redis or DB. For single-server deployment this is fine.
const challengeStore = new Map<string, { challenge: string; exp: number }>();

function getRP(req: NextRequest) {
  const origin = req.headers.get("origin") || "http://localhost:3000";
  const url = new URL(origin);
  return {
    rpName: "بوابة حضور مواد البناء",
    rpID: url.hostname,
    origin,
  };
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

// POST /api/kiosk/fingerprint/enroll/start
// Body: { badgeNumber }
// Returns WebAuthn registration options (challenge) for the browser
export async function POST(req: NextRequest) {
  try {
    const business = await resolveKioskBusiness(req);
    if (!business) return err("جلسة الكشك منتهية أو غير صالحة", 401);

    const body = await req.json().catch(() => null);
    const badgeNumber = body?.badgeNumber?.trim();
    if (!badgeNumber) return err("الرقم الوظيفي مطلوب", 400);

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

    // Find employee
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
        webAuthnCredentialId: true,
      },
    });

    if (!employee) return err("الرقم الوظيفي غير موجود في هذا المحل", 404);

    const { rpName, rpID, origin } = getRP(req);

    // Exclude existing credential if already enrolled
    const excludeCredentials = employee.webAuthnCredentialId
      ? [{ id: employee.webAuthnCredentialId, type: "public-key" as const }]
      : [];

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(employee.id),
      userName: employee.nameAr,
      userDisplayName: employee.nameAr,
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Built-in device (Touch ID, Face ID, fingerprint)
        requireResidentKey: false,
        userVerification: "required",
      },
      excludeCredentials,
    });

    // Store challenge with 2-min expiry
    challengeStore.set(`enroll:${employee.id}`, {
      challenge: options.challenge,
      exp: Date.now() + 2 * 60_000,
    });

    return ok({
      options,
      employee: { id: employee.id, nameAr: employee.nameAr },
    });
  } catch (error) {
    console.error("[Fingerprint Enroll Start]:", error);
    return err("فشل بدء تسجيل البصمة", 500);
  }
}

// PATCH /api/kiosk/fingerprint/enroll/start  → Finish enrollment
// Body: { employeeId, registrationResponse }
export async function PATCH(req: NextRequest) {
  try {
    const business = await resolveKioskBusiness(req);
    if (!business) return err("جلسة الكشك منتهية أو غير صالحة", 401);

    const body = await req.json().catch(() => null);
    const { employeeId, registrationResponse } = body as {
      employeeId: string;
      registrationResponse: RegistrationResponseJSON;
    };

    if (!employeeId || !registrationResponse) {
      return err("بيانات التسجيل غير مكتملة", 400);
    }

    const stored = challengeStore.get(`enroll:${employeeId}`);
    if (!stored || stored.exp < Date.now()) {
      return err("انتهت صلاحية جلسة التسجيل. ابدأ من جديد.", 400);
    }

    const { rpID, origin } = getRP(req);

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge: stored.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
    } catch (verErr: any) {
      return err("فشل التحقق من البصمة: " + (verErr?.message || "خطأ غير متوقع"), 400);
    }

    if (!verification.verified || !verification.registrationInfo) {
      return err("لم يتم التحقق من البصمة. حاول مرة أخرى.", 400);
    }

    const { credential } = verification.registrationInfo;

    // Save credential to DB
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        webAuthnCredentialId: credential.id,
        webAuthnPublicKey: Buffer.from(credential.publicKey).toString("base64"),
        webAuthnCounter: credential.counter,
        fingerprintEnrolled: true,
      },
    });

    challengeStore.delete(`enroll:${employeeId}`);

    return ok({ enrolled: true, credentialId: credential.id });
  } catch (error) {
    console.error("[Fingerprint Enroll Finish]:", error);
    return err("فشل حفظ بيانات البصمة", 500);
  }
}

export { challengeStore };
