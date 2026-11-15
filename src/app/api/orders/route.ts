import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, getPagination, auditLog } from "@/lib/api";
import { generateDocNumber } from "@/lib/dates";
import { OrderChannel, OrderStatus, MovementType } from "@prisma/client";
import { auth } from "@/lib/auth";

// GET Orders: protected or accessible by admin / cashier
export const GET = withAuth(
  async (req, ctx) => {
    try {
      const { searchParams } = req.nextUrl;
      const status = searchParams.get("status") as OrderStatus | null;
      const channel = searchParams.get("channel") as OrderChannel | null;
      const branchId = searchParams.get("branchId") || ctx.branchId;
      const { page, limit, skip } = getPagination(req);

      const where: any = {};

      if (status) where.status = status;
      if (channel) where.channel = channel;
      if (branchId) where.branchId = branchId;

      const [orders, total] = await Promise.all([
        prisma.salesOrder.findMany({
          where,
          skip,
          take: limit,
          include: {
            items: true,
            branch: { select: { id: true, nameAr: true, nameEn: true } },
            customer: {
              include: {
                user: { select: { id: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.salesOrder.count({ where }),
      ]);

      return ok({
        items: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("[Orders GET Error]:", error);
      return err("فشل استرجاع الطلبات", 500);
    }
  },
  "orders:view"
);

// POST: Place order (can be authenticated user or public online guest checkout)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    const {
      branchId,
      channel = OrderChannel.ONLINE,
      deliveryType = "PICKUP",
      notes,
      items, // array of { productId, qty, unitPrice, variantId? }
      customerPhone,
      customerName,
      customerAddress,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return err("يجب إضافة منتج واحد على الأقل في الطلب", 400);
    }

    // Default to main branch if not provided
    let targetBranchId = branchId;
    if (!targetBranchId) {
      const defaultBranch = await prisma.branch.findFirst({
        where: { isActive: true },
      });
      if (!defaultBranch) {
        return err("لا يوجد فرع متاح حالياً", 400);
      }
      targetBranchId = defaultBranch.id;
    }

    const orderCount = await prisma.salesOrder.count();
    const orderNumber = generateDocNumber("ORD", orderCount + 1);

    // Fetch products to ensure accurate pricing and snapshot info
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let calculatedSubtotal = 0;
    const orderItemsData = [];
    const snapshotItems = [];

    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        return err(`المنتج غير موجود: ${item.productId}`, 400);
      }

      const unitPrice = prod.retailPrice;
      const qty = Number(item.qty);
      const total = Number((unitPrice * qty).toFixed(3));
      calculatedSubtotal += total;

      const orderItem = {
        productId: prod.id,
        variantId: item.variantId || null,
        nameAr: prod.nameAr,
        nameEn: prod.nameEn,
        qty,
        unitPrice,
        discount: 0,
        taxRate: prod.taxRate,
        total,
      };

      orderItemsData.push(orderItem);
      snapshotItems.push({
        ...orderItem,
        sku: prod.sku,
      });
    }

    const taxAmount = Number((calculatedSubtotal * 0.16).toFixed(3));
    const total = Number((calculatedSubtotal + taxAmount).toFixed(3));

    // Resolve customer ID if session exists
    let customerId: string | null = null;
    if (session?.user?.id) {
      const customerRecord = await prisma.customer.findUnique({
        where: { userId: session.user.id },
      });
      if (customerRecord) {
        customerId = customerRecord.id;
      }
    }

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId,
        branchId: targetBranchId,
        channel,
        status: OrderStatus.PENDING,
        subtotal: calculatedSubtotal,
        taxAmount,
        total,
        paidAmount: 0,
        deliveryType,
        notes: notes || (customerPhone ? `هاتف العميل: ${customerPhone} - الاسم: ${customerName || ""}` : null),
        snapshotData: {
          items: snapshotItems,
          customerName,
          customerPhone,
          customerAddress,
          timestamp: new Date().toISOString(),
        },
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
        branch: { select: { nameAr: true, nameEn: true } },
      },
    });

    // Deduct stock for sold items
    try {
      const defaultWarehouse = await prisma.warehouse.findFirst({
        where: { branchId: targetBranchId, isActive: true },
      });

      if (defaultWarehouse) {
        for (const item of orderItemsData) {
          const invItem = await prisma.inventoryItem.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: defaultWarehouse.id,
              },
            },
          });

          if (invItem) {
            const newQty = Math.max(0, invItem.qtyOnHand - item.qty);
            await prisma.$transaction([
              prisma.inventoryItem.update({
                where: { id: invItem.id },
                data: { qtyOnHand: newQty },
              }),
              prisma.stockMovement.create({
                data: {
                  inventoryItemId: invItem.id,
                  type: MovementType.SALE,
                  qty: item.qty,
                  qtyBefore: invItem.qtyOnHand,
                  qtyAfter: newQty,
                  referenceType: "SALES_ORDER",
                  referenceId: order.id,
                  userId: session?.user?.id ?? "000000000000000000000010",
                  branchId: targetBranchId,
                },
              }),
            ]);
          }
        }
      }
    } catch (stockError) {
      console.error("[Orders Stock Deduction Error]:", stockError);
    }

    if (session?.user?.id) {
      await auditLog({
        userId: session.user.id,
        action: "CREATE_ORDER",
        entity: "SalesOrder",
        entityId: order.id,
        newData: { orderNumber, total, itemsCount: items.length },
        req,
      });
    }

    return ok(order, 201);
  } catch (error: any) {
    console.error("[Orders POST Error]:", error);
    return err("فشل إنشاء الطلب: " + (error.message || "خطأ غير متوقع"), 500);
  }
}
