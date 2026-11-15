"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Store,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Edit3,
  Calendar,
  Lock,
  Unlock,
  BadgeCheck,
  Phone,
  MapPin,
  TrendingUp,
} from "lucide-react";

interface StoreRecord {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  logo?: string | null;
  phone?: string | null;
  city?: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionExpiry?: string | null;
  isActive: boolean;
  isPublic: boolean;
  isVerified: boolean;
  createdAt: string;
  _count?: {
    branches?: number;
    employees?: number;
    newsPosts?: number;
  };
}

const PLANS = ["ALL", "FREE", "BASIC", "PRO", "ENTERPRISE"];
const STATUSES = ["ALL", "ACTIVE", "TRIAL", "SUSPENDED", "EXPIRED"];

export default function SuperAdminDashboardPage() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    totalActive: 0,
    totalTrial: 0,
    totalSuspended: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modal State
  const [editStore, setEditStore] = useState<StoreRecord | null>(null);
  const [updating, setUpdating] = useState(false);
  const [modalPlan, setModalPlan] = useState("FREE");
  const [modalStatus, setModalStatus] = useState("ACTIVE");
  const [modalVerified, setModalVerified] = useState(false);
  const [modalActive, setModalActive] = useState(true);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedPlan !== "ALL") params.set("plan", selectedPlan);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);

      const res = await fetch(`/api/superadmin/stores?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setStores(json.data.stores || []);
        if (json.data.stats) setStats(json.data.stats);
      }
    } catch (err) {
      console.error("Error fetching superadmin stores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStores();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedPlan, selectedStatus]);

  const handleQuickStatusChange = async (storeId: string, nextStatus: string) => {
    try {
      const res = await fetch("/api/superadmin/stores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          subscriptionStatus: nextStatus,
        }),
      });
      if (res.ok) {
        fetchStores();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleVerified = async (storeId: string, currentVerified: boolean) => {
    try {
      const res = await fetch("/api/superadmin/stores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          isVerified: !currentVerified,
        }),
      });
      if (res.ok) {
        fetchStores();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (store: StoreRecord) => {
    setEditStore(store);
    setModalPlan(store.subscriptionPlan);
    setModalStatus(store.subscriptionStatus);
    setModalVerified(store.isVerified);
    setModalActive(store.isActive);
  };

  const handleSaveModal = async () => {
    if (!editStore) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/superadmin/stores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: editStore.id,
          subscriptionPlan: modalPlan,
          subscriptionStatus: modalStatus,
          isVerified: modalVerified,
          isActive: modalActive,
        }),
      });
      if (res.ok) {
        setEditStore(null);
        fetchStores();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100" dir="rtl">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-stone-900 text-white border-b border-stone-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center font-bold text-white shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
              <span>إدارة المنصة المركزية</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Super Admin
              </span>
            </h1>
            <p className="text-xs text-stone-400">التحكم في اشتراكات محلات مواد البناء، التوثيق، والتفعيل</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/stores"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>عرض الدليل العام</span>
          </Link>

          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>لوحة المتجر الحالي</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500 font-semibold block mb-1">إجمالي المحلات المسجلة</span>
              <span className="text-2xl font-black">{stats.total}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Store className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500 font-semibold block mb-1">اشتراكات نشطة (Active)</span>
              <span className="text-2xl font-black text-emerald-600">{stats.totalActive}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500 font-semibold block mb-1">فترة تجريبية (Trial)</span>
              <span className="text-2xl font-black text-amber-600">{stats.totalTrial}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500 font-semibold block mb-1">محلات محظورة / معلقة</span>
              <span className="text-2xl font-black text-red-600">{stats.totalSuspended}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search */}
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم، الرابط (Slug)، الهاتف، أو المدينة..."
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Plan Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">جميع الخطط</option>
                <option value="FREE">FREE (المجانية)</option>
                <option value="BASIC">BASIC (الأساسية)</option>
                <option value="PRO">PRO (المحترفة)</option>
                <option value="ENTERPRISE">ENTERPRISE (المؤسسات)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="ACTIVE">نشط (ACTIVE)</option>
                <option value="TRIAL">تجريبي (TRIAL)</option>
                <option value="SUSPENDED">معلق / محظور (SUSPENDED)</option>
                <option value="EXPIRED">منتهي (EXPIRED)</option>
              </select>
            </div>

            {/* Refresh */}
            <div className="md:col-span-1 flex justify-end">
              <button
                onClick={fetchStores}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors w-full flex items-center justify-center"
                title="تحديث"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Stores Table */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 dark:bg-stone-850 text-stone-500 font-bold border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="p-4">المحل والمنشأة</th>
                  <th className="p-4">المدينة / الهاتف</th>
                  <th className="p-4">الخطة</th>
                  <th className="p-4">حالة الاشتراك</th>
                  <th className="p-4">التوثيق</th>
                  <th className="p-4 text-center">إجراءات التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400">
                      جاري تحميل بيانات المحلات...
                    </td>
                  </tr>
                ) : stores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400">
                      لا توجد محلات تطابق شروط البحث الحالية.
                    </td>
                  </tr>
                ) : (
                  stores.map((store) => (
                    <tr
                      key={store.id}
                      className="hover:bg-stone-50/60 dark:hover:bg-stone-850/50 transition-colors"
                    >
                      {/* Name & Slug */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center font-bold shrink-0">
                            {store.logo ? (
                              <img src={store.logo} alt={store.nameAr} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <Store className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                                {store.nameAr}
                              </span>
                              {store.isVerified && (
                                <span title="موثق">
                                  <BadgeCheck className="w-4 h-4 text-amber-500 shrink-0" />
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/stores/${store.slug}`}
                              target="_blank"
                              className="text-[11px] text-amber-600 hover:underline flex items-center gap-1 font-mono mt-0.5"
                            >
                              <span>/stores/{store.slug}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* City & Phone */}
                      <td className="p-4 text-stone-600 dark:text-stone-300">
                        <div className="space-y-0.5">
                          {store.city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-500" />
                              <span>{store.city}</span>
                            </div>
                          )}
                          {store.phone && (
                            <div className="flex items-center gap-1 font-mono text-stone-400">
                              <Phone className="w-3 h-3" />
                              <span>{store.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="p-4">
                        <span className="font-extrabold text-[11px] px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                          {store.subscriptionPlan}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4">
                        {store.subscriptionStatus === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>نشط</span>
                          </span>
                        ) : store.subscriptionStatus === "TRIAL" ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>فترة تجريبية</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>محظور / معلق</span>
                          </span>
                        )}
                      </td>

                      {/* Verified Toggle */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleVerified(store.id, store.isVerified)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            store.isVerified
                              ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                              : "bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-stone-600"
                          }`}
                        >
                          {store.isVerified ? "✓ موثّق" : "غير موثّق"}
                        </button>
                      </td>

                      {/* Control Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {store.subscriptionStatus !== "ACTIVE" ? (
                            <button
                              onClick={() => handleQuickStatusChange(store.id, "ACTIVE")}
                              title="تفعيل الحساب فوراً"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 font-bold"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickStatusChange(store.id, "SUSPENDED")}
                              title="حظر / تعليق المحل"
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-300 font-bold"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => openEditModal(store)}
                            title="تعديل تفاصيل الاشتراك"
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Store Modal */}
      {editStore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base">إدارة اشتراك: {editStore.nameAr}</h3>
              <button
                onClick={() => setEditStore(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Plan */}
              <div>
                <label className="block font-bold text-stone-600 dark:text-stone-300 mb-1">
                  خطة الاشتراك (Plan):
                </label>
                <select
                  value={modalPlan}
                  onChange={(e) => setModalPlan(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-bold"
                >
                  <option value="FREE">FREE (مجانية - 20 منتج)</option>
                  <option value="BASIC">BASIC (29 د.أ/شهر - 200 منتج)</option>
                  <option value="PRO">PRO (79 د.أ/شهر - غير محدود)</option>
                  <option value="ENTERPRISE">ENTERPRISE (199 د.أ/شهر - دعم كامل)</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block font-bold text-stone-600 dark:text-stone-300 mb-1">
                  حالة الاشتراك (Status):
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-bold"
                >
                  <option value="ACTIVE">نشط (ACTIVE)</option>
                  <option value="TRIAL">فترة تجريبية (TRIAL)</option>
                  <option value="SUSPENDED">محظور / معلق (SUSPENDED)</option>
                  <option value="EXPIRED">منتهي الصلاحية (EXPIRED)</option>
                </select>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                  <input
                    type="checkbox"
                    checked={modalVerified}
                    onChange={(e) => setModalVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>توثيق المحل بشارة معتمد (Verified Badge)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                  <input
                    type="checkbox"
                    checked={modalActive}
                    onChange={(e) => setModalActive(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>تفعيل ظهور المحل في المنصة (Is Active)</span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setEditStore(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={updating}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {updating ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
