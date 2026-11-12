import { z } from "zod";
import { prisma } from "@/lib/db";

export const SECRETARY_SETTING_KEY = "admin_secretary_settings";

export const SECRETARY_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "BUSINESS_OWNER",
  "BRANCH_MANAGER",
  "CASHIER",
  "WAREHOUSE_STAFF",
  "PRODUCTION_STAFF",
  "CONTENT_MANAGER",
] as const;

export const QuickPromptSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  prompt: z.string().min(1).max(400),
});

export const SecretarySettingsSchema = z.object({
  // General & Persona
  enabled: z.boolean(),
  displayName: z.string().min(2).max(60),
  subtitle: z.string().min(2).max(90),
  tone: z.enum(["EXECUTIVE_CONCISE", "DETAILED_ANALYTICAL", "FRIENDLY_ADVISOR"]),
  autoBriefingOnOpen: z.boolean(),
  dailyRevenueTarget: z.number().min(0).max(1000000),
  customInstructions: z.string().max(1500),

  // AI Engine Configuration
  engineMode: z.enum(["HYBRID_GEMINI", "LOCAL_DETERMINISTIC"]),
  geminiModel: z.enum(["gemini-2.0-flash", "gemini-2.5-flash"]),
  temperature: z.number().min(0).max(1),

  // Access & Full Scopes
  allowedRoles: z.array(z.enum(SECRETARY_ADMIN_ROLES)).min(1),
  readScopes: z.object({
    sales: z.boolean(),
    products: z.boolean(),
    inventory: z.boolean(),
    production: z.boolean(),
    finance: z.boolean(),
    customers: z.boolean(),
    cms: z.boolean(),
    audit: z.boolean(),
  }),

  // Action Execution & Safety Guardrails
  allowCommands: z.boolean(),
  requireConfirmation: z.boolean(),
  commandScopes: z.object({
    orders: z.boolean(),
    products: z.boolean(),
    inventory: z.boolean(),
    cms: z.boolean(),
    expenses: z.boolean(),
  }),
  maxPriceChangePercent: z.number().min(1).max(500),
  maxStockAdjustmentQty: z.number().min(1).max(100000),

  // Custom Quick Prompts
  quickPrompts: z.array(QuickPromptSchema).max(12),
});

export type QuickPrompt = z.infer<typeof QuickPromptSchema>;
export type SecretarySettings = z.infer<typeof SecretarySettingsSchema>;

export const DEFAULT_SECRETARY_SETTINGS: SecretarySettings = {
  enabled: true,
  displayName: "سكرتير المدير الذكي",
  subtitle: "تحليل البيانات التنفيذية وتنفيذ الأوامر",
  tone: "EXECUTIVE_CONCISE",
  autoBriefingOnOpen: true,
  dailyRevenueTarget: 1500,
  customInstructions:
    "ركّز على تنبيه المدير لنواقص المخزون الحرجة، الطلبات المعلقة، وفرص زيادة المبيعات بأسلوب إداري مباشر ومنظم.",

  engineMode: "HYBRID_GEMINI",
  geminiModel: "gemini-2.0-flash",
  temperature: 0.3,

  allowedRoles: ["SUPER_ADMIN", "BUSINESS_OWNER", "BRANCH_MANAGER"],
  readScopes: {
    sales: true,
    products: true,
    inventory: true,
    production: true,
    finance: true,
    customers: true,
    cms: true,
    audit: true,
  },

  allowCommands: true,
  requireConfirmation: true,
  commandScopes: {
    orders: true,
    products: true,
    inventory: true,
    cms: true,
    expenses: true,
  },
  maxPriceChangePercent: 50,
  maxStockAdjustmentQty: 1000,

  quickPrompts: [
    {
      id: "briefing",
      label: "الملخص التنفيذي الشامل",
      prompt: "أعطني الملخص التنفيذي الشامل لأداء شركة روز باريس اليوم والشهر",
    },
    {
      id: "low-stock",
      label: "نواقص المستودع الحرجة",
      prompt: "ما هي الأصناف ومواد البناء التي وصلت لحد إعادة الطلب أو نفدت؟",
    },
    {
      id: "pending-orders",
      label: "الطلبات المعلقة والقنوات",
      prompt: "اعرض تحليل الطلبات المعلقة وتوزيع المبيعات حسب القنوات",
    },
    {
      id: "top-products",
      label: "الأكثر مبيعاً والأرباح",
      prompt: "ما هي المواد الأكثر مبيعاً وما تحليل الأسعار والتكلفة؟",
    },
    {
      id: "b2b-finance",
      label: "المالية والمقاولون B2B",
      prompt: "لخّص المصاريف وحالة المقاولين وتجار الجملة B2B وأوامر التجهيز",
    },
    {
      id: "audit-recent",
      label: "آخر حركات التدقيق",
      prompt: "اعرض آخر 10 حركات في سجل التدقيق والنشاط الإداري",
    },
  ],
};

function mergeWithDefaults(raw: unknown): SecretarySettings {
  if (!raw || typeof raw !== "object") return DEFAULT_SECRETARY_SETTINGS;
  const r = raw as Record<string, unknown>;
  const merged = {
    ...DEFAULT_SECRETARY_SETTINGS,
    ...r,
    readScopes: {
      ...DEFAULT_SECRETARY_SETTINGS.readScopes,
      ...(typeof r.readScopes === "object" && r.readScopes ? r.readScopes : {}),
    },
    commandScopes: {
      ...DEFAULT_SECRETARY_SETTINGS.commandScopes,
      ...(typeof r.commandScopes === "object" && r.commandScopes ? r.commandScopes : {}),
    },
  };
  const parsed = SecretarySettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SECRETARY_SETTINGS;
}

export async function getSecretarySettings(): Promise<SecretarySettings> {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: SECRETARY_SETTING_KEY },
      select: { value: true },
    });
    return mergeWithDefaults(record?.value);
  } catch {
    return DEFAULT_SECRETARY_SETTINGS;
  }
}

export async function saveSecretarySettings(
  nextSettings: SecretarySettings
): Promise<SecretarySettings> {
  const validated = SecretarySettingsSchema.parse(nextSettings);
  await prisma.systemSetting.upsert({
    where: { key: SECRETARY_SETTING_KEY },
    update: {
      value: validated as unknown as object,
      group: "AI_SECRETARY",
    },
    create: {
      key: SECRETARY_SETTING_KEY,
      value: validated as unknown as object,
      group: "AI_SECRETARY",
    },
  });
  return validated;
}

export function isRoleAllowedForSecretary(
  role: string | null | undefined,
  settings: SecretarySettings
): boolean {
  if (!role) return false;
  if (role === "SUPER_ADMIN") return true;
  return (settings.allowedRoles as string[]).includes(role);
}

