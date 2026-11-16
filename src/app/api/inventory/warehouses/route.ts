import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err } from "@/lib/api";

export const GET = withAuth(async (req: NextRequest, ctx) => {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    const where: any = { isActive: true };
    if (branchId) {
      where.branchId = branchId;
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      select: {
        id: true,
        branchId: true,
        nameAr: true,
        nameEn: true,
        type: true,
        branch: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok(warehouses);
  } catch (error: any) {
    console.error("[Warehouses GET Error]:", error);
    return err("فشل جلب المستودعات", 500);
  }
});
