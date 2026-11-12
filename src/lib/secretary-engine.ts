import {
  ExpenseCategory,
  MovementType,
  OrderStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { auditLog, type ApiContext } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/dates";
import { hasPermission, PERMISSIONS, type Permission } from "@/lib/permissions";
import {
  getSecretarySettings,
  isRoleAllowedForSecretary,
  type SecretarySettings,
} from "@/lib/secretary-settings";

export interface SecretaryKpiCard {
  label: string;
  value: string;
  hint?: string;
  tone?: "amber" | "emerald" | "rose" | "sky";
}

export interface SecretaryTable {
  title: string;
  columns: string[];
  rows: string[][];
}

export interface SecretaryLink {
  label: string;
  href: string;
}

export type SecretaryActionType =
  | "UPDATE_ORDER_STATUS"
  | "UPDATE_PRODUCT_STATUS"
  | "UPDATE_PRODUCT_PRICE"
  | "ADJUST_INVENTORY"
  | "CREATE_NEWS_POST"
  | "CREATE_EXPENSE";

export interface PendingActionProposal {
  type: SecretaryActionType;
  title: string;
  summary: string;
  targetLabel: string;
  oldValueLabel: string;
  newValueLabel: string;
  severity: "normal" | "warning";
  payload: Record<string, unknown>;
}

export interface SecretaryChatResponse {
  reply: string;
  kpis?: SecretaryKpiCard[];
  table?: SecretaryTable;
  links?: SecretaryLink[];
  pendingAction?: PendingActionProposal;
  executedNotice?: string;
  usedGemini?: boolean;
}

export interface ExecutivePulse {
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  lowStockCount: number;
  dailyTarget: number;
  targetPercent: number;
}

interface SnapshotData {
  generatedAt: string;
  pulse: ExecutivePulse;
  sales?: {
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    todayOrders: number;
    monthOrders: number;
    pendingOrders: number;
    preparingOrders: number;
    readyOrders: number;
    cancelledMonth: number;
    byChannel: Array<{ channel: string; count: number; total: number }>;
    topProducts: Array<{ nameAr: string; qty: number; total: number }>;
    recentOrders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      channel: string;
      total: number;
      customerLabel: string;
      createdAt: string;
    }>;
  };
  products?: {
    total: number;
    active: number;
    inactive: number;
    featured: number;
    seasonal: number;
    missingImages: number;
    avgMarginPercent: number;
    topMarginSample: Array<{ id: string; nameAr: string; retailPrice: number; costPrice: number }>;
  };
  inventory?: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    estimatedValue: number;
    lowStockItems: Array<{
      inventoryItemId: string;
      productId: string;
      nameAr: string;
      warehouseName: string;
      qtyOnHand: number;
      reorderPoint: number;
      unit: string;
    }>;
  };
  production?: {
    planned: number;
    inProgress: number;
    completedMonth: number;
    pendingPurchaseOrders: number;
    pendingPurchaseTotal: number;
  };
  finance?: {
    monthExpensesTotal: number;
    monthExpensesCount: number;
    expensesByCategory: Array<{ category: string; total: number }>;
  };
  customers?: {
    totalCustomers: number;
    merchantsTotal: number;
    merchantsPending: number;
    merchantsApproved: number;
    branchesCount: number;
  };
  cms?: {
    publishedPosts: number;
    draftPosts: number;
    totalLikes: number;
    totalComments: number;
  };
  audit?: Array<{
    action: string;
    entity: string;
    userEmail: string;
    createdAt: string;
  }>;
}

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  PREPARING: "قيد التحضير",
  READY: "جاهز",
  OUT_FOR_DELIVERY: "في التوصيل",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
  REJECTED: "مرفوض",
  REFUNDED: "مسترجع",
};

const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  RENT: "إيجار",
  UTILITIES: "فواتير ومرافق",
  SALARIES: "رواتب",
  MAINTENANCE: "صيانة",
  MARKETING: "تسويق",
  SUPPLIES: "مستلزمات",
  TRANSPORT: "نقل وتوصيل",
  OTHER: "أخرى",
};

function normalizeAr(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(norm: string, keywords: string[]): boolean {
  return keywords.some((k) => norm.includes(normalizeAr(k)));
}

function safeDateRanges() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  return { now, todayStart, weekStart, monthStart };
}

export async function getExecutivePulse(
  settings?: SecretarySettings
): Promise<ExecutivePulse> {
  const cfg = settings ?? (await getSecretarySettings());
  const { now, todayStart } = safeDateRanges();

  const [todayAggRes, todayCountRes, pendingRes, invItemsRes] = await Promise.allSettled([
    prisma.salesOrder.aggregate({
      where: {
        status: { notIn: ["CANCELLED", "REJECTED", "REFUNDED"] },
        createdAt: { gte: todayStart, lte: now },
      },
      _sum: { total: true },
    }),
    prisma.salesOrder.count({
      where: { createdAt: { gte: todayStart, lte: now } },
    }),
    prisma.salesOrder.count({
      where: { status: "PENDING" },
    }),
    prisma.inventoryItem.findMany({
      select: { qtyOnHand: true, reorderPoint: true },
    }),
  ]);

  const todayRevenue =
    todayAggRes.status === "fulfilled" ? todayAggRes.value._sum.total ?? 0 : 0;
  const todayOrders =
    todayCountRes.status === "fulfilled" ? todayCountRes.value : 0;
  const pendingOrders = pendingRes.status === "fulfilled" ? pendingRes.value : 0;
  const lowStockCount =
    invItemsRes.status === "fulfilled"
      ? invItemsRes.value.filter((i) => i.qtyOnHand <= i.reorderPoint).length
      : 0;

  const dailyTarget = cfg.dailyRevenueTarget || 1500;
  const targetPercent =
    dailyTarget > 0 ? Math.min(999, Math.round((todayRevenue / dailyTarget) * 100)) : 0;

  return {
    todayRevenue,
    todayOrders,
    pendingOrders,
    lowStockCount,
    dailyTarget,
    targetPercent,
  };
}

