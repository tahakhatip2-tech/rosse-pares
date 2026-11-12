"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Layers,
  Newspaper,
  UserCircle2,
} from "lucide-react";

const HIDDEN_PREFIXES = ["/admin", "/pos", "/login", "/register", "/unauthorized"];

export function BottomNavBar() {
  const pathname = usePathname() || "/";

  const isHidden = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
  if (isHidden) return null;

  const isMenuActive =
    pathname === "/menu" ||
    pathname.startsWith("/menu/") ||
    pathname.startsWith("/products/");
  const isOrdersActive =
    pathname === "/orders" || pathname.startsWith("/orders/");
  const isHomeActive = pathname === "/";
  const isNewsActive = pathname === "/news" || pathname.startsWith("/news/");
  const isAccountActive =
    pathname === "/account" || pathname.startsWith("/account/");

  return (
    <nav
      dir="rtl"
      aria-label="شريط التنقل السريع"
      className="fixed bottom-0 inset-x-0 md:bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[540px] z-40"
    >
      <div className="relative bg-[#fdfaf5]/95 dark:bg-[#161009]/95 backdrop-blur-xl border-t md:border border-amber-900/15 dark:border-amber-500/25 md:rounded-3xl shadow-[0_-8px_30px_rgba(26,18,9,0.08)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.55)] md:shadow-2xl px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-5 items-end gap-1">
          {/* 1. المنتجات */}
          <NavTab
            href="/menu"
            label="المنتجات"
            active={isMenuActive}
            icon={Layers}
          />

          {/* 2. طلباتي */}
          <NavTab
            href="/orders"
            label="طلباتي"
            active={isOrdersActive}
            icon={ClipboardList}
          />

          {/* 3. الرئيسية (زر الشعار الدائري البارز بالمنتصف) */}
          <div className="flex flex-col items-center justify-end -mt-8 pb-0.5">
            <Link
              href="/"
              aria-current={isHomeActive ? "page" : undefined}
              aria-label="الرئيسية — روز باريس"
              className="group flex flex-col items-center justify-center focus:outline-none"
            >
              <span
                style={{ backgroundImage: "url('/rozeparees.png')" }}
                className={`w-15 h-15 rounded-full bg-[#fdfaf5] dark:bg-[#1e150c] bg-cover bg-center border-[3px] border-solid border-orange-500 transition-all duration-300 ${
                  isHomeActive
                    ? "shadow-[0_0_20px_rgba(249,115,22,0.45)] ring-4 ring-orange-500/20 scale-105"
                    : "shadow-lg shadow-orange-950/20 hover:scale-105 hover:shadow-[0_0_16px_rgba(249,115,22,0.35)]"
                }`}
              />
              <span
                className={`mt-1 text-[11px] font-extrabold transition-colors ${
                  isHomeActive
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-stone-600 dark:text-stone-400"
                }`}
              >
                الرئيسية
              </span>
            </Link>
          </div>

          {/* 4. الأخبار */}
          <NavTab
            href="/news"
            label="الأخبار"
            active={isNewsActive}
            icon={Newspaper}
          />

          {/* 5. حسابي */}
          <NavTab
            href="/account"
            label="حسابي"
            active={isAccountActive}
            icon={UserCircle2}
          />
        </div>
      </div>
    </nav>
  );
}

function NavTab({
  href,
  label,
  active,
  icon: Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all duration-200 ${
        active
          ? "text-amber-700 dark:text-amber-400"
          : "text-stone-500 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-300"
      }`}
    >
      <span
        className={`p-1.5 rounded-xl transition-colors ${
          active ? "bg-amber-500/15" : "group-hover:bg-amber-500/10"
        }`}
      >
        <Icon className="w-5 h-5" />
      </span>
      <span className={`text-[11px] mt-0.5 ${active ? "font-extrabold" : "font-semibold"}`}>
        {label}
      </span>
      {active && (
        <span
          aria-hidden="true"
          className="mt-0.5 w-4 h-0.5 rounded-full bg-amber-600 dark:bg-amber-400"
        />
      )}
    </Link>
  );
}

