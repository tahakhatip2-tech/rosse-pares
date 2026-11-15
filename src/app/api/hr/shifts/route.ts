import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, auditLog } from "@/lib/api";
import { getDayBounds, isValidObjectId, shiftCreateSchema } from "@/lib/hr";

function buildShiftDateTime(dayStart: Date, timeOrIso: string): Date | null {
  const trimmed = timeOrIso.trim();
  const hm = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (hm) {
    const h = Math.min(23, Math.max(0, parseInt(hm[1], 10)));
    const m = Math.min(59, Math.max(0, parseInt(hm[2], 10)));
    const d = new Date(dayStart);
    d.setHours(h, m, 0, 0);
    return d;
  }
  const dt = new Date(trimmed);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const employeeId = searchParams.get("employeeId");

  const now = new Date();
  const defaultStart = getDayBounds(now.toISOString()).dayStart;
  const defaultEndDate = new Date(defaultStart);
  defaultEndDate.setUTCDate(defaultEndDate.getUTCDate() + 6);
  const defaultEnd = getDayBounds(defaultEndDate.toISOString()).dayEnd;

  const rangeStart = fromParam ? getDayBounds(fromParam).dayStart : defaultStart;
  const rangeEnd = toParam ? getDayBounds(toParam).dayEnd : defaultEnd;

  const where: Record<string, unknown> = {
    date: { gte: rangeStart, lte: rangeEnd },
  };
  if (employeeId && isValidObjectId(employeeId)) {
    where.employeeId = employeeId;
  }

  const shifts = await prisma.employeeShift.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          nameAr: true,
          jobTitle: true,
          department: true,
          branch: { select: { id: true, nameAr: true } },
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return ok({ shifts });
}, "attendance:view");

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const raw = await req.json().catch(() => null);
  if (!raw) return err("بيانات الطلب غير صالحة", 400);

  const parsed = shiftCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message || "بيانات المناوبة غير صالحة", 400);
  }

  const data = parsed.data;
  if (!isValidObjectId(data.employeeId)) {
    return err("معرّف الموظف غير صالح", 400);
  }

  const employee = await prisma.employee.findUnique({
    where: { id: data.employeeId },
    select: { id: true, nameAr: true, isActive: true },
  });
  if (!employee) {
    return err("الموظف غير موجود", 404);
  }

  const { dayStart, dayEnd } = getDayBounds(data.date);
  const startTime = buildShiftDateTime(dayStart, data.startTime);
  let endTime = buildShiftDateTime(dayStart, data.endTime);

  if (!startTime || !endTime) {
    return err("صيغة وقت البداية أو النهاية غير صالحة", 400);
  }

  // Handle overnight shift (e.g. 21:00 -> 05:00 next day)
  if (endTime <= startTime) {
    endTime = new Date(endTime.getTime() + 86400000);
  }

  // Prevent overlapping shift for same employee on the same date
  const sameDayShifts = await prisma.employeeShift.findMany({
    where: {
      employeeId: data.employeeId,
      date: { gte: dayStart, lte: dayEnd },
    },
  });

  const hasOverlap = sameDayShifts.some(
    (s) => startTime < s.endTime && endTime! > s.startTime
  );
  if (hasOverlap) {
    return err("يوجد تداخل زمني مع مناوبة أخرى لنفس الموظف في هذا اليوم", 409);
  }

  const shift = await prisma.employeeShift.create({
    data: {
      employeeId: data.employeeId,
      date: dayStart,
      startTime,
      endTime,
      type: data.type,
      notes: data.notes || null,
    },
    include: {
      employee: {
        select: {
          id: true,
          nameAr: true,
          jobTitle: true,
          department: true,
        },
      },
    },
  });

  await auditLog({
    userId: ctx.userId,
    action: "CREATE_SHIFT",
    entity: "EmployeeShift",
    entityId: shift.id,
    newData: {
      employeeId: data.employeeId,
      date: dayStart.toISOString(),
      type: data.type,
    },
    req,
  });

  return ok({ shift }, 201);
}, "attendance:manage");

export const DELETE = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.searchParams.get("id");
  if (!isValidObjectId(id)) {
    return err("معرّف المناوبة غير صالح", 400);
  }

  const existing = await prisma.employeeShift.findUnique({ where: { id: id! } });
  if (!existing) {
    return err("المناوبة غير موجودة", 404);
  }

  await prisma.employeeShift.delete({ where: { id: id! } });

  await auditLog({
    userId: ctx.userId,
    action: "DELETE_SHIFT",
    entity: "EmployeeShift",
    entityId: id!,
    oldData: { employeeId: existing.employeeId, type: existing.type },
    req,
  });

  return ok({ deleted: true });
}, "attendance:manage");

