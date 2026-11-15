import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err, withAuth, getPagination } from "@/lib/api";
import { UserRole, MerchantStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessName,
      contactPerson,
      phone,
      email,
      city,
      orderType,
      businessType,
      dailyVolume,
      notes,
    } = body;

    // Validation
    if (!businessName || typeof businessName !== "string" || !businessName.trim()) {
      return err("يرجى إدخال اسم الشركة أو المؤسسة", 400);
    }
    if (!contactPerson || typeof contactPerson !== "string" || !contactPerson.trim()) {
      return err("يرجى إدخال اسم الشخص المسؤول", 400);
    }
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return err("يرجى إدخال رقم الهاتف للتواصل", 400);
    }

    const trimmedBusiness = businessName.trim();
    const trimmedContact = contactPerson.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email && typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
    const effectiveOrderType = orderType || dailyVolume || businessType || "B2B_LEAD";

    // Format notes with lead details
    const notesParts: string[] = [];
    if (effectiveOrderType) notesParts.push(`نوع الطلب / التوريد: ${effectiveOrderType}`);
    if (businessType && businessType !== effectiveOrderType) notesParts.push(`نوع النشاط: ${businessType}`);
    if (city) notesParts.push(`المدينة: ${city}`);
    if (notes && typeof notes === "string" && notes.trim()) notesParts.push(`ملاحظات: ${notes.trim()}`);
    const compiledNotes = notesParts.join(" | ");

    // Prepare email identifier for User record
    const userEmail = trimmedEmail || `lead_${trimmedPhone.replace(/\D/g, "") || Date.now()}@b2b.rozeparees.local`;

    // Check if user already exists
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { merchant: true },
    });

    if (user) {
      if (user.merchant) {
        // Merchant profile exists; update contact and notes with new request
        const updated = await prisma.merchantAccount.update({
          where: { id: user.merchant.id },
          data: {
            businessName: trimmedBusiness,
            contactName: trimmedContact,
            phone: trimmedPhone,
            email: trimmedEmail || user.merchant.email,
            address: city ? { city } : (user.merchant.address as any),
            notes: user.merchant.notes
              ? `${user.merchant.notes}\n[طلب إضافي ${new Date().toLocaleDateString("ar-JO")}]: ${compiledNotes}`
              : compiledNotes,
          },
        });
        return ok(
          {
            message: "تم تحديث طلبكم بنجاح وسيتواصل معكم فريق المبيعات",
            leadId: updated.id,
            merchant: updated,
          },
          200
        );
      } else {
        // Existing user without merchant profile
        const merchant = await prisma.merchantAccount.create({
          data: {
            userId: user.id,
            businessName: trimmedBusiness,
            contactName: trimmedContact,
            phone: trimmedPhone,
            email: trimmedEmail,
            address: city ? { city } : undefined,
            status: MerchantStatus.PENDING,
            notes: compiledNotes,
          },
        });

        // Update role to MERCHANT if standard customer
        if (user.role === UserRole.CUSTOMER) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: UserRole.MERCHANT },
          });
        }

        return ok(
          {
            message: "تم استلام طلبكم بنجاح وسيتواصل معكم فريق المبيعات",
            leadId: merchant.id,
            merchant,
          },
          201
        );
      }
    }

    // Generate random secure temporary password hash for user creation
    const tempPassword = crypto.randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create User (role='MERCHANT') and MerchantAccount (status='PENDING')
    const newUser = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        role: UserRole.MERCHANT,
        isActive: true,
        merchant: {
          create: {
            businessName: trimmedBusiness,
            contactName: trimmedContact,
            phone: trimmedPhone,
            email: trimmedEmail,
            address: city ? { city } : undefined,
            status: MerchantStatus.PENDING,
            notes: compiledNotes,
          },
        },
      },
      include: {
        merchant: true,
      },
    });

    return ok(
      {
        message: "تم استلام طلبكم بنجاح وسيتواصل معكم فريق المبيعات",
        leadId: newUser.merchant?.id,
        merchant: newUser.merchant,
      },
      201
    );
  } catch (error: any) {
    console.error("[B2B Leads POST Error]:", error);
    return err("حدث خطأ أثناء معالجة الطلب، يرجى المحاولة لاحقاً", 500);
  }
}

// GET: Allow admin/staff with permission to view merchant leads
export const GET = withAuth(
  async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const status = searchParams.get("status") as MerchantStatus | null;
      const { page, limit, skip } = getPagination(req);

      const where: any = {};
      if (status) where.status = status;

      const [merchants, total] = await Promise.all([
        prisma.merchantAccount.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, email: true, role: true, isActive: true } },
          },
        }),
        prisma.merchantAccount.count({ where }),
      ]);

      return ok({
        items: merchants,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("[B2B Leads GET Error]:", error);
      return err("فشل استرجاع طلبات B2B", 500);
    }
  },
  "merchants:view"
);
