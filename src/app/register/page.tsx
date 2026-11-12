"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, Mail, User, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const registerSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب (حرفين على الأقل)"),
  email: z.string().trim().email("بريد إلكتروني غير صالح"),
  phone: z.string().trim().optional(),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
});
type RegisterForm = z.infer<typeof registerSchema>;

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/news";

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setFormError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFormError(json.error || "تعذر إنشاء الحساب");
        return;
      }

      const signInRes = await signIn("credentials", {
        email: data.email.toLowerCase(),
        password: data.password,
        redirect: false,
      });

      if (signInRes?.error) {
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setFormError("حدث خطأ في الاتصال بالخادم");
    }
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden bg-stone-950">
        <img
          src="/images/hero-home.jpg"
          alt="روز باريس لمواد البناء والديكور"
          className="absolute inset-0 w-full h-full object-cover brightness-[0.25] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-amber-950/50" />

        <div className="relative z-10 text-center text-white px-12">
          <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20 p-2 overflow-hidden shadow-xl">
            <Image
              src="/rozeparees.png"
              alt="شعار روز باريس"
              width={80}
              height={80}
              className="object-contain w-full h-full"
            />
          </div>
          <h1 className="text-4xl font-bold mb-3">شركاء وعملاء روز باريس</h1>
          <p className="text-xl text-amber-200 mb-8">
            انضم إلينا وتابع أحدث مواد البناء والديكور وعروض المقاولين
          </p>

          <div className="grid grid-cols-1 gap-4 text-sm text-white/75 max-w-sm mx-auto">
            {[
              "🏗️ استعرض أحدث الدهانات والديكورات والمشاريع",
              "🎁 احصل على عروض ومزايا المقاولين والعملاء",
              "🚚 تتبع طلبيات التوريد والشحن بسهولة وسرعة",
            ].map((item) => (
              <div
                key={item}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-right"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 lg:max-w-md flex flex-col items-center justify-center p-8 bg-[var(--color-bg)] relative transition-colors">
        <div className="absolute top-6 left-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm animate-fadeIn">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
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
              <p className="text-xs text-[var(--color-text-subtle)]">إنشاء حساب عميل / مقاول جديد</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-1">
            إنشاء حساب جديد
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            سجّل الآن لمتابعة أخبار وعروض روز باريس والطلب بسهولة
          </p>

          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
              <span>⚠️</span> {formError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              {...register("name")}
              type="text"
              label="الاسم الكامل"
              placeholder="مثال: أحمد محمد"
              icon={<User className="w-4 h-4" />}
              error={errors.name?.message}
              required
            />

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

            <Input
              {...register("phone")}
              type="tel"
              label="رقم الهاتف (اختياري)"
              placeholder="079xxxxxxx"
              icon={<Phone className="w-4 h-4" />}
              error={errors.phone?.message}
            />

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
              {isSubmitting ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
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

