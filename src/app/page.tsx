import Link from "next/link";
import {
  Layers,
  ShoppingBag,
  Sparkles,
  Clock,
  ShieldCheck,
  Truck,
  Building2,
  ChevronLeft,
  MapPin,
  Phone,
  Award,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { ProductCard, PublicProductCardItem } from "@/components/public/ProductCard";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  {
    title: "الدهانات ومواد الطلاء",
    desc: "دهانات مائية وزيتية فاخرة، معجون داخلي وخارجي، وبرايمر تأسيس",
    icon: "🎨",
    slug: "paints",
  },
  {
    title: "الجبس بورد والديكور",
    desc: "ألواح جبس بورد عادي ومقاوم للرطوبة والحريق مع مقاطع الأوميغا والزوايا",
    icon: "🏗️",
    slug: "gypsum",
  },
  {
    title: "بديل الخشب والرخام",
    desc: "ألواح WPC الجدارية الفاخرة وشرائح PVC بديل الرخام بأحدث التصاميم",
    icon: "🪵",
    slug: "wood-marble",
  },
  {
    title: "العزل والمواد الإنشائية",
    desc: "رولات ودهانات العزل المائي والحراري، وغراء البورسلان والسيراميك",
    icon: "🛡️",
    slug: "insulation",
  },
  {
    title: "العدد والأدوات الهندسية",
    desc: "أدوات الدهان والديكور، مساطر الليزر، وعدد الورش والمقاولين",
    icon: "🛠️",
    slug: "tools",
  },
  {
    title: "توريد المقاولين والمشاريع",
    desc: "أسعار جملة خاصة وتوريد مجدول لمواقع البناء وشركات المقاولات",
    icon: "📦",
    slug: "wholesale",
  },
];

