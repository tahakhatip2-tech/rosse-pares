"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Newspaper,
  Sparkles,
  Image as ImageIcon,
  Video,
  FileText,
  PenSquare,
  RotateCcw,
  Layers,
} from "lucide-react";
import {
  NewsPostCard,
  type NewsPostItem,
  type NewsPostTypeValue,
} from "@/components/news/NewsPostCard";

interface NewsFeedClientProps {
  initialPosts: NewsPostItem[];
  initialTotalPages: number;
  highlightedPostId?: string;
  isAdmin: boolean;
  isLoggedIn: boolean;
}

const FILTER_TABS: {
  id: "ALL" | NewsPostTypeValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "ALL", label: "الكل", icon: Sparkles },
  { id: "ARTICLE", label: "مقالات", icon: FileText },
  { id: "IMAGE", label: "صور", icon: ImageIcon },
  { id: "VIDEO", label: "فيديو", icon: Video },
];

export function NewsFeedClient({
  initialPosts,
  initialTotalPages,
  highlightedPostId,
  isAdmin,
  isLoggedIn,
}: NewsFeedClientProps) {
  const [posts, setPosts] = useState<NewsPostItem[]>(initialPosts);
  const [activeFilter, setActiveFilter] = useState<"ALL" | NewsPostTypeValue>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [singlePostFilter, setSinglePostFilter] = useState(highlightedPostId || "");

  const fetchPosts = async (
    filter: "ALL" | NewsPostTypeValue,
    nextPage: number,
    append: boolean,
    postId = singlePostFilter
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "10",
      });
      if (filter !== "ALL") params.set("type", filter);
      if (postId) params.set("postId", postId);

      const res = await fetch(`/api/news?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setPosts((prev) => (append ? [...prev, ...json.data.items] : json.data.items));
        setPage(nextPage);
        setTotalPages(json.data.pagination.totalPages);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter: "ALL" | NewsPostTypeValue) => {
    setActiveFilter(filter);
    setSinglePostFilter("");
    fetchPosts(filter, 1, false, "");
  };

  const handleShowAllFromDeepLink = () => {
    setSinglePostFilter("");
    setActiveFilter("ALL");
    fetchPosts("ALL", 1, false, "");
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePostPinToggled = (postId: string, nextPinned: boolean) => {
    setPosts((prev) => {
      const updated = prev.map((p) =>
        p.id === postId ? { ...p, isPinned: nextPinned } : p
      );
      return [...updated].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
  };

  return (
    <div className="min-h-screen bg-[#fdfaf5] text-stone-900 dark:bg-stone-950 dark:text-stone-100 flex flex-col transition-colors duration-300">
      {/* Hero Banner */}
      <section className="relative overflow-hidden py-12 sm:py-16 border-b border-amber-900/10 dark:border-stone-800 bg-gradient-to-b from-amber-50/90 via-[#fdfaf5] to-[#fdfaf5] dark:from-[#1b1208] dark:via-stone-950 dark:to-stone-950">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-500/25">
            <Newspaper className="w-4 h-4" />
            <span>آخر الأخبار والعروض والمقالات</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight">
            مجتمع وأخبار روز باريس
          </h1>
          <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 max-w-xl mx-auto">
            تابع أحدث تشكيلات الديكور، الدهانات، توريدات المشاريع، والعروض الخاصة من روز باريس لمواد البناء والديكور وشاركنا رأيك.
          </p>
        </div>
      </section>

      {/* Main Feed Container */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Admin Only Quick Publish Card */}
        {isAdmin && (
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18120b] border border-amber-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <PenSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-stone-900 dark:text-white">
                  مرحباً بالإدارة — أنشئ منشوراً جديداً
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  انشر صورة، فيديو، أو مقالة لتصل لجميع عملاء ومقاولي روز باريس
                </p>
              </div>
            </div>
            <Link
              href="/admin/cms"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition shadow-xs shrink-0"
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>نشر وإدارة الأخبار</span>
            </Link>
          </div>
        )}

        {/* Filter Tabs & Deep-link Reset */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {FILTER_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeFilter === tab.id && !singlePostFilter;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleFilterChange(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shrink-0 border ${
                    active
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-amber-500/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {singlePostFilter && (
            <button
              type="button"
              onClick={handleShowAllFromDeepLink}
              className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-amber-600 hover:text-white transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>عرض جميع الأخبار</span>
            </button>
          )}
        </div>

        {/* Feed Stream */}
        {loading && posts.length === 0 ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-64 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 animate-pulse"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
              لا توجد منشورات في هذا القسم حالياً
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
              ترقبوا أحدث العروض والأخبار والمشاريع الهندسية من روز باريس قريباً.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map((post) => (
              <NewsPostCard
                key={post.id}
                post={post}
                isAdmin={isAdmin}
                isLoggedIn={isLoggedIn}
                onPostDeleted={handlePostDeleted}
                onPostPinToggled={handlePostPinToggled}
              />
            ))}

            {page < totalPages && !singlePostFilter && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => fetchPosts(activeFilter, page + 1, true)}
                  className="px-6 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-50 dark:hover:bg-stone-800 transition"
                >
                  {loading ? "جاري التحميل..." : "عرض منشورات أقدم"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
