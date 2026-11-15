import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api";
import { UserRole } from "@prisma/client";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0621-\u064A-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "") || `store-${Date.now().toString(36)}`;
}

const registerSchema = z.object({
  accountType: z.enum(["CUSTOMER", "SELLER"]).default("CUSTOMER"),
  name: z.string().trim().min(2, "يرجى كتابة الاسم الكامل (حرفين على الأقل)").max(80),
  email: z.string().trim().email("البريد الإلكتروني غير صالح"),
  phone: z.string().trim().min(7, "رقم الهاتف غير صالح").max(20).optional().or(z.literal("")),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").max(100),
  
  // حقول خاصة بالبائع / صاحب محل مواد البناء
  storeNameAr: z.string().trim().max(120).optional().or(z.literal("")),
  storeNameEn: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "بيانات التسجيل غير صالحة", 400);
    }

    const { accountType, name, phone, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    // التحقق من تكرار البريد الإلكتروني
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return err("هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (accountType === "SELLER") {
      const storeName = parsed.data.storeNameAr?.trim() || `محل ${name}`;
      const storeNameEn = parsed.data.storeNameEn?.trim() || "";

      // توليد رابط مخصص فريد للمحل (slug)
      const baseSlug = (storeNameEn ? generateSlug(storeNameEn) : generateSlug(storeName)) || `store-${Date.now().toString(36)}`;
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (await prisma.business.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${baseSlug}-${counter++}`;
      }

      // 1. إنشاء سجل المحل الجديد (SaaS Tenant)
      const business = await prisma.business.create({
        data: {
          nameAr: storeName,
          nameEn: storeNameEn || storeName,
          slug: uniqueSlug,
          phone: phone || null,
          whatsapp: parsed.data.whatsapp || phone || null,
          city: parsed.data.city?.trim() || "عمان",
          description: parsed.data.description?.trim() || `محل ${storeName} لمواد البناء والديكور`,
          subscriptionPlan: "FREE",
          subscriptionStatus: "TRIAL",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 يوم تجريبي
          isActive: true,
          isPublic: true,
          isVerified: false,
          settings: {
            currency: "JOD",
            timezone: "Asia/Amman",
            taxRate: 16,
            orderPrefix: "ORD",
            invoicePrefix: "INV",
          },
        },
      });

      // 2. إنشاء فرع ومستودع افتراضيين للمحل ليبدأ العمل فوراً
      const branch = await prisma.branch.create({
        data: {
          businessId: business.id,
          nameAr: "الفرع الرئيسي",
          nameEn: "Main Branch",
          phone: phone || null,
          address: { city: parsed.data.city?.trim() || "عمان", street: "المقر الرئيسي" },
          isActive: true,
        },
      });

      await prisma.warehouse.create({
        data: {
          branchId: branch.id,
          nameAr: "المستودع الرئيسي",
          nameEn: "Main Warehouse",
          type: "GENERAL",
          isActive: true,
        },
      });

      // 3. إنشاء حساب المستخدم كـ BUSINESS_OWNER مع ربطه بمحله
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.BUSINESS_OWNER,
          businessId: business.id,
          branchId: branch.id,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          role: true,
          businessId: true,
        },
      });

      // 4. إنشاء ملف موظف كمالك للمتجر
      await prisma.employee.create({
        data: {
          userId: user.id,
          businessId: business.id,
          branchId: branch.id,
          nameAr: name,
          nameEn: name,
          jobTitle: "مالك المتجر / المدير العام",
          phone: phone || null,
          startDate: new Date(),
          baseSalary: 0,
        },
      });

      return ok(
        {
          user,
          accountType: "SELLER",
          storeSlug: uniqueSlug,
          redirectTo: "/admin",
          message: "تم إنشاء حساب المحل بنجاح! مرحباً بك في لوحة التحكم.",
        },
        201
      );
    }

    // حساب مستخدم / زبون عادي (CUSTOMER)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.CUSTOMER,
        businessId: "000000000000000000000001",
        isActive: true,
        customer: {
          create: {
            nameAr: name,
            phone: phone || null,
            loyaltyAccount: {
              create: {
                points: 0,
                tier: "BRONZE",
              },
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return ok(
      {
        user,
        accountType: "CUSTOMER",
        redirectTo: "/news",
        message: "تم إنشاء الحساب بنجاح!",
      },
      201
    );
  } catch (error) {
    console.error("[Register POST Error]:", error);
    return err("حدث خطأ أثناء إنشاء الحساب", 500);
  }
}

