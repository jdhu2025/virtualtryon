import { Config, HeaderUtils, ImageGenerationClient, LLMClient } from "coze-coding-dev-sdk";

export type AiRole = "system" | "user" | "assistant";

export interface AiContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "high" | "low";
  };
}

export interface AiMessage {
  role: AiRole;
  content: string | AiContentPart[];
}

function getForwardHeaders(requestHeaders: Headers): Record<string, string> {
  return HeaderUtils.extractForwardHeaders(requestHeaders);
}

function createLlmClient(requestHeaders: Headers): LLMClient {
  return new LLMClient(new Config(), getForwardHeaders(requestHeaders));
}

function createImageClient(requestHeaders: Headers): ImageGenerationClient {
  return new ImageGenerationClient(new Config(), getForwardHeaders(requestHeaders));
}

export async function cozeInvoke(params: {
  requestHeaders: Headers;
  messages: AiMessage[];
  model: string;
  temperature?: number;
}): Promise<string> {
  const client = createLlmClient(params.requestHeaders);
  const response = await client.invoke(params.messages, {
    model: params.model,
    temperature: params.temperature,
  });

  return response.content.trim();
}

export function cozeStream(params: {
  requestHeaders: Headers;
  messages: AiMessage[];
  model: string;
  temperature?: number;
}) {
  const client = createLlmClient(params.requestHeaders);
  return client.stream(params.messages, {
    model: params.model,
    temperature: params.temperature,
  });
}

export async function cozeGenerateImage(params: {
  requestHeaders: Headers;
  prompt: string;
  size?: string;
  watermark?: boolean;
  image?: string | string[];
  optimizePromptMode?: string;
}): Promise<{ imageUrl: string | null; error?: string }> {
  const client = createImageClient(params.requestHeaders);
  const response = await client.generate({
    prompt: params.prompt,
    size: params.size,
    watermark: params.watermark,
    image: params.image,
    optimizePromptMode: params.optimizePromptMode,
  });

  const helper = client.getResponseHelper(response);
  if (helper.success && helper.imageUrls[0]) {
    return {
      imageUrl: helper.imageUrls[0],
    };
  }

  return {
    imageUrl: null,
    error: helper.errorMessages.join("；") || "图像服务未返回结果",
  };
}
