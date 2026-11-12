import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { withAuth, ok, err, getPagination, auditLog } from "@/lib/api";
import { NewsPostType, type UserRole } from "@prisma/client";
import { z } from "zod";

const createPostSchema = z.object({
  type: z.nativeEnum(NewsPostType).default(NewsPostType.TEXT),
  title: z.string().trim().max(200).optional().nullable(),
  content: z.string().trim().min(1, "محتوى المنشور مطلوب").max(10000),
  mediaUrl: z.string().trim().max(2000).optional().nullable(),
  isPinned: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const typeParam = searchParams.get("type");
    const includeUnpublished = searchParams.get("all") === "true";
    const postId = searchParams.get("postId")?.trim() || "";
    const { page, limit, skip } = getPagination(req);

    const session = await auth();
    const visitorKey = session?.user?.id ? `user:${session.user.id}` : "";

    let isAdmin = false;
    if (includeUnpublished && session?.user?.role) {
      isAdmin = hasPermission(
        session.user.permissions ?? [],
        session.user.role as UserRole,
        "cms:view"
      );
    }

    const where: Record<string, unknown> = {};
    if (!isAdmin) {
      where.isPublished = true;
    }
    if (typeParam && typeParam !== "ALL" && Object.values(NewsPostType).includes(typeParam as NewsPostType)) {
      where.type = typeParam as NewsPostType;
    }
    if (postId) {
      where.id = postId;
    }

    const [posts, total] = await Promise.all([
      prisma.newsPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: {
          author: {
            select: {
              id: true,
              role: true,
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
    if (visitorKey && posts.length > 0) {
      const likes = await prisma.newsLike.findMany({
        where: {
          visitorKey,
          postId: { in: posts.map((p) => p.id) },
        },
        select: { postId: true },
      });
      likedPostIds = new Set(likes.map((l) => l.postId));
    }

    const enriched = posts.map((p) => ({
      ...p,
      authorName: p.author?.employee?.nameAr || "إدارة روز باريس",
      likedByMe: likedPostIds.has(p.id),
    }));

    return ok({
      items: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[News GET Error]:", error);
    return err("فشل جلب الأخبار والمنشورات", 500);
  }
}

export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "بيانات المنشور غير صالحة";
      return err(firstError, 400);
    }

    const { type, title, content, mediaUrl, isPinned, isPublished } = parsed.data;

    if ((type === "IMAGE" || type === "VIDEO") && !mediaUrl) {
      return err("يرجى إرفاق رابط الصورة أو الفيديو أو رفعه", 400);
    }

    const post = await prisma.newsPost.create({
      data: {
        authorId: ctx.userId,
        type,
        title: title || null,
        content,
        mediaUrl: mediaUrl || null,
        isPinned,
        isPublished,
      },
      include: {
        author: {
          select: {
            id: true,
            role: true,
            employee: { select: { nameAr: true } },
          },
        },
        comments: true,
      },
    });

    await auditLog({
      userId: ctx.userId,
      action: "CREATE",
      entity: "NewsPost",
      entityId: post.id,
      newData: { type, title, isPinned, isPublished },
      req,
    });

    return ok(
      {
        ...post,
        authorName: post.author?.employee?.nameAr || "إدارة روز باريس",
        likedByMe: false,
      },
      201
    );
  } catch (error) {
    console.error("[News POST Error]:", error);
    return err("فشل نشر الخبر", 500);
  }
}, "cms:create");
