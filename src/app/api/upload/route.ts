import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl, uploadFileGetKey } from "@/storage/s3-storage";
import { getSessionFromRequest } from "@/lib/server-session";
import { formatStorageErrorMessage } from "@/lib/supabase-error";
import { t } from "@/lib/locale";
import { getLocaleFromRequest } from "@/lib/locale-server";
import { requireTurnstile } from "@/lib/turnstile";

/**
 * 图片上传 API
 * 
 * 请求体:
 * {
 *   "image": "data:image/jpeg;base64,xxxx",  // Base64 图片数据
 *   "category": "avatars" | "wardrobe" | "generated",  // 图片类别
 *   "userId": "user-123"  // 用户 ID
 * }
 * 
 * 返回:
 * {
 *   "success": true,
 *   "url": "https://...",  // 永久公开 URL
 *   "key": "avatars/user-123/xxx.jpg"  // 存储 key
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const locale = getLocaleFromRequest(request);
    const turnstileResponse = await requireTurnstile(request);
    if (turnstileResponse) {
      return turnstileResponse;
    }

    const body = await request.json();
    const session = getSessionFromRequest(request);
    const { image, category = "wardrobe", userId } = body;
    const effectiveUserId = String(userId || session?.userId || "anonymous");
    
    if (!image) {
      return NextResponse.json(
        { error: t(locale, "Missing image data.", "缺少图片数据") },
        { status: 400 }
      );
    }
    
    // 验证 category
    if (!["avatars", "wardrobe", "generated"].includes(category)) {
      return NextResponse.json(
        { error: t(locale, "Invalid image category.", "无效的图片类别") },
        { status: 400 }
      );
    }
    
    // 上传图片到 R2，返回对象 key 与永久公开 URL
    const key = await uploadFileGetKey(image, category, effectiveUserId);
    const url = await getSignedUrl(key);
    
    return NextResponse.json({
      success: true,
      url: url,
      key,
    });
    
  } catch (error: unknown) {
    console.error("图片上传失败:", error);
    const locale = getLocaleFromRequest(request);
    return NextResponse.json(
      {
        error:
          t(locale, "Image upload failed: ", "图片上传失败: ") +
          formatStorageErrorMessage(error, t(locale, "Unknown error", "未知错误")),
      },
      { status: 500 }
    );
  }
}

// 限制请求体大小为 10MB
export const runtime = "nodejs";
export const maxDuration = 60;
