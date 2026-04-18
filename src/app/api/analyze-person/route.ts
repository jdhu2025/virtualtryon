import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

// 人物特征分析系统提示词
const ANALYZE_SYSTEM_PROMPT = `你是一个专业的形象顾问。请分析用户上传的人像照片，评估其形象特征和最适合的穿搭风格。

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
  
  "outfit_suggestions": "穿搭建议，中文，30字以内，如：适合干练的职场穿搭、适合柔和的女性风格等",
  
  "personality_vibe": "整体气质描述，中文，20字以内，如：知性优雅、活力青春、清冷高级等"
}

请只返回 JSON，不要添加任何解释。`;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "请提供图片" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: ANALYZE_SYSTEM_PROMPT,
          },
          {
            type: "image_url" as const,
            image_url: {
              url: image,
              detail: "high" as const,
            },
          },
        ],
      },
    ];

    // 调用视觉模型进行分析
    const response = await client.invoke(messages, {
      model: "doubao-seed-1-6-vision-250815",
      temperature: 0.4,
    });

    // 解析 JSON 响应
    let result;
    try {
      const content = response.content.trim();
      console.log("原始 AI 响应:", content);
      
      // 移除可能的 markdown 代码块
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      
      const parsed = JSON.parse(jsonStr);
      
      // 解析逗号分隔的字段
      const parseArray = (value: string | string[] | undefined): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value.slice(0, 5);
        return value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
      };
      
      // 确保返回正确的数据格式
      result = {
        skin_tone: parsed.skin_tone || 'medium',
        body_shape: parsed.body_shape || 'average',
        height: parsed.height || 'medium',
        features: parseArray(parsed.features),
        best_styles: parseArray(parsed.best_styles),
        best_scenes: parseArray(parsed.best_scenes),
        best_colors: parseArray(parsed.best_colors),
        avoid_colors: parseArray(parsed.avoid_colors),
        outfit_suggestions: String(parsed.outfit_suggestions || "适合多种穿搭风格").substring(0, 50),
        personality_vibe: String(parsed.personality_vibe || "气质独特").substring(0, 30),
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
        outfit_suggestions: "适合多种穿搭风格",
        personality_vibe: "气质独特",
      };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("人物分析失败:", error);
    return NextResponse.json(
      { error: error.message || "分析失败" },
      { status: 500 }
    );
  }
}
