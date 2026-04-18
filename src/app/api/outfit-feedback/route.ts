import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getUserIdFromRequest } from "@/lib/server-session";

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { outfitId, feedbackType } = await request.json();

    if (!outfitId) {
      return NextResponse.json({ error: "缺少穿搭方案 ID" }, { status: 400 });
    }

    if (!["like", "dislike", "not_today"].includes(String(feedbackType))) {
      return NextResponse.json({ error: "无效的反馈类型" }, { status: 400 });
    }

    const client = getSupabaseClient();
    const { error } = await client.from("user_feedback").insert({
      outfit_id: String(outfitId),
      user_id: userId,
      feedback_type: String(feedbackType),
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("保存反馈失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存反馈失败" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
