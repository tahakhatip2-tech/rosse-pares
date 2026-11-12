"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Cpu,
  History,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  DEFAULT_SECRETARY_SETTINGS,
  SECRETARY_ADMIN_ROLES,
  type QuickPrompt,
  type SecretarySettings,
} from "@/lib/secretary-settings";

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  oldData: unknown;
  newData: unknown;
  createdAt: string;
  actorName: string;
  actorRole: string;
}

type TabKey = "persona" | "ai" | "permissions" | "prompts" | "audit";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "مدير النظام (Super Admin)",
  BUSINESS_OWNER: "صاحب الشركة",
  BRANCH_MANAGER: "مدير الفرع",
  CASHIER: "الكاشير",
  WAREHOUSE_STAFF: "موظف المستودع",
  PRODUCTION_STAFF: "موظف الإنتاج",
  CONTENT_MANAGER: "مدير المحتوى",
};

const READ_SCOPE_LABELS: Array<{ key: keyof SecretarySettings["readScopes"]; label: string }> = [
  { key: "sales", label: "المبيعات والطلبات والإيرادات" },
  { key: "products", label: "المنتجات والتسعير والهوامش" },
  { key: "inventory", label: "المخزون والمستودعات ونواقص الأصناف" },
  { key: "production", label: "الإنتاج وأوامر الشراء" },
  { key: "finance", label: "المالية والمصاريف الشهرية" },
  { key: "customers", label: "العملاء وتجار الجملة B2B والفروع" },
  { key: "cms", label: "الأخبار والمحتوى والتفاعلات" },
  { key: "audit", label: "سجل التدقيق والنشاط الأمني" },
];

const COMMAND_SCOPE_LABELS: Array<{
  key: keyof SecretarySettings["commandScopes"];
  label: string;
  example: string;
}> = [
  {
    key: "orders",
    label: "أوامر تحديث حالة الطلبات",
    example: "مثال: غيّر حالة الطلب ORD-... إلى جاهز",
  },
  {
    key: "products",
    label: "أوامر تفعيل/إيقاف المنتجات وتعديل الأسعار",
    example: "مثال: عدّل سعر دهان إلى 34.50 | أوقف منتج ...",
  },
  {
    key: "inventory",
    label: "أوامر تعديل كميات المستودع (مع قيد StockMovement)",
    example: "مثال: زد مخزون جبس بورد بمقدار 25",
  },
  {
    key: "cms",
    label: "أوامر نشر الأخبار والإعلانات",
    example: "مثال: انشر خبر: وصول دفعة جديدة من بديل الرخام اليوم",
  },
  {
    key: "expenses",
    label: "أوامر تسجيل المصاريف التشغيلية",
    example: "مثال: سجّل مصروف 35 صيانة مستودع",
  },
];

