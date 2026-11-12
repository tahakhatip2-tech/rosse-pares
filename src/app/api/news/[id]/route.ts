import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ok, err, auditLog } from "@/lib/api";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { NewsPostType, UserRole } from "@prisma/client";
import { z } from "zod";

const updatePostSchema = z.object({
  type: z.nativeEnum(NewsPostType).optional(),
  title: z.string().trim().max(200).optional().nullable(),
  content: z.string().trim().min(1).max(10000).optional(),
  mediaUrl: z.string().trim().max(2000).optional().nullable(),
  isPinned: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const sessionUserId = session?.user?.id || "";
    const isAdmin = session?.user
      ? hasPermission(
          session.user.permissions || [],
          session.user.role as UserRole,
          PERMISSIONS.CMS_CREATE
        )
      : false;

    const post = await prisma.newsPost.findUnique({
      where: { id },
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
        },
      },
    });

    if (!post || (!post.isPublished && !isAdmin)) {
      return err("المنشور غير موجود", 404);
    }

    let likedByMe = false;
    if (sessionUserId) {
      const like = await prisma.newsLike.findUnique({
        where: { postId_visitorKey: { postId: id, visitorKey: `user:${sessionUserId}` } },
      });
      likedByMe = Boolean(like);
    }

    return ok({
      ...post,
      authorName: post.author?.employee?.nameAr || "إدارة روز باريس",
      likedByMe,
    });
  } catch (error) {
    console.error("[News GET by ID Error]:", error);
    return err("فشل جلب تفاصيل المنشور", 500);
  }
}

export const PATCH = withAuth(async (req, ctx, paramsPromise) => {
  try {
    const { id } = await paramsPromise;
    const body = await req.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      return err("بيانات التحديث غير صالحة", 400);
    }

    const existing = await prisma.newsPost.findUnique({ where: { id } });
    if (!existing) {
      return err("المنشور غير موجود", 404);
    }

    const updated = await prisma.newsPost.update({
      where: { id },
      data: parsed.data,
      include: {
        author: {
          select: {
            id: true,
            role: true,
            employee: { select: { nameAr: true } },
          },
        },
      },
    });

    await auditLog({
      userId: ctx.userId,
      action: "UPDATE",
      entity: "NewsPost",
      entityId: id,
      oldData: { isPinned: existing.isPinned, isPublished: existing.isPublished },
      newData: parsed.data,
      req,
    });

    return ok({
      ...updated,
      authorName: updated.author?.employee?.nameAr || "إدارة روز باريس",
    });
  } catch (error) {
    console.error("[News PATCH Error]:", error);
    return err("فشل تحديث المنشور", 500);
  }
}, "cms:publish");

export const DELETE = withAuth(async (req, ctx, paramsPromise) => {
  try {
    const { id } = await paramsPromise;
    const existing = await prisma.newsPost.findUnique({ where: { id } });
    if (!existing) {
      return err("المنشور غير موجود", 404);
    }

    await prisma.newsPost.delete({ where: { id } });

    await auditLog({
      userId: ctx.userId,
      action: "DELETE",
      entity: "NewsPost",
      entityId: id,
      oldData: { title: existing.title, type: existing.type },
      req,
    });

    return ok({ deleted: true, id });
  } catch (error) {
    console.error("[News DELETE Error]:", error);
    return err("فشل حذف المنشور", 500);
  }
}, "cms:delete");
