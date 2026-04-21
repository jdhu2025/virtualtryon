import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { formatSupabaseErrorMessage } from "@/lib/supabase-error";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/server-session";
import { t } from "@/lib/locale";
import { getLocaleFromRequest } from "@/lib/locale-server";

/**
 * 用户登录 API
 * 
 * 请求体:
 * {
 *   "username": "用户名",
 *   "password": "密码"
 * }
 * 
 * 返回:
 * {
 *   "success": true,
 *   "user": { "id": 1, "username": "xxx" },
 *   "token": "session-token"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const locale = getLocaleFromRequest(request);
    const body = await request.json();
    const { username, password } = body;

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json(
        {
          error: t(
            locale,
            "Username and password are required.",
            "用户名和密码不能为空"
          ),
        },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 根据用户名查找用户
    const { data: user, error: findError } = await client
      .from("users")
      .select("id, username, password, created_at")
      .eq("username", username)
      .maybeSingle();

    if (findError) {
      throw new Error(`查询用户失败: ${findError.message}`);
    }

    if (!user) {
      return NextResponse.json(
        {
          error: t(
            locale,
            "Incorrect username or password.",
            "用户名或密码错误"
          ),
        },
        { status: 401 }
      );
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: t(
            locale,
            "Incorrect username or password.",
            "用户名或密码错误"
          ),
        },
        { status: 401 }
      );
    }

    // 生成会话 token（使用用户ID和时间戳的哈希）
    const sessionToken = createSessionToken(user.id, user.username);

    // 创建响应
    const response = NextResponse.json({
      success: true,
      user: {
        id: String(user.id),
        username: user.username,
        created_at: user.created_at,
      },
      token: sessionToken,
    });

    // 设置 HTTP-only Cookie（7天有效期）
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("登录错误:", error);
    const locale = getLocaleFromRequest(request);
    return NextResponse.json(
      {
        error: formatSupabaseErrorMessage(
          error,
          t(locale, "Login failed. Please try again later.", "登录失败，请稍后重试")
        ),
      },
      { status: 500 }
    );
  }
}
