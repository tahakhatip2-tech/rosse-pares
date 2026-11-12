import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

export interface ChatProductSuggestion {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  price: number;
  unit: string;
  image: string;
  categoryAr: string;
}

interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponsePayload {
  reply: string;
  products: ChatProductSuggestion[];
  quickReplies: string[];
  showWhatsAppHandoff: boolean;
}

interface ProductWithCategory {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  ingredientsAr: string | null;
  allergens: string[];
  retailPrice: number;
  unit: string;
  images: string[];
  isFeatured: boolean;
  isSeasonal: boolean;
  category: { nameAr: string; slug: string } | null;
}

interface BranchRecord {
  nameAr: string;
  address: unknown;
  phone: string | null;
  hours: unknown;
}

const DEFAULT_QUICK_REPLIES = [
  "ما هي المواد والمنتجات المميزة؟",
  "أين يقع معرضكم وساعات العمل؟",
  "هل يوجد توصيل أو أسعار مقاولين؟",
  "تحدث مع خدمة العملاء واتساب",
];

function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // Remove diacritics
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  const stopWords = new Set([
    "من",
    "في",
    "على",
    "عن",
    "هل",
    "ما",
    "ماذا",
    "كم",
    "سعر",
    "اسعار",
    "اريد",
    "ابي",
    "بدي",
    "عندكم",
    "يوجد",
    "لو",
    "سمحت",
    "ممكن",
    "احصل",
    "الي",
    "او",
    "مع",
    "the",
    "is",
    "are",
    "what",
    "price",
    "have",
    "do",
    "you",
  ]);
  return normalizeArabic(text)
    .split(" ")
    .filter((t) => t.length >= 2 && !stopWords.has(t));
}

function toSuggestion(p: ProductWithCategory): ChatProductSuggestion {
  return {
    id: p.id,
    slug: p.slug,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    price: p.retailPrice,
    unit: p.unit,
    image: p.images[0] || "/rozeparees.png",
    categoryAr: p.category?.nameAr ?? "مواد بناء وديكور",
  };
}

function formatJsonText(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const preferred = [obj.ar, obj.street, obj.city, obj.text, obj.daily, obj.weekdays]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    if (preferred.length > 0) return preferred.join(" — ");
    return Object.values(obj)
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .join(" | ");
  }
  return "";
}

function scoreProduct(p: ProductWithCategory, tokens: string[], normalizedQuery: string): number {
  if (tokens.length === 0) return 0;
  const nameAr = normalizeArabic(p.nameAr);
  const nameEn = normalizeArabic(p.nameEn);
  const catAr = normalizeArabic(p.category?.nameAr ?? "");
  const desc = normalizeArabic(p.descriptionAr ?? "");
  const ing = normalizeArabic(p.ingredientsAr ?? "");
  const allergens = normalizeArabic(p.allergens.join(" "));

  let score = 0;
  if (nameAr.includes(normalizedQuery) || nameEn.includes(normalizedQuery)) {
    score += 20;
  }
  for (const token of tokens) {
    if (nameAr.includes(token)) score += 10;
    if (nameEn.includes(token)) score += 8;
    if (catAr.includes(token)) score += 6;
    if (desc.includes(token)) score += 3;
    if (ing.includes(token)) score += 3;
    if (allergens.includes(token)) score += 4;
  }
  return score;
}

function hasAnyKeyword(normalized: string, keywords: string[]): boolean {
  return keywords.some((kw) => normalized.includes(normalizeArabic(kw)));
}

