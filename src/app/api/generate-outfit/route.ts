import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { ImageGenerationClient } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { uploadFromUrl } from "@/storage/s3-storage";
import type { WardrobeItem } from "@/storage/database/shared/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

// 穿搭推荐系统提示词
const RECOMMEND_SYSTEM_PROMPT = `你是一位专业的AI穿搭顾问。根据用户的衣柜单品和需求，推荐3套不同风格的穿搭方案。

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
        },
        {
          "category": "bottoms",
          "description": "..."
        },
        ...
      ]
    },
    {...},
    {...}
  ]
}

要求：
1. 每套方案要从衣柜中选取合适的单品组合
2. 3套方案要有明显风格差异
3. 考虑色彩搭配、风格统一、场景适配
4. 只输出JSON，不要其他内容`;

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

  return uploadFromUrl(imageUrl, "generated", userId);
}

export async function POST(request: NextRequest) {
  try {
    const { requirement, wardrobeItems, userId } = (await request.json()) as RecommendRequest;
    const effectiveUserId = String(userId || "anonymous");

    if (!wardrobeItems || wardrobeItems.length === 0) {
      return NextResponse.json(
        { error: "衣柜中没有单品，无法生成穿搭" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    const imageClient = new ImageGenerationClient(config, customHeaders);

    // 构建衣柜上下文
    let wardrobeContext = "用户衣柜中的单品：\n";
    wardrobeItems.forEach((item, index) => {
      const name = item.user_description || item.ai_description || `${item.category}`;
      wardrobeContext += `${index + 1}. [${item.category}] ${name} - ${item.color || "未知"}\n`;
    });
    wardrobeContext += `\n用户需求：${requirement}\n`;

    // 调用 LLM 生成穿搭推荐
    const messages = [
      { role: "system" as const, content: RECOMMEND_SYSTEM_PROMPT },
      { role: "user" as const, content: wardrobeContext },
    ];

    const response = await llmClient.invoke(messages, {
      model: "doubao-seed-1-6-251015",
      temperature: 0.7,
    });

    // 解析推荐结果
    let recommendations;
    try {
      const content = response.content.trim();
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      recommendations = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("解析推荐结果失败:", parseError);
      return NextResponse.json(
        { error: "生成穿搭方案失败，请重试" },
        { status: 500 }
      );
    }



    // 为每套方案生成效果图
    const results = await Promise.all(
      recommendations.results.map(async (rec: {
        style: string;
        scene: string;
        reason: string;
        items: Array<{ category: string; description: string }>;
      }) => {
        // 构建图像生成提示词
        const itemsDescription = rec.items
          .map((item) => item.description)
          .join(" + ");

        const prompt = `A fashionable full-body outfit photo showing: ${itemsDescription}. 
          Studio lighting, clean white or neutral background, front view, standing pose, 
          showing complete outfit from head to toe, high quality fashion photography, 
          natural skin tones, realistic fabric textures`;

        try {
          const imageResponse = await imageClient.generate({
            prompt,
            size: "2K",
            watermark: false,
          });

          const helper = imageClient.getResponseHelper(imageResponse);

          if (helper.success && helper.imageUrls.length > 0) {
            let imageUrl = helper.imageUrls[0];
            try {
              const permanentImageUrl = await persistGeneratedImageUrl(
                helper.imageUrls[0],
                effectiveUserId
              );
              if (permanentImageUrl) {
                imageUrl = permanentImageUrl;
              }
            } catch (uploadError) {
              console.warn("效果图上传到 R2 失败，暂时保留原始地址:", uploadError);
            }

            return {
              ...rec,
              imageUrl,
            };
          }
        } catch (imageError) {
          console.error("生成图片失败:", imageError);
        }

        // 如果图片生成失败，返回占位图
        return {
          ...rec,
          imageUrl: `/placeholder-outfit-${rec.style}.png`,
        };
      })
    );

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
    return NextResponse.json(
      { error: "生成穿搭方案失败，请稍后重试" },
      { status: 500 }
    );
  }
}
