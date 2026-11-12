"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  CheckCircle2,
  Share2,
  Maximize2,
  X,
  Plus,
  Minus,
  Layers,
  Clock,
  Scale,
  AlertTriangle,
  Sparkles,
  Tag,
  Copy,
  Check,
  ShieldCheck,
  Truck,
  Flame,
} from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/currency";
import { ProductCard, PublicProductCardItem } from "@/components/public/ProductCard";

export interface ProductVariantItem {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  weight?: number | null;
}

export interface ProductDetailData {
  id: string;
  sku: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  ingredientsAr?: string | null;
  ingredientsEn?: string | null;
  images: string[];
  unit: string;
  weight?: number | null;
  retailPrice: number;
  taxRate: number;
  allergens: string[];
  shelfLifeHours?: number | null;
  minOrderQty: number;
  isFeatured: boolean;
  isSeasonal: boolean;
  category?: {
    id: string;
    nameAr: string;
    nameEn: string;
    slug: string;
  } | null;
  variants: ProductVariantItem[];
}

const ALLERGEN_LABELS: Record<string, string> = {
  gluten: "جلوتين القمح",
  dairy: "حليب ومشتقاته",
  eggs: "بيض",
  nuts: "مكسرات وفستق",
  sesame: "سمسم",
};

interface CategoryLinkItem {
  id: string;
  nameAr: string;
  slug: string;
}

interface ProductDetailClientProps {
  product: ProductDetailData;
  sameCategory: PublicProductCardItem[];
  suggested: PublicProductCardItem[];
  categories: CategoryLinkItem[];
}

