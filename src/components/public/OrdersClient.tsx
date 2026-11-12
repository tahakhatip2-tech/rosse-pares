"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  LogIn,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Truck,
  XCircle,
} from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/dates";

interface OrderItemDTO {
  id: string;
  productId: string;
  nameAr: string;
  nameEn: string;
  qty: number;
  unitPrice: number;
  total: number;
  product?: {
    images?: string[];
    unit?: string;
    isActive?: boolean;
  } | null;
}

interface OrderDTO {
  id: string;
  orderNumber: string;
  status: string;
  channel: string;
  deliveryType: string;
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  notes?: string | null;
  createdAt: string;
  branch?: { nameAr: string } | null;
  items: OrderItemDTO[];
}

const STATUS_META: Record<
  string,
  { label: string; color: string; step: number }
> = {
  PENDING: {
    label: "بانتظار التأكيد",
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    step: 1,
  },
  CONFIRMED: {
    label: "تم التأكيد",
    color: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    step: 2,
  },
  PREPARING: {
    label: "قيد التجهيز في المستودع",
    color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    step: 3,
  },
  READY: {
    label: "جاهز للاستلام / التسليم",
    color: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
    step: 4,
  },
  OUT_FOR_DELIVERY: {
    label: "في الطريق إليك",
    color: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40",
    step: 4,
  },
  COMPLETED: {
    label: "مكتمل بنجاح",
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    step: 5,
  },
  CANCELLED: {
    label: "ملغي",
    color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    step: 0,
  },
  REJECTED: {
    label: "مرفوض",
    color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    step: 0,
  },
  REFUNDED: {
    label: "مسترجع",
    color: "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30",
    step: 0,
  },
};

const PROGRESS_STEPS = [
  { step: 1, label: "الاستلام" },
  { step: 2, label: "التأكيد" },
  { step: 3, label: "التحضير" },
  { step: 4, label: "الجاهزية" },
  { step: 5, label: "التسليم" },
];

