"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Phone,
  Store,
  MapPin,
  MessageSquare,
  Building2,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const registerSchema = z.object({
  accountType: z.enum(["CUSTOMER", "SELLER"]),
  name: z.string().trim().min(2, "الاسم مطلوب (حرفين على الأقل)"),
  email: z.string().trim().email("بريد إلكتروني غير صالح"),
  phone: z.string().trim().min(7, "رقم الهاتف غير صالح").optional().or(z.literal("")),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),

  // حقول خاصة بالبائع / صاحب محل
  storeNameAr: z.string().trim().optional(),
  storeNameEn: z.string().trim().optional(),
  city: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/news";

  const [accountType, setAccountType] = useState<"CUSTOMER" | "SELLER">("CUSTOMER");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      accountType: "CUSTOMER",
    },
  });

  const handleRoleChange = (type: "CUSTOMER" | "SELLER") => {
    setAccountType(type);
    setValue("accountType", type);
    setFormError(null);
  };

  const onSubmit = async (data: RegisterForm) => {
    setFormError(null);

    if (accountType === "SELLER" && (!data.storeNameAr || data.storeNameAr.trim().length < 2)) {
      setFormError("يرجى كتابة اسم المحل أو المعرض التجاري");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          accountType,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFormError(json.error || "تعذر إنشاء الحساب");
        return;
      }

      // تسجيل الدخول التلقائي بعد إنشاء الحساب
      const signInRes = await signIn("credentials", {
        email: data.email.toLowerCase(),
        password: data.password,
        redirect: false,
      });

      if (signInRes?.error) {
        router.push(`/login?callbackUrl=${encodeURIComponent(json.data?.redirectTo || callbackUrl)}`);
      } else {
        const destination = json.data?.redirectTo || (accountType === "SELLER" ? "/admin" : callbackUrl);
        router.push(destination);
        router.refresh();
      }
    } catch {
      setFormError("حدث خطأ في الاتصال بالخادم، يرجى المحاولة مجدداً");
    }
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden bg-stone-950">
        <img
          src="/images/hero-home.jpg"
          alt="روز باريس لمواد البناء والديكور"
          className="absolute inset-0 w-full h-full object-cover brightness-[0.22] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/75 to-amber-950/50" />

        <div className="relative z-10 text-center text-white px-12 max-w-lg">
          <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20 p-2 overflow-hidden shadow-2xl">
            <Image
              src="/rozeparees.png"
              alt="شعار روز باريس"
              width={80}
              height={80}
              className="object-contain w-full h-full"
            />
          </div>
          <h1 className="text-3xl font-extrabold mb-3">منصة روز باريس السحابية</h1>
          <p className="text-lg text-amber-200/90 mb-8 font-light">
            بوابتك الرقمية الشاملة لبيع وشراء مواد البناء والديكور في المملكة
          </p>

          <div className="space-y-3 text-right">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <span className="p-2 rounded-lg bg-amber-500/20 text-amber-300 text-lg">🏗️</span>
              <div>
                <h4 className="font-semibold text-white text-sm">لأصحاب محلات ومعارض البناء</h4>
                <p className="text-xs text-white/70 mt-1">
                  لوحة تحكم ذكية، إدارة مخزون كاملة، نقطة بيع POS، ورابط متجر خاص بك لمشاركته مع عملائك.
                </p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <span className="p-2 rounded-lg bg-blue-500/20 text-blue-300 text-lg">🛍️</span>
              <div>
                <h4 className="font-semibold text-white text-sm">للزبائن والمقاولين</h4>
                <p className="text-xs text-white/70 mt-1">
                  تصفح دليل المحلات المعتمدة، طلب مواد البناء والديكور بأسعار منافسة، وتتبع الشحنات.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 lg:max-w-xl flex flex-col justify-center p-6 sm:p-10 bg-[var(--color-bg)] relative transition-colors overflow-y-auto">
        <div className="absolute top-6 left-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md mx-auto py-8">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-stone-900 border border-amber-500/30 flex items-center justify-center p-1 overflow-hidden shadow-sm">
              <Image
                src="/rozeparees.png"
                alt="شعار روز باريس"
                width={40}
                height={40}
                className="object-contain w-full h-full"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text)]">روز باريس</h1>
              <p className="text-xs text-[var(--color-text-subtle)]">المنصة السحابية لمواد البناء</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
            إنشاء حساب جديد
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            اختر نوع حسابك للبدء في استخدام المنصة
          </p>

          {/* Role / Account Type Selector */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-2">
              نوع الحساب المطلوب:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option: Customer */}
              <button
                type="button"
                onClick={() => handleRoleChange("CUSTOMER")}
                className={`relative flex flex-col items-center p-4 rounded-xl border-2 text-center transition-all ${
                  accountType === "CUSTOMER"
                    ? "border-amber-600 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-sm"
                    : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 text-[var(--color-text-muted)]"
                }`}
              >
                {accountType === "CUSTOMER" && (
                  <CheckCircle2 className="w-4 h-4 text-amber-600 absolute top-2 left-2" />
                )}
                <ShoppingBag className="w-6 h-6 mb-2 text-amber-600" />
                <span className="text-sm">زبون / مشتري</span>
                <span className="text-[11px] opacity-75 font-normal mt-0.5">تسوق وشراء مواد بناء</span>
              </button>

              {/* Option: Seller */}
              <button
                type="button"
                onClick={() => handleRoleChange("SELLER")}
                className={`relative flex flex-col items-center p-4 rounded-xl border-2 text-center transition-all ${
                  accountType === "SELLER"
                    ? "border-amber-600 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-sm"
                    : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 text-[var(--color-text-muted)]"
                }`}
              >
                {accountType === "SELLER" && (
                  <CheckCircle2 className="w-4 h-4 text-amber-600 absolute top-2 left-2" />
                )}
                <Building2 className="w-6 h-6 mb-2 text-amber-600" />
                <span className="text-sm">بائع / صاحب محل</span>
                <span className="text-[11px] opacity-75 font-normal mt-0.5">لوحة تحكم + إدارة متجر</span>
              </button>
            </div>
          </div>

          {formError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <span>⚠️</span> {formError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Account Owner Name */}
            <Input
              {...register("name")}
              type="text"
              label={accountType === "SELLER" ? "اسم صاحب المحل / المسؤول" : "الاسم الكامل"}
              placeholder={accountType === "SELLER" ? "مثال: طارق الخالدي" : "مثال: أحمد محمد"}
              icon={<User className="w-4 h-4" />}
              error={errors.name?.message}
              required
            />

            {/* Email */}
            <Input
              {...register("email")}
              type="email"
              label="البريد الإلكتروني"
              placeholder="example@email.com"
              icon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              autoComplete="email"
              required
            />

            {/* Phone */}
            <Input
              {...register("phone")}
              type="tel"
              label="رقم الهاتف"
              placeholder="079xxxxxxx"
              icon={<Phone className="w-4 h-4" />}
              error={errors.phone?.message}
            />

            {/* SELLER SPECIFIC FIELDS */}
            {accountType === "SELLER" && (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3.5 animate-fadeIn">
                <div className="flex items-center gap-2 pb-1 border-b border-amber-500/10">
                  <Store className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    بيانات المحل / المعرض التجاري
                  </span>
                </div>

                <Input
                  {...register("storeNameAr")}
                  type="text"
                  label="اسم المحل أو الشركة بالعربي"
                  placeholder="مثال: مؤسسة الأمل لمواد البناء والديكور"
                  icon={<Store className="w-4 h-4" />}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    {...register("city")}
                    type="text"
                    label="المدينة / المنطقة"
                    placeholder="مثال: عمان - المقابلين"
                    icon={<MapPin className="w-4 h-4" />}
                  />

                  <Input
                    {...register("whatsapp")}
                    type="tel"
                    label="رقم الواتساب للطلبات"
                    placeholder="077xxxxxxx"
                    icon={<MessageSquare className="w-4 h-4" />}
                  />
                </div>

                <Input
                  {...register("description")}
                  type="text"
                  label="وصف نشاط المحل (اختياري)"
                  placeholder="مثال: وكيل دهانات، مواد عزل، وسيراميك وأدوات صحية"
                />
              </div>
            )}

            {/* Password */}
            <div className="relative">
              <Input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                label="كلمة المرور"
                placeholder="6 أحرف على الأقل"
                icon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute end-3 top-[34px] p-1 text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
              {isSubmitting
                ? "جارٍ إنشاء الحساب..."
                : accountType === "SELLER"
                ? "🚀 إنشاء حساب المحل وبدء التجربة المجانية"
                : "إنشاء الحساب"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--color-text-subtle)]">
            لديك حساب بالفعل؟&nbsp;
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="text-[var(--color-primary)] font-medium hover:underline"
            >
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
          جاري التحميل...
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
