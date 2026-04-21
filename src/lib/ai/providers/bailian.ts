import type { AiMessage, AiContentPart } from "@/lib/ai/providers/coze";

interface BailianChatResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface BailianImageResponse {
  output?: {
    choices?: Array<{
      message?: {
        content?: Array<{
          type?: string;
          image?: string;
          text?: string;
        }>;
      };
    }>;
  };
  message?: string;
  code?: string;
}

function isQwenImageModel(model: string): boolean {
  return /^qwen-image(?:-|$)/i.test(model);
}

export function isBailianGeneralImageModel(model: string): boolean {
  return isQwenImageModel(model) || /^wan/i.test(model);
}

function resolveBailianGeneralImageSize(model: string, requestedSize?: string): string {
  if (requestedSize) return requestedSize;
  if (process.env.BAILIAN_GENERAL_IMAGE_SIZE) {
    return process.env.BAILIAN_GENERAL_IMAGE_SIZE;
  }

  // qwen-image 在人物编辑场景下更适合显式传竖版尺寸，避免参考图比例漂移。
  if (isQwenImageModel(model)) {
    return "1024*1536";
  }

  return "2K";
}

function getBailianBaseUrl(): string {
  return (process.env.BAILIAN_BASE_URL || process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/+$/, "");
}

function getBailianApiKey(): string {
  const apiKey = process.env.BAILIAN_API_KEY || process.env.DASHSCOPE_API_KEY || "";
  if (!apiKey) {
    throw new Error("BAILIAN_API_KEY 或 DASHSCOPE_API_KEY 未配置");
  }
  return apiKey;
}

function toOpenAiMessageContentPart(part: AiContentPart) {
  if (part.type === "text") {
    return {
      type: "text",
      text: part.text || "",
    };
  }

  return {
    type: "image_url",
    image_url: {
      url: part.image_url?.url || "",
      ...(part.image_url?.detail ? { detail: part.image_url.detail } : {}),
    },
  };
}

function toOpenAiMessages(messages: AiMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content:
      typeof message.content === "string"
        ? message.content
        : message.content.map(toOpenAiMessageContentPart),
  }));
}

function extractTextContent(content: string | Array<{ type?: string; text?: string }> | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content.trim();
  return content
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text?.trim() || "")
    .join("\n")
    .trim();
}

export async function bailianInvoke(params: {
  messages: AiMessage[];
  model: string;
  temperature?: number;
}): Promise<string> {
  const response = await fetch(`${getBailianBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getBailianApiKey()}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: toOpenAiMessages(params.messages),
      temperature: params.temperature,
      stream: false,
    }),
  });

  const data = (await response.json()) as BailianChatResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || "百炼文本/识图调用失败");
  }

  const content = extractTextContent(data.choices?.[0]?.message?.content);
  if (!content) {
    throw new Error("百炼未返回文本内容");
  }

  return content;
}

function toWanContent(referenceImages: string[] | undefined, prompt: string) {
  const content: Array<{ image?: string; text?: string }> = [];
  for (const image of referenceImages || []) {
    if (image) {
      content.push({ image });
    }
  }
  content.push({ text: prompt });
  return content;
}

export async function bailianGenerateImage(params: {
  prompt: string;
  size?: string;
  watermark?: boolean;
  referenceImages?: string[];
  model?: string;
}): Promise<{ imageUrl: string | null; error?: string }> {
  const model = params.model || process.env.BAILIAN_GENERAL_IMAGE_MODEL || "wan2.7-image";
  const endpoint =
    process.env.BAILIAN_IMAGE_API_URL ||
    process.env.DASHSCOPE_IMAGE_API_URL ||
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getBailianApiKey()}`,
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          {
            role: "user",
            content: toWanContent(params.referenceImages, params.prompt),
          },
        ],
      },
      parameters: {
        size: resolveBailianGeneralImageSize(model, params.size),
        n: 1,
        watermark: params.watermark ?? false,
      },
    }),
  });

  const data = (await response.json()) as BailianImageResponse;
  if (!response.ok) {
    throw new Error(data.message || data.code || "百炼通用生图失败");
  }

  const imageUrl =
    data.output?.choices?.[0]?.message?.content?.find((part) => part.type === "image" && part.image)?.image ||
    null;

  return {
    imageUrl,
    error: imageUrl ? undefined : "百炼未返回图片结果",
  };
}
