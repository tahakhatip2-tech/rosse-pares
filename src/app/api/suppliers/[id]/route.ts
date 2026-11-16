import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, auditLog } from "@/lib/api";
import { z } from "zod";

const updateSupplierSchema = z.object({
  nameAr: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("البريد الإلكتروني غير صالح").optional().or(z.literal("")),
  address: z.any().optional(),
  taxNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  isActive: z.boolean().optional(),
});

// GET — Single supplier with purchase order count, recent invoices, ledger balance
export const GET = withAuth(async (req, ctx, paramsPromise) => {
  try {
    const { id } = await paramsPromise;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { purchaseOrders: true, invoices: true } },
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        ledgerEntries: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!supplier) {
      return err("المورد غير موجود", 404);
    }

    const ledgerBalance = supplier.ledgerEntries[0]?.balance ?? 0;

    return ok({ ...supplier, ledgerBalance });
  } catch (error: any) {
    console.error("[Supplier GET Error]:", error);
    return err("فشل جلب بيانات المورد", 500);
  }
}, "procurement:view");

// PATCH — Update supplier
export const PATCH = withAuth(async (req, ctx, paramsPromise) => {
  try {
    const { id } = await paramsPromise;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return err("المورد غير موجود", 404);
    }

    const body = await req.json();
    const parsed = updateSupplierSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "بيانات غير صالحة";
      return err(message, 400);
    }

    const updateData: any = {};
    const d = parsed.data;
    if (d.nameAr !== undefined) updateData.nameAr = d.nameAr;
    if (d.nameEn !== undefined) updateData.nameEn = d.nameEn;
    if (d.contactName !== undefined) updateData.contactName = d.contactName;
    if (d.phone !== undefined) updateData.phone = d.phone;
    if (d.email !== undefined) updateData.email = d.email || null;
    if (d.address !== undefined) updateData.address = d.address;
    if (d.taxNumber !== undefined) updateData.taxNumber = d.taxNumber;
    if (d.paymentTerms !== undefined) updateData.paymentTerms = d.paymentTerms;
    if (d.creditLimit !== undefined) updateData.creditLimit = d.creditLimit;
    if (d.notes !== undefined) updateData.notes = d.notes;
    if (d.rating !== undefined) updateData.rating = d.rating;
    if (d.isActive !== undefined) updateData.isActive = d.isActive;

    const updated = await prisma.supplier.update({
      where: { id },
      data: updateData,
    });

    await auditLog({
      userId: ctx.userId,
      action: "UPDATE_SUPPLIER",
      entity: "Supplier",
      entityId: id,
      oldData: existing,
      newData: updated,
      req,
    });

    return ok(updated);
  } catch (error: any) {
    console.error("[Supplier PATCH Error]:", error);
    return err("فشل تحديث بيانات المورد: " + (error.message || "خطأ غير متوقع"), 500);
  }
}, "procurement:create");

// DELETE — Soft-delete: set isActive = false
export const DELETE = withAuth(async (req, ctx, paramsPromise) => {
  try {
    const { id } = await paramsPromise;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return err("المورد غير موجود", 404);
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    await auditLog({
      userId: ctx.userId,
      action: "DEACTIVATE_SUPPLIER",
      entity: "Supplier",
      entityId: id,
      oldData: { isActive: existing.isActive },
      newData: { isActive: false },
      req,
    });

    return ok({ deactivated: true, id });
  } catch (error: any) {
    console.error("[Supplier DELETE Error]:", error);
    return err("فشل تعطيل المورد", 500);
  }
}, "procurement:create");
