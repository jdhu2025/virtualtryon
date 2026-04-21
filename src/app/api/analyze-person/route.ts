import { NextRequest, NextResponse } from "next/server";
import { parseJsonBlock } from "@/lib/ai/json";
import { invokeTextVision, type AiMessage } from "@/lib/ai/text-vision";
import { t } from "@/lib/locale";
import { getLocaleFromRequest } from "@/lib/locale-server";
import { requireTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseDelimitedValues(value: string | string[] | undefined, limit: number): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, limit);
  }

  return value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function getAnalyzeSystemPrompt(locale: ReturnType<typeof getLocaleFromRequest>) {
  if (locale === "zh") {
    return `你是一个专业的形象顾问。请分析用户上传的人像照片，评估其形象特征和最适合的穿搭风格。

请返回以下 JSON 格式（所有字段都必须填写）：

{
  "skin_tone": "肤色类型：fair(白皙), medium(中等), tan(健康小麦), deep(深肤色)",
  "body_shape": "体型特征：slim(偏瘦), athletic(运动型), average(标准), curvy(曲线), pear(梨形), apple(苹果型)",
  "height": "身高估计：tall(高挑), medium(中等), petite(小巧)",
  "features": "面部特征，逗号分隔，如：精致、亲和、成熟、青春、清冷、温暖等",
  "best_styles": "最适合的风格，逗号分隔，从中选择2-4个：casual(休闲), formal(正式), elegant(优雅), sporty(运动), chic(时尚), feminine(女性化), edgy(酷感), minimalist(简约), vintage(复古), bohemian(波西米亚)",
  "best_scenes": "最适合的场景，逗号分隔，从中选择2-4个：meeting(正式会议), date(约会), party(派对), office(日常办公), outdoor(户外), travel(旅行), casual(日常休闲), evening(晚宴)",
  "best_colors": "最适合的颜色，逗号分隔，从中选择3-5个：red, blue, black, white, gray, beige, green, pink, purple, yellow, orange, brown, navy, khaki",
  "avoid_colors": "需要谨慎使用的颜色，逗号分隔，如：容易显黑或显胖的颜色",
  "outfit_suggestions": "穿搭建议，中文，30字以内",
  "personality_vibe": "整体气质描述，中文，20字以内"
}

请只返回 JSON，不要添加任何解释。`;
  }

  return `You are a professional image consultant. Analyze the uploaded portrait and return structured styling guidance.

Return JSON only with every field filled:

{
  "skin_tone": "One of: fair, medium, tan, deep",
  "body_shape": "One of: slim, athletic, average, curvy, pear, apple",
  "height": "One of: tall, medium, petite",
  "features": "Comma-separated facial or overall traits",
  "best_styles": "Comma-separated list with 2-4 values from: casual, formal, elegant, sporty, chic, feminine, edgy, minimalist, vintage, bohemian",
  "best_scenes": "Comma-separated list with 2-4 values from: meeting, date, party, office, outdoor, travel, casual, evening",
  "best_colors": "Comma-separated list with 3-5 colors from: red, blue, black, white, gray, beige, green, pink, purple, yellow, orange, brown, navy, khaki",
  "avoid_colors": "Comma-separated list of colors to use carefully",
  "outfit_suggestions": "A short English styling tip under 15 words",
  "personality_vibe": "A short English vibe description under 10 words"
}

Return JSON only.`;
}

export async function POST(request: NextRequest) {
  try {
    const locale = getLocaleFromRequest(request);
    const turnstileResponse = await requireTurnstile(request);
    if (turnstileResponse) {
      return turnstileResponse;
    }

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: t(locale, "Please provide an image.", "请提供图片") },
        { status: 400 }
      );
    }

    const messages: AiMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: getAnalyzeSystemPrompt(locale),
          },
          {
            type: "image_url",
            image_url: {
              url: image,
              detail: "high",
            },
          },
        ],
      },
    ];

    // 调用视觉模型进行分析
    const response = await invokeTextVision({
      requestHeaders: request.headers,
      messages,
      capability: "vision",
      temperature: 0.4,
    });

    // 解析 JSON 响应
    let result;
    try {
      const content = response.content.trim();
      console.log("原始 AI 响应:", content);

      const parsed = parseJsonBlock<Record<string, string | string[] | undefined>>(content);
      
      // 确保返回正确的数据格式
      result = {
        skin_tone: parsed.skin_tone || 'medium',
        body_shape: parsed.body_shape || 'average',
        height: parsed.height || 'medium',
        features: parseDelimitedValues(parsed.features, 5),
        best_styles: parseDelimitedValues(parsed.best_styles, 5),
        best_scenes: parseDelimitedValues(parsed.best_scenes, 5),
        best_colors: parseDelimitedValues(parsed.best_colors, 5),
        avoid_colors: parseDelimitedValues(parsed.avoid_colors, 5),
        outfit_suggestions: String(
          parsed.outfit_suggestions ||
            t(locale, "Works across multiple outfit directions", "适合多种穿搭风格")
        ).substring(0, 50),
        personality_vibe: String(
          parsed.personality_vibe || t(locale, "Distinctive presence", "气质独特")
        ).substring(0, 30),
      };
      
      console.log("解析后的人物分析结果:", result);
    } catch (parseError) {
      console.error("解析分析结果失败:", parseError, response.content);
      // 返回默认值
      result = {
        skin_tone: 'medium',
        body_shape: 'average',
        height: 'medium',
        features: ['普通'],
        best_styles: ['casual', 'elegant'],
        best_scenes: ['casual', 'date'],
        best_colors: ['blue', 'white', 'black'],
        avoid_colors: [],
        outfit_suggestions: t(locale, "Works across multiple outfit directions", "适合多种穿搭风格"),
        personality_vibe: t(locale, "Distinctive presence", "气质独特"),
      };
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("人物分析失败:", error);
    const locale = getLocaleFromRequest(request);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : t(locale, "Analysis failed.", "分析失败"),
      },
      { status: 500 }
    );
  }
}
