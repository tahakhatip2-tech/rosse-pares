"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Save,
  Layers,
  AlertCircle,
  CheckCircle2,
  Barcode,
  Printer,
  Sparkles,
} from "lucide-react";
import { ProductImagesUploader } from "@/components/admin/ProductImagesUploader";
import { BarcodeSvg } from "@/components/admin/BarcodeSvg";
import { BarcodeLabelModal } from "@/components/admin/BarcodeLabelModal";

interface CategoryOption {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface ProductFormInitialData {
  id: string;
  sku: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  retailPrice: number;
  costPrice: number;
  taxRate: number;
  unit: string;
  weight?: number | null;
  shelfLifeHours?: number | null;
  descriptionAr?: string | null;
  ingredientsAr?: string | null;
  allergens: string[];
  images: string[];
  isFeatured: boolean;
  isSeasonal: boolean;
  isActive: boolean;
  barcodes?: { id: string; code: string; type: string }[];
}

interface ProductFormProps {
  mode: "create" | "edit";
  initialProduct?: ProductFormInitialData;
}

export function ProductForm({ mode, initialProduct }: ProductFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [productBarcodes, setProductBarcodes] = useState(
    initialProduct?.barcodes || []
  );
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [createdLabelProduct, setCreatedLabelProduct] = useState<{
    id: string;
    nameAr: string;
    retailPrice: number;
    unit: string;
    barcode: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    sku: initialProduct?.sku || `PRD-${Date.now().toString().slice(-6)}`,
    slug: initialProduct?.slug || "",
    nameAr: initialProduct?.nameAr || "",
    nameEn: initialProduct?.nameEn || "",
    categoryId: initialProduct?.categoryId || "",
    retailPrice:
      initialProduct?.retailPrice !== undefined ? String(initialProduct.retailPrice) : "",
    costPrice:
      initialProduct?.costPrice !== undefined ? String(initialProduct.costPrice) : "",
    taxRate: initialProduct?.taxRate !== undefined ? String(initialProduct.taxRate) : "16",
    unit: initialProduct?.unit || "piece",
    weight: initialProduct?.weight ? String(initialProduct.weight) : "",
    shelfLifeHours:
      initialProduct?.shelfLifeHours !== undefined && initialProduct?.shelfLifeHours !== null
        ? String(initialProduct.shelfLifeHours)
        : "24",
    descriptionAr: initialProduct?.descriptionAr || "",
    ingredientsAr: initialProduct?.ingredientsAr || "",
    allergens: initialProduct?.allergens || ([] as string[]),
    images: initialProduct?.images || ([] as string[]),
    isFeatured: initialProduct?.isFeatured ?? false,
    isSeasonal: initialProduct?.isSeasonal ?? false,
    isActive: initialProduct?.isActive ?? true,
  });

