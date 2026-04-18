import { NextRequest, NextResponse } from "next/server";
import { ImageGenerationClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

// 将图片 URL 转换为 base64
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:')) {
      return url;
    }
    
    const response = await fetch(url, {
      headers: { 'Accept': 'image/*' }
    });
    
    if (!response.ok) {
      console.log("下载图片失败:", response.status);
      return null;
    }
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = blob.type || 'image/jpeg';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error: any) {
    console.log("转换图片失败:", error.message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, testType } = await request.json();

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const imageClient = new ImageGenerationClient(config, customHeaders);

    console.log("- 测试类型:", testType);

    if (testType === "no-reference") {
      // 1. 无参考图测试
      console.log("- 测试：无参考图");
      const result = await imageClient.generate({
        prompt: "Beautiful fashion outfit photo",
        size: "2K",
        optimizePromptMode: "standard",
      });
      return NextResponse.json({ success: true, type: "no-reference", data: result });
    } else if (testType === "with-reference" && imageUrl) {
      // 2. 有参考图测试
      console.log("- 测试：有参考图");
      const base64 = await fetchImageAsBase64(imageUrl);
      if (!base64) {
        return NextResponse.json({ error: "无法获取图片" }, { status: 400 });
      }
      
      console.log("- base64长度:", base64.length);
      console.log("- 开始生成...");
      
      try {
        const result = await imageClient.generate({
          prompt: "Keep the same person, change clothes to nice fashion outfit",
          image: base64,
          size: "2K",
          optimizePromptMode: "standard",
        });
        return NextResponse.json({ success: true, type: "with-reference", data: result });
      } catch (apiError: any) {
        console.error("- API错误:", apiError.message);
        console.error("- API错误详情:", apiError);
        return NextResponse.json({ 
          error: "API错误", 
          message: apiError.message,
          details: apiError
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "无效的测试类型" }, { status: 400 });

  } catch (error: any) {
    console.error("- 整体错误:", error);
    return NextResponse.json({ 
      error: "测试失败", 
      message: error.message 
    }, { status: 500 });
  }
}
