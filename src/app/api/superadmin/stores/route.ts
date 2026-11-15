import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, getPagination, auditLog } from "@/lib/api";

// GET /api/superadmin/stores - List all stores across the SaaS platform
export const GET = withAuth(async (req: NextRequest, ctx) => {
  if (ctx.role !== "SUPER_ADMIN") {
    return err("غير مصرح: هذه العملية مخصصة لمدير المنصة العام فقط", 403);
  }

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = getPagination(req);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const plan = searchParams.get("plan")?.trim() || "";

    const where: any = {};

    if (status && status !== "ALL") {
      where.subscriptionStatus = status;
    }

    if (plan && plan !== "ALL") {
      where.subscriptionPlan = plan;
    }

    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const [stores, total, totalActive, totalTrial, totalSuspended] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branches: {
            select: {
              id: true,
              nameAr: true,
              phone: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              branches: true,
              employees: true,
              newsPosts: true,
            },
          },
        },
      }),
      prisma.business.count({ where }),
      prisma.business.count({ where: { subscriptionStatus: "ACTIVE" } }),
      prisma.business.count({ where: { subscriptionStatus: "TRIAL" } }),
      prisma.business.count({ where: { subscriptionStatus: "SUSPENDED" } }),
    ]);

    return ok({
      stores,
      stats: {
        total,
        totalActive,
        totalTrial,
        totalSuspended,
      },
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[Superadmin Stores GET Error]:", error);
    return err("فشل في استعراض بيانات المحلات للمدير العام", 500);
  }
});

// PATCH /api/superadmin/stores - Update store subscription or activation
export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  if (ctx.role !== "SUPER_ADMIN") {
    return err("غير مصرح: هذه العملية مخصصة لمدير المنصة العام فقط", 403);
  }

  try {
    const body = await req.json();
    const {
      storeId,
      subscriptionStatus,
      subscriptionPlan,
      isVerified,
      isActive,
      isPublic,
      subscriptionExpiry,
      notes,
    } = body;

    if (!storeId) {
      return err("معرف المحل مطلوب", 400);
    }

    const currentStore = await prisma.business.findUnique({
      where: { id: storeId },
    });

    if (!currentStore) {
      return err("المحل التجاري غير موجود", 404);
    }

    const updateData: any = {};

    if (subscriptionStatus !== undefined) {
      updateData.subscriptionStatus = subscriptionStatus;
    }
    if (subscriptionPlan !== undefined) {
      updateData.subscriptionPlan = subscriptionPlan;
    }
    if (isVerified !== undefined) {
      updateData.isVerified = Boolean(isVerified);
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }
    if (isPublic !== undefined) {
      updateData.isPublic = Boolean(isPublic);
    }
    if (subscriptionExpiry !== undefined) {
      updateData.subscriptionExpiry = subscriptionExpiry ? new Date(subscriptionExpiry) : null;
    }

    const updated = await prisma.business.update({
      where: { id: storeId },
      data: updateData,
    });

    // تسجيل في سجل الاشتراكات إذا تم تغيير الخطة أو الحالة
    if (subscriptionStatus || subscriptionPlan) {
      await prisma.subscriptionLog.create({
        data: {
          businessId: storeId,
          plan: subscriptionPlan || currentStore.subscriptionPlan,
          status: subscriptionStatus || currentStore.subscriptionStatus,
          startDate: new Date(),
          endDate: updateData.subscriptionExpiry || currentStore.subscriptionExpiry,
          notes: notes || `تحديث الاشتراك بواسطة الإدارة العامة (${ctx.userId})`,
          createdBy: ctx.userId,
        },
      });
    }

    await auditLog({
      userId: ctx.userId,
      action: "UPDATE",
      entity: "Business",
      entityId: storeId,
      oldData: currentStore,
      newData: updated,
      req,
    });

    return ok({
      store: updated,
      message: "تم تحديث بيانات وحالة اشتراك المحل بنجاح",
    });
  } catch (error) {
    console.error("[Superadmin Stores PATCH Error]:", error);
    return err("فشل تحديث بيانات المحل", 500);
  }
});
