import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { formatSupabaseErrorMessage } from "@/lib/supabase-error";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/server-session";

/**
 * 用户注册 API（localStorage 版本）
 * 
 * 请求体:
 * {
 *   "username": "用户名",
 *   "password": "密码",
 *   "agreePrivacy": true
 * }
 * 
 * 返回:
 * {
 *   "success": true,
 *   "user": { "id": "xxx", "username": "xxx", "createdAt": "..." }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, agreePrivacy } = body;

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 验证隐私政策
    if (!agreePrivacy) {
      return NextResponse.json(
        { error: "请阅读并同意隐私政策" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: "用户名需为3-20位字母、数字或下划线" },
        { status: 400 }
      );
    }

    if (password.length < 6 || password.length > 20) {
      return NextResponse.json(
        { error: "密码需为6-20位" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    const { data: existingUser, error: existingUserError } = await client
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUserError) {
      throw new Error(`查询用户失败: ${existingUserError.message}`);
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { data: user, error: insertUserError } = await client
      .from("users")
      .insert({
        username,
        password: passwordHash,
      })
      .select("id, username, created_at")
      .single();

    if (insertUserError || !user) {
      throw new Error(`创建用户失败: ${insertUserError?.message || "未知错误"}`);
    }

    const { error: profileError } = await client.from("profiles").insert({
      user_id: user.id,
      nickname: user.username,
    });

    if (profileError) {
      console.warn("创建默认资料失败:", profileError.message);
    }

    const sessionToken = createSessionToken(user.id, user.username);
    const response = NextResponse.json({
      success: true,
      user: {
        id: String(user.id),
        username: user.username,
        created_at: user.created_at,
      },
      token: sessionToken,
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("注册错误:", error);
    return NextResponse.json(
      { error: formatSupabaseErrorMessage(error, "注册失败，请稍后重试") },
      { status: 500 }
    );
  }
}