  useEffect(() => {
    let active = true;
    fetch("/api/categories")
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        const list: CategoryOption[] = Array.isArray(json?.data) ? json.data : [];
        setCategories(list);
        if (!formData.categoryId && list.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: list[0].id }));
        }
      })
      .catch(() => {
        // Ignore; category dropdown will show fallback message
      })
      .finally(() => {
        if (active) setLoadingCats(false);
      });
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.categoryId) {
      setFeedback({ kind: "error", text: "يرجى اختيار تصنيف للمنتج." });
      return;
    }

    setSubmitting(true);

    try {
      const endpoint =
        mode === "edit" && initialProduct
          ? `/api/products/${initialProduct.id}`
          : "/api/products";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          nameEn: formData.nameEn.trim() || formData.nameAr.trim(),
          slug: formData.slug.trim() || formData.sku.trim().toLowerCase(),
          retailPrice: parseFloat(formData.retailPrice),
          costPrice: parseFloat(formData.costPrice || "0"),
          taxRate: parseFloat(formData.taxRate),
          weight: formData.weight ? parseFloat(formData.weight) : null,
          shelfLifeHours: formData.shelfLifeHours
            ? parseInt(formData.shelfLifeHours, 10)
            : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const createdBarcode = data?.data?.barcodes?.[0]?.code as string | undefined;
        setFeedback({
          kind: "success",
          text:
            mode === "edit"
              ? "تم تحديث بيانات وصور المنتج بنجاح!"
              : createdBarcode
              ? `تم إضافة المنتج وتوليد الباركود (${createdBarcode}) بنجاح!`
              : "تم إضافة المنتج وصوره بنجاح!",
        });
        if (mode === "create" && data?.data?.id && createdBarcode) {
          setCreatedLabelProduct({
            id: data.data.id,
            nameAr: data.data.nameAr || formData.nameAr,
            retailPrice: Number(data.data.retailPrice ?? formData.retailPrice),
            unit: data.data.unit || formData.unit,
            barcode: createdBarcode,
          });
        } else {
          router.push("/admin/products");
          router.refresh();
        }
      } else {
        setFeedback({
          kind: "error",
          text: data.error || "فشل حفظ المنتج، يرجى مراجعة الحقول.",
        });
      }
    } catch {
      setFeedback({
        kind: "error",
        text: "حدث خطأ أثناء الاتصال بالخادم.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 mb-1 font-semibold"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة لقائمة المنتجات</span>
          </Link>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-600" />
            <span>
              {mode === "edit" ? "تعديل بيانات وصور المنتج" : "إضافة صنف بناء وديكور جديد"}
            </span>
          </h1>
        </div>

        {mode === "edit" && initialProduct && (
          <Link
            href={`/products/${initialProduct.id}`}
            target="_blank"
            className="px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition"
          >
            معاينة صفحة المنتج في المتجر ↗
          </Link>
        )}
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-2xl border text-xs font-bold ${
            feedback.kind === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Barcode Card (Edit Mode) */}
        {mode === "edit" && initialProduct && (
          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-amber-600" />
                  <span>باركود المنتج (EAN-13)</span>
                </h2>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  يُستخدم لمسح المنتج بكاميرا الكاشير وطباعة الملصقات اللاصقة.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {productBarcodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLabelModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة ملصق الباركود</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={generatingBarcode}
                  onClick={async () => {
                    setGeneratingBarcode(true);
                    try {
                      const res = await fetch(
                        `/api/products/${initialProduct.id}/barcode`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            forceNew: productBarcodes.length > 0,
                          }),
                        }
                      );
                      const json = await res.json();
                      if (res.ok && json?.data?.barcodes) {
                        setProductBarcodes(json.data.barcodes);
                      }
                    } finally {
                      setGeneratingBarcode(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {generatingBarcode
                      ? "جاري التوليد..."
                      : productBarcodes.length > 0
                      ? "توليد باركود جديد"
                      : "توليد باركود تلقائي"}
                  </span>
                </button>
              </div>
            </div>

            {productBarcodes.length > 0 ? (
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="bg-white p-3 rounded-xl border border-stone-200 w-full sm:w-auto flex justify-center">
                  <BarcodeSvg
                    code={productBarcodes[productBarcodes.length - 1].code}
                    height={54}
                  />
                </div>
                <div className="text-xs space-y-1 text-center sm:text-right">
                  <div className="text-stone-500">الباركود الفعّال حالياً:</div>
                  <div
                    dir="ltr"
                    className="font-mono font-black text-base text-stone-900 dark:text-stone-100"
                  >
                    {productBarcodes[productBarcodes.length - 1].code}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    النوع: EAN-13 | مسجّل في قاعدة البيانات
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                هذا المنتج لا يمتلك باركود بعد. اضغط على «توليد باركود تلقائي» لإنشاء باركود فوري.
              </div>
            )}
          </div>
        )}

        {/* 5 Product Images */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
          <ProductImagesUploader
            images={formData.images}
            onChange={(images) => setFormData((prev) => ({ ...prev, images }))}
            maxImages={5}
          />
        </div>

        {/* Basic Info */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
          <h2 className="text-xs font-bold text-stone-700 dark:text-stone-300 border-b border-stone-200 dark:border-stone-800 pb-2">
            المعلومات الأساسية
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                اسم المنتج بالعربية *
              </label>
              <input
                type="text"
                required
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="مثال: دهان بلاستيك مطفي فاخر أو لوح جبس بورد أخضر"
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                التصنيف *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                disabled={loadingCats}
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {loadingCats ? (
                  <option value="">جاري تحميل التصنيفات...</option>
                ) : categories.length === 0 ? (
                  <option value="">لا توجد تصنيفات متاحة</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameAr} ({cat.nameEn})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                الرابط المختصر (Slug)
              </label>
              <input
                type="text"
                dir="ltr"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="taboon-bread (يُنشأ تلقائياً إذا تُرك فارغاً)"
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 font-mono focus:outline-none focus:border-amber-500 text-right"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              وصف المنتج
            </label>
            <textarea
              rows={3}
              value={formData.descriptionAr}
              onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
              placeholder="وصف مكونات المنتج ومذاقه وطريقة تقديمه (سيظهر أول كلمتين منه في البطاقة والوصف الكامل في صفحة التفاصيل)..."
              className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              المكونات الطبيعية (تظهر في صفحة تفاصيل المنتج)
            </label>
            <textarea
              rows={2}
              value={formData.ingredientsAr}
              onChange={(e) => setFormData({ ...formData, ingredientsAr: e.target.value })}
              placeholder="مثال: دقيق قمح بلدي، ماء نقي، خميرة طبيعية، زيت زيتون بكر، رشة ملح بحري"
              className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Pricing & Tax */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
          <h2 className="text-xs font-bold text-stone-700 dark:text-stone-300 border-b border-stone-200 dark:border-stone-800 pb-2">
            التسعير والوزن والصلاحية (بالدينار الأردني JOD)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                سعر البيع للجمهور (د.أ) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.retailPrice}
                onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value })}
                placeholder="1.50"
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                تكلفة الإنتاج التقديرية (د.أ)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="0.65"
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                نسبة ضريبة المبيعات (%)
              </label>
              <select
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="16">16% (مواد البناء والديكور العامة)</option>
                <option value="0">0% (أصناف معفاة)</option>
                <option value="4">4% (مدخلات خاصة)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                وحدة البيع
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="لوح">لوح</option>
                <option value="عبوة">عبوة / سطل</option>
                <option value="كيس">كيس</option>
                <option value="متر">متر</option>
                <option value="قطعة">قطعة</option>
                <option value="رول">رول</option>
                <option value="كغم">كيلوغرام (كغم)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                الوزن التقريبي (كغم/غرام)
              </label>
              <input
                type="number"
                step="1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder="مثال: 25"
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                مدة الصلاحية / الضمان (ساعة)
              </label>
              <input
                type="number"
                step="1"
                value={formData.shelfLifeHours}
                onChange={(e) =>
                  setFormData({ ...formData, shelfLifeHours: e.target.value })
                }
                placeholder="24"
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Flags */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-5">
          <h2 className="text-xs font-bold text-stone-700 dark:text-stone-300 border-b border-stone-200 dark:border-stone-800 pb-2">
            الوسوم وحالة الظهور
          </h2>

          <div className="flex flex-wrap gap-5">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span>متاح وظاهر للعملاء</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded"
              />
              <span>منتج مميز (يظهر في الرئيسية)</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isSeasonal}
                onChange={(e) => setFormData({ ...formData, isSeasonal: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded"
              />
              <span>منتج موسمي</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/admin/products"
            className="px-6 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            إلغاء
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            <span>
              {submitting
                ? "جاري الحفظ..."
                : mode === "edit"
                ? "حفظ التعديلات"
                : "حفظ وإضافة المنتج"}
            </span>
          </button>
        </div>
      </form>

      <BarcodeLabelModal
        isOpen={
          Boolean(createdLabelProduct) ||
          (labelModalOpen &&
            Boolean(initialProduct) &&
            productBarcodes.length > 0)
        }
        onClose={() => {
          if (createdLabelProduct) {
            setCreatedLabelProduct(null);
            router.push("/admin/products");
            router.refresh();
          } else {
            setLabelModalOpen(false);
          }
        }}
        product={
          createdLabelProduct
            ? createdLabelProduct
            : initialProduct && productBarcodes.length > 0
            ? {
                id: initialProduct.id,
                nameAr: formData.nameAr || initialProduct.nameAr,
                retailPrice:
                  parseFloat(formData.retailPrice) || initialProduct.retailPrice,
                unit: formData.unit || initialProduct.unit,
                barcode: productBarcodes[productBarcodes.length - 1].code,
              }
            : null
        }
      />
    </div>
  );
}

