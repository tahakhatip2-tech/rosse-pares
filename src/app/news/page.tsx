import type { Metadata } from "next";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { NewsFeedClient } from "@/components/news/NewsFeedClient";
import { type NewsPostItem } from "@/components/news/NewsPostCard";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { type UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "آخر الأخبار والمجتمع",
  description:
    "تابع أحدث عروض وأخبار ومقالات روز باريس لمواد البناء والديكور وشاركنا تعليقاتك وإعجابك.",
};

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  const { post: highlightedPostId } = await searchParams;
  const session = await auth();

  const isLoggedIn = Boolean(session?.user?.id);
  const isAdmin = Boolean(
    session?.user?.role &&
      hasPermission(
        session.user.permissions ?? [],
        session.user.role as UserRole,
        "cms:create"
      )
  );

  const where = {
    isPublished: true,
    ...(highlightedPostId ? { id: highlightedPostId } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.newsPost.findMany({
      where,
      take: 10,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        author: {
          select: {
            employee: { select: { nameAr: true } },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    }),
    prisma.newsPost.count({ where }),
  ]);

  let likedPostIds = new Set<string>();
  if (session?.user?.id && posts.length > 0) {
    const likes = await prisma.newsLike.findMany({
      where: {
        visitorKey: `user:${session.user.id}`,
        postId: { in: posts.map((p) => p.id) },
      },
      select: { postId: true },
    });
    likedPostIds = new Set(likes.map((l) => l.postId));
  }

  const serialized: NewsPostItem[] = posts.map((p) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    content: p.content,
    mediaUrl: p.mediaUrl,
    isPinned: p.isPinned,
    isPublished: p.isPublished,
    likesCount: p.likesCount,
    commentsCount: p.commentsCount,
    sharesCount: p.sharesCount,
    createdAt: p.createdAt.toISOString(),
    authorName: p.author?.employee?.nameAr || "إدارة روز باريس",
    likedByMe: likedPostIds.has(p.id),
    comments: p.comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      authorName: c.authorName,
      isAdminReply: c.isAdminReply,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfaf5] dark:bg-stone-950">
      <Navbar />
      <NewsFeedClient
        initialPosts={serialized}
        initialTotalPages={Math.max(1, Math.ceil(total / 10))}
        highlightedPostId={highlightedPostId}
        isAdmin={isAdmin}
        isLoggedIn={isLoggedIn}
      />
      <Footer />
    </div>
  );
}
