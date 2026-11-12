import { z } from "zod";
import { UserRole } from "@prisma/client";

export const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export function isValidObjectId(value: string | null | undefined): boolean {
  return Boolean(value && OBJECT_ID_REGEX.test(value.trim()));
}

export const STAFF_ROLE_OPTIONS: {
  value: UserRole;
  label: string;
  description: string;
}[] = [
    {
      value: "BRANCH_MANAGER",
      label: "مدير فرع",
      description: "إدارة الفرع، الموظفين، الحضور، المخزون، والمبيعات",
    },
    {
      value: "CASHIER",
      label: "كاشير",
      description: "نقطة البيع (POS) والطلبات واستلام المدفوعات",
    },
    {
      value: "PRODUCTION_STAFF",
      label: "فني تجهيز ومواد",
      description: "تجهيز طلبيات الديكور والأخشاب والمواد للمشاريع",
    },
    {
      value: "WAREHOUSE_STAFF",
      label: "موظف مستودع",
      description: "جرد المواد الأولية والاستلام والتحويلات",
    },
    {
      value: "CONTENT_MANAGER",
      label: "مدير محتوى وتسويق",
      description: "إدارة المنتجات والعروض والأخبار",
    },
    {
      value: "BUSINESS_OWNER",
      label: "صاحب العمل",
      description: "صلاحيات إدارية ومالية كاملة",
    },
  ];

export const DEPARTMENT_OPTIONS = [
  "الإدارة والإشراف",
  "التشطيبات والديكور",
  "الدهانات ومواد البناء",
  "نقاط البيع والكاشير",
  "المستودع والإمداد",
  "التوصيل والخدمات",
] as const;

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "دوام كامل",
  PART_TIME: "دوام جزئي",
  SHIFT: "نظام مناوبات",
  CONTRACT: "عقد مؤقت",
};

