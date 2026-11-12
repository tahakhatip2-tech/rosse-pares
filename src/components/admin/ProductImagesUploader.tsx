"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ImagePlus,
  Star,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface ProductImagesUploaderProps {
  images: string[];
  onChange: (nextImages: string[]) => void;
  maxImages?: number;
}

interface PendingUpload {
  id: string;
  previewUrl: string;
  progress: number;
}

export function ProductImagesUploader({
  images,
  onChange,
  maxImages = 5,
}: ProductImagesUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [error, setError] = useState<string | null>(null);

  const remainingSlots = Math.max(0, maxImages - images.length - pending.length);

  async function uploadSingleFile(file: File, tempId: string) {
    const sigRes = await fetch("/api/upload?folder=products", { method: "GET" });
    const sigJson = await sigRes.json();

    if (!sigRes.ok || !sigJson.success) {
      throw new Error(
        sigJson.error ||
        "خدمة رفع الصور (Cloudinary) غير مفعلة حالياً. تأكد من إعداد المتغيرات في Vercel."
      );
    }

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

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setPending((prev) =>
            prev.map((item) => (item.id === tempId ? { ...item, progress: pct } : item))
          );
        }
      };

      xhr.onload = () => {
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && parsed.secure_url) {
            resolve(parsed.secure_url as string);
          } else {
            reject(new Error(parsed?.error?.message || "فشل رفع الصورة إلى Cloudinary"));
          }
        } catch {
          reject(new Error("استجابة غير متوقعة أثناء رفع الصورة"));
        }
      };

      xhr.onerror = () => reject(new Error("تعذر الاتصال بخدمة الرفع السحابي"));
      xhr.send(formData);
    });
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setError(null);
    const files = Array.from(fileList).slice(0, maxImages - images.length);
    if (files.length === 0) {
      setError(`الحد الأقصى هو ${maxImages} صور للمنتج.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const invalidType = files.find((f) => !f.type.startsWith("image/"));
    if (invalidType) {
      setError("يرجى اختيار ملفات صور فقط (JPG, PNG, WEBP).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const tooLarge = files.find((f) => f.size > 15 * 1024 * 1024);
    if (tooLarge) {
      setError("حجم إحدى الصور يتجاوز 15 ميجابايت.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const batch = files.map((file, idx) => ({
      file,
      id: `up-${Date.now()}-${idx}`,
      previewUrl: URL.createObjectURL(file),
    }));

    setPending((prev) => [
      ...prev,
      ...batch.map(({ id, previewUrl }) => ({ id, previewUrl, progress: 0 })),
    ]);

    const uploadedUrls: string[] = [];

    try {
      for (const item of batch) {
        try {
          const url = await uploadSingleFile(item.file, item.id);
          uploadedUrls.push(url);
        } finally {
          URL.revokeObjectURL(item.previewUrl);
          setPending((prev) => prev.filter((p) => p.id !== item.id));
        }
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls].slice(0, maxImages));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء رفع بعض الصور."
      );
      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls].slice(0, maxImages));
      }
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function removeImage(index: number) {
    onChange(images.filter((_, idx) => idx !== index));
  }

  function makePrimary(index: number) {
    if (index === 0) return;
    const chosen = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    onChange([chosen, ...rest]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
            صور المنتج ({images.length} / {maxImages})
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            ارفع حتى 5 صور مباشرة من جهازك. الصورة الأولى هي صورة الواجهة، وفي حال عدم رفع صور سيظهر شعار روز باريس تلقائياً.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
        />

        <button
          type="button"
          disabled={remainingSlots <= 0 || pending.length > 0}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
        >
          <ImagePlus className="w-4 h-4" />
          <span>
            {remainingSlots > 0 ? "إضافة صور من الجهاز" : `اكتمل الحد (${maxImages})`}
          </span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Visual 5-Slot Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {images.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            className={`group relative aspect-square rounded-2xl overflow-hidden border bg-stone-100 dark:bg-stone-950 ${idx === 0
              ? "border-amber-500 ring-2 ring-amber-500/30"
              : "border-stone-200 dark:border-stone-800"
              }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`صورة المنتج ${idx + 1}`}
              className="w-full h-full object-cover"
            />

            {idx === 0 ? (
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center gap-1 shadow">
                <Star className="w-2.5 h-2.5 fill-current" />
                <span>رئيسية</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makePrimary(idx)}
                title="تعيين كصورة رئيسية"
                className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/65 hover:bg-amber-600 text-white text-[10px] font-bold transition"
              >
                رئيسية
              </button>
            )}

            <button
              type="button"
              onClick={() => removeImage(idx)}
              title="حذف الصورة"
              className="absolute bottom-2 left-2 p-1.5 rounded-lg bg-red-600/90 hover:bg-red-700 text-white shadow transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
              {idx + 1}
            </span>
          </div>
        ))}

        {pending.map((item) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-2xl overflow-hidden border border-amber-400 bg-stone-100 dark:bg-stone-950"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.previewUrl}
              alt="جاري الرفع"
              className="w-full h-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5 text-white p-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              <span className="text-[11px] font-bold">{item.progress}%</span>
            </div>
          </div>
        ))}

        {/* Empty Upload Slots */}
        {Array.from({ length: remainingSlots }).map((_, emptyIdx) => {
          const isFallbackPreview = images.length === 0 && pending.length === 0 && emptyIdx === 0;
          return (
            <button
              key={`slot-${emptyIdx}`}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-2xl border-2 border-dashed border-amber-500/35 hover:border-amber-600 bg-[#fbf6ec] hover:bg-amber-50/70 dark:bg-stone-950/60 dark:hover:bg-stone-900 flex flex-col items-center justify-center gap-1.5 p-3 text-center transition"
            >
              {isFallbackPreview ? (
                <>
                  <div className="relative w-12 h-12 rounded-xl bg-white dark:bg-stone-900 border border-amber-900/10 p-1.5 shadow-xs">
                    <Image
                      src="/rozeparees.png"
                      alt="الصورة الافتراضية"
                      fill
                      className="object-contain p-1"
                      unoptimized
                    />
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400">
                    الشعار (افتراضي)
                  </span>
                  <span className="text-[9px] text-stone-500">اضغط لرفع صورة</span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-5 h-5 text-amber-600/80" />
                  <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                    صورة {images.length + pending.length + emptyIdx + 1}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {images.length > 0 && (
        <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>الصورة رقم 1 (المحددة بشارة رئيسية) ستظهر في واجهة بطاقة المنتج.</span>
        </p>
      )}
    </div>
  );
}

