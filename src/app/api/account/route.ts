import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, auditLog } from "@/lib/api";

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const updateProfileSchema = z.object({
  action: z.literal("UPDATE_PROFILE"),
  name: z.string().trim().min(2, "الاسم يجب أن لا يقل عن حرفين").max(80),
  phone: z.string().trim().max(25).optional().or(z.literal("")),
});

const changePasswordSchema = z.object({
  action: z.literal("CHANGE_PASSWORD"),
  currentPassword: z.string().min(1, "يرجى إدخال كلمة المرور الحالية"),
  newPassword: z.string().min(6, "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل").max(100),
});

const addAddressSchema = z.object({
  action: z.literal("ADD_ADDRESS"),
  label: z.string().trim().min(1, "يرجى كتابة اسم العنوان").max(40),
  city: z.string().trim().min(2, "يرجى كتابة المدينة").max(60),
  area: z.string().trim().max(80).optional().or(z.literal("")),
  line1: z.string().trim().min(3, "يرجى كتابة تفاصيل الشارع/البناية").max(180),
  isDefault: z.boolean().optional(),
});

const addressIdSchema = z.object({
  action: z.enum(["DELETE_ADDRESS", "SET_DEFAULT_ADDRESS"]),
  addressId: z.string().regex(OBJECT_ID_RE, "معرف العنوان غير صالح"),
});

async function getAccountSnapshot(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      employee: { select: { id: true, nameAr: true, phone: true, jobTitle: true } },
      merchant: { select: { id: true, businessName: true, phone: true, status: true } },
      customer: {
        select: {
          id: true,
          nameAr: true,
          phone: true,
          loyaltyAccount: { select: { points: true, tier: true } },
          addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
          _count: { select: { salesOrders: true } },
        },
      },
    },
  });

  if (!user) return null;

  const displayName =
    user.customer?.nameAr ||
    user.employee?.nameAr ||
    user.merchant?.businessName ||
    user.email.split("@")[0];

  const phone =
    user.customer?.phone ||
    user.employee?.phone ||
    user.merchant?.phone ||
    "";

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: displayName,
    phone,
    createdAt: user.createdAt,
    jobTitle: user.employee?.jobTitle ?? null,
    merchantStatus: user.merchant?.status ?? null,
    isCustomerProfile: Boolean(user.customer) || user.role === "CUSTOMER",
    loyalty: user.customer?.loyaltyAccount ?? { points: 0, tier: "BRONZE" },
    ordersCount: user.customer?._count.salesOrders ?? 0,
    addresses: user.customer?.addresses ?? [],
  };
}

export const GET = withAuth(async (_req, ctx) => {
  const account = await getAccountSnapshot(ctx.userId);
  if (!account) {
    return err("لم يتم العثور على الحساب", 404);
  }
  return ok(account);
});

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return err("بيانات الطلب غير صالحة", 400);
  }

  const action = (body as { action?: unknown }).action;

  if (action === "UPDATE_PROFILE") {
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "بيانات الملف الشخصي غير صالحة", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        role: true,
        customer: { select: { id: true } },
        employee: { select: { id: true } },
        merchant: { select: { id: true } },
      },
    });
    if (!user) return err("المستخدم غير موجود", 404);

    if (user.customer) {
      await prisma.customer.update({
        where: { id: user.customer.id },
        data: { nameAr: parsed.data.name, phone: parsed.data.phone || null },
      });
    } else if (user.employee) {
      await prisma.employee.update({
        where: { id: user.employee.id },
        data: { nameAr: parsed.data.name, phone: parsed.data.phone || null },
      });
    } else if (user.merchant) {
      await prisma.merchantAccount.update({
        where: { id: user.merchant.id },
        data: { businessName: parsed.data.name, phone: parsed.data.phone || "" },
      });
    } else {
      await prisma.customer.create({
        data: {
          userId: ctx.userId,
          nameAr: parsed.data.name,
          phone: parsed.data.phone || null,
          loyaltyAccount: { create: { points: 0, tier: "BRONZE" } },
        },
      });
    }

    const updated = await getAccountSnapshot(ctx.userId);
    return ok({ message: "تم تحديث البيانات الشخصية بنجاح", account: updated });
  }

  if (action === "CHANGE_PASSWORD") {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "كلمة المرور غير صالحة", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) return err("المستخدم غير موجود", 404);

    const match = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!match) {
      return err("كلمة المرور الحالية غير صحيحة", 400);
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await auditLog({
      userId: ctx.userId,
      action: "CHANGE_PASSWORD",
      entity: "User",
      entityId: ctx.userId,
      req,
    });

    return ok({ message: "تم تغيير كلمة المرور بنجاح" });
  }

  if (action === "ADD_ADDRESS") {
    const parsed = addAddressSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "بيانات العنوان غير مكتملة", 400);
    }

    let customer = await prisma.customer.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!customer) {
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { email: true, employee: { select: { nameAr: true, phone: true } } },
      });
      customer = await prisma.customer.create({
        data: {
          userId: ctx.userId,
          nameAr: user?.employee?.nameAr || user?.email.split("@")[0] || "عميل روز باريس",
          phone: user?.employee?.phone ?? null,
          loyaltyAccount: { create: { points: 0, tier: "BRONZE" } },
        },
        select: { id: true },
      });
    }

    if (parsed.data.isDefault) {
      await prisma.address.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }

    await prisma.address.create({
      data: {
        customerId: customer.id,
        label: parsed.data.label,
        city: parsed.data.city,
        area: parsed.data.area || null,
        line1: parsed.data.line1,
        isDefault: Boolean(parsed.data.isDefault),
      },
    });

    const updated = await getAccountSnapshot(ctx.userId);
    return ok({ message: "تمت إضافة العنوان بنجاح", account: updated });
  }

  if (action === "DELETE_ADDRESS" || action === "SET_DEFAULT_ADDRESS") {
    const parsed = addressIdSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "معرف العنوان غير صالح", 400);
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!customer) return err("سجل العميل غير موجود", 404);

    const addr = await prisma.address.findFirst({
      where: { id: parsed.data.addressId, customerId: customer.id },
      select: { id: true },
    });
    if (!addr) return err("العنوان غير موجود", 404);

    if (parsed.data.action === "DELETE_ADDRESS") {
      await prisma.address.delete({ where: { id: addr.id } });
    } else {
      await prisma.$transaction([
        prisma.address.updateMany({
          where: { customerId: customer.id },
          data: { isDefault: false },
        }),
        prisma.address.update({
          where: { id: addr.id },
          data: { isDefault: true },
        }),
      ]);
    }

    const updated = await getAccountSnapshot(ctx.userId);
    return ok({
      message:
        parsed.data.action === "DELETE_ADDRESS"
          ? "تم حذف العنوان بنجاح"
          : "تم تعيين العنوان الافتراضي",
      account: updated,
    });
  }

  return err("إجراء غير مدعوم", 400);
});

