import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Roze Parees database seed...\n");

  // ── Business ─────────────────────────────────────────────
  const business = await prisma.business.upsert({
    where: { id: "000000000000000000000001" },
    update: {
      nameAr: "روز باريس لمواد البناء والديكور",
      nameEn: "Roze Parees Building Materials & Decor",
      phone: "0770585313",
      email: "info@rozeparees.com",
      settings: {
        currency: "JOD",
        timezone: "Asia/Amman",
        taxRate: 16,
        loyaltyPointsPerJOD: 10,
        orderPrefix: "ORD",
        invoicePrefix: "INV",
      },
    },
    create: {
      id: "000000000000000000000001",
      nameAr: "روز باريس لمواد البناء والديكور",
      nameEn: "Roze Parees Building Materials & Decor",
      phone: "0770585313",
      email: "info@rozeparees.com",
      settings: {
        currency: "JOD",
        timezone: "Asia/Amman",
        taxRate: 16,
        loyaltyPointsPerJOD: 10,
        orderPrefix: "ORD",
        invoicePrefix: "INV",
      },
    },
  });
  console.log("✅ Business ready:", business.nameAr);

  // ── Branch ────────────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where: { id: "000000000000000000000002" },
    update: {
      nameAr: "المعرض والمستودع الرئيسي — عمّان / أم نوارة",
      nameEn: "Main Showroom & Warehouse — Amman / Umm Nuwarah",
      address: { city: "عمّان", area: "أم نوارة", street: "نزول إشارات الغاز" },
      phone: "0770585313",
      hours: {
        sat: { open: "08:00", close: "19:00" },
        sun: { open: "08:00", close: "19:00" },
        mon: { open: "08:00", close: "19:00" },
        tue: { open: "08:00", close: "19:00" },
        wed: { open: "08:00", close: "19:00" },
        thu: { open: "08:00", close: "19:00" },
        fri: { open: "مغلق", close: "استقبال واتساب" },
      },
    },
    create: {
      id: "000000000000000000000002",
      businessId: business.id,
      nameAr: "المعرض والمستودع الرئيسي — عمّان / أم نوارة",
      nameEn: "Main Showroom & Warehouse — Amman / Umm Nuwarah",
      address: { city: "عمّان", area: "أم نوارة", street: "نزول إشارات الغاز" },
      phone: "0770585313",
      hours: {
        sat: { open: "08:00", close: "19:00" },
        sun: { open: "08:00", close: "19:00" },
        mon: { open: "08:00", close: "19:00" },
        tue: { open: "08:00", close: "19:00" },
        wed: { open: "08:00", close: "19:00" },
        thu: { open: "08:00", close: "19:00" },
        fri: { open: "مغلق", close: "استقبال واتساب" },
      },
    },
  });
  console.log("✅ Branch ready:", branch.nameAr);

  // ── Warehouse ─────────────────────────────────────────────
  const warehouse = await prisma.warehouse.upsert({
    where: { id: "000000000000000000000003" },
    update: {
      nameAr: "مستودع أم نوارة المركزي",
      nameEn: "Umm Nuwarah Central Warehouse",
    },
    create: {
      id: "000000000000000000000003",
      branchId: branch.id,
      nameAr: "مستودع أم نوارة المركزي",
      nameEn: "Umm Nuwarah Central Warehouse",
      type: "GENERAL",
    },
  });
  console.log("✅ Warehouse ready:", warehouse.nameAr);

  // ── Users ─────────────────────────────────────────────────
  const users = [
    {
      id: "000000000000000000000010",
      email: "admin@rozeparees.com",
      password: "Admin@123456",
      role: UserRole.SUPER_ADMIN,
      name: "مدير النظام — روز باريس",
    },
    {
      id: "000000000000000000000011",
      email: "owner@rozeparees.com",
      password: "Owner@123456",
      role: UserRole.BUSINESS_OWNER,
      name: "مالك الشركة",
    },
    {
      id: "000000000000000000000012",
      email: "manager@rozeparees.com",
      password: "Manager@123456",
      role: UserRole.BRANCH_MANAGER,
      name: "مدير المعرض والمستودع",
    },
    {
      id: "000000000000000000000013",
      email: "cashier@rozeparees.com",
      password: "Cashier@123456",
      role: UserRole.CASHIER,
      name: "مسؤول نقطة البيع (POS)",
    },
    {
      id: "000000000000000000000014",
      email: "warehouse@rozeparees.com",
      password: "Warehouse@123456",
      role: UserRole.WAREHOUSE_STAFF,
      name: "أمين مستودع أم نوارة",
    },
    {
      id: "000000000000000000000020",
      email: "admin@rossepares.com",
      password: "Admin@123456",
      role: UserRole.SUPER_ADMIN,
      name: "مدير النظام (Super Admin)",
    },
    {
      id: "000000000000000000000021",
      email: "owner@rossepares.com",
      password: "Owner@123456",
      role: UserRole.BUSINESS_OWNER,
      name: "صاحب شركة مواد البناء (Owner)",
    },
    {
      id: "000000000000000000000022",
      email: "manager@rossepares.com",
      password: "Manager@123456",
      role: UserRole.BRANCH_MANAGER,
      name: "مدير الفرع (Branch Manager)",
    },
    {
      id: "000000000000000000000023",
      email: "cashier@rossepares.com",
      password: "Cashier@123456",
      role: UserRole.CASHIER,
      name: "الكاشير (Cashier)",
    },
    {
      id: "000000000000000000000024",
      email: "warehouse@rossepares.com",
      password: "Warehouse@123456",
      role: UserRole.WAREHOUSE_STAFF,
      name: "مسؤول المستودع (Warehouse)",
    },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: hash,
        role: u.role,
        branchId: branch.id,
        businessId: business.id,
        isActive: true,
      },
      create: {
        id: u.id,
        email: u.email,
        passwordHash: hash,
        role: u.role,
        branchId: branch.id,
        businessId: business.id,
        isActive: true,
      },
    });
    console.log(`✅ User: ${u.email} (${u.role}) — password: ${u.password}`);
  }

  // ── Employees (linked to staff users) ─────────────────────
  const staffEmployees = [
    {
      id: "000000000000000000000112",
      userId: "000000000000000000000012",
      nameAr: "طه الخطيب",
      nameEn: "Taha Al-Khatib",
      phone: "0770585313",
      jobTitle: "مدير المعرض والمستودع",
      department: "الإدارة والمشاريع",
      employmentType: "FULL_TIME",
      baseSalary: 950,
    },
    {
      id: "000000000000000000000113",
      userId: "000000000000000000000013",
      nameAr: "خالد محمود العلي",
      nameEn: "Khaled Al-Ali",
      phone: "0770585314",
      jobTitle: "مسؤول المبيعات والكاشير",
      department: "نقاط البيع والفوترة",
      employmentType: "SHIFT",
      baseSalary: 450,
    },
    {
      id: "000000000000000000000114",
      userId: "000000000000000000000014",
      nameAr: "عمر يوسف المصري",
      nameEn: "Omar Yousef",
      phone: "0770585315",
      jobTitle: "أمين مستودع أم نوارة",
      department: "المستودع والتوريد",
      employmentType: "FULL_TIME",
      baseSalary: 500,
    },
  ];

  for (const emp of staffEmployees) {
    await prisma.employee.upsert({
      where: { userId: emp.userId },
      update: {},
      create: {
        id: emp.id,
        userId: emp.userId,
        businessId: business.id,
        branchId: branch.id,
        nameAr: emp.nameAr,
        nameEn: emp.nameEn,
        phone: emp.phone,
        jobTitle: emp.jobTitle,
        department: emp.department,
        employmentType: emp.employmentType,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        baseSalary: emp.baseSalary,
        isActive: true,
      },
    });
  }
  console.log("✅ Staff employees seeded:", staffEmployees.length);

  // ── Product Categories (Building Materials) ───────────────
  const categories = [
    { id: "000000000000000000000020", nameAr: "الدهانات والأصباغ", nameEn: "Paints & Coatings", slug: "paints", sortOrder: 1 },
    { id: "000000000000000000000021", nameAr: "ألواح الجبس بورد", nameEn: "Gypsum Boards", slug: "gypsum", sortOrder: 2 },
    { id: "000000000000000000000022", nameAr: "بديل الخشب والرخام", nameEn: "WPC & PVC Marble", slug: "wood-marble", sortOrder: 3 },
    { id: "000000000000000000000023", nameAr: "مواد العزل واللواصق", nameEn: "Waterproofing & Adhesives", slug: "insulation", sortOrder: 4 },
    { id: "000000000000000000000024", nameAr: "العدد والأدوات ومواد التأسيس", nameEn: "Tools & Hardware", slug: "tools", sortOrder: 5 },
  ];

  for (const cat of categories) {
    await prisma.productCategory.upsert({
      where: { id: cat.id },
      update: { nameAr: cat.nameAr, nameEn: cat.nameEn, slug: cat.slug, sortOrder: cat.sortOrder },
      create: cat,
    });
  }
  console.log("✅ Building materials categories created:", categories.length);

  // ── Products (Building Materials & Decor) ─────────────────
  const products = [
    {
      id: "000000000000000000000030",
      sku: "PNT-1801",
      nameAr: "دهان أملشن داخلي مطفي فاخر — 18 لتر",
      nameEn: "Luxury Matte Interior Emulsion Paint 18L",
      slug: "luxury-matte-interior-paint-18l",
      categoryId: "000000000000000000000020",
      type: "FINISHED",
      unit: "دلو 18 لتر",
      weight: 24,
      retailPrice: 42.0,
      costPrice: 31.5,
      taxRate: 16,
      descriptionAr: "دهان مائي داخلي عالي التغطية وقابل للغسل، يمنح الجدران ملمساً مخملياً مطفياً يدوم طويلاً بدون رائحة مزعجة.",
      ingredientsAr: "معدل التغطية: 120–140 م² للوجه الواحد | التخفيف بالماء بنسبة 10–15% | الجفاف السطحي خلال ساعتين.",
      allergens: ["low_voc", "washable", "interior"],
      images: ["/images/products/paint-emulsion.jpg"],
      isFeatured: true,
      sortOrder: 1,
    },
    {
      id: "000000000000000000000031",
      sku: "GYP-1224",
      nameAr: "لوح جبس بورد أخضر مقاوم للرطوبة — 12.5 مم",
      nameEn: "Moisture-Resistant Green Gypsum Board 12.5mm",
      slug: "green-moisture-gypsum-board",
      categoryId: "000000000000000000000021",
      type: "FINISHED",
      unit: "لوح (1.2×2.4م)",
      weight: 26,
      retailPrice: 6.75,
      costPrice: 5.1,
      taxRate: 16,
      descriptionAr: "ألواح جبسية معالجة بالسيليكون ومغطاة بورق مقوى أخضر مخصصة للحمامات والمطابخ والأماكن عالية الرطوبة.",
      ingredientsAr: "الأبعاد: 1200 × 2400 مم | السماكة: 12.5 مم | مطابق للمواصفات القياسية للأسقف المستعارة والقواطع.",
      allergens: ["moisture_resistant", "interior"],
      images: ["/images/products/gypsum-board.jpg"],
      isFeatured: true,
      sortOrder: 2,
    },
    {
      id: "000000000000000000000032",
      sku: "WPC-2901",
      nameAr: "لوح بديل الخشب المضلع WPC جوزي — 2.90 متر",
      nameEn: "Fluted WPC Wall Panel Walnut 2.9m",
      slug: "fluted-wpc-walnut-panel",
      categoryId: "000000000000000000000022",
      type: "FINISHED",
      unit: "لوح",
      weight: 4.5,
      retailPrice: 11.5,
      costPrice: 8.2,
      taxRate: 16,
      descriptionAr: "ألواح ديكور جدارية بنظام التعشيق، مقاومة للرطوبة والحشرات وسهلة التركيب لخلفيات التلفاز والمداخل.",
      ingredientsAr: "الطول: 290 سم | العرض: 16 سم | السماكة: 2.2 سم | تركيب بالسيليكون العظم والمشابك المعدنية.",
      allergens: ["moisture_resistant", "termite_proof", "interior"],
      images: ["/images/products/wpc-wood-panel.jpg"],
      isFeatured: true,
      sortOrder: 3,
    },
    {
      id: "000000000000000000000033",
      sku: "PVC-2441",
      nameAr: "شيت بديل الرخام UV كرارا أبيض بعروق ذهبية",
      nameEn: "UV PVC Marble Sheet Carrara Gold",
      slug: "uv-pvc-marble-carrara-gold",
      categoryId: "000000000000000000000022",
      type: "FINISHED",
      unit: "لوح (1.22×2.44م)",
      weight: 18,
      retailPrice: 28.0,
      costPrice: 20.5,
      taxRate: 16,
      descriptionAr: "ألواح بديل الرخام بطبقة حماية UV فائقة اللمعان ومقاومة للخدش والرطوبة لتكسية الجدران والصالات والمطابخ.",
      ingredientsAr: "الأبعاد: 122 × 244 سم | السماكة: 3 مم | مقاوم للحرارة والماء ويُقص بسهولة بالصاروخ أو الكتر.",
      allergens: ["moisture_resistant", "fire_retardant", "interior"],
      images: ["/images/products/pvc-marble-sheet.jpg"],
      isFeatured: true,
      isSeasonal: true,
      sortOrder: 4,
    },
    {
      id: "000000000000000000000034",
      sku: "INS-2001",
      nameAr: "عازل مائي أكريليك مرن للأسطح والخزانات — 20 كغ",
      nameEn: "Elastomeric Acrylic Roof Waterproofing 20kg",
      slug: "acrylic-roof-waterproofing-20kg",
      categoryId: "000000000000000000000023",
      type: "FINISHED",
      unit: "دلو 20 كغ",
      weight: 20,
      retailPrice: 36.0,
      costPrice: 26.0,
      taxRate: 16,
      descriptionAr: "عازل مطاطي عالي المرونة يعالج التشققات الشعرية ويمنع تسرب المياه ويقلل الحرارة لأسطح المنازل.",
      ingredientsAr: "التغطية: 25–30 م² لوجهين | مقاوم للأشعة فوق البنفسجية والأمطار | تطبيق بالرول أو الفرشاة.",
      allergens: ["exterior", "moisture_resistant", "uv_resistant"],
      images: ["/images/products/waterproof-membrane.jpg"],
      isFeatured: true,
      sortOrder: 5,
    },
    {
      id: "000000000000000000000035",
      sku: "ADH-2501",
      nameAr: "لاصق بلاط وبورسلان ممتاز C2TE — شوال 25 كغ",
      nameEn: "Premium C2TE Tile & Porcelain Adhesive 25kg",
      slug: "c2te-porcelain-tile-adhesive-25kg",
      categoryId: "000000000000000000000023",
      type: "FINISHED",
      unit: "كيس 25 كغ",
      weight: 25,
      retailPrice: 5.5,
      costPrice: 3.9,
      taxRate: 16,
      descriptionAr: "غراء إسمنتي مدعم بالبوليمر عالي الالتصاق ومقاوم للانزلاق، مثالي لبلاط البورسلان والجرانيت داخلياً وخارجياً.",
      ingredientsAr: "نسبة الخلط: 6–6.5 لتر ماء لكل 25 كغ | التغطية: 5–6 م² بسماكة 4 مم.",
      allergens: ["exterior", "interior", "moisture_resistant"],
      images: ["/images/products/tile-adhesive.jpg"],
      isFeatured: false,
      sortOrder: 6,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        sku: p.sku,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        slug: p.slug,
        categoryId: p.categoryId,
        unit: p.unit,
        weight: p.weight,
        retailPrice: p.retailPrice,
        costPrice: p.costPrice,
        taxRate: p.taxRate,
        descriptionAr: p.descriptionAr,
        ingredientsAr: p.ingredientsAr,
        allergens: p.allergens,
        images: p.images,
        isFeatured: Boolean(p.isFeatured),
        isSeasonal: Boolean(p.isSeasonal),
        sortOrder: p.sortOrder,
      },
      create: p as any,
    });

    await prisma.inventoryItem.upsert({
      where: {
        productId_warehouseId: {
          productId: p.id,
          warehouseId: warehouse.id,
        },
      },
      update: {},
      create: {
        productId: p.id,
        warehouseId: warehouse.id,
        qtyOnHand: 80,
        reorderPoint: 15,
      },
    });
  }
  console.log("✅ Building materials products created:", products.length);

  // ── System Settings ───────────────────────────────────────
  const settings = [
    { key: "currency", value: { code: "JOD", symbol: "د.أ", decimals: 3 } },
    { key: "timezone", value: { tz: "Asia/Amman" } },
    { key: "tax", value: { rate: 16, included: false } },
    { key: "loyalty", value: { pointsPerJOD: 10, pointValue: 0.005 } },
    {
      key: "ordering",
      value: {
        orderPrefix: "ORD",
        invoicePrefix: "INV",
        poPrefix: "PO",
        grPrefix: "GR",
      },
    },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log("✅ System settings initialized");

  console.log("\n✨ Roze Parees seed completed successfully!\n");
  console.log("═══════════════════════════════════════");
  console.log("Test Accounts:");
  console.log("  Super Admin:    admin@rozeparees.com     / Admin@123456");
  console.log("  Business Owner: owner@rozeparees.com     / Owner@123456");
  console.log("  Branch Manager: manager@rozeparees.com   / Manager@123456");
  console.log("  Cashier:        cashier@rozeparees.com   / Cashier@123456");
  console.log("  Warehouse:      warehouse@rozeparees.com / Warehouse@123456");
  console.log("═══════════════════════════════════════");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
