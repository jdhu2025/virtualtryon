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
      .from("wardrobe_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`获取衣柜失败: ${error.message}`);
    }

    const items = await Promise.all(
      (data || []).map(async (item) => ({
        ...item,
        user_id: String(item.user_id),
        image_url: await resolveStoredFileUrl(item.image_url),
      }))
    );

    return NextResponse.json({ success: true, items });
  } catch (error: unknown) {
    console.error("获取衣柜失败:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "获取衣柜失败") },
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
    const {
      imagePath,
      category,
      color,
      style_tags,
      season,
      ai_description,
      user_description,
    } = body;

    if (!imagePath) {
      return NextResponse.json({ error: "缺少图片路径" }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "请选择衣服类别" }, { status: 400 });
    }

    const client = getSupabaseClient();
    const payload = {
      user_id: userId,
      image_url: String(imagePath),
      category: String(category),
      color: String(color || "gray"),
      style_tags: Array.isArray(style_tags) && style_tags.length > 0 ? style_tags : [],
      season: String(season || "all"),
      ai_description: ai_description ? String(ai_description) : null,
      user_description: user_description ? String(user_description) : null,
    };

    const { data, error } = await client
      .from("wardrobe_items")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`保存衣服失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      item: {
        ...data,
        user_id: String(data.user_id),
        image_url: await resolveStoredFileUrl(data.image_url),
      },
    });
  } catch (error: unknown) {
    console.error("保存衣服失败:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "保存衣服失败") },
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
      return NextResponse.json({ error: "缺少衣服 ID" }, { status: 400 });
    }

    const client = getSupabaseClient();
    const { data: item, error: findError } = await client
      .from("wardrobe_items")
      .select("id, image_url")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (findError) {
      throw new Error(`查询衣服失败: ${findError.message}`);
    }

    if (!item) {
      return NextResponse.json({ error: "衣服不存在" }, { status: 404 });
    }

    const { error: deleteError } = await client
      .from("wardrobe_items")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      throw new Error(`删除衣服失败: ${deleteError.message}`);
    }

    try {
      await deleteFile(item.image_url);
    } catch (storageError) {
      console.warn("删除衣服图片失败:", storageError);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("删除衣服失败:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "删除衣服失败") },
      { status: 500 }
    );
  }
}
