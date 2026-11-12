"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Hammer,
  ShoppingBag,
  Users,
  UserCog,
  Wallet,
  BarChart3,
  FileText,
  Settings,
  Store,
  MonitorSmartphone,
  LogOut,
  Menu,
  X,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
  ExternalLink,
  Bot,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AdminSecretaryWidget } from "@/components/admin/AdminSecretaryWidget";

interface AdminShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
  external?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "مدير النظام",
  BUSINESS_OWNER: "صاحب الشركة",
  BRANCH_MANAGER: "مدير الفرع",
  CASHIER: "كاشير",
  WAREHOUSE_STAFF: "موظف المستودع",
  PRODUCTION_STAFF: "موظف الإنتاج",
  CONTENT_MANAGER: "مدير المحتوى",
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "العمليات الأساسية",
    items: [
      { href: "/admin/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
      { href: "/admin/sales", label: "المبيعات والطلبات", icon: ShoppingBag },
      { href: "/admin/products", label: "المنتجات والأصناف", icon: Package },
      { href: "/admin/inventory", label: "المخزون والمواد", icon: Boxes },
    ],
  },
  {
    title: "الإنتاج وسلاسل الإمداد",
    items: [
      { href: "/admin/procurement", label: "المشتريات والموردين", icon: ShoppingCart, soon: true },
      { href: "/admin/production", label: "التجهيز والتجميع", icon: Hammer, soon: true },
    ],
  },
  {
    title: "الإدارة والتقارير",
    items: [
      { href: "/admin/customers", label: "العملاء والولاء", icon: Users, soon: true },
      { href: "/admin/employees", label: "الموظفون والدوام", icon: UserCog },
      { href: "/admin/finance", label: "المالية والمصاريف", icon: Wallet, soon: true },
      { href: "/admin/reports", label: "التقارير والتحليلات", icon: BarChart3, soon: true },
      { href: "/admin/cms", label: "إدارة المحتوى والأخبار", icon: FileText },
      { href: "/admin/secretary", label: "سكرتير المدير وإعداداته", icon: Bot },
      { href: "/admin/settings", label: "إعدادات النظام", icon: Settings, soon: true },
    ],
  },
];

