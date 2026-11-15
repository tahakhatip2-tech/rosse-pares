import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err, getPagination } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = getPagination(req);
    const search = searchParams.get("search")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const verifiedOnly = searchParams.get("verified") === "true";

    const where: any = {
      isActive: true,
      isPublic: true,
      subscriptionStatus: { in: ["ACTIVE", "TRIAL"] },
    };

    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    if (verifiedOnly) {
      where.isVerified = true;
    }

    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const [stores, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          nameAr: true,
          nameEn: true,
          logo: true,
          coverImage: true,
          phone: true,
          whatsapp: true,
          email: true,
          city: true,
          description: true,
          isVerified: true,
          subscriptionPlan: true,
          createdAt: true,
          _count: {
            select: {
              branches: true,
              newsPosts: { where: { isPublished: true } },
            },
          },
        },
        orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
      }),
      prisma.business.count({ where }),
    ]);

    // جلب عدد المنتجات المتاحة من خلال الفروع لكل متجر
    const enrichedStores = await Promise.all(
      stores.map(async (store) => {
        // احسب عدد المنتجات إذا كان هناك حقل أو افتراضياً
        return {
          ...store,
          slug: store.slug || store.id,
        };
      })
    );

    return ok({
      stores: enrichedStores,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[Stores GET Error]:", error);
    return err("فشل في جلب قائمة محلات مواد البناء", 500);
  }
}