export default function AdminSecretarySettingsPage() {
  const [tab, setTab] = useState<TabKey>("persona");
  const [settings, setSettings] = useState<SecretarySettings>(DEFAULT_SECRETARY_SETTINGS);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [newPromptLabel, setNewPromptLabel] = useState("");
  const [newPromptText, setNewPromptText] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setAccessError(null);
    try {
      const res = await fetch("/api/admin/secretary/settings", { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: {
          settings: SecretarySettings;
          hasGeminiKey: boolean;
          auditLogs: AuditEntry[];
        };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        setAccessError(json.error || "تعذر تحميل إعدادات سكرتير المدير");
        return;
      }
      setSettings(json.data.settings);
      setHasGeminiKey(json.data.hasGeminiKey);
      setAuditLogs(json.data.auditLogs);
    } catch {
      setAccessError("حدث خطأ أثناء تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/secretary/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { settings: SecretarySettings };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "فشل حفظ الإعدادات");
      }
      setSettings(json.data.settings);
      setNotice({ type: "ok", text: "تم حفظ إعدادات سكرتير المدير بنجاح وتطبيقها فوراً." });
      window.dispatchEvent(new CustomEvent("rf-secretary-settings-updated"));
      fetchSettings();
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "فشل حفظ الإعدادات",
      });
    } finally {
      setSaving(false);
    }
  }

  function toggleRole(role: (typeof SECRETARY_ADMIN_ROLES)[number]) {
    setSettings((prev) => {
      const exists = prev.allowedRoles.includes(role);
      if (exists && prev.allowedRoles.length <= 1) return prev;
      return {
        ...prev,
        allowedRoles: exists
          ? prev.allowedRoles.filter((r) => r !== role)
          : [...prev.allowedRoles, role],
      };
    });
  }

  function handleAddQuickPrompt() {
    const label = newPromptLabel.trim();
    const prompt = newPromptText.trim();
    if (!label || !prompt) return;
    if (settings.quickPrompts.length >= 12) {
      setNotice({ type: "err", text: "الحد الأقصى للأوامر السريعة هو 12 أمراً." });
      return;
    }
    const item: QuickPrompt = {
      id: `qp-${Date.now()}`,
      label,
      prompt,
    };
    setSettings((prev) => ({
      ...prev,
      quickPrompts: [...prev.quickPrompts, item],
    }));
    setNewPromptLabel("");
    setNewPromptText("");
  }

  function handleRemoveQuickPrompt(id: string) {
    setSettings((prev) => ({
      ...prev,
      quickPrompts: prev.quickPrompts.filter((q) => q.id !== id),
    }));
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
        جاري تحميل لوحة إعدادات سكرتير المدير...
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
        <Shield className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h1 className="text-lg font-extrabold text-[var(--color-text)]">وصول مقيد</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{accessError}</p>
      </div>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: "persona", label: "الهوية والأهداف", icon: Sliders },
    { key: "ai", label: "محرك الذكاء الاصطناعي", icon: Cpu },
    { key: "permissions", label: "الصلاحيات والأوامر والأمان", icon: Shield },
    { key: "prompts", label: "الأوامر السريعة", icon: ListChecks },
    { key: "audit", label: "سجل تدقيق السكرتير", icon: History },
  ];

  return (
    <div dir="rtl" className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1c130b] to-amber-700 text-amber-300 flex items-center justify-center shrink-0 shadow-md">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[var(--color-text)]">
              لوحة تحكم سكرتير المدير الذكي
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              إدارة شاملة لصلاحيات الوصول، محرك التحليل والذكاء، قيود الأمان، والأوامر السريعة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setSettings(DEFAULT_SECRETARY_SETTINGS)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-bg-muted)] text-xs font-bold transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-bold border ${
            notice.type === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
                active
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Persona & Targets */}
      {tab === "persona" && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
            <div>
              <h2 className="text-sm font-extrabold">تفعيل سكرتير المدير الذكي في الإدارة</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                إظهار أو إخفاء زر الشات العائم عبر كافة صفحات لوحة التحكم `/admin/*`
              </p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings((p) => ({ ...p, enabled: e.target.checked }))}
                className="w-5 h-5 accent-amber-600"
              />
              <span className="text-xs font-bold">{settings.enabled ? "مفعّل" : "معطّل"}</span>
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5">الاسم الظاهر للسكرتير</label>
              <input
                type="text"
                value={settings.displayName}
                onChange={(e) => setSettings((p) => ({ ...p, displayName: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">الوصف الفرعي تحت الاسم</label>
              <input
                type="text"
                value={settings.subtitle}
                onChange={(e) => setSettings((p) => ({ ...p, subtitle: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">أسلوب التقارير والردود</label>
              <select
                value={settings.tone}
                onChange={(e) =>
                  setSettings((p) => ({
                    ...p,
                    tone: e.target.value as SecretarySettings["tone"],
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
              >
                <option value="EXECUTIVE_CONCISE">تنفيذي مركّز ومباشر</option>
                <option value="DETAILED_ANALYTICAL">تحليلي مفصّل بالأرقام والمقارنات</option>
                <option value="FRIENDLY_ADVISOR">مستشار إداري تفاعلي ودود</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">هدف المبيعات اليومي (د.أ)</label>
              <input
                type="number"
                min={0}
                step={50}
                value={settings.dailyRevenueTarget}
                onChange={(e) =>
                  setSettings((p) => ({
                    ...p,
                    dailyRevenueTarget: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoBriefingOnOpen}
              onChange={(e) =>
                setSettings((p) => ({ ...p, autoBriefingOnOpen: e.target.checked }))
              }
              className="w-4 h-4 accent-amber-600"
            />
            <div>
              <span className="text-xs font-bold block">توليد الملخص التنفيذي تلقائياً عند فتح الشات</span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                عند فتح سكرتير المدير لأول مرة في الجلسة، يقدم موجز اليوم والمخزون والتنبيهات تلقائياً
              </span>
            </div>
          </label>

          <div>
            <label className="block text-xs font-bold mb-1.5">
              توجيهات المدير الخاصة (Custom System Instructions)
            </label>
            <textarea
              rows={4}
              value={settings.customInstructions}
              onChange={(e) =>
                setSettings((p) => ({ ...p, customInstructions: e.target.value }))
              }
              placeholder="اكتب أي تعليمات أو أولويات يلتزم بها السكرتير في تحليلاته..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
            />
          </div>
        </div>
      )}

      {/* Tab 2: AI Engine */}
      {tab === "ai" && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 space-y-5">
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
              hasGeminiKey
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-amber-500/10 border-amber-500/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles
                className={`w-5 h-5 shrink-0 ${
                  hasGeminiKey ? "text-emerald-600" : "text-amber-600"
                }`}
              />
              <div>
                <p className="text-xs font-extrabold">
                  {hasGeminiKey
                    ? "مفتاح GEMINI_API_KEY مفعّل وجاهز على السيرفر"
                    : "مفتاح GEMINI_API_KEY غير مضاف حالياً في البيئة"}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  {hasGeminiKey
                    ? "سيستخدم السكرتير صياغة Gemini الذكية فوق البيانات الحية لقاعدة البيانات."
                    : "يعمل السكرتير بالكامل عبر المحرك التحليلي المحلي المباشر مع MongoDB دون أي أعطال، ويمكنك إضافة GEMINI_API_KEY في .env مستقبلاً لتفعيل الصياغة التوليدية تلقائياً."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5">وضع المحرك</label>
              <select
                value={settings.engineMode}
                onChange={(e) =>
                  setSettings((p) => ({
                    ...p,
                    engineMode: e.target.value as SecretarySettings["engineMode"],
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
              >
                <option value="HYBRID_GEMINI">هجين (محلي + Gemini AI عند توفره)</option>
                <option value="LOCAL_DETERMINISTIC">محلي حتمي 100% (مباشر مع DB فقط)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">موديل Gemini</label>
              <select
                value={settings.geminiModel}
                onChange={(e) =>
                  setSettings((p) => ({
                    ...p,
                    geminiModel: e.target.value as SecretarySettings["geminiModel"],
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
              >
                <option value="gemini-2.0-flash">gemini-2.0-flash (سريع ومتوازن)</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash (تحليل متقدم)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">
                درجة المرونة الإبداعية (Temperature: {settings.temperature})
              </label>
              <input
                type="range"
                min={0}
                max={0.9}
                step={0.1}
                value={settings.temperature}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, temperature: Number(e.target.value) }))
                }
                className="w-full accent-amber-600 mt-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Permissions & Safety Guardrails */}
      {tab === "permissions" && (
        <div className="space-y-5">
          {/* Allowed Roles */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-extrabold">الأدوار المصرح لها بالوصول للسكرتير</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              اختر الأدوار الإدارية التي سيظهر لها زر ومحادثة سكرتير المدير (دور SUPER_ADMIN يملك وصولاً دائماً).
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {SECRETARY_ADMIN_ROLES.map((role) => {
                const checked = settings.allowedRoles.includes(role);
                return (
                  <label
                    key={role}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      checked
                        ? "border-amber-500/60 bg-amber-500/10"
                        : "border-[var(--color-border)] bg-[var(--color-bg)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={role === "SUPER_ADMIN"}
                      onChange={() => toggleRole(role)}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span className="text-xs font-bold">{ROLE_LABELS[role] ?? role}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Full Read Scopes */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-extrabold">نطاقات البيانات التحليلية (الوصول الشامل للقراءة)</h2>
            <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
              {READ_SCOPE_LABELS.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={settings.readScopes[item.key]}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        readScopes: { ...p.readScopes, [item.key]: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-amber-600"
                  />
                  <span className="text-xs font-bold">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Command Scopes + Safety Limits */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-sm font-extrabold">السماح بتنفيذ الأوامر الإدارية المباشرة</h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  تمكين السكرتير من تعديل حالات الطلبات، الأسعار، المخزون، نشر الأخبار، وتسجيل المصاريف
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowCommands}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, allowCommands: e.target.checked }))
                }
                className="w-5 h-5 accent-amber-600"
              />
            </div>

            <div className="space-y-2.5">
              {COMMAND_SCOPE_LABELS.map((cmd) => (
                <label
                  key={cmd.key}
                  className="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    disabled={!settings.allowCommands}
                    checked={settings.commandScopes[cmd.key]}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        commandScopes: { ...p.commandScopes, [cmd.key]: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 mt-0.5 accent-amber-600"
                  />
                  <div>
                    <span className="text-xs font-bold block">{cmd.label}</span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">{cmd.example}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-3 border-t border-[var(--color-border)] grid sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-500/40 bg-amber-500/5 cursor-pointer sm:col-span-3">
                <input
                  type="checkbox"
                  checked={settings.requireConfirmation}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, requireConfirmation: e.target.checked }))
                  }
                  className="w-4 h-4 accent-amber-600"
                />
                <div>
                  <span className="text-xs font-extrabold block">
                    اشتراط بطاقة موافقة وتأكيد قبل تنفيذ أي أمر (موصى به لمنع الأخطاء)
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    يعرض التغيير (قبل ← بعد) داخل الشات ولا ينفذه إلا بعد ضغط زر &quot;تأكيد وتنفيذ الآن&quot;
                  </span>
                </div>
              </label>

              <div>
                <label className="block text-xs font-bold mb-1.5">
                  الحد الأقصى لتعديل السعر بأمر واحد (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={settings.maxPriceChangePercent}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      maxPriceChangePercent: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">
                  الحد الأقصى لتعديل المخزون بأمر واحد (وحدة)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={settings.maxStockAdjustmentQty}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      maxStockAdjustmentQty: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Quick Prompts */}
      {tab === "prompts" && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-sm font-extrabold">الأوامر السريعة الظاهرة في شات السكرتير</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              اختصارات بضغطة زر لتنفيذ تحليلات متكررة فوراً (الحد الأقصى 12 اختصاراً)
            </p>
          </div>

          <div className="space-y-2.5">
            {settings.quickPrompts.map((qp) => (
              <div
                key={qp.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold">{qp.label}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">
                    {qp.prompt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveQuickPrompt(qp.id)}
                  className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition shrink-0"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-dashed border-amber-500/40 space-y-3">
            <h3 className="text-xs font-extrabold">إضافة اختصار سريع جديد</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="عنوان الزر (مثلاً: مبيعات الكيك)"
                value={newPromptLabel}
                onChange={(e) => setNewPromptLabel(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs"
              />
              <input
                type="text"
                placeholder="نص الأمر الكامل المرسل للسكرتير..."
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                className="sm:col-span-2 px-3 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs"
              />
            </div>
            <button
              type="button"
              onClick={handleAddQuickPrompt}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة للقائمة (تذكر الضغط على حفظ الإعدادات)</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Audit Logs */}
      {tab === "audit" && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-extrabold">سجل تدقيق أوامر وإعدادات السكرتير</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              توثيق أمني غير قابل للتعديل لكل أمر تم تنفيذه أو تغيير في الإعدادات
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
              لم يتم تنفيذ أي أوامر عبر السكرتير حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-bold">الحدث</th>
                    <th className="px-4 py-3 font-bold">الكيان</th>
                    <th className="px-4 py-3 font-bold">المنفّذ</th>
                    <th className="px-4 py-3 font-bold">التفاصيل الجديدة</th>
                    <th className="px-4 py-3 font-bold">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--color-bg-muted)]/40">
                      <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">
                        {log.action}
                      </td>
                      <td className="px-4 py-3">{log.entity}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold">{log.actorName}</span>
                        <span className="block text-[10px] text-[var(--color-text-muted)]">
                          {log.actorRole}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate font-mono text-[11px]">
                        {log.newData ? JSON.stringify(log.newData) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-muted)]">
                        {new Date(log.createdAt).toLocaleString("ar-JO")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

