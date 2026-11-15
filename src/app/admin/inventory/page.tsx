"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { formatCurrency } from "@/lib/currency";
import {
  Package,
  AlertTriangle,
  ArrowUpDown,
  Search,
  CheckCircle2,
  X,
  Warehouse as WarehouseIcon,
  RotateCcw,
  Loader2,
  RefreshCw,
  Plus,
  Minus,
  AlertCircle,
} from "lucide-react";

export interface InventoryItemData {
  id: string;
  qtyOnHand: number;
  qtyReserved?: number;
  reorderPoint: number;
  isLowStock?: boolean;
  product: {
    id: string;
    sku: string;
    nameAr: string;
    nameEn?: string | null;
    unit: string;
    retailPrice?: number;
    costPrice: number;
    category?: { nameAr: string } | null;
  };
  warehouse: {
    id?: string;
    nameAr: string;
    nameEn?: string | null;
  };
  updatedAt?: string;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Quick Adjustment Modal state
  const [adjustModalItem, setAdjustModalItem] = useState<InventoryItemData | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("تسوية جرد فعلي");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory?limit=100", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`خطأ في استجابة الخادم: ${res.status}`);
      }
      const json = await res.json();
      const fetchedItems: InventoryItemData[] = Array.isArray(json?.data?.items)
        ? json.data.items
        : [];
      setItems(fetchedItems);
    } catch (err: any) {
      console.error("[Fetch Inventory Error]:", err);
      setError(err?.message || "فشل تحميل بيانات المخزون");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchSearch =
        !term ||
        item.product?.nameAr?.toLowerCase().includes(term) ||
        (item.product?.nameEn && item.product.nameEn.toLowerCase().includes(term)) ||
        item.product?.sku?.toLowerCase().includes(term) ||
        (item.warehouse?.nameAr && item.warehouse.nameAr.toLowerCase().includes(term));

      const isLow = item.isLowStock ?? item.qtyOnHand <= item.reorderPoint;
      const matchLow = !lowStockFilter || isLow;

      return matchSearch && matchLow;
    });
  }, [items, search, lowStockFilter]);

  const lowStockCount = useMemo(() => {
    return items.filter((i) => i.isLowStock ?? i.qtyOnHand <= i.reorderPoint).length;
  }, [items]);

  const totalStockValue = useMemo(() => {
    return items.reduce((acc, i) => {
      const cost = Number(i.product?.costPrice) || 0;
      return acc + (i.qtyOnHand || 0) * cost;
    }, 0);
  }, [items]);

  const handleApplyAdjustment = async () => {
    if (!adjustModalItem || !adjustQty) return;
    const delta = parseFloat(adjustQty);
    if (isNaN(delta) || delta === 0) {
      setAdjustError("يرجى إدخال كمية تعديل صالحة (غير صفرية)");
      return;
    }

    setIsSubmitting(true);
    setAdjustError(null);

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventoryItemId: adjustModalItem.id,
          qtyChange: delta,
          reason: adjustReason,
          notes: adjustNotes.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json?.error || "فشل تطبيق التعديل");
      }

      setAdjustModalItem(null);
      setAdjustQty("");
      setAdjustNotes("");
      setAdjustReason("تسوية جرد فعلي");

      // Reload inventory
      await fetchInventory();
    } catch (err: any) {
      console.error("[Apply Adjustment Error]:", err);
      setAdjustError(err?.message || "حدث خطأ أثناء تعديل المخزون");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-600" />
            <span>إدارة المخزون والمنتجات</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            متابعة أرصدة المستودعات، حركات الأصناف، وتنبيهات إعادة الطلب
          </p>
        </div>

        <button
          onClick={fetchInventory}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
          title="تحديث البيانات"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1">
          <span className="text-xs text-stone-500">إجمالي الأصناف بالمستودع</span>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100 font-mono">
            {loading ? (
              <div className="h-8 w-16 bg-stone-200 dark:bg-stone-800 animate-pulse rounded-md" />
            ) : (
              items.length
            )}
          </div>
          <span className="text-[11px] text-stone-400">إجمالي سجلات المخزون المسجلة</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1">
          <span className="text-xs text-stone-500">أصناف قاربت على النفاد (تنبيه)</span>
          <div className="text-2xl font-black text-red-500 font-mono flex items-center gap-2">
            {loading ? (
              <div className="h-8 w-16 bg-stone-200 dark:bg-stone-800 animate-pulse rounded-md" />
            ) : (
              <>
                <span>{lowStockCount}</span>
                {lowStockCount > 0 && <AlertTriangle className="w-5 h-5 text-red-500" />}
              </>
            )}
          </div>
          <span className="text-[11px] text-red-400">تتطلب إصدار أمر شراء توريد</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1">
          <span className="text-xs text-stone-500">القيمة التقديرية للمخزون</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {loading ? (
              <div className="h-8 w-28 bg-stone-200 dark:bg-stone-800 animate-pulse rounded-md" />
            ) : (
              formatCurrency(totalStockValue)
            )}
          </div>
          <span className="text-[11px] text-stone-400">سعر التكلفة الفعلي الإجمالي</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث عن صنف أو SKU أو مستودع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition ${
              lowStockFilter
                ? "bg-red-50 dark:bg-red-950/40 text-red-600 border-red-300 dark:border-red-800"
                : "bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>الأصناف المنخفضة فقط ({lowStockCount})</span>
          </button>
        </div>
      </div>

      {/* Error state alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-between text-xs text-red-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchInventory}
            className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Inventory Table Container */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        {loading ? (
          /* Loading Skeleton */
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                <tr>
                  <th className="py-3 px-4">الصنف / المنتج</th>
                  <th className="py-3 px-4">رمز الصنف</th>
                  <th className="py-3 px-4">المستودع</th>
                  <th className="py-3 px-4">الرصيد الفعلي</th>
                  <th className="py-3 px-4">حد إعادة الطلب</th>
                  <th className="py-3 px-4">تكلفة الوحدة (د.أ)</th>
                  <th className="py-3 px-4">القيمة الإجمالية</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">تعديل جرد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-40 mb-1" />
                      <div className="h-3 bg-stone-100 dark:bg-stone-850 rounded w-24" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-24" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-16" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-16" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-16" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-5 bg-stone-200 dark:bg-stone-800 rounded-full w-16" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-7 bg-stone-200 dark:bg-stone-800 rounded-lg w-16 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto text-stone-400">
              <Package className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
                {items.length === 0
                  ? "لا توجد أصناف في المخزون حالياً"
                  : "لا توجد نتائج مطابقة لخيارات البحث"}
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {items.length === 0
                  ? "يمكنك إضافة منتجات ومستودعات لتظهر أرصدتها هنا تلقائياً."
                  : "جرب تغيير مصطلح البحث أو إلغاء فلتر المواد المنخفضة."}
              </p>
            </div>
            {(search || lowStockFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setLowStockFilter(false);
                }}
                className="mt-2 px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-300 font-bold text-xs inline-flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            )}
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                <tr>
                  <th className="py-3 px-4">الصنف / المنتج</th>
                  <th className="py-3 px-4">رمز الصنف</th>
                  <th className="py-3 px-4">المستودع</th>
                  <th className="py-3 px-4">الرصيد الفعلي</th>
                  <th className="py-3 px-4">حد إعادة الطلب</th>
                  <th className="py-3 px-4">تكلفة الوحدة (د.أ)</th>
                  <th className="py-3 px-4">القيمة الإجمالية</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">تعديل جرد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filtered.map((item) => {
                  const isLow = item.isLowStock ?? item.qtyOnHand <= item.reorderPoint;
                  const unitCost = Number(item.product?.costPrice) || 0;
                  const totalValue = item.qtyOnHand * unitCost;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition"
                    >
                      <td className="py-3 px-4 font-bold text-stone-900 dark:text-stone-100">
                        <div>
                          <div>{item.product?.nameAr || "صنف بدون اسم"}</div>
                          {item.product?.category?.nameAr && (
                            <span className="text-[10px] font-normal text-stone-400">
                              {item.product.category.nameAr}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-500">
                        {item.product?.sku || "—"}
                      </td>
                      <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                        <span className="inline-flex items-center gap-1">
                          <WarehouseIcon className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>{item.warehouse?.nameAr || "المستودع الرئيسي"}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={isLow ? "text-red-500 text-sm" : "text-stone-900 dark:text-stone-100"}>
                          {item.qtyOnHand} {item.product?.unit || ""}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-500">
                        {item.reorderPoint} {item.product?.unit || ""}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {formatCurrency(unitCost)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {formatCurrency(totalValue)}
                      </td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-[10px] font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>تحت الحد</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>متوفر</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setAdjustModalItem(item);
                            setAdjustQty("");
                            setAdjustNotes("");
                            setAdjustReason("تسوية جرد فعلي");
                            setAdjustError(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-600 hover:text-white text-stone-700 dark:text-stone-300 font-bold text-[11px] transition inline-flex items-center gap-1"
                        >
                          <ArrowUpDown className="w-3 h-3" />
                          <span>تعديل</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Adjust Modal */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-amber-600" />
                <span>تعديل رصيد المخزون</span>
              </h3>
              <button
                onClick={() => setAdjustModalItem(null)}
                disabled={isSubmitting}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {adjustModalItem.product?.nameAr}
              </div>
              <div className="text-xs text-stone-500 flex items-center gap-2">
                <span className="font-mono">{adjustModalItem.product?.sku}</span>
                <span>•</span>
                <span>{adjustModalItem.warehouse?.nameAr || "المستودع الرئيسي"}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex justify-between items-center text-xs">
              <span className="text-stone-500">الرصيد الفعلي الحالي:</span>
              <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                {adjustModalItem.qtyOnHand} {adjustModalItem.product?.unit || ""}
              </span>
            </div>

            {adjustError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  كمية التعديل (أدخل + للزيادة أو - للنقصان):
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="مثال: +10 أو -2"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-mono text-stone-900 dark:text-stone-100 text-center focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
                {adjustQty && !isNaN(parseFloat(adjustQty)) && (
                  <div className="text-[11px] text-stone-500 mt-1.5 flex justify-between">
                    <span>الرصيد المتوقع بعد التعديل:</span>
                    <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                      {Math.max(0, adjustModalItem.qtyOnHand + parseFloat(adjustQty))}{" "}
                      {adjustModalItem.product?.unit || ""}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  سبب التعديل:
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                >
                  <option value="تسوية جرد فعلي">تسوية جرد فعلي</option>
                  <option value="استلام شحنة موردين">استلام شحنة موردين</option>
                  <option value="تالف / كسر">تالف / كسر</option>
                  <option value="تسوية عجز مخزون">تسوية عجز مخزون</option>
                  <option value="مرتجع عميل">مرتجع عميل</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  ملاحظات إضافية (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="رقم الفاتورة أو سبب التلف أو تفاصيل أخرى..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustModalItem(null)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleApplyAdjustment}
                disabled={isSubmitting || !adjustQty}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>تطبيق التعديل وحفظ السجل</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
