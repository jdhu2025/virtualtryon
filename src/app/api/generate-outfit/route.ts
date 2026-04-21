import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { uploadFromUrl, uploadImageFromBase64 } from "@/storage/s3-storage";
import type { WardrobeItem } from "@/storage/database/shared/schema";
import { generateGeneralImage } from "@/lib/ai/general-image";
import { parseJsonBlock } from "@/lib/ai/json";
import { invokeTextVision, type AiMessage } from "@/lib/ai/text-vision";
import { t } from "@/lib/locale";
import { getLocaleFromRequest } from "@/lib/locale-server";
import { requireTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const maxDuration = 180;

function getRecommendSystemPrompt(locale: ReturnType<typeof getLocaleFromRequest>) {
  if (locale === "zh") {
    return `你是一位专业的AI穿搭顾问。根据用户的衣柜单品和需求，推荐3套不同风格的穿搭方案。

请以JSON格式输出推荐结果：
{
  "results": [
    {
      "style": "穿搭风格名称（如：简约干练、优雅约会、休闲日常）",
      "scene": "适合场景（meeting/date/casual/party/travel/work）",
      "reason": "推荐理由（为什么这套搭配好看，20字以内）",
      "items": [
        {
          "category": "tops",
          "description": "这件衣服的特点描述，用于生成效果图"
        }
      ]
    }
  ]
}

要求：
1. 每套方案要从衣柜中选取合适的单品组合
2. 3套方案要有明显风格差异
3. 考虑色彩搭配、风格统一、场景适配
4. 只输出JSON，不要其他内容`;
  }

  return `You are a professional AI stylist. Based on the wardrobe items and the user's need, recommend 3 clearly different outfits.

Return JSON:
{
  "results": [
    {
      "style": "A short English style name",
      "scene": "One of meeting/date/casual/party/travel/work",
      "reason": "Short English reason under 12 words",
      "items": [
        {
          "category": "tops",
          "description": "English garment description for image generation"
        }
      ]
    }
  ]
}

Requirements:
1. Use only the wardrobe items provided
2. Make the 3 options noticeably different
3. Consider color balance, styling coherence, and scenario fit
4. Return JSON only`;
}

interface RecommendRequest {
  requirement: string;
  wardrobeItems: WardrobeItem[];
  userId?: string;
}

async function persistGeneratedImageUrl(
  imageUrl: string | null | undefined,
  userId: string
): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }

  if (imageUrl.startsWith("/")) {
    return imageUrl;
  }

  const publicUrlBase = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/+$/, "");
  if (publicUrlBase && imageUrl.startsWith(`${publicUrlBase}/`)) {
    return imageUrl;
  }

  if (imageUrl.startsWith("data:")) {
    return uploadImageFromBase64(imageUrl, "generated", userId);
  }

  return uploadFromUrl(imageUrl, "generated", userId);
}

function normalizeRecommendationResults(
  input: unknown
): Array<{
  style: string;
  scene: string;
  reason: string;
  items: Array<{ category: string; description: string }>;
}> {
  const rawResults =
    typeof input === "object" &&
    input !== null &&
    "results" in input &&
    Array.isArray((input as { results?: unknown[] }).results)
      ? (input as { results: unknown[] }).results
      : [];

  return rawResults
    .map((entry) => {
      const value = entry as {
        style?: unknown;
        scene?: unknown;
        reason?: unknown;
        items?: Array<{ category?: unknown; description?: unknown }> | unknown;
      };

      const items = Array.isArray(value.items)
        ? value.items
            .map((item) => ({
              category: String(item?.category || "").trim(),
              description: String(item?.description || "").trim(),
            }))
            .filter((item) => item.category && item.description)
        : [];

      return {
        style: String(value.style || "").trim(),
        scene: String(value.scene || "").trim(),
        reason: String(value.reason || "").trim(),
        items,
      };
    })
    .filter((entry) => entry.style && entry.scene && entry.reason && entry.items.length > 0)
    .slice(0, 3);
}

