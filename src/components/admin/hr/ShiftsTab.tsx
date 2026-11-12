"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  Plus,
  Trash2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  X,
  Save,
} from "lucide-react";
import { SHIFT_TYPE_META } from "@/lib/hr";
import type { HrEmployee, HrShift } from "./types";

interface ShiftsTabProps {
  employees: HrEmployee[];
}

function getWeekDates(anchorIso: string): Date[] {
  const base = new Date(anchorIso + "T00:00:00Z");
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    dates.push(d);
  }
  return dates;
}

export function ShiftsTab({ employees }: ShiftsTabProps) {
  const [weekStart, setWeekStart] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [shifts, setShifts] = useState<HrShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeEmployees = employees.filter((e) => e.isActive);

  const [form, setForm] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    type: "MORNING",
    startTime: "05:00",
    endTime: "13:00",
    notes: "",
  });

  const weekDates = getWeekDates(weekStart);
  const weekFrom = weekDates[0].toISOString().slice(0, 10);
  const weekTo = weekDates[6].toISOString().slice(0, 10);

  const loadShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hr/shifts?from=${encodeURIComponent(weekFrom)}&to=${encodeURIComponent(weekTo)}`
      );
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data?.shifts)) {
        setShifts(json.data.shifts);
      }
    } catch {
      // Safe fallback
    } finally {
      setLoading(false);
    }
  }, [weekFrom, weekTo]);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  const shiftWeek = (deltaDays: number) => {
    const d = new Date(weekStart + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + deltaDays);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const openCreateModal = (empId?: string, dateIso?: string) => {
    setErrorMsg(null);
    setForm({
      employeeId: empId || activeEmployees[0]?.id || "",
      date: dateIso || weekFrom,
      type: "MORNING",
      startTime: SHIFT_TYPE_META.MORNING.defaultStart,
      endTime: SHIFT_TYPE_META.MORNING.defaultEnd,
      notes: "",
    });
    setModalOpen(true);
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/hr/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setErrorMsg(json?.error || "تعذر إضافة المناوبة");
        return;
      }
      setModalOpen(false);
      await loadShifts();
    } catch {
      setErrorMsg("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/hr/shifts?id=${encodeURIComponent(shiftId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      }
    } catch {
      // Ignore transient error
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => shiftWeek(-7)}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300"
            title="الأسبوع السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="font-bold text-stone-800 dark:text-stone-200 px-2 font-mono">
            {weekFrom} ← {weekTo}
          </span>
          <button
            type="button"
            onClick={() => shiftWeek(7)}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300"
            title="الأسبوع التالي"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          disabled={activeEmployees.length === 0}
          onClick={() => openCreateModal()}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>إسناد مناوبة جديدة</span>
        </button>
      </div>

      {/* Weekly Matrix */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-14 flex flex-col items-center justify-center gap-2 text-xs text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            <span>جاري تحميل جدول المناوبات...</span>
          </div>
        ) : activeEmployees.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-500">
            أضف موظفين نشطين أولاً لتوزيع جدول المناوبات.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                <tr>
                  <th className="py-3 px-4 min-w-[160px]">الموظف</th>
                  {weekDates.map((d) => {
                    const iso = d.toISOString().slice(0, 10);
                    return (
                      <th key={iso} className="py-3 px-2.5 text-center min-w-[125px]">
                        <div className="text-stone-800 dark:text-stone-200">
                          {d.toLocaleDateString("ar-JO", { weekday: "short" })}
                        </div>
                        <div className="text-[10px] font-mono text-stone-400">
                          {iso.slice(5)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {activeEmployees.map((emp) => (
                  <tr key={emp.id} className="align-top">
                    <td className="py-3 px-4 bg-stone-50/40 dark:bg-stone-950/30 border-l border-stone-100 dark:border-stone-800">
                      <div className="font-bold text-stone-900 dark:text-stone-100">
                        {emp.nameAr}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {emp.jobTitle}
                      </div>
                    </td>

                    {weekDates.map((d) => {
                      const iso = d.toISOString().slice(0, 10);
                      const cellShifts = shifts.filter(
                        (s) =>
                          s.employeeId === emp.id &&
                          new Date(s.date).toISOString().slice(0, 10) === iso
                      );
                      return (
                        <td
                          key={iso}
                          className="p-2 border-l border-stone-100 dark:border-stone-800/60 min-h-[70px]"
                        >
                          <div className="space-y-1">
                            {cellShifts.map((s) => {
                              const meta = SHIFT_TYPE_META[s.type] || SHIFT_TYPE_META.REGULAR;
                              const startHm = new Date(s.startTime).toLocaleTimeString(
                                "ar-JO",
                                { hour: "2-digit", minute: "2-digit" }
                              );
                              const endHm = new Date(s.endTime).toLocaleTimeString(
                                "ar-JO",
                                { hour: "2-digit", minute: "2-digit" }
                              );
                              return (
                                <div
                                  key={s.id}
                                  className={`p-1.5 rounded-lg border text-[10px] relative group ${meta.badgeClass}`}
                                >
                                  <div className="font-bold">{meta.label}</div>
                                  <div className="font-mono opacity-85">
                                    {startHm} - {endHm}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteShift(s.id)}
                                    className="opacity-0 group-hover:opacity-100 absolute top-1 left-1 p-0.5 rounded bg-white/80 dark:bg-stone-900/80 text-red-600 transition"
                                    title="حذف المناوبة"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => openCreateModal(emp.id, iso)}
                              className="w-full py-1 rounded-lg border border-dashed border-stone-200 dark:border-stone-700 text-stone-400 hover:text-amber-600 hover:border-amber-400 text-[10px] flex items-center justify-center transition"
                              title="إضافة مناوبة في هذا اليوم"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Shift Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-600" />
                <span>إسناد مناوبة عمل</span>
              </h4>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateShift} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  الموظف
                </label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                >
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nameAr} — {emp.jobTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    نوع المناوبة
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      const meta = SHIFT_TYPE_META[nextType] || SHIFT_TYPE_META.REGULAR;
                      setForm({
                        ...form,
                        type: nextType,
                        startTime: meta.defaultStart,
                        endTime: meta.defaultEnd,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                  >
                    <option value="MORNING">صباحية (05:00 - 13:00)</option>
                    <option value="EVENING">مسائية (13:00 - 21:00)</option>
                    <option value="NIGHT">ليلية للخبازين (21:00 - 05:00)</option>
                    <option value="REGULAR">اعتيادية (08:00 - 16:00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    من الساعة
                  </label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    إلى الساعة
                  </label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  ملاحظات (اختياري)
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="مثال: تغطية قسم الدهانات والمستودع..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{submitting ? "جاري الحفظ..." : "حفظ المناوبة"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

