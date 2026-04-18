import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getSessionFromRequest } from "@/lib/server-session";
import { formatSupabaseErrorMessage } from "@/lib/supabase-error";

/**
 * 获取当前登录用户
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({
        success: false,
        user: null,
      });
    }

    const client = getSupabaseClient();
    const { data: user, error } = await client
      .from("users")
      .select("id, username, created_at")
      .eq("id", session.userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({
        success: false,
        user: null,
        error: formatSupabaseErrorMessage(
          new Error(`查询会话失败: ${error.message}`),
          "获取会话失败"
        ),
      }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        user: null,
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
    console.error("获取会话失败:", error);
    return NextResponse.json({
      success: false,
      user: null,
      error: formatSupabaseErrorMessage(error, "获取会话失败"),
    });
  }
}
