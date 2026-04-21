import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { resolveStoredFileUrl } from "@/storage/s3-storage";
import { getUserIdFromRequest } from "@/lib/server-session";
import { formatSupabaseErrorMessage } from "@/lib/supabase-error";

interface HistoryRecord {
  id: string;
  user_requirement: string;
  scene: string | null;
  recommended_style: string | null;
  reason: string | null;
  result_image_url: string | null;
  is_selected: number | null;
  created_at: string;
  outfit_items?: Array<{
    display_order?: number | null;
    wardrobe_items?: {
      id?: string | null;
      category?: string | null;
      color?: string | null;
      ai_description?: string | null;
      user_description?: string | null;
      image_url?: string | null;
    } | null;
  }>;
}

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
      .from("outfit_recommendations")
      .select(`
        id,
        user_requirement,
        scene,
        recommended_style,
        reason,
        result_image_url,
        is_selected,
        created_at,
        outfit_items (
          display_order,
          wardrobe_items (
            id,
            category,
            color,
            ai_description,
            user_description,
            image_url
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`获取穿搭历史失败: ${error.message}`);
    }

    const history = await Promise.all(
      ((data || []) as unknown as HistoryRecord[]).map(async (entry) => {
        const sortedItems = [...(entry.outfit_items || [])].sort(
          (left, right) => (left.display_order || 0) - (right.display_order || 0)
        );

        const items = await Promise.all(
          sortedItems
            .map((item) => item.wardrobe_items)
            .filter(Boolean)
            .map(async (item) => ({
              id: String(item?.id || ""),
              category: String(item?.category || ""),
              color: item?.color ? String(item.color) : null,
              description: item?.user_description || item?.ai_description || "",
              image_url: item?.image_url
                ? await resolveStoredFileUrl(item.image_url)
                : "",
            }))
        );

        const coverImageUrl = entry.result_image_url
          ? await resolveStoredFileUrl(entry.result_image_url)
          : items.find((item) => item.image_url)?.image_url || "";

        return {
          id: entry.id,
          user_requirement: entry.user_requirement,
          scene: entry.scene,
          recommended_style: entry.recommended_style,
          reason: entry.reason,
          result_image_url: coverImageUrl,
          is_selected: entry.is_selected || 0,
          created_at: entry.created_at,
          items,
        };
      })
    );

    return NextResponse.json({ success: true, history });
  } catch (error: unknown) {
    console.error("获取穿搭历史失败:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "获取穿搭历史失败") },
      { status: 500 }
    );
  }
}
