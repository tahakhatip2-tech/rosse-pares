import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, getPagination } from "@/lib/api";
import { z } from "zod";

const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "رقم الفاتورة مطلوب"),
  poId: z.string().optional(),
  amount: z.number().nonnegative("المبلغ لا يمكن أن يكون سالباً"),
  taxAmount: z.number().nonnegative().optional(),
  total: z.number().nonnegative("المجموع لا يمكن أن يكون سالباً"),
  dueDate: z.string().min(1, "تاريخ الاستحقاق مطلوب"),
  attachmentUrl: z.string().url("رابط المرفق غير صالح").optional().or(z.literal("")),
  status: z.string().optional(),
});

// GET — List invoices for supplier
export const GET = withAuth(async (req, ctx, paramsPromise) => {
  try {
    const { id } = await paramsPromise;
    const { page, limit, skip } = getPagination(req);

    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return err("المورد غير موجود", 404);

    const [invoices, total] = await Promise.all([
      prisma.supplierInvoice.findMany({
        where: { supplierId: id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.supplierInvoice.count({ where: { supplierId: id } }),
    ]);

    return ok({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Supplier Invoices GET Error]:", error);
    return err("فشل جلب فواتير المورد", 500);
  }
}, "procurement:view");

// POST — Create supplier invoice + ledger entry
export const POST = withAuth(async (req, ctx, paramsPromise) => {
  try {
    const { id } = await paramsPromise;

    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return err("المورد غير موجود", 404);

    const body = await req.json();
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "بيانات غير صالحة";
      return err(message, 400);
    }

    const { invoiceNumber, poId, amount, taxAmount, total, dueDate, attachmentUrl, status } =
      parsed.data;

    // Check invoice number uniqueness
    const existing = await prisma.supplierInvoice.findUnique({ where: { invoiceNumber } });
    if (existing) return err("رقم الفاتورة مستخدم بالفعل", 400);

    // Get current ledger balance for running balance computation
    const lastEntry = await prisma.supplierLedgerEntry.findFirst({
      where: { supplierId: id },
      orderBy: { createdAt: "desc" },
      select: { balance: true },
    });

    const currentBalance = lastEntry?.balance ?? 0;
    const newBalance = currentBalance + total;

    const [invoice] = await prisma.$transaction([
      prisma.supplierInvoice.create({
        data: {
          invoiceNumber,
          supplierId: id,
          poId: poId || undefined,
          amount,
          taxAmount: taxAmount ?? 0,
          total,
          dueDate: new Date(dueDate),
          attachmentUrl: attachmentUrl || undefined,
          status: status ?? "UNPAID",
        },
      }),
      prisma.supplierLedgerEntry.create({
        data: {
          supplierId: id,
          type: "INVOICE",
          amount: total,
          balance: newBalance,
          referenceType: "SUPPLIER_INVOICE",
          notes: `فاتورة رقم ${invoiceNumber}`,
        },
      }),
    ]);

    return ok(invoice, 201);
  } catch (error: any) {
    console.error("[Supplier Invoice POST Error]:", error);
    return err("فشل إنشاء فاتورة المورد: " + (error.message || "خطأ غير متوقع"), 500);
  }
}, "procurement:create");
