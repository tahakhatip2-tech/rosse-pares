"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  Pin,
  BadgeCheck,
  MoreHorizontal,
  Trash2,
  Send,
  Copy,
  Check,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Sparkles,
  Maximize2,
  ExternalLink,
  Lock,
  LogIn,
  UserPlus,
} from "lucide-react";

export type NewsPostTypeValue = "TEXT" | "IMAGE" | "VIDEO" | "ARTICLE";

export interface NewsCommentItem {
  id: string;
  postId: string;
  authorName: string;
  isAdminReply: boolean;
  content: string;
  createdAt: string;
}

export interface NewsPostItem {
  id: string;
  type: NewsPostTypeValue;
  title?: string | null;
  content: string;
  mediaUrl?: string | null;
  isPinned: boolean;
  isPublished: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  authorName?: string;
  likedByMe?: boolean;
  comments?: NewsCommentItem[];
}

interface NewsPostCardProps {
  post: NewsPostItem;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  previewMode?: boolean;
  onPostDeleted?: (postId: string) => void;
  onPostPinToggled?: (postId: string, nextPinned: boolean) => void;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname.startsWith("/watch")) {
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return url;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function formatRelativeArabicTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "الآن";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "الآن";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)
    return `منذ ${diffMin} ${diffMin === 1 ? "دقيقة" : diffMin <= 10 ? "دقائق" : "دقيقة"}`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24)
    return `منذ ${diffHours} ${diffHours === 1 ? "ساعة" : diffHours === 2 ? "ساعتين" : diffHours <= 10 ? "ساعات" : "ساعة"}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7)
    return `منذ ${diffDays} ${diffDays === 1 ? "يوم" : diffDays === 2 ? "يومين" : "أيام"}`;
  return date.toLocaleDateString("ar-JO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const TYPE_META: Record<
  NewsPostTypeValue,
  { label: string; icon: React.ComponentType<{ className?: string }>; badgeClass: string }
> = {
  TEXT: {
    label: "منشور",
    icon: Sparkles,
    badgeClass: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300",
  },
  IMAGE: {
    label: "صورة",
    icon: ImageIcon,
    badgeClass: "bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300",
  },
  VIDEO: {
    label: "فيديو",
    icon: Video,
    badgeClass: "bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300",
  },
  ARTICLE: {
    label: "مقالة",
    icon: FileText,
    badgeClass: "bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300",
  },
};

export function NewsPostCard({
  post,
  isAdmin = false,
  isLoggedIn = false,
  previewMode = false,
  onPostDeleted,
  onPostPinToggled,
}: NewsPostCardProps) {
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [sharesCount, setSharesCount] = useState(post.sharesCount);
  const [isPinned, setIsPinned] = useState(post.isPinned);

  const [expandedText, setExpandedText] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<NewsCommentItem[]>(post.comments ?? []);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsLoadedAll, setCommentsLoadedAll] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setLiked(Boolean(post.likedByMe));
    setLikesCount(post.likesCount);
    setCommentsCount(post.commentsCount);
    setSharesCount(post.sharesCount);
    setIsPinned(post.isPinned);
  }, [post]);

  const meta = TYPE_META[post.type] || TYPE_META.TEXT;
  const TypeIcon = meta.icon;
  const isLongContent = post.content.length > 280;
  const displayContent =
    isLongContent && !expandedText
      ? `${post.content.slice(0, 280)}...`
      : post.content;

  const youtubeEmbed =
    post.mediaUrl && post.type === "VIDEO" ? getYouTubeEmbedUrl(post.mediaUrl) : null;

  const requireLoginPrompt = () => {
    setAuthPromptVisible(true);
  };

  const handleToggleLike = async () => {
    if (previewMode) return;
    if (!isLoggedIn) {
      requireLoginPrompt();
      return;
    }

    const prevLiked = liked;
    const prevCount = likesCount;
    setLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await fetch(`/api/news/${post.id}/like`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setLiked(json.data.liked);
        setLikesCount(json.data.likesCount);
      } else {
        setLiked(prevLiked);
        setLikesCount(prevCount);
        if (res.status === 401) requireLoginPrompt();
      }
    } catch {
      setLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const loadAllComments = async () => {
    if (previewMode || commentsLoadedAll) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/news/${post.id}/comments`);
      const json = await res.json();
      if (res.ok && json.success) {
        setComments(json.data.items);
        setCommentsLoadedAll(true);
      }
    } finally {
      setLoadingComments(false);
    }
  };

  const handleOpenComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoadedAll) {
      loadAllComments();
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewMode || !commentText.trim()) return;
    if (!isLoggedIn) {
      requireLoginPrompt();
      return;
    }

    setCommentError(null);
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/news/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (res.status === 401) {
          requireLoginPrompt();
          return;
        }
        setCommentError(json.error || "تعذر إرسال التعليق");
        return;
      }

      setComments((prev) => [json.data.comment, ...prev]);
      setCommentsCount(json.data.commentsCount);
      setCommentText("");
    } catch {
      setCommentError("حدث خطأ في الاتصال بالخادم");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (previewMode || !isAdmin) return;
    try {
      const res = await fetch(`/api/news/${post.id}/comments/${commentId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setCommentsCount(json.data.commentsCount);
      }
    } catch {
      // ignore
    }
  };

  const getShareUrl = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/news?post=${post.id}`;
  };

  const recordShare = async () => {
    if (previewMode || !isLoggedIn) return;
    setSharesCount((c) => c + 1);
    try {
      const res = await fetch(`/api/news/${post.id}/share`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setSharesCount(json.data.sharesCount);
      }
    } catch {
      // ignore
    }
  };

  const handleCopyShareLink = async () => {
    if (!isLoggedIn) {
      requireLoginPrompt();
      return;
    }
    const url = getShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      await recordShare();
      setTimeout(() => {
        setCopiedLink(false);
        setShowShareMenu(false);
      }, 1500);
    } catch {
      // fallback
    }
  };

  const handleWhatsAppShare = async () => {
    if (!isLoggedIn) {
      requireLoginPrompt();
      return;
    }
    const url = getShareUrl();
    const text = `${post.title ? `${post.title}\n` : ""}${post.content.slice(0, 120)}...\n${url}`;
    await recordShare();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setShowShareMenu(false);
  };

  const handleNativeShare = async () => {
    if (previewMode) return;
    if (!isLoggedIn) {
      requireLoginPrompt();
      return;
    }
    const url = getShareUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: post.title || "خبر جديد من روز باريس",
          text: post.content.slice(0, 140),
          url,
        });
        await recordShare();
        return;
      } catch {
        // user cancelled or unsupported -> toggle menu
      }
    }
    setShowShareMenu((v) => !v);
  };

  const handleTogglePin = async () => {
    if (previewMode || !isAdmin) return;
    setShowAdminMenu(false);
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    try {
      const res = await fetch(`/api/news/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: nextPinned }),
      });
      if (res.ok) {
        onPostPinToggled?.(post.id, nextPinned);
      } else {
        setIsPinned(!nextPinned);
      }
    } catch {
      setIsPinned(!nextPinned);
    }
  };

  const handleDeletePost = async () => {
    if (previewMode || !isAdmin) return;
    setShowAdminMenu(false);
    if (!window.confirm("هل أنت متأكد من حذف هذا المنشور نهائياً؟")) return;
    try {
      const res = await fetch(`/api/news/${post.id}`, { method: "DELETE" });
      if (res.ok) {
        onPostDeleted?.(post.id);
      }
    } catch {
      // ignore
    }
  };

  const AuthNoticeBox = () => (
    <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 text-xs text-stone-800 dark:text-stone-200">
        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="font-semibold">
          سجّل دخولك أو أنشئ حساباً لتتمكن من الإعجاب والتعليق والمشاركة.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/news?post=${post.id}`)}`}
          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1 transition"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>دخول</span>
        </Link>
        <Link
          href={`/register?callbackUrl=${encodeURIComponent(`/news?post=${post.id}`)}`}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold inline-flex items-center gap-1 hover:bg-amber-50 dark:hover:bg-stone-800 transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>حساب جديد</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <article className="bg-white dark:bg-[#18120b] border border-amber-900/10 dark:border-stone-800/90 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* ── Pinned Banner ─────────────────────────────────────────── */}
        {isPinned && (
          <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/70 dark:border-amber-800/40 flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
            <Pin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 rotate-45" />
            <span>منشور مثبّت من الإدارة</span>
          </div>
        )}

        {/* ── Card Header (Facebook Style) ──────────────────────────── */}
        <div className="p-4 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-stone-900 border-2 border-amber-500/50 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
              <Image
                src="/rozeparees.png"
                alt="روز باريس"
                width={40}
                height={40}
                className="object-contain w-full h-full"
                unoptimized
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                  روز باريس لمواد البناء والديكور
                </span>
                <BadgeCheck className="w-4 h-4 text-amber-500 shrink-0" />
              </div>

              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                <span>{formatRelativeArabicTime(post.createdAt)}</span>
                <span>•</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.badgeClass}`}
                >
                  <TypeIcon className="w-3 h-3" />
                  <span>{meta.label}</span>
                </span>
              </div>
            </div>
          </div>

          {isAdmin && !previewMode && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAdminMenu((v) => !v)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                aria-label="خيارات الإدارة"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {showAdminMenu && (
                <div className="absolute left-0 mt-1 w-44 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-xl py-1.5 z-20 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    className="w-full px-3.5 py-2 text-right flex items-center gap-2 text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 transition"
                  >
                    <Pin className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isPinned ? "إلغاء التثبيت" : "تثبيت بالأعلى"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeletePost}
                    className="w-full px-3.5 py-2 text-right flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المنشور</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Title & Post Text ─────────────────────────────────────── */}
        <div className="px-4 pb-3 space-y-2">
          {post.title && (
            <h3
              className={`font-black text-stone-900 dark:text-stone-50 leading-snug ${
                post.type === "ARTICLE"
                  ? "text-lg sm:text-xl border-r-4 border-amber-500 pr-3 py-0.5"
                  : "text-base sm:text-lg"
              }`}
            >
              {post.title}
            </h3>
          )}

          <p className="text-sm sm:text-[15px] text-stone-800 dark:text-stone-200 whitespace-pre-line leading-relaxed">
            {displayContent}
          </p>

          {isLongContent && (
            <button
              type="button"
              onClick={() => setExpandedText((v) => !v)}
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
            >
              {expandedText ? "عرض أقل" : "عرض المزيد"}
            </button>
          )}
        </div>

        {/* ── Media Section (Image or Video) ────────────────────────── */}
        {post.mediaUrl && post.type !== "VIDEO" && (
          <div className="relative bg-stone-100 dark:bg-stone-950 border-y border-stone-200/70 dark:border-stone-800/80 group">
            <img
              src={post.mediaUrl}
              alt={post.title || "صورة من روز باريس"}
              className="w-full max-h-[520px] object-cover cursor-pointer"
              onClick={() => !previewMode && setLightboxOpen(true)}
            />
            {!previewMode && (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-3 left-3 p-2 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
                aria-label="تكبير الصورة"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {post.mediaUrl && post.type === "VIDEO" && (
          <div className="bg-black border-y border-stone-200/70 dark:border-stone-800/80">
            {youtubeEmbed ? (
              <div className="relative w-full aspect-video">
                <iframe
                  src={youtubeEmbed}
                  title={post.title || "فيديو روز باريس"}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video
                src={post.mediaUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[500px] mx-auto"
              />
            )}
          </div>
        )}

        {/* ── Counters Bar ──────────────────────────────────────────── */}
        <div className="px-4 py-2.5 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800/70">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 inline-flex items-center justify-center">
              <Heart className="w-3 h-3 fill-current" />
            </span>
            <span className="font-semibold font-mono">{likesCount}</span>
            <span>إعجاب</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleOpenComments}
              className="hover:underline font-medium"
            >
              <span className="font-mono font-semibold">{commentsCount}</span> تعليق
            </button>
            <span>
              <span className="font-mono font-semibold">{sharesCount}</span> مشاركة
            </span>
          </div>
        </div>

        {/* ── Facebook-Style 3-Button Action Bar ────────────────────── */}
        <div className="px-2 py-1.5 grid grid-cols-3 gap-1 relative">
          <button
            type="button"
            onClick={handleToggleLike}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all active:scale-95 ${
              liked
                ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/70"
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-transform ${
                liked ? "fill-amber-500 text-amber-500 scale-110" : ""
              }`}
            />
            <span>أعجبني</span>
          </button>

          <button
            type="button"
            onClick={handleOpenComments}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all ${
              showComments
                ? "text-amber-700 dark:text-amber-300 bg-amber-500/10"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/70"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>تعليق</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/70 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة</span>
            </button>

            {showShareMenu && !previewMode && isLoggedIn && (
              <div className="absolute bottom-12 left-0 w-48 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-xl py-1.5 z-20 text-xs font-semibold">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full px-3.5 py-2 text-right flex items-center gap-2 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>مشاركة عبر واتساب</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="w-full px-3.5 py-2 text-right flex items-center gap-2 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">تم نسخ الرابط!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-600" />
                      <span>نسخ رابط المنشور</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Auth Required Notice when guest tries to Like or Share */}
        {authPromptVisible && !isLoggedIn && !previewMode && (
          <div className="px-4 pb-3">
            <AuthNoticeBox />
          </div>
        )}

        {/* ── Comments Section (Inline Drawer) ──────────────────────── */}
        {showComments && (
          <div className="bg-stone-50/80 dark:bg-[#120d07] border-t border-stone-200/80 dark:border-stone-800 p-4 space-y-4">
            {!previewMode &&
              (isLoggedIn ? (
                <form onSubmit={handleSubmitComment} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={
                        isAdmin
                          ? "اكتب رداً باسم إدارة روز باريس..."
                          : "اكتب تعليقك هنا..."
                      }
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
                      required
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 transition shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال</span>
                    </button>
                  </div>
                  {commentError && (
                    <p className="text-[11px] text-red-600 font-semibold">
                      {commentError}
                    </p>
                  )}
                </form>
              ) : (
                <AuthNoticeBox />
              ))}

            {/* Comments List */}
            {loadingComments ? (
              <p className="text-xs text-stone-500 text-center py-2">
                جاري تحميل التعليقات...
              </p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-stone-500 dark:text-stone-400 text-center py-2">
                لا توجد تعليقات بعد. {isLoggedIn ? "كن أول من يعلّق!" : ""}
              </p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pl-1">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-2xl border text-xs sm:text-sm flex items-start justify-between gap-2 ${
                      c.isAdminReply
                        ? "bg-amber-50/90 dark:bg-amber-950/30 border-amber-300/60 dark:border-amber-700/50"
                        : "bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-stone-900 dark:text-stone-100 text-xs">
                          {c.authorName}
                        </span>
                        {c.isAdminReply && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                            <BadgeCheck className="w-3 h-3" />
                            <span>الإدارة</span>
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400">
                          • {formatRelativeArabicTime(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-stone-700 dark:text-stone-300 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                        {c.content}
                      </p>
                    </div>

                    {isAdmin && !previewMode && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        className="p-1 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0"
                        title="حذف التعليق"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </article>

      {/* ── Image Lightbox Modal ──────────────────────────────────── */}
      {lightboxOpen && post.mediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            aria-label="إغلاق الصورة"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={post.mediaUrl}
            alt={post.title || "معاينة الصورة"}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
