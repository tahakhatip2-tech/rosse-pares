"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Sparkles,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  Upload,
  Send,
  ExternalLink,
  Search,
  Heart,
  MessageCircle,
  Share2,
  CheckCircle2,
  AlertCircle,
  X,
  PlusCircle,
} from "lucide-react";
import {
  NewsPostCard,
  NewsPostItem,
  NewsPostTypeValue,
} from "@/components/news/NewsPostCard";

interface CmsNewsManagerProps {
  initialPosts: NewsPostItem[];
  authorName: string;
  canPublish: boolean;
  canDelete: boolean;
}

const POST_TYPES: {
  value: NewsPostTypeValue;
  label: string;
  desc: string;
  icon: typeof FileText;
}[] = [
  { value: "TEXT", label: "منشور نصي", desc: "خبر سريع أو إعلان", icon: Sparkles },
  { value: "IMAGE", label: "صورة", desc: "صورة من الجهاز", icon: ImageIcon },
  { value: "VIDEO", label: "فيديو", desc: "فيديو من الجهاز", icon: Video },
  { value: "ARTICLE", label: "مقالة", desc: "قصة أو وصفة مفصلة", icon: FileText },
];

type StatusFilter = "ALL" | "PUBLISHED" | "DRAFT" | "PINNED";

