"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FolderPlus,
  Loader2,
  Tags,
  X,
} from "lucide-react";

export interface CategoryOptionItem {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  sortOrder?: number;
  parentId?: string | null;
  _count?: { products: number };
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCategories?: CategoryOptionItem[];
  onCreated: (category: CategoryOptionItem) => void;
}

function toAsciiSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CategoryModal({
  isOpen,
  onClose,
  existingCategories = [],
  onCreated,
}: CategoryModalProps) {
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [sortOrder, setSortOrder] = useState("1");
  const [parentId, setParentId] = useState("");
  const [keepOpen, setKeepOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSortOrder(String(existingCategories.length + 1));
    setFeedback(null);
  }, [isOpen, existingCategories.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const resetFields = (nextOrder: number) => {
    setNameAr("");
    setNameEn("");
    setSlug("");
    setSlugTouched(false);
    setParentId("");
    setSortOrder(String(nextOrder));
  };

  const handleNameEnChange = (val: string) => {
    setNameEn(val);
    if (!slugTouched) {
      setSlug(toAsciiSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!nameAr.trim()) {
      setFeedback({ kind: "error", text: "يرجى إدخال اسم الصنف بالعربية." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: nameAr.trim(),
          nameEn: nameEn.trim() || undefined,
          slug: slug.trim() || undefined,
          sortOrder: parseInt(sortOrder, 10) || 0,
          parentId: parentId || null,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json?.success || !json?.data) {
        setFeedback({
          kind: "error",
          text: json?.error || "تعذر حفظ الصنف، يرجى المحاولة مرة أخرى.",
        });
        return;
      }

      const created: CategoryOptionItem = json.data;
      onCreated(created);

      if (keepOpen) {
        resetFields(existingCategories.length + 2);
        setFeedback({
          kind: "success",
          text: `تمت إضافة الصنف «${created.nameAr}» بنجاح! يمكنك إضافة صنف آخر.`,
        });
      } else {
        resetFields(existingCategories.length + 2);
        onClose();
      }
    } catch {
      setFeedback({
        kind: "error",
        text: "حدث خطأ في الاتصال بالخادم أثناء حفظ الصنف.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      onClick={() => {
        if (!submitting) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black">إضافة صنف بناء وديكور جديد</h2>
              <p className="text-[11px] text-stone-300 mt-0.5">
                يُحفظ مباشرة في قاعدة البيانات ويظهر تلقائياً عند إضافة المنتجات
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {feedback && (
            <div
              className={`flex items-start gap-2 p-3 rounded-xl border text-xs font-bold ${
                feedback.kind === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
              }`}
            >
              {feedback.kind === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                اسم الصنف بالعربية *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: السيراميك والبورسلان، الدهانات، ألواح الجبس..."
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                الاسم بالإنجليزية (اختياري)
              </label>
              <input
                type="text"
                dir="ltr"
                value={nameEn}
                onChange={(e) => handleNameEnChange(e.target.value)}
                placeholder="Ceramic & Porcelain"
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                الرابط المختصر Slug (اختياري)
              </label>
              <input
                type="text"
                dir="ltr"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="auto-generated"
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                ترتيب العرض
              </label>
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                التصنيف الأب (اختياري)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="">صنف رئيسي (بدون أب)</option>
                {existingCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {existingCategories.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 dark:text-stone-300">
                <Tags className="w-3.5 h-3.5 text-amber-600" />
                <span>الأصناف المسجلة حالياً ({existingCategories.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {existingCategories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-[11px] font-semibold text-stone-700 dark:text-stone-200"
                  >
                    <span>{cat.nameAr}</span>
                    {typeof cat._count?.products === "number" && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono text-[10px]">
                        {cat._count.products}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={keepOpen}
              onChange={(e) => setKeepOpen(e.target.checked)}
              className="w-4 h-4 accent-amber-600 rounded"
            />
            <span>إبقاء النافذة مفتوحة لإضافة صنف آخر</span>
          </label>

          {/* Footer */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FolderPlus className="w-4 h-4" />
              )}
              <span>{submitting ? "جاري الحفظ..." : "حفظ وإضافة الصنف"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

