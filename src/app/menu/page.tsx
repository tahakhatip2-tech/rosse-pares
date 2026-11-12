import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { MenuClient } from "@/components/public/MenuClient";
import { PublicProductCardItem } from "@/components/public/ProductCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "كتالوج مواد البناء والديكور | روز باريس",
  description:
    "تصفح جميع منتجات روز باريس لمواد البناء والديكور من الدهانات والجبس بورد وبديل الخشب والرخام في عمّان واطلب أونلاين.",
};

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        category: {
          select: { id: true, nameAr: true, slug: true },
        },
      },
    }),
    prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameAr: true, slug: true },
    }),
  ]);

  const items: PublicProductCardItem[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    descriptionAr: p.descriptionAr,
    retailPrice: p.retailPrice,
    unit: p.unit,
    images: p.images || [],
    isFeatured: p.isFeatured,
    isSeasonal: p.isSeasonal,
    category: p.category,
  }));

  return (
    <div className="min-h-screen bg-[#fdfaf5] text-stone-900 dark:bg-stone-950 dark:text-stone-100 flex flex-col font-sans transition-colors duration-300">
      <Navbar />
      <MenuClient
        products={items}
        categories={categories}
        initialCategory={category || "all"}
      />
      <Footer />
    </div>
  );
}
