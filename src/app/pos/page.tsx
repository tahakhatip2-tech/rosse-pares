"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/currency";
import Link from "next/link";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  CreditCard,
  Printer,
  CheckCircle2,
  X,
  ShoppingBag,
  Camera,
  Barcode,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  BarcodeCameraScanner,
  type ScanLookupOutcome,
} from "@/components/pos/BarcodeCameraScanner";

interface POSItem {
  id: string;
  productId: string;
  nameAr: string;
  nameEn: string;
  price: number;
  qty: number;
}

interface POSCatalogProduct {
  id: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  retailPrice: number;
  unit: string;
  category?: { id: string; nameAr: string } | null;
  barcodes?: { id: string; code: string; type: string }[];
}

interface POSCategory {
  id: string;
  nameAr: string;
}

interface ReceiptData {
  ticketNumber: string;
  items: POSItem[];
  total: number;
  paid: number;
  change: number;
  method: "CASH" | "CARD";
  time: string;
  savedToDb?: boolean;
}

export default function POSTerminalPage() {
  const [products, setProducts] = useState<POSCatalogProduct[]>([]);
  const [categories, setCategories] = useState<POSCategory[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [selectedCat, setSelectedCat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<POSItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanBanner, setScanBanner] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [amountTendered, setAmountTendered] = useState<string>("");
  const [completingSale, setCompletingSale] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState<ReceiptData | null>(
    null
  );

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/products?limit=200").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([prodJson, catJson]) => {
        if (!active) return;
        const prods: POSCatalogProduct[] = Array.isArray(prodJson?.data?.items)
          ? prodJson.data.items
          : [];
        const cats: POSCategory[] = Array.isArray(catJson?.data)
          ? catJson.data
          : [];
        setProducts(prods);
        setCategories(cats);
      })
      .catch(() => {
        // Keep empty catalog safely
      })
      .finally(() => {
        if (active) setLoadingCatalog(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!scanBanner) return;
    const t = window.setTimeout(() => setScanBanner(null), 3200);
    return () => window.clearTimeout(t);
  }, [scanBanner]);

  const addItemToCart = useCallback((prod: POSCatalogProduct) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === prod.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          id: prod.id,
          productId: prod.id,
          nameAr: prod.nameAr,
          nameEn: prod.nameEn,
          price: prod.retailPrice,
          qty: 1,
        },
      ];
    });
  }, []);

  const handleBarcodeLookup = useCallback(
    async (rawCode: string): Promise<ScanLookupOutcome> => {
      const code = rawCode.trim();
      if (!code) {
        return { ok: false, message: "رمز باركود فارغ" };
      }

      // 1. Check loaded catalog first for instant zero-latency feedback
      const localMatch = products.find(
        (p) =>
          p.barcodes?.some((b) => b.code === code) ||
          p.sku.toLowerCase() === code.toLowerCase()
      );
      if (localMatch) {
        addItemToCart(localMatch);
        setScanBanner({
          ok: true,
          text: `تمت إضافة: ${localMatch.nameAr} (${formatCurrency(
            localMatch.retailPrice
          )})`,
        });
        return {
          ok: true,
          label: localMatch.nameAr,
          price: localMatch.retailPrice,
          message: "تمت الإضافة إلى الفاتورة",
        };
      }

      // 2. Query backend lookup endpoint (covers newly added items)
      try {
        const res = await fetch(
          `/api/products/barcode-lookup?code=${encodeURIComponent(code)}`
        );
        const json = await res.json();
        const found: POSCatalogProduct | undefined = json?.data?.product;
        if (res.ok && found) {
          addItemToCart(found);
          setProducts((prev) =>
            prev.some((p) => p.id === found.id) ? prev : [found, ...prev]
          );
          setScanBanner({
            ok: true,
            text: `تمت إضافة: ${found.nameAr} (${formatCurrency(
              found.retailPrice
            )})`,
          });
          return {
            ok: true,
            label: found.nameAr,
            price: found.retailPrice,
            message: "تمت الإضافة إلى الفاتورة",
          };
        }
      } catch {
        // Network error handled gracefully below
      }

      setScanBanner({
        ok: false,
        text: `لم يتم العثور على منتج بالباركود: ${code}`,
      });
      return {
        ok: false,
        message: "الباركود غير مسجّل لأي منتج",
      };
    },
    [products, addItemToCart]
  );

  const updateItemQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId === productId) {
            const newQty = i.qty + delta;
            return newQty > 0 ? { ...i, qty: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as POSItem[]
    );
  };

  const clearTicket = () => {
    if (cart.length > 0 && confirm("هل أنت متأكد من تفريغ التذكرة الحالية؟")) {
      setCart([]);
      setDiscountPercent(0);
    }
  };

  const subtotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const tax = Number((taxableAmount * 0.16).toFixed(3));
  const grandTotal = Number((taxableAmount + tax).toFixed(3));

  const tendered = parseFloat(amountTendered) || 0;
  const changeDue = Math.max(0, tendered - grandTotal);

  const handleCompleteSale = async () => {
    if (cart.length === 0 || completingSale) return;
    setCompletingSale(true);

    let ticketNumber = `POS-${Date.now().toString().slice(-6)}`;
    let savedToDb = false;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "POS",
          deliveryType: "PICKUP",
          notes:
            discountPercent > 0
              ? `نقطة بيع — الدفع: ${paymentMethod} | خصم: ${discountPercent}%`
              : `نقطة بيع — الدفع: ${paymentMethod}`,
          items: cart.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            unitPrice: i.price,
          })),
        }),
      });
      const json = await res.json();
      if (res.ok && json?.data?.orderNumber) {
        ticketNumber = json.data.orderNumber;
        savedToDb = true;
      }
    } catch {
      // Fallback safely to receipt view if API offline
    } finally {
      setCompletingSale(false);
    }

    setReceiptSuccess({
      ticketNumber,
      items: [...cart],
      total: grandTotal,
      paid: paymentMethod === "CASH" ? tendered : grandTotal,
      change: paymentMethod === "CASH" ? changeDue : 0,
      method: paymentMethod,
      time: new Date().toLocaleTimeString("ar-JO"),
      savedToDb,
    });
    setPaymentModalOpen(false);
  };

  const handleStartNewSale = () => {
    setReceiptSuccess(null);
    setCart([]);
    setDiscountPercent(0);
    setAmountTendered("");
  };

  const filteredProducts = products.filter((p) => {
    const matchCat =
      selectedCat === "all" || p.category?.id === selectedCat;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.nameAr.toLowerCase().includes(q) ||
      p.nameEn.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      Boolean(p.barcodes?.some((b) => b.code.toLowerCase().includes(q)));
    return matchCat && matchSearch;
  });

  const totalUnitsInCart = cart.reduce((acc, i) => acc + i.qty, 0);

  return (
    <div className="h-screen w-screen bg-stone-950 text-stone-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Top POS Navbar */}
      <header className="h-14 bg-stone-900 border-b border-stone-800 px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/dashboard" className="flex items-center gap-2 group shrink-0">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-stone-900 border border-amber-500/30 p-0.5 flex items-center justify-center">
              <Image
                src="/rozeparees.png"
                alt="شعار روز باريس"
                width={32}
                height={32}
                className="object-contain w-full h-full"
              />
            </div>
            <span className="font-extrabold text-white text-xs sm:text-sm truncate">
              نقطة بيع روز باريس (POS)
            </span>
          </Link>
          <span className="h-4 w-px bg-stone-800 hidden md:block" />
          <span className="text-xs text-stone-400 hidden md:inline">
            الفرع: <strong className="text-white">المعرض الرئيسي — أم نوارة</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">تشغيل الكاميرا للبيع بالباركود</span>
            <span className="sm:hidden">كاميرا الباركود</span>
          </button>

          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 hidden sm:inline">
            جلسة نشطة
          </span>
          <Link
            href="/admin/dashboard"
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
          >
            لوحة الإدارة
          </Link>
        </div>
      </header>

      {/* Main Terminal Grid */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Side: Catalog & Search */}
        <div className="col-span-7 lg:col-span-8 flex flex-col border-l border-stone-800 bg-stone-950 overflow-hidden">
          {/* Search, Barcode Camera & Category Header */}
          <div className="p-3 border-b border-stone-800 bg-stone-900/60 space-y-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="امسح الباركود أو ابحث بالاسم / الرمز ثم اضغط Enter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && searchQuery.trim()) {
                      e.preventDefault();
                      const res = await handleBarcodeLookup(searchQuery.trim());
                      if (res.ok) {
                        setSearchQuery("");
                      }
                    }
                  }}
                  className="w-full pr-9 pl-4 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs transition active:scale-95"
                title="تشغيل كاميرا الجهاز لمسح الباركود"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden md:inline">مسح بالكاميرا</span>
              </button>
            </div>

            {scanBanner && (
              <div
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-2 ${
                  scanBanner.ok
                    ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-300"
                    : "bg-red-950/60 border-red-700/60 text-red-300"
                }`}
              >
                {scanBanner.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{scanBanner.text}</span>
              </div>
            )}

            {/* Category Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCat("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedCat === "all"
                    ? "bg-amber-600 text-stone-950 font-black shadow-sm"
                    : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                }`}
              >
                الكل ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    selectedCat === cat.id
                      ? "bg-amber-600 text-stone-950 font-black shadow-sm"
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                  }`}
                >
                  {cat.nameAr}
                </button>
              ))}
            </div>
          </div>

          {/* Product Buttons Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {loadingCatalog ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-stone-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span>جاري تحميل أصناف المستودع والباركودات...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 text-xs p-6">
                <Barcode className="w-10 h-10 text-stone-700 mb-2" />
                <p className="font-bold text-stone-300">لا توجد منتجات مطابقة</p>
                <p className="text-[11px] text-stone-500 mt-1">
                  جرّب تغيير البحث أو استخدم زر «تشغيل الكاميرا للبيع بالباركود».
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {filteredProducts.map((p) => {
                  const primaryBarcode =
                    p.barcodes && p.barcodes.length > 0
                      ? p.barcodes[p.barcodes.length - 1].code
                      : p.sku;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addItemToCart(p)}
                      className="p-3 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/60 active:scale-95 text-right flex flex-col justify-between transition min-h-[100px] shadow-xs hover:bg-stone-800/70"
                    >
                      <div>
                        <span
                          dir="ltr"
                          className="text-[10px] font-mono text-stone-400 block truncate text-right"
                        >
                          {primaryBarcode}
                        </span>
                        <h4 className="font-bold text-xs text-white line-clamp-2 mt-0.5">
                          {p.nameAr}
                        </h4>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-stone-800/80">
                        <span className="font-mono font-bold text-amber-400 text-xs">
                          {formatCurrency(p.retailPrice)}
                        </span>
                        <div className="w-5 h-5 rounded-md bg-amber-600/20 text-amber-400 flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Ticket / Bill */}
        <div className="col-span-5 lg:col-span-4 flex flex-col bg-stone-900 overflow-hidden">
          {/* Ticket Header */}
          <div className="p-3 border-b border-stone-800 flex items-center justify-between shrink-0 bg-stone-900">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-xs text-white">
                تذكرة البيع الحالية ({totalUnitsInCart})
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearTicket}
                className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>إلغاء</span>
              </button>
            )}
          </div>

          {/* Ticket Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 p-4 gap-3">
                <ShoppingBag className="w-12 h-12 text-stone-700" />
                <div>
                  <p className="text-xs font-bold text-stone-400">التذكرة فارغة</p>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    اضغط على الأصناف أو استخدم كاميرا الباركود لإضافتها تلقائياً
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>تشغيل الكاميرا لبدء البيع</span>
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 rounded-xl bg-stone-950/70 border border-stone-800 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-white truncate">
                      {item.nameAr}
                    </h5>
                    <p className="text-[10px] text-stone-400 font-mono">
                      {formatCurrency(item.price)} × {item.qty}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 bg-stone-900 border border-stone-700 rounded-lg p-0.5">
                    <button
                      onClick={() => updateItemQty(item.productId, -1)}
                      className="p-1 text-stone-400 hover:text-white rounded transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-mono font-bold text-white">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateItemQty(item.productId, 1)}
                      className="p-1 text-stone-400 hover:text-white rounded transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-mono font-bold text-xs text-amber-400 w-16 text-left shrink-0">
                    {formatCurrency(item.price * item.qty)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Ticket Bottom Calculations */}
          <div className="p-3 border-t border-stone-800 bg-stone-950 shrink-0 space-y-2">
            {/* Quick Discount Buttons */}
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>الخصم:</span>
              <div className="flex gap-1">
                {[0, 5, 10, 15].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDiscountPercent(d)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      discountPercent === d
                        ? "bg-amber-600 text-stone-950"
                        : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                    }`}
                  >
                    {d}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-xs text-stone-400">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-mono text-stone-200">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>الخصم ({discountPercent}%):</span>
                  <span className="font-mono">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>ضريبة المبيعات (16%):</span>
                <span className="font-mono text-stone-200">
                  {formatCurrency(tax)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-white pt-1.5 border-t border-stone-800">
                <span>الإجمالي النهائي:</span>
                <span className="font-mono text-amber-400 text-base">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Checkout Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                disabled={cart.length === 0}
                onClick={() => {
                  setPaymentMethod("CASH");
                  setAmountTendered(String(grandTotal));
                  setPaymentModalOpen(true);
                }}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <Banknote className="w-4 h-4" />
                <span>دفع نقد ({formatCurrency(grandTotal)})</span>
              </button>

              <button
                disabled={cart.length === 0}
                onClick={() => {
                  setPaymentMethod("CARD");
                  setAmountTendered(String(grandTotal));
                  setPaymentModalOpen(true);
                }}
                className="py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <CreditCard className="w-4 h-4" />
                <span>بطاقة POS</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <BarcodeCameraScanner
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScanCode={handleBarcodeLookup}
        cartCount={totalUnitsInCart}
        grandTotal={grandTotal}
      />

      {/* Payment Tender Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                {paymentMethod === "CASH" ? (
                  <Banknote className="w-5 h-5 text-emerald-400" />
                ) : (
                  <CreditCard className="w-5 h-5 text-sky-400" />
                )}
                <span>
                  تحصيل المبلغ: {paymentMethod === "CASH" ? "نقداً" : "بطاقة بنكية"}
                </span>
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-center space-y-1">
              <span className="text-xs text-stone-400">
                المبلغ المطلوب تحصيله:
              </span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {formatCurrency(grandTotal)}
              </div>
            </div>

            {paymentMethod === "CASH" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    المبلغ المستلم من الزبون (د.أ):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-lg font-mono font-bold text-white text-center focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-2">
                  {[5, 10, 20, 50].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmountTendered(String(val))}
                      className="flex-1 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-mono font-bold text-stone-200 border border-stone-700"
                    >
                      {val} د.أ
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60 flex items-center justify-between text-xs">
                  <span className="text-emerald-300 font-bold">الباقي للزبون:</span>
                  <span className="text-base font-black font-mono text-emerald-400">
                    {formatCurrency(changeDue)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 transition"
              >
                إلغاء
              </button>
              <button
                disabled={
                  completingSale ||
                  (paymentMethod === "CASH" && tendered < grandTotal)
                }
                onClick={handleCompleteSale}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {completingSale
                    ? "جاري التسجيل..."
                    : "إتمام وطباعة الفاتورة"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Success Modal */}
      {receiptSuccess && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-stone-900 rounded-2xl p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="text-center space-y-1 border-b border-dashed border-stone-300 pb-3">
              <h2 className="text-base font-black text-stone-950 font-sans">
                روز باريس لمواد البناء والديكور
              </h2>
              <p className="text-[10px] text-stone-600 font-sans">
                المعرض والمستودع الرئيسي — عمّان — أم نوارة
              </p>
              <p className="text-[10px] text-stone-500">
                هاتف: 0770585313 | ض.ع: 12345678
              </p>
              <div className="flex justify-between text-[10px] text-stone-500 pt-1">
                <span>{receiptSuccess.ticketNumber}</span>
                <span>{receiptSuccess.time}</span>
              </div>
            </div>

            <div className="space-y-1.5 py-1 max-h-48 overflow-y-auto">
              {receiptSuccess.items.map((i) => (
                <div key={i.productId} className="flex justify-between">
                  <span className="font-sans font-medium truncate flex-1">
                    {i.nameAr}
                  </span>
                  <span className="text-stone-500 w-8 text-center">
                    {i.qty}×
                  </span>
                  <span className="font-bold">
                    {formatCurrency(i.price * i.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-stone-300 pt-2 space-y-1 text-stone-700">
              <div className="flex justify-between font-bold text-sm text-stone-950">
                <span className="font-sans">الإجمالي المدفوع:</span>
                <span>{formatCurrency(receiptSuccess.total)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="font-sans">طريقة الدفع:</span>
                <span>
                  {receiptSuccess.method === "CASH"
                    ? "نقداً"
                    : "بطاقة فيزا/POS"}
                </span>
              </div>
              {receiptSuccess.method === "CASH" && (
                <div className="flex justify-between text-[11px]">
                  <span className="font-sans">الباقي:</span>
                  <span>{formatCurrency(receiptSuccess.change)}</span>
                </div>
              )}
            </div>

            <div className="text-center text-[10px] text-stone-500 pt-2 font-sans border-t border-dashed border-stone-300">
              شكراً لزيارتكم! نتشرف بخدمتكم دائماً
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-sans font-bold flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة</span>
              </button>
              <button
                onClick={handleStartNewSale}
                className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-sans font-bold flex items-center justify-center gap-1"
              >
                <span>طلب جديد</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
