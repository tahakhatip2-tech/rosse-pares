import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, getPagination } from "@/lib/api";
import { z } from "zod";

const createSupplierSchema = z.object({
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
  nameEn: z.string().min(1, "الاسم بالإنجليزية مطلوب"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("البريد الإلكتروني غير صالح").optional().or(z.literal("")),
  address: z.any().optional(),
  taxNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

// GET — List suppliers (no auth required for basic listing)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") ?? "";
    const isActiveParam = searchParams.get("isActive");
    const { page, limit, skip } = getPagination(req);

    const where: any = {};
    if (isActiveParam !== null) where.isActive = isActiveParam === "true";
    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          contactName: true,
          phone: true,
          email: true,
          paymentTerms: true,
          creditLimit: true,
          isActive: true,
          rating: true,
          _count: { select: { purchaseOrders: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.supplier.count({ where }),
    ]);

    return ok({
      suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Suppliers GET Error]:", error);
    return err("فشل جلب قائمة الموردين", 500);
  }
}

// POST — Create supplier (requires procurement:create)
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json();
    const parsed = createSupplierSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "بيانات غير صالحة";
      return err(message, 400);
    }

    const data = parsed.data;
    const supplier = await prisma.supplier.create({
      data: {
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address,
        taxNumber: data.taxNumber,
        paymentTerms: data.paymentTerms ?? "NET30",
        creditLimit: data.creditLimit ?? 0,
        notes: data.notes,
        rating: data.rating,
      },
    });

    return ok(supplier, 201);
  } catch (error: any) {
    console.error("[Suppliers POST Error]:", error);
    return err("فشل إنشاء المورد: " + (error.message || "خطأ غير متوقع"), 500);
  }
}, "procurement:create");
