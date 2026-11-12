"use client";

import { useMemo, useState } from "react";
import { Search, Filter, Sparkles } from "lucide-react";
import { ProductCard, PublicProductCardItem } from "@/components/public/ProductCard";

interface CategoryTab {
  id: string;
  nameAr: string;
  slug: string;
}

interface MenuClientProps {
  products: PublicProductCardItem[];
  categories: CategoryTab[];
  initialCategory?: string;
}

export function MenuClient({
  products,
  categories,
  initialCategory = "all",
}: MenuClientProps) {
  const [selectedCat, setSelectedCat] = useState(initialCategory || "all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((item) => {
      const matchCat =
        selectedCat === "all" ||
        item.category?.id === selectedCat ||
        item.category?.slug === selectedCat;
      const matchSearch =
        !q ||
        item.nameAr.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        (item.descriptionAr || "").toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, selectedCat, searchQuery]);

  return (
    <>
      {/* Menu Header with Expressive Hero Image */}
      <section className="relative overflow-hidden py-14 sm:py-20 border-b border-amber-900/10 dark:border-stone-800 transition-colors">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-menu.jpg"
            alt="تشكيلة منتجات روز باريس لمواد البناء والديكور"
            className="w-full h-full object-cover object-center brightness-[0.38] dark:brightness-[0.25] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/60 dark:from-stone-950 dark:via-stone-950/70 dark:to-black/80" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3.5 relative z-10 text-white">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/25 backdrop-blur-md text-amber-300 text-xs font-bold border border-amber-400/30 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>كتالوج مواد البناء والديكور المعتمد</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
            منتجات ومواد روز باريس
          </h1>
          <p className="text-sm sm:text-base text-stone-200 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            دهانات، جبس بورد، بديل الخشب والرخام، مواد عزل، وأدوات هندسية — اطلب أونلاين واستلم من مستودع أم نوارة أو عبر التوصيل السريع لموقع مشروعك
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="sticky top-[70px] z-30 bg-[#fdfaf5]/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 py-4 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCat("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCat === "all"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/25"
                  : "bg-stone-200/70 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300"
                  }`}
              >
                جميع الأصناف
              </button>
              {categories.map((tab) => {
                const isActive =
                  selectedCat === tab.id || selectedCat === tab.slug;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCat(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${isActive
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/25"
                      : "bg-stone-200/70 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300"
                      }`}
                  >
                    {tab.nameAr}
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث عن دهان، جبس، بديل خشب، عزل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-4 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-amber-500 transition shadow-inner dark:shadow-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Menu Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-stone-500 dark:text-stone-400">
            تم العثور على{" "}
            <strong className="text-stone-900 dark:text-white font-mono">
              {filteredItems.length}
            </strong>{" "}
            صنف
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-20 text-stone-500 space-y-3">
            <Filter className="w-12 h-12 mx-auto text-stone-400 dark:text-stone-600" />
            <p className="text-base font-bold text-stone-700 dark:text-stone-400">
              لم يتم العثور على نتائج
            </p>
            <p className="text-xs">جرب البحث بكلمة أخرى أو قم بإلغاء الفلاتر</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {filteredItems.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

