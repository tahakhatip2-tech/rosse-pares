import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { CmsNewsManager } from "@/components/admin/CmsNewsManager";
import { NewsPostItem } from "@/components/news/NewsPostCard";

export const dynamic = "force-dynamic";

export default async function AdminCmsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/cms");
  }

  const perms = session.user.permissions || [];
  const role = session.user.role as UserRole;
  if (!hasPermission(perms, role, PERMISSIONS.CMS_CREATE)) {
    redirect("/unauthorized");
  }

  const posts = await prisma.newsPost.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 60,
    include: {
      author: {
        select: {
          employee: { select: { nameAr: true } },
        },
      },
    },
  });

  const initialPosts: NewsPostItem[] = posts.map((post) => ({
    id: post.id,
    type: post.type,
    title: post.title,
    content: post.content,
    mediaUrl: post.mediaUrl,
    isPinned: post.isPinned,
    isPublished: post.isPublished,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    sharesCount: post.sharesCount,
    createdAt: post.createdAt.toISOString(),
    authorName: post.author?.employee?.nameAr || "إدارة روز باريس",
  }));

  return (
    <CmsNewsManager
      initialPosts={initialPosts}
      authorName={session.user.name || "إدارة روز باريس"}
      canPublish={hasPermission(perms, role, PERMISSIONS.CMS_PUBLISH)}
      canDelete={hasPermission(perms, role, PERMISSIONS.CMS_DELETE)}
    />
  );
}