export default async function HomePage() {
  const dbProducts = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    take: 6,
    include: {
      category: {
        select: { id: true, nameAr: true, slug: true },
      },
    },
  });

  const featuredProducts: PublicProductCardItem[] = dbProducts.map((p) => ({
    id: p.id,
    slug: p.slug,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    descriptionAr: p.descriptionAr,
    retailPrice: p.retailPrice,
    unit: p.unit,
    images: p.images || [],
    isFeatured: p.isFeatured,
    isSeasonal: p.isSeasonal,
    category: p.category,
  }));

  const liveBatch = featuredProducts.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#fdfaf5] text-stone-900 dark:bg-stone-950 dark:text-stone-100 flex flex-col font-sans transition-colors duration-300">
      <Navbar />

      {/* ── 1. Hero Section (Showroom & Architectural Building Materials Banner) ── */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36 border-b border-amber-900/10 dark:border-stone-800 transition-colors">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-home.jpg"
            alt="روز باريس لمواد البناء والديكور"
            className="w-full h-full object-cover object-center brightness-[0.35] dark:brightness-[0.22] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/75 dark:from-stone-950 dark:via-stone-950/80 dark:to-black/90" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6 text-white">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/25 border border-amber-400/35 text-amber-300 text-xs font-bold backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>جودة معمارية ومواد بناء معتمدة في عمّان</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-md">
            فخامة التشطيبات الحديثة...
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
              ومتانة مواد البناء الأصيلة
            </span>
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-stone-200 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            في <span className="text-amber-300 font-bold">روز باريس لمواد البناء والديكور</span> نجمع بين أحدث صيحات الديكور الداخلي من بديل الخشب والرخام والدهانات، وأقوى المواد الإنشائية ومواد العزل.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/menu"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-600/35 flex items-center justify-center gap-2 transition hover:-translate-y-0.5 text-center"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>تصفح الكتالوج واطلب الآن</span>
            </Link>

            <Link
              href="/b2b"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-md font-bold text-sm flex items-center justify-center gap-2 transition hover:-translate-y-0.5 shadow-sm text-center"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>توريد المقاولين والمشاريع</span>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/15 max-w-lg mx-auto">
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-3xl font-black text-amber-400 font-mono">+200</span>
              <span className="text-[11px] sm:text-xs text-stone-300">صنف بناء وديكور</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-3xl font-black text-amber-400 font-mono">100%</span>
              <span className="text-[11px] sm:text-xs text-stone-300">مطابق للمواصفات</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-3xl font-black text-amber-400 font-mono">فوري</span>
              <span className="text-[11px] sm:text-xs text-stone-300">تجهيز من المستودع</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Ready Warehouse Dispatch Section ── */}
      <section className="py-12 lg:py-16 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                الأصناف الأكثر طلباً في المستودع
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                متوفرة للتسليم الفوري من مستودع أم نوارة المركزي
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
            جاهز للتحميل الآن
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6">
          {liveBatch.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400 hover:text-amber-600 transition"
          >
            <span>عرض كافة مواد البناء والديكور وأسعارها</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16 bg-[#f8f2e7]/70 dark:bg-stone-900/40 border-y border-stone-200 dark:border-stone-800/60 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <h2 className="text-3xl font-extrabold text-stone-900 dark:text-white transition-colors">
              أقسام ومجالات روز باريس
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400 transition-colors">
              كل ما تحتاجه لمشروعك من التأسيس والعزل حتى التشطيب والديكور الفاخر
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={cat.slug === "wholesale" ? "/b2b" : `/menu?category=${cat.slug}`}
                className="group p-6 rounded-2xl bg-white dark:bg-stone-900/60 border border-stone-200/90 dark:border-stone-800 hover:border-amber-500/50 hover:shadow-lg dark:hover:bg-stone-900 transition transform hover:-translate-y-1 shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
                  {cat.icon}
                </div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                  {cat.title}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 leading-relaxed">
                  {cat.desc}
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-500 group-hover:text-amber-500">
                  <span>تصفح الأصناف</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Shelf */}
      <section className="py-16 lg:py-24 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
              مختارات المعرض
            </span>
            <h2 className="text-3xl font-black text-stone-900 dark:text-white mt-1 transition-colors">
              أبرز منتجات روز باريس
            </h2>
          </div>
          <Link
            href="/menu"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-1 transition-colors"
          >
            <span>عرض كافة المنتجات والأسعار</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {featuredProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section
        id="about"
        className="py-16 bg-[#f8f2e7]/70 dark:bg-stone-900/50 border-t border-stone-200 dark:border-stone-800 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-14">
            <h2 className="text-3xl font-extrabold text-stone-900 dark:text-white transition-colors">
              لماذا روز باريس؟
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400 transition-colors">
              نلتزم بتوريد مواد بناء وديكور موثوقة تجمع بين المتانة والجمال المعماري
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-white dark:bg-stone-950/60 border border-stone-200/90 dark:border-stone-800 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 mx-auto flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base">
                مواصفات هندسية معتمدة
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                نختار مواد الطلاء والجبس والعزل والديكور من مصانع عالمية وإقليمية موثوقة.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-stone-950/60 border border-stone-200/90 dark:border-stone-800 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 mx-auto flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base">
                تجهيز فوري للطلبيات
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                مستودعنا في أم نوارة يضمن توفر الكميات الكبيرة للمقاولين والورش دون تأخير.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-stone-950/60 border border-stone-200/90 dark:border-stone-800 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 mx-auto flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base">
                توصيل لمواقع العمل
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                خدمة نقل وشحن سريعة لمشاريع البناء والورش في كافة مناطق عمّان والمحافظات.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-stone-950/60 border border-stone-200/90 dark:border-stone-800 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 mx-auto flex items-center justify-center text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base">
                ضمان الجودة والفوترة
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                فواتير ضريبية رسمية (ISTD 16%) واستشارة فنية لاختيار المواد الأنسب لمشروعك.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* B2B Callout */}
      <section className="py-16 bg-gradient-to-r from-amber-800 via-amber-900 to-amber-950 text-white border-y border-amber-700/40 shadow-inner">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
            <Building2 className="w-4 h-4" />
            <span>بوابة المقاولين والشركات B2B</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white">
            شريك التوريد الموثوق لمشاريعك الإنشائية في الأردن
          </h2>

          <p className="text-amber-100/90 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            نقدم حلول توريد متكاملة للمقاولين، المهندسين، وشركات الديكور للجبس بورد والدهانات وبديل الخشب ومواد العزل بأسعار جملة منافسة وفواتير ضريبية نظامية.
          </p>

          <div className="pt-2">
            <Link
              href="/b2b"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-amber-50 text-amber-950 font-extrabold text-sm shadow-xl transition hover:-translate-y-0.5"
            >
              <span>طلب حساب مقاول وعروض أسعار الجملة</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Branches Section */}
      <section id="branches" className="py-16 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <h2 className="text-3xl font-extrabold text-stone-900 dark:text-white transition-colors">
            المعرض والمستودع الرئيسي
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 transition-colors">
            يسعدنا استقبالكم لمعاينة العينات وطلب الكميات في عمّان
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/90 dark:border-stone-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-stone-900 dark:text-white">
                المعرض الرئيسي — أم نوارة
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                مفتوح الآن
              </span>
            </div>
            <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                <span>عمّان — أم نوارة — نزول إشارات الغاز</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                <span>السبت — الخميس: 08:00 صباحاً — 08:00 مساءً</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                <span dir="ltr" className="font-mono">0770585313</span>
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/90 dark:border-stone-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-stone-900 dark:text-white">
                قسم المبيعات الهندسية والتوريد B2B
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                تجهيز فوري
              </span>
            </div>
            <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                <span>مستودع أم نوارة المركزي — التوصيل لكافة مناطق عمّان والمحافظات</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                <span>دعم واتساب واستقبال الطلبيات يومياً</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                <span dir="ltr" className="font-mono">+962 7 7058 5313</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