type FilterTab = "ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export function OrdersClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const addItem = useCartStore((s) => s.addItem);

  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(isLoggedIn);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  // Guest quick tracking state
  const [trackNumber, setTrackNumber] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<OrderDTO | null>(null);

  const fetchMyOrders = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/my", { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { orders: OrderDTO[] };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "تعذر تحميل الطلبات");
      }
      setOrders(json.data.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  async function handleTrackOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!trackNumber.trim() || !trackPhone.trim()) return;
    setTracking(true);
    setTrackError(null);
    setTrackedOrder(null);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: trackNumber.trim(),
          phone: trackPhone.trim(),
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { order: OrderDTO };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "لم يتم العثور على الطلب");
      }
      setTrackedOrder(json.data.order);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : "تعذر تتبع الطلب");
    } finally {
      setTracking(false);
    }
  }

  function handleReorder(order: OrderDTO) {
    for (const item of order.items) {
      addItem({
        id: item.productId,
        productId: item.productId,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        price: item.unitPrice,
        qty: item.qty,
        image: item.product?.images?.[0] || "/rozeparees.png",
        unit: item.product?.unit || "piece",
      });
    }
    setReorderedId(order.id);
    setTimeout(() => {
      setReorderedId((curr) => (curr === order.id ? null : curr));
    }, 2500);
  }

  const filteredOrders = orders.filter((o) => {
    if (filter === "ALL") return true;
    if (filter === "COMPLETED") return o.status === "COMPLETED";
    if (filter === "CANCELLED")
      return o.status === "CANCELLED" || o.status === "REJECTED" || o.status === "REFUNDED";
    return !["COMPLETED", "CANCELLED", "REJECTED", "REFUNDED"].includes(o.status);
  });

  return (
    <div dir="rtl" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-l from-[#1f150c] via-[#342111] to-amber-800 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <ClipboardList className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold">طلباتي</h1>
              <p className="text-xs sm:text-sm text-amber-100/85 mt-1">
                تابع حالة طلباتك الطازجة لحظة بلحظة أو أعد الطلب بنقرة واحدة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold transition shadow-md"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>تصفح المنيو</span>
            </Link>
            {isLoggedIn && (
              <button
                type="button"
                onClick={fetchMyOrders}
                title="تحديث الطلبات"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logged-in Orders Section */}
      {isLoggedIn ? (
        <div className="space-y-5">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "ALL", label: `الكل (${orders.length})` },
                {
                  key: "ACTIVE",
                  label: "الحالية والجارية",
                },
                { key: "COMPLETED", label: "المكتملة" },
                { key: "CANCELLED", label: "الملغاة" },
              ] as Array<{ key: FilterTab; label: string }>
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition ${filter === t.key
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-amber-500/40"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-sm font-bold text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="h-44 rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] animate-pulse"
                />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-10 text-center space-y-4">
              <Package className="w-12 h-12 text-amber-500/70 mx-auto" />
              <h2 className="text-lg font-extrabold text-[var(--color-text)]">
                لا توجد طلبات في هذا القسم حتى الآن
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
                اكتشف تشكيلة الدهانات والجبس بورد وبديل الخشب والرخام ومواد العزل واطلب احتياجات مشروعك بسهولة.
              </p>
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-extrabold transition shadow-md"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>اطلب الآن</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  reordered={reorderedId === order.id}
                  onReorder={() => handleReorder(order)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Guest Quick Tracking + Login Prompt */
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Quick Order Tracker */}
          <div className="rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold">تتبع طلبك برقم الطلب</h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  هل طلبت كضيف؟ أدخل رقم الطلب ورقم الهاتف لعرض حالته فوراً
                </p>
              </div>
            </div>

            <form onSubmit={handleTrackOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">رقم الطلب</label>
                <input
                  type="text"
                  required
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  placeholder="مثال: ORD-20261111-0001"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">رقم الهاتف المسجل بالطلب</label>
                <input
                  type="tel"
                  required
                  value={trackPhone}
                  onChange={(e) => setTrackPhone(e.target.value)}
                  placeholder="079XXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
                />
              </div>
              {trackError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {trackError}
                </p>
              )}
              <button
                type="submit"
                disabled={tracking}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-extrabold transition shadow-sm"
              >
                {tracking ? "جاري البحث..." : "تتبع الطلب الآن"}
              </button>
            </form>
          </div>

          {/* Login Prompt Card */}
          <div className="rounded-3xl bg-[#f7efe1] dark:bg-stone-900 border border-amber-900/10 dark:border-amber-500/20 p-6 sm:p-8 space-y-4 text-center">
            <LogIn className="w-11 h-11 text-amber-600 mx-auto" />
            <h2 className="text-lg font-extrabold">سجّل دخولك لعرض جميع طلباتك</h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
              عند تسجيل الدخول ستتمكن من مشاهدة سجل جميع طلباتك السابقة والحالية، جمع نقاط الولاء، وإعادة الطلب بضغطة واحدة.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/login?callbackUrl=/orders"
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold transition shadow-md"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="px-6 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-amber-500 text-xs font-extrabold transition"
              >
                إنشاء حساب جديد
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tracked Guest Order Result */}
      {trackedOrder && (
        <div className="pt-2">
          <OrderCard
            order={trackedOrder}
            reordered={reorderedId === trackedOrder.id}
            onReorder={() => handleReorder(trackedOrder)}
          />
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  reordered,
  onReorder,
}: {
  order: OrderDTO;
  reordered: boolean;
  onReorder: () => void;
}) {
  const meta = STATUS_META[order.status] ?? {
    label: order.status,
    color: "bg-stone-500/15 text-stone-700 border-stone-500/30",
    step: 1,
  };

  const whatsappText = encodeURIComponent(
    `مرحباً روز باريس لمواد البناء والديكور، لدي استفسار بخصوص طلبي رقم: ${order.orderNumber}`
  );

  return (
    <article className="rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="p-4 sm:p-5 bg-[var(--color-bg-muted)]/60 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm sm:text-base font-extrabold text-[var(--color-text)] font-mono">
              {order.orderNumber}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.color}`}
            >
              {meta.step === 0 ? (
                <XCircle className="w-3.5 h-3.5" />
              ) : meta.step === 5 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              <span>{meta.label}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span>{formatDateTime(order.createdAt)}</span>
            {order.branch?.nameAr && (
              <span className="inline-flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-amber-600" />
                <span>{order.branch.nameAr}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              {order.deliveryType === "DELIVERY" ? (
                <>
                  <Truck className="w-3.5 h-3.5 text-amber-600" />
                  <span>توصيل للمنزل</span>
                </>
              ) : (
                <>
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  <span>استلام من الفرع</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="text-left">
          <span className="text-[11px] text-[var(--color-text-muted)] block">الإجمالي</span>
          <span className="text-lg font-extrabold text-amber-700 dark:text-amber-400">
            {formatCurrency(order.total)}
          </span>
        </div>
      </div>

      {/* Progress Stepper (when active / completed) */}
      {meta.step > 0 && (
        <div className="px-4 sm:px-6 pt-4 pb-2">
          <div className="grid grid-cols-5 gap-1.5">
            {PROGRESS_STEPS.map((st) => {
              const reached = meta.step >= st.step;
              return (
                <div key={st.step} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`h-1.5 w-full rounded-full transition-colors ${reached
                      ? "bg-amber-600 dark:bg-amber-500"
                      : "bg-stone-200 dark:bg-stone-800"
                      }`}
                  />
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold text-center ${reached
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-stone-400 dark:text-stone-500"
                      }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="p-4 sm:p-5 space-y-2.5">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#f7efe1] dark:bg-stone-800 border border-[var(--color-border)] shrink-0">
                <img
                  src={item.product?.images?.[0] || "/rozeparees.png"}
                  alt={item.nameAr}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <Link
                  href={`/products/${item.productId}`}
                  className="text-xs sm:text-sm font-bold text-[var(--color-text)] hover:text-amber-600 truncate block"
                >
                  {item.nameAr}
                </Link>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  الكمية: {item.qty} × {formatCurrency(item.unitPrice)}
                </p>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-extrabold shrink-0">
              {formatCurrency(item.total)}
            </span>
          </div>
        ))}
      </div>

      {/* Card Footer Actions */}
      <div className="px-4 sm:px-5 pb-4 pt-1 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReorder}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition ${reordered
              ? "bg-emerald-600 text-white"
              : "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{reordered ? "✓ أُضيفت الأصناف للسلة" : "إعادة الطلب"}</span>
          </button>

          {reordered && (
            <Link
              href="/checkout"
              className="px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
            >
              إتمام الشراء الآن ←
            </Link>
          )}
        </div>

        <a
          href={`https://wa.me/962770585313?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold transition"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>استفسار واتساب</span>
        </a>
      </div>
    </article>
  );
}

