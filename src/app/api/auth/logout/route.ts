import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/server-session";

/**
 * 退出登录
 */
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "已退出登录",
  });

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