export async function collectExecutiveSnapshot(
  settings: SecretarySettings
): Promise<SnapshotData> {
  const { now, todayStart, weekStart, monthStart } = safeDateRanges();
  const pulse = await getExecutivePulse(settings);

  const snapshot: SnapshotData = {
    generatedAt: formatDateTime(now),
    pulse,
  };

  const tasks: Promise<void>[] = [];

  if (settings.readScopes.sales) {
    tasks.push(
      (async () => {
        const [
          weekAgg,
          monthAgg,
          monthOrders,
          preparingOrders,
          readyOrders,
          cancelledMonth,
          channelGroups,
          topItems,
          recentOrders,
        ] = await Promise.allSettled([
          prisma.salesOrder.aggregate({
            where: {
              status: { notIn: ["CANCELLED", "REJECTED", "REFUNDED"] },
              createdAt: { gte: weekStart, lte: now },
            },
            _sum: { total: true },
          }),
          prisma.salesOrder.aggregate({
            where: {
              status: { notIn: ["CANCELLED", "REJECTED", "REFUNDED"] },
              createdAt: { gte: monthStart, lte: now },
            },
            _sum: { total: true },
          }),
          prisma.salesOrder.count({
            where: { createdAt: { gte: monthStart, lte: now } },
          }),
          prisma.salesOrder.count({ where: { status: "PREPARING" } }),
          prisma.salesOrder.count({ where: { status: "READY" } }),
          prisma.salesOrder.count({
            where: { status: "CANCELLED", createdAt: { gte: monthStart, lte: now } },
          }),
          prisma.salesOrder.groupBy({
            by: ["channel"],
            where: {
              status: { notIn: ["CANCELLED", "REJECTED", "REFUNDED"] },
              createdAt: { gte: monthStart, lte: now },
            },
            _sum: { total: true },
            _count: true,
          }),
          prisma.salesOrderItem.groupBy({
            by: ["nameAr"],
            where: {
              order: {
                status: { notIn: ["CANCELLED", "REJECTED", "REFUNDED"] },
                createdAt: { gte: monthStart, lte: now },
              },
            },
            _sum: { qty: true, total: true },
            orderBy: { _sum: { total: "desc" } },
            take: 8,
          }),
          prisma.salesOrder.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              orderNumber: true,
              status: true,
              channel: true,
              total: true,
              createdAt: true,
              customer: { select: { nameAr: true } },
              merchant: { select: { businessName: true } },
            },
          }),
        ]);

        snapshot.sales = {
          todayRevenue: pulse.todayRevenue,
          weekRevenue: weekAgg.status === "fulfilled" ? weekAgg.value._sum.total ?? 0 : 0,
          monthRevenue: monthAgg.status === "fulfilled" ? monthAgg.value._sum.total ?? 0 : 0,
          todayOrders: pulse.todayOrders,
          monthOrders: monthOrders.status === "fulfilled" ? monthOrders.value : 0,
          pendingOrders: pulse.pendingOrders,
          preparingOrders: preparingOrders.status === "fulfilled" ? preparingOrders.value : 0,
          readyOrders: readyOrders.status === "fulfilled" ? readyOrders.value : 0,
          cancelledMonth: cancelledMonth.status === "fulfilled" ? cancelledMonth.value : 0,
          byChannel:
            channelGroups.status === "fulfilled"
              ? channelGroups.value.map((g) => ({
                  channel: String(g.channel),
                  count: typeof g._count === "number" ? g._count : 0,
                  total: g._sum.total ?? 0,
                }))
              : [],
          topProducts:
            topItems.status === "fulfilled"
              ? topItems.value.map((t) => ({
                  nameAr: t.nameAr,
                  qty: t._sum.qty ?? 0,
                  total: t._sum.total ?? 0,
                }))
              : [],
          recentOrders:
            recentOrders.status === "fulfilled"
              ? recentOrders.value.map((o) => ({
                  id: o.id,
                  orderNumber: o.orderNumber,
                  status: String(o.status),
                  channel: String(o.channel),
                  total: o.total,
                  customerLabel:
                    o.merchant?.businessName || o.customer?.nameAr || "عميل صالة / ضيف",
                  createdAt: formatDateTime(o.createdAt),
                }))
              : [],
        };
      })()
    );
  }

  if (settings.readScopes.products) {
    tasks.push(
      (async () => {
        const all = await prisma.product.findMany({
          select: {
            id: true,
            nameAr: true,
            retailPrice: true,
            costPrice: true,
            images: true,
            isActive: true,
            isFeatured: true,
            isSeasonal: true,
          },
          orderBy: { sortOrder: "asc" },
        });
        const active = all.filter((p) => p.isActive).length;
        const featured = all.filter((p) => p.isFeatured).length;
        const seasonal = all.filter((p) => p.isSeasonal).length;
        const missingImages = all.filter((p) => p.images.length === 0).length;
        const margins = all
          .filter((p) => p.retailPrice > 0 && p.costPrice > 0)
          .map((p) => ((p.retailPrice - p.costPrice) / p.retailPrice) * 100);
        const avgMarginPercent =
          margins.length > 0
            ? Math.round((margins.reduce((a, b) => a + b, 0) / margins.length) * 10) / 10
            : 0;

        snapshot.products = {
          total: all.length,
          active,
          inactive: all.length - active,
          featured,
          seasonal,
          missingImages,
          avgMarginPercent,
          topMarginSample: all
            .filter((p) => p.isActive)
            .slice(0, 8)
            .map((p) => ({
              id: p.id,
              nameAr: p.nameAr,
              retailPrice: p.retailPrice,
              costPrice: p.costPrice,
            })),
        };
      })()
    );
  }

  if (settings.readScopes.inventory) {
    tasks.push(
      (async () => {
        const items = await prisma.inventoryItem.findMany({
          include: {
            product: {
              select: { id: true, nameAr: true, unit: true, costPrice: true, retailPrice: true },
            },
            warehouse: { select: { nameAr: true } },
          },
        });
        const lowStock = items.filter((i) => i.qtyOnHand <= i.reorderPoint);
        const outOfStock = items.filter((i) => i.qtyOnHand <= 0).length;
        const estimatedValue = items.reduce(
          (sum, i) =>
            sum +
            Math.max(0, i.qtyOnHand) *
              (i.product.costPrice > 0 ? i.product.costPrice : i.product.retailPrice * 0.5),
          0
        );
        snapshot.inventory = {
          totalItems: items.length,
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStock,
          estimatedValue,
          lowStockItems: lowStock.slice(0, 15).map((i) => ({
            inventoryItemId: i.id,
            productId: i.product.id,
            nameAr: i.product.nameAr,
            warehouseName: i.warehouse.nameAr,
            qtyOnHand: i.qtyOnHand,
            reorderPoint: i.reorderPoint,
            unit: i.product.unit,
          })),
        };
      })()
    );
  }

  if (settings.readScopes.production) {
    tasks.push(
      (async () => {
        const [planned, inProgress, completedMonth, pendingPOs] = await Promise.allSettled([
          prisma.productionOrder.count({ where: { status: "PLANNED" } }),
          prisma.productionOrder.count({ where: { status: "IN_PROGRESS" } }),
          prisma.productionOrder.count({
            where: { status: "COMPLETED", completedAt: { gte: monthStart, lte: now } },
          }),
          prisma.purchaseOrder.aggregate({
            where: { status: { in: ["SUBMITTED", "APPROVED"] } },
            _count: true,
            _sum: { total: true },
          }),
        ]);
        snapshot.production = {
          planned: planned.status === "fulfilled" ? planned.value : 0,
          inProgress: inProgress.status === "fulfilled" ? inProgress.value : 0,
          completedMonth: completedMonth.status === "fulfilled" ? completedMonth.value : 0,
          pendingPurchaseOrders:
            pendingPOs.status === "fulfilled" && typeof pendingPOs.value._count === "number"
              ? pendingPOs.value._count
              : 0,
          pendingPurchaseTotal:
            pendingPOs.status === "fulfilled" ? pendingPOs.value._sum.total ?? 0 : 0,
        };
      })()
    );
  }

  if (settings.readScopes.finance) {
    tasks.push(
      (async () => {
        const groups = await prisma.expense.groupBy({
          by: ["category"],
          where: { date: { gte: monthStart, lte: now } },
          _sum: { amount: true },
          _count: true,
        });
        const total = groups.reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);
        const count = groups.reduce(
          (acc, g) => acc + (typeof g._count === "number" ? g._count : 0),
          0
        );
        snapshot.finance = {
          monthExpensesTotal: total,
          monthExpensesCount: count,
          expensesByCategory: groups.map((g) => ({
            category: EXPENSE_LABELS[g.category] ?? String(g.category),
            total: g._sum.amount ?? 0,
          })),
        };
      })()
    );
  }

  if (settings.readScopes.customers) {
    tasks.push(
      (async () => {
        const [custCount, merchAll, branchesCount] = await Promise.allSettled([
          prisma.customer.count(),
          prisma.merchantAccount.groupBy({ by: ["status"], _count: true }),
          prisma.branch.count({ where: { isActive: true } }),
        ]);
        let merchantsTotal = 0;
        let merchantsPending = 0;
        let merchantsApproved = 0;
        if (merchAll.status === "fulfilled") {
          for (const m of merchAll.value) {
            const c = typeof m._count === "number" ? m._count : 0;
            merchantsTotal += c;
            if (m.status === "PENDING") merchantsPending += c;
            if (m.status === "APPROVED") merchantsApproved += c;
          }
        }
        snapshot.customers = {
          totalCustomers: custCount.status === "fulfilled" ? custCount.value : 0,
          merchantsTotal,
          merchantsPending,
          merchantsApproved,
          branchesCount: branchesCount.status === "fulfilled" ? branchesCount.value : 0,
        };
      })()
    );
  }

  if (settings.readScopes.cms) {
    tasks.push(
      (async () => {
        const posts = await prisma.newsPost.findMany({
          select: { isPublished: true, likesCount: true, commentsCount: true },
        });
        snapshot.cms = {
          publishedPosts: posts.filter((p) => p.isPublished).length,
          draftPosts: posts.filter((p) => !p.isPublished).length,
          totalLikes: posts.reduce((s, p) => s + p.likesCount, 0),
          totalComments: posts.reduce((s, p) => s + p.commentsCount, 0),
        };
      })()
    );
  }

  if (settings.readScopes.audit) {
    tasks.push(
      (async () => {
        const logs = await prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { user: { select: { email: true } } },
        });
        snapshot.audit = logs.map((l) => ({
          action: l.action,
          entity: l.entity,
          userEmail: l.user.email,
          createdAt: formatDateTime(l.createdAt),
        }));
      })()
    );
  }

  await Promise.allSettled(tasks);
  return snapshot;
}

