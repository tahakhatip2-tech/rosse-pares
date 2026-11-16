import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, auditLog } from "@/lib/api";
import { z } from "zod";
import { PurchaseOrderStatus } from "@prisma/client";

const updatePOSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit") }),
  z.object({ action: z.literal("approve"), approvedBy: z.string().min(1) }),
  z.object({ action: z.literal("cancel") }),
  z.object({
    action: z.literal("update"),
    notes: z.string().optional(),
    expectedDate: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          qtyOrdered: z.number().positive(),
          unitCost: z.number().nonnegative(),
          unit: z.string().min(1),
        })
      )
      .optional(),
    taxAmount: z.number().nonnegative().optional(),
  }),
]);

// GET — Single PO with full items + product info + receipts
export const GET = withAuth(async (req, ctx, paramsPromise) => {
  try {
    const { id } = await paramsPromise;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, nameAr: true, nameEn: true, phone: true, email: true } },
        items: {
          include: {
            purchaseOrder: false,
          },
        },
        receipts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!po) return err("أمر الشراء غير موجود", 404);

    const productIds = po.items.map((it) => it.productId);
    const [products, branch] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, nameAr: true, nameEn: true, sku: true, images: true, unit: true },
      }),
      prisma.branch.findUnique({
        where: { id: po.branchId },
        select: { id: true, nameAr: true, nameEn: true },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const enrichedItems = po.items.map((it) => ({
      ...it,
      product: productMap.get(it.productId) || null,
    }));

    return ok({
      ...po,
      branch,
      items: enrichedItems,
    });
  } catch (error: any) {
    console.error("[Purchase GET Error]:", error);
    return err("فشل جلب أمر الشراء", 500);
  }
}, "procurement:view");

// PATCH — Update PO status or fields
export const PATCH = withAuth(async (req, ctx, paramsPromise) => {
  try {
    const { id } = await paramsPromise;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!po) return err("أمر الشراء غير موجود", 404);

    const body = await req.json();
    const parsed = updatePOSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "بيانات غير صالحة";
      return err(message, 400);
    }

    const { action } = parsed.data;

    if (action === "submit") {
      if (po.status !== PurchaseOrderStatus.DRAFT) {
        return err("يمكن تقديم أوامر الشراء فقط في حالة المسودة", 400);
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.SUBMITTED },
      });
      return ok(updated);
    }

    if (action === "approve") {
      if (po.status !== PurchaseOrderStatus.SUBMITTED) {
        return err("يمكن الموافقة على أوامر الشراء المقدمة فقط", 400);
      }
      // Check procurement:approve permission
      const { hasPermission } = await import("@/lib/permissions");
      if (!hasPermission(ctx.permissions, ctx.role, "procurement:approve")) {
        return err("ليس لديك صلاحية الموافقة على أوامر الشراء", 403);
      }

      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: PurchaseOrderStatus.APPROVED,
          approvedBy: parsed.data.approvedBy,
          approvedAt: new Date(),
        },
      });

      await auditLog({
        userId: ctx.userId,
        action: "APPROVE_PURCHASE_ORDER",
        entity: "PurchaseOrder",
        entityId: id,
        oldData: { status: po.status },
        newData: { status: PurchaseOrderStatus.APPROVED },
        req,
      });

      return ok(updated);
    }

    if (action === "cancel") {
      if (po.status === PurchaseOrderStatus.RECEIVED) {
        return err("لا يمكن إلغاء أمر شراء تم استلامه بالكامل", 400);
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.CANCELLED },
      });
      return ok(updated);
    }

    if (action === "update") {
      if (po.status !== PurchaseOrderStatus.DRAFT) {
        return err("يمكن تعديل أوامر الشراء في حالة المسودة فقط", 400);
      }

      const updateData: any = {};
      if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
      if (parsed.data.expectedDate !== undefined)
        updateData.expectedDate = new Date(parsed.data.expectedDate);

      if (parsed.data.items && parsed.data.items.length > 0) {
        const newItems = parsed.data.items;
        const subtotal = newItems.reduce((sum, i) => sum + i.qtyOrdered * i.unitCost, 0);
        const tax = parsed.data.taxAmount ?? po.taxAmount;
        updateData.subtotal = subtotal;
        updateData.taxAmount = tax;
        updateData.total = subtotal + tax;

        // Delete old items and recreate
        await prisma.purchaseOrderItem.deleteMany({ where: { poId: id } });
        await prisma.purchaseOrderItem.createMany({
          data: newItems.map((item) => ({
            poId: id,
            productId: item.productId,
            qtyOrdered: item.qtyOrdered,
            qtyReceived: 0,
            unitCost: item.unitCost,
            total: item.qtyOrdered * item.unitCost,
            unit: item.unit,
          })),
        });
      } else if (parsed.data.taxAmount !== undefined) {
        updateData.taxAmount = parsed.data.taxAmount;
        updateData.total = po.subtotal + parsed.data.taxAmount;
      }

      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: { items: true },
      });
      return ok(updated);
    }

    return err("إجراء غير معروف", 400);
  } catch (error: any) {
    console.error("[Purchase PATCH Error]:", error);
    return err("فشل تحديث أمر الشراء: " + (error.message || "خطأ غير متوقع"), 500);
  }
}, "procurement:view");
