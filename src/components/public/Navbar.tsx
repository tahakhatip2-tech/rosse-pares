"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ShoppingBag, Menu, X, User } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const itemCount = useCartStore((state) => state.getItemCount());

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 backdrop-blur-md border-b ${isScrolled
          ? "bg-[#fdfaf5]/95 dark:bg-[#120c06]/95 border-amber-900/15 dark:border-amber-600/30 py-2.5 shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
          : "bg-[#fdfaf5]/85 dark:bg-[#0c0804]/90 border-amber-900/10 dark:border-stone-800/80 py-3.5"
          }`}
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">

            {/* Logo & Brand */}
            <Link href="/" className="flex items-center gap-3 no-underline shrink-0 group">
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-amber-500/30 dark:border-amber-500/40 bg-amber-500/5 dark:bg-black/40 flex items-center justify-center p-1 shrink-0 transition-transform group-hover:scale-105">
                <Image
                  src="/rozeparees.png"
                  alt="شعار روز باريس لمواد البناء والديكور"
                  width={40}
                  height={40}
                  className="object-contain w-full h-full"
                  priority
                  unoptimized
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-extrabold text-base sm:text-lg text-stone-900 dark:text-white transition-colors">
                  روز باريس
                </span>
                <span className="text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-400/80 tracking-wider font-sans font-medium">
                  ROZE PAREES
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hide-mobile flex items-center gap-6 text-sm font-semibold">
              {[
                { href: "/", label: "الرئيسية" },
                { href: "/menu", label: "كتالوج المواد" },
                { href: "/news", label: "آخر الأخبار" },
                { href: "/#branches", label: "المعرض والمستودع" },
                { href: "/#about", label: "عن الشركة" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-stone-700 hover:text-amber-600 dark:text-stone-300 dark:hover:text-amber-400 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/b2b"
                className="text-stone-700 hover:text-amber-600 dark:text-stone-300 dark:hover:text-amber-400 transition-colors"
              >
                توريد المقاولين والمشاريع
              </Link>
            </nav>

            {/* Actions: Theme Toggle + Cart + Login + Mobile Menu */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Theme Switcher Button */}
              <ThemeToggle />

              {/* Shopping Cart Button */}
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                aria-label="سلة التسوق"
                className="relative p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-700 dark:text-amber-400 transition flex items-center justify-center"
                style={{ width: 38, height: 38 }}
              >
                <ShoppingBag className="w-4 h-4" />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Account / Login Button */}
              <Link
                href="/account"
                className="hide-mobile flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all hover:-translate-y-0.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>حسابي / الدخول</span>
              </Link>

              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="show-mobile-only p-2 rounded-xl bg-stone-200/70 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 transition"
                aria-label="القائمة"
                style={{ width: 38, height: 38 }}
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            className="border-t border-stone-200 dark:border-stone-800 bg-[#fdfaf5]/98 dark:bg-[#0e0903]/98 px-6 py-4 flex flex-col gap-2 transition"
            dir="rtl"
          >
            {[
              { href: "/", label: "الرئيسية" },
              { href: "/menu", label: "كتالوج المواد" },
              { href: "/orders", label: "طلباتي" },
              { href: "/news", label: "آخر الأخبار" },
              { href: "/b2b", label: "توريد المقاولين والمشاريع" },
              { href: "/#branches", label: "المعرض والمستودع" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-stone-800 dark:text-stone-200 font-semibold border-b border-stone-200/50 dark:border-stone-800/60 text-sm hover:text-amber-600 transition"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 text-center py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm shadow-md transition"
            >
              حسابي / تسجيل الدخول
            </Link>
          </div>
        )}
      </header>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