function matchOrderStatusFromText(norm: string): OrderStatus | null {
  if (hasAny(norm, ["ملغي", "الغاء", "الغي", "cancel"])) return "CANCELLED";
  if (hasAny(norm, ["مكتمل", "اكتمال", "تم التسليم", "اكتمل", "كمل", "complete"]))
    return "COMPLETED";
  if (hasAny(norm, ["توصيل", "شحن", "طريق", "delivery"])) return "OUT_FOR_DELIVERY";
  if (hasAny(norm, ["جاهز", "ready"])) return "READY";
  if (hasAny(norm, ["تحضير", "تجهيز", "يحضر", "prepar"])) return "PREPARING";
  if (hasAny(norm, ["تاكيد", "تأكيد", "مؤكد", "اكد", "confirm"])) return "CONFIRMED";
  return null;
}

async function detectPendingCommand(
  rawMessage: string,
  settings: SecretarySettings
): Promise<PendingActionProposal | { errorNotice: string } | null> {
  const norm = normalizeAr(rawMessage);

  // 1. Order Status Command (e.g. "غيّر حالة الطلب ORD-... إلى جاهز")
  const orderNumMatch = rawMessage.match(/(?:ORD|POS|B2B)[-_A-Z0-9]{3,}/i);
  const mentionsOrder = hasAny(norm, ["طلب", "حاله الطلب", "حالة الطلب"]) || Boolean(orderNumMatch);
  const targetStatus = matchOrderStatusFromText(norm);
  const isOrderWriteIntent =
    hasAny(norm, ["غير", "غيّر", "عدل", "عدّل", "حول", "حوّل", "اجعل", "اكد", "أكد", "الغي", "ألغ"]) &&
    mentionsOrder &&
    targetStatus !== null;

  if (isOrderWriteIntent && targetStatus) {
    if (!settings.allowCommands || !settings.commandScopes.orders) {
      return { errorNotice: "صلاحية أوامر تعديل الطلبات معطلة حالياً من إعدادات السكرتير." };
    }
    const order = orderNumMatch
      ? await prisma.salesOrder.findFirst({
          where: { orderNumber: { contains: orderNumMatch[0], mode: "insensitive" } },
          select: { id: true, orderNumber: true, status: true, total: true },
        })
      : await prisma.salesOrder.findFirst({
          orderBy: { createdAt: "desc" },
          select: { id: true, orderNumber: true, status: true, total: true },
        });

    if (!order) {
      return { errorNotice: "لم أجد طلباً مطابقاً في قاعدة البيانات لتحديث حالته." };
    }
    return {
      type: "UPDATE_ORDER_STATUS",
      title: `تحديث حالة الطلب ${order.orderNumber}`,
      summary: `تغيير حالة الطلب من "${ORDER_STATUS_LABELS[order.status]}" إلى "${ORDER_STATUS_LABELS[targetStatus]}"`,
      targetLabel: `طلب ${order.orderNumber} (${formatCurrency(order.total)})`,
      oldValueLabel: ORDER_STATUS_LABELS[order.status],
      newValueLabel: ORDER_STATUS_LABELS[targetStatus],
      severity: targetStatus === "CANCELLED" ? "warning" : "normal",
      payload: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        oldStatus: order.status,
        newStatus: targetStatus,
      },
    };
  }

  // 2. Product Price Command (e.g. "عدل سعر دهان إلى 34.50")
  const priceVerb = hasAny(norm, ["عدل سعر", "عدّل سعر", "غير سعر", "غيّر سعر", "سعر منتج", "تعديل سعر"]);
  if (priceVerb) {
    const numberMatch = rawMessage.match(/(\d+(?:[.,]\d+)?)/);
    if (numberMatch) {
      if (!settings.allowCommands || !settings.commandScopes.products) {
        return { errorNotice: "صلاحية تعديل المنتجات والأسعار معطلة من إعدادات السكرتير." };
      }
      const newPrice = Number(numberMatch[1].replace(",", "."));
      const products = await prisma.product.findMany({
        select: { id: true, nameAr: true, retailPrice: true },
      });
      const matched = findBestProductByText(products, norm);
      if (!matched) {
        return { errorNotice: "لم أتمكن من تحديد المنتج المقصود بدقة. يرجى كتابة اسم المنتج واضحاً." };
      }
      if (!Number.isFinite(newPrice) || newPrice <= 0) {
        return { errorNotice: "السعر الجديد يجب أن يكون أكبر من صفر." };
      }
      const diffPct =
        matched.retailPrice > 0
          ? Math.abs(((newPrice - matched.retailPrice) / matched.retailPrice) * 100)
          : 0;
      if (matched.retailPrice > 0 && diffPct > settings.maxPriceChangePercent) {
        return {
          errorNotice: `حماية الأمان تمنع تغيير السعر بنسبة (${Math.round(diffPct)}%) لأن الحد الأقصى المسموح به في الإعدادات هو ${settings.maxPriceChangePercent}%.`,
        };
      }
      return {
        type: "UPDATE_PRODUCT_PRICE",
        title: `تعديل سعر "${matched.nameAr}"`,
        summary: `تحديث سعر البيع من ${formatCurrency(matched.retailPrice)} إلى ${formatCurrency(newPrice)}`,
        targetLabel: matched.nameAr,
        oldValueLabel: formatCurrency(matched.retailPrice),
        newValueLabel: formatCurrency(newPrice),
        severity: diffPct >= 20 ? "warning" : "normal",
        payload: {
          productId: matched.id,
          nameAr: matched.nameAr,
          oldPrice: matched.retailPrice,
          newPrice,
        },
      };
    }
  }

  // 3. Product Active / Featured Toggle
  const toggleProdIntent =
    hasAny(norm, ["اوقف منتج", "أوقف منتج", "ايقاف منتج", "فعل منتج", "فعّل منتج", "تفعيل منتج", "ميز منتج", "ميّز منتج", "اجعل منتج", "اخفي منتج"]) ||
    (hasAny(norm, ["اوقف", "ايقاف", "تفعيل", "فعل", "مميز"]) && hasAny(norm, ["منتج"]));
  if (toggleProdIntent) {
    if (!settings.allowCommands || !settings.commandScopes.products) {
      return { errorNotice: "صلاحية تعديل حالة المنتجات معطلة من إعدادات السكرتير." };
    }
    const products = await prisma.product.findMany({
      select: { id: true, nameAr: true, isActive: true, isFeatured: true },
    });
    const matched = findBestProductByText(products, norm);
    if (!matched) {
      return { errorNotice: "يرجى ذكر اسم المنتج بدقة لتغيير حالته." };
    }
    const wantsFeatured = hasAny(norm, ["مميز", "ميز"]);
    const wantsEnable = hasAny(norm, ["فعل", "تفعيل", "نشط", "ميز", "مميز"]);
    const wantsDisable = hasAny(norm, ["اوقف", "ايقاف", "عطل", "تعطيل", "اخف", "الغ تمييز"]);

    const field = wantsFeatured ? "isFeatured" : "isActive";
    const nextVal = wantsDisable ? false : wantsEnable ? true : !matched[field];

    return {
      type: "UPDATE_PRODUCT_STATUS",
      title: wantsFeatured
        ? `تحديث تمييز "${matched.nameAr}"`
        : `تحديث تفعيل "${matched.nameAr}"`,
      summary: wantsFeatured
        ? nextVal
          ? "إضافة وسم منتج مميز في الواجهة"
          : "إزالة وسم منتج مميز"
        : nextVal
          ? "تفعيل المنتج وظهوره للعملاء"
          : "إيقاف المنتج مؤقتاً عن الظهور",
      targetLabel: matched.nameAr,
      oldValueLabel: wantsFeatured
        ? matched.isFeatured
          ? "مميز"
          : "عادي"
        : matched.isActive
          ? "نشط"
          : "متوقف",
      newValueLabel: wantsFeatured
        ? nextVal
          ? "مميز"
          : "عادي"
        : nextVal
          ? "نشط"
          : "متوقف",
      severity: !wantsFeatured && !nextVal ? "warning" : "normal",
      payload: {
        productId: matched.id,
        nameAr: matched.nameAr,
        field,
        oldValue: matched[field],
        newValue: nextVal,
      },
    };
  }

  // 4. Inventory Adjustment Command (e.g. "زد مخزون جبس بورد بمقدار 25")
  const invVerb = hasAny(norm, ["مخزون", "رصيد", "كميه"]) && hasAny(norm, ["زد", "اضف", "اضافة", "انقص", "خصم", "سحب", "تعديل", "عدل"]);
  if (invVerb) {
    const qtyMatch = rawMessage.match(/(\d+(?:[.,]\d+)?)/);
    if (qtyMatch) {
      if (!settings.allowCommands || !settings.commandScopes.inventory) {
        return { errorNotice: "صلاحية تعديل المخزون معطلة من إعدادات السكرتير." };
      }
      const rawQty = Number(qtyMatch[1].replace(",", "."));
      const isDecrease = hasAny(norm, ["انقص", "خصم", "سحب", "ناقص", "تخفيض", "هدر"]);
      const delta = isDecrease ? -Math.abs(rawQty) : Math.abs(rawQty);

      if (Math.abs(delta) > settings.maxStockAdjustmentQty) {
        return {
          errorNotice: `حماية المخزون تمنع تعديل أكثر من ${settings.maxStockAdjustmentQty} وحدة بأمر واحد.`,
        };
      }

      const invItems = await prisma.inventoryItem.findMany({
        include: {
          product: { select: { id: true, nameAr: true, unit: true } },
          warehouse: { select: { id: true, branchId: true, nameAr: true } },
        },
      });
      const matched = findBestProductByText(
        invItems.map((i) => ({ id: i.id, nameAr: i.product.nameAr, raw: i })),
        norm
      );
      if (!matched) {
        return { errorNotice: "لم أجد سجلاً مخزونياً مطابقاً لهذا المنتج." };
      }
      const item = matched.raw;
      const qtyAfter = item.qtyOnHand + delta;
      if (qtyAfter < 0) {
        return {
          errorNotice: `الرصيد الحالي لـ "${item.product.nameAr}" هو ${item.qtyOnHand} ولا يكفي لخصم ${Math.abs(delta)}.`,
        };
      }
      return {
        type: "ADJUST_INVENTORY",
        title: `تعديل مخزون "${item.product.nameAr}"`,
        summary: `تعديل الرصيد بمقدار ${delta > 0 ? `+${delta}` : delta} ${item.product.unit} في ${item.warehouse.nameAr}`,
        targetLabel: `${item.product.nameAr} — ${item.warehouse.nameAr}`,
        oldValueLabel: `${item.qtyOnHand} ${item.product.unit}`,
        newValueLabel: `${qtyAfter} ${item.product.unit}`,
        severity: delta < 0 ? "warning" : "normal",
        payload: {
          inventoryItemId: item.id,
          nameAr: item.product.nameAr,
          qtyBefore: item.qtyOnHand,
          delta,
          qtyAfter,
          branchId: item.warehouse.branchId,
          reason: `أمر إداري عبر سكرتير المدير (${delta > 0 ? "+" : ""}${delta})`,
        },
      };
    }
  }

  // 5. Create News Post Command (e.g. "انشر خبر: عرض خاص يوم الجمعة...")
  const newsVerb = hasAny(norm, ["انشر خبر", "نشر خبر", "اضف خبر", "انشر اعلان", "نشر اعلان"]);
  if (newsVerb) {
    if (!settings.allowCommands || !settings.commandScopes.cms) {
      return { errorNotice: "صلاحية نشر الأخبار والمحتوى معطلة من إعدادات السكرتير." };
    }
    const contentText = rawMessage
      .replace(/^.*?(?:انشر|نشر|اضف|أضف)\s+(?:خبر|خبراً|اعلان|إعلان|إعلاناً)\s*[:：]?\s*/i, "")
      .trim();
    if (contentText.length < 5) {
      return {
        errorNotice: "يرجى كتابة نص الخبر بعد كلمة 'انشر خبر:' (مثال: انشر خبر: خصم 15% على ألواح بديل الرخام اليوم).",
      };
    }
    return {
      type: "CREATE_NEWS_POST",
      title: "نشر خبر جديد في صفحة الأخبار",
      summary: "إنشاء منشور إخباري منشور للعملاء في قسم أخبار روز باريس",
      targetLabel: "قسم الأخبار والمجتمع",
      oldValueLabel: "مسودة جديدة",
      newValueLabel: contentText.slice(0, 70) + (contentText.length > 70 ? "..." : ""),
      severity: "normal",
      payload: {
        title: contentText.split("\n")[0].slice(0, 80),
        content: contentText,
      },
    };
  }

  // 6. Record Expense Command (e.g. "سجل مصروف 35 دينار صيانة")
  const expenseVerb = hasAny(norm, ["سجل مصروف", "سجّل مصروف", "اضف مصروف", "أضف مصروف"]);
  if (expenseVerb) {
    if (!settings.allowCommands || !settings.commandScopes.expenses) {
      return { errorNotice: "صلاحية تسجيل المصاريف معطلة من إعدادات السكرتير." };
    }
    const amountMatch = rawMessage.match(/(\d+(?:[.,]\d+)?)/);
    if (!amountMatch) {
      return { errorNotice: "يرجى تحديد قيمة المصروف بالأرقام (مثال: سجل مصروف 25 صيانة أفران)." };
    }
    const amount = Number(amountMatch[1].replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { errorNotice: "قيمة المصروف يجب أن تكون أكبر من صفر." };
    }
    let category: ExpenseCategory = "OTHER";
    if (hasAny(norm, ["صيانه", "تصليح"])) category = "MAINTENANCE";
    else if (hasAny(norm, ["نقل", "توصيل", "بنزين"])) category = "TRANSPORT";
    else if (hasAny(norm, ["كهرباء", "ماء", "فاتوره", "مرافق"])) category = "UTILITIES";
    else if (hasAny(norm, ["تسويق", "اعلان"])) category = "MARKETING";
    else if (hasAny(norm, ["مواد", "مستلزمات", "شراء"])) category = "SUPPLIES";
    else if (hasAny(norm, ["راتب", "رواتب"])) category = "SALARIES";
    else if (hasAny(norm, ["ايجار", "إيجار"])) category = "RENT";

    return {
      type: "CREATE_EXPENSE",
      title: `تسجيل مصروف (${EXPENSE_LABELS[category]})`,
      summary: `تسجيل مصروف تشغيلي بقيمة ${formatCurrency(amount)}`,
      targetLabel: EXPENSE_LABELS[category],
      oldValueLabel: "غير مسجل",
      newValueLabel: `${formatCurrency(amount)} — ${rawMessage.slice(0, 60)}`,
      severity: amount >= 500 ? "warning" : "normal",
      payload: {
        category,
        amount,
        description: rawMessage.trim().slice(0, 200),
      },
    };
  }

  return null;
}

