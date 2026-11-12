"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  FolderPlus,
  ImagePlus,
  Loader2,
  Save,
  Tags,
  Trash2,
  X,
} from "lucide-react";

export interface CategoryOptionItem {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  image?: string | null;
  sortOrder?: number;
  parentId?: string | null;
  _count?: { products: number };
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCategories?: CategoryOptionItem[];
  onCreated: (category: CategoryOptionItem) => void;
  onUpdated?: (category: CategoryOptionItem) => void;
  mode?: "create" | "edit";
  initialCategory?: CategoryOptionItem | null;
}

const PRESET_CATEGORY_IMAGES = [
  { label: "دهانات", src: "/images/categories/paints.jpg" },
  { label: "جبس بورد", src: "/images/categories/gypsum.jpg" },
  { label: "بديل الخشب", src: "/images/categories/wood-marble.jpg" },
  { label: "عزل ولواصق", src: "/images/categories/insulation.jpg" },
  { label: "عدد وأدوات", src: "/images/categories/tools.jpg" },
];

function toAsciiSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function compressImageToDataUrl(file: File, maxSize = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("تعذر معالجة الصورة"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const webp = canvas.toDataURL("image/webp", 0.82);
        resolve(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.84));
      };
      img.onerror = () => reject(new Error("صيغة الصورة غير مدعومة"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("تعذر قراءة ملف الصورة"));
    reader.readAsDataURL(file);
  });
}

async function uploadCategoryImage(file: File): Promise<string> {
  try {
    const sigRes = await fetch("/api/upload?folder=categories", { method: "GET" });
    const sigJson = await sigRes.json();
    if (sigRes.ok && sigJson?.success && sigJson?.data) {
      const { cloudName, apiKey, timestamp, folder, signature } = sigJson.data as {
        cloudName: string;
        apiKey: string;
        timestamp: string;
        folder: string;
        signature: string;
      };
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      formData.append("folder", folder);
      formData.append("signature", signature);
      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: "POST", body: formData }
      );
      const upJson = await upRes.json();
      if (upRes.ok && upJson?.secure_url) {
        return upJson.secure_url as string;
      }
    }
  } catch {
    // Fall back to lightweight client-side compressed data URL when Cloudinary is unavailable
  }

  return compressImageToDataUrl(file, 480);
}

