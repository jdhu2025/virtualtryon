import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { clearUserStorage } from "@/storage/s3-storage";
import { getUserIdFromRequest } from "@/lib/server-session";

/**
 * 清除用户数据的 API
 * 
 * 请求体（可选）:
 * {
 *   "userId": 1  // 如果不传，自动从 Cookie 中获取
 * }
 * 
 * 返回:
 * {
 *   "success": true,
 *   "message": "用户数据已清除"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const client = getSupabaseClient();

    // 清除该用户的所有衣柜单品
    const { error: wardrobeError } = await client
      .from("wardrobe_items")
      .delete()
      .eq("user_id", userId);

    if (wardrobeError) {
      console.error("清除衣柜数据失败:", wardrobeError);
      // 不抛出错误，继续清除其他数据
    }

    // 清除该用户的所有穿搭推荐
    const { error: outfitError } = await client
      .from("outfit_recommendations")
      .delete()
      .eq("user_id", userId);

    if (outfitError) {
      console.error("清除穿搭推荐数据失败:", outfitError);
    }

    // 清除该用户的所有用户反馈
    const { error: feedbackError } = await client
      .from("user_feedback")
      .delete()
      .eq("user_id", userId);

    if (feedbackError) {
      console.error("清除用户反馈数据失败:", feedbackError);
    }

    const { error: profileError } = await client
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    if (profileError) {
      console.error("清除资料数据失败:", profileError);
    }

    try {
      await clearUserStorage(String(userId));
    } catch (storageError) {
      console.error("清除存储数据失败:", storageError);
    }

    return NextResponse.json({
      success: true,
      message: "用户数据已清除",
      userId: userId,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "清除数据失败";
    console.error("清除数据错误:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 获取清理指令（供前端调用 IndexedDB）
 */
export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);

  return NextResponse.json({
    action: "clearUserData",
    userId: userId,
    instruction: "前端应清除本地缓存中的用户状态"
  });
}
