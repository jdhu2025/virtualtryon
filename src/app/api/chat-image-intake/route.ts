import { NextRequest, NextResponse } from "next/server";
import { parseJsonBlock } from "@/lib/ai/json";
import { invokeTextVision, type AiMessage } from "@/lib/ai/text-vision";
import { t } from "@/lib/locale";
import { getLocaleFromRequest } from "@/lib/locale-server";
import { requireTurnstile } from "@/lib/turnstile";

function parseDelimitedValues(value: unknown, limit: number): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, limit);
  }

  return String(value)
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function getIntakePrompt(locale: ReturnType<typeof getLocaleFromRequest>) {
  if (locale === "zh") {
    return `你是一个图片分拣助手。请判断用户上传的是：
1. portrait: 适合作为试衣人像的本人照片，能看到人或上半身/全身
2. clothing: 单件衣服、裤子、裙子、鞋子、包等单品照片

请严格返回 JSON：
{
  "kind": "portrait 或 clothing",
  "confidence": 0.0,
  "nickname": "如果是 portrait，给一个简短名字，如 人像 1",
  "category": "如果是 clothing，返回 tops/bottoms/dresses/outerwear/shoes/bags/accessories/hats",
  "color": "如果是 clothing，返回 red/blue/black/white/gray/beige/green/pink/purple/yellow/orange/brown/navy/khaki",
  "style_tags": ["如果是 clothing，可返回 0-3 个：casual/formal/sporty/elegant/vintage/street/bohemian/minimalist/chic/feminine/edgy"],
  "description": "简短中文描述，20字以内"
}

要求：
- portrait 不要输出 category
- clothing 必须输出 category 和 color
- 只返回 JSON，不要解释`;
  }

  return `You are an image intake assistant. Decide whether the uploaded image is:
1. portrait: a usable personal photo for virtual try-on
2. clothing: a single fashion item such as tops, pants, dresses, shoes, or bags

Return strict JSON:
{
  "kind": "portrait or clothing",
  "confidence": 0.0,
  "nickname": "If portrait, return a short English name like Portrait 1",
  "category": "If clothing, return one of tops/bottoms/dresses/outerwear/shoes/bags/accessories/hats",
  "color": "If clothing, return one of red/blue/black/white/gray/beige/green/pink/purple/yellow/orange/brown/navy/khaki",
  "style_tags": ["If clothing, optionally return 0-3 tags from casual/formal/sporty/elegant/vintage/street/bohemian/minimalist/chic/feminine/edgy"],
  "description": "Short English description under 10 words"
}

Rules:
- portrait must not include category
- clothing must include category and color
- return JSON only`;
}

function normalizeCategory(category: string | undefined): string {
  const valid = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories", "hats"];
  const value = String(category || "").toLowerCase();

  if (valid.includes(value)) return value;
  if (value.includes("top") || value.includes("上装") || value.includes("衬衫") || value.includes("卫衣")) return "tops";
  if (value.includes("bottom") || value.includes("下装") || value.includes("裤")) return "bottoms";
  if (value.includes("dress") || value.includes("裙")) return "dresses";
  if (value.includes("outer") || value.includes("外套") || value.includes("夹克")) return "outerwear";
  if (value.includes("shoe") || value.includes("鞋")) return "shoes";
  if (value.includes("bag") || value.includes("包")) return "bags";
  if (value.includes("access") || value.includes("配饰")) return "accessories";
  if (value.includes("hat") || value.includes("帽")) return "hats";
  return "tops";
}

function normalizeColor(color: string | undefined): string {
  const valid = ["red", "blue", "black", "white", "gray", "beige", "green", "pink", "purple", "yellow", "orange", "brown", "navy", "khaki"];
  const value = String(color || "").toLowerCase();

  if (valid.includes(value)) return value;
  if (value.includes("红")) return "red";
  if (value.includes("蓝")) return "blue";
  if (value.includes("黑")) return "black";
  if (value.includes("白")) return "white";
  if (value.includes("灰")) return "gray";
  if (value.includes("米")) return "beige";
  if (value.includes("绿")) return "green";
  if (value.includes("粉")) return "pink";
  if (value.includes("紫")) return "purple";
  if (value.includes("黄")) return "yellow";
  if (value.includes("橙")) return "orange";
  if (value.includes("棕")) return "brown";
  if (value.includes("藏青")) return "navy";
  if (value.includes("卡其")) return "khaki";
  return "gray";
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
        { error: t(locale, "Missing image data.", "缺少图片数据") },
        { status: 400 }
      );
    }

    const messages: AiMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: getIntakePrompt(locale) },
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

    const response = await invokeTextVision({
      requestHeaders: request.headers,
      messages,
      capability: "vision",
      temperature: 0.2,
    });

    const content = response.content.trim();
    const parsed = parseJsonBlock<Record<string, unknown>>(content);

    const kind = String(parsed.kind || "").toLowerCase() === "portrait" ? "portrait" : "clothing";

    return NextResponse.json({
      success: true,
      result: {
        kind,
        confidence: Number(parsed.confidence || 0.8),
        nickname: String(parsed.nickname || t(locale, "Portrait", "人像")),
        category:
          kind === "clothing"
            ? normalizeCategory(typeof parsed.category === "string" ? parsed.category : undefined)
            : null,
        color:
          kind === "clothing"
            ? normalizeColor(typeof parsed.color === "string" ? parsed.color : undefined)
            : null,
        style_tags: parseDelimitedValues(parsed.style_tags, 3),
        description: String(
          parsed.description ||
            (kind === "portrait"
              ? t(locale, "Recognized as a portrait", "已识别为试衣人像")
              : t(locale, "Recognized as a wardrobe item", "已识别为衣橱单品"))
        ).slice(0, 40),
      },
    });
  } catch (error) {
    console.error("聊天上传识别失败:", error);
    const locale = getLocaleFromRequest(request);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : t(locale, "Recognition failed.", "识别失败"),
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
