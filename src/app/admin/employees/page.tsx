"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserCog,
  Users,
  Clock,
  CalendarClock,
  FileText,
  Wallet,
  Plus,
  Search,
  Eye,
  Edit2,
  UserX,
  UserCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  ATTENDANCE_STATUS_META,
  DEPARTMENT_OPTIONS,
  EMPLOYMENT_TYPE_LABELS,
  STAFF_ROLE_OPTIONS,
} from "@/lib/hr";
import { EmployeeFormModal } from "@/components/admin/hr/EmployeeFormModal";
import { EmployeeProfileModal } from "@/components/admin/hr/EmployeeProfileModal";
import { AttendanceTab } from "@/components/admin/hr/AttendanceTab";
import { ShiftsTab } from "@/components/admin/hr/ShiftsTab";
import { LeavesTab } from "@/components/admin/hr/LeavesTab";
import { PayrollTab } from "@/components/admin/hr/PayrollTab";
import type {
  HrBranch,
  HrEmployee,
  HrSummary,
} from "@/components/admin/hr/types";

type TabId = "directory" | "attendance" | "shifts" | "leaves" | "payroll";

const EMPTY_SUMMARY: HrSummary = {
  totalCount: 0,
  activeCount: 0,
  inactiveCount: 0,
  presentToday: 0,
  lateToday: 0,
  absentToday: 0,
  pendingLeavesCount: 0,
  monthlyPayrollEstimate: 0,
};

