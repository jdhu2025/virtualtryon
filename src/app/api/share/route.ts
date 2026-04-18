import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { resolveStoredFileUrl } from "@/storage/s3-storage";

interface ShareRequest {
  outfitId: string;
  userId?: string;
}

interface OutfitRecord {
  id: string;
  user_id: number;
  user_requirement: string;
  scene: string | null;
  recommended_style: string | null;
  reason: string | null;
  result_image_url: string | null;
  outfit_items?: Array<{
    wardrobe_items?: {
      category?: string | null;
      ai_description?: string | null;
      image_url?: string | null;
    } | null;
  }>;
}

async function loadSharePayload(outfitId: string, request: NextRequest) {
  const client = getSupabaseClient();

  const { data: outfit, error } = await client
    .from("outfit_recommendations")
    .select(`
      *,
      outfit_items (
        *,
        wardrobe_items (*)
      )
    `)
    .eq("id", outfitId)
    .maybeSingle();

  if (error) {
    throw new Error(`获取分享详情失败: ${error.message}`);
  }

  if (!outfit) {
    return null;
  }

  const typedOutfit = outfit as unknown as OutfitRecord;

  let userName = "穿搭达人";
  if (typedOutfit.user_id) {
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("nickname")
      .eq("user_id", typedOutfit.user_id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`获取用户资料失败: ${profileError.message}`);
    }

    if (profile?.nickname) {
      userName = profile.nickname;
    }
  }

  const firstItemImage = typedOutfit.outfit_items?.find(
    (item) => item.wardrobe_items?.image_url
  )?.wardrobe_items?.image_url;

  const imageUrl = typedOutfit.result_image_url
    ? await resolveStoredFileUrl(typedOutfit.result_image_url)
    : firstItemImage
      ? await resolveStoredFileUrl(firstItemImage)
      : "";

  const shareData = {
    title: `今日穿搭 | ${typedOutfit.recommended_style || "时尚搭配"}`,
    description: typedOutfit.reason || typedOutfit.user_requirement,
    imageUrl,
    userName,
    scene: typedOutfit.scene || "casual",
    items: typedOutfit.outfit_items?.map((item) => ({
      category: item.wardrobe_items?.category || "",
      description: item.wardrobe_items?.ai_description || "",
    })) || [],
  };

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  return {
    shareData,
    shareUrl: `${origin}/share/${outfitId}`,
    outfitUserId: typedOutfit.user_id,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const outfitId = searchParams.get("id");

    if (!outfitId) {
      return NextResponse.json(
        { error: "缺少穿搭方案ID" },
        { status: 400 }
      );
    }

    const payload = await loadSharePayload(outfitId, request);

    if (!payload) {
      return NextResponse.json(
        { error: "穿搭方案不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payload.shareData,
      shareUrl: payload.shareUrl,
    });
  } catch (error) {
    console.error("获取分享失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取分享内容失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { outfitId } = (await request.json()) as ShareRequest;

    if (!outfitId) {
      return NextResponse.json(
        { error: "缺少穿搭方案ID" },
        { status: 400 }
      );
    }

    const payload = await loadSharePayload(outfitId, request);

    if (!payload) {
      return NextResponse.json(
        { error: "穿搭方案不存在" },
        { status: 404 }
      );
    }

    if (payload.outfitUserId) {
      const client = getSupabaseClient();
      const { error: feedbackError } = await client.from("user_feedback").insert({
        outfit_id: outfitId,
        user_id: payload.outfitUserId,
        feedback_type: "share",
      });

      if (feedbackError) {
        console.warn("记录分享行为失败:", feedbackError.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: payload.shareData,
      shareUrl: payload.shareUrl,
    });
  } catch (error) {
    console.error("生成分享失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成分享内容失败" },
      { status: 500 }
    );
  }
}
