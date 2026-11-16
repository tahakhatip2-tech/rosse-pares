"use client";

import { useEffect, useState } from "react";
import {
  X,
  Phone,
  Mail,
  Building2,
  Calendar,
  CreditCard,
  Clock,
  FileText,
  Printer,
  Loader2,
  ShieldCheck,
  Fingerprint,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  ATTENDANCE_STATUS_META,
  EMPLOYMENT_TYPE_LABELS,
  LEAVE_STATUS_META,
  LEAVE_TYPE_META,
  STAFF_ROLE_OPTIONS,
  calculateWorkedHours,
} from "@/lib/hr";
import type {
  HrAttendanceRecord,
  HrEmployee,
  HrLeaveRequest,
  HrPayrollRecord,
} from "./types";

interface EmployeeProfileModalProps {
  employeeId: string | null;
  onClose: () => void;
  onEdit: (emp: HrEmployee) => void;
}

type ProfilePayload = HrEmployee & {
  attendanceRecords?: HrAttendanceRecord[];
  leaveRequests?: HrLeaveRequest[];
  payrollRecords?: HrPayrollRecord[];
};

export function EmployeeProfileModal({
  employeeId,
  onClose,
  onEdit,
}: EmployeeProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setProfile(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/hr/employees/${employeeId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json?.success && json?.data?.employee) {
          setProfile(json.data.employee);
        } else {
          setError(json?.error || "تعذر تحميل ملف الموظف");
        }
      })
      .catch(() => {
        if (active) setError("تعذر الاتصال بالخادم");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [employeeId]);

  if (!employeeId) return null;

  const roleLabel =
    STAFF_ROLE_OPTIONS.find((r) => r.value === profile?.user?.role)?.label ||
    profile?.user?.role ||
    "موظف";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950/60">
          <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
            الملف الوظيفي الشامل
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-14 flex flex-col items-center justify-center gap-2 text-xs text-stone-500">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              <span>جاري تحميل ملف الموظف...</span>
            </div>
          ) : error || !profile ? (
            <div className="py-10 text-center text-xs font-bold text-red-600">
              {error || "الموظف غير موجود"}
            </div>
          ) : (
            <>
              {/* Hero Summary */}
              <div className="p-4 rounded-2xl bg-gradient-to-l from-amber-500/10 to-stone-100/60 dark:from-amber-950/30 dark:to-stone-950/60 border border-amber-500/20 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                    {profile.nameAr.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-base text-stone-900 dark:text-stone-100">
                        {profile.nameAr}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          profile.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                        }`}
                      >
                        {profile.isActive ? "على رأس العمل" : "موقوف / مؤرشف"}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                      {profile.jobTitle} — {profile.department || "عام"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 flex items-center gap-1.5 print:hidden"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(profile);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold print:hidden"
                  >
                    تعديل البيانات
                  </button>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-stone-400 block text-[10px]">الهاتف</span>
                    <span dir="ltr" className="font-mono font-bold text-stone-800 dark:text-stone-200">
                      {profile.phone || "غير مسجل"}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-stone-400 block text-[10px]">البريد الإلكتروني</span>
                    <span dir="ltr" className="font-mono font-bold text-stone-800 dark:text-stone-200 truncate block">
                      {profile.user?.email || "—"}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-stone-400 block text-[10px]">الفرع ونوع العقد</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      {profile.branch?.nameAr || "الفرع الرئيسي"} •{" "}
                      {EMPLOYMENT_TYPE_LABELS[profile.employmentType] || profile.employmentType}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-stone-400 block text-[10px]">صلاحية النظام</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      {roleLabel}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-stone-400 block text-[10px]">الراتب الأساسي</span>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(profile.baseSalary)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-stone-400 block text-[10px]">تاريخ التعيين</span>
                    <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                      {new Date(profile.startDate).toLocaleDateString("ar-JO")}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
                  <Fingerprint className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-stone-400 block text-[10px]">الرقم الوظيفي وبصمة الحضور</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                        {profile.badgeNumber || "غير محدد"}
                      </span>
                      {profile.fingerprintEnrolled ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          بصمة مسجلة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-400">
                          <XCircle className="w-3 h-3" />
                          بدون بصمة
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Attendance */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>آخر سجلات الحضور والانصراف</span>
                </h5>
                {!profile.attendanceRecords || profile.attendanceRecords.length === 0 ? (
                  <p className="text-xs text-stone-400 p-3 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800">
                    لا توجد سجلات حضور مسجلة لهذا الموظف بعد.
                  </p>
                ) : (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                        <tr>
                          <th className="py-2 px-3">التاريخ</th>
                          <th className="py-2 px-3">الدخول</th>
                          <th className="py-2 px-3">الخروج</th>
                          <th className="py-2 px-3">الساعات</th>
                          <th className="py-2 px-3">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {profile.attendanceRecords.slice(0, 6).map((rec) => {
                          const meta = ATTENDANCE_STATUS_META[rec.status] || {
                            label: rec.status,
                            badgeClass: "bg-stone-100 text-stone-700",
                          };
                          return (
                            <tr key={rec.id}>
                              <td className="py-2 px-3 font-mono">
                                {new Date(rec.date).toLocaleDateString("ar-JO")}
                              </td>
                              <td className="py-2 px-3 font-mono text-stone-600 dark:text-stone-300">
                                {rec.clockIn
                                  ? new Date(rec.clockIn).toLocaleTimeString("ar-JO", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "—"}
                              </td>
                              <td className="py-2 px-3 font-mono text-stone-600 dark:text-stone-300">
                                {rec.clockOut
                                  ? new Date(rec.clockOut).toLocaleTimeString("ar-JO", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "—"}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold">
                                {calculateWorkedHours(
                                  rec.clockIn,
                                  rec.clockOut,
                                  rec.breakMinutes
                                )}{" "}
                                س
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${meta.badgeClass}`}
                                >
                                  {meta.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent Leaves */}
              {profile.leaveRequests && profile.leaveRequests.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>سجل الإجازات</span>
                  </h5>
                  <div className="space-y-1.5">
                    {profile.leaveRequests.slice(0, 4).map((l) => {
                      const sm = LEAVE_STATUS_META[l.status];
                      return (
                        <div
                          key={l.id}
                          className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-stone-800 dark:text-stone-200">
                              {LEAVE_TYPE_META[l.type] || l.type}
                            </span>{" "}
                            <span className="text-stone-500 font-mono">
                              ({l.days} أيام — من{" "}
                              {new Date(l.startDate).toLocaleDateString("ar-JO")})
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                              sm?.badgeClass || ""
                            }`}
                          >
                            {sm?.label || l.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