export function CategoryModal({
  isOpen,
  onClose,
  existingCategories = [],
  onCreated,
  onUpdated,
  mode = "create",
  initialCategory = null,
}: CategoryModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [image, setImage] = useState("");
  const [sortOrder, setSortOrder] = useState("1");
  const [parentId, setParentId] = useState("");
  const [keepOpen, setKeepOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const isEdit = mode === "edit" && Boolean(initialCategory);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    if (mode === "edit" && initialCategory) {
      setNameAr(initialCategory.nameAr || "");
      setNameEn(initialCategory.nameEn || "");
      setSlug(initialCategory.slug || "");
      setSlugTouched(true);
      setImage(initialCategory.image || "");
      setSortOrder(String(initialCategory.sortOrder ?? 0));
      setParentId(initialCategory.parentId || "");
    } else {
      setNameAr("");
      setNameEn("");
      setSlug("");
      setSlugTouched(false);
      setImage("");
      setSortOrder(String(existingCategories.length + 1));
      setParentId("");
    }
  }, [isOpen, mode, initialCategory, existingCategories.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting && !uploadingImage) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, submitting, uploadingImage, onClose]);

  if (!isOpen) return null;

  const resetCreateFields = (nextOrder: number) => {
    setNameAr("");
    setNameEn("");
    setSlug("");
    setSlugTouched(false);
    setImage("");
    setParentId("");
    setSortOrder(String(nextOrder));
  };

  const handleNameEnChange = (val: string) => {
    setNameEn(val);
    if (!slugTouched) {
      setSlug(toAsciiSlug(val));
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);

    if (!file.type.startsWith("image/")) {
      setFeedback({ kind: "error", text: "يرجى اختيار ملف صورة (JPG, PNG, WEBP)." });
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ kind: "error", text: "حجم الصورة يتجاوز الحد المسموح (10 ميجابايت)." });
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadCategoryImage(file);
      setImage(uploadedUrl);
    } catch (err: any) {
      setFeedback({
        kind: "error",
        text: err?.message || "تعذر تجهيز الصورة، حاول مرة أخرى.",
      });
    } finally {
      setUploadingImage(false);
      e.target.value = "";
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
      const endpoint =
        isEdit && initialCategory
          ? `/api/categories/${initialCategory.id}`
          : "/api/categories";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: nameAr.trim(),
          nameEn: nameEn.trim() || undefined,
          slug: slug.trim() || undefined,
          image: image.trim() || null,
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

      const savedCategory: CategoryOptionItem = json.data;
      if (isEdit) {
        onUpdated?.(savedCategory);
        onClose();
      } else {
        onCreated(savedCategory);
        if (keepOpen) {
          resetCreateFields(existingCategories.length + 2);
          setFeedback({
            kind: "success",
            text: `تمت إضافة الصنف «${savedCategory.nameAr}» بنجاح! يمكنك إضافة صنف آخر.`,
          });
        } else {
          resetCreateFields(existingCategories.length + 2);
          onClose();
        }
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

  const parentChoices = existingCategories.filter(
    (c) => !isEdit || c.id !== initialCategory?.id
  );

  return (
    <div
      dir="rtl"
      onClick={() => {
        if (!submitting && !uploadingImage) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              {isEdit ? <Save className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-black">
                {isEdit ? `تعديل الصنف — ${initialCategory?.nameAr}` : "إضافة صنف بناء وديكور جديد"}
              </h2>
              <p className="text-[11px] text-stone-300 mt-0.5">
                {isEdit
                  ? "تحديث اسم الصنف والصورة وترتيب العرض في المتجر واللوحة"
                  : "يُحفظ مباشرة في قاعدة البيانات مع الصورة ويظهر تلقائياً عند إضافة المنتجات"}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting || uploadingImage}
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

          {/* Category Image Uploader */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  صورة الصنف (مربع 1:1)
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  ارفع صورة من جهازك أو اختر من مكتبة الصور الجاهزة
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    className="p-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="إزالة الصورة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-[11px] font-bold flex items-center gap-1.5 transition"
                >
                  {uploadingImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5" />
                  )}
                  <span>{uploadingImage ? "جاري المعالجة..." : "رفع صورة من الجهاز"}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFile}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white dark:bg-stone-900 border border-amber-500/30 shrink-0">
                <Image
                  src={image || "/rozeparees.png"}
                  alt={nameAr || "صورة الصنف"}
                  fill
                  className={image ? "object-cover" : "object-contain p-2"}
                  unoptimized
                />
              </div>

              <div className="w-full space-y-2">
                <input
                  type="text"
                  dir="ltr"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="/images/categories/paints.jpg أو https://..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-[11px] font-mono text-stone-800 dark:text-stone-200 focus:outline-none focus:border-amber-500"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {PRESET_CATEGORY_IMAGES.map((preset) => (
                    <button
                      key={preset.src}
                      type="button"
                      onClick={() => setImage(preset.src)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                        image === preset.src
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-amber-500"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

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
                {parentChoices.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isEdit && existingCategories.length > 0 && (
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

          {!isEdit && (
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={keepOpen}
                onChange={(e) => setKeepOpen(e.target.checked)}
                className="w-4 h-4 accent-amber-600 rounded"
              />
              <span>إبقاء النافذة مفتوحة لإضافة صنف آخر</span>
            </label>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={submitting || uploadingImage}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEdit ? (
                <Save className="w-4 h-4" />
              ) : (
                <FolderPlus className="w-4 h-4" />
              )}
              <span>
                {submitting
                  ? "جاري الحفظ..."
                  : isEdit
                  ? "حفظ تعديلات الصنف"
                  : "حفظ وإضافة الصنف"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