export function CmsNewsManager({
  initialPosts,
  authorName,
  canPublish,
  canDelete,
}: CmsNewsManagerProps) {
  const [posts, setPosts] = useState<NewsPostItem[]>(initialPosts);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<NewsPostTypeValue>("IMAGE");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  // UI feedback state
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  // Management filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter((p) => p.isPublished).length;
    const pinned = posts.filter((p) => p.isPinned).length;
    const interactions = posts.reduce(
      (sum, p) => sum + p.likesCount + p.commentsCount + p.sharesCount,
      0
    );
    return { total, published, pinned, interactions };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (statusFilter === "PUBLISHED" && !post.isPublished) return false;
      if (statusFilter === "DRAFT" && post.isPublished) return false;
      if (statusFilter === "PINNED" && !post.isPinned) return false;
      if (q) {
        const hay = `${post.title || ""} ${post.content} ${post.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [posts, statusFilter, searchQuery]);

  const previewPost: NewsPostItem = useMemo(
    () => ({
      id: editingId || "preview-post",
      type,
      title: title.trim() || null,
      content:
        content.trim() ||
        "اكتب نص المنشور أو المقالة هنا لتظهر لك معاينة حية مطابقة تماماً لما سيراه زوار روز باريس...",
      mediaUrl: mediaUrl.trim() || localPreviewUrl || null,
      isPinned,
      isPublished,
      likesCount: 24,
      commentsCount: 5,
      sharesCount: 3,
      createdAt: new Date().toISOString(),
      authorName: authorName || "إدارة روز باريس",
      likedByMe: false,
      comments: [],
    }),
    [editingId, type, title, content, mediaUrl, localPreviewUrl, isPinned, isPublished, authorName]
  );

  function clearLocalPreview() {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
  }

  function clearMedia() {
    clearLocalPreview();
    setMediaUrl("");
    setUploadError(null);
  }

  function resetComposer() {
    setEditingId(null);
    setType("IMAGE");
    setTitle("");
    setContent("");
    clearMedia();
    setIsPinned(false);
    setIsPublished(true);
  }

  function startEditing(post: NewsPostItem) {
    setEditingId(post.id);
    setType(post.type);
    setTitle(post.title || "");
    setContent(post.content);
    clearLocalPreview();
    setMediaUrl(post.mediaUrl || "");
    setUploadError(null);
    setIsPinned(post.isPinned);
    setIsPublished(post.isPublished);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 100 * 1024 * 1024; // 100 MB
    if (file.size > maxBytes) {
      const msg = "حجم الملف يتجاوز الحد المسموح (100 ميجابايت).";
      setUploadError(msg);
      setFeedback({ kind: "error", text: msg });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Show immediate local preview in the upload box while uploading
    clearLocalPreview();
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    if (file.type.startsWith("video/")) {
      setType("VIDEO");
    } else if (type === "TEXT") {
      setType("IMAGE");
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setFeedback(null);

    try {
      // 1. Obtain short-lived Cloudinary signature (allows large videos directly from device)
      const sigRes = await fetch("/api/upload", { method: "GET" });
      const sigJson = await sigRes.json();

      if (!sigRes.ok || !sigJson.success) {
        const msg =
          sigJson.error ||
          "خدمة رفع الوسائط غير مفعلة حالياً. يرجى التحقق من متغيرات Cloudinary في Vercel.";
        setUploadError(msg);
        setFeedback({ kind: "error", text: msg });
        return;
      }

      const { cloudName, apiKey, timestamp, folder, signature } = sigJson.data as {
        cloudName: string;
        apiKey: string;
        timestamp: string;
        folder: string;
        signature: string;
      };

      const cloudinaryForm = new FormData();
      cloudinaryForm.append("file", file);
      cloudinaryForm.append("api_key", apiKey);
      cloudinaryForm.append("timestamp", timestamp);
      cloudinaryForm.append("folder", folder);
      cloudinaryForm.append("signature", signature);

      const uploadResult = await new Promise<{
        secure_url: string;
        resource_type: string;
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && parsed.secure_url) {
              resolve(parsed);
            } else {
              const rawMsg = String(parsed?.error?.message || "");
              if (rawMsg.toLowerCase().includes("invalid signature")) {
                reject(
                  new Error(
                    "فشل توقيع Cloudinary (Invalid Signature). تأكد من نسخ CLOUDINARY_API_SECRET الحقيقي في إعدادات Vercel بدون مسافات أو نجوم *** ثم عمل Redeploy."
                  )
                );
              } else {
                reject(new Error(rawMsg || "فشل رفع الملف إلى Cloudinary"));
              }
            }
          } catch {
            reject(new Error("استجابة غير متوقعة أثناء رفع الملف"));
          }
        };

        xhr.onerror = () => reject(new Error("تعذر الاتصال بخدمة الرفع السحابي"));
        xhr.send(cloudinaryForm);
      });

      URL.revokeObjectURL(objectUrl);
      setLocalPreviewUrl(null);
      setMediaUrl(uploadResult.secure_url);
      if (uploadResult.resource_type === "video") {
        setType("VIDEO");
      } else if (type === "TEXT") {
        setType("IMAGE");
      }
      setUploadError(null);
      setFeedback({
        kind: "success",
        text: "تم رفع الملف من جهازك بنجاح وإرفاقه بالمنشور.",
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "حدث خطأ أثناء رفع الملف من الجهاز.";
      setMediaUrl("");
      setUploadError(msg);
      setFeedback({ kind: "error", text: msg });
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setFeedback({ kind: "error", text: "يرجى كتابة محتوى المنشور قبل الحفظ." });
      return;
    }

    if ((type === "IMAGE" || type === "VIDEO") && !mediaUrl.trim()) {
      setFeedback({
        kind: "error",
        text:
          type === "IMAGE"
            ? "يرجى رفع صورة من جهازك لهذا النوع من المنشورات."
            : "يرجى رفع فيديو من جهازك لهذا النوع من المنشورات.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        type,
        title: title.trim() || null,
        content: content.trim(),
        mediaUrl: mediaUrl.trim() || null,
        isPinned,
        isPublished,
      };

      const url = editingId ? `/api/news/${editingId}` : "/api/news";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFeedback({
          kind: "error",
          text: json.error || "تعذر حفظ المنشور. تأكد من الصلاحيات والبيانات.",
        });
        return;
      }

      const saved: NewsPostItem = json.data;
      if (editingId) {
        setPosts((prev) =>
          sortPosts(prev.map((p) => (p.id === saved.id ? { ...p, ...saved } : p)))
        );
        setFeedback({ kind: "success", text: "تم تحديث المنشور بنجاح." });
      } else {
        setPosts((prev) => sortPosts([saved, ...prev]));
        setFeedback({
          kind: "success",
          text: isPublished
            ? "تم نشر البوست بنجاح في صفحة آخر الأخبار!"
            : "تم حفظ البوست كمسودة.",
        });
      }

      resetComposer();
    } catch {
      setFeedback({
        kind: "error",
        text: "حدث خطأ غير متوقع أثناء الاتصال بالخادم.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleFlag(
    post: NewsPostItem,
    field: "isPinned" | "isPublished"
  ) {
    if (!canPublish) return;
    setBusyPostId(post.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/news/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !post[field] }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ kind: "error", text: json.error || "تعذر تحديث حالة المنشور." });
        return;
      }
      const updated: NewsPostItem = json.data;
      setPosts((prev) =>
        sortPosts(prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
      );
    } catch {
      setFeedback({ kind: "error", text: "فشل تحديث حالة المنشور." });
    } finally {
      setBusyPostId(null);
    }
  }

  async function handleDelete(postId: string) {
    if (!canDelete) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا المنشور نهائياً مع كافة تعليقاته؟")) {
      return;
    }

    setBusyPostId(postId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/news/${postId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ kind: "error", text: json.error || "تعذر حذف المنشور." });
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (editingId === postId) {
        resetComposer();
      }
      setFeedback({ kind: "success", text: "تم حذف المنشور بنجاح." });
    } catch {
      setFeedback({ kind: "error", text: "فشل حذف المنشور." });
    } finally {
      setBusyPostId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span>إدارة المحتوى وآخر الأخبار</span>
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            انشر أخبار المعرض، صور المواد والديكورات الجديدة، الفيديوهات، والمقالات الهندسية مع معاينة فورية لبطاقة المنشور.
          </p>
        </div>

        <Link
          href="/news"
          target="_blank"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-sm transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>عرض صفحة آخر الأخبار</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "إجمالي المنشورات", value: stats.total, accent: "text-stone-900 dark:text-white" },
          { label: "منشورات ظاهرة للجمهور", value: stats.published, accent: "text-emerald-600 dark:text-emerald-400" },
          { label: "منشورات مثبتة", value: stats.pinned, accent: "text-amber-600 dark:text-amber-400" },
          { label: "إجمالي التفاعلات", value: stats.interactions, accent: "text-rose-600 dark:text-rose-400" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-stone-900 border border-amber-900/10 dark:border-stone-800 rounded-2xl p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{card.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${card.accent}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-2xl border text-sm font-medium ${
            feedback.kind === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
          }`}
        >
          {feedback.kind === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-0.5 opacity-70 hover:opacity-100"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Composer + Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Composer Form */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-6 bg-white dark:bg-stone-900 border border-amber-900/10 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <h2 className="font-extrabold text-base text-stone-900 dark:text-white flex items-center gap-2">
              {editingId ? (
                <>
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  <span>تعديل منشور حالي</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-amber-600" />
                  <span>إنشاء منشور جديد</span>
                </>
              )}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetComposer}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 dark:hover:text-white"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          {/* Post Type */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
              نوع المنشور
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {POST_TYPES.map((item) => {
                const Icon = item.icon;
                const active = type === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setType(item.value)}
                    className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                      active
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-800 dark:text-amber-300 shadow-sm"
                        : "bg-stone-50 dark:bg-stone-950/60 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-amber-400/50"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] opacity-75">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              العنوان {type === "ARTICLE" ? "(مفضل للمقالات)" : "(اختياري)"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="مثال: وصول دفعة جديدة من بديل الخشب WPC وبديل الرخام لمعرض أم نوارة!"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                نص المنشور / المقالة *
              </label>
              <span className="text-[11px] text-stone-400">{content.length} / 10000</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={10000}
              required
              placeholder="شارك أخبار المعرض، العروض الخاصة، نصائح التشطيب والديكور أو أخبار المشاريع مع عملائنا..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-sm text-stone-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Device Media Upload Only */}
          {(type === "IMAGE" || type === "VIDEO" || type === "ARTICLE") && (
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                {type === "VIDEO"
                  ? "رفع الفيديو من الجهاز *"
                  : type === "IMAGE"
                  ? "رفع الصورة من الجهاز *"
                  : "رفع صورة غلاف للمقالة من الجهاز (اختياري)"}
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept={type === "VIDEO" ? "video/*" : "image/*"}
                onChange={handleFileUpload}
                className="hidden"
              />

              {(mediaUrl || localPreviewUrl) ? (
                <div className="rounded-2xl border border-amber-900/15 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 p-3 space-y-3">
                  <div className="relative overflow-hidden rounded-xl bg-black/5 dark:bg-black/40 border border-stone-200 dark:border-stone-800 max-h-64 flex items-center justify-center">
                    {type === "VIDEO" ? (
                      <video
                        src={mediaUrl || localPreviewUrl || ""}
                        controls
                        className="w-full max-h-64 object-contain"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl || localPreviewUrl || ""}
                        alt="معاينة الملف المرفوع"
                        className="w-full max-h-64 object-contain"
                      />
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 p-4 text-white">
                        <span className="text-xs font-bold">
                          جاري الرفع إلى السحابة... {uploadProgress ?? 0}%
                        </span>
                        <div className="w-48 h-2 rounded-full bg-white/25 overflow-hidden">
                          <div
                            className="h-full bg-amber-400 transition-all duration-150"
                            style={{ width: `${uploadProgress ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {uploading ? (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        جاري رفع الملف...
                      </span>
                    ) : mediaUrl ? (
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم الرفع بنجاح وحفظ الملف</span>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                        لم يكتمل الرفع السحابي بعد
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{mediaUrl ? "تغيير الملف" : "إعادة المحاولة"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={clearMedia}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 text-red-700 dark:text-red-300 text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إزالة</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 px-4 py-7 rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-600 bg-amber-50/40 hover:bg-amber-50 dark:bg-stone-950/60 dark:hover:bg-stone-950 transition-all text-center disabled:opacity-60"
                >
                  <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                    {type === "VIDEO" ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
                      {uploading
                        ? `جاري الرفع من الجهاز... ${uploadProgress ?? 0}%`
                        : type === "VIDEO"
                        ? "اضغط لاختيار فيديو من جهازك"
                        : "اضغط لاختيار صورة من جهازك"}
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      {type === "VIDEO"
                        ? "صيغ MP4 / MOV / WEBM — حتى 100 ميجابايت"
                        : "صيغ JPG / PNG / WEBP — من الهاتف أو الكمبيوتر"}
                    </p>
                  </div>
                  {uploading && uploadProgress !== null && (
                    <div className="w-full max-w-xs h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden mt-1">
                      <div
                        className="h-full bg-amber-600 transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 accent-amber-600 rounded"
              />
              <span>تثبيت في أعلى الأخبار</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span>نشر للجمهور فوراً</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>
              {submitting
                ? "جاري الحفظ..."
                : editingId
                ? "حفظ التعديلات"
                : isPublished
                ? "نشر في آخر الأخبار"
                : "حفظ كمسودة"}
            </span>
          </button>
        </form>

        {/* Live Preview */}
        <div className="xl:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              معاينة حية لبطاقة المنشور
            </span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              تطابق العرض الفعلي في /news
            </span>
          </div>
          <NewsPostCard
            post={previewPost}
            isAdmin
            isLoggedIn
            previewMode
          />
        </div>
      </div>

      {/* Existing Posts Management */}
      <div className="bg-white dark:bg-stone-900 border border-amber-900/10 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "ALL", label: "الكل" },
                { id: "PUBLISHED", label: "منشور" },
                { id: "DRAFT", label: "مخفي / مسودة" },
                { id: "PINNED", label: "مثبت" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === tab.id
                    ? "bg-amber-600 text-white"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المنشورات..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-stone-500 dark:text-stone-400 text-sm">
            لا توجد منشورات مطابقة للبحث أو الفلتر الحالي.
          </div>
        ) : (
          <div className="divide-y divide-stone-200 dark:divide-stone-800">
            {filteredPosts.map((post) => {
              const typeLabel =
                POST_TYPES.find((t) => t.value === post.type)?.label || post.type;
              const isBusy = busyPostId === post.id;

              return (
                <div
                  key={post.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        {typeLabel}
                      </span>
                      {post.isPublished ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          منشور
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          مسودة / مخفي
                        </span>
                      )}
                      {post.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          <Pin className="w-3 h-3" />
                          مثبت
                        </span>
                      )}
                      <span className="text-[11px] text-stone-400">
                        {new Date(post.createdAt).toLocaleDateString("ar-JO", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {post.title && (
                      <h3 className="font-bold text-sm text-stone-900 dark:text-white truncate">
                        {post.title}
                      </h3>
                    )}
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                      {post.content}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-stone-500 dark:text-stone-400 pt-1">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        {post.likesCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
                        {post.commentsCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        {post.sharesCount}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      href={`/news?post=${post.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>عرض</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => startEditing(post)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    {canPublish && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleFlag(post, "isPinned")}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300/60 dark:border-amber-800 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-50"
                        >
                          {post.isPinned ? (
                            <>
                              <PinOff className="w-3.5 h-3.5" />
                              <span>إلغاء التثبيت</span>
                            </>
                          ) : (
                            <>
                              <Pin className="w-3.5 h-3.5" />
                              <span>تثبيت</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleFlag(post, "isPublished")}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50"
                        >
                          {post.isPublished ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>إخفاء</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>نشر</span>
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDelete(post.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function sortPosts(items: NewsPostItem[]): NewsPostItem[] {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

