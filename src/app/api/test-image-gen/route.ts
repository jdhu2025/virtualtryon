import { NextRequest, NextResponse } from "next/server";
import { generateGeneralImage } from "@/lib/ai/general-image";
import { t } from "@/lib/locale";
import { getLocaleFromRequest } from "@/lib/locale-server";
import { requireTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const locale = getLocaleFromRequest(request);
    const turnstileResponse = await requireTurnstile(request);
    if (turnstileResponse) {
      return turnstileResponse;
    }

    const payload = (await request.json()) as {
      imageUrl?: string;
      testType?: string;
    };
    const imageUrl = payload.imageUrl;
    const testType = payload.testType;

    console.log("- 测试类型:", testType);

    if (testType === "no-reference") {
      // 1. 无参考图测试
      console.log("- 测试：无参考图");
      const result = await generateGeneralImage({
        requestHeaders: request.headers,
        prompt: "Beautiful fashion outfit photo",
        size: "2K",
        optimizePromptMode: "standard",
      });
      return NextResponse.json({ success: true, type: "no-reference", data: result });
    } else if (testType === "with-reference" && imageUrl) {
      // 2. 有参考图测试
      console.log("- 测试：有参考图");
      console.log("- 开始生成...");
      
      try {
        const result = await generateGeneralImage({
          requestHeaders: request.headers,
          prompt: "Keep the same person, change clothes to nice fashion outfit",
          referenceImages: imageUrl,
          size: "2K",
          optimizePromptMode: "standard",
        });
        return NextResponse.json({ success: true, type: "with-reference", data: result });
      } catch (apiError: unknown) {
        const apiErrorMessage = apiError instanceof Error ? apiError.message : "Unknown API error";
        console.error("- API错误:", apiErrorMessage);
        console.error("- API错误详情:", apiError);
        return NextResponse.json({ 
          error: t(locale, "API error", "API错误"), 
          message: apiErrorMessage,
          details: apiError
        }, { status: 500 });
      }
    }

    return NextResponse.json(
      { error: t(locale, "Invalid test type.", "无效的测试类型") },
      { status: 400 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("- 整体错误:", error);
    return NextResponse.json({ 
      error: t(getLocaleFromRequest(request), "Image generation test failed.", "测试失败"), 
      message: errorMessage 
    }, { status: 500 });
  }
}