export const ATTENDANCE_STATUS_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  PRESENT: {
    label: "حاضر",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  LATE: {
    label: "متأخر",
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  ABSENT: {
    label: "غائب",
    badgeClass:
      "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  HALF_DAY: {
    label: "نصف يوم",
    badgeClass:
      "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
};

export const SHIFT_TYPE_META: Record<
  string,
  { label: string; defaultStart: string; defaultEnd: string; badgeClass: string }
> = {
  MORNING: {
    label: "صباحية",
    defaultStart: "05:00",
    defaultEnd: "13:00",
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  EVENING: {
    label: "مسائية",
    defaultStart: "13:00",
    defaultEnd: "21:00",
    badgeClass:
      "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  NIGHT: {
    label: "ليلية (خبّازين)",
    defaultStart: "21:00",
    defaultEnd: "05:00",
    badgeClass:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  REGULAR: {
    label: "اعتيادية",
    defaultStart: "08:00",
    defaultEnd: "16:00",
    badgeClass:
      "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700",
  },
};

export const LEAVE_TYPE_META: Record<string, string> = {
  ANNUAL: "إجازة سنوية",
  SICK: "إجازة مرضية",
  EMERGENCY: "إجازة طارئة",
  UNPAID: "إجازة بدون راتب",
};

export const LEAVE_STATUS_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  PENDING: {
    label: "بانتظار الموافقة",
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  APPROVED: {
    label: "معتمدة",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  REJECTED: {
    label: "مرفوضة",
    badgeClass:
      "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
  },
};

export const PAYROLL_STATUS_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  DRAFT: {
    label: "مسودة احتساب",
    badgeClass:
      "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700",
  },
  APPROVED: {
    label: "معتمد للصرف",
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  PAID: {
    label: "تم الصرف",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
};

export const createEmployeeSchema = z.object({
  nameAr: z.string().trim().min(2, "الاسم الكامل مطلوب (حرفان على الأقل)"),
  nameEn: z.string().trim().optional().default(""),
  email: z.string().trim().email("البريد الإلكتروني غير صالح"),
  password: z
    .string()
    .min(6, "كلمة المرور يجب أن لا تقل عن 6 أحرف")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional().nullable(),
  nationalId: z.string().trim().optional().nullable(),
  jobTitle: z.string().trim().min(2, "المسمى الوظيفي مطلوب"),
  department: z.string().trim().optional().nullable(),
  employmentType: z
    .enum(["FULL_TIME", "PART_TIME", "SHIFT", "CONTRACT"])
    .default("FULL_TIME"),
  branchId: z.string().trim().optional(),
  role: z
    .enum([
      "SUPER_ADMIN",
      "BUSINESS_OWNER",
      "BRANCH_MANAGER",
      "CASHIER",
      "WAREHOUSE_STAFF",
      "PRODUCTION_STAFF",
      "CONTENT_MANAGER",
    ])
    .default("CASHIER"),
  baseSalary: z.coerce
    .number()
    .min(0, "الراتب الأساسي يجب أن يكون صفراً أو أكبر")
    .max(50000, "قيمة الراتب غير منطقية"),
  startDate: z.string().trim().min(4, "تاريخ التعيين مطلوب"),
  isActive: z.boolean().optional().default(true),
});

export const updateEmployeeSchema = z.object({
  nameAr: z.string().trim().min(2, "الاسم الكامل مطلوب").optional(),
  nameEn: z.string().trim().optional(),
  phone: z.string().trim().optional().nullable(),
  nationalId: z.string().trim().optional().nullable(),
  jobTitle: z.string().trim().min(2, "المسمى الوظيفي مطلوب").optional(),
  department: z.string().trim().optional().nullable(),
  employmentType: z
    .enum(["FULL_TIME", "PART_TIME", "SHIFT", "CONTRACT"])
    .optional(),
  branchId: z.string().trim().optional(),
  role: z
    .enum([
      "SUPER_ADMIN",
      "BUSINESS_OWNER",
      "BRANCH_MANAGER",
      "CASHIER",
      "WAREHOUSE_STAFF",
      "PRODUCTION_STAFF",
      "CONTENT_MANAGER",
    ])
    .optional(),
  baseSalary: z.coerce.number().min(0).max(50000).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const attendanceUpsertSchema = z.object({
  employeeId: z.string().trim().min(1, "معرّف الموظف مطلوب"),
  action: z.enum(["CLOCK_IN", "CLOCK_OUT", "SET"]).default("SET"),
  date: z.string().trim().optional(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "HALF_DAY"]).optional(),
  clockIn: z.string().trim().optional().nullable(),
  clockOut: z.string().trim().optional().nullable(),
  breakMinutes: z.coerce.number().int().min(0).max(480).optional().default(0),
  notes: z.string().trim().max(400).optional().nullable(),
});

export const shiftCreateSchema = z.object({
  employeeId: z.string().trim().min(1, "معرّف الموظف مطلوب"),
  date: z.string().trim().min(8, "تاريخ المناوبة مطلوب"),
  startTime: z.string().trim().min(4, "وقت البدء مطلوب"),
  endTime: z.string().trim().min(4, "وقت الانتهاء مطلوب"),
  type: z.enum(["MORNING", "EVENING", "NIGHT", "REGULAR"]).default("REGULAR"),
  notes: z.string().trim().max(300).optional().nullable(),
});

export const leaveCreateSchema = z.object({
  employeeId: z.string().trim().min(1, "معرّف الموظف مطلوب"),
  type: z.enum(["ANNUAL", "SICK", "EMERGENCY", "UNPAID"]),
  startDate: z.string().trim().min(8, "تاريخ بداية الإجازة مطلوب"),
  endDate: z.string().trim().min(8, "تاريخ نهاية الإجازة مطلوب"),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const leaveActionSchema = z.object({
  leaveId: z.string().trim().min(1, "معرّف طلب الإجازة مطلوب"),
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const payrollActionSchema = z.object({
  action: z.enum(["GENERATE", "UPDATE_SLIP", "APPROVE", "MARK_PAID"]),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  recordId: z.string().trim().optional(),
  overtimePay: z.coerce.number().min(0).max(20000).optional(),
  bonuses: z.coerce.number().min(0).max(20000).optional(),
  deductions: z.coerce.number().min(0).max(20000).optional(),
  notes: z.string().trim().max(400).optional().nullable(),
  recordExpense: z.boolean().optional().default(true),
});

/**
 * Normalize a date string (YYYY-MM-DD or ISO) to start & end of that UTC day.
 */
export function getDayBounds(dateStr?: string | null): {
  dayStart: Date;
  dayEnd: Date;
} {
  const base = dateStr ? new Date(dateStr) : new Date();
  const safe = Number.isNaN(base.getTime()) ? new Date() : base;
  const dayStart = new Date(
    Date.UTC(safe.getUTCFullYear(), safe.getUTCMonth(), safe.getUTCDate(), 0, 0, 0, 0)
  );
  const dayEnd = new Date(
    Date.UTC(safe.getUTCFullYear(), safe.getUTCMonth(), safe.getUTCDate(), 23, 59, 59, 999)
  );
  return { dayStart, dayEnd };
}

export function getMonthBounds(year: number, month: number): {
  monthStart: Date;
  monthEnd: Date;
} {
  const safeYear = Math.min(2100, Math.max(2020, Math.trunc(year) || new Date().getUTCFullYear()));
  const safeMonth = Math.min(12, Math.max(1, Math.trunc(month) || 1));
  const monthStart = new Date(Date.UTC(safeYear, safeMonth - 1, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(safeYear, safeMonth, 0, 23, 59, 59, 999));
  return { monthStart, monthEnd };
}

export function calculateWorkedHours(
  clockIn: Date | string | null | undefined,
  clockOut: Date | string | null | undefined,
  breakMinutes = 0
): number {
  if (!clockIn || !clockOut) return 0;
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  const grossMinutes = (end - start) / 60000;
  const netMinutes = Math.max(0, grossMinutes - Math.max(0, breakMinutes || 0));
  return Number((netMinutes / 60).toFixed(2));
}

export function calculateLeaveDays(
  startInput: Date | string,
  endInput: Date | string
): number {
  const start = new Date(startInput);
  const end = new Date(endInput);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }
  const diffMs =
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) -
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 86400000) + 1;
}

export function computePayrollBreakdown(input: {
  baseSalary: number;
  absentDays: number;
  unpaidLeaveDays?: number;
  halfDays?: number;
  overtimePay?: number;
  bonuses?: number;
  manualDeductions?: number;
}) {
  const base = Math.max(0, Number(input.baseSalary) || 0);
  const dailyRate = base / 30;
  const totalAbsentEquiv =
    Math.max(0, Number(input.absentDays) || 0) +
    Math.max(0, Number(input.unpaidLeaveDays) || 0) +
    Math.max(0, Number(input.halfDays) || 0) * 0.5;

  const autoAbsenceDeduction = Number((dailyRate * totalAbsentEquiv).toFixed(3));
  const overtimePay = Math.max(0, Number(input.overtimePay) || 0);
  const bonuses = Math.max(0, Number(input.bonuses) || 0);
  const deductions =
    input.manualDeductions !== undefined
      ? Math.max(0, Number(input.manualDeductions) || 0)
      : autoAbsenceDeduction;

  const netSalary = Math.max(
    0,
    Number((base + overtimePay + bonuses - deductions).toFixed(3))
  );

  return {
    dailyRate: Number(dailyRate.toFixed(3)),
    autoAbsenceDeduction,
    overtimePay,
    bonuses,
    deductions,
    netSalary,
  };
}

