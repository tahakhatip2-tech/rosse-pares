import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductWithRelated } from "@/lib/products";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import {
  ProductDetailClient,
  ProductDetailData,
} from "@/components/public/ProductDetailClient";
import { PublicProductCardItem } from "@/components/public/ProductCard";

export const dynamic = "force-dynamic";

function mapToCardItem(item: {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  retailPrice: number;
  unit: string;
  images: string[];
  isFeatured: boolean;
  isSeasonal: boolean;
  category: { id: string; nameAr: string; slug: string } | null;
}): PublicProductCardItem {
  return {
    id: item.id,
    slug: item.slug,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    descriptionAr: item.descriptionAr,
    retailPrice: item.retailPrice,
    unit: item.unit,
    images: item.images || [],
    isFeatured: item.isFeatured,
    isSeasonal: item.isSeasonal,
    category: item.category,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getProductWithRelated(id);
  if (!result || !result.product.isActive) {
    return { title: "المنتج غير موجود | روز باريس" };
  }
  const { product } = result;
  const image = product.images?.[0] || "/rozeparees.png";
  return {
    title: `${product.nameAr} | روز باريس`,
    description:
      product.descriptionAr ||
      `${product.nameAr} من روز باريس لمواد البناء والديكور في عمّان.`,
    openGraph: {
      title: product.nameAr,
      description: product.descriptionAr || undefined,
      images: [image],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProductWithRelated(id);

  if (!result || !result.product.isActive) {
    notFound();
  }

  const { product, sameCategory, suggested, categories } = result;

  const detailData: ProductDetailData = {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    descriptionAr: product.descriptionAr,
    descriptionEn: product.descriptionEn,
    ingredientsAr: product.ingredientsAr,
    ingredientsEn: product.ingredientsEn,
    images: product.images || [],
    unit: product.unit,
    weight: product.weight,
    retailPrice: product.retailPrice,
    taxRate: product.taxRate,
    allergens: product.allergens || [],
    shelfLifeHours: product.shelfLifeHours,
    minOrderQty: product.minOrderQty,
    isFeatured: product.isFeatured,
    isSeasonal: product.isSeasonal,
    category: product.category,
    variants: product.variants.map((v) => ({
      id: v.id,
      nameAr: v.nameAr,
      nameEn: v.nameEn,
      price: v.price,
      weight: v.weight,
    })),
  };

  return (
    <div className="min-h-screen bg-[#fdfaf5] text-stone-900 dark:bg-stone-950 dark:text-stone-100 flex flex-col font-sans transition-colors duration-300">
      <Navbar />
      <main className="flex-1">
        <ProductDetailClient
          product={detailData}
          sameCategory={sameCategory.map(mapToCardItem)}
          suggested={suggested.map(mapToCardItem)}
          categories={categories}
        />
      </main>
      <Footer />
    </div>
  );
}
