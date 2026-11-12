"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Award,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  UserCircle2,
  UserPlus,
} from "lucide-react";

interface AddressItem {
  id: string;
  label: string;
  city: string;
  area?: string | null;
  line1: string;
  isDefault: boolean;
}

interface AccountSnapshot {
  id: string;
  email: string;
  role: string;
  name: string;
  phone: string;
  createdAt: string;
  jobTitle?: string | null;
  merchantStatus?: string | null;
  loyalty: { points: number; tier: string };
  ordersCount: number;
  addresses: AddressItem[];
}

const ADMIN_ROLES = new Set([
  "SUPER_ADMIN",
  "BUSINESS_OWNER",
  "BRANCH_MANAGER",
  "CASHIER",
  "WAREHOUSE_STAFF",
  "PRODUCTION_STAFF",
  "CONTENT_MANAGER",
]);

const ROLE_AR: Record<string, string> = {
  CUSTOMER: "عميل روز باريس",
  MERCHANT: "مقاول / شريك جملة (B2B)",
  SUPER_ADMIN: "مدير النظام",
  BUSINESS_OWNER: "صاحب الشركة",
  BRANCH_MANAGER: "مدير فرع",
  CASHIER: "كاشير",
  WAREHOUSE_STAFF: "موظف مستودع",
  PRODUCTION_STAFF: "فريق الإنتاج",
  CONTENT_MANAGER: "مدير المحتوى",
  SUPPLIER: "مورد",
};

