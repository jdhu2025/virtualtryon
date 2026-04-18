import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import type { WardrobeItem } from "@/storage/database/shared/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

// 简化版穿搭助手系统提示词
const STYLIST_SYSTEM_PROMPT = `你是专业穿搭顾问，用户会告诉你他的穿搭需求。

规则：
1. 直接从用户衣柜中选择合适的单品进行搭配
2. 回复简洁专业，不说废话
3. 根据需求推荐1-3套穿搭方案
4. 每套方案说明：风格、包含的单品、适合场景

格式示例：
方案1：简约干练
- 上装：蓝色衬衫
- 下装：黑色西裤
- 鞋子：棕色皮鞋
- 适合：正式会议、商务谈判

方案2：...

直接开始，不要问问题。`;

export async function POST(request: NextRequest) {
  try {
    const { message, wardrobeItems, avatars } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "请提供消息内容" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建衣柜信息
    let wardrobeContext = "";
    if (wardrobeItems && wardrobeItems.length > 0) {
      wardrobeContext = "\n\n用户衣柜中的单品：\n";
      wardrobeItems.forEach((item: WardrobeItem, index: number) => {
        wardrobeContext += `${index + 1}. [${item.category}] ${item.color || ""} ${item.ai_description || item.user_description || ""}\n`;
      });
      wardrobeContext += "\n请直接从中选择单品搭配，不要询问用户。\n";
    } else {
      wardrobeContext = "\n\n用户衣柜暂无数据，请在回复中提醒用户先添加衣服到衣柜。\n";
    }

    const messages = [
      {
        role: "system" as const,
        content: STYLIST_SYSTEM_PROMPT,
      },
      {
        role: "user" as const,
        content: message + wardrobeContext,
      },
    ];

    // 创建流式响应
    const stream = client.stream(messages, {
      model: "doubao-seed-1-6-251015",
      temperature: 0.7,
    });

    // 将流转换为 ReadableStream
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const content = typeof chunk.content === 'string' 
                ? chunk.content 
                : JSON.stringify(chunk.content);
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (error) {
          console.error("流式输出错误:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("聊天失败:", error);
    return NextResponse.json(
      { error: "服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