export function ProductDetailClient({
  product,
  sameCategory,
  suggested,
  categories,
}: ProductDetailClientProps) {
  const addItem = useCartStore((state) => state.addItem);

  const galleryImages =
    product.images && product.images.length > 0 ? product.images : ["/rozeparees.png"];
  const hasRealImages = Boolean(product.images && product.images.length > 0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants[0]?.id ?? null
  );
  const [qty, setQty] = useState(Math.max(1, product.minOrderQty || 1));
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) ?? null;
  const activePrice = selectedVariant ? selectedVariant.price : product.retailPrice;
  const activeWeight = selectedVariant?.weight ?? product.weight;
  const activeImage = galleryImages[activeIndex] || "/rozeparees.png";

  function prevImage() {
    setActiveIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
  }

  function nextImage() {
    setActiveIndex((i) => (i + 1) % galleryImages.length);
  }

  function handleAddToCart() {
    addItem({
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      productId: product.id,
      nameAr: selectedVariant
        ? `${product.nameAr} (${selectedVariant.nameAr})`
        : product.nameAr,
      nameEn: selectedVariant
        ? `${product.nameEn} (${selectedVariant.nameEn})`
        : product.nameEn,
      price: activePrice,
      unit: product.unit,
      qty,
      image: galleryImages[0],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  async function handleCopyLink() {
    const shareUrl = `${window.location.origin}/products/${product.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  function handleWhatsAppShare() {
    const shareUrl = `${window.location.origin}/products/${product.id}`;
    const msg = `${product.nameAr} — ${formatCurrency(activePrice)} من روز باريس لمواد البناء والديكور\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <Link href="/" className="hover:text-amber-600 transition">
          الرئيسية
        </Link>
        <span>/</span>
        <Link href="/menu" className="hover:text-amber-600 transition">
          كتالوج المواد
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`/menu?category=${product.category.id}`}
              className="hover:text-amber-600 transition"
            >
              {product.category.nameAr}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="font-bold text-stone-900 dark:text-white truncate">
          {product.nameAr}
        </span>
      </nav>

      {/* Main Split Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left: Professional Interactive Gallery */}
        <div className="lg:col-span-6 space-y-3.5">
          <div className="relative aspect-[4/3] sm:aspect-[5/4] rounded-3xl overflow-hidden bg-gradient-to-br from-[#f8efe0] via-[#f4e5cc] to-[#edd8b7] dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 border border-amber-900/10 dark:border-stone-800 shadow-lg group">
            <Image
              src={activeImage}
              alt={`${product.nameAr} — صورة ${activeIndex + 1}`}
              fill
              unoptimized
              className={
                hasRealImages
                  ? "object-cover transition-transform duration-500"
                  : "object-contain p-14 opacity-90"
              }
            />

            {/* Floating Tags */}
            <div className="absolute top-4 right-4 flex flex-wrap gap-2 z-10">
              {product.isFeatured && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-600 text-white text-xs font-bold shadow">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>مميز</span>
                </span>
              )}
              {product.isSeasonal && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow">
                  <Tag className="w-3.5 h-3.5" />
                  <span>موسمي</span>
                </span>
              )}
            </div>

            {/* Zoom button */}
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="تكبير الصورة"
              className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Slider Arrows if multiple photos */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label="الصورة السابقة"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/85 dark:bg-stone-950/80 hover:bg-white text-stone-900 dark:text-white flex items-center justify-center shadow-md transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="الصورة التالية"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/85 dark:bg-stone-950/80 hover:bg-white text-stone-900 dark:text-white flex items-center justify-center shadow-md transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-mono backdrop-blur-xs">
                  {activeIndex + 1} / {galleryImages.length}
                </span>
              </>
            )}
          </div>

          {/* Thumbnails Strip */}
          {galleryImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2.5">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition ${
                    activeIndex === idx
                      ? "border-amber-600 ring-2 ring-amber-500/30 scale-[1.02]"
                      : "border-stone-200 dark:border-stone-800 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={imgUrl}
                    alt={`${product.nameAr} مصغرة ${idx + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info, Variants & Add to Cart */}
        <div className="lg:col-span-6 space-y-6 bg-white dark:bg-stone-900/85 border border-amber-900/10 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="space-y-2 border-b border-stone-200/80 dark:border-stone-800 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {product.category && (
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-xs font-bold">
                  {product.category.nameAr}
                </span>
              )}
              <span className="text-[11px] font-mono text-stone-400">
                SKU: {product.sku}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white leading-tight pt-1">
              {product.nameAr}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-sans">
              {product.nameEn}
            </p>
          </div>

          {/* Price Block */}
          <div className="flex flex-wrap items-baseline justify-between gap-4 bg-[#fbf6ec] dark:bg-stone-950/70 rounded-2xl p-4 border border-amber-900/10 dark:border-stone-800">
            <div>
              <span className="text-xs text-stone-500 dark:text-stone-400 block">
                السعر ({product.unit})
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span
                  className="text-3xl font-black text-amber-700 dark:text-amber-400 font-mono"
                  dir="ltr"
                >
                  {formatCurrency(activePrice)}
                </span>
                <span className="text-[11px] text-stone-500">
                  {product.taxRate === 0
                    ? "معفى من الضريبة"
                    : `شامل ${product.taxRate}% ضريبة`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span>متوفر بالمواصفات القياسية</span>
            </div>
          </div>

          {/* Variants selector */}
          {product.variants.length > 0 && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                اختر الحجم / الخيار:
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const selected = selectedVariantId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition ${
                        selected
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-amber-500"
                      }`}
                    >
                      <span>{v.nameAr}</span>
                      <span className="mx-1.5 opacity-75">•</span>
                      <span className="font-mono" dir="ltr">
                        {formatCurrency(v.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Description */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-stone-800 dark:text-stone-200">
              وصف المنتج
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line">
              {product.descriptionAr ||
                "منتج بناء وديكور معتمد وفق أعلى المواصفات الفنية في روز باريس."}
            </p>
          </div>

          {/* Quick Specs Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800">
              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-amber-600" />
                <span>الوزن / العبوة</span>
              </span>
              <p className="text-sm font-extrabold text-stone-900 dark:text-white mt-1">
                {activeWeight ? `${activeWeight} كغم/غ` : `حسب الـ${product.unit}`}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800">
              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>الضمان / التخزين</span>
              </span>
              <p className="text-sm font-extrabold text-stone-900 dark:text-white mt-1">
                {product.shelfLifeHours ? `${product.shelfLifeHours} ساعة` : "تخزين جاف وآمن"}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>الوحدة</span>
              </span>
              <p className="text-sm font-extrabold text-stone-900 dark:text-white mt-1">
                {product.unit}
              </p>
            </div>
          </div>

          {/* Technical Specs */}
          {product.ingredientsAr && (
            <div className="p-4 rounded-2xl bg-[#fbf6ec] dark:bg-stone-950/60 border border-amber-900/10 dark:border-stone-800 space-y-1.5">
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>المواصفات الفنية والتركيب</span>
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                {product.ingredientsAr}
              </p>
            </div>
          )}

          {/* Safety & Handling Instructions */}
          {product.allergens && product.allergens.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>إرشادات السلامة والاستخدام:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {product.allergens.map((key) => (
                  <span
                    key={key}
                    className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-300"
                  >
                    {ALLERGEN_LABELS[key] || key}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart + Share */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="inline-flex items-center justify-between sm:justify-center rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-2 h-12">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center transition"
                aria-label="إنقاص الكمية"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-mono font-bold text-sm">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="w-8 h-8 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center transition"
                aria-label="زيادة الكمية"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex-1 h-12 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition ${
                added
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 hover:bg-amber-500 text-white"
              }`}
            >
              {added ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>تمت الإضافة إلى السلة!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  <span>
                    أضف إلى السلة ({formatCurrency(activePrice * qty)})
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                title="مشاركة عبر واتساب"
                className="h-12 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 flex items-center justify-center gap-1.5 text-xs font-bold transition"
              >
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span className="sm:hidden">مشاركة</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                title="نسخ رابط المنتج"
                className="h-12 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 flex items-center justify-center text-xs font-bold transition"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Guarantees */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-stone-900/70 border border-amber-900/10 dark:border-stone-800 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-stone-900 dark:text-white">
              متانة وجودة معمارية
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              مختارة بعناية من مستودع روز باريس لتدوم طويلاً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-stone-900/70 border border-amber-900/10 dark:border-stone-800 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-stone-900 dark:text-white">
              توصيل سريع ومجهّز في عمّان
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              توصيل مباشر لموقع العمل أو المشروع دون تأخير
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-stone-900/70 border border-amber-900/10 dark:border-stone-800 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-stone-900 dark:text-white">
              مطابقة للمواصفات 100%
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              فحص جودة دقيق وفواتير ضريبية رسمية معتمدة
            </p>
          </div>
        </div>
      </section>

      {/* Same Category Products */}
      {sameCategory.length > 0 && (
        <section className="pt-8 border-t border-amber-900/10 dark:border-stone-800 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                من نفس التصنيف
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white mt-0.5">
                منتجات مشابهة في {product.category?.nameAr || "القسم"}
              </h2>
            </div>
            <Link
              href={
                product.category
                  ? `/menu?category=${product.category.id}`
                  : "/menu"
              }
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>عرض القسم كاملاً</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {sameCategory.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {/* Complementary / Suggested Bakery Picks */}
      {suggested.length > 0 && (
        <section className="pt-8 border-t border-amber-900/10 dark:border-stone-800 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                مختارات معرض روز باريس
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white mt-0.5">
                أصناف أخرى قد تعجبك أيضاً
              </h2>
            </div>
            <Link
              href="/menu"
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>تصفح كل القائمة</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {suggested.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {/* Quick Category Explorer */}
      {categories.length > 0 && (
        <section className="p-6 sm:p-8 rounded-3xl bg-[#f8efe0]/80 dark:bg-stone-900/70 border border-amber-900/10 dark:border-stone-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                تصفح باقي أقسام المتجر
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                اكتشف تشكيلاتنا المتكاملة من الدهانات والجبس بورد وبديل الخشب والرخام ومواد العزل
              </p>
            </div>
            <Link
              href="/menu"
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0"
            >
              كل الأقسام ←
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/menu?category=${cat.id}`}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  cat.id === product.category?.id
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-white dark:bg-stone-950 text-stone-700 dark:text-stone-300 border-amber-900/10 dark:border-stone-800 hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-400"
                }`}
              >
                {cat.nameAr}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
            aria-label="إغلاق المعرض"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="relative w-full max-w-4xl aspect-[4/3] rounded-2xl overflow-hidden bg-stone-900"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage}
              alt={product.nameAr}
              fill
              unoptimized
              className="object-contain"
            />
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
