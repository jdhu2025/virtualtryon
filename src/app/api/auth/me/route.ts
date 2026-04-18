import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getSessionFromRequest } from "@/lib/server-session";
import { formatSupabaseErrorMessage } from "@/lib/supabase-error";

/**
 * 获取当前登录用户信息 API
 * 
 * 请求头:
 * Cookie: session=xxx
 * 
 * 返回:
 * {
 *   "success": true,
 *   "user": { "id": 1, "username": "xxx", "created_at": "..." }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({
        success: false,
        user: null,
        error: "未登录",
      });
    }

    const client = getSupabaseClient();
    const { data: user, error: findError } = await client
      .from("users")
      .select("id, username, created_at")
      .eq("id", session.userId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({
        success: false,
        user: null,
        error: formatSupabaseErrorMessage(
          new Error(`查询用户失败: ${findError.message}`),
          "获取用户信息失败"
        ),
      }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        user: null,
        error: "用户不存在",
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: String(user.id),
        username: user.username,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("获取用户信息错误:", error);
    return NextResponse.json({
      success: false,
      user: null,
      error: formatSupabaseErrorMessage(error, "获取用户信息失败"),
    }, { status: 500 });
  }
}
