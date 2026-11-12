"use client";

import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/currency";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const { items, removeItem, updateQty, clearCart, getSubtotal, getTax, getTotal } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;
  if (!mounted) return null;

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 left-0 max-w-full flex pl-0">
        <div className="w-screen max-w-md bg-white dark:bg-stone-900 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                سلة المشتريات ({items.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              aria-label="إغلاق السلة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
                <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-base font-semibold text-stone-700 dark:text-stone-300">
                  سلة التسوق فارغة حالياً
                </p>
                <p className="text-xs text-stone-500 mt-1 mb-6">
                  استكشف تشكيلة الدهانات ومواد البناء والديكور وأضفها إلى طلبك
                </p>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl text-sm transition"
                >
                  تصفح المنتجات
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">
                      {item.nameAr}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {formatCurrency(item.price)} للقطعة
                    </p>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-500 mt-1">
                      المجموع: {formatCurrency(item.price * item.qty)}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 p-1">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="p-1 rounded text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700 transition"
                      aria-label="تقليل الكمية"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold font-mono">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="p-1 rounded text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700 transition"
                      aria-label="زيادة الكمية"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                    title="حذف من السلة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary */}
          {items.length > 0 && (
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 space-y-3">
              <div className="space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ضريبة المبيعات (16%):</span>
                  <span className="font-mono font-medium">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-stone-900 dark:text-stone-100 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <span>الإجمالي النهائي:</span>
                  <span className="font-mono text-amber-600">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={clearCart}
                  className="px-3 py-2 text-xs text-stone-500 hover:text-red-600 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition"
                >
                  تفريغ السلة
                </button>
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl text-center text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition"
                >
                  <span>متابعة إتمام الطلب</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
