"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Phone,
  MessageSquare,
  Share2,
  CheckCircle2,
  ExternalLink,
  Store,
  Copy,
  Check,
  Building,
  ArrowLeft,
} from "lucide-react";

export interface StoreItem {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  logo?: string | null;
  coverImage?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  description?: string | null;
  isVerified?: boolean;
  subscriptionPlan?: string;
  _count?: {
    branches?: number;
    newsPosts?: number;
  };
}

export default function StoreCard({ store }: { store: StoreItem }) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // توليد الرابط الكامل للمحل
  const storeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/stores/${store.slug}`
      : `https://rozeparees.com/stores/${store.slug}`;

  const shareText = `تفضل بزيارة صفحة ومنتجات ${store.nameAr} على منصة روز باريس لمواد البناء والديكور:`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${storeUrl}`)}`;
    window.open(url, "_blank");
  };

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="group relative bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-amber-500/40 transition-all duration-300 flex flex-col">
      {/* Cover / Header Header */}
      <div className="relative h-36 sm:h-40 bg-gradient-to-r from-stone-800 to-amber-950 overflow-hidden">
        {store.coverImage ? (
          <img
            src={store.coverImage}
            alt={store.nameAr}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-900/60 backdrop-blur-sm">
            <Store className="w-12 h-12 text-white/20" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Verified Badge */}
        {store.isVerified && (
          <div className="absolute top-3 right-3 bg-amber-500 text-stone-950 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
            <CheckCircle2 className="w-3.5 h-3.5 fill-stone-950 text-amber-500" />
            <span>معتمد وموثّق</span>
          </div>
        )}

        {/* Share Button (Top Left) */}
        <div className="absolute top-3 left-3">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            aria-label="مشاركة بطاقة المحل"
            className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-full transition-colors shadow-sm"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Share Dropdown */}
          {showShareMenu && (
            <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl p-2 z-50 text-right animate-fadeIn">
              <div className="text-[11px] font-bold text-stone-400 px-2 py-1 border-b border-stone-100 dark:border-stone-800 mb-1">
                مشاركة رابط المحل:
              </div>

              <button
                onClick={shareWhatsApp}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 rounded-lg transition-colors"
              >
                <span className="text-emerald-500 text-sm">💬</span>
                <span>عبر الواتساب (WhatsApp)</span>
              </button>

              <button
                onClick={shareFacebook}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 rounded-lg transition-colors"
              >
                <span className="text-blue-500 text-sm">🌐</span>
                <span>عبر فيسبوك (Facebook)</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>{copied ? "تم نسخ الرابط بنجاح!" : "نسخ رابط المحل (انستا/غيره)"}</span>
              </button>
            </div>
          )}
        </div>

        {/* City Badge */}
        {store.city && (
          <div className="absolute bottom-3 right-3 text-white/90 text-xs flex items-center gap-1 font-medium bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>{store.city}</span>
          </div>
        )}
      </div>

      {/* Store Body Info */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Logo & Name */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden shadow-sm">
              {store.logo ? (
                <img src={store.logo} alt={store.nameAr} className="w-full h-full object-cover" />
              ) : (
                <Building className="w-6 h-6" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Link href={`/stores/${store.slug}`}>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors line-clamp-1">
                  {store.nameAr}
                </h3>
              </Link>
              {store.nameEn && (
                <p className="text-xs text-stone-400 dark:text-stone-500 line-clamp-1 font-mono">
                  {store.nameEn}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mb-4 leading-relaxed">
            {store.description || "معرض ومحل متخصص في توفير أفضل مواد البناء والديكورات والتشطيبات."}
          </p>

          {/* Counters / Stats */}
          <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400 pb-4 mb-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{store._count?.branches || 1} فروع</span>
            </div>
            {store._count?.newsPosts !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="text-stone-300 dark:text-stone-700">•</span>
                <span>{store._count.newsPosts} منشورات وعروض</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Direct Contact Row */}
          <div className="grid grid-cols-2 gap-2">
            {store.whatsapp ? (
              <a
                href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("مرحباً، أود الاستفسار عن منتجات مواد البناء المتوفرة لديكم.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-semibold transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </a>
            ) : store.phone ? (
              <a
                href={`tel:${store.phone}`}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 text-xs font-semibold transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال</span>
              </a>
            ) : null}

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? "تم النسخ" : "مشاركة"}</span>
            </button>
          </div>

          {/* Visit Store Button */}
          <Link
            href={`/stores/${store.slug}`}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all group-hover:bg-amber-700"
          >
            <span>زيارة المحل وتصفح المنتجات</span>
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
