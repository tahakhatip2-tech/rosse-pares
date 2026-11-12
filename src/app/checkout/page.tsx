"use client";

import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/currency";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ShoppingBag,
  CheckCircle2,
  Truck,
  Store,
  CreditCard,
  Banknote,
  ArrowRight,
  ShieldCheck,
  Clock,
} from "lucide-react";

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  const { items, getSubtotal, getTax, clearCart } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const tax = getTax();
  const deliveryFee = deliveryType === "DELIVERY" ? 2.0 : 0.0;
  const grandTotal = Number((subtotal + tax + deliveryFee).toFixed(3));

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryType,
          paymentMethod,
          customerName,
          customerPhone,
          customerAddress: deliveryType === "DELIVERY" ? customerAddress : "استلام من الفرع",
          notes,
          items: items.map((i) => ({
            productId: i.productId,
            nameAr: i.nameAr,
            nameEn: i.nameEn,
            qty: i.qty,
            unitPrice: i.price,
            totalPrice: i.price * i.qty,
          })),
          subtotal,
          tax,
          deliveryFee,
          total: grandTotal,
        }),
      });

      if (!res.ok) throw new Error("Order failed");
      const order = await res.json();
      setOrderSuccess(order);
      clearCart();
    } catch (err) {
      alert("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfaf5] text-stone-900 dark:bg-stone-950 dark:text-stone-100 flex flex-col font-sans transition-colors duration-300">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {orderSuccess ? (
          /* Success Screen */
          <div className="max-w-xl mx-auto rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 p-8 text-center space-y-6 shadow-xl dark:shadow-2xl transition">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
                تم تأكيد طلبك بنجاح!
              </h1>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                شكراً لاختيارك روز باريس. بدأ فريق المستودع بتجهيز طلبيتك بكل عناية.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 space-y-3 text-xs text-stone-700 dark:text-stone-300 text-right">
              <div className="flex justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
                <span className="text-stone-500 dark:text-stone-400">رقم الطلب:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {orderSuccess.orderNumber || "ORD-2026-001"}
                </span>
              </div>
              <div className="flex justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
                <span className="text-stone-500 dark:text-stone-400">طريقة الاستلام:</span>
                <span className="font-bold text-stone-900 dark:text-white">
                  {deliveryType === "DELIVERY" ? "توصيل للمنزل" : "استلام من الفرع"}
                </span>
              </div>
              <div className="flex justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
                <span className="text-stone-500 dark:text-stone-400">المبلغ الإجمالي المستحق:</span>
                <span className="font-mono font-bold text-stone-900 dark:text-white text-sm">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 pt-1 font-semibold">
                <Clock className="w-4 h-4 shrink-0" />
                <span>الوقت التقديري للجاهزية: 25 — 40 دقيقة</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/menu"
                className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs text-center transition"
              >
                العودة للقائمة لطلب المزيد
              </Link>
              <Link
                href="/"
                className="py-3 px-6 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold text-center transition"
              >
                الصفحة الرئيسية
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* Empty Cart */
          <div className="max-w-md mx-auto text-center py-20 space-y-4">
            <ShoppingBag className="w-16 h-16 mx-auto text-stone-400 dark:text-stone-600" />
            <h2 className="text-xl font-bold text-stone-900 dark:text-white">سلة المشتريات فارغة</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              لم تقم بإضافة أي أصناف بعد. تصفح كتالوج مواد البناء والديكور وأضف ما تحتاجه لمشروعك.
            </p>
            <Link
              href="/menu"
              className="inline-block px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition"
            >
              استعراض كتالوج المواد
            </Link>
          </div>
        ) : (
          /* Checkout Form & Summary */
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left/Form details */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500 hover:text-amber-500 mb-2"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>العودة للتسوق</span>
                </Link>
                <h1 className="text-2xl font-black text-stone-900 dark:text-white">إتمام الطلب والدفع</h1>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  أدخل تفاصيل التوصيل والاستلام لإرسال طلبك فوراً إلى الفرن
                </p>
              </div>

              {/* Delivery method tabs */}
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 space-y-3 shadow-sm">
                <h2 className="text-xs font-bold text-stone-700 dark:text-stone-300">طريقة الاستلام:</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryType("PICKUP")}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                      deliveryType === "PICKUP"
                        ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>استلام من الفرع (مجاناً)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType("DELIVERY")}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                      deliveryType === "DELIVERY"
                        ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>توصيل للمنزل (+2.000 د.أ)</span>
                  </button>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 space-y-4 shadow-sm">
                <h2 className="text-xs font-bold text-stone-700 dark:text-stone-300 border-b border-stone-200 dark:border-stone-800 pb-2">
                  بيانات العميل والتواصل
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      الاسم الكامل *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="محمد الأحمد"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      رقم الهاتف الأردني *
                    </label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="079 xxxxxxx"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-amber-500 text-right transition"
                    />
                  </div>
                </div>

                {deliveryType === "DELIVERY" && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      عنوان التوصيل بالتفصيل (عمّان) *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="المنطقة، اسم الشارع، رقم البناية، الطابق والشقة"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    ملاحظات خاصة للمستودع أو التوصيل (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: رقم كود اللون المطلوب، موقع الورشة، أو التواصل قبل الوصول..."
                    className="w-full px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 space-y-3 shadow-sm">
                <h2 className="text-xs font-bold text-stone-700 dark:text-stone-300">طريقة الدفع:</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                      paymentMethod === "CASH"
                        ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>الدفع نقداً عند الاستلام</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD")}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                      paymentMethod === "CARD"
                        ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>بطاقة بنكية / فيزا عند الاستلام</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right/Order summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xl space-y-4">
                <h2 className="text-base font-extrabold text-stone-900 dark:text-white border-b border-stone-200 dark:border-stone-800 pb-3 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                  <span>ملخص الطلب ({items.length} أصناف)</span>
                </h2>

                {/* Items preview */}
                <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                  {items.map((i) => (
                    <div
                      key={i.id}
                      className="flex justify-between items-center text-xs py-1 border-b border-stone-100 dark:border-stone-800/60"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 dark:text-white truncate">{i.nameAr}</p>
                        <p className="text-stone-500">
                          {i.qty} × {formatCurrency(i.price)}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                        {formatCurrency(i.price * i.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-2 text-xs text-stone-500 dark:text-stone-400 border-t border-stone-200 dark:border-stone-800 pt-3">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono text-stone-900 dark:text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ضريبة المبيعات الأردنية (16%):</span>
                    <span className="font-mono text-stone-900 dark:text-white">{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>رسوم التوصيل:</span>
                    <span className="font-mono text-stone-900 dark:text-white">
                      {deliveryFee === 0 ? "مجاناً (استلام)" : formatCurrency(deliveryFee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-black text-stone-900 dark:text-white pt-2 border-t border-stone-200 dark:border-stone-800">
                    <span>الإجمالي النهائي (شامل الضريبة):</span>
                    <span className="font-mono text-amber-700 dark:text-amber-400 text-lg">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-black text-sm shadow-xl shadow-amber-600/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>جاري إرسال الطلب...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>تأكيد وإرسال الطلب الآن ({formatCurrency(grandTotal)})</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                  <span>دفع آمن ومضمون 100% عند الاستلام</span>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