const TIER_AR: Record<string, { label: string; style: string }> = {
  BRONZE: {
    label: "العضوية البرونزية",
    style: "bg-amber-700/15 text-amber-800 dark:text-amber-300 border-amber-700/30",
  },
  SILVER: {
    label: "العضوية الفضية",
    style: "bg-stone-500/15 text-stone-700 dark:text-stone-200 border-stone-400/40",
  },
  GOLD: {
    label: "العضوية الذهبية",
    style: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40",
  },
  PLATINUM: {
    label: "العضوية البلاتينية",
    style: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
};

export function AccountClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [loading, setLoading] = useState(isLoggedIn);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Profile form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Address form state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addrLabel, setAddrLabel] = useState("المنزل");
  const [addrCity, setAddrCity] = useState("عمّان");
  const [addrArea, setAddrArea] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrDefault, setAddrDefault] = useState(true);
  const [savingAddr, setSavingAddr] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const res = await fetch("/api/account", { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: AccountSnapshot;
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "تعذر تحميل بيانات الحساب");
      }
      setAccount(json.data);
      setName(json.data.name);
      setPhone(json.data.phone);
    } catch (e) {
      setNotice({
        type: "err",
        text: e instanceof Error ? e.message : "حدث خطأ أثناء تحميل الحساب",
      });
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setNotice(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_PROFILE",
          name,
          phone,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { message: string; account: AccountSnapshot };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "فشل تحديث البيانات");
      }
      setAccount(json.data.account);
      setNotice({ type: "ok", text: json.data.message });
    } catch (e) {
      setNotice({ type: "err", text: e instanceof Error ? e.message : "فشل التحديث" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddr(true);
    setNotice(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_ADDRESS",
          label: addrLabel,
          city: addrCity,
          area: addrArea,
          line1: addrLine1,
          isDefault: addrDefault,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { message: string; account: AccountSnapshot };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "فشل إضافة العنوان");
      }
      setAccount(json.data.account);
      setAddrArea("");
      setAddrLine1("");
      setShowAddAddress(false);
      setNotice({ type: "ok", text: json.data.message });
    } catch (e) {
      setNotice({ type: "err", text: e instanceof Error ? e.message : "فشل إضافة العنوان" });
    } finally {
      setSavingAddr(false);
    }
  }

  async function handleAddressAction(
    action: "DELETE_ADDRESS" | "SET_DEFAULT_ADDRESS",
    addressId: string
  ) {
    setNotice(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, addressId }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { message: string; account: AccountSnapshot };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "فشل تحديث العنوان");
      }
      setAccount(json.data.account);
      setNotice({ type: "ok", text: json.data.message });
    } catch (e) {
      setNotice({ type: "err", text: e instanceof Error ? e.message : "حدث خطأ" });
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setNotice({ type: "err", text: "كلمة المرور الجديدة وتأكيدها غير متطابقتين" });
      return;
    }
    setSavingPass(true);
    setNotice(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_PASSWORD",
          currentPassword,
          newPassword,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { message: string };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "فشل تغيير كلمة المرور");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice({ type: "ok", text: json.data.message });
    } catch (e) {
      setNotice({ type: "err", text: e instanceof Error ? e.message : "فشل التغيير" });
    } finally {
      setSavingPass(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div dir="rtl" className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="rounded-3xl bg-[var(--color-bg-card)] border border-amber-900/15 dark:border-amber-500/20 p-8 sm:p-10 text-center shadow-xl space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-[#f7efe1] dark:bg-stone-800 border border-amber-500/30 p-2 mx-auto flex items-center justify-center shadow-md">
            <img
              src="/rozeparees.png"
              alt="روز باريس"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
              أهلاً بك في حسابي — روز باريس
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
              سجّل دخولك أو أنشئ حساباً مجانياً لحفظ عناوين التوصيل، متابعة طلباتك لحظة بلحظة، والاستفادة من نقاط الولاء والعروض الخاصة.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <Link
              href="/login?callbackUrl=/account"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-extrabold shadow-md transition"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#f7efe1] dark:bg-stone-800 border border-amber-900/15 dark:border-stone-700 hover:border-amber-500 text-sm font-extrabold transition"
            >
              <UserPlus className="w-4 h-4 text-amber-600" />
              <span>إنشاء حساب جديد</span>
            </Link>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)] flex flex-wrap justify-center gap-4 text-xs font-bold text-[var(--color-text-muted)]">
            <Link href="/orders" className="hover:text-amber-600 transition">
              تتبع طلب برقم الطلب ←
            </Link>
            <Link href="/menu" className="hover:text-amber-600 transition">
              تصفح كتالوج مواد البناء ←
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !account) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <div className="h-36 rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] animate-pulse" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64 rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] animate-pulse" />
          <div className="h-64 rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] animate-pulse" />
        </div>
      </div>
    );
  }

  const tierMeta = TIER_AR[account.loyalty.tier] ?? TIER_AR.BRONZE;
  const isStaffAdmin = ADMIN_ROLES.has(account.role);

  return (
    <div dir="rtl" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
      {/* Hero Card */}
      <div className="rounded-3xl bg-gradient-to-l from-[#1c130b] via-[#2f2011] to-amber-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-2xl font-extrabold text-amber-200 shrink-0">
              {account.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold">{account.name}</h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-amber-100">
                  {ROLE_AR[account.role] ?? account.role}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-100/80 mt-0.5">{account.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isStaffAdmin && (
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold transition shadow-sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>لوحة الإدارة</span>
              </Link>
            )}
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition"
            >
              <ClipboardList className="w-4 h-4" />
              <span>طلباتي ({account.ordersCount})</span>
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 text-rose-100 text-xs font-bold transition"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-black/20 border border-white/10">
            <p className="text-[11px] text-amber-200/80">نقاط الولاء</p>
            <p className="text-lg font-extrabold text-amber-300 flex items-center gap-1.5 mt-0.5">
              <Award className="w-4 h-4" />
              <span>{account.loyalty.points} نقطة</span>
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-black/20 border border-white/10">
            <p className="text-[11px] text-amber-200/80">المستوى</p>
            <p className="text-sm font-extrabold mt-1">{tierMeta.label}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-black/20 border border-white/10">
            <p className="text-[11px] text-amber-200/80">إجمالي الطلبات المسجلة</p>
            <p className="text-lg font-extrabold mt-0.5">{account.ordersCount} طلب</p>
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold border flex items-center gap-2 ${
            notice.type === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          {notice.type === "ok" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Profile Form */}
        <section className="rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--color-border)]">
            <UserCircle2 className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-extrabold">البيانات الشخصية</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5">الاسم الكامل</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                disabled
                value={account.email}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-muted)] border border-[var(--color-border)] text-sm opacity-75 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">رقم الهاتف</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="079XXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-extrabold transition shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? "جاري الحفظ..." : "حفظ البيانات"}</span>
            </button>
          </form>
        </section>

        {/* Security / Change Password */}
        <section className="rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--color-border)]">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-extrabold">الأمان وكلمة المرور</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5">كلمة المرور الحالية</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">كلمة المرور الجديدة</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={savingPass}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-extrabold transition shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{savingPass ? "جاري التحديث..." : "تحديث كلمة المرور"}</span>
            </button>
          </form>
        </section>
      </div>

      {/* Saved Addresses Book */}
      <section className="rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-base font-extrabold">عناوين التوصيل المحفوظة</h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                احفظ عناوينك لتسريع عملية إتمام الطلب في كل مرة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddAddress((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold transition"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddAddress ? "إلغاء" : "إضافة عنوان جديد"}</span>
          </button>
        </div>

        {showAddAddress && (
          <form
            onSubmit={handleAddAddress}
            className="p-4 rounded-2xl bg-[var(--color-bg)] border border-amber-500/30 space-y-3"
          >
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">اسم العنوان</label>
                <input
                  type="text"
                  required
                  value={addrLabel}
                  onChange={(e) => setAddrLabel(e.target.value)}
                  placeholder="المنزل / العمل"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">المدينة</label>
                <input
                  type="text"
                  required
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  placeholder="عمّان"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">المنطقة</label>
                <input
                  type="text"
                  value={addrArea}
                  onChange={(e) => setAddrArea(e.target.value)}
                  placeholder="الرابية / الدوار السابع"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">تفاصيل الشارع ورقم البناية</label>
              <input
                type="text"
                required
                value={addrLine1}
                onChange={(e) => setAddrLine1(e.target.value)}
                placeholder="اسم الشارع، رقم البناية، الطابق..."
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={addrDefault}
                  onChange={(e) => setAddrDefault(e.target.checked)}
                  className="w-4 h-4 accent-amber-600"
                />
                <span>تعيين كعنوان توصيل افتراضي</span>
              </label>

              <button
                type="submit"
                disabled={savingAddr}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-extrabold transition"
              >
                {savingAddr ? "جاري الحفظ..." : "حفظ العنوان"}
              </button>
            </div>
          </form>
        )}

        {account.addresses.length === 0 ? (
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] text-center py-4">
            لا توجد عناوين محفوظة حالياً. أضف عنوانك الأول لتسهيل الطلبات القادمة.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {account.addresses.map((addr) => (
              <div
                key={addr.id}
                className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                  addr.isDefault
                    ? "bg-amber-500/10 border-amber-500/40"
                    : "bg-[var(--color-bg)] border-[var(--color-border)]"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white">
                        الافتراضي
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {addr.city}
                    {addr.area ? ` — ${addr.area}` : ""}
                  </p>
                  <p className="text-xs text-[var(--color-text)] truncate">{addr.line1}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleAddressAction("SET_DEFAULT_ADDRESS", addr.id)}
                      title="تعيين كافتراضي"
                      className="p-2 rounded-lg text-amber-600 hover:bg-amber-500/10 transition"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAddressAction("DELETE_ADDRESS", addr.id)}
                    title="حذف العنوان"
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

