import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/currency";
import { startOfTodayTZ, endOfTodayTZ } from "@/lib/dates";
import {
  ShoppingBag, TrendingUp, Package, Users,
  AlertTriangle, DollarSign, Clock,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "لوحة التحكم" };

async function getDashboardData(branchId: string | null) {
  const todayStart = startOfTodayTZ();
  const todayEnd = endOfTodayTZ();

  const branchFilter = branchId ? { branchId } : {};

  const [
    todaySalesAgg,
    ordersToday,
    pendingOrders,
    lowStockCount,
    pendingPOs,
    topProducts,
    recentOrders,
  ] = await Promise.all([
    // Today's revenue
    prisma.salesOrder.aggregate({
      where: {
        ...branchFilter,
        status: { in: ["COMPLETED", "CONFIRMED", "PREPARING", "READY"] },
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      _sum: { total: true },
      _count: true,
    }),
    // Order count today
    prisma.salesOrder.count({
      where: {
        ...branchFilter,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Pending orders needing action
    prisma.salesOrder.count({
      where: { ...branchFilter, status: "PENDING" },
    }),
    // Low stock items
    prisma.inventoryItem.count({
      where: {
        qtyOnHand: { lte: prisma.inventoryItem.fields.reorderPoint },
      },
    }),
    // Pending purchase orders
    prisma.purchaseOrder.count({
      where: { status: { in: ["SUBMITTED", "APPROVED"] } },
    }),
    // Top selling products today
    prisma.salesOrderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          ...branchFilter,
          createdAt: { gte: todayStart, lte: todayEnd },
          status: { not: "CANCELLED" },
        },
      },
      _sum: { qty: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
    // Recent orders
    prisma.salesOrder.findMany({
      where: branchFilter,
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        channel: true,
        createdAt: true,
        customer: { select: { nameAr: true } },
        merchant: { select: { businessName: true } },
      },
    }),
  ]);

  return {
    todayRevenue: Number(todaySalesAgg._sum.total ?? 0),
    todayOrders: ordersToday,
    pendingOrders,
    lowStockCount,
    pendingPOs,
    topProducts,
    recentOrders,
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:    { label: "انتظار", color: "badge-warning" },
  CONFIRMED:  { label: "مؤكد",  color: "badge-info" },
  PREPARING:  { label: "يُحضَّر", color: "badge-info" },
  READY:      { label: "جاهز",  color: "badge-success" },
  COMPLETED:  { label: "مكتمل", color: "badge-success" },
  CANCELLED:  { label: "ملغى",  color: "badge-error" },
  REFUNDED:   { label: "مُسترجع", color: "badge-muted" },
};

const CHANNEL_LABELS: Record<string, string> = {
  ONLINE:    "🌐 أونلاين",
  POS:       "🏪 POS",
  WHOLESALE: "🏢 جملة",
  B2B:       "🤝 B2B",
};

export default async function AdminDashboard() {
  const session = await auth();
  const data = await getDashboardData(session?.user?.branchId ?? null);

  const kpis = [
    {
      id: "kpi-revenue",
      label: "إيرادات اليوم",
      value: formatCurrency(data.todayRevenue),
      icon: DollarSign,
      color: "#c8860a",
      bg: "#fef3c7",
      trend: null,
    },
    {
      id: "kpi-orders",
      label: "طلبات اليوم",
      value: data.todayOrders.toString(),
      icon: ShoppingBag,
      color: "#2563eb",
      bg: "#dbeafe",
      trend: null,
    },
    {
      id: "kpi-pending",
      label: "طلبات بانتظار",
      value: data.pendingOrders.toString(),
      icon: Clock,
      color: "#d97706",
      bg: "#fef9c3",
      trend: data.pendingOrders > 10 ? "high" : null,
    },
    {
      id: "kpi-lowstock",
      label: "منتجات نقص مخزون",
      value: data.lowStockCount.toString(),
      icon: AlertTriangle,
      color: "#dc2626",
      bg: "#fee2e2",
      trend: data.lowStockCount > 0 ? "alert" : null,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            لوحة التحكم
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            مرحباً {session?.user?.name} — نظرة عامة على أعمالك اليوم
          </p>
        </div>
        <div className="text-sm text-[var(--color-text-subtle)]">
          {new Date().toLocaleDateString("ar-JO", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.id} id={kpi.id} className="card flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: kpi.bg }}
            >
              <kpi.icon className="w-6 h-6" style={{ color: kpi.color }} />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)] font-medium">
                {kpi.label}
              </p>
              <p className="text-2xl font-bold text-[var(--color-text)] mt-0.5">
                {kpi.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">
          إجراءات سريعة
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "/pos/terminal", label: "فتح نقطة البيع", icon: "🏪" },
            { href: "/admin/orders", label: "إدارة الطلبات", icon: "📦" },
            { href: "/admin/inventory/adjust", label: "تعديل المخزون", icon: "🔧" },
            { href: "/admin/production/new", label: "أمر إنتاج جديد", icon: "🍞" },
            { href: "/admin/procurement/new", label: "أمر شراء جديد", icon: "🛒" },
            { href: "/admin/reports", label: "التقارير", icon: "📊" },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-text)] rounded-lg text-sm font-medium transition-all duration-200"
            >
              <span>{action.icon}</span>
              {action.label}
            </a>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            آخر الطلبات
          </h2>
          <a
            href="/admin/orders"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            عرض الكل
          </a>
        </div>

        {data.recentOrders.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-subtle)]">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>لا توجد طلبات بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>القناة</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => {
                  const status = STATUS_LABELS[order.status] ?? {
                    label: order.status,
                    color: "badge-muted",
                  };
                  return (
                    <tr key={order.id}>
                      <td>
                        <a
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-xs text-[var(--color-primary)] hover:underline"
                        >
                          {order.orderNumber}
                        </a>
                      </td>
                      <td className="text-sm">
                        {order.customer?.nameAr ??
                          order.merchant?.businessName ??
                          "زائر"}
                      </td>
                      <td className="text-xs">
                        {CHANNEL_LABELS[order.channel] ?? order.channel}
                      </td>
                      <td className="font-semibold text-sm">
                        {formatCurrency(Number(order.total))}
                      </td>
                      <td>
                        <span className={`badge ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="text-xs text-[var(--color-text-subtle)]">
                        {new Date(order.createdAt).toLocaleTimeString("ar-JO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alerts */}
      {(data.pendingOrders > 0 || data.lowStockCount > 0 || data.pendingPOs > 0) && (
        <div className="card border-amber-200 bg-amber-50">
          <h2 className="text-base font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> تنبيهات تحتاج انتباهك
          </h2>
          <div className="space-y-2">
            {data.pendingOrders > 0 && (
              <a href="/admin/orders?status=PENDING" className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900">
                <span>🔔</span>
                <span>{data.pendingOrders} طلب بانتظار التأكيد</span>
              </a>
            )}
            {data.lowStockCount > 0 && (
              <a href="/admin/inventory?filter=low_stock" className="flex items-center gap-2 text-sm text-red-700 hover:text-red-900">
                <span>⚠️</span>
                <span>{data.lowStockCount} منتج وصل لنقطة إعادة الطلب</span>
              </a>
            )}
            {data.pendingPOs > 0 && (
              <a href="/admin/procurement" className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900">
                <span>📋</span>
                <span>{data.pendingPOs} أمر شراء يحتاج موافقة</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