export async function POST(request: NextRequest) {
  try {
    const locale = getLocaleFromRequest(request);
    const turnstileResponse = await requireTurnstile(request);
    if (turnstileResponse) {
      return turnstileResponse;
    }

    const { requirement, wardrobeItems, userId } = (await request.json()) as RecommendRequest;
    const effectiveUserId = String(userId || "anonymous");

    if (!wardrobeItems || wardrobeItems.length === 0) {
      return NextResponse.json(
        {
          error: t(
            locale,
            "There are no wardrobe items to build an outfit from.",
            "衣柜中没有单品，无法生成穿搭"
          ),
        },
        { status: 400 }
      );
    }

    // 构建衣柜上下文
    let wardrobeContext = t(locale, "Wardrobe items:\n", "用户衣柜中的单品：\n");
    wardrobeItems.forEach((item, index) => {
      const name = item.user_description || item.ai_description || `${item.category}`;
      wardrobeContext += `${index + 1}. [${item.category}] ${name} - ${
        item.color || t(locale, "unknown", "未知")
      }\n`;
    });
    wardrobeContext += `\n${t(locale, "User requirement", "用户需求")}：${requirement}\n`;

    // 调用 LLM 生成穿搭推荐
    const messages: AiMessage[] = [
      { role: "system", content: getRecommendSystemPrompt(locale) },
      { role: "user", content: wardrobeContext },
    ];

    const response = await invokeTextVision({
      requestHeaders: request.headers,
      messages,
      temperature: 0.7,
    });

    // 解析推荐结果
    let recommendations: Array<{
      style: string;
      scene: string;
      reason: string;
      items: Array<{ category: string; description: string }>;
    }>;
    try {
      const content = response.content.trim();
      recommendations = normalizeRecommendationResults(
        parseJsonBlock<{
          results: Array<{
            style: string;
            scene: string;
            reason: string;
            items: Array<{ category: string; description: string }>;
          }>;
        }>(content)
      );

      if (recommendations.length === 0) {
        throw new Error("AI 未返回有效的穿搭方案");
      }
    } catch (parseError) {
      console.error("解析推荐结果失败:", parseError);
      return NextResponse.json(
        {
          error: t(
            locale,
            "Unable to generate outfit ideas. Please try again.",
            "生成穿搭方案失败，请重试"
          ),
        },
        { status: 500 }
      );
    }
    // 为每套方案生成效果图
    const results: Array<{
      style: string;
      scene: string;
      reason: string;
      items: Array<{ category: string; description: string }>;
      imageUrl: string | null;
      generationMethod?: string;
      generationError?: string;
    }> = [];

    for (const rec of recommendations) {
      let result: {
        style: string;
        scene: string;
        reason: string;
        items: Array<{ category: string; description: string }>;
        imageUrl: string | null;
        generationMethod?: string;
        generationError?: string;
      };

      const itemsDescription = rec.items
        .map((item) => item.description)
        .join(" + ");

      const prompt = `A fashionable full-body outfit photo showing: ${itemsDescription}. 
          Studio lighting, clean white or neutral background, front view, standing pose, 
          showing complete outfit from head to toe, high quality fashion photography, 
          natural skin tones, realistic fabric textures`;

      try {
        const imageResponse = await generateGeneralImage({
          requestHeaders: request.headers,
          prompt,
          size: "2K",
          watermark: false,
        });

        if (imageResponse.imageUrl) {
          let imageUrl = imageResponse.imageUrl;
          try {
            const permanentImageUrl = await persistGeneratedImageUrl(
              imageResponse.imageUrl,
              effectiveUserId
            );
            if (permanentImageUrl) {
              imageUrl = permanentImageUrl;
            }
          } catch (uploadError) {
            console.warn("效果图上传到 R2 失败，暂时保留原始地址:", uploadError);
          }

          result = {
            ...rec,
            imageUrl,
            generationMethod: imageResponse.provider,
          };
        } else {
          result = {
            ...rec,
            imageUrl: null,
            generationMethod: imageResponse.provider,
            generationError: imageResponse.error || "图像服务未返回结果",
          };
        }
      } catch (imageError) {
        console.error("生成图片失败:", imageError);
        result = {
          ...rec,
          imageUrl: null,
          generationError:
            imageError instanceof Error ? imageError.message : "图像生成失败",
        };
      }

      results.push(result);
    }

    // 保存推荐记录到数据库
    if (userId) {
      const client = getSupabaseClient();

      for (let i = 0; i < results.length; i++) {
        const rec = results[i];

        // 保存推荐记录
        const { data: outfit } = await client
          .from("outfit_recommendations")
          .insert({
            user_id: userId,
            user_requirement: requirement,
            scene: rec.scene,
            recommended_style: rec.style,
            reason: rec.reason,
            result_image_url: rec.imageUrl?.startsWith("/") ? null : rec.imageUrl,
            is_selected: i === 0 ? 1 : 0,
          })
          .select()
          .single();

        if (outfit) {
          // 保存关联的单品
          const outfitItems = wardrobeItems
            .filter((item) => rec.items.some((r: { category: string }) => r.category === item.category))
            .map((item, index) => ({
              outfit_id: outfit.id,
              item_id: item.id,
              display_order: index,
            }));

          if (outfitItems.length > 0) {
            await client.from("outfit_items").insert(outfitItems);
          }
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("生成穿搭失败:", error);
    const locale = getLocaleFromRequest(request);
    return NextResponse.json(
      {
        error: t(
          locale,
          "Unable to generate outfits right now. Please try again later.",
          "生成穿搭方案失败，请稍后重试"
        ),
      },
      { status: 500 }
    );
  }
}
