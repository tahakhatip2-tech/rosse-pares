export interface HrBranch {
  id: string;
  nameAr: string;
  nameEn: string;
  businessId: string;
}

export interface HrAttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakMinutes: number;
  status: string;
  notes: string | null;
  employee?: {
    id: string;
    nameAr: string;
    jobTitle: string;
    department: string | null;
    branch?: { id: string; nameAr: string } | null;
  };
}

export interface HrEmployee {
  id: string;
  userId: string;
  branchId: string;
  nameAr: string;
  nameEn: string;
  phone: string | null;
  nationalId: string | null;
  jobTitle: string;
  department: string | null;
  employmentType: string;
  startDate: string;
  endDate: string | null;
  baseSalary: number;
  isActive: boolean;
  badgeNumber?: string | null;
  fingerprintEnrolled?: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt?: string | null;
  } | null;
  branch?: {
    id: string;
    nameAr: string;
  } | null;
  todayAttendance?: HrAttendanceRecord | null;
}

export interface HrSummary {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  pendingLeavesCount: number;
  monthlyPayrollEstimate: number;
}

export interface HrShift {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  notes: string | null;
  employee?: {
    id: string;
    nameAr: string;
    jobTitle: string;
    department: string | null;
    branch?: { id: string; nameAr: string } | null;
  };
}

export interface HrLeaveRequest {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  employee?: {
    id: string;
    nameAr: string;
    jobTitle: string;
    department: string | null;
    branch?: { id: string; nameAr: string } | null;
  };
}

export interface HrPayrollRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  overtimePay: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  workedDays: number;
  absentDays: number;
  lateMinutes: number;
  status: "DRAFT" | "APPROVED" | "PAID";
  paidAt: string | null;
  notes: string | null;
  employee?: {
    id: string;
    nameAr: string;
    jobTitle: string;
    department: string | null;
    baseSalary: number;
    branch?: { id: string; nameAr: string } | null;
  };
}

export interface HrPayrollTotals {
  baseTotal: number;
  overtimeTotal: number;
  bonusTotal: number;
  deductionTotal: number;
  netTotal: number;
}

