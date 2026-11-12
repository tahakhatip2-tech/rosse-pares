import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, auditLog } from "@/lib/api";
import {
  createEmployeeSchema,
  getDayBounds,
  isValidObjectId,
} from "@/lib/hr";

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const branchId = searchParams.get("branchId") || "";
  const department = searchParams.get("department") || "";
  const status = searchParams.get("status") || "ALL"; // ALL | ACTIVE | INACTIVE

  const where: Record<string, unknown> = {};
  if (branchId && branchId !== "ALL" && isValidObjectId(branchId)) {
    where.branchId = branchId;
  }
  if (department && department !== "ALL") {
    where.department = department;
  }
  if (status === "ACTIVE") {
    where.isActive = true;
  } else if (status === "INACTIVE") {
    where.isActive = false;
  }

  const { dayStart, dayEnd } = getDayBounds();

  const [employees, todayAttendance, pendingLeavesCount] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        branch: {
          select: {
            id: true,
            nameAr: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    }),
    prisma.attendanceRecord.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.leaveRequest.count({
      where: { status: "PENDING" },
    }),
  ]);

  const todayMap = new Map(todayAttendance.map((rec) => [rec.employeeId, rec]));

  const enriched = employees
    .map((emp) => ({
      ...emp,
      todayAttendance: todayMap.get(emp.id) || null,
    }))
    .filter((emp) => {
      if (!search) return true;
      return (
        emp.nameAr.toLowerCase().includes(search) ||
        emp.nameEn.toLowerCase().includes(search) ||
        emp.jobTitle.toLowerCase().includes(search) ||
        (emp.department || "").toLowerCase().includes(search) ||
        (emp.phone || "").toLowerCase().includes(search) ||
        (emp.user?.email || "").toLowerCase().includes(search)
      );
    });

  const activeEmployees = employees.filter((e) => e.isActive);
  const monthlyPayrollEstimate = activeEmployees.reduce(
    (sum, e) => sum + (Number(e.baseSalary) || 0),
    0
  );

  const presentToday = todayAttendance.filter(
    (r) => r.status === "PRESENT" || r.status === "HALF_DAY"
  ).length;
  const lateToday = todayAttendance.filter((r) => r.status === "LATE").length;
  const absentToday = todayAttendance.filter((r) => r.status === "ABSENT").length;

  return ok({
    employees: enriched,
    summary: {
      totalCount: employees.length,
      activeCount: activeEmployees.length,
      inactiveCount: employees.length - activeEmployees.length,
      presentToday,
      lateToday,
      absentToday,
      pendingLeavesCount,
      monthlyPayrollEstimate: Number(monthlyPayrollEstimate.toFixed(3)),
    },
  });
}, "employees:view");

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const raw = await req.json().catch(() => null);
  if (!raw) {
    return err("بيانات الطلب غير صالحة", 400);
  }

  const parsed = createEmployeeSchema.safeParse(raw);
  if (!parsed.success) {
    return err(
      parsed.error.issues[0]?.message || "يرجى التحقق من الحقول المطلوبة",
      400
    );
  }

  const data = parsed.data;
  const normalizedEmail = data.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existingUser) {
    return err("البريد الإلكتروني مسجّل مسبقاً لمستخدم آخر", 409);
  }

  // Resolve branch & business safely
  let branch =
    data.branchId && isValidObjectId(data.branchId)
      ? await prisma.branch.findUnique({ where: { id: data.branchId } })
      : null;

  if (!branch && ctx.branchId && isValidObjectId(ctx.branchId)) {
    branch = await prisma.branch.findUnique({ where: { id: ctx.branchId } });
  }
  if (!branch) {
    branch = await prisma.branch.findFirst({ where: { isActive: true } });
  }
  if (!branch) {
    return err("لا يوجد فرع مفعّل في النظام لإسناد الموظف إليه", 400);
  }

  const passwordPlain =
    data.password && data.password.trim().length >= 6
      ? data.password.trim()
      : "Roze@1234";
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  const startDate = new Date(data.startDate);
  if (Number.isNaN(startDate.getTime())) {
    return err("تاريخ التعيين غير صالح", 400);
  }

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: data.role,
        branchId: branch.id,
        businessId: branch.businessId,
        isActive: data.isActive,
      },
    });

    const employee = await tx.employee.create({
      data: {
        userId: user.id,
        businessId: branch.businessId,
        branchId: branch.id,
        nameAr: data.nameAr,
        nameEn: data.nameEn.trim() || data.nameAr,
        phone: data.phone || null,
        nationalId: data.nationalId || null,
        jobTitle: data.jobTitle,
        department: data.department || "الإدارة والإشراف",
        employmentType: data.employmentType,
        startDate,
        baseSalary: data.baseSalary,
        isActive: data.isActive,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        branch: {
          select: {
            id: true,
            nameAr: true,
          },
        },
      },
    });

    return employee;
  });

  await auditLog({
    userId: ctx.userId,
    action: "CREATE_EMPLOYEE",
    entity: "Employee",
    entityId: created.id,
    newData: {
      nameAr: created.nameAr,
      jobTitle: created.jobTitle,
      role: data.role,
      baseSalary: created.baseSalary,
    },
    req,
  });

  return ok({ employee: created }, 201);
}, "employees:manage");

