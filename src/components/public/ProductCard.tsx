"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, CheckCircle2, Eye, Images } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/currency";

export interface PublicProductCardItem {
  id: string;
  slug?: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  retailPrice: number;
  unit: string;
  images?: string[];
  isFeatured?: boolean;
  isSeasonal?: boolean;
  category?: {
    id: string;
    nameAr: string;
    slug?: string;
  } | null;
  badgeLabel?: string | null;
}

/**
 * Extracts strictly the first two words from a description for a clean, uniform card footer.
 */
export function extractTwoWords(text?: string | null): string {
  const cleaned = text?.trim();
  if (!cleaned) return "مواد بناء وديكور";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return words.join(" ");
  return `${words.slice(0, 2).join(" ")}...`;
}

interface ProductCardProps {
  product: PublicProductCardItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);

  const validImages = (product.images || []).filter(Boolean);
  const hasCustomImage = validImages.length > 0;
  const coverImage = hasCustomImage ? validImages[0] : "/rozeparees.png";
  const detailsHref = `/products/${product.id}`;
  const twoWordsSummary = extractTwoWords(product.descriptionAr);

  const secondaryTag =
    product.badgeLabel ||
    (product.isSeasonal ? "عرض خاص" : product.isFeatured ? "الأكثر طلباً" : "متوفر بالمستودع");

  const handleAdd = () => {
    addItem({
      id: product.id,
      productId: product.id,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      price: product.retailPrice,
      unit: product.unit,
      qty: 1,
      image: coverImage,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article className="group rounded-2xl sm:rounded-3xl bg-white dark:bg-stone-900/90 border border-amber-900/10 dark:border-stone-800 overflow-hidden shadow-xs hover:shadow-xl hover:border-amber-500/45 dark:hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between">
      {/* Top Section: Image Background + Floating Tags */}
      <Link
        href={detailsHref}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#f8efe0] via-[#f4e5cc] to-[#edd8b7] dark:from-stone-900 dark:via-stone-800 dark:to-stone-900"
      >
        <Image
          src={coverImage}
          alt={product.nameAr}
          fill
          unoptimized
          className={
            hasCustomImage
              ? "object-cover group-hover:scale-105 transition-transform duration-500"
              : "object-contain p-7 sm:p-9 opacity-90 group-hover:scale-105 transition-transform duration-500"
          }
        />

        {/* Subtle gradient overlay so floating tags are always crisp */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 via-black/15 to-transparent pointer-events-none" />

        {/* Top Floating Tags (Category + Highlight Tag) */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5 z-10">
          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-white/90 dark:bg-stone-950/85 backdrop-blur-xs text-[10px] sm:text-[11px] font-bold text-stone-800 dark:text-amber-300 shadow-xs truncate max-w-[58%]">
            {product.category?.nameAr || "روز باريس"}
          </span>

          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-600/95 text-white text-[9px] sm:text-[10px] font-bold shadow-xs shrink-0">
            {secondaryTag}
          </span>
        </div>

        {/* Multi-image badge if product has >1 photo */}
        {validImages.length > 1 && (
          <span className="absolute bottom-2.5 left-2.5 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono">
            <Images className="w-3 h-3" />
            <span>{validImages.length}</span>
          </span>
        )}
      </Link>

      {/* Bottom Bar: Title, Strictly 2-word Summary, Price & Eye Icon */}
      <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 gap-3">
        <div>
          <Link
            href={detailsHref}
            className="block font-extrabold text-xs sm:text-base text-stone-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-1"
          >
            {product.nameAr}
          </Link>
          <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium line-clamp-1">
            {twoWordsSummary}
          </p>
        </div>

        <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span
              className="block text-xs sm:text-base font-black text-amber-700 dark:text-amber-400 font-mono truncate"
              dir="ltr"
            >
              {formatCurrency(product.retailPrice)}
            </span>
            <span className="text-[10px] text-stone-400 hidden sm:block">
              لكل {product.unit}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={detailsHref}
              aria-label={`عرض تفاصيل ${product.nameAr}`}
              title="عرض تفاصيل المنتج"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-amber-500/30 bg-amber-50 hover:bg-amber-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-amber-700 dark:text-amber-400 flex items-center justify-center transition"
            >
              <Eye className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={handleAdd}
              className={`h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs ${
                added
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 hover:bg-amber-500 text-white"
              }`}
            >
              {added ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>أضيف</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">أضف</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

