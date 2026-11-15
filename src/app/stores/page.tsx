"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Search,
  MapPin,
  CheckCircle2,
  Building2,
  RefreshCw,
  PlusCircle,
  SlidersHorizontal,
} from "lucide-react";
import StoreCard, { StoreItem } from "@/components/stores/StoreCard";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";

const CITIES = ["الكل", "عمان", "الزرقاء", "إربد", "العقبة", "المفرق", "جرش", "مادبا", "الكرك"];

export default function StoresDirectoryPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("الكل");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedCity !== "الكل") params.set("city", selectedCity);
      if (verifiedOnly) params.set("verified", "true");

      const res = await fetch(`/api/stores?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setStores(json.data.stores || []);
        setTotal(json.data.total || 0);
      }
    } catch (err) {
      console.error("Error fetching stores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStores();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCity, verifiedOnly]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100" dir="rtl">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-stone-900 text-white py-14 sm:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/80 to-amber-950/40" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-5 backdrop-blur-md">
              <Store className="w-3.5 h-3.5" />
              <span>دليل المحلات والشركات المعتمدة في الأردن</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight">
              محلات ومعارض مواد البناء والديكور
            </h1>
            <p className="text-sm sm:text-base text-stone-300 max-w-2xl mx-auto leading-relaxed mb-8">
              تصفح مئات المحلات المعتمدة، استكشف المنتجات ومواد العزل والدهانات والسيراميك، وتواصل مع التجار مباشرة أو اطلب عروض أسعار.
            </p>

            {/* Quick CTA to join as seller */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-lg hover:shadow-amber-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>أضف محلك الآن مجاناً</span>
              </Link>
              <Link
                href="/news"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/15 backdrop-blur-md transition-all"
              >
                <span>أحدث أخبار وعروض المحلات</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Filters & Content Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Search Bar & City Filters */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-6 shadow-sm mb-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search input */}
              <div className="md:col-span-8 relative">
                <Search className="w-5 h-5 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث باسم المحل، مواد البناء، المنطقة، أو التخصص..."
                  className="w-full pr-11 pl-4 py-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>

              {/* Verified Only Toggle */}
              <div className="md:col-span-4 flex items-center justify-between sm:justify-end gap-3 px-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <span>المحلات الموثّقة فقط</span>
                </label>

                <button
                  onClick={fetchStores}
                  title="تحديث النتائج"
                  className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* City Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
              <span className="text-stone-400 flex items-center gap-1 shrink-0 font-medium pl-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>المدينة:</span>
              </span>
              {CITIES.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3.5 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                    selectedCity === city
                      ? "bg-amber-600 text-white font-bold shadow-sm"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              <span>المحلات المسجلة</span>
              <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2.5 py-0.5 rounded-full">
                {total} محل
              </span>
            </h2>
          </div>

          {/* Stores Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-80 rounded-2xl bg-stone-200 dark:bg-stone-900 border border-stone-300 dark:border-stone-800"
                />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
              <Store className="w-16 h-16 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200 mb-2">
                لم نجد محلات تطابق بحثك
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
                جرّب تغيير عبارة البحث أو اختيار مدينة أخرى من الفلاتر أعلاه.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCity("الكل");
                  setVerifiedOnly(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
