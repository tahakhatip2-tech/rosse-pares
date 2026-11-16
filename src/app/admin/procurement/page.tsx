"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import {
  ShoppingCart,
  Truck,
  FileText,
  Search,
  Plus,
  X,
  Eye,
  RefreshCw,
  AlertCircle,
  Loader2,
  Star,
  CheckCircle2,
  Clock,
  Package,
  Building2,
  Phone,
  User,
  CreditCard,
  Send,
  CheckCheck,
  PackageCheck,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type POStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

type InvoiceStatus = "UNPAID" | "PARTIAL" | "PAID";
type PaymentTerms = "NET30" | "NET60" | "IMMEDIATE";

interface Supplier {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  contactName?: string | null;
  phone?: string | null;
  paymentTerms: PaymentTerms;
  creditLimit?: number | null;
  rating?: number | null;
  isActive: boolean;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier?: { nameAr: string; nameEn?: string | null } | null;
  branchId?: string | null;
  branch?: { nameAr: string } | null;
  status: POStatus;
  total: number;
  expectedDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName?: string;
  amount: number;
  taxAmount?: number;
  total: number;
  dueDate?: string | null;
  paidAmount?: number;
  status: InvoiceStatus;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  sku: string;
  unit: string;
  costPrice: number;
}

interface Branch {
  id: string;
  nameAr: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PO_STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: "مسودة",
  SUBMITTED: "بانتظار الموافقة",
  APPROVED: "معتمد",
  PARTIALLY_RECEIVED: "مستلم جزئياً",
  RECEIVED: "مستلم",
  CANCELLED: "ملغي",
};

const PO_STATUS_COLORS: Record<POStatus, string> = {
  DRAFT: "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300",
  SUBMITTED: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  APPROVED: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  PARTIALLY_RECEIVED: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300",
  RECEIVED: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  CANCELLED: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300",
};

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  UNPAID: "غير مدفوعة",
  PARTIAL: "مدفوعة جزئياً",
  PAID: "مدفوعة",
};

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  UNPAID: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300",
  PARTIAL: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  PAID: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
};

const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  NET30: "صافي 30 يوم",
  NET60: "صافي 60 يوم",
  IMMEDIATE: "فوري",
};

function StatusBadge({ status }: { status: POStatus }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${PO_STATUS_COLORS[status]}`}
    >
      {PO_STATUS_LABELS[status]}
    </span>
  );
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${INVOICE_STATUS_COLORS[status]}`}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}

