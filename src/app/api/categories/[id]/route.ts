import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, auditLog } from "@/lib/api";

function slugifyAscii(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const PATCH = withAuth(
  async (
    req: NextRequest,
    ctx,
    routeContext: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await routeContext.params;
      if (!/^[a-f\d]{24}$/i.test(id)) {
        return err("معرّف الصنف غير صالح", 400);
      }

      const existing = await prisma.productCategory.findUnique({ where: { id } });
      if (!existing) {
        return err("الصنف غير موجود", 404);
      }

      const body = await req.json();
      const data: Record<string, unknown> = {};

      if (body.nameAr !== undefined) {
        const trimmedAr = String(body.nameAr).trim();
        if (!trimmedAr) {
          return err("اسم الصنف بالعربية مطلوب", 400);
        }
        data.nameAr = trimmedAr;
      }

      if (body.nameEn !== undefined) {
        const trimmedEn = String(body.nameEn).trim();
        data.nameEn = trimmedEn || (data.nameAr as string) || existing.nameAr;
      }

      if (body.slug !== undefined) {
        const rawSlug = String(body.slug).trim();
        const normalized = slugifyAscii(rawSlug);
        if (!normalized) {
          return err("الرابط المختصر غير صالح", 400);
        }
        if (normalized !== existing.slug) {
          const duplicate = await prisma.productCategory.findUnique({
            where: { slug: normalized },
          });
          if (duplicate) {
            return err("الرابط المختصر مستخدم لصنف آخر", 400);
          }
        }
        data.slug = normalized;
      }

      if (body.image !== undefined) {
        data.image =
          typeof body.image === "string" && body.image.trim()
            ? body.image.trim()
            : null;
      }

      if (body.sortOrder !== undefined) {
        const num = Number(body.sortOrder);
        if (Number.isFinite(num)) {
          data.sortOrder = Math.trunc(num);
        }
      }

      if (body.parentId !== undefined) {
        const pid =
          typeof body.parentId === "string" && body.parentId.trim()
            ? body.parentId.trim()
            : null;
        if (pid === id) {
          return err("لا يمكن أن يكون الصنف أباً لنفسه", 400);
        }
        if (pid && !/^[a-f\d]{24}$/i.test(pid)) {
          return err("معرّف التصنيف الأب غير صالح", 400);
        }
        data.parentId = pid;
      }

      if (body.isActive !== undefined) {
        data.isActive = Boolean(body.isActive);
      }

      const updated = await prisma.productCategory.update({
        where: { id },
        data,
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      await auditLog({
        userId: ctx.userId,
        action: "UPDATE_CATEGORY",
        entity: "ProductCategory",
        entityId: id,
        oldData: existing,
        newData: updated,
        req,
      });

      return ok(updated);
    } catch (error: any) {
      console.error("[Category PATCH Error]:", error);
      return err("فشل تحديث الصنف: " + (error.message || "خطأ غير متوقع"), 500);
    }
  },
  "products:update"
);

export const DELETE = withAuth(
  async (
    req: NextRequest,
    ctx,
    routeContext: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await routeContext.params;
      if (!/^[a-f\d]{24}$/i.test(id)) {
        return err("معرّف الصنف غير صالح", 400);
      }

      const existing = await prisma.productCategory.findUnique({
        where: { id },
        include: {
          _count: { select: { products: true, children: true } },
        },
      });

      if (!existing) {
        return err("الصنف غير موجود", 404);
      }

      if (existing._count.products > 0) {
        return err(
          `لا يمكن حذف هذا الصنف لوجود ${existing._count.products} منتجات مرتبطة به. انقل المنتجات أولاً أو عطّل الصنف.`,
          400
        );
      }

      if (existing._count.children > 0) {
        return err(
          "لا يمكن حذف هذا الصنف لوجود أصناف فرعية مرتبطة به.",
          400
        );
      }

      await prisma.productCategory.delete({ where: { id } });

      await auditLog({
        userId: ctx.userId,
        action: "DELETE_CATEGORY",
        entity: "ProductCategory",
        entityId: id,
        oldData: existing,
        req,
      });

      return ok({ deleted: true, id });
    } catch (error: any) {
      console.error("[Category DELETE Error]:", error);
      return err("فشل حذف الصنف", 500);
    }
  },
  "products:delete"
);

