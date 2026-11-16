import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, getPagination } from "@/lib/api";
import { z } from "zod";
import { PurchaseOrderStatus } from "@prisma/client";

const createPOSchema = z.object({
  supplierId: z.string().min(1, "معرف المورد مطلوب"),
  branchId: z.string().min(1, "معرف الفرع مطلوب"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "معرف المنتج مطلوب"),
        qtyOrdered: z.number().positive("الكمية يجب أن تكون أكبر من صفر"),
        unitCost: z.number().nonnegative("تكلفة الوحدة لا يمكن أن تكون سالبة"),
        unit: z.string().min(1, "الوحدة مطلوبة"),
      })
    )
    .min(1, "يجب إضافة عنصر واحد على الأقل"),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  taxAmount: z.number().nonnegative().optional(),
});

async function generatePoNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  // Find last PO this month
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

  const lastPO = await prisma.purchaseOrder.findFirst({
    where: {
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
    orderBy: { createdAt: "desc" },
    select: { poNumber: true },
  });

  let seq = 1;
  if (lastPO?.poNumber) {
    const parts = lastPO.poNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1] ?? "0", 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `PO-${year}-${month}${day}-${String(seq).padStart(4, "0")}`;
}

// GET — List purchase orders with filters
export const GET = withAuth(async (req, ctx) => {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") as PurchaseOrderStatus | null;
    const supplierId = searchParams.get("supplierId");
    const branchId = searchParams.get("branchId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const { page, limit, skip } = getPagination(req);

    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (branchId) where.branchId = branchId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (search) where.poNumber = { contains: search, mode: "insensitive" };

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          supplier: { select: { id: true, nameAr: true, nameEn: true } },
          _count: { select: { receipts: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return ok({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Purchases GET Error]:", error);
    return err("فشل جلب قائمة أوامر الشراء", 500);
  }
}, "procurement:view");

// POST — Create new purchase order in DRAFT status
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json();
    const parsed = createPOSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "بيانات غير صالحة";
      return err(message, 400);
    }

    const { supplierId, branchId, items, expectedDate, notes, taxAmount } = parsed.data;

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) return err("المورد غير موجود", 404);

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.qtyOrdered * item.unitCost, 0);
    const tax = taxAmount ?? 0;
    const total = subtotal + tax;

    const poNumber = await generatePoNumber();

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        branchId,
        status: PurchaseOrderStatus.DRAFT,
        subtotal,
        taxAmount: tax,
        total,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        notes,
        createdBy: ctx.userId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            qtyOrdered: item.qtyOrdered,
            qtyReceived: 0,
            unitCost: item.unitCost,
            total: item.qtyOrdered * item.unitCost,
            unit: item.unit,
          })),
        },
      },
      include: {
        items: true,
        supplier: { select: { id: true, nameAr: true, nameEn: true } },
      },
    });

    return ok(po, 201);
  } catch (error: any) {
    console.error("[Purchases POST Error]:", error);
    return err("فشل إنشاء أمر الشراء: " + (error.message || "خطأ غير متوقع"), 500);
  }
}, "procurement:create");
