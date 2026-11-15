"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/dates";
import {
  ShoppingBag,
  Truck,
  Store,
  Eye,
  Search,
  Package,
  PackageX,
  RefreshCw,
  AlertCircle,
  Phone,
  User,
  Layers,
  MapPin,
  X,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  nameAr: string;
  nameEn?: string | null;
  qty: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  total: number;
}

export interface OrderBranch {
  id: string;
  nameAr: string;
  nameEn?: string;
}

export interface OrderCustomer {
  id: string;
  user?: {
    id: string;
    email: string;
  } | null;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  branchId: string;
  channel: "ONLINE" | "POS" | "B2B" | "WHOLESALE";
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "OUT_FOR_DELIVERY"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED"
    | "REFUNDED";
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  paidAmount: number;
  notes?: string | null;
  deliveryType: "PICKUP" | "DELIVERY" | string;
  snapshotData?: any;
  cancelledReason?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  branch?: OrderBranch | null;
  customer?: OrderCustomer | null;
}

interface ParsedCustomerDetails {
  name: string;
  phone: string;
  address: string;
  itemsCount: number;
}

function parseOrderSnapshot(order: SalesOrder): ParsedCustomerDetails {
  let snapshot: any = {};
  if (order.snapshotData) {
    if (typeof order.snapshotData === "string") {
      try {
        snapshot = JSON.parse(order.snapshotData);
      } catch {
        snapshot = {};
      }
    } else if (typeof order.snapshotData === "object") {
      snapshot = order.snapshotData;
    }
  }

  const name =
    snapshot.customerName ||
    (order.customer?.user?.email ? order.customer.user.email.split("@")[0] : null) ||
    "عميل مباشر";
  const phone = snapshot.customerPhone || "—";
  const address = snapshot.customerAddress || "";
  const itemsCount = order.items?.length ?? (Array.isArray(snapshot.items) ? snapshot.items.length : 0);

  return { name, phone, address, itemsCount };
}

type ChannelFilter = "ALL" | "ONLINE" | "POS" | "B2B" | "WHOLESALE";
type StatusFilter =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

const CHANNEL_TABS: { id: ChannelFilter; label: string }[] = [
  { id: "ALL", label: "جميع القنوات" },
  { id: "ONLINE", label: "المتجر الإلكتروني" },
  { id: "POS", label: "صالة المبيعات POS" },
  { id: "B2B", label: "عقود وتوريد B2B" },
  { id: "WHOLESALE", label: "تجارة الجملة" },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "الكل" },
  { id: "PENDING", label: "قيد الانتظار" },
  { id: "CONFIRMED", label: "مؤكد" },
  { id: "PREPARING", label: "تجهيز وتحميل" },
  { id: "READY", label: "جاهز للتسليم" },
  { id: "OUT_FOR_DELIVERY", label: "في الطريق" },
  { id: "COMPLETED", label: "مكتمل" },
  { id: "CANCELLED", label: "ملغي" },
];

