import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err } from "@/lib/api";
import { z } from "zod";
import { PurchaseOrderStatus, MovementType } from "@prisma/client";

const receiveSchema = z.object({
  warehouseId: z.string().min(1, "معرف المستودع مطلوب"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "معرف المنتج مطلوب"),
        qtyReceived: z.number().positive("الكمية المستلمة يجب أن تكون أكبر من صفر"),
        qtyRejected: z.number().nonnegative().optional(),
        lotNumber: z.string().optional(),
        expiryDate: z.string().optional(),
      })
    )
    .min(1, "يجب استلام عنصر واحد على الأقل"),
  notes: z.string().optional(),
});

async function generateGrNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const startOfMonth = new Date(year, now.getMonth(), 1);
  const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

  const lastGR = await prisma.goodsReceipt.findFirst({
    where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
    orderBy: { createdAt: "desc" },
    select: { grNumber: true },
  });

  let seq = 1;
  if (lastGR?.grNumber) {
    const parts = lastGR.grNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1] ?? "0", 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `GR-${year}-${month}${day}-${String(seq).padStart(4, "0")}`;
}

// POST — Receive goods against a PO
export const POST = withAuth(async (req, ctx, paramsPromise) => {
  try {
    const { id } = await paramsPromise;

    // 1. Validate PO status
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!po) return err("أمر الشراء غير موجود", 404);

    if (
      po.status !== PurchaseOrderStatus.APPROVED &&
      po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
    ) {
      return err("يمكن الاستلام فقط لأوامر الشراء الموافق عليها أو المستلمة جزئياً", 400);
    }

    const body = await req.json();
    const parsed = receiveSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "بيانات غير صالحة";
      return err(message, 400);
    }

    const { warehouseId, items, notes } = parsed.data;
    const grNumber = await generateGrNumber();
    const branchId = ctx.branchId ?? po.branchId;

    const result = await prisma.$transaction(async (tx) => {
      // 2. Create GoodsReceipt
      const goodsReceipt = await tx.goodsReceipt.create({
        data: {
          grNumber,
          poId: id,
          warehouseId,
          receivedBy: ctx.userId,
          notes,
          items: items.map((item) => ({
            productId: item.productId,
            qtyReceived: item.qtyReceived,
            qtyRejected: item.qtyRejected ?? 0,
            lotNumber: item.lotNumber,
            expiryDate: item.expiryDate,
          })),
        },
      });

      // 3 & 4. For each item: upsert InventoryItem + create StockMovement
      for (const item of items) {
        // Upsert InventoryItem
        const existingItem = await tx.inventoryItem.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId,
            },
          },
        });

        const qtyBefore = existingItem?.qtyOnHand ?? 0;
        const qtyAfter = qtyBefore + item.qtyReceived;

        const inventoryItem = await tx.inventoryItem.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId,
            },
          },
          create: {
            productId: item.productId,
            warehouseId,
            qtyOnHand: item.qtyReceived,
            qtyReserved: 0,
            reorderPoint: 0,
          },
          update: {
            qtyOnHand: { increment: item.qtyReceived },
          },
        });

        // Create StockMovement
        await tx.stockMovement.create({
          data: {
            inventoryItemId: inventoryItem.id,
            type: MovementType.PURCHASE_RECEIPT,
            qty: item.qtyReceived,
            qtyBefore,
            qtyAfter,
            referenceType: "PURCHASE_RECEIPT",
            referenceId: goodsReceipt.id,
            userId: ctx.userId,
            branchId,
          },
        });

        // 5. Update PurchaseOrderItem.qtyReceived
        const poItem = po.items.find((pi) => pi.productId === item.productId);
        if (poItem) {
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { qtyReceived: { increment: item.qtyReceived } },
          });
        }
      }

      // 6. Determine new PO status
      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { poId: id } });
      const allReceived = updatedItems.every((pi) => pi.qtyReceived >= pi.qtyOrdered);
      const newStatus = allReceived
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.PARTIALLY_RECEIVED;

      await tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
      });

      return goodsReceipt;
    });

    return ok(result, 201);
  } catch (error: any) {
    console.error("[Goods Receipt POST Error]:", error);
    return err("فشل استلام البضاعة: " + (error.message || "خطأ غير متوقع"), 500);
  }
}, "procurement:receive");
