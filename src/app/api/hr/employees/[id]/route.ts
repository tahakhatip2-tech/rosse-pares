import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, auditLog } from "@/lib/api";
import { isValidObjectId, updateEmployeeSchema } from "@/lib/hr";
import bcrypt from "bcryptjs";

export const GET = withAuth(
  async (_req: NextRequest, _ctx, paramsPromise: Promise<{ id: string }>) => {
    const { id } = await paramsPromise;
    if (!isValidObjectId(id)) {
      return err("معرّف الموظف غير صالح", 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
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
          select: { id: true, nameAr: true },
        },
        attendanceRecords: {
          orderBy: { date: "desc" },
          take: 15,
        },
        shifts: {
          orderBy: { date: "desc" },
          take: 14,
        },
        leaveRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        payrollRecords: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 6,
        },
      },
    });

    if (!employee) {
      return err("الموظف غير موجود", 404);
    }

    const { attendancePin: _p, webAuthnPublicKey: _k, ...safeEmployee } = employee as any;
    return ok({ employee: safeEmployee });
  },
  "employees:view"
);

export const PATCH = withAuth(
  async (req: NextRequest, ctx, paramsPromise: Promise<{ id: string }>) => {
    const { id } = await paramsPromise;
    if (!isValidObjectId(id)) {
      return err("معرّف الموظف غير صالح", 400);
    }

    const existing = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      return err("الموظف غير موجود", 404);
    }

    const raw = await req.json().catch(() => null);
    if (!raw) {
      return err("بيانات الطلب غير صالحة", 400);
    }

    const parsed = updateEmployeeSchema.safeParse(raw);
    if (!parsed.success) {
      return err(
        parsed.error.issues[0]?.message || "البيانات المدخلة غير صالحة",
        400
      );
    }

    const data = parsed.data;
    const updateEmpData: Record<string, unknown> = {};

    if (data.nameAr !== undefined) updateEmpData.nameAr = data.nameAr;
    if (data.nameEn !== undefined)
      updateEmpData.nameEn = data.nameEn.trim() || data.nameAr || existing.nameAr;
    if (data.phone !== undefined) updateEmpData.phone = data.phone || null;
    if (data.nationalId !== undefined)
      updateEmpData.nationalId = data.nationalId || null;
    if (data.jobTitle !== undefined) updateEmpData.jobTitle = data.jobTitle;
    if (data.department !== undefined)
      updateEmpData.department = data.department || null;
    if (data.employmentType !== undefined)
      updateEmpData.employmentType = data.employmentType;
    if (data.baseSalary !== undefined)
      updateEmpData.baseSalary = data.baseSalary;
    if (data.isActive !== undefined) {
      updateEmpData.isActive = data.isActive;
      updateEmpData.endDate = data.isActive ? null : existing.endDate || new Date();
    }
    if (data.startDate) {
      const sd = new Date(data.startDate);
      if (Number.isNaN(sd.getTime())) return err("تاريخ التعيين غير صالح", 400);
      updateEmpData.startDate = sd;
    }
    if (data.branchId && isValidObjectId(data.branchId)) {
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId },
      });
      if (!branch) return err("الفرع المحدد غير موجود", 400);
      updateEmpData.branchId = branch.id;
      updateEmpData.businessId = branch.businessId;
    }

    // Handle badgeNumber and attendancePin
    if (data.badgeNumber !== undefined) {
      updateEmpData.badgeNumber = data.badgeNumber?.trim() || null;
    }
    if (data.attendancePin !== undefined && data.attendancePin !== null) {
      // Hash the new PIN
      updateEmpData.attendancePin = await bcrypt.hash(data.attendancePin, 10);
    } else if (data.attendancePin === null) {
      // Explicitly clear the PIN
      updateEmpData.attendancePin = null;
    }

    // Handle biometric fingerprint fields
    if (data.fingerprintEnrolled !== undefined) {
      updateEmpData.fingerprintEnrolled = data.fingerprintEnrolled;
    }
    if (data.webAuthnCredentialId !== undefined) {
      updateEmpData.webAuthnCredentialId = data.webAuthnCredentialId;
    }
    if (data.webAuthnPublicKey !== undefined) {
      updateEmpData.webAuthnPublicKey = data.webAuthnPublicKey;
    }
    if (data.webAuthnCounter !== undefined) {
      updateEmpData.webAuthnCounter = data.webAuthnCounter ?? 0;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (
        data.role !== undefined ||
        data.isActive !== undefined ||
        updateEmpData.branchId
      ) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(data.role !== undefined ? { role: data.role } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            ...(updateEmpData.branchId
              ? {
                  branchId: updateEmpData.branchId as string,
                  businessId: updateEmpData.businessId as string,
                }
              : {}),
          },
        });
      }

      return tx.employee.update({
        where: { id },
        data: updateEmpData,
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
            select: { id: true, nameAr: true },
          },
        },
      });
    });

    await auditLog({
      userId: ctx.userId,
      action: "UPDATE_EMPLOYEE",
      entity: "Employee",
      entityId: id,
      oldData: {
        jobTitle: existing.jobTitle,
        baseSalary: existing.baseSalary,
        isActive: existing.isActive,
      },
      newData: updateEmpData,
      req,
    });

    return ok({ employee: updated });
  },
  "employees:manage"
);

export const DELETE = withAuth(
  async (req: NextRequest, ctx, paramsPromise: Promise<{ id: string }>) => {
    const { id } = await paramsPromise;
    if (!isValidObjectId(id)) {
      return err("معرّف الموظف غير صالح", 400);
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return err("الموظف غير موجود", 404);
    }

    const archived = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: { isActive: false },
      });

      return tx.employee.update({
        where: { id },
        data: {
          isActive: false,
          endDate: new Date(),
        },
      });
    });

    await auditLog({
      userId: ctx.userId,
      action: "ARCHIVE_EMPLOYEE",
      entity: "Employee",
      entityId: id,
      oldData: { isActive: existing.isActive },
      newData: { isActive: false },
      req,
    });

    return ok({ employee: archived });
  },
  "employees:manage"
);

