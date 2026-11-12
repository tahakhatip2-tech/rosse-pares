"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  Calculator,
  CheckCircle2,
  Banknote,
  Printer,
  Edit3,
  Loader2,
  ShieldAlert,
  X,
  Save,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { PAYROLL_STATUS_META } from "@/lib/hr";
import type { HrPayrollRecord, HrPayrollTotals } from "./types";

const ARABIC_MONTHS = [
  "يناير (1)",
  "فبراير (2)",
  "مارس (3)",
  "أبريل (4)",
  "مايو (5)",
  "يونيو (6)",
  "يوليو (7)",
  "أغسطس (8)",
  "سبتمبر (9)",
  "أكتوبر (10)",
  "نوفمبر (11)",
  "ديسمبر (12)",
];

export function PayrollTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [records, setRecords] = useState<HrPayrollRecord[]>([]);
  const [totals, setTotals] = useState<HrPayrollTotals>({
    baseTotal: 0,
    overtimeTotal: 0,
    bonusTotal: 0,
    deductionTotal: 0,
    netTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [editSlip, setEditSlip] = useState<{
    record: HrPayrollRecord;
    overtimePay: string;
    bonuses: string;
    deductions: string;
    notes: string;
  } | null>(null);

  const [printSlip, setPrintSlip] = useState<HrPayrollRecord | null>(null);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const res = await fetch(`/api/hr/payroll?month=${month}&year=${year}`);
      if (res.status === 403) {
        setForbidden(true);
        setRecords([]);
        return;
      }
      const json = await res.json();
      if (res.ok && json?.success) {
        setRecords(json.data.records || []);
        setTotals(
          json.data.totals || {
            baseTotal: 0,
            overtimeTotal: 0,
            bonusTotal: 0,
            deductionTotal: 0,
            netTotal: 0,
          }
        );
      }
    } catch {
      // Safe fallback
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void loadPayroll();
  }, [loadPayroll]);

  const runAction = async (
    action: "GENERATE" | "APPROVE" | "MARK_PAID" | "UPDATE_SLIP",
    extra?: Record<string, unknown>
  ) => {
    setBusyAction(true);
    setNotice(null);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, month, year, ...extra }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setNotice(json?.error || "تعذر تنفيذ العملية");
        return false;
      }
      await loadPayroll();
      if (action === "GENERATE") {
        setNotice(`تم احتساب وتحديث مسير رواتب ${month}/${year} بنجاح.`);
      } else if (action === "APPROVE") {
        setNotice("تم اعتماد جميع مسودات الرواتب لهذا الشهر.");
      } else if (action === "MARK_PAID") {
        setNotice("تم تأكيد صرف الرواتب وتسجيلها ضمن المصاريف.");
      }
      return true;
    } catch {
      setNotice("تعذر الاتصال بالخادم");
      return false;
    } finally {
      setBusyAction(false);
    }
  };

  if (forbidden) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
        <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
          صلاحية مقيدة على الإدارة المالية
        </h4>
        <p className="text-xs text-stone-500">
          عرض واعتماد مسيرات الرواتب متاح لصاحب الشركة ومدير النظام فقط (`payroll:view`).
        </p>
      </div>
    );
  }

  const hasDraft = records.some((r) => r.status === "DRAFT");
  const hasUnpaid = records.some((r) => r.status !== "PAID");

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Wallet className="w-4 h-4 text-amber-600" />
          <span className="font-bold text-stone-700 dark:text-stone-300">
            الشهر المالي:
          </span>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-bold"
          >
            {ARABIC_MONTHS.map((label, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono font-bold"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busyAction}
            onClick={() => runAction("GENERATE")}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Calculator className="w-4 h-4" />
            <span>احتساب / تحديث المسير</span>
          </button>

          {hasDraft && (
            <button
              type="button"
              disabled={busyAction}
              onClick={() => runAction("APPROVE")}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد المسير</span>
            </button>
          )}

          {records.length > 0 && hasUnpaid && (
            <button
              type="button"
              disabled={busyAction}
              onClick={() => {
                if (
                  confirm(
                    "تأكيد صرف جميع رواتب هذا الشهر وتسجيل الإجمالي في مصروفات الرواتب؟"
                  )
                ) {
                  void runAction("MARK_PAID", { recordExpense: true });
                }
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Banknote className="w-4 h-4" />
              <span>صرف الرواتب</span>
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {/* Summary Strip */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <span className="text-stone-400 block">إجمالي الأساسي</span>
            <strong className="font-mono text-sm text-stone-900 dark:text-white">
              {formatCurrency(totals.baseTotal)}
            </strong>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <span className="text-stone-400 block">إضافي ومكافآت</span>
            <strong className="font-mono text-sm text-emerald-600">
              +{formatCurrency(totals.overtimeTotal + totals.bonusTotal)}
            </strong>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <span className="text-stone-400 block">الخصومات</span>
            <strong className="font-mono text-sm text-red-600">
              -{formatCurrency(totals.deductionTotal)}
            </strong>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <span className="text-amber-800 dark:text-amber-300 block">
              صافي الرواتب المستحق
            </span>
            <strong className="font-mono text-base font-black text-amber-700 dark:text-amber-400">
              {formatCurrency(totals.netTotal)}
            </strong>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-14 flex flex-col items-center justify-center gap-2 text-xs text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            <span>جاري تحميل مسير الرواتب...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="py-14 text-center space-y-2 text-xs text-stone-500">
            <p>لم يتم توليد مسير رواتب لشهر {month}/{year} بعد.</p>
            <p className="text-[11px] text-stone-400">
              اضغط على «احتساب / تحديث المسير» أعلاه لاحتساب الرواتب تلقائياً من الحضور والإجازات.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                <tr>
                  <th className="py-3 px-4">الموظف</th>
                  <th className="py-3 px-4">أيام الحضور / الغياب</th>
                  <th className="py-3 px-4">الأساسي</th>
                  <th className="py-3 px-4">إضافي ومكافآت</th>
                  <th className="py-3 px-4">الخصومات</th>
                  <th className="py-3 px-4">الصافي</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {records.map((r) => {
                  const meta = PAYROLL_STATUS_META[r.status];
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-stone-50/70 dark:hover:bg-stone-800/30 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900 dark:text-stone-100">
                          {r.employee?.nameAr || "موظف"}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {r.employee?.jobTitle}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className="text-emerald-600 font-bold">
                          {r.workedDays} يوم
                        </span>{" "}
                        {r.absentDays > 0 && (
                          <span className="text-red-500 font-bold">
                            / {r.absentDays} غياب
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {formatCurrency(r.baseSalary)}
                      </td>

                      <td className="py-3 px-4 font-mono text-emerald-600 font-bold">
                        +{formatCurrency(r.overtimePay + r.bonuses)}
                      </td>

                      <td className="py-3 px-4 font-mono text-red-600 font-bold">
                        -{formatCurrency(r.deductions)}
                      </td>

                      <td className="py-3 px-4 font-mono font-black text-amber-700 dark:text-amber-400">
                        {formatCurrency(r.netSalary)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${meta?.badgeClass || ""
                            }`}
                        >
                          {meta?.label || r.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPrintSlip(r)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                            title="عرض وطباعة قسيمة الراتب"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {r.status !== "PAID" && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditSlip({
                                  record: r,
                                  overtimePay: String(r.overtimePay),
                                  bonuses: String(r.bonuses),
                                  deductions: String(r.deductions),
                                  notes: r.notes || "",
                                })
                              }
                              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                              title="تعديل المكافآت والخصومات"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Edit Slip Modal */}
      {editSlip && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                تعديل راتب: {editSlip.record.employee?.nameAr}
              </h4>
              <button
                type="button"
                onClick={() => setEditSlip(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await runAction("UPDATE_SLIP", {
                  recordId: editSlip.record.id,
                  overtimePay: parseFloat(editSlip.overtimePay) || 0,
                  bonuses: parseFloat(editSlip.bonuses) || 0,
                  deductions: parseFloat(editSlip.deductions) || 0,
                  notes: editSlip.notes || null,
                });
                if (ok) setEditSlip(null);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-1">إضافي (د.أ)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editSlip.overtimePay}
                    onChange={(e) =>
                      setEditSlip({ ...editSlip, overtimePay: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">مكافآت (د.أ)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editSlip.bonuses}
                    onChange={(e) =>
                      setEditSlip({ ...editSlip, bonuses: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">خصومات (د.أ)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editSlip.deductions}
                    onChange={(e) =>
                      setEditSlip({ ...editSlip, deductions: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">ملاحظات القسيمة</label>
                <input
                  type="text"
                  value={editSlip.notes}
                  onChange={(e) =>
                    setEditSlip({ ...editSlip, notes: e.target.value })
                  }
                  placeholder="سبب المكافأة أو الخصم..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditSlip(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={busyAction}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ القسيمة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Payslip Modal */}
      {printSlip && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white text-stone-900 rounded-2xl p-6 space-y-4 shadow-2xl text-xs">
            <div className="text-center border-b border-dashed border-stone-300 pb-3 space-y-1">
              <h2 className="text-base font-black text-stone-950">
                روز باريس لمواد البناء والديكور
              </h2>
              <p className="text-[11px] font-bold text-stone-600">
                قسيمة راتب شهر {printSlip.month} / {printSlip.year}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500">الموظف:</span>
                <strong>{printSlip.employee?.nameAr}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">المسمى الوظيفي:</span>
                <span>{printSlip.employee?.jobTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">الفرع:</span>
                <span>{printSlip.employee?.branch?.nameAr || "الفرع الرئيسي"}</span>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-stone-300 py-3 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="font-sans">الراتب الأساسي:</span>
                <span>{formatCurrency(printSlip.baseSalary)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span className="font-sans">عمل إضافي:</span>
                <span>+{formatCurrency(printSlip.overtimePay)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span className="font-sans">مكافآت وحوافز:</span>
                <span>+{formatCurrency(printSlip.bonuses)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span className="font-sans">الخصومات ({printSlip.absentDays} غياب):</span>
                <span>-{formatCurrency(printSlip.deductions)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-stone-950 pt-2 border-t border-stone-200">
                <span className="font-sans">صافي الراتب المستحق:</span>
                <span>{formatCurrency(printSlip.netSalary)}</span>
              </div>
            </div>

            {printSlip.notes && (
              <p className="text-[11px] text-stone-500">ملاحظة: {printSlip.notes}</p>
            )}

            <div className="flex gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setPrintSlip(null)}
                className="flex-1 py-2 rounded-xl border border-stone-300 text-stone-700 font-bold"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة القسيمة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

