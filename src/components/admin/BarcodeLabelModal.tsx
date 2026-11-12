"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, RefreshCw, X } from "lucide-react";
import { BarcodeSvg } from "@/components/admin/BarcodeSvg";
import { formatCurrency } from "@/lib/currency";

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    nameAr: string;
    retailPrice: number;
    unit: string;
    barcode: string;
  } | null;
  onRegenerateBarcode?: () => Promise<string | null>;
}

type PrintPreset = "THERMAL_50x30" | "A4_GRID";

export function BarcodeLabelModal({
  isOpen,
  onClose,
  product,
  onRegenerateBarcode,
}: BarcodeLabelModalProps) {
  const [copies, setCopies] = useState(8);
  const [preset, setPreset] = useState<PrintPreset>("A4_GRID");
  const [showStoreName, setShowStoreName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !product) return null;

  const stickerCount = Math.min(120, Math.max(1, copies));
  const stickers = Array.from({ length: stickerCount }, (_, i) => i);

  function handlePrint() {
    document.body.classList.add("printing-barcodes");
    const cleanup = () => {
      document.body.classList.remove("printing-barcodes");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
      // Fallback cleanup in case afterprint does not fire cleanly
      setTimeout(cleanup, 1200);
    }, 60);
  }

  async function handleRegenerate() {
    if (!onRegenerateBarcode || regenerating) return;
    setRegenerating(true);
    try {
      await onRegenerateBarcode();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <>
      {/* Interactive Configuration Modal */}
      <div
        dir="rtl"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold">طباعة ملصق الباركود — {product.nameAr}</h2>
              <p className="text-[11px] text-amber-300 font-mono mt-0.5">{product.barcode}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-5">
            {/* Single Sticker Live Preview */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[#f7efe1] dark:bg-stone-950 border border-amber-900/15">
              <div className="w-[210px] bg-white text-black rounded-xl border border-stone-300 shadow-sm p-3 text-center space-y-1">
                {showStoreName && (
                  <p className="text-[10px] font-extrabold tracking-wide text-stone-700">
                    روز باريس لمواد البناء والديكور
                  </p>
                )}
                <p className="text-xs font-black truncate">{product.nameAr}</p>
                <div className="px-1">
                  <BarcodeSvg code={product.barcode} height={46} className="w-full h-auto" />
                </div>
                {showPrice && (
                  <p className="text-xs font-black font-mono">
                    {formatCurrency(product.retailPrice)}
                    <span className="text-[9px] font-sans font-semibold text-stone-600 mr-1">
                      / {product.unit}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Print Options */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-stone-700 dark:text-stone-300">
                  حجم الورق والطابعة
                </label>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as PrintPreset)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold"
                >
                  <option value="A4_GRID">ورقة A4 (شبكة ملصقات جاهزة للقص/اللصق)</option>
                  <option value="THERMAL_50x30">طابعة ملصقات حرارية (50 × 30 mm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-stone-700 dark:text-stone-300">
                  عدد الملصقات (النسخ)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 4, 8, 12, 24].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCopies(num)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                        copies === num
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 px-2 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="w-4 h-4 accent-amber-600"
                />
                <span>إظهار اسم الشركة</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="w-4 h-4 accent-amber-600"
                />
                <span>إظهار السعر على الملصق</span>
              </label>
            </div>
          </div>

          <div className="px-5 py-3.5 bg-stone-50 dark:bg-stone-800/70 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
            {onRegenerateBarcode ? (
              <button
                type="button"
                disabled={regenerating}
                onClick={handleRegenerate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-xs font-bold hover:bg-stone-200/60 dark:hover:bg-stone-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
                <span>توليد باركود جديد</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-xs font-bold"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة ({stickerCount} ملصق)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Isolated Print Host mounted into document.body */}
      {mounted &&
        createPortal(
          <div id="rf-barcode-print-host" className="hidden print:block" dir="rtl">
            {preset === "THERMAL_50x30" ? (
              <div>
                {stickers.map((idx) => (
                  <div
                    key={idx}
                    style={{
                      width: "50mm",
                      height: "30mm",
                      padding: "2mm",
                      pageBreakAfter: "always",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      boxSizing: "border-box",
                      background: "#ffffff",
                      color: "#000000",
                    }}
                  >
                    {showStoreName && (
                      <div style={{ fontSize: "7pt", fontWeight: 700 }}>
                        روز باريس لمواد البناء
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: "8.5pt",
                        fontWeight: 800,
                        maxWidth: "46mm",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {product.nameAr}
                    </div>
                    <BarcodeSvg code={product.barcode} height={36} className="w-[42mm] h-auto" />
                    {showPrice && (
                      <div style={{ fontSize: "8.5pt", fontWeight: 800 }}>
                        {formatCurrency(product.retailPrice)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "6mm",
                  padding: "8mm",
                  background: "#ffffff",
                  color: "#000000",
                }}
              >
                {stickers.map((idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px dashed #9ca3af",
                      borderRadius: "4px",
                      padding: "4mm",
                      textAlign: "center",
                      breakInside: "avoid",
                      background: "#ffffff",
                    }}
                  >
                    {showStoreName && (
                      <div style={{ fontSize: "8pt", fontWeight: 700, marginBottom: "1mm" }}>
                        روز باريس لمواد البناء والديكور
                      </div>
                    )}
                    <div style={{ fontSize: "10pt", fontWeight: 800, marginBottom: "2mm" }}>
                      {product.nameAr}
                    </div>
                    <BarcodeSvg code={product.barcode} height={44} className="w-full max-w-[46mm] mx-auto h-auto" />
                    {showPrice && (
                      <div style={{ fontSize: "10pt", fontWeight: 800, marginTop: "1mm" }}>
                        {formatCurrency(product.retailPrice)} / {product.unit}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

