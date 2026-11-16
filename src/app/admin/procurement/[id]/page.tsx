"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ShoppingCart,
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileCheck2,
  Package,
  Layers,
  Send,
  CheckCheck,
  PackageCheck,
  RefreshCw,
  Plus,
  Loader2,
  Phone,
  Mail,
  User,
  Hash,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dates";

type POStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

interface POProduct {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  sku: string;
  images?: string[];
  unit?: string;
}

interface POItem {
  id: string;
  productId: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: number;
  total: number;
  unit: string;
  product?: POProduct | null;
}

interface GoodsReceiptItem {
  productId: string;
  qtyReceived: number;
  qtyRejected?: number;
  lotNumber?: string;
  expiryDate?: string;
}

interface GoodsReceipt {
  id: string;
  grNumber: string;
  warehouseId: string;
  receivedBy: string;
  notes?: string | null;
  items: GoodsReceiptItem[];
  createdAt: string;
}

interface PurchaseOrderDetail {
  id: string;
  poNumber: string;
  status: POStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  expectedDate?: string | null;
  notes?: string | null;
  createdAt: string;
  supplierId: string;
  branchId: string;
  supplier: {
    id: string;
    nameAr: string;
    nameEn?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  branch?: {
    id: string;
    nameAr: string;
    nameEn?: string | null;
  } | null;
  items: POItem[];
  receipts: GoodsReceipt[];
}

interface Warehouse {
  id: string;
  nameAr: string;
  nameEn?: string;
}

const STATUS_CONFIG: Record<
  POStatus,
  { label: string; bg: string; text: string; icon: any }
> = {
  DRAFT: {
    label: "مسودة",
    bg: "bg-stone-100 dark:bg-stone-800",
    text: "text-stone-700 dark:text-stone-300",
    icon: Clock,
  },
  SUBMITTED: {
    label: "بانتظار الموافقة",
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    icon: Send,
  },
  APPROVED: {
    label: "معتمد للشراء",
    bg: "bg-blue-100 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    icon: CheckCheck,
  },
  PARTIALLY_RECEIVED: {
    label: "مستلم جزئياً",
    bg: "bg-purple-100 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-400",
    icon: Package,
  },
  RECEIVED: {
    label: "مستلم بالكامل",
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "ملغي",
    bg: "bg-rose-100 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    icon: XCircle,
  },
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [po, setPo] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Receive Modal
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [receiveInputs, setReceiveInputs] = useState<
    Record<string, { qty: number; rejected: number; lot: string; expiry: string }>
  >({});
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

  const fetchPO = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchases/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPo(json.data);
      } else {
        setError(json.error || "تعذر العثور على أمر الشراء");
      }
    } catch (err: any) {
      console.error(err);
      setError("حدث خطأ في تحميل بيانات أمر الشراء");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPO();
  }, [fetchPO]);

  // Load warehouses for receive modal
  useEffect(() => {
    async function loadWarehouses() {
      try {
        const res = await fetch("/api/inventory/warehouses");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setWarehouses(json.data);
          if (json.data.length > 0) {
            setSelectedWarehouseId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadWarehouses();
  }, []);

  const handleAction = async (action: "submit" | "approve" | "cancel") => {
    if (!id) return;
    const confirmMessages: Record<string, string> = {
      submit: "هل تريد إرسال أمر الشراء للاعتماد والموافقة؟",
      approve: "هل تريد اعتماد وتأكيد أمر الشراء؟",
      cancel: "هل أنت متأكد من رغبتك في إلغاء أمر الشراء هذا؟",
    };

    if (!window.confirm(confirmMessages[action])) return;

    setActionLoading(true);
    try {
      const payload: any = { action };
      if (action === "approve") {
        payload.approvedBy = "current-user";
      }

      const res = await fetch(`/api/purchases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        await fetchPO();
      } else {
        alert(json.error || "فشل تنفيذ الإجراء");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ في الشبكة");
    } finally {
      setActionLoading(false);
    }
  };

  const openReceiveModal = () => {
    if (!po) return;
    const initialInputs: Record<
      string,
      { qty: number; rejected: number; lot: string; expiry: string }
    > = {};

    po.items.forEach((item) => {
      const remaining = Math.max(0, item.qtyOrdered - item.qtyReceived);
      initialInputs[item.productId] = {
        qty: remaining,
        rejected: 0,
        lot: "",
        expiry: "",
      };
    });

    setReceiveInputs(initialInputs);
    setReceiveNotes("");
    setShowReceiveModal(true);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!po || !selectedWarehouseId) {
      alert("يرجى اختيار المستودع");
      return;
    }

    const itemsToReceive = Object.entries(receiveInputs)
      .filter(([_, val]) => val.qty > 0)
      .map(([productId, val]) => ({
        productId,
        qtyReceived: Number(val.qty),
        qtyRejected: Number(val.rejected) || 0,
        lotNumber: val.lot.trim() || undefined,
        expiryDate: val.expiry ? new Date(val.expiry).toISOString() : undefined,
      }));

    if (itemsToReceive.length === 0) {
      alert("يرجى إدخال كمية مستلمة أكبر من صفر لعنصر واحد على الأقل");
      return;
    }

    setReceiveSubmitting(true);
    try {
      const res = await fetch(`/api/purchases/${po.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: selectedWarehouseId,
          items: itemsToReceive,
          notes: receiveNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowReceiveModal(false);
        await fetchPO();
      } else {
        alert(json.error || "فشل استلام البضاعة");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ في الشبكة أثناء حفظ الاستلام");
    } finally {
      setReceiveSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        <p className="text-sm text-stone-500 font-medium">جاري تحميل تفاصيل أمر الشراء...</p>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
          {error || "أمر الشراء غير متوفر"}
        </h2>
        <Link
          href="/admin/procurement"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لإدارة المشتريات</span>
        </Link>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[po.status]?.icon || Clock;
  const statusCfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.DRAFT;

  const totalOrderedQty = po.items.reduce((s, it) => s + it.qtyOrdered, 0);
  const totalReceivedQty = po.items.reduce((s, it) => s + it.qtyReceived, 0);
  const receiptProgress =
    totalOrderedQty > 0 ? Math.round((totalReceivedQty / totalOrderedQty) * 100) : 0;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
            <Link
              href="/admin/procurement"
              className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>المشتريات والموردين</span>
            </Link>
            <span>/</span>
            <span className="text-stone-700 dark:text-stone-300 font-bold">{po.poNumber}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Hash className="w-6 h-6 text-amber-600" />
              <span>أمر شراء: {po.poNumber}</span>
            </h1>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.text}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusCfg.label}</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/procurement"
            className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-1.5"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع</span>
          </Link>

          <button
            onClick={fetchPO}
            disabled={actionLoading}
            title="تحديث البيانات"
            className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading ? "animate-spin" : ""}`} />
          </button>

          {/* DRAFT -> SUBMIT */}
          {po.status === "DRAFT" && (
            <button
              onClick={() => handleAction("submit")}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>إرسال للموافقة</span>
            </button>
          )}

          {/* SUBMITTED -> APPROVE */}
          {po.status === "SUBMITTED" && (
            <button
              onClick={() => handleAction("approve")}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              <span>اعتماد أمر الشراء</span>
            </button>
          )}

          {/* APPROVED / PARTIALLY_RECEIVED -> RECEIVE */}
          {(po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED") && (
            <button
              onClick={openReceiveModal}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <PackageCheck className="w-4 h-4" />
              <span>استلام البضاعة بالمستودع</span>
            </button>
          )}

          {/* CANCEL ACTION */}
          {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
            <button
              onClick={() => handleAction("cancel")}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>إلغاء الأمر</span>
            </button>
          )}
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Supplier Info */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-stone-400 text-xs font-medium">
            <Truck className="w-4 h-4 text-amber-600" />
            <span>بيانات المورد</span>
          </div>

          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {po.supplier.nameAr}
            </h3>
            {po.supplier.nameEn && (
              <p className="text-xs text-stone-400 font-mono">{po.supplier.nameEn}</p>
            )}
          </div>

          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2 text-xs">
            {po.supplier.phone && (
              <div className="flex items-center justify-between">
                <span className="text-stone-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>الهاتف:</span>
                </span>
                <a
                  href={`tel:${po.supplier.phone}`}
                  className="font-mono text-amber-600 font-bold hover:underline"
                >
                  {po.supplier.phone}
                </a>
              </div>
            )}
            {po.supplier.email && (
              <div className="flex items-center justify-between">
                <span className="text-stone-400 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>البريد:</span>
                </span>
                <span className="font-mono text-stone-700 dark:text-stone-300">
                  {po.supplier.email}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* PO Logistics & Branch */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-stone-400 text-xs font-medium">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>الفرع والتواريخ</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800">
              <span className="text-stone-400">الفرع المستلم:</span>
              <span className="font-bold text-stone-800 dark:text-stone-200">
                {po.branch?.nameAr || "الفرع الرئيسي"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800">
              <span className="text-stone-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>تاريخ الإنشاء:</span>
              </span>
              <span className="font-medium text-stone-700 dark:text-stone-300">
                {formatDate(po.createdAt)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-stone-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>التاريخ المتوقع للاستلام:</span>
              </span>
              <span className="font-medium text-amber-600">
                {po.expectedDate ? formatDate(po.expectedDate) : "غير محدد"}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-stone-400 text-xs font-medium">
            <FileCheck2 className="w-4 h-4 text-amber-600" />
            <span>الملخص المالي والنسب</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-400">المجموع الفرعي:</span>
              <span className="font-bold text-stone-700 dark:text-stone-300">
                {formatCurrency(po.subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-400">ضريبة المبيعات (16%):</span>
              <span className="font-bold text-stone-700 dark:text-stone-300">
                {formatCurrency(po.taxAmount)}
              </span>
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                الإجمالي الكلي:
              </span>
              <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                {formatCurrency(po.total)}
              </span>
            </div>

            {/* Receipt progress */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-stone-400">نسبة الاستلام بالمستودع:</span>
                <span className="font-bold text-stone-700 dark:text-stone-300">
                  {receiptProgress}% ({totalReceivedQty} من {totalOrderedQty})
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, receiptProgress)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes if available */}
      {po.notes && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300">
          <span className="font-bold ml-1">ملاحظات أمر الشراء:</span>
          <span>{po.notes}</span>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <span>أصناف ومواد البناء المطلوبة ({po.items.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-50 dark:bg-stone-850 text-stone-500 font-semibold border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">الصنف / المادة</th>
                <th className="py-3 px-4">الرمز (SKU)</th>
                <th className="py-3 px-4">الوحدة</th>
                <th className="py-3 px-4">الكمية المطلوبة</th>
                <th className="py-3 px-4">الكمية المستلمة</th>
                <th className="py-3 px-4">نسبة الإنجاز</th>
                <th className="py-3 px-4">سعر الوحدة</th>
                <th className="py-3 px-4">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {po.items.map((item, idx) => {
                const percent =
                  item.qtyOrdered > 0
                    ? Math.round((item.qtyReceived / item.qtyOrdered) * 100)
                    : 0;

                return (
                  <tr key={item.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-stone-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-stone-100">
                      {item.product?.nameAr || "مادة بناء مسجلة"}
                      {item.product?.nameEn && (
                        <span className="block text-[11px] font-normal text-stone-400 font-mono">
                          {item.product.nameEn}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-500">
                      {item.product?.sku || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600 dark:text-stone-400">
                      {item.unit || "قطعة"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-800 dark:text-stone-200">
                      {item.qtyOrdered}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold ${
                          item.qtyReceived >= item.qtyOrdered
                            ? "text-emerald-600"
                            : item.qtyReceived > 0
                            ? "text-purple-600"
                            : "text-stone-400"
                        }`}
                      >
                        {item.qtyReceived}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              percent >= 100 ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-stone-500">{percent}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-700 dark:text-stone-300">
                      {formatCurrency(item.unitCost)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goods Receipts Log Section */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            <span>سندات الاستلام المخزني ({po.receipts?.length || 0})</span>
          </h2>

          {(po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED") && (
            <button
              onClick={openReceiveModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تسجيل استلام جديد</span>
            </button>
          )}
        </div>

        {(!po.receipts || po.receipts.length === 0) ? (
          <div className="p-8 text-center text-xs text-stone-400">
            لم يتم تسجيل أي استلام مخزني لهذا الأمر حتى الآن.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {po.receipts.map((rec) => (
              <div key={rec.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-stone-900 dark:text-stone-100 font-mono">
                      {rec.grNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-[11px] font-bold">
                      تم الاستلام بالمستودع
                    </span>
                  </div>

                  <span className="text-xs text-stone-400">
                    {formatDate(rec.createdAt)}
                  </span>
                </div>

                {rec.notes && (
                  <p className="text-xs text-stone-500 italic bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-xl">
                    ملاحظات: {rec.notes}
                  </p>
                )}

                {/* Items received summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {rec.items?.map((rit, rIdx) => {
                    const matchedItem = po.items.find((i) => i.productId === rit.productId);
                    return (
                      <div
                        key={rIdx}
                        className="p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850 flex items-center justify-between"
                      >
                        <span className="font-bold text-stone-800 dark:text-stone-200 truncate ml-2">
                          {matchedItem?.product?.nameAr || "مادة بناء"}
                        </span>
                        <div className="text-left font-mono shrink-0">
                          <span className="text-emerald-600 font-bold">+{rit.qtyReceived}</span>
                          <span className="text-stone-400 mr-1">{matchedItem?.unit || "قطعة"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <span>استلام مواد البناء بمستودع الأمر ({po.poNumber})</span>
              </h3>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
              {/* Warehouse Selection */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  المستودع المستلم:
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-bold focus:ring-2 focus:ring-amber-500"
                  required
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nameAr} ({w.nameEn || "مستودع مواد بناء"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Table in Modal */}
              <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800 text-stone-500">
                    <tr>
                      <th className="p-2.5">المادة</th>
                      <th className="p-2.5">المطلوب</th>
                      <th className="p-2.5">المستلم سابقاً</th>
                      <th className="p-2.5">الكمية المستلمة الآن</th>
                      <th className="p-2.5">رقم التشغيلة (Lot)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {po.items.map((it) => {
                      const remaining = Math.max(0, it.qtyOrdered - it.qtyReceived);
                      const curVal = receiveInputs[it.productId] || {
                        qty: remaining,
                        rejected: 0,
                        lot: "",
                        expiry: "",
                      };

                      return (
                        <tr key={it.id}>
                          <td className="p-2.5 font-bold">
                            {it.product?.nameAr || "مادة بناء"}
                            <span className="block text-[10px] text-stone-400 font-normal">
                              لكل {it.unit}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold">{it.qtyOrdered}</td>
                          <td className="p-2.5 text-stone-400">{it.qtyReceived}</td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="0"
                              max={remaining * 2} // allow over-delivery slightly if needed
                              step="any"
                              value={curVal.qty}
                              onChange={(e) =>
                                setReceiveInputs((prev) => ({
                                  ...prev,
                                  [it.productId]: {
                                    ...curVal,
                                    qty: parseFloat(e.target.value) || 0,
                                  },
                                }))
                              }
                              className="w-24 p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold text-center text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              placeholder="اختياري"
                              value={curVal.lot}
                              onChange={(e) =>
                                setReceiveInputs((prev) => ({
                                  ...prev,
                                  [it.productId]: {
                                    ...curVal,
                                    lot: e.target.value,
                                  },
                                }))
                              }
                              className="w-28 p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  ملاحظات الاستلام والفحص:
                </label>
                <textarea
                  rows={2}
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="حالة الشحنة، مطابقة المواصفات، سلامة الأكياس أو الحاويات..."
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  disabled={receiveSubmitting}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold text-stone-600 dark:text-stone-300"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={receiveSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md flex items-center gap-2"
                >
                  {receiveSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري إدخال البضاعة للمخزون...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد الاستلام وتحديث المخزون</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
