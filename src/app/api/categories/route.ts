import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, auditLog } from "@/lib/api";

export const dynamic = "force-dynamic";

function slugifyAscii(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET() {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return ok(categories);
  } catch (error: any) {
    console.error("[Categories GET Error]:", error);
    return err("فشل جلب تصنيفات المنتجات", 500);
  }
}

export const POST = withAuth(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const trimmedNameAr = String(body.nameAr ?? "").trim();
      const trimmedNameEn = String(body.nameEn ?? "").trim();
      const rawSlug = String(body.slug ?? "").trim();
      const trimmedImage =
        typeof body.image === "string" && body.image.trim()
          ? body.image.trim()
          : null;
      const resolvedParentId =
        typeof body.parentId === "string" && body.parentId.trim()
          ? body.parentId.trim()
          : null;

      if (!trimmedNameAr) {
        return err("يرجى إدخال اسم الصنف بالعربية", 400);
      }

      if (resolvedParentId && !/^[a-f\d]{24}$/i.test(resolvedParentId)) {
        return err("معرّف التصنيف الأب غير صالح", 400);
      }

      const resolvedNameEn = trimmedNameEn || trimmedNameAr;
      const numericOrder = Number(body.sortOrder);
      const safeSortOrder = Number.isFinite(numericOrder)
        ? Math.trunc(numericOrder)
        : 0;

      let resolvedSlug = slugifyAscii(rawSlug);
      if (rawSlug && !resolvedSlug) {
        return err("الرابط المختصر يجب أن يحتوي على أحرف إنجليزية أو أرقام", 400);
      }

      if (resolvedSlug) {
        const existing = await prisma.productCategory.findUnique({
          where: { slug: resolvedSlug },
        });
        if (existing) {
          return err("الرابط المختصر للتصنيف مستخدم بالفعل", 400);
        }
      } else {
        const baseFromEnglish = slugifyAscii(trimmedNameEn);
        let candidate = baseFromEnglish || `cat-${Date.now().toString(36)}`;
        let attempt = 1;
        while (
          await prisma.productCategory.findUnique({
            where: { slug: candidate },
          })
        ) {
          attempt += 1;
          candidate = `${baseFromEnglish || "cat"}-${Date.now().toString(36)}-${attempt}`;
        }
        resolvedSlug = candidate;
      }

      const category = await prisma.productCategory.create({
        data: {
          nameAr: trimmedNameAr,
          nameEn: resolvedNameEn,
          slug: resolvedSlug,
          image: trimmedImage,
          sortOrder: safeSortOrder,
          parentId: resolvedParentId,
          isActive: true,
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      await auditLog({
        userId: ctx.userId,
        action: "CREATE_CATEGORY",
        entity: "ProductCategory",
        entityId: category.id,
        newData: category,
        req,
      });

      return ok(category, 201);
    } catch (error: any) {
      console.error("[Categories POST Error]:", error);
      return err("فشل إنشاء التصنيف: " + (error.message || "خطأ غير متوقع"), 500);
    }
  },
  "products:create"
);