export default function AdminSalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedChannel, setSelectedChannel] = useState<ChannelFilter>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedOrderModal, setSelectedOrderModal] = useState<SalesOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch orders from API
  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const res = await fetch("/api/orders?limit=50");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "فشل جلب بيانات الطلبات");
      }

      const items: SalesOrder[] = json.data?.items ?? json.items ?? [];
      setOrders(items);
    } catch (err: any) {
      console.error("[Orders Fetch Error]:", err);
      setError(err.message || "حدث خطأ أثناء تحميل الطلبات");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Update order status via PATCH /api/orders/[id]
  const updateOrderStatus = async (id: string, newStatus: SalesOrder["status"]) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "فشل تحديث حالة الطلب");
      }

      const updated: SalesOrder = json.data;

      // Update in orders list
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...updated, status: newStatus } : o))
      );

      // Update in modal if open
      if (selectedOrderModal?.id === id) {
        setSelectedOrderModal((prev) =>
          prev ? { ...prev, ...updated, status: newStatus } : null
        );
      }
    } catch (err: any) {
      console.error("[Order Status Update Error]:", err);
      alert(err.message || "فشل تحديث حالة الطلب");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtered orders list
  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchChannel =
        selectedChannel === "ALL" || order.channel === selectedChannel;
      const matchStatus =
        selectedStatus === "ALL" || order.status === selectedStatus;

      const { name, phone } = parseOrderSnapshot(order);
      const searchLower = search.trim().toLowerCase();
      const matchSearch =
        !searchLower ||
        order.orderNumber.toLowerCase().includes(searchLower) ||
        name.toLowerCase().includes(searchLower) ||
        phone.includes(searchLower);

      return matchChannel && matchStatus && matchSearch;
    });
  }, [orders, selectedChannel, selectedStatus, search]);

  const getStatusBadge = (status: SalesOrder["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[10px] inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>قيد الانتظار</span>
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold text-[10px] inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>مؤكد</span>
          </span>
        );
      case "PREPARING":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 font-bold text-[10px] animate-pulse inline-flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span>تجهيز وتحميل</span>
          </span>
        );
      case "READY":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 font-bold text-[10px] inline-flex items-center gap-1">
            <Layers className="w-3 h-3" />
            <span>جاهز للاستلام/الشحن</span>
          </span>
        );
      case "OUT_FOR_DELIVERY":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold text-[10px] inline-flex items-center gap-1">
            <Truck className="w-3 h-3" />
            <span>في الطريق</span>
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>مكتمل ومسلّم</span>
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold text-[10px]">
            ملغي
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold text-[10px]">
            مرفوض
          </span>
        );
      case "REFUNDED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-[10px]">
            مسترد
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[10px]">
            {status}
          </span>
        );
    }
  };

  const getChannelBadge = (channel: SalesOrder["channel"]) => {
    switch (channel) {
      case "ONLINE":
        return (
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
            أونلاين
          </span>
        );
      case "POS":
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
            كاشير POS
          </span>
        );
      case "B2B":
        return (
          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
            توريد B2B
          </span>
        );
      case "WHOLESALE":
        return (
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
            تجارة جملة
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-stone-500/10 text-stone-600 text-[10px] font-bold">
            {channel}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-600" />
            <span>إدارة المبيعات والطلبيات الحية</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            متابعة وتجهيز طلبيات مواد البناء والتشطيب والتوريد من المتجر، الصالة وعقود المشاريع B2B
          </p>
        </div>

        <button
          onClick={() => fetchOrders(true)}
          disabled={isRefreshing || isLoading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-600" : ""}`} />
          <span>تحديث الطلبات</span>
        </button>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between text-xs text-red-700 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchOrders()}
            className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 font-bold hover:bg-red-200 transition"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Channel Filters Tabs & Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Channel Tabs: ALL / ONLINE / POS / B2B / WHOLESALE */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {CHANNEL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedChannel(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedChannel === tab.id
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث برقم الطلب، العميل، أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* Secondary Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-stone-100 dark:border-stone-800/80 scrollbar-none">
          <span className="text-[11px] font-bold text-stone-400 ml-2 whitespace-nowrap">حالة الطلب:</span>
          {STATUS_FILTERS.map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                selectedStatus === st.id
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                  : "bg-transparent text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table & Skeletons */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الطلب</th>
                <th className="py-3 px-4">القناة</th>
                <th className="py-3 px-4">العميل والتواصل</th>
                <th className="py-3 px-4">نوع الاستلام</th>
                <th className="py-3 px-4">الأصناف</th>
                <th className="py-3 px-4">المبلغ الإجمالي</th>
                <th className="py-3 px-4">تاريخ الطلب</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {/* Loading Skeleton */}
              {isLoading && (
                <>
                  {[...Array(6)].map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-28 bg-stone-200 dark:bg-stone-800 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-16 bg-stone-200 dark:bg-stone-800 rounded" />
                      </td>
                      <td className="py-3.5 px-4 space-y-1.5">
                        <div className="h-3.5 w-32 bg-stone-200 dark:bg-stone-800 rounded" />
                        <div className="h-3 w-20 bg-stone-100 dark:bg-stone-800/60 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-16 bg-stone-200 dark:bg-stone-800 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-12 bg-stone-200 dark:bg-stone-800 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-20 bg-stone-200 dark:bg-stone-800 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 w-24 bg-stone-200 dark:bg-stone-800 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-20 bg-stone-200 dark:bg-stone-800 rounded-full" />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="h-6 w-14 bg-stone-200 dark:bg-stone-800 rounded-lg mx-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {/* Real Orders */}
              {!isLoading &&
                filtered.map((order) => {
                  const customer = parseOrderSnapshot(order);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">{getChannelBadge(order.channel)}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900 dark:text-stone-100">
                          {customer.name}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          {customer.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-300">
                          {order.deliveryType === "DELIVERY" ? (
                            <>
                              <Truck className="w-3.5 h-3.5 text-amber-600" />
                              <span>توصيل ونقل</span>
                            </>
                          ) : (
                            <>
                              <Store className="w-3.5 h-3.5 text-stone-500" />
                              <span>استلام فرع</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {customer.itemsCount} أصناف
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-stone-400 whitespace-nowrap">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedOrderModal(order)}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-600 hover:text-white text-stone-700 dark:text-stone-300 font-bold text-[11px] transition inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Eye className="w-3 h-3" />
                          <span>عرض</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {!isLoading && filtered.length === 0 && (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
              <PackageX className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                لا توجد طلبات مطابقة
              </h3>
              <p className="text-stone-400 text-xs max-w-sm">
                لم يتم العثور على أي طلبيات تطابق معايير الفلترة المحددة أو كلمة البحث.
              </p>
            </div>
            {(selectedChannel !== "ALL" || selectedStatus !== "ALL" || search) && (
              <button
                onClick={() => {
                  setSelectedChannel("ALL");
                  setSelectedStatus("ALL");
                  setSearch("");
                }}
                className="mt-2 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition"
              >
                إلغاء جميع الفلاتر
              </button>
            )}
          </div>
        )}
      </div>

      {/* Order Details & Status Updater Modal */}
      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                    طلب رقم: {selectedOrderModal.orderNumber}
                  </h3>
                  {getChannelBadge(selectedOrderModal.channel)}
                </div>
                <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-1">
                  <span>{formatDateTime(selectedOrderModal.createdAt)}</span>
                  {selectedOrderModal.branch?.nameAr && (
                    <>
                      <span>•</span>
                      <span>الفرع: {selectedOrderModal.branch.nameAr}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderModal(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details Box */}
            {(() => {
              const details = parseOrderSnapshot(selectedOrderModal);
              return (
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-stone-400 shrink-0" />
                    <div>
                      <span className="text-stone-400 block text-[10px]">العميل:</span>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {details.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                    <div>
                      <span className="text-stone-400 block text-[10px]">رقم الهاتف:</span>
                      <span className="font-mono text-stone-900 dark:text-stone-100">
                        {details.phone}
                      </span>
                    </div>
                  </div>

                  {details.address && (
                    <div className="sm:col-span-2 flex items-start gap-2 pt-1 border-t border-stone-200 dark:border-stone-800">
                      <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-stone-400 block text-[10px]">عنوان التسليم:</span>
                        <span className="text-stone-700 dark:text-stone-300">
                          {details.address}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Status Updater */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  تحديث حالة الطلب:
                </label>
                {updatingId === selectedOrderModal.id && (
                  <span className="text-[11px] text-amber-600 flex items-center gap-1 font-semibold">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>جاري التحديث...</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(
                  [
                    { id: "PENDING", label: "انتظار" },
                    { id: "CONFIRMED", label: "تأكيد" },
                    { id: "PREPARING", label: "تجهيز وتحميل" },
                    { id: "READY", label: "جاهز" },
                    { id: "OUT_FOR_DELIVERY", label: "في الطريق" },
                    { id: "COMPLETED", label: "مكتمل" },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    disabled={updatingId === selectedOrderModal.id}
                    onClick={() => updateOrderStatus(selectedOrderModal.id, st.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition text-center disabled:opacity-50 ${
                      selectedOrderModal.status === st.id
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Cancel Button Option */}
              {selectedOrderModal.status !== "CANCELLED" && (
                <div className="pt-1 text-left">
                  <button
                    disabled={updatingId === selectedOrderModal.id}
                    onClick={() => {
                      if (confirm("هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟")) {
                        updateOrderStatus(selectedOrderModal.id, "CANCELLED");
                      }
                    }}
                    className="text-[11px] text-red-600 hover:text-red-700 dark:text-red-400 font-bold transition hover:underline"
                  >
                    إلغاء الطلب بالكامل
                  </button>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-3 space-y-2 max-h-52 overflow-y-auto">
              <span className="text-[11px] font-bold text-stone-500 block">
                قائمة مواد البناء والأصناف المطلوبة:
              </span>
              {selectedOrderModal.items && selectedOrderModal.items.length > 0 ? (
                selectedOrderModal.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex justify-between items-center text-xs py-1.5 border-b border-stone-100 dark:border-stone-800/60 last:border-0"
                  >
                    <div>
                      <span className="font-semibold text-stone-900 dark:text-stone-100 block">
                        {it.nameAr}
                      </span>
                      {it.nameEn && (
                        <span className="text-[10px] text-stone-400 block">{it.nameEn}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-stone-500">{it.qty} ×</span>
                      <span className="text-stone-500">{formatCurrency(it.unitPrice)}</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {formatCurrency(it.total)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-stone-400 text-xs py-2 text-center">
                  لا توجد تفاصيل أصناف متاحة لهذا الطلب
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{formatCurrency(selectedOrderModal.subtotal)}</span>
              </div>
              {selectedOrderModal.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>الخصم:</span>
                  <span className="font-mono">
                    -{formatCurrency(selectedOrderModal.discountAmount)}
                  </span>
                </div>
              )}
              {selectedOrderModal.taxAmount > 0 && (
                <div className="flex justify-between text-stone-500">
                  <span>ضريبة المبيعات:</span>
                  <span className="font-mono">{formatCurrency(selectedOrderModal.taxAmount)}</span>
                </div>
              )}
              {selectedOrderModal.deliveryFee > 0 && (
                <div className="flex justify-between text-stone-500">
                  <span>رسوم التوصيل:</span>
                  <span className="font-mono">{formatCurrency(selectedOrderModal.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm pt-2 border-t border-stone-200 dark:border-stone-700 font-bold">
                <span className="text-stone-900 dark:text-stone-100">المجموع الإجمالي:</span>
                <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                  {formatCurrency(selectedOrderModal.total)}
                </span>
              </div>
            </div>

            {/* Notes if available */}
            {selectedOrderModal.notes && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-300">
                <span className="font-bold block mb-0.5">ملاحظات الطلب:</span>
                <span>{selectedOrderModal.notes}</span>
              </div>
            )}

            <button
              onClick={() => setSelectedOrderModal(null)}
              className="w-full py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