export function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [soonNotice, setSoonNotice] = useState<string | null>(null);

  const roleLabel = (user.role && ROLE_LABELS[user.role]) || user.role || "إدارة";
  const initials = (user.name || user.email || "م")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const isRouteActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleSoonClick = (label: string) => {
    setSoonNotice(`قسم "${label}" قيد التطوير وسيتم تفعيله في المرحلة القادمة.`);
    setTimeout(() => setSoonNotice(null), 3500);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isCompact = collapsed && !isMobile;

    return (
      <div className="flex flex-col h-full bg-[#16100a] text-stone-200 select-none">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-stone-800/80 shrink-0">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 overflow-hidden"
            onClick={() => setMobileOpen(false)}
          >
            <div className="relative w-10 h-10 rounded-xl bg-stone-900 border border-amber-500/30 p-1 flex items-center justify-center shrink-0 shadow-md shadow-amber-950/50">
              <Image
                src="/rozeparees.png"
                alt="شعار روز باريس"
                width={36}
                height={36}
                className="object-contain w-full h-full"
              />
            </div>
            {!isCompact && (
              <div className="min-w-0">
                <p className="text-white font-extrabold text-sm tracking-tight truncate">
                  روز باريس
                </p>
                <p className="text-amber-400/80 text-[11px] font-medium truncate">
                  لوحة الإدارة المركزية
                </p>
              </div>
            )}
          </Link>

          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="hidden lg:flex p-1.5 rounded-lg text-stone-400 hover:text-amber-400 hover:bg-stone-800/70 transition"
              title={collapsed ? "توسيع القائمة" : "طي القائمة"}
              aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
            >
              {collapsed ? (
                <PanelRightOpen className="w-4 h-4" />
              ) : (
                <PanelRightClose className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1.5">
              {!isCompact && (
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  {group.title}
                </p>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(item.href);

                  if (item.soon) {
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => handleSoonClick(item.label)}
                        title={isCompact ? `${item.label} (قريباً)` : undefined}
                        className={`w-full flex items-center ${
                          isCompact ? "justify-center px-2" : "justify-between px-3"
                        } py-2.5 rounded-xl text-sm font-medium text-stone-400/75 hover:text-stone-200 hover:bg-stone-800/40 transition-all duration-200 group`}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <Icon className="w-[18px] h-[18px] shrink-0 text-stone-500 group-hover:text-stone-300 transition-colors" />
                          {!isCompact && <span className="truncate">{item.label}</span>}
                        </span>
                        {!isCompact && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-800/90 text-stone-400 border border-stone-700/60 shrink-0">
                            قريباً
                          </span>
                        )}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={isCompact ? item.label : undefined}
                      className={`flex items-center ${
                        isCompact ? "justify-center px-2" : "justify-between px-3"
                      } py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                        active
                          ? "bg-gradient-to-l from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-950/30"
                          : "text-stone-300 hover:text-white hover:bg-stone-800/60 border border-transparent"
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                            active
                              ? "text-amber-400"
                              : "text-stone-400 group-hover:text-amber-400"
                          }`}
                        />
                        {!isCompact && <span className="truncate">{item.label}</span>}
                      </span>
                      {active && !isCompact && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Channels */}
          <div className="space-y-1.5 pt-2 border-t border-stone-800/70">
            {!isCompact && (
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                الوصول السريع
              </p>
            )}
            <Link
              href="/pos"
              onClick={() => setMobileOpen(false)}
              title={isCompact ? "نقطة البيع (POS)" : undefined}
              className={`flex items-center ${
                isCompact ? "justify-center px-2" : "justify-between px-3"
              } py-2.5 rounded-xl text-sm font-semibold text-emerald-300/90 hover:text-emerald-200 hover:bg-emerald-950/40 border border-transparent hover:border-emerald-800/40 transition-all`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <MonitorSmartphone className="w-[18px] h-[18px] shrink-0 text-emerald-400" />
                {!isCompact && <span className="truncate">نقطة البيع (POS)</span>}
              </span>
              {!isCompact && <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />}
            </Link>

            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              title={isCompact ? "واجهة المتجر" : undefined}
              className={`flex items-center ${
                isCompact ? "justify-center px-2" : "justify-between px-3"
              } py-2.5 rounded-xl text-sm font-medium text-stone-300 hover:text-white hover:bg-stone-800/60 transition-all`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Store className="w-[18px] h-[18px] shrink-0 text-stone-400" />
                {!isCompact && <span className="truncate">واجهة المتجر</span>}
              </span>
              {!isCompact && <ExternalLink className="w-3.5 h-3.5 opacity-50 shrink-0" />}
            </Link>
          </div>
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-stone-800/80 bg-[#120d08] shrink-0">
          {isCompact ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xs font-bold"
                title={`${user.name || user.email} — ${roleLabel}`}
              >
                {initials}
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-2 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-950/40 transition"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {user.name || user.email}
                  </p>
                  <p className="text-[11px] text-amber-400/90 flex items-center gap-1 truncate">
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    <span className="truncate">{roleLabel}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-2 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-950/40 transition shrink-0"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)] text-[var(--color-text)] transition-colors">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen border-l border-stone-800/80 transition-all duration-300 z-30 ${
          collapsed ? "w-[78px]" : "w-[272px]"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full shadow-2xl border-l border-stone-800 z-10">
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Header */}
        <header className="h-16 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4 bg-[var(--color-bg-card)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>نظام إدارة روز باريس — متابعة مباشرة</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/pos"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
            >
              <MonitorSmartphone className="w-3.5 h-3.5" />
              <span>شاشة الكاشير</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Coming Soon Toast Banner */}
        {soonNotice && (
          <div className="fixed bottom-5 left-5 z-50 max-w-sm bg-stone-900 text-amber-200 border border-amber-500/40 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
            <Settings className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
            <span>{soonNotice}</span>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Executive Secretary Floating Assistant */}
      <AdminSecretaryWidget userRole={user.role} />
    </div>
  );
}

