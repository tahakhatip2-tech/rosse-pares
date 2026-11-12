import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail, Clock, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#f7efe1] text-stone-700 border-t border-amber-900/10 dark:bg-stone-950 dark:text-stone-300 dark:border-stone-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-28 lg:pt-16 lg:pb-28">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md bg-white dark:bg-stone-900 border border-amber-500/30 p-1 flex items-center justify-center">
                <Image
                  src="/rozeparees.png"
                  alt="شعار روز باريس لمواد البناء والديكور"
                  width={48}
                  height={48}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-stone-900 dark:text-white transition-colors">روز باريس</h3>
                <p className="text-xs text-amber-800 dark:text-stone-400 font-sans">ROZE PAREES</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed transition-colors">
              نوفّر أحدث حلول مواد البناء والديكور في الأردن من الدهانات العالمية، الجبس بورد، بديل الخشب والرخام، ومواد العزل والعدد وفق أعلى المواصفات الهندسية.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-500 font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>مواد بناء معتمدة ومطابقة للمواصفات والمقاييس الأردنية</span>
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-stone-900 dark:text-white tracking-wide border-b border-stone-300 dark:border-stone-800 pb-2 transition-colors">
              روابط سريعة
            </h4>
            <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-400">
              <li>
                <Link href="/menu" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  كتالوج مواد البناء والديكور
                </Link>
              </li>
              <li>
                <Link href="/news" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  آخر الأخبار والمشاريع
                </Link>
              </li>
              <li>
                <Link href="/b2b" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  توريد المقاولين والمشاريع (B2B)
                </Link>
              </li>
              <li>
                <Link href="/#branches" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  عنوان المعرض وساعات الدوام
                </Link>
              </li>
              <li>
                <Link href="/admin/dashboard" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  لوحة تحكم الإدارة (ERP)
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  بوابة الموظفين والشركاء
                </Link>
              </li>
            </ul>
          </div>

          {/* Branches & Working Hours */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-stone-900 dark:text-white tracking-wide border-b border-stone-300 dark:border-stone-800 pb-2 transition-colors">
              ساعات العمل والموقع
            </h4>
            <ul className="space-y-3 text-xs text-stone-600 dark:text-stone-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <span>المعرض والمستودع الرئيسي: عمّان — أم نوارة — نزول إشارات الغاز</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p>السبت — الخميس: 08:00 ص — 08:00 م</p>
                  <p className="text-stone-500">الجمعة: مغلق (خدمة الواتساب متاحة)</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-stone-900 dark:text-white tracking-wide border-b border-stone-300 dark:border-stone-800 pb-2 transition-colors">
              تواصل وعروض الأسعار
            </h4>
            <ul className="space-y-3 text-xs text-stone-600 dark:text-stone-400">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                <span dir="ltr" className="font-mono">0770585313</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                <span dir="ltr" className="font-mono">info@rozeparees.com</span>
              </li>
            </ul>

            <div className="pt-2">
              <span className="inline-block px-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-amber-900/10 dark:border-stone-800 text-[11px] text-amber-800 dark:text-amber-400 font-bold shadow-sm">
                شحن وتوصيل سريع لمواقع البناء في كافة مناطق عمّان
              </span>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 border-t border-stone-300/60 dark:border-stone-800/80 text-center text-xs text-stone-500">
          <p>© {new Date().getFullYear()} روز باريس لمواد البناء والديكور. جميع الحقوق محفوظة. عمّان — الأردن.</p>
        </div>
      </div>
    </footer>
  );
}
