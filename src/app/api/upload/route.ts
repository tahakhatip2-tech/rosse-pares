import crypto from "crypto";
import { withAuth, ok, err, type ApiContext } from "@/lib/api";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const ALLOWED_FOLDERS: Record<string, string> = {
  news: "rozeparees/news",
  products: "rozeparees/products",
  categories: "rozeparees/categories",
};

function resolveUploadFolder(raw?: string | null) {
  if (raw && raw in ALLOWED_FOLDERS) {
    return ALLOWED_FOLDERS[raw];
  }
  return ALLOWED_FOLDERS.news;
}

function canUserUpload(ctx: ApiContext) {
  return (
    hasPermission(ctx.permissions, ctx.role, PERMISSIONS.CMS_CREATE) ||
    hasPermission(ctx.permissions, ctx.role, PERMISSIONS.PRODUCTS_CREATE) ||
    hasPermission(ctx.permissions, ctx.role, PERMISSIONS.PRODUCTS_UPDATE)
  );
}

function cleanEnvValue(value?: string) {
  return value?.trim().replace(/^["']|["']$/g, "") || "";
}

function getCloudinaryConfig() {
  const cloudName = cleanEnvValue(process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = cleanEnvValue(process.env.CLOUDINARY_API_KEY);
  const apiSecret = cleanEnvValue(process.env.CLOUDINARY_API_SECRET);

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

function validateCloudinarySecret(apiSecret: string) {
  if (apiSecret.includes("*") || apiSecret.length < 10) {
    return "قيمة CLOUDINARY_API_SECRET في Vercel غير صالحة أو ما زالت تحتوي على نجوم (***). يرجى كشف السر الحقيقي في Cloudinary عبر أيقونة العين ونسخه بدون مسافات أو علامات اقتباس ثم عمل Redeploy.";
  }
  return null;
}

function buildUploadSignature(apiSecret: string, timestamp: string, folder: string) {
  const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  return crypto.createHash("sha1").update(signaturePayload).digest("hex");
}

/**
 * Generates a short-lived Cloudinary signed upload payload so images and large videos
 * can be uploaded directly from the admin's device without hitting Vercel's 4.5 MB body limit.
 */
export const GET = withAuth(async (req, ctx) => {
  try {
    if (!canUserUpload(ctx)) {
      return err("ليس لديك صلاحية رفع الملفات", 403);
    }

    const config = getCloudinaryConfig();
    if (!config) {
      return err(
        "خدمة رفع الوسائط (Cloudinary) غير مفعلة بعد. أضف المتغيرات CLOUDINARY_CLOUD_NAME و CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET في إعدادات Vercel ثم أعد النشر.",
        400
      );
    }

    const secretError = validateCloudinarySecret(config.apiSecret);
    if (secretError) {
      return err(secretError, 400);
    }

    const folder = resolveUploadFolder(req.nextUrl.searchParams.get("folder"));
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = buildUploadSignature(config.apiSecret, timestamp, folder);

    return ok({
      cloudName: config.cloudName,
      apiKey: config.apiKey,
      timestamp,
      folder,
      signature,
    });
  } catch (error) {
    console.error("[Upload Signature GET Error]:", error);
    return err("تعذر تجهيز توقيع الرفع السحابي", 500);
  }
});

export const POST = withAuth(async (req, ctx) => {
  try {
    if (!canUserUpload(ctx)) {
      return err("ليس لديك صلاحية رفع الملفات", 403);
    }

    const config = getCloudinaryConfig();

    if (!config) {
      return err(
        "خدمة رفع الوسائط (Cloudinary) غير مفعلة بعد. أضف المتغيرات CLOUDINARY_CLOUD_NAME و CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET في إعدادات Vercel ثم أعد النشر.",
        400
      );
    }

    const secretError = validateCloudinarySecret(config.apiSecret);
    if (secretError) {
      return err(secretError, 400);
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return err("يرجى اختيار ملف صورة أو فيديو للرفع من الجهاز", 400);
    }

    const maxBytes = 100 * 1024 * 1024; // 100 MB
    if (file.size > maxBytes) {
      return err("حجم الملف يتجاوز الحد المسموح (100 ميجابايت)", 400);
    }

    const folder = resolveUploadFolder(req.nextUrl.searchParams.get("folder"));
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = buildUploadSignature(config.apiSecret, timestamp, folder);

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("api_key", config.apiKey);
    uploadData.append("timestamp", timestamp);
    uploadData.append("folder", folder);
    uploadData.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`,
      {
        method: "POST",
        body: uploadData,
      }
    );

    const json = await res.json();

    if (!res.ok) {
      console.error("[Cloudinary Error]:", json);
      return err(json?.error?.message || "فشل رفع الملف إلى Cloudinary", 500);
    }

    return ok({
      url: json.secure_url as string,
      resourceType: json.resource_type as string,
      publicId: json.public_id as string,
    });
  } catch (error) {
    console.error("[Upload POST Error]:", error);
    return err("حدث خطأ أثناء رفع الملف", 500);
  }
});
