import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { deleteFile, resolveStoredFileUrl } from "@/storage/s3-storage";
import { getUserIdFromRequest } from "@/lib/server-session";
import { formatSupabaseErrorMessage } from "@/lib/supabase-error";

function getErrorMessage(error: unknown, fallback: string): string {
  return formatSupabaseErrorMessage(error, fallback);
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`获取人像失败: ${error.message}`);
    }

    const portraits = await Promise.all(
      (data || [])
        .filter((item) => item.avatar_url)
        .map(async (item) => ({
          ...item,
          user_id: String(item.user_id),
          avatar_url: await resolveStoredFileUrl(item.avatar_url),
        }))
    );

    return NextResponse.json({ success: true, portraits });
  } catch (error: unknown) {
    console.error("获取人像失败:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "获取人像失败") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const avatarPath = body.avatarPath || body.avatar_url;
    const nickname = body.nickname || `人像 ${Date.now()}`;

    if (!avatarPath) {
      return NextResponse.json({ error: "缺少人像路径" }, { status: 400 });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from("profiles")
      .insert({
        user_id: userId,
        avatar_url: String(avatarPath),
        nickname: String(nickname),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`保存人像失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      portrait: {
        ...data,
        user_id: String(data.user_id),
        avatar_url: await resolveStoredFileUrl(data.avatar_url),
      },
    });
  } catch (error: unknown) {
    console.error("保存人像失败:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "保存人像失败") },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少人像 ID" }, { status: 400 });
    }

    const client = getSupabaseClient();
    const { data: portrait, error: findError } = await client
      .from("profiles")
      .select("id, avatar_url")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (findError) {
      throw new Error(`查询人像失败: ${findError.message}`);
    }

    if (!portrait) {
      return NextResponse.json({ error: "人像不存在" }, { status: 404 });
    }

    const { error: deleteError } = await client
      .from("profiles")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      throw new Error(`删除人像失败: ${deleteError.message}`);
    }

    try {
      await deleteFile(portrait.avatar_url);
    } catch (storageError) {
      console.warn("删除人像图片失败:", storageError);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("删除人像失败:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "删除人像失败") },
      { status: 500 }
    );
  }
}