function findBestProductByText<T extends { nameAr: string }>(
  items: T[],
  normalizedMessage: string
): T | null {
  const words = normalizedMessage
    .split(" ")
    .filter((w) => w.length >= 2);
  let best: T | null = null;
  let bestScore = 0;

  for (const item of items) {
    const target = normalizeAr(item.nameAr);
    if (normalizedMessage.includes(target)) {
      return item;
    }
    let score = 0;
    for (const w of words) {
      if (target.includes(w)) score += w.length;
    }
    if (score > bestScore && score >= 3) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}

function buildDeterministicAnalyticsReply(
  message: string,
  snap: SnapshotData,
  settings: SecretarySettings
): SecretaryChatResponse {
  const norm = normalizeAr(message);

  // 1. Low Stock / Inventory Analysis
  if (hasAny(norm, ["مخزون", "نواقص", "نقص", "نفد", "اعاده الطلب", "مستودع"])) {
    if (!snap.inventory) {
      return {
        reply: "نطاق قراءة بيانات المخزون غير مفعّل حالياً في إعدادات السكرتير.",
        links: [{ label: "إعدادات السكرتير", href: "/admin/secretary" }],
      };
    }
    const low = snap.inventory.lowStockItems;
    return {
      reply:
        low.length > 0
          ? `رصدتُ ${snap.inventory.lowStockCount} صنفاً عند حد إعادة الطلب أو أقل (منها ${snap.inventory.outOfStockCount} رصيده صفر). أوصي بإنشاء أوامر شراء أو تعديل الإنتاج لها فوراً.`
          : `وضع المخزون ممتاز! جميع الأصناف المسجلة (${snap.inventory.totalItems}) أعلى من حد إعادة الطلب، والقيمة التقديرية للمخزون ${formatCurrency(snap.inventory.estimatedValue)}.`,
      kpis: [
        { label: "إجمالي أصناف المخزون", value: String(snap.inventory.totalItems), tone: "sky" },
        {
          label: "تحت حد الطلب",
          value: String(snap.inventory.lowStockCount),
          tone: snap.inventory.lowStockCount > 0 ? "rose" : "emerald",
        },
        {
          label: "نفد كلياً",
          value: String(snap.inventory.outOfStockCount),
          tone: snap.inventory.outOfStockCount > 0 ? "rose" : "emerald",
        },
        { label: "القيمة التقديرية", value: formatCurrency(snap.inventory.estimatedValue), tone: "amber" },
      ],
      table:
        low.length > 0
          ? {
              title: "الأصناف الحرجة في المخزون",
              columns: ["الصنف", "المستودع", "الرصيد", "حد الطلب"],
              rows: low.map((i) => [
                i.nameAr,
                i.warehouseName,
                `${i.qtyOnHand} ${i.unit}`,
                `${i.reorderPoint} ${i.unit}`,
              ]),
            }
          : undefined,
      links: [{ label: "فتح إدارة المخزون", href: "/admin/inventory" }],
    };
  }

  // 2. Pending Orders & Sales Channels
  if (hasAny(norm, ["طلب", "طلبات", "مبيعات", "قناه", "قنوات", "ايراد", "دخل"])) {
    if (!snap.sales) {
      return {
        reply: "نطاق قراءة المبيعات غير مفعّل في إعدادات السكرتير.",
        links: [{ label: "إعدادات السكرتير", href: "/admin/secretary" }],
      };
    }
    const s = snap.sales;
    return {
      reply: `ملخص المبيعات والطلبات:\n• مبيعات اليوم: ${formatCurrency(s.todayRevenue)} (${s.todayOrders} طلب) — تم تحقيق ${snap.pulse.targetPercent}% من الهدف اليومي (${formatCurrency(settings.dailyRevenueTarget)}).\n• مبيعات الشهر: ${formatCurrency(s.monthRevenue)} (${s.monthOrders} طلب).\n• يوجد ${s.pendingOrders} طلب بانتظار الاعتماد و${s.preparingOrders} قيد التحضير و${s.readyOrders} جاهز للتسليم.`,
      kpis: [
        { label: "مبيعات اليوم", value: formatCurrency(s.todayRevenue), hint: `${snap.pulse.targetPercent}% من الهدف`, tone: "emerald" },
        { label: "مبيعات 7 أيام", value: formatCurrency(s.weekRevenue), tone: "amber" },
        { label: "مبيعات الشهر", value: formatCurrency(s.monthRevenue), tone: "sky" },
        {
          label: "طلبات معلقة",
          value: String(s.pendingOrders),
          tone: s.pendingOrders > 0 ? "rose" : "emerald",
        },
      ],
      table:
        s.recentOrders.length > 0
          ? {
              title: "أحدث الطلبات المسجلة",
              columns: ["رقم الطلب", "العميل", "القناة", "الحالة", "الإجمالي"],
              rows: s.recentOrders.slice(0, 8).map((o) => [
                o.orderNumber,
                o.customerLabel,
                o.channel,
                ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status,
                formatCurrency(o.total),
              ]),
            }
          : undefined,
      links: [{ label: "إدارة المبيعات والطلبات", href: "/admin/sales" }],
    };
  }

  // 3. Top Products & Pricing Margins
  if (hasAny(norm, ["منتج", "منتجات", "اكثر مبيع", "أكثر مبيع", "ربح", "هامش", "تسعير", "اصناف"])) {
    const top = snap.sales?.topProducts ?? [];
    const prod = snap.products;
    return {
      reply: prod
        ? `تحليل المنتجات والأرباح:\n• إجمالي الأصناف: ${prod.total} (نشط: ${prod.active} | موقوف: ${prod.inactive} | مميز: ${prod.featured}).\n• متوسط هامش الربح للأصناف المسعرة التكلفة: ${prod.avgMarginPercent}%.\n• أصناف تنقصها صور: ${prod.missingImages}.`
        : "ملخص أكثر المنتجات طلباً خلال الشهر الحالي:",
      kpis: prod
        ? [
            { label: "الأصناف النشطة", value: String(prod.active), tone: "emerald" },
            { label: "أصناف مميزة", value: String(prod.featured), tone: "amber" },
            { label: "متوسط الهامش", value: `${prod.avgMarginPercent}%`, tone: "sky" },
            {
              label: "بدون صور",
              value: String(prod.missingImages),
              tone: prod.missingImages > 0 ? "rose" : "emerald",
            },
          ]
        : undefined,
      table:
        top.length > 0
          ? {
              title: "الأصناف الأكثر مبيعاً (الشهر الحالي)",
              columns: ["المنتج", "الكمية المباعة", "إجمالي المبيعات"],
              rows: top.map((p) => [p.nameAr, String(p.qty), formatCurrency(p.total)]),
            }
          : undefined,
      links: [{ label: "إدارة المنتجات", href: "/admin/products" }],
    };
  }

  // 4. Finance, B2B Merchants & Production
  if (hasAny(norm, ["ماليه", "مصاريف", "مصروف", "تجار", "جمله", "انتاج", "مشتريات", "b2b"])) {
    const fin = snap.finance;
    const cust = snap.customers;
    const prod = snap.production;
    return {
      reply: `ملخص المالية والتوريد والإنتاج:\n• مصاريف الشهر: ${fin ? formatCurrency(fin.monthExpensesTotal) : "غير متاح"} (${fin?.monthExpensesCount ?? 0} بند).\n• تجار الجملة B2B: ${cust?.merchantsApproved ?? 0} معتمدين و${cust?.merchantsPending ?? 0} بانتظار الموافقة.\n• أوامر الإنتاج: ${prod?.planned ?? 0} مخططة و${prod?.inProgress ?? 0} قيد التنفيذ و${prod?.completedMonth ?? 0} مكتملة هذا الشهر.`,
      kpis: [
        { label: "مصاريف الشهر", value: fin ? formatCurrency(fin.monthExpensesTotal) : "—", tone: "rose" },
        { label: "تجار B2B معتمدون", value: String(cust?.merchantsApproved ?? 0), tone: "emerald" },
        { label: "تجار بانتظار التفعيل", value: String(cust?.merchantsPending ?? 0), tone: "amber" },
        { label: "أوامر شراء معلقة", value: String(prod?.pendingPurchaseOrders ?? 0), tone: "sky" },
      ],
      table:
        fin && fin.expensesByCategory.length > 0
          ? {
              title: "توزيع المصاريف هذا الشهر",
              columns: ["الفئة", "المبلغ"],
              rows: fin.expensesByCategory.map((e) => [e.category, formatCurrency(e.total)]),
            }
          : undefined,
    };
  }

  // 5. Audit Log
  if (hasAny(norm, ["تدقيق", "سجل", "حركات", "نشاط", "مراقبه"])) {
    const audit = snap.audit ?? [];
    return {
      reply:
        audit.length > 0
          ? `إليك آخر ${audit.length} حركات مسجلة في سجل التدقيق الأمني للنظام:`
          : "لا توجد حركات مسجلة مؤخراً في سجل التدقيق.",
      table:
        audit.length > 0
          ? {
              title: "آخر حركات سجل التدقيق (Audit Log)",
              columns: ["الإجراء", "الكيان", "المستخدم", "الوقت"],
              rows: audit.map((a) => [a.action, a.entity, a.userEmail, a.createdAt]),
            }
          : undefined,
      links: [{ label: "سجل عمليات السكرتير", href: "/admin/secretary" }],
    };
  }

  // 6. Comprehensive Executive Summary (Default)
  const s = snap.sales;
  const inv = snap.inventory;
  const prod = snap.production;
  const fin = snap.finance;
  const cms = snap.cms;

  const alerts: string[] = [];
  if ((s?.pendingOrders ?? 0) > 0) alerts.push(`• ${s?.pendingOrders} طلب بانتظار التأكيد.`);
  if ((inv?.lowStockCount ?? 0) > 0) alerts.push(`• ${inv?.lowStockCount} مادة/صنف في المخزون وصل لحد إعادة الطلب.`);
  if ((snap.customers?.merchantsPending ?? 0) > 0)
    alerts.push(`• ${snap.customers?.merchantsPending} حساب تاجر جملة بانتظار الموافقة.`);
  if ((snap.products?.missingImages ?? 0) > 0)
    alerts.push(`• ${snap.products?.missingImages} منتج يحتاج لإضافة صور.`);

  return {
    reply: [
      `الملخص التنفيذي الشامل حتى ${snap.generatedAt}:`,
      `• المبيعات اليوم: ${formatCurrency(snap.pulse.todayRevenue)} (${snap.pulse.todayOrders} طلب — ${snap.pulse.targetPercent}% من الهدف اليومي).`,
      s ? `• إجمالي الشهر: ${formatCurrency(s.monthRevenue)} عبر ${s.monthOrders} طلب.` : "",
      fin ? `• المصاريف الشهرية المسجلة: ${formatCurrency(fin.monthExpensesTotal)}.` : "",
      prod ? `• الإنتاج: ${prod.inProgress} قيد التشغيل، ${prod.planned} مخطط.` : "",
      cms ? `• الأخبار المنشورة: ${cms.publishedPosts} خبر (${cms.totalLikes} إعجاب، ${cms.totalComments} تعليق).` : "",
      alerts.length > 0 ? `\nتنبيهات فورية تتطلب انتباهك:\n${alerts.join("\n")}` : "\nلا توجد تنبيهات حرجة حالياً — سير العمل مستقر.",
      settings.allowCommands
        ? `\nتلميح: يمكنك إعطائي أوامر مباشرة مثل: "غيّر حالة الطلب ORD-... إلى جاهز" أو "عدّل سعر دهان إلى 34.50" أو "سجّل مصروف 30 صيانة".`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    kpis: [
      {
        label: "مبيعات اليوم",
        value: formatCurrency(snap.pulse.todayRevenue),
        hint: `الهدف ${formatCurrency(snap.pulse.dailyTarget)}`,
        tone: snap.pulse.targetPercent >= 80 ? "emerald" : "amber",
      },
      {
        label: "مبيعات الشهر",
        value: formatCurrency(s?.monthRevenue ?? 0),
        hint: `${s?.monthOrders ?? 0} طلب`,
        tone: "sky",
      },
      {
        label: "طلبات معلقة",
        value: String(snap.pulse.pendingOrders),
        tone: snap.pulse.pendingOrders > 0 ? "rose" : "emerald",
      },
      {
        label: "نواقص المخزون",
        value: String(snap.pulse.lowStockCount),
        tone: snap.pulse.lowStockCount > 0 ? "rose" : "emerald",
      },
    ],
    links: [
      { label: "المبيعات", href: "/admin/sales" },
      { label: "المخزون", href: "/admin/inventory" },
      { label: "إعدادات السكرتير", href: "/admin/secretary" },
    ],
  };
}

async function tryGeminiExecutiveAnalysis(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  snap: SnapshotData,
  settings: SecretarySettings,
  baseResponse: SecretaryChatResponse
): Promise<SecretaryChatResponse | null> {
  if (settings.engineMode !== "HYBRID_GEMINI") return null;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const toneInstruction =
    settings.tone === "EXECUTIVE_CONCISE"
      ? "قدّم الرد بصيغة تنفيذية مركزة ونقاط واضحة ومباشرة."
      : settings.tone === "DETAILED_ANALYTICAL"
        ? "قدّم تحليلاً معمقاً مدعوماً بالأرقام والنسب والمقارنات والتوصيات."
        : "قدّم الرد بأسلوب مستشار إداري ودود واحترافي.";

  const systemPrompt = [
    `أنت "${settings.displayName}" — ${settings.subtitle} لشركة روز باريس لمواد البناء والديكور.`,
    toneInstruction,
    settings.customInstructions ? `توجيهات المدير الخاصة: ${settings.customInstructions}` : "",
    "اعتمد حصراً على البيانات الحية التالية ولا تخترع أي أرقام:",
    JSON.stringify(snap),
    'أعد الرد بصيغة JSON فقط بهذا الشكل: {"reply": "النص التحليلي المنظم بالعربية"}',
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...history.slice(-6).map((h) => ({
              role: h.role === "assistant" ? "model" : "user",
              parts: [{ text: h.content }],
            })),
            { role: "user", parts: [{ text: message }] },
          ],
          generationConfig: {
            temperature: settings.temperature,
            maxOutputTokens: 700,
            responseMimeType: "application/json",
          },
        }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { reply?: string };
    if (!parsed.reply || typeof parsed.reply !== "string") return null;

    return {
      ...baseResponse,
      reply: parsed.reply,
      usedGemini: true,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function processSecretaryQuery(params: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  ctx: ApiContext;
}): Promise<SecretaryChatResponse> {
  const settings = await getSecretarySettings();
  if (!settings.enabled) {
    return {
      reply: "مساعد سكرتير المدير معطّل حالياً من لوحة إعداداته.",
      links: [{ label: "تفعيل من الإعدادات", href: "/admin/secretary" }],
    };
  }
  if (!isRoleAllowedForSecretary(params.ctx.role, settings)) {
    return {
      reply: "عذراً، دور حسابك الحالي غير مضاف ضمن الأدوار المصرح لها باستخدام سكرتير المدير.",
    };
  }

  // 1. Check if message is an actionable admin command first
  const detected = await detectPendingCommand(params.message, settings);
  if (detected && "errorNotice" in detected) {
    return {
      reply: detected.errorNotice,
      links: [{ label: "إعدادات الصلاحيات والأوامر", href: "/admin/secretary" }],
    };
  }

  if (detected) {
    // If manager opted out of confirmation cards for non-warning commands, execute right away
    if (!settings.requireConfirmation && detected.severity === "normal") {
      const exec = await executeSecretaryAction(detected, params.ctx, settings);
      return {
        reply: exec.message,
        executedNotice: exec.success ? "تم التنفيذ الفوري وتوثيق العملية في سجل التدقيق." : undefined,
      };
    }

    return {
      reply: `جهّزتُ لك مسودة الأمر التنفيذي التالي. يرجى المراجعة والضغط على "تأكيد وتنفيذ الآن" لتطبيقه فوراً في النظام:`,
      pendingAction: detected,
    };
  }

  // 2. Otherwise perform live analytics & executive briefing
  const snapshot = await collectExecutiveSnapshot(settings);
  const deterministic = buildDeterministicAnalyticsReply(
    params.message,
    snapshot,
    settings
  );

  const geminiEnhanced = await tryGeminiExecutiveAnalysis(
    params.message,
    params.history,
    snapshot,
    settings,
    deterministic
  );

  return geminiEnhanced ?? deterministic;
}

function assertActionPermission(
  ctx: ApiContext,
  requiredPermission: Permission,
  scopeEnabled: boolean,
  settings: SecretarySettings
): string | null {
  if (!settings.enabled) return "مساعد السكرتير معطّل حالياً";
  if (!isRoleAllowedForSecretary(ctx.role, settings)) {
    return "دورك الوظيفي غير مخوّل لتنفيذ أوامر السكرتير";
  }
  if (!settings.allowCommands || !scopeEnabled) {
    return "هذا النوع من الأوامر معطّل من لوحة إعدادات السكرتير";
  }
  if (!hasPermission(ctx.permissions, ctx.role as UserRole, requiredPermission)) {
    return `حسابك لا يملك الصلاحية النظامية المطلوبة (${requiredPermission})`;
  }
  return null;
}

export async function executeSecretaryAction(
  proposal: PendingActionProposal,
  ctx: ApiContext,
  loadedSettings?: SecretarySettings
): Promise<{ success: boolean; message: string }> {
  const settings = loadedSettings ?? (await getSecretarySettings());
  const p = proposal.payload;

  switch (proposal.type) {
    case "UPDATE_ORDER_STATUS": {
      const denied = assertActionPermission(
        ctx,
        PERMISSIONS.ORDERS_UPDATE,
        settings.commandScopes.orders,
        settings
      );
      if (denied) return { success: false, message: denied };

      const orderId = String(p.orderId ?? "");
      const newStatus = String(p.newStatus ?? "") as OrderStatus;
      if (!OBJECT_ID_RE.test(orderId) || !ORDER_STATUS_LABELS[newStatus]) {
        return { success: false, message: "بيانات الطلب أو الحالة المستهدفة غير صالحة" };
      }

      const existing = await prisma.salesOrder.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true, status: true },
      });
      if (!existing) return { success: false, message: "الطلب غير موجود" };

      await prisma.salesOrder.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      await auditLog({
        userId: ctx.userId,
        action: "SECRETARY_COMMAND",
        entity: "SalesOrder",
        entityId: existing.id,
        oldData: { orderNumber: existing.orderNumber, status: existing.status },
        newData: { orderNumber: existing.orderNumber, status: newStatus },
      });

      return {
        success: true,
        message: `تم تنفيذ الأمر: تغيرت حالة الطلب ${existing.orderNumber} من "${ORDER_STATUS_LABELS[existing.status]}" إلى "${ORDER_STATUS_LABELS[newStatus]}" بنجاح.`,
      };
    }

    case "UPDATE_PRODUCT_PRICE": {
      const denied = assertActionPermission(
        ctx,
        PERMISSIONS.PRODUCTS_UPDATE,
        settings.commandScopes.products,
        settings
      );
      if (denied) return { success: false, message: denied };

      const productId = String(p.productId ?? "");
      const newPrice = Number(p.newPrice);
      if (!OBJECT_ID_RE.test(productId) || !Number.isFinite(newPrice) || newPrice <= 0) {
        return { success: false, message: "معرف المنتج أو السعر غير صالح" };
      }

      const existing = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, nameAr: true, retailPrice: true },
      });
      if (!existing) return { success: false, message: "المنتج غير موجود" };

      const diffPct =
        existing.retailPrice > 0
          ? Math.abs(((newPrice - existing.retailPrice) / existing.retailPrice) * 100)
          : 0;
      if (existing.retailPrice > 0 && diffPct > settings.maxPriceChangePercent) {
        return {
          success: false,
          message: `تجاوز التعديل الحد الأقصى المسموح لنسبة تغيير السعر (${settings.maxPriceChangePercent}%)`,
        };
      }

      await prisma.product.update({
        where: { id: productId },
        data: { retailPrice: newPrice },
      });

      await auditLog({
        userId: ctx.userId,
        action: "SECRETARY_COMMAND",
        entity: "Product",
        entityId: existing.id,
        oldData: { nameAr: existing.nameAr, retailPrice: existing.retailPrice },
        newData: { nameAr: existing.nameAr, retailPrice: newPrice },
      });

      return {
        success: true,
        message: `تم تحديث سعر "${existing.nameAr}" إلى ${formatCurrency(newPrice)} بنجاح.`,
      };
    }

    case "UPDATE_PRODUCT_STATUS": {
      const denied = assertActionPermission(
        ctx,
        PERMISSIONS.PRODUCTS_UPDATE,
        settings.commandScopes.products,
        settings
      );
      if (denied) return { success: false, message: denied };

      const productId = String(p.productId ?? "");
      const field = p.field === "isFeatured" ? "isFeatured" : "isActive";
      const newValue = Boolean(p.newValue);
      if (!OBJECT_ID_RE.test(productId)) {
        return { success: false, message: "معرف المنتج غير صالح" };
      }

      const existing = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, nameAr: true, isActive: true, isFeatured: true },
      });
      if (!existing) return { success: false, message: "المنتج غير موجود" };

      await prisma.product.update({
        where: { id: productId },
        data: { [field]: newValue },
      });

      await auditLog({
        userId: ctx.userId,
        action: "SECRETARY_COMMAND",
        entity: "Product",
        entityId: existing.id,
        oldData: { nameAr: existing.nameAr, [field]: existing[field] },
        newData: { nameAr: existing.nameAr, [field]: newValue },
      });

      return {
        success: true,
        message: `تم تحديث حالة "${existing.nameAr}" بنجاح.`,
      };
    }

    case "ADJUST_INVENTORY": {
      const denied = assertActionPermission(
        ctx,
        PERMISSIONS.INVENTORY_ADJUST,
        settings.commandScopes.inventory,
        settings
      );
      if (denied) return { success: false, message: denied };

      const inventoryItemId = String(p.inventoryItemId ?? "");
      const delta = Number(p.delta);
      const reason = String(p.reason ?? "تعديل عبر سكرتير المدير");
      if (!OBJECT_ID_RE.test(inventoryItemId) || !Number.isFinite(delta) || delta === 0) {
        return { success: false, message: "بيانات تعديل المخزون غير صالحة" };
      }
      if (Math.abs(delta) > settings.maxStockAdjustmentQty) {
        return {
          success: false,
          message: `تجاوزت الكمية الحد الأقصى المسموح (${settings.maxStockAdjustmentQty})`,
        };
      }

      const item = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemId },
        include: {
          product: { select: { nameAr: true, unit: true } },
          warehouse: { select: { branchId: true } },
        },
      });
      if (!item) return { success: false, message: "سجل المخزون غير موجود" };

      const qtyAfter = item.qtyOnHand + delta;
      if (qtyAfter < 0) {
        return { success: false, message: "الرصيد الناتج لا يمكن أن يكون سالباً" };
      }

      await prisma.$transaction([
        prisma.inventoryItem.update({
          where: { id: item.id },
          data: { qtyOnHand: qtyAfter },
        }),
        prisma.stockMovement.create({
          data: {
            inventoryItemId: item.id,
            type: MovementType.ADJUSTMENT,
            qty: delta,
            qtyBefore: item.qtyOnHand,
            qtyAfter,
            referenceType: "ADJUSTMENT",
            reason,
            userId: ctx.userId,
            branchId: item.warehouse.branchId,
          },
        }),
      ]);

      await auditLog({
        userId: ctx.userId,
        action: "SECRETARY_COMMAND",
        entity: "InventoryItem",
        entityId: item.id,
        oldData: { nameAr: item.product.nameAr, qtyOnHand: item.qtyOnHand },
        newData: { nameAr: item.product.nameAr, qtyOnHand: qtyAfter, delta },
      });

      return {
        success: true,
        message: `تم تعديل مخزون "${item.product.nameAr}" من ${item.qtyOnHand} إلى ${qtyAfter} ${item.product.unit} وتوثيق الحركة المخزنية.`,
      };
    }

    case "CREATE_NEWS_POST": {
      const denied = assertActionPermission(
        ctx,
        PERMISSIONS.CMS_CREATE,
        settings.commandScopes.cms,
        settings
      );
      if (denied) return { success: false, message: denied };

      const title = String(p.title ?? "").trim().slice(0, 120);
      const content = String(p.content ?? "").trim().slice(0, 2500);
      if (content.length < 3) {
        return { success: false, message: "محتوى الخبر قصير جداً" };
      }

      const created = await prisma.newsPost.create({
        data: {
          authorId: ctx.userId,
          type: "TEXT",
          title: title || null,
          content,
          isPublished: true,
        },
      });

      await auditLog({
        userId: ctx.userId,
        action: "SECRETARY_COMMAND",
        entity: "NewsPost",
        entityId: created.id,
        newData: { title: created.title, isPublished: true },
      });

      return {
        success: true,
        message: `تم نشر الخبر بنجاح في قسم الأخبار والمجتمع!`,
      };
    }

    case "CREATE_EXPENSE": {
      const denied = assertActionPermission(
        ctx,
        PERMISSIONS.FINANCE_EXPENSES,
        settings.commandScopes.expenses,
        settings
      );
      if (denied) return { success: false, message: denied };

      const amount = Number(p.amount);
      const category = String(p.category ?? "OTHER") as ExpenseCategory;
      const description = String(p.description ?? "").trim();
      if (!Number.isFinite(amount) || amount <= 0 || !EXPENSE_LABELS[category]) {
        return { success: false, message: "بيانات المصروف غير صالحة" };
      }

      let branchId = ctx.branchId;
      if (!branchId) {
        const defaultBranch = await prisma.branch.findFirst({
          where: { isActive: true },
          select: { id: true },
        });
        branchId = defaultBranch?.id ?? null;
      }
      if (!branchId) {
        return { success: false, message: "لا يوجد فرع فعّال لربط المصروف به" };
      }

      const created = await prisma.expense.create({
        data: {
          branchId,
          category,
          amount,
          description: description || EXPENSE_LABELS[category],
          date: new Date(),
          recordedBy: ctx.userId,
        },
      });

      await auditLog({
        userId: ctx.userId,
        action: "SECRETARY_COMMAND",
        entity: "Expense",
        entityId: created.id,
        newData: { category, amount, description: created.description },
      });

      return {
        success: true,
        message: `تم تسجيل المصروف (${EXPENSE_LABELS[category]}) بقيمة ${formatCurrency(amount)} بنجاح.`,
      };
    }

    default:
      return { success: false, message: "نوع الأمر غير مدعوم" };
  }
}

