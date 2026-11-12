"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/currency";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  Layers,
  Loader2,
  ImageIcon,
  Barcode,
  Printer,
  FolderPlus,
  Package,
  Tags,
} from "lucide-react";
import { BarcodeLabelModal } from "@/components/admin/BarcodeLabelModal";
import {
  CategoryModal,
  type CategoryOptionItem,
} from "@/components/admin/CategoryModal";

interface AdminProductRow {
  id: string;
  sku: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  images: string[];
  category?: { id: string; nameAr: string } | null;
  retailPrice: number;
  costPrice: number;
  unit: string;
  taxRate: number;
  isActive: boolean;
  isFeatured: boolean;
  inventoryItems?: { qtyOnHand: number }[];
  barcodes?: { id: string; code: string; type: string }[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [dbCategories, setDbCategories] = useState<CategoryOptionItem[]>([]);
  const [activeView, setActiveView] = useState<"products" | "categories">("products");
  const [loading, setLoading] = useState(true);
  const [loadingCats, setLoadingCats] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [barcodeNotice, setBarcodeNotice] = useState<string | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryOptionItem | null>(
    null
  );
  const [labelModalProduct, setLabelModalProduct] = useState<{
    id: string;
    nameAr: string;
    retailPrice: number;
    unit: string;
    barcode: string;
  } | null>(null);

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products?all=true&limit=100", {
        cache: "no-store",
      });
      const json = await res.json();
      const items: AdminProductRow[] = Array.isArray(json?.data?.items)
        ? json.data.items
        : [];
      setProducts(items);
    } catch {
      // Keep existing list on failure
    }
  };

  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      const json = await res.json();
      if (Array.isArray(json?.data)) {
        setDbCategories(json.data);
      }
    } catch {
      // Keep existing list on failure
    } finally {
      setLoadingCats(false);
    }
  };

  const openCategoriesView = () => {
    setActiveView("categories");
    void loadCategories();
  };

  const deleteCategory = async (cat: CategoryOptionItem) => {
    if (!confirm(`هل أنت متأكد من حذف الصنف «${cat.nameAr}»؟`)) return;
    setBusyId(cat.id);
    setBarcodeNotice(null);
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json?.success) {
        setDbCategories((prev) => prev.filter((c) => c.id !== cat.id));
        if (selectedCategory === cat.id) setSelectedCategory("ALL");
        setBarcodeNotice(`تم حذف الصنف «${cat.nameAr}» بنجاح.`);
      } else {
        setBarcodeNotice(json?.error || "تعذر حذف الصنف.");
      }
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/products?all=true&limit=100", { cache: "no-store" }).then((r) =>
        r.json()
      ),
      fetch("/api/categories", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([prodJson, catJson]) => {
        if (!active) return;
        const items: AdminProductRow[] = Array.isArray(prodJson?.data?.items)
          ? prodJson.data.items
          : [];
        setProducts(items);
        if (Array.isArray(catJson?.data)) {
          setDbCategories(catJson.data);
        }
      })
      .catch(() => {
        // Keep empty state on failure
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.nameAr.toLowerCase().includes(q) ||
      p.nameEn.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      Boolean(p.barcodes?.some((b) => b.code.toLowerCase().includes(q)));
    const matchCat =
      selectedCategory === "ALL" ||
      p.category?.id === selectedCategory ||
      p.category?.nameAr === selectedCategory;
    return matchSearch && matchCat;
  });

  const filteredCategories = dbCategories.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.nameAr.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q)
    );
  });

  const missingBarcodeCount = products.filter(
    (p) => !p.barcodes || p.barcodes.length === 0
  ).length;

  const ensureAndOpenBarcodeModal = async (p: AdminProductRow) => {
    const existing =
      p.barcodes && p.barcodes.length > 0
        ? p.barcodes[p.barcodes.length - 1].code
        : undefined;
    if (existing) {
      setLabelModalProduct({
        id: p.id,
        nameAr: p.nameAr,
        retailPrice: p.retailPrice,
        unit: p.unit,
        barcode: existing,
      });
      return;
    }

    setBusyId(p.id);
    try {
      const res = await fetch(`/api/products/${p.id}/barcode`, { method: "POST" });
      const json = await res.json();
      const createdCode = json?.data?.barcode?.code as string | undefined;
      if (res.ok && createdCode) {
        const updatedBarcodes = json?.data?.barcodes || [json.data.barcode];
        setProducts((prev) =>
          prev.map((row) =>
            row.id === p.id ? { ...row, barcodes: updatedBarcodes } : row
          )
        );
        setLabelModalProduct({
          id: p.id,
          nameAr: p.nameAr,
          retailPrice: p.retailPrice,
          unit: p.unit,
          barcode: createdCode,
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleBackfillBarcodes = async () => {
    setBackfilling(true);
    setBarcodeNotice(null);
    try {
      const res = await fetch("/api/products/barcode-backfill", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        await loadProducts();
        const updated = Number(json?.data?.updated || 0);
        setBarcodeNotice(
          updated > 0
            ? `تم توليد باركود جديد لعدد ${updated} صنف بنجاح.`
            : "جميع الأصناف تمتلك باركود بالفعل."
        );
      }
    } finally {
      setBackfilling(false);
    }
  };

  const toggleStatus = async (product: AdminProductRow) => {
    setBusyId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, isActive: !product.isActive } : p
          )
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const archiveProduct = async (id: string) => {
    if (!confirm("هل أنت متأكد من أرشفة وإخفاء هذا المنتج؟")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: false } : p))
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-600" />
            <span>إدارة المنتجات والأصناف</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            إدارة منتجات وتصنيفات مواد البناء والديكور، رفع حتى 5 صور لكل منتج، والأسعار وتفاصيل العرض
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={backfilling || loading}
            onClick={handleBackfillBarcodes}
            className="px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
          >
            <Barcode className="w-4 h-4 text-amber-600" />
            <span>
              {backfilling
                ? "جاري التوليد..."
                : missingBarcodeCount > 0
                ? `توليد باركود (${missingBarcodeCount})`
                : "فحص وتوليد الباركود"}
            </span>
          </button>

          <button
            type="button"
            onClick={
              activeView === "categories"
                ? () => setActiveView("products")
                : openCategoriesView
            }
            className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition ${
              activeView === "categories"
                ? "bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600 shadow-sm"
                : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200"
            }`}
          >
            <Tags className="w-4 h-4 text-amber-500" />
            <span>
              {activeView === "categories"
                ? `عرض المنتجات (${products.length})`
                : `الأصناف (${dbCategories.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCategory(null);
              setCategoryModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl border border-amber-600/35 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center gap-2 transition"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ إضافة صنف جديد</span>
          </button>

          <Link
            href="/admin/products/new"
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج</span>
          </Link>
        </div>
      </div>

      {barcodeNotice && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{barcodeNotice}</span>
          <button
            type="button"
            onClick={() => setBarcodeNotice(null)}
            className="text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-100 text-[11px]"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="inline-flex p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
              <button
                type="button"
                onClick={() => setActiveView("products")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  activeView === "products"
                    ? "bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs"
                    : "text-stone-600 dark:text-stone-300 hover:text-stone-900"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>المنتجات ({products.length})</span>
              </button>
              <button
                type="button"
                onClick={openCategoriesView}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  activeView === "categories"
                    ? "bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs"
                    : "text-stone-600 dark:text-stone-300 hover:text-stone-900"
                }`}
              >
                <Tags className="w-3.5 h-3.5" />
                <span>الأصناف ({dbCategories.length})</span>
              </button>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeView === "categories"
                    ? "بحث في الأصناف بالاسم أو Slug..."
                    : "بحث بالاسم، الباركود، أو SKU..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {activeView === "products" && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-stone-500 shrink-0">التصنيف:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">جميع التصنيفات ({dbCategories.length})</option>
                {dbCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {activeView === "products" && dbCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                selectedCategory === "ALL"
                  ? "bg-amber-600 text-white"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
              }`}
            >
              الكل ({products.length})
            </button>
            {dbCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  selectedCategory === c.id
                    ? "bg-amber-600 text-white"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                {c.image && (
                  <span className="relative w-4 h-4 rounded overflow-hidden shrink-0">
                    <Image
                      src={c.image}
                      alt={c.nameAr}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </span>
                )}
                <span>{c.nameAr}</span>
                {typeof c._count?.products === "number" && (
                  <span
                    className={`px-1.5 rounded text-[10px] font-mono ${
                      selectedCategory === c.id
                        ? "bg-white/20 text-white"
                        : "bg-white dark:bg-stone-900 text-stone-500"
                    }`}
                  >
                    {c._count.products}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Categories Table View */}
      {activeView === "categories" ? (
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
          {loadingCats ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-stone-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              <span>جاري جلب الأصناف...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-14 text-center text-xs text-stone-500">
              لا توجد أصناف مطابقة. يمكنك إضافة صنف جديد من زر «+ إضافة صنف جديد».
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                  <tr>
                    <th className="py-3 px-4">الصنف والصورة</th>
                    <th className="py-3 px-4">الرابط المختصر (Slug)</th>
                    <th className="py-3 px-4">التصنيف الأب</th>
                    <th className="py-3 px-4">المنتجات المرتبطة</th>
                    <th className="py-3 px-4">الترتيب</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredCategories.map((cat) => {
                    const parentCat = cat.parentId
                      ? dbCategories.find((c) => c.id === cat.parentId)
                      : null;
                    const prodCount = cat._count?.products ?? 0;
                    const isBusy = busyId === cat.id;

                    return (
                      <tr
                        key={cat.id}
                        className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition"
                      >
                        <td className="py-3 px-4 font-bold text-stone-900 dark:text-stone-100">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#f7efe1] dark:bg-stone-800 border border-amber-900/10 shrink-0">
                              <Image
                                src={cat.image || "/rozeparees.png"}
                                alt={cat.nameAr}
                                fill
                                className={
                                  cat.image ? "object-cover" : "object-contain p-1.5"
                                }
                                unoptimized
                              />
                            </div>
                            <div>
                              <div className="font-bold">{cat.nameAr}</div>
                              <div className="text-[10px] text-stone-400 font-normal">
                                {cat.nameEn}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-stone-600 dark:text-stone-300">
                          <span dir="ltr" className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800">
                            {cat.slug}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                          {parentCat ? parentCat.nameAr : "تصنيف رئيسي"}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setActiveView("products");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-[11px] transition"
                            title="عرض منتجات هذا الصنف"
                          >
                            <span>{prodCount} منتج</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-500">
                          {cat.sortOrder ?? 0}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setEditingCategory(cat);
                                setCategoryModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
                              title="تعديل الصنف والصورة"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isBusy || prodCount > 0}
                              onClick={() => deleteCategory(cat)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={
                                prodCount > 0
                                  ? "لا يمكن حذف صنف يحتوي على منتجات"
                                  : "حذف الصنف"
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Products Table */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-stone-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            <span>جاري تحميل المنتجات...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-xs text-stone-500">
            لا توجد منتجات مطابقة للبحث. يمكنك إضافة منتج جديد من الزر أعلاه.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                <tr>
                  <th className="py-3 px-4">المنتج والصور</th>
                  <th className="py-3 px-4">الباركود / SKU</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4">سعر البيع (د.أ)</th>
                  <th className="py-3 px-4">تكلفة الإنتاج</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filtered.map((p) => {
                  const margin =
                    p.retailPrice > 0
                      ? ((p.retailPrice - p.costPrice) / p.retailPrice) * 100
                      : 0;
                  const coverImage = p.images?.[0] || "/rozeparees.png";
                  const hasCustomImages = Boolean(p.images && p.images.length > 0);
                  const isBusy = busyId === p.id;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition"
                    >
                      <td className="py-3 px-4 font-bold text-stone-900 dark:text-stone-100">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#f7efe1] dark:bg-stone-800 border border-amber-900/10 shrink-0">
                            <Image
                              src={coverImage}
                              alt={p.nameAr}
                              fill
                              className={hasCustomImages ? "object-cover" : "object-contain p-1.5"}
                              unoptimized
                            />
                            <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/65 text-white text-[9px] font-mono flex items-center gap-0.5">
                              <ImageIcon className="w-2.5 h-2.5" />
                              {p.images?.length || 0}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{p.nameAr}</span>
                              {p.isFeatured && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
                                  مميز
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-stone-400 font-normal">
                              {p.nameEn}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {p.barcodes && p.barcodes.length > 0 ? (
                          <div className="space-y-0.5">
                            <span
                              dir="ltr"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-[11px]"
                            >
                              <Barcode className="w-3 h-3" />
                              {p.barcodes[p.barcodes.length - 1].code}
                            </span>
                            <div className="text-[10px] text-stone-400">{p.sku}</div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-400 text-[10px] font-sans">
                              بدون باركود
                            </span>
                            <div className="text-[10px] text-stone-400">{p.sku}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-[11px]">
                          {p.category?.nameAr || "عام"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {formatCurrency(p.retailPrice)}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-500">
                        {formatCurrency(p.costPrice)}
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mr-1.5 font-bold">
                          ({margin.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => toggleStatus(p)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition disabled:opacity-50 ${
                            p.isActive
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                              : "bg-stone-100 dark:bg-stone-800 text-stone-400"
                          }`}
                        >
                          {p.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>نشط</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>معطل</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => ensureAndOpenBarcodeModal(p)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition disabled:opacity-50"
                            title="عرض وطباعة الباركود"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/products/${p.id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                            title="عرض في المتجر"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                            title="تعديل وإدارة الصور"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => archiveProduct(p.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50"
                            title="أرشفة وإخفاء"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      <BarcodeLabelModal
        isOpen={Boolean(labelModalProduct)}
        onClose={() => setLabelModalProduct(null)}
        product={labelModalProduct}
        onRegenerateBarcode={
          labelModalProduct
            ? async () => {
                const targetId = labelModalProduct.id;
                const res = await fetch(`/api/products/${targetId}/barcode`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ forceNew: true }),
                });
                const json = await res.json();
                const code = json?.data?.barcode?.code as string | undefined;
                if (res.ok && code) {
                  const updatedBarcodes = json?.data?.barcodes || [json.data.barcode];
                  setProducts((prev) =>
                    prev.map((row) =>
                      row.id === targetId
                        ? { ...row, barcodes: updatedBarcodes }
                        : row
                    )
                  );
                  setLabelModalProduct((prev) =>
                    prev && prev.id === targetId ? { ...prev, barcode: code } : prev
                  );
                  return code;
                }
                return null;
              }
            : undefined
        }
      />
      <CategoryModal
        isOpen={categoryModalOpen}
        mode={editingCategory ? "edit" : "create"}
        initialCategory={editingCategory}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        existingCategories={dbCategories}
        onCreated={(newCat) => {
          setDbCategories((prev) =>
            prev.some((c) => c.id === newCat.id) ? prev : [...prev, newCat]
          );
          setBarcodeNotice(
            `تمت إضافة الصنف «${newCat.nameAr}» بنجاح وأصبح متاحاً لاختيار المنتجات.`
          );
          void loadCategories();
        }}
        onUpdated={(updatedCat) => {
          setDbCategories((prev) =>
            prev.map((c) => (c.id === updatedCat.id ? updatedCat : c))
          );
          setBarcodeNotice(`تم تحديث بيانات وصورة الصنف «${updatedCat.nameAr}» بنجاح.`);
          void loadCategories();
          void loadProducts();
        }}
      />
    </div>
  );
}
