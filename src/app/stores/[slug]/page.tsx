"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Store,
  MapPin,
  Phone,
  MessageSquare,
  Share2,
  CheckCircle2,
  Building,
  ShoppingBag,
  Newspaper,
  Clock,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ShoppingCart,
  Plus,
} from "lucide-react";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { useCartStore } from "@/lib/cart-store";

export default function StoreShowcasePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [storeData, setStoreData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "news" | "about">("products");
  const [copied, setCopied] = useState(false);
  const [addedItem, setAddedItem] = useState<string | null>(null);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (!slug) return;

    const fetchStore = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stores/${slug}`);
        const json = await res.json();

        if (json.success && json.data) {
          setStoreData(json.data.store);
          setProducts(json.data.products || []);
        } else {
          setError(json.error || "تعذر العثور على هذا المحل");
        }
      } catch (err) {
        console.error("Error fetching store:", err);
        setError("حدث خطأ في تحميل بيانات المحل");
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [slug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const shareWhatsApp = () => {
    if (!storeData) return;
    const text = `تفضل بزيارة صفحة ومنتجات ${storeData.nameAr} على منصة روز باريس:\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank");
  };

  const handleAddToCart = (product: any) => {
    addItem({
      id: product.id,
      productId: product.id,
      nameAr: product.nameAr,
      nameEn: product.nameEn || product.nameAr,
      price: product.retailPrice,
      image: product.images?.[0] || "/images/placeholder.jpg",
      unit: product.unit || "قطعة",
      qty: 1,
    });
    setAddedItem(product.id);
    setTimeout(() => setAddedItem(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950" dir="rtl">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-stone-500">جاري تحميل بيانات المحل والمنتجات...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950" dir="rtl">
        <Navbar />
        <main className="flex-1 max-w-lg mx-auto px-4 py-20 text-center">
          <Store className="w-16 h-16 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">المحل غير متاح حالياً</h2>
          <p className="text-xs text-stone-500 mb-6">{error || "تأكد من صحة الرابط أو تفضل بزيارة دليل المحلات."}</p>
          <Link
            href="/stores"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لدليل المحلات</span>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100" dir="rtl">
      <Navbar />

      <main className="flex-1">
        {/* Cover & Hero Banner */}
        <section className="relative bg-stone-900 text-white overflow-hidden">
          {/* Cover image or gradient background */}
          <div className="relative h-48 sm:h-72 w-full bg-gradient-to-r from-stone-900 via-stone-850 to-amber-950">
            {storeData.coverImage && (
              <img
                src={storeData.coverImage}
                alt={storeData.nameAr}
                className="w-full h-full object-cover opacity-60"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
          </div>

          {/* Profile Identity Bar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-16 sm:-mt-20 pb-8 z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              {/* Store Avatar & Titles */}
              <div className="flex items-start sm:items-end gap-4 sm:gap-6">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl bg-stone-900 border-4 border-stone-950 shadow-2xl flex items-center justify-center font-bold text-3xl text-amber-500 overflow-hidden shrink-0">
                  {storeData.logo ? (
                    <img src={storeData.logo} alt={storeData.nameAr} className="w-full h-full object-cover" />
                  ) : (
                    <Building className="w-12 h-12" />
                  )}
                </div>

                <div className="pt-2 sm:pt-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                      {storeData.nameAr}
                    </h1>
                    {storeData.isVerified && (
                      <span className="inline-flex items-center gap-1 bg-amber-500 text-stone-950 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-stone-950 text-amber-500" />
                        <span>معتمد وموثّق</span>
                      </span>
                    )}
                  </div>

                  {storeData.nameEn && (
                    <p className="text-xs sm:text-sm text-stone-400 font-mono mb-2">
                      {storeData.nameEn}
                    </p>
                  )}

                  {storeData.city && (
                    <p className="text-xs text-amber-400 flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{storeData.city}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons & Share */}
              <div className="flex flex-wrap items-center gap-2.5 self-start md:self-end">
                {storeData.whatsapp && (
                  <a
                    href={`https://wa.me/${storeData.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("مرحباً، أود الاستفسار وطلب مواد بناء من متجركم على روز باريس.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>طلب عبر الواتساب</span>
                  </a>
                )}

                {storeData.phone && (
                  <a
                    href={`tel:${storeData.phone}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 backdrop-blur-md transition-all"
                  >
                    <Phone className="w-4 h-4" />
                    <span>اتصال</span>
                  </a>
                )}

                {/* Share Dropdown Buttons */}
                <button
                  onClick={shareWhatsApp}
                  title="مشاركة عبر واتساب"
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-emerald-600/30 text-emerald-400 border border-white/15 backdrop-blur-md transition-colors"
                >
                  <span className="text-sm">💬</span>
                </button>

                <button
                  onClick={shareFacebook}
                  title="مشاركة عبر فيسبوك"
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-blue-600/30 text-blue-400 border border-white/15 backdrop-blur-md transition-colors"
                >
                  <span className="text-sm">🌐</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  title="نسخ رابط المحل"
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 backdrop-blur-md transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "تم النسخ" : "نسخ الرابط"}</span>
                </button>
              </div>
            </div>

            {/* Description */}
            {storeData.description && (
              <p className="text-xs sm:text-sm text-stone-300 mt-4 max-w-3xl leading-relaxed">
                {storeData.description}
              </p>
            )}
          </div>
        </section>

        {/* Content Tabs */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 mb-8 text-sm">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === "products"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>المنتجات ومواد البناء ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("news")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === "news"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              <Newspaper className="w-4 h-4" />
              <span>أخبار وعروض المحل ({storeData.newsPosts?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === "about"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              <Building className="w-4 h-4" />
              <span>الفروع ومعلومات المحل</span>
            </button>
          </div>

          {/* TAB 1: PRODUCTS */}
          {activeTab === "products" && (
            <div>
              {products.length === 0 ? (
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-12 text-center max-w-md mx-auto">
                  <ShoppingBag className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
                  <h3 className="font-bold text-base mb-1">لا توجد منتجات معروضة حالياً</h3>
                  <p className="text-xs text-stone-500">
                    يقوم المحل بتحديث قائمة منتجات مواد البناء والأسعار، تفضل بالتواصل معه عبر الواتساب للاستفسار.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden hover:shadow-lg hover:border-amber-500/40 transition-all flex flex-col justify-between"
                    >
                      {/* Product Image */}
                      <div className="relative h-44 bg-stone-100 dark:bg-stone-800 overflow-hidden">
                        <img
                          src={product.images?.[0] || "/images/placeholder.jpg"}
                          alt={product.nameAr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.isFeatured && (
                          <span className="absolute top-2 right-2 bg-amber-500 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                            مميز
                          </span>
                        )}
                      </div>

                      {/* Info & Price */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          {product.category?.nameAr && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mb-1 block">
                              {product.category.nameAr}
                            </span>
                          )}
                          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 line-clamp-2 mb-2">
                            {product.nameAr}
                          </h4>
                        </div>

                        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                          <div>
                            <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                              {Number(product.retailPrice).toFixed(2)} د.أ
                            </span>
                            <span className="text-[10px] text-stone-400 block font-normal">
                              لكل {product.unit || "قطعة"}
                            </span>
                          </div>

                          <button
                            onClick={() => handleAddToCart(product)}
                            className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              addedItem === product.id
                                ? "bg-emerald-600 text-white"
                                : "bg-stone-100 dark:bg-stone-800 hover:bg-amber-600 hover:text-white text-stone-700 dark:text-stone-300"
                            }`}
                            title="إضافة إلى السلة"
                          >
                            {addedItem === product.id ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span className="text-[11px]">أضيف!</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-4 h-4" />
                                <span className="text-[11px]">شراء</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NEWS & POSTS */}
          {activeTab === "news" && (
            <div>
              {(!storeData.newsPosts || storeData.newsPosts.length === 0) ? (
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-12 text-center max-w-md mx-auto">
                  <Newspaper className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
                  <h3 className="font-bold text-base mb-1">لا توجد منشورات حالياً</h3>
                  <p className="text-xs text-stone-500">
                    لم يقم المحل بنشر عروض أو مقالات مؤخراً.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {storeData.newsPosts.map((post: any) => (
                    <article
                      key={post.id}
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      {post.mediaUrl && (
                        <div className="h-44 bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <img
                            src={post.mediaUrl}
                            alt={post.title || "منشور"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <span className="text-[11px] text-stone-400 block mb-1">
                          {new Date(post.createdAt).toLocaleDateString("ar-JO")}
                        </span>
                        {post.title && (
                          <h4 className="font-bold text-base mb-2 text-stone-900 dark:text-stone-100">
                            {post.title}
                          </h4>
                        )}
                        <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed mb-4">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-stone-400 pt-3 border-t border-stone-100 dark:border-stone-800">
                          <span>❤️ {post.likesCount || 0} إعجاب</span>
                          <span>💬 {post.commentsCount || 0} تعليقات</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ABOUT & BRANCHES */}
          {activeTab === "about" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Store Contacts Card */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-600" />
                  <span>معلومات التواصل</span>
                </h3>
                <div className="space-y-3 text-xs">
                  {storeData.phone && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800">
                      <span className="text-stone-400">الهاتف:</span>
                      <a href={`tel:${storeData.phone}`} className="font-bold font-mono text-amber-600">
                        {storeData.phone}
                      </a>
                    </div>
                  )}
                  {storeData.whatsapp && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                      <span className="text-stone-400">واتساب للطلبيات:</span>
                      <a
                        href={`https://wa.me/${storeData.whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold font-mono text-emerald-600"
                      >
                        {storeData.whatsapp}
                      </a>
                    </div>
                  )}
                  {storeData.email && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800">
                      <span className="text-stone-400">البريد الإلكتروني:</span>
                      <span className="font-mono text-stone-700 dark:text-stone-300">{storeData.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Branches List */}
              <div className="md:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-600" />
                  <span>فروع ومواقع المحل ({storeData.branches?.length || 0})</span>
                </h3>

                <div className="space-y-3">
                  {storeData.branches?.map((branch: any) => (
                    <div
                      key={branch.id}
                      className="p-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 mb-1">
                          {branch.nameAr}
                        </h4>
                        <p className="text-stone-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            {typeof branch.address === "object"
                              ? `${branch.address?.city || ""} - ${branch.address?.street || ""}`
                              : branch.address || "العنوان متاح لدى الإدارة"}
                          </span>
                        </p>
                      </div>

                      {branch.phone && (
                        <a
                          href={`tel:${branch.phone}`}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white font-bold shrink-0 self-start sm:self-auto"
                        >
                          اتصال بالفرع
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