function buildSmartReply(
  message: string,
  products: ProductWithCategory[],
  categoryNames: string[],
  branches: BranchRecord[],
  currentPath?: string
): ChatResponsePayload {
  const norm = normalizeArabic(message);
  const tokens = tokenize(message);

  // If user is currently viewing a specific product page and asks about it
  const productMatchInPath = currentPath?.match(/^\/products\/([a-f0-9]{24})/i);
  const activePageProduct = productMatchInPath
    ? products.find((p) => p.id === productMatchInPath[1])
    : undefined;

  // 1. Direct WhatsApp / human support request
  if (hasAnyKeyword(norm, ["واتس", "واتساب", "whatsapp", "موظف", "بشري", "خدمه العملاء", "اتصال"])) {
    return {
      reply:
        "بكل سرور! يمكنك التواصل مباشرة مع فريق المبيعات والدعم الفني في روز باريس لمواد البناء والديكور عبر الواتساب على الرقم 0770585313 (+962 7 7058 5313) للرد الفوري على عروض الأسعار والطلبات الخاصة.",
      products: [],
      quickReplies: ["ما هي المواد والمنتجات المميزة؟", "أين يقع معرضكم وساعات العمل؟"],
      showWhatsAppHandoff: true,
    };
  }

  // 2. Greeting
  if (
    tokens.length <= 2 &&
    hasAnyKeyword(norm, ["السلام", "مرحبا", "اهلا", "هلا", "صباح الخير", "مساء الخير", "hi", "hello"])
  ) {
    const featured = products.filter((p) => p.isFeatured).slice(0, 3);
    const sample = featured.length > 0 ? featured : products.slice(0, 3);
    return {
      reply:
        "أهلاً وسهلاً بك في روز باريس لمواد البناء والديكور! 🏗️ أنا مستشارك الذكي، يسعدني مساعدتك في اختيار الدهانات، الجبس بورد، بديل الخشب والرخام، مواد العزل، وأسعار المقاولين والمشاريع. كيف أخدمك اليوم؟",
      products: sample.map(toSuggestion),
      quickReplies: DEFAULT_QUICK_REPLIES,
      showWhatsAppHandoff: false,
    };
  }

  // 3. Branches, locations, working hours
  if (hasAnyKeyword(norm, ["فرع", "فروع", "معرض", "مستودع", "موقع", "عنوان", "ساعات", "دوام", "تفتح", "تغلق", "وين", "مكان", "هاتف", "تليفون"])) {
    const branchLines =
      branches.length > 0
        ? branches.map((b, idx) => {
            const addr = formatJsonText(b.address);
            const hrs = formatJsonText(b.hours);
            const parts = [`${idx + 1}. ${b.nameAr}`];
            if (addr) parts.push(`العنوان: ${addr}`);
            if (hrs) parts.push(`الدوام: ${hrs}`);
            if (b.phone) parts.push(`هاتف: ${b.phone}`);
            return parts.join(" — ");
          })
        : [
            "1. المعرض والمستودع الرئيسي — عمّان / أم نوارة — نزول إشارات الغاز (السبت–الخميس 08:00 ص – 08:00 م)",
          ];

    return {
      reply: `يسعدنا استقبالكم في معرضنا ومستودعنا الرئيسي:\n${branchLines.join("\n")}\n\nوللاستفسار الفوري أو إرسال الموقع (Location) عبر واتساب تواصلوا معنا على 0770585313.`,
      products: [],
      quickReplies: ["هل يوجد توصيل؟", "ما هي المواد والمنتجات المميزة؟", "تحدث مع خدمة العملاء واتساب"],
      showWhatsAppHandoff: true,
    };
  }

  // 4. B2B / Wholesale / Contractors
  if (hasAnyKeyword(norm, ["جمله", "تجار", "مقاول", "مقاولين", "مهندس", "مهندسين", "مشاريع", "ورشه", "توريد", "تعاقد", "b2b", "شركات", "عرض سعر"])) {
    return {
      reply:
        "نوفر في روز باريس لمواد البناء والديكور خدمة التوريد المباشر للمقاولين، المهندسين، وشركات الإنشاءات والتشطيبات بأسعار جملة تنافسية وتوصيل سريع لمواقع العمل.\nيمكنك زيارة صفحة المقاولين والمشاريع (B2B) من القائمة العلوية أو مراسلة فريق المبيعات مباشرة عبر الواتساب 0770585313.",
      products: [],
      quickReplies: ["أين يقع معرضكم وساعات العمل؟", "ما هي المواد والمنتجات المميزة؟", "تحدث مع خدمة العملاء واتساب"],
      showWhatsAppHandoff: true,
    };
  }

  // 5. Delivery / Custom Orders / Order tracking
  if (hasAnyKeyword(norm, ["توصيل", "شحن", "طلبيه", "طلب خاص", "كميه", "كميات", "تتبع", "وصل", "نقل"])) {
    return {
      reply:
        "نوفر توصيلاً سريعاً إلى مواقع البناء والورش في عمّان والمحافظات، مع إمكانية تجهيز الطلبيات الكبيرة مباشرة من مستودع أم نوارة.\nلطلبات الكميات والمشاريع أو متابعة طلب قائم، تواصلوا معنا مباشرة على واتساب 0770585313.",
      products: [],
      quickReplies: ["ما هي المواد والمنتجات المميزة؟", "أين يقع معرضكم وساعات العمل؟", "تحدث مع خدمة العملاء واتساب"],
      showWhatsAppHandoff: true,
    };
  }

  // 6. Technical specs / Materials / Safety instructions (repurposing ingredientsAr & allergens)
  if (hasAnyKeyword(norm, ["مكونات", "مواصفات", "تركيبه", "جوده", "استخدام", "تحذير", "سلامه", "امان", "رطوبه", "حريق", "مقاوم", "يحتوي", "خالي", "تخزين", "ماده"])) {
    const scored = products
      .map((p) => ({ p, score: scoreProduct(p, tokens, norm) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.p);

    const targets = scored.length > 0 ? scored.slice(0, 3) : activePageProduct ? [activePageProduct] : [];
    if (targets.length > 0) {
      const details = targets.map((p) => {
        const spec = p.ingredientsAr ? `المواصفات والتركيب: ${p.ingredientsAr}` : "خامات بناء وديكور معتمدة عالية الجودة";
        const notes = p.allergens.length > 0 ? `إرشادات السلامة والاستخدام: ${p.allergens.join("، ")}` : "مناسب للاستخدام المعماري والإنشائي وفق الأصول الفنية";
        return `• ${p.nameAr}: ${spec}. (${notes})`;
      });
      return {
        reply: `${details.join("\n")}\n\nللاستشارة الهندسية الدقيقة حول الكميات وطرق التركيب، يسعدنا تواصلك عبر الواتساب 0770585313.`,
        products: targets.map(toSuggestion),
        quickReplies: ["تحدث مع خدمة العملاء واتساب", "عرض المواد المميزة"],
        showWhatsAppHandoff: true,
      };
    }
  }

  // 7. Match specific products by search tokens
  const scoredProducts = products
    .map((p) => ({ p, score: scoreProduct(p, tokens, norm) }))
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score);

  if (scoredProducts.length > 0) {
    const top = scoredProducts.slice(0, 4).map((x) => x.p);
    const summaryLines = top.map(
      (p) => `• ${p.nameAr} — ${formatCurrency(p.retailPrice)} (${p.unit})`
    );
    return {
      reply: `وجدت لك هذه المواد والمنتجات المتوفرة في مستودع روز باريس:\n${summaryLines.join("\n")}\n\nيمكنك النقر على أي صنف لعرض مواصفاته الفنية أو إضافته للطلبية مباشرة:`,
      products: top.map(toSuggestion),
      quickReplies: ["هل يوجد توصيل؟", "أين يقع معرضكم وساعات العمل؟", "عرض أصناف أخرى"],
      showWhatsAppHandoff: false,
    };
  }

  // 8. Asking about the product currently open in /products/[id]
  if (activePageProduct && hasAnyKeyword(norm, ["هذا", "المنتج", "سعره", "مواصفاته", "مكوناته", "تفاصيل", "متوفر"])) {
    const spec = activePageProduct.ingredientsAr ? `\nالمواصفات والتركيب: ${activePageProduct.ingredientsAr}` : "";
    const notes =
      activePageProduct.allergens.length > 0
        ? `\nإرشادات الاستخدام والسلامة: ${activePageProduct.allergens.join("، ")}`
        : "";
    return {
      reply: `تفاصيل "${activePageProduct.nameAr}":\nالسعر: ${formatCurrency(activePageProduct.retailPrice)} / ${activePageProduct.unit}.${spec}${notes}`,
      products: [toSuggestion(activePageProduct)],
      quickReplies: ["أضفه أو اطلب عبر واتساب", "ما هي المواد والمنتجات المميزة؟"],
      showWhatsAppHandoff: false,
    };
  }

  // 9. General catalog / featured / categories / prices
  if (
    hasAnyKeyword(norm, [
      "كتالوج",
      "قائمه",
      "منتجات",
      "اصناف",
      "اسعار",
      "مميز",
      "موسمي",
      "عروض",
      "متوفر",
      "مواد",
      "بناء",
      "ديكور",
      "دهان",
      "دهانات",
      "جبس",
      "جبسم",
      "خشب",
      "رخام",
      "عزل",
      "غراء",
      "لاصق",
      "عدد",
    ])
  ) {
    const featured = products.filter((p) => p.isFeatured || p.isSeasonal).slice(0, 4);
    const list = featured.length > 0 ? featured : products.slice(0, 4);
    const catsText = categoryNames.length > 0 ? `الأقسام المتوفرة: ${categoryNames.join("، ")}.` : "";
    return {
      reply: `نوفر في روز باريس تشكيلة شاملة من مواد البناء والديكور عالية الجودة. ${catsText}\nإليك أبرز الأصناف الأكثر طلباً الآن:`,
      products: list.map(toSuggestion),
      quickReplies: ["أين يقع معرضكم وساعات العمل؟", "هل يوجد توصيل أو أسعار مقاولين؟", "تحدث مع خدمة العملاء واتساب"],
      showWhatsAppHandoff: false,
    };
  }

  // 10. Graceful fallback with WhatsApp handoff
  return {
    reply:
      "شكراً لتواصلك مع روز باريس لمواد البناء والديكور! لم أتمكن من تحديد طلبك بدقة في الكتالوج الحالي، لكن يمكنك سؤالي عن أي صنف (مثل دهان، جبس بورد، بديل خشب، بديل رخام، عزل، غراء)، أو عن المعرض والأسعار، أو التواصل مباشرة مع فريقنا عبر الواتساب:",
    products: products.filter((p) => p.isFeatured).slice(0, 2).map(toSuggestion),
    quickReplies: DEFAULT_QUICK_REPLIES,
    showWhatsAppHandoff: true,
  };
}

async function tryGeminiReply(
  message: string,
  history: ChatHistoryMessage[],
  products: ProductWithCategory[],
  branches: BranchRecord[],
  fallback: ChatResponsePayload
): Promise<ChatResponsePayload | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const catalogLines = products.slice(0, 40).map((p) => ({
    id: p.id,
    nameAr: p.nameAr,
    category: p.category?.nameAr ?? "",
    price: formatCurrency(p.retailPrice),
    unit: p.unit,
    ingredientsAr: p.ingredientsAr ?? "",
    allergens: p.allergens,
    featured: p.isFeatured,
  }));

  const systemPrompt = [
    "أنت المساعد الذكي الرسمي لشركة روز باريس لمواد البناء والديكور (Roze Parees Building Materials & Decor) في عمّان - الأردن (أم نوارة — نزول إشارات الغاز).",
    "أجب باللغة العربية بأسلوب هندسي وتجاري ودود ومختصر وواضح.",
    "استخدم فقط البيانات التالية ولا تخترع أسعاراً أو فروعاً غير موجودة.",
    `رقم الواتساب المباشر لخدمة العملاء وعروض أسعار المقاولين: 0770585313 (+962 7 7058 5313)`,
    `الفروع المسجلة: ${JSON.stringify(branches)}`,
    `قائمة المنتجات الحية: ${JSON.stringify(catalogLines)}`,
    'أعد الرد بصيغة JSON فقط بدون أي نص خارجه بهذا الشكل: {"reply": "...", "productIds": ["id1"], "quickReplies": ["...", "..."], "showWhatsAppHandoff": false}',
  ].join("\n");

  const contents = [
    ...history.slice(-6).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 450,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText) as {
      reply?: string;
      productIds?: string[];
      quickReplies?: string[];
      showWhatsAppHandoff?: boolean;
    };

    if (!parsed.reply || typeof parsed.reply !== "string") return null;

    const productMap = new Map(products.map((p) => [p.id, p]));
    const suggested = (Array.isArray(parsed.productIds) ? parsed.productIds : [])
      .map((id) => productMap.get(id))
      .filter((p): p is ProductWithCategory => Boolean(p))
      .slice(0, 4)
      .map(toSuggestion);

    return {
      reply: parsed.reply,
      products: suggested.length > 0 ? suggested : fallback.products,
      quickReplies:
        Array.isArray(parsed.quickReplies) && parsed.quickReplies.length > 0
          ? parsed.quickReplies.slice(0, 3)
          : fallback.quickReplies,
      showWhatsAppHandoff: Boolean(parsed.showWhatsAppHandoff),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      message?: unknown;
      history?: unknown;
      currentPath?: unknown;
    } | null;

    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) {
      return err("الرجاء كتابة رسالتك أولاً", 400);
    }
    if (message.length > 1000) {
      return err("الرسالة طويلة جداً، يرجى اختصارها إلى أقل من 1000 حرف", 400);
    }

    const history: ChatHistoryMessage[] = Array.isArray(body?.history)
      ? body.history
          .filter(
            (m): m is ChatHistoryMessage =>
              Boolean(m) &&
              typeof m === "object" &&
              ((m as ChatHistoryMessage).role === "user" ||
                (m as ChatHistoryMessage).role === "assistant") &&
              typeof (m as ChatHistoryMessage).content === "string"
          )
          .slice(-8)
      : [];

    const currentPath =
      typeof body?.currentPath === "string" ? body.currentPath : undefined;

    const [products, categories, branches] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          slug: true,
          nameAr: true,
          nameEn: true,
          descriptionAr: true,
          ingredientsAr: true,
          allergens: true,
          retailPrice: true,
          unit: true,
          images: true,
          isFeatured: true,
          isSeasonal: true,
          category: { select: { nameAr: true, slug: true } },
        },
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      }),
      prisma.productCategory.findMany({
        where: { isActive: true },
        select: { nameAr: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.branch.findMany({
        where: { isActive: true },
        select: { nameAr: true, address: true, phone: true, hours: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const categoryNames = categories.map((c) => c.nameAr);
    const smartFallback = buildSmartReply(
      message,
      products,
      categoryNames,
      branches,
      currentPath
    );

    const geminiResult = await tryGeminiReply(
      message,
      history,
      products,
      branches,
      smartFallback
    );

    return ok(geminiResult ?? smartFallback);
  } catch {
    return err("تعذر معالجة الرسالة حالياً، يمكنك مراسلتنا مباشرة على واتساب 0770585313", 500);
  }
}

