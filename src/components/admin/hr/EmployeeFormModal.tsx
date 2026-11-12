"use client";

import { useEffect, useState } from "react";
import { X, Save, UserPlus, AlertCircle, Shield } from "lucide-react";
import { DEPARTMENT_OPTIONS, STAFF_ROLE_OPTIONS } from "@/lib/hr";
import type { HrBranch, HrEmployee } from "./types";

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  branches: HrBranch[];
  initialEmployee?: HrEmployee | null;
}

export function EmployeeFormModal({
  isOpen,
  onClose,
  onSaved,
  branches,
  initialEmployee,
}: EmployeeFormModalProps) {
  const isEdit = Boolean(initialEmployee);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    nameAr: "",
    nameEn: "",
    email: "",
    password: "",
    phone: "",
    nationalId: "",
    jobTitle: "",
    department: DEPARTMENT_OPTIONS[1] as string,
    employmentType: "FULL_TIME",
    branchId: "",
    role: "CASHIER",
    baseSalary: "",
    startDate: new Date().toISOString().slice(0, 10),
    isActive: true,
  });

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (initialEmployee) {
      setForm({
        nameAr: initialEmployee.nameAr,
        nameEn: initialEmployee.nameEn || "",
        email: initialEmployee.user?.email || "",
        password: "",
        phone: initialEmployee.phone || "",
        nationalId: initialEmployee.nationalId || "",
        jobTitle: initialEmployee.jobTitle,
        department: initialEmployee.department || DEPARTMENT_OPTIONS[0],
        employmentType: initialEmployee.employmentType || "FULL_TIME",
        branchId: initialEmployee.branchId || branches[0]?.id || "",
        role: initialEmployee.user?.role || "CASHIER",
        baseSalary: String(initialEmployee.baseSalary ?? 0),
        startDate: initialEmployee.startDate
          ? new Date(initialEmployee.startDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        isActive: initialEmployee.isActive,
      });
    } else {
      setForm({
        nameAr: "",
        nameEn: "",
        email: "",
        password: "",
        phone: "",
        nationalId: "",
        jobTitle: "",
        department: DEPARTMENT_OPTIONS[1],
        employmentType: "FULL_TIME",
        branchId: branches[0]?.id || "",
        role: "CASHIER",
        baseSalary: "350",
        startDate: new Date().toISOString().slice(0, 10),
        isActive: true,
      });
    }
  }, [isOpen, initialEmployee, branches]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const endpoint = isEdit
        ? `/api/hr/employees/${initialEmployee!.id}`
        : "/api/hr/employees";
      const method = isEdit ? "PATCH" : "POST";

      const payload = isEdit
        ? {
            nameAr: form.nameAr,
            nameEn: form.nameEn,
            phone: form.phone || null,
            nationalId: form.nationalId || null,
            jobTitle: form.jobTitle,
            department: form.department,
            employmentType: form.employmentType,
            branchId: form.branchId || undefined,
            role: form.role,
            baseSalary: parseFloat(form.baseSalary) || 0,
            startDate: form.startDate,
            isActive: form.isActive,
          }
        : {
            ...form,
            baseSalary: parseFloat(form.baseSalary) || 0,
          };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setErrorMsg(json?.error || "تعذر حفظ بيانات الموظف");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setErrorMsg("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950/60">
          <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-600" />
            <span>{isEdit ? "تعديل بيانات الموظف" : "إضافة موظف جديد للنظام"}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                الاسم الكامل (بالعربية) *
              </label>
              <input
                type="text"
                required
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="مثال: أحمد محمود الخطيب"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                المسمى الوظيفي *
              </label>
              <input
                type="text"
                required
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                placeholder="مثال: خبّاز رئيسي / كاشير صالة"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                القسم
              </label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                الفرع
              </label>
              <select
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {branches.length === 0 ? (
                  <option value="">الفرع الرئيسي</option>
                ) : (
                  branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameAr}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                رقم الهاتف
              </label>
              <input
                type="tel"
                dir="ltr"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0790000000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono text-right focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                الرقم الوطني / الإقامة
              </label>
              <input
                type="text"
                dir="ltr"
                value={form.nationalId}
                onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                placeholder="9901000000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono text-right focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                نوع التوظيف
              </label>
              <select
                value={form.employmentType}
                onChange={(e) =>
                  setForm({ ...form, employmentType: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="FULL_TIME">دوام كامل</option>
                <option value="SHIFT">نظام مناوبات</option>
                <option value="PART_TIME">دوام جزئي</option>
                <option value="CONTRACT">عقد مؤقت</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                الراتب الأساسي الشهري (د.أ) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={form.baseSalary}
                onChange={(e) =>
                  setForm({ ...form, baseSalary: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                تاريخ التعيين *
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>الدور والصلاحية في النظام *</span>
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {STAFF_ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Credentials Box */}
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3 text-xs">
            <p className="font-bold text-amber-900 dark:text-amber-300">
              {isEdit
                ? "بيانات حساب الدخول المرتبط"
                : "بيانات حساب الدخول التلقائي للموظف"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  البريد الإلكتروني {!isEdit && "*"}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  required={!isEdit}
                  disabled={isEdit}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="staff@rozeparees.com"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 disabled:opacity-60 font-mono text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              {!isEdit && (
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    كلمة المرور المبدئية (الافتراضي: Roze@1234)
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    minLength={6}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="اتركه فارغاً للافتراضي"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            {isEdit && (
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="w-4 h-4 accent-amber-600 rounded"
                />
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  الموظف على رأس عمله (حساب النظام مفعّل)
                </span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>
                {submitting
                  ? "جاري الحفظ..."
                  : isEdit
                  ? "حفظ التعديلات"
                  : "إضافة الموظف"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

