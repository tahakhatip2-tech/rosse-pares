import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ok, err } from "@/lib/api";
import { type UserRole } from "@prisma/client";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().trim().min(1, "يرجى كتابة نص التعليق").max(1500),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const comments = await prisma.newsComment.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
    });
    return ok({ items: comments });
  } catch (error) {
    console.error("[Comments GET Error]:", error);
    return err("فشل جلب التعليقات", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return err("يجب تسجيل الدخول أولاً لإضافة تعليق", 401);
    }

    const { id: postId } = await params;
    const body = await req.json();

    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "بيانات التعليق غير صالحة", 400);
    }

    const post = await prisma.newsPost.findUnique({
      where: { id: postId },
      select: { id: true, commentsCount: true },
    });

    if (!post) {
      return err("المنشور غير موجود", 404);
    }

    const isAdminReply = Boolean(
      session.user.role &&
        hasPermission(
          session.user.permissions ?? [],
          session.user.role as UserRole,
          "cms:create"
        )
    );

    const resolvedName =
      session.user.name || session.user.email || "عميل روز باريس";

    const [comment] = await Promise.all([
      prisma.newsComment.create({
        data: {
          postId,
          userId: session.user.id,
          authorName: isAdminReply ? "إدارة روز باريس" : resolvedName,
          isAdminReply,
          content: parsed.data.content,
        },
      }),
      prisma.newsPost.update({
        where: { id: postId },
        data: { commentsCount: post.commentsCount + 1 },
      }),
    ]);

    return ok({ comment, commentsCount: post.commentsCount + 1 }, 201);
  } catch (error) {
    console.error("[Comment POST Error]:", error);
    return err("فشل إضافة التعليق", 500);
  }
}