function StarRating({ rating }: { rating: number | null | undefined }) {
  const r = Math.round(rating ?? 0);
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${s <= r ? "text-amber-400 fill-amber-400" : "text-stone-300 dark:text-stone-600"}`}
        />
      ))}
    </span>
  );
}

// ─── New PO Modal ─────────────────────────────────────────────────────────────

interface NewPOModalProps {
  suppliers: Supplier[];
  branches: Branch[];
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

interface POLineItem {
  productId: string;
  qty: string;
  unitCost: string;
}

function NewPOModal({ suppliers, branches, products, onClose, onSaved }: NewPOModalProps) {
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<POLineItem[]>([{ productId: "", qty: "1", unitCost: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLine = () => setLines((prev) => [...prev, { productId: "", qty: "1", unitCost: "" }]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof POLineItem, val: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      // Auto-fill unitCost from product
      if (field === "productId" && val) {
        const p = products.find((pr) => pr.id === val);
        if (p) next[i].unitCost = String(p.costPrice);
      }
      return next;
    });
  };

  const total = lines.reduce((acc, l) => {
    const q = parseFloat(l.qty) || 0;
    const c = parseFloat(l.unitCost) || 0;
    return acc + q * c;
  }, 0);

  const handleSubmit = async () => {
    if (!supplierId) { setError("يرجى اختيار المورد"); return; }
    if (lines.some((l) => !l.productId || !l.qty)) { setError("يرجى إكمال بيانات الأصناف"); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          branchId: branchId || undefined,
          expectedDate: expectedDate || undefined,
          notes: notes.trim() || undefined,
          items: lines.map((l) => ({
            productId: l.productId,
            qty: parseFloat(l.qty),
            unitCost: parseFloat(l.unitCost) || 0,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || "فشل إنشاء أمر الشراء");
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-6 py-4 shrink-0">
          <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-amber-600" />
            إنشاء أمر شراء جديد
          </h3>
          <button onClick={onClose} disabled={submitting} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">المورد *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                <option value="">-- اختر المورد --</option>
                {suppliers.filter((s) => s.isActive).map((s) => (
                  <option key={s.id} value={s.id}>{s.nameAr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">الفرع</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                <option value="">-- الفرع الرئيسي --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.nameAr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">تاريخ الاستلام المتوقع</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">ملاحظات</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                placeholder="ملاحظات اختيارية..."
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">الأصناف *</label>
              <button
                type="button"
                onClick={addLine}
                disabled={submitting}
                className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-3 h-3" /> إضافة صنف
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_90px_28px] gap-2 items-center">
                  <select
                    value={line.productId}
                    onChange={(e) => updateLine(i, "productId", e.target.value)}
                    disabled={submitting}
                    className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  >
                    <option value="">-- المنتج --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.nameAr} ({p.sku})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    placeholder="الكمية"
                    value={line.qty}
                    onChange={(e) => updateLine(i, "qty", e.target.value)}
                    disabled={submitting}
                    className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-center text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="سعر الوحدة"
                    value={line.unitCost}
                    onChange={(e) => updateLine(i, "unitCost", e.target.value)}
                    disabled={submitting}
                    className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-center text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={submitting || lines.length === 1}
                    className="text-stone-400 hover:text-red-500 disabled:opacity-30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                الإجمالي: <span className="text-amber-600 font-mono">{formatCurrency(total)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-stone-200 dark:border-stone-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>حفظ كمسودة</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Supplier Modal ───────────────────────────────────────────────────────

interface NewSupplierModalProps {
  onClose: () => void;
  onSaved: () => void;
  initialData?: Supplier | null;
}

function NewSupplierModal({ onClose, onSaved, initialData }: NewSupplierModalProps) {
  const [nameAr, setNameAr] = useState(initialData?.nameAr ?? "");
  const [nameEn, setNameEn] = useState(initialData?.nameEn ?? "");
  const [contactName, setContactName] = useState(initialData?.contactName ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(initialData?.paymentTerms ?? "NET30");
  const [creditLimit, setCreditLimit] = useState(String(initialData?.creditLimit ?? ""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!nameAr.trim()) { setError("يرجى إدخال اسم المورد بالعربية"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const url = initialData ? `/api/suppliers/${initialData.id}` : "/api/suppliers";
      const method = initialData ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: nameAr.trim(),
          nameEn: nameEn.trim() || undefined,
          contactName: contactName.trim() || undefined,
          phone: phone.trim() || undefined,
          paymentTerms,
          creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || "فشل الحفظ");
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-6 py-4">
          <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" />
            {initialData ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
          </h3>
          <button onClick={onClose} disabled={submitting} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">الاسم بالعربية *</label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">الاسم بالإنجليزية</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">اسم جهة الاتصال</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">شروط الدفع</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                {(Object.keys(PAYMENT_TERMS_LABELS) as PaymentTerms[]).map((k) => (
                  <option key={k} value={k}>{PAYMENT_TERMS_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">حد الائتمان (د.أ)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>{initialData ? "حفظ التعديلات" : "إضافة المورد"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Invoice Modal ────────────────────────────────────────────────────────

interface NewInvoiceModalProps {
  suppliers: Supplier[];
  onClose: () => void;
  onSaved: () => void;
}

function NewInvoiceModal({ suppliers, onClose, onSaved }: NewInvoiceModalProps) {
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = (parseFloat(amount) || 0) + (parseFloat(taxAmount) || 0);

  const handleSubmit = async () => {
    if (!supplierId || !invoiceNumber.trim() || !amount) {
      setError("يرجى إدخال جميع البيانات المطلوبة");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/supplier-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          invoiceNumber: invoiceNumber.trim(),
          amount: parseFloat(amount),
          taxAmount: parseFloat(taxAmount) || 0,
          dueDate: dueDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || "فشل الحفظ");
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-6 py-4">
          <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            فاتورة مورد جديدة
          </h3>
          <button onClick={onClose} disabled={submitting} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">المورد *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value="">-- اختر المورد --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.nameAr}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">رقم الفاتورة *</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">المبلغ (د.أ) *</label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">الضريبة (د.أ)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-stone-500">
            <span>الإجمالي:</span>
            <span className="font-mono font-bold text-amber-600">{formatCurrency(total)}</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">تاريخ الاستحقاق</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>إضافة الفاتورة</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = "orders" | "suppliers" | "invoices";

const PO_STATUS_FILTERS: Array<{ key: POStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "الكل" },
  { key: "DRAFT", label: "مسودة" },
  { key: "SUBMITTED", label: "بانتظار الموافقة" },
  { key: "APPROVED", label: "معتمد" },
  { key: "PARTIALLY_RECEIVED", label: "مستلم جزئياً" },
  { key: "RECEIVED", label: "مستلم" },
  { key: "CANCELLED", label: "ملغي" },
];

export default function ProcurementPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("orders");

  // PO state
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [poStatusFilter, setPoStatusFilter] = useState<POStatus | "ALL">("ALL");
  const [poSearch, setPoSearch] = useState("");
  const [showNewPO, setShowNewPO] = useState(false);

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [suppliersError, setSuppliersError] = useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Invoices state
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  // Supporting data
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // ── Fetch ──

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const res = await fetch("/api/purchases?limit=100", { cache: "no-store" });
      if (!res.ok) throw new Error(`خطأ ${res.status}`);
      const json = await res.json();
      const list: PurchaseOrder[] = Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
          ? json.data
          : [];
      setOrders(list);
    } catch (err: unknown) {
      setOrdersError(err instanceof Error ? err.message : "فشل تحميل أوامر الشراء");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    setSuppliersLoading(true);
    setSuppliersError(null);
    try {
      const res = await fetch("/api/suppliers?limit=200", { cache: "no-store" });
      if (!res.ok) throw new Error(`خطأ ${res.status}`);
      const json = await res.json();
      const list: Supplier[] = Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
          ? json.data
          : [];
      setSuppliers(list);
    } catch (err: unknown) {
      setSuppliersError(err instanceof Error ? err.message : "فشل تحميل الموردين");
    } finally {
      setSuppliersLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    setInvoicesError(null);
    try {
      const res = await fetch("/api/supplier-invoices?limit=100", { cache: "no-store" });
      if (!res.ok) throw new Error(`خطأ ${res.status}`);
      const json = await res.json();
      const list: SupplierInvoice[] = Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
          ? json.data
          : [];
      setInvoices(list);
    } catch (err: unknown) {
      setInvoicesError(err instanceof Error ? err.message : "فشل تحميل الفواتير");
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?limit=500", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const list: Product[] = Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
          ? json.data
          : [];
      setProducts(list);
    } catch { /* ignore */ }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch("/api/branches?limit=50", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const list: Branch[] = Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
          ? json.data
          : [];
      setBranches(list);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchInvoices();
    fetchProducts();
    fetchBranches();
  }, [fetchOrders, fetchSuppliers, fetchInvoices, fetchProducts, fetchBranches]);

  // ── KPIs ──

  const kpis = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = orders.filter((o) => new Date(o.createdAt) >= monthStart);
    const totalThisMonth = monthOrders.length;
    const pendingApproval = orders.filter((o) => o.status === "SUBMITTED").length;
    const receivedValue = orders
      .filter((o) => o.status === "RECEIVED")
      .reduce((acc, o) => acc + (o.total || 0), 0);
    const pendingReceipt = orders.filter(
      (o) => o.status === "APPROVED" || o.status === "PARTIALLY_RECEIVED"
    ).length;
    return { totalThisMonth, pendingApproval, receivedValue, pendingReceipt };
  }, [orders]);

  // ── Filtered lists ──

  const filteredOrders = useMemo(() => {
    const term = poSearch.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus = poStatusFilter === "ALL" || o.status === poStatusFilter;
      const matchSearch =
        !term ||
        o.poNumber?.toLowerCase().includes(term) ||
        o.supplier?.nameAr?.toLowerCase().includes(term) ||
        o.supplier?.nameEn?.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [orders, poStatusFilter, poSearch]);

  const filteredSuppliers = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter(
      (s) =>
        s.nameAr?.toLowerCase().includes(term) ||
        s.nameEn?.toLowerCase().includes(term) ||
        s.contactName?.toLowerCase().includes(term) ||
        s.phone?.includes(term)
    );
  }, [suppliers, supplierSearch]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (inv) => invoiceStatusFilter === "ALL" || inv.status === invoiceStatusFilter
    );
  }, [invoices, invoiceStatusFilter]);

  // ── PO Actions ──

  const handlePOAction = async (
    po: PurchaseOrder,
    action: "submit" | "approve" | "cancel"
  ) => {
    const actionMap = {
      submit: { status: "SUBMITTED", label: "الإرسال للموافقة" },
      approve: { status: "APPROVED", label: "الاعتماد" },
      cancel: { status: "CANCELLED", label: "الإلغاء" },
    };
    const { label } = actionMap[action];
    if (action === "cancel" && !confirm(`هل أنت متأكد من إلغاء أمر الشراء ${po.poNumber}؟`)) return;

    try {
      const res = await fetch(`/api/purchases/${po.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: actionMap[action].status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || `فشل ${label}`);
      await fetchOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `فشل ${label}`);
    }
  };

  const toggleSupplierActive = async (supplier: Supplier) => {
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !supplier.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || "فشل التحديث");
      await fetchSuppliers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل التحديث");
    }
  };

  // ── Tabs ──

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: "orders", label: "أوامر الشراء", icon: <ShoppingCart className="w-4 h-4" /> },
    { key: "suppliers", label: "الموردون", icon: <Truck className="w-4 h-4" /> },
    { key: "invoices", label: "الفواتير", icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-amber-600" />
            <span>المشتريات والموردون</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            إدارة أوامر الشراء، الموردين، وفواتير الموردين
          </p>
        </div>
        <button
          onClick={() => { fetchOrders(); fetchSuppliers(); fetchInvoices(); }}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center gap-2 transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
          <span>تحديث</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800/60 rounded-2xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              tab === t.key
                ? "bg-white dark:bg-stone-900 text-amber-600 shadow-sm"
                : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Orders ─────────────────────────────────────────────────── */}
      {tab === "orders" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "إجمالي أوامر الشراء هذا الشهر",
                value: ordersLoading ? null : kpis.totalThisMonth,
                sub: "أمر شراء مسجّل",
                color: "text-stone-900 dark:text-stone-100",
                icon: <ShoppingCart className="w-4 h-4 text-amber-600" />,
              },
              {
                label: "بانتظار الموافقة",
                value: ordersLoading ? null : kpis.pendingApproval,
                sub: "تحتاج اعتماداً",
                color: "text-amber-600",
                icon: <Clock className="w-4 h-4 text-amber-500" />,
              },
              {
                label: "قيمة الأوامر المستلمة",
                value: ordersLoading ? null : formatCurrency(kpis.receivedValue),
                sub: "إجمالي المستلم",
                color: "text-emerald-600 dark:text-emerald-400 font-mono",
                icon: <PackageCheck className="w-4 h-4 text-emerald-500" />,
              },
              {
                label: "بانتظار الاستلام",
                value: ordersLoading ? null : kpis.pendingReceipt,
                sub: "معتمد / مستلم جزئياً",
                color: "text-blue-600 dark:text-blue-400",
                icon: <Package className="w-4 h-4 text-blue-500" />,
              },
            ].map((kpi, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">{kpi.label}</span>
                  {kpi.icon}
                </div>
                <div className={`text-2xl font-black ${kpi.color}`}>
                  {kpi.value === null ? (
                    <div className="h-8 w-16 bg-stone-200 dark:bg-stone-800 animate-pulse rounded-md" />
                  ) : (
                    kpi.value
                  )}
                </div>
                <span className="text-[11px] text-stone-400">{kpi.sub}</span>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex flex-wrap gap-2">
              {PO_STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setPoStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    poStatusFilter === f.key
                      ? "bg-amber-600 text-white"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث برقم الأمر أو اسم المورد..."
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                onClick={() => setShowNewPO(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>أمر شراء جديد</span>
              </button>
            </div>
          </div>

          {/* Error */}
          {ordersError && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-between text-xs text-red-700 dark:text-red-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{ordersError}</span>
              </div>
              <button
                onClick={fetchOrders}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* PO Table */}
          <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden">
            {ordersLoading ? (
              <div className="p-8 flex items-center justify-center gap-2 text-stone-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التحميل...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <ShoppingCart className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
                <p className="text-sm font-bold text-stone-600 dark:text-stone-300">لا توجد أوامر شراء</p>
                <p className="text-xs text-stone-400">جرب تغيير فلتر الحالة أو مصطلح البحث</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                    <tr>
                      <th className="py-3 px-4">رقم الأمر</th>
                      <th className="py-3 px-4">المورد</th>
                      <th className="py-3 px-4">الفرع</th>
                      <th className="py-3 px-4">الإجمالي</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4">تاريخ التوقع</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {filteredOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                          {po.poNumber}
                        </td>
                        <td className="py-3 px-4 text-stone-700 dark:text-stone-300">
                          {po.supplier?.nameAr ?? "—"}
                        </td>
                        <td className="py-3 px-4 text-stone-500">
                          {po.branch?.nameAr ?? "—"}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                          {formatCurrency(po.total ?? 0)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={po.status} />
                        </td>
                        <td className="py-3 px-4 text-stone-500">
                          {po.expectedDate ? formatDate(po.expectedDate) : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <button
                              onClick={() => router.push(`/admin/procurement/${po.id}`)}
                              className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-[10px] transition inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              عرض
                            </button>
                            {po.status === "DRAFT" && (
                              <button
                                onClick={() => handlePOAction(po, "submit")}
                                className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-700 font-bold text-[10px] transition inline-flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                إرسال
                              </button>
                            )}
                            {po.status === "SUBMITTED" && (
                              <button
                                onClick={() => handlePOAction(po, "approve")}
                                className="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 hover:bg-blue-200 text-blue-700 font-bold text-[10px] transition inline-flex items-center gap-1"
                              >
                                <CheckCheck className="w-3 h-3" />
                                اعتماد
                              </button>
                            )}
                            {(po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED") && (
                              <button
                                onClick={() => router.push(`/admin/procurement/${po.id}`)}
                                className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 text-emerald-700 font-bold text-[10px] transition inline-flex items-center gap-1"
                              >
                                <PackageCheck className="w-3 h-3" />
                                استلام
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Suppliers ───────────────────────────────────────────────── */}
      {tab === "suppliers" && (
        <div className="space-y-6">
          {/* Filter bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث عن مورد..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={() => { setEditingSupplier(null); setShowNewSupplier(true); }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مورد</span>
            </button>
          </div>

          {/* Error */}
          {suppliersError && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-between text-xs text-red-700 dark:text-red-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{suppliersError}</span>
              </div>
              <button
                onClick={fetchSuppliers}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Suppliers Table */}
          <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden">
            {suppliersLoading ? (
              <div className="p-8 flex items-center justify-center gap-2 text-stone-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التحميل...</span>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Truck className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
                <p className="text-sm font-bold text-stone-600 dark:text-stone-300">لا يوجد موردون</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                    <tr>
                      <th className="py-3 px-4">المورد</th>
                      <th className="py-3 px-4">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />جهة الاتصال</span>
                      </th>
                      <th className="py-3 px-4">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />الهاتف</span>
                      </th>
                      <th className="py-3 px-4">
                        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />شروط الدفع</span>
                      </th>
                      <th className="py-3 px-4">حد الائتمان</th>
                      <th className="py-3 px-4">التقييم</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {filteredSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900 dark:text-stone-100">{s.nameAr}</div>
                          {s.nameEn && <div className="text-[10px] text-stone-400">{s.nameEn}</div>}
                        </td>
                        <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                          {s.contactName ?? "—"}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-500">
                          {s.phone ?? "—"}
                        </td>
                        <td className="py-3 px-4 text-stone-500">
                          {PAYMENT_TERMS_LABELS[s.paymentTerms] ?? s.paymentTerms}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-600 dark:text-stone-300">
                          {s.creditLimit != null ? formatCurrency(s.creditLimit) : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <StarRating rating={s.rating} />
                        </td>
                        <td className="py-3 px-4">
                          {s.isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> نشط
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 text-[10px] font-bold">
                              غير نشط
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setEditingSupplier(s); setShowNewSupplier(true); }}
                              className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-[10px] transition"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => toggleSupplierActive(s)}
                              className={`px-2 py-1 rounded-lg font-bold text-[10px] transition ${
                                s.isActive
                                  ? "bg-red-100 dark:bg-red-950/60 text-red-600 hover:bg-red-200"
                                  : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 hover:bg-emerald-200"
                              }`}
                            >
                              {s.isActive ? "إيقاف" : "تفعيل"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Invoices ─────────────────────────────────────────────────── */}
      {tab === "invoices" && (
        <div className="space-y-6">
          {/* Filter bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex gap-2 flex-wrap flex-1">
              {(["ALL", "UNPAID", "PARTIAL", "PAID"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setInvoiceStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    invoiceStatusFilter === s
                      ? "bg-amber-600 text-white"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                  }`}
                >
                  {s === "ALL" ? "الكل" : INVOICE_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowNewInvoice(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>فاتورة مورد جديدة</span>
            </button>
          </div>

          {/* Error */}
          {invoicesError && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-between text-xs text-red-700 dark:text-red-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{invoicesError}</span>
              </div>
              <button
                onClick={fetchInvoices}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Invoices Table */}
          <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden">
            {invoicesLoading ? (
              <div className="p-8 flex items-center justify-center gap-2 text-stone-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التحميل...</span>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <FileText className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
                <p className="text-sm font-bold text-stone-600 dark:text-stone-300">لا توجد فواتير</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                    <tr>
                      <th className="py-3 px-4">رقم الفاتورة</th>
                      <th className="py-3 px-4">المورد</th>
                      <th className="py-3 px-4">المبلغ</th>
                      <th className="py-3 px-4">الضريبة</th>
                      <th className="py-3 px-4">الإجمالي</th>
                      <th className="py-3 px-4">تاريخ الاستحقاق</th>
                      <th className="py-3 px-4">المدفوع</th>
                      <th className="py-3 px-4">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 text-stone-700 dark:text-stone-300">
                          {inv.supplierName ?? "—"}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-600 dark:text-stone-300">
                          {formatCurrency(inv.amount ?? 0)}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-500">
                          {formatCurrency(inv.taxAmount ?? 0)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                          {formatCurrency(inv.total ?? 0)}
                        </td>
                        <td className="py-3 px-4 text-stone-500">
                          {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(inv.paidAmount ?? 0)}
                        </td>
                        <td className="py-3 px-4">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modals ───────────────────────────────────────────────────────── */}
      {showNewPO && (
        <NewPOModal
          suppliers={suppliers}
          branches={branches}
          products={products}
          onClose={() => setShowNewPO(false)}
          onSaved={fetchOrders}
        />
      )}
      {showNewSupplier && (
        <NewSupplierModal
          onClose={() => { setShowNewSupplier(false); setEditingSupplier(null); }}
          onSaved={fetchSuppliers}
          initialData={editingSupplier}
        />
      )}
      {showNewInvoice && (
        <NewInvoiceModal
          suppliers={suppliers}
          onClose={() => setShowNewInvoice(false)}
          onSaved={fetchInvoices}
        />
      )}
    </div>
  );
}
