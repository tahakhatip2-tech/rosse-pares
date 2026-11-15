import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return err("معرف المحل مطلوب", 400);
    }

    // البحث إما بالـ slug أو بالـ id إن لم يكن slug
    const store = await prisma.business.findFirst({
      where: {
        OR: [{ slug }, { id: slug.length === 24 ? slug : undefined }],
        isActive: true,
      },
      include: {
        branches: {
          where: { isActive: true },
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            phone: true,
            address: true,
            hours: true,
          },
        },
        newsPosts: {
          where: { isPublished: true },
          take: 6,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            content: true,
            mediaUrl: true,
            type: true,
            likesCount: true,
            commentsCount: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            branches: true,
            newsPosts: { where: { isPublished: true } },
          },
        },
      },
    });

    if (!store) {
      return err("المحل التجاري غير موجود أو غير نشط حالياً", 404);
    }

    // جلب المنتجات المتاحة (يمكن تصفيتها حسب المحل)
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      take: 24,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sku: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        retailPrice: true,
        unit: true,
        images: true,
        isFeatured: true,
        category: {
          select: {
            id: true,
            nameAr: true,
          },
        },
      },
    });

    return ok({
      store: {
        ...store,
        slug: store.slug || store.id,
      },
      products,
    });
  } catch (error) {
    console.error("[Store Detail GET Error]:", error);
    return err("حدث خطأ أثناء تحميل بيانات المحل", 500);
  }
}
