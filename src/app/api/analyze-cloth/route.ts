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
    return `你是一个专业的服装形象顾问。请详细分析用户上传的服装图片，并返回全面的信息。

请返回以下 JSON 格式（所有字段都必须填写）：

{
  "category": "服装类别，从以下选项选择：tops(上装), bottoms(下装), dresses(裙装), outerwear(外套), shoes(鞋子), bags(包包), accessories(配饰), hats(帽子)",
  "color": "主色调：red, blue, black, white, gray, beige, green, pink, purple, yellow, orange, brown, navy, khaki",
  "style_tags": "风格标签，逗号分隔，从中选择0-4个：casual(休闲), formal(正式), sporty(运动), elegant(优雅), vintage(复古), street(街头), bohemian(波西米亚), minimalist(简约), chic(时尚), feminine(女性化), edgy(酷感)",
  "seasons": "适合季节，逗号分隔：spring(春), summer(夏), fall(秋), winter(冬)",
  "scenes": "最适合的场景，逗号分隔，从中选择1-3个：meeting(正式会议), date(约会), party(派对聚会), office(日常办公), outdoor(户外运动), travel(旅行), casual(日常休闲), evening(晚宴活动)",
  "pairing_suggestions": "搭配建议，逗号分隔，如：可搭配深色下装、适合配白色鞋子、可加围巾点缀等",
  "body_type": "适合的体型，逗号分隔：slim(偏瘦), average(标准), curvy(曲线), tall(高挑), petite(小巧)",
  "description": "50字以内的中文描述，突出这件衣服的亮点"
}

请只返回 JSON，不要添加任何解释。`;
  }

  return `You are a professional fashion analyst. Review the uploaded clothing photo and return structured metadata.

Return JSON only with every field filled:

{
  "category": "One of: tops, bottoms, dresses, outerwear, shoes, bags, accessories, hats",
  "color": "One of: red, blue, black, white, gray, beige, green, pink, purple, yellow, orange, brown, navy, khaki",
  "style_tags": "Comma-separated list with 0-4 values from: casual, formal, sporty, elegant, vintage, street, bohemian, minimalist, chic, feminine, edgy",
  "seasons": "Comma-separated list from: spring, summer, fall, winter",
  "scenes": "Comma-separated list with 1-3 values from: meeting, date, party, office, outdoor, travel, casual, evening",
  "pairing_suggestions": "Comma-separated pairing tips such as pair with dark bottoms or works with white shoes",
  "body_type": "Comma-separated list from: slim, average, curvy, tall, petite",
  "description": "An English description under 20 words highlighting the key strengths of the item"
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
      temperature: 0.3,
    });

    // 解析 JSON 响应
    let result;
    try {
      const content = response.content.trim();
      console.log("原始 AI 响应:", content);

      const parsed = parseJsonBlock<Record<string, string | string[] | undefined>>(content);
      
      // 确保返回正确的数据格式
      result = {
        category: normalizeCategory(typeof parsed.category === "string" ? parsed.category : undefined),
        color: normalizeColor(typeof parsed.color === "string" ? parsed.color : undefined),
        style_tags: parseDelimitedValues(parsed.style_tags, 4),
        seasons: parseDelimitedValues(parsed.seasons, 4),
        scenes: parseDelimitedValues(parsed.scenes, 4),
        pairing_suggestions: parseDelimitedValues(parsed.pairing_suggestions, 4),
        body_type: parseDelimitedValues(parsed.body_type, 4),
        description: String(
          parsed.description || t(locale, "Recognized clothing item", "已识别衣服特征")
        ).substring(0, 100),
      };
      
      console.log("解析后的结果:", result);
    } catch (parseError) {
      console.error("解析分析结果失败:", parseError, response.content);
      // 返回默认值
      result = {
        category: "tops",
        color: "gray",
        style_tags: ["casual"],
        seasons: ["spring", "fall"],
        scenes: ["casual"],
        pairing_suggestions: ["百搭款式"],
        body_type: ["average"],
        description: t(locale, "Recognized clothing item", "已识别衣服特征"),
      };
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("服装分析失败:", error);
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

// 规范化类别
function normalizeCategory(category: string | undefined): string {
  const map: Record<string, string> = {
    '上装': 'tops', 'T恤': 'tops', '衬衫': 'tops', '毛衣': 'tops', '卫衣': 'tops', '针织衫': 'tops',
    '下装': 'bottoms', '裤子': 'bottoms', '裙子': 'bottoms', '短裤': 'bottoms', '牛仔裤': 'bottoms',
    '裙装': 'dresses', '连衣裙': 'dresses', '半身裙': 'dresses',
    '外套': 'outerwear', '夹克': 'outerwear', '大衣': 'outerwear', '风衣': 'outerwear', '西装': 'outerwear',
    '鞋子': 'shoes', '鞋': 'shoes',
    '包包': 'bags', '包': 'bags',
    '配饰': 'accessories', '配件': 'accessories',
    '帽子': 'hats',
  };
  
  const cat = String(category || '').toLowerCase();
  for (const [key, value] of Object.entries(map)) {
    if (cat.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  const valid = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'bags', 'accessories', 'hats'];
  if (valid.includes(cat)) return cat;
  
  return 'tops';
}

// 规范化颜色
function normalizeColor(color: string | undefined): string {
  const map: Record<string, string> = {
    '红': 'red', '粉': 'pink', '橙': 'orange', '黄': 'yellow', '绿': 'green',
    '蓝': 'blue', '紫': 'purple', '黑': 'black', '白': 'white', '灰': 'gray',
    '棕': 'brown', '米': 'beige', '卡其': 'khaki', '藏青': 'navy', '青': 'teal',
  };
  
  const c = String(color || '').toLowerCase();
  for (const [key, value] of Object.entries(map)) {
    if (c.includes(key)) {
      return value;
    }
  }
  
  const valid = ['red', 'blue', 'black', 'white', 'gray', 'beige', 'green', 'pink', 'purple', 'yellow', 'orange', 'brown', 'navy', 'khaki'];
  if (valid.includes(c)) return c;
  
  return 'gray';
}
