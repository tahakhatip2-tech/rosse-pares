"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/currency";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  Eye,
  Filter,
  Search,
  Building2,
  DollarSign,
  X,
} from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  channel: "ONLINE" | "POS" | "B2B";
  deliveryType: "PICKUP" | "DELIVERY";
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  total: number;
  itemsCount: number;
  time: string;
  items: { nameAr: string; qty: number; price: number }[];
}

const INITIAL_ORDERS: Order[] = [
  {
    id: "ord-1",
    orderNumber: "ORD-20261013-0001",
    customerName: "أحمد القضاة",
    customerPhone: "0798123456",
    channel: "ONLINE",
    deliveryType: "DELIVERY",
    status: "PREPARING",
    total: 16.74,
    itemsCount: 4,
    time: "منذ 12 دقيقة",
    items: [
      { nameAr: "دهان بلاستيك مطفي داخلي (18 لتر)", qty: 2, price: 32.0 },
      { nameAr: "لوح جبس بورد أخضر مقاوم للرطوبة", qty: 4, price: 4.5 },
      { nameAr: "غراء بورسلان قوي C2TE (25 كغم)", qty: 3, price: 6.5 },
    ],
  },
  {
    id: "ord-2",
    orderNumber: "POS-981240",
    customerName: "عميل معرض مباشر (كاشير)",
    customerPhone: "—",
    channel: "POS",
    deliveryType: "PICKUP",
    status: "COMPLETED",
    total: 24.5,
    itemsCount: 2,
    time: "منذ 25 دقيقة",
    items: [
      { nameAr: "ألواح بديل الخشب WPC ديكوري", qty: 2, price: 11.5 },
    ],
  },
  {
    id: "ord-3",
    orderNumber: "B2B-20261013-0012",
    customerName: "شركة الإعمار للمقاولات — عمّان",
    customerPhone: "0770585313",
    channel: "B2B",
    deliveryType: "DELIVERY",
    status: "PENDING",
    total: 420.0,
    itemsCount: 80,
    time: "منذ 40 دقيقة",
    items: [
      { nameAr: "لوح جبس بورد أخضر مقاوم للرطوبة (كميات مقاولين)", qty: 50, price: 3.9 },
      { nameAr: "غراء بورسلان وسيراميك مرن 25 كغم", qty: 30, price: 5.5 },
    ],
  },
  {
    id: "ord-4",
    orderNumber: "ORD-20261013-0002",
    customerName: "سارة النجار",
    customerPhone: "0796112233",
    channel: "ONLINE",
    deliveryType: "PICKUP",
    status: "READY",
    total: 20.88,
    itemsCount: 1,
    time: "منذ 1 ساعة",
    items: [
      { nameAr: "كيكة شوكولاتة فدج فاخرة", qty: 1, price: 18.0 },
    ],
  },
];

export default function AdminSalesOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedOrderModal, setSelectedOrderModal] = useState<Order | null>(null);

  const filtered = orders.filter((o) => {
    const matchStatus = selectedStatus === "ALL" || o.status === selectedStatus;
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.includes(search) ||
      o.customerPhone.includes(search);
    return matchStatus && matchSearch;
  });

  const updateOrderStatus = (id: string, newStatus: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
    if (selectedOrderModal?.id === id) {
      setSelectedOrderModal((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "PENDING":
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[10px]">قيد الانتظار</span>;
      case "PREPARING":
        return <span className="px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 font-bold text-[10px] animate-pulse">جاري التحضير بالفرن</span>;
      case "READY":
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 font-bold text-[10px]">جاهز للاستلام/التوصيل</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">مكتمل ومسلّم</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold text-[10px]">ملغي</span>;
    }
  };

  const getChannelBadge = (channel: Order["channel"]) => {
    switch (channel) {
      case "ONLINE":
        return <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold">أونلاين</span>;
      case "POS":
        return <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">كاشير POS</span>;
      case "B2B":
        return <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 text-[10px] font-bold">توريد B2B</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-600" />
            <span>إدارة المبيعات والطلبات الحية</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            متابعة حالة الطلبات الواردة من المتجر الإلكتروني، الصالة، وعقود التوريد B2B
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "جميع الطلبات" },
            { id: "PENDING", label: "قيد الانتظار" },
            { id: "PREPARING", label: "بالفرن / تحضير" },
            { id: "READY", label: "جاهزة" },
            { id: "COMPLETED", label: "مكتملة" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedStatus === tab.id
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث برقم الطلب أو اسم العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الطلب</th>
                <th className="py-3 px-4">القناة</th>
                <th className="py-3 px-4">العميل والتواصل</th>
                <th className="py-3 px-4">الاستلام</th>
                <th className="py-3 px-4">الأصناف</th>
                <th className="py-3 px-4">المبلغ الإجمالي</th>
                <th className="py-3 px-4">الوقت</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition"
                >
                  <td className="py-3 px-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                    {order.orderNumber}
                  </td>
                  <td className="py-3 px-4">{getChannelBadge(order.channel)}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-stone-900 dark:text-stone-100">
                      {order.customerName}
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono">{order.customerPhone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-300">
                      {order.deliveryType === "DELIVERY" ? (
                        <>
                          <Truck className="w-3.5 h-3.5 text-amber-600" />
                          <span>توصيل</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-3.5 h-3.5 text-stone-500" />
                          <span>استلام</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">{order.itemsCount} أصناف</td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-stone-400">{order.time}</td>
                  <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedOrderModal(order)}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-600 hover:text-white text-stone-700 dark:text-stone-300 font-bold text-[11px] transition inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>عرض</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details & Status Updater Modal */}
      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  تفاصيل الطلب: {selectedOrderModal.orderNumber}
                </h3>
                <span className="text-[11px] text-stone-400">
                  العميل: {selectedOrderModal.customerName} ({selectedOrderModal.customerPhone})
                </span>
              </div>
              <button
                onClick={() => setSelectedOrderModal(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Status Changers */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                تحديث حالة الطلب:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["PENDING", "PREPARING", "READY", "COMPLETED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => updateOrderStatus(selectedOrderModal.id, st)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                      selectedOrderModal.status === st
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100"
                    }`}
                  >
                    {st === "PENDING" && "انتظار"}
                    {st === "PREPARING" && "بالفرن"}
                    {st === "READY" && "جاهز"}
                    {st === "COMPLETED" && "مكتمل"}
                  </button>
                ))}
              </div>
            </div>

            {/* Items list */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
              <span className="text-[11px] font-bold text-stone-500 block">قائمة الأصناف المحضرة:</span>
              {selectedOrderModal.items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-xs py-1 border-b border-stone-100 dark:border-stone-800/60"
                >
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {it.nameAr}
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-stone-500">{it.qty}×</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      {formatCurrency(it.price * it.qty)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="flex justify-between items-center text-xs pt-2 border-t border-stone-200 dark:border-stone-800">
              <span className="text-stone-500">الإجمالي المستحق:</span>
              <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                {formatCurrency(selectedOrderModal.total)}
              </span>
            </div>

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