export default function AdminEmployeesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("directory");
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [branches, setBranches] = useState<HrBranch[]>([]);
  const [summary, setSummary] = useState<HrSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<HrEmployee | null>(
    null
  );
  const [profileId, setProfileId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [empRes, branchRes] = await Promise.all([
        fetch("/api/hr/employees"),
        fetch("/api/hr/branches"),
      ]);
      const empJson = await empRes.json().catch(() => null);
      const branchJson = await branchRes.json().catch(() => null);

      if (!empRes.ok || !empJson?.success) {
        setLoadError(empJson?.error || "تعذر تحميل بيانات الموظفين");
        return;
      }

      setEmployees(
        Array.isArray(empJson.data?.employees) ? empJson.data.employees : []
      );
      setSummary(empJson.data?.summary || EMPTY_SUMMARY);

      if (branchRes.ok && Array.isArray(branchJson?.data?.branches)) {
        setBranches(branchJson.data.branches);
      }
    } catch {
      setLoadError("تعذر الاتصال بالخادم أثناء تحميل بيانات الموظفين");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const toggleActiveState = async (emp: HrEmployee) => {
    const nextActive = !emp.isActive;
    if (
      !nextActive &&
      !confirm(
        `هل تريد أرشفة الموظف "${emp.nameAr}" وتعطيل دخوله للنظام مع الاحتفاظ بسجلاته؟`
      )
    ) {
      return;
    }

    setBusyId(emp.id);
    try {
      const res = await fetch(`/api/hr/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.ok) {
        await loadAll();
      }
    } finally {
      setBusyId(null);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      emp.nameAr.toLowerCase().includes(q) ||
      emp.nameEn.toLowerCase().includes(q) ||
      emp.jobTitle.toLowerCase().includes(q) ||
      (emp.phone || "").toLowerCase().includes(q) ||
      (emp.user?.email || "").toLowerCase().includes(q);
    const matchDept =
      selectedDept === "ALL" || (emp.department || "عام") === selectedDept;
    const matchStatus =
      selectedStatus === "ALL" ||
      (selectedStatus === "ACTIVE" ? emp.isActive : !emp.isActive);
    return matchSearch && matchDept && matchStatus;
  });

  const attendanceRate =
    summary.activeCount > 0
      ? Math.round(
          ((summary.presentToday + summary.lateToday) / summary.activeCount) *
            100
        )
      : 0;

  const getRoleLabel = (role?: string) =>
    STAFF_ROLE_OPTIONS.find((r) => r.value === role)?.label || role || "موظف";

  const tabs: {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: "directory",
      label: "دليل الموظفين",
      icon: Users,
      badge: summary.activeCount,
    },
    { id: "attendance", label: "الحضور والانصراف", icon: Clock },
    { id: "shifts", label: "جدول المناوبات", icon: CalendarClock },
    {
      id: "leaves",
      label: "الإجازات والطلبات",
      icon: FileText,
      badge: summary.pendingLeavesCount > 0 ? summary.pendingLeavesCount : undefined,
    },
    { id: "payroll", label: "مسير الرواتب", icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-amber-600" />
            <span>إدارة الموظفين والدوام</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            متابعة كادر الشركة والمعرض، الحضور والانصراف، المناوبات الأسبوعية، الإجازات ومسير الرواتب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className="px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center gap-2 transition"
          >
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>دوام اليوم السريع</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingEmployee(null);
              setFormOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موظف جديد</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1.5">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium block">
            الكادر النشط حالياً
          </span>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100 font-mono">
            {summary.activeCount}
          </div>
          <p className="text-[11px] text-stone-400">
            إجمالي السجلات: {summary.totalCount} ({summary.inactiveCount} مؤرشف)
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1.5">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium block">
            الحضور اليوم
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">
              {summary.presentToday + summary.lateToday}
            </span>
            <span className="text-xs font-mono font-bold text-stone-400">
              ({attendanceRate}%)
            </span>
          </div>
          <p className="text-[11px] text-stone-400">
            حاضر: {summary.presentToday} • متأخر: {summary.lateToday} • غائب:{" "}
            {summary.absentToday}
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl bg-white dark:bg-stone-900 border shadow-xs space-y-1.5 ${
            summary.pendingLeavesCount > 0
              ? "border-amber-300 dark:border-amber-800"
              : "border-stone-200 dark:border-stone-800"
          }`}
        >
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium block">
            طلبات إجازة بانتظار القرار
          </span>
          <div
            className={`text-2xl font-black font-mono flex items-center gap-2 ${
              summary.pendingLeavesCount > 0
                ? "text-amber-600"
                : "text-stone-900 dark:text-stone-100"
            }`}
          >
            {summary.pendingLeavesCount > 0 && (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            <span>{summary.pendingLeavesCount}</span>
          </div>
          <p className="text-[11px] text-stone-400">
            {summary.pendingLeavesCount > 0
              ? "اضغط على تبويب الإجازات للمراجعة والبتّ"
              : "لا توجد طلبات معلّقة حالياً"}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1.5">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium block">
            كتلة الرواتب الأساسية / شهر
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {formatCurrency(summary.monthlyPayrollEstimate)}
          </div>
          <p className="text-[11px] text-stone-400">
            تقدير الرواتب الأساسية للموظفين النشطين
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                active
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loadError && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث بالاسم، المسمى، الهاتف، أو البريد..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200"
              >
                <option value="ALL">جميع الأقسام</option>
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200"
              >
                <option value="ALL">كل الحالات</option>
                <option value="ACTIVE">على رأس العمل فقط</option>
                <option value="INACTIVE">المؤرشفون فقط</option>
              </select>
            </div>
          </div>

          {/* Employees Table */}
          <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-stone-500">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                <span>جاري تحميل دليل الموظفين...</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-14 text-center space-y-2 text-xs text-stone-500">
                <p>لا توجد سجلات موظفين مطابقة للبحث الحالي.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEmployee(null);
                    setFormOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة أول موظف</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                    <tr>
                      <th className="py-3 px-4">الموظف والمسمى</th>
                      <th className="py-3 px-4">القسم / الفرع</th>
                      <th className="py-3 px-4">الصلاحية والتواصل</th>
                      <th className="py-3 px-4">الراتب الأساسي</th>
                      <th className="py-3 px-4">دوام اليوم</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {filteredEmployees.map((emp) => {
                      const todayRec = emp.todayAttendance;
                      const attMeta = todayRec
                        ? ATTENDANCE_STATUS_META[todayRec.status]
                        : null;
                      const isBusy = busyId === emp.id;

                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-stone-50/70 dark:hover:bg-stone-800/30 transition"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-black flex items-center justify-center shrink-0">
                                {emp.nameAr.slice(0, 1)}
                              </div>
                              <div>
                                <div className="font-bold text-stone-900 dark:text-stone-100">
                                  {emp.nameAr}
                                </div>
                                <div className="text-[11px] text-stone-500">
                                  {emp.jobTitle} •{" "}
                                  <span className="text-stone-400">
                                    {EMPLOYMENT_TYPE_LABELS[emp.employmentType] ||
                                      emp.employmentType}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-stone-800 dark:text-stone-200">
                              {emp.department || "عام"}
                            </div>
                            <div className="text-[10px] text-stone-400">
                              {emp.branch?.nameAr || "الفرع الرئيسي"}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{getRoleLabel(emp.user?.role)}</span>
                            </div>
                            {emp.phone && (
                              <div
                                dir="ltr"
                                className="text-[10px] font-mono text-stone-400 flex items-center justify-end gap-1 mt-0.5"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>{emp.phone}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                            {formatCurrency(emp.baseSalary)}
                          </td>

                          <td className="py-3 px-4">
                            {attMeta ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${attMeta.badgeClass}`}
                              >
                                {attMeta.label}
                              </span>
                            ) : (
                              <span className="text-[10px] text-stone-400">
                                لم يُسجَّل
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {emp.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>نشط</span>
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400 text-[10px] font-bold">
                                مؤرشف
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setProfileId(emp.id)}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                                title="عرض الملف الوظيفي"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEmployee(emp);
                                  setFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                                title="تعديل بيانات الموظف"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => toggleActiveState(emp)}
                                className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
                                  emp.isActive
                                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                }`}
                                title={
                                  emp.isActive
                                    ? "أرشفة وتعطيل الموظف"
                                    : "إعادة تفعيل الموظف"
                                }
                              >
                                {emp.isActive ? (
                                  <UserX className="w-3.5 h-3.5" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                              </button>
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
        </div>
      )}

      {activeTab === "attendance" && (
        <AttendanceTab
          employees={employees}
          onChanged={() => {
            void loadAll();
          }}
        />
      )}

      {activeTab === "shifts" && <ShiftsTab employees={employees} />}

      {activeTab === "leaves" && (
        <LeavesTab
          employees={employees}
          onChanged={() => {
            void loadAll();
          }}
        />
      )}

      {activeTab === "payroll" && <PayrollTab />}

      {/* Modals */}
      <EmployeeFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingEmployee(null);
        }}
        onSaved={() => {
          void loadAll();
        }}
        branches={branches}
        initialEmployee={editingEmployee}
      />

      <EmployeeProfileModal
        employeeId={profileId}
        onClose={() => setProfileId(null)}
        onEdit={(emp) => {
          setEditingEmployee(emp);
          setFormOpen(true);
        }}
      />
    </div>
  );
}

