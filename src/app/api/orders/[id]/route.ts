import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, auditLog } from "@/lib/api-helpers";
import { OrderStatus } from "@prisma/client";

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

// GET: Fetch a single order by ID
export const GET = withAuth(
  async (_req, _ctx, paramsPromise) => {
    try {
      const resolvedParams = paramsPromise ? await Promise.resolve(paramsPromise) : {};
      const { id } = resolvedParams;

      if (!id || !OBJECT_ID_REGEX.test(id)) {
        return err("معرف الطلب غير صالح", 400);
      }

      const order = await prisma.salesOrder.findUnique({
        where: { id },
        include: {
          items: true,
          branch: { select: { id: true, nameAr: true, nameEn: true } },
          customer: {
            include: {
              user: { select: { id: true, email: true } },
            },
          },
        },
      });

      if (!order) {
        return err("الطلب غير موجود", 404);
      }

      return ok(order);
    } catch (error: any) {
      console.error("[Orders GET by ID Error]:", error);
      return err("فشل استرجاع تفاصيل الطلب", 500);
    }
  },
  "orders:view"
);

// PATCH: Update order status
export const PATCH = withAuth(
  async (req: NextRequest, ctx, paramsPromise) => {
    try {
      const resolvedParams = paramsPromise ? await Promise.resolve(paramsPromise) : {};
      const { id } = resolvedParams;

      if (!id || !OBJECT_ID_REGEX.test(id)) {
        return err("معرف الطلب غير صالح", 400);
      }

      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return err("بيانات الطلب غير صالحة", 400);
      }

      const { status, cancelledReason, notes } = body;

      const validStatuses = Object.values(OrderStatus);
      if (!status || !validStatuses.includes(status as OrderStatus)) {
        return err(
          `حالة الطلب غير صالحة. الحالات المقبولة: ${validStatuses.join(", ")}`,
          400
        );
      }

      const existingOrder = await prisma.salesOrder.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existingOrder) {
        return err("الطلب غير موجود", 404);
      }

      const updateData: {
        status: OrderStatus;
        cancelledReason?: string | null;
        notes?: string | null;
      } = {
        status: status as OrderStatus,
      };

      if (cancelledReason !== undefined) {
        updateData.cancelledReason = cancelledReason ? String(cancelledReason) : null;
      }

      if (notes !== undefined) {
        updateData.notes = notes ? String(notes) : null;
      }

      const updatedOrder = await prisma.salesOrder.update({
        where: { id },
        data: updateData,
        include: {
          items: true,
          branch: { select: { id: true, nameAr: true, nameEn: true } },
          customer: {
            include: {
              user: { select: { id: true, email: true } },
            },
          },
        },
      });

      // Audit log the status update
      await auditLog({
        userId: ctx.userId,
        action: "UPDATE_ORDER_STATUS",
        entity: "SalesOrder",
        entityId: id,
        oldData: {
          status: existingOrder.status,
          cancelledReason: existingOrder.cancelledReason,
        },
        newData: {
          status: updatedOrder.status,
          cancelledReason: updatedOrder.cancelledReason,
        },
        req,
      });

      return ok(updatedOrder);
    } catch (error: any) {
      console.error("[Orders PATCH Error]:", error);
      return err("فشل تحديث حالة الطلب: " + (error.message || "خطأ غير متوقع"), 500);
    }
  },
  "orders:update"
);
