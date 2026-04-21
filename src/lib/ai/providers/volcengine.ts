import { Config, HeaderUtils, ImageGenerationClient, LLMClient } from "coze-coding-dev-sdk";
import type { AiMessage } from "@/lib/ai/providers/coze";

function getForwardHeaders(requestHeaders: Headers): Record<string, string> {
  return HeaderUtils.extractForwardHeaders(requestHeaders);
}

function stripArkApiV3Suffix(url: string): string {
  return url.replace(/\/api\/v3\/?$/, "");
}

function createVolcengineConfig(): Config {
  const apiKey =
    process.env.VOLCENGINE_API_KEY ||
    process.env.ARK_API_KEY ||
    process.env.COZE_WORKLOAD_IDENTITY_API_KEY;

  const modelBaseUrl =
    process.env.VOLCENGINE_MODEL_BASE_URL ||
    process.env.ARK_MODEL_BASE_URL ||
    process.env.COZE_INTEGRATION_MODEL_BASE_URL ||
    "https://ark.cn-beijing.volces.com/api/v3";

  const baseUrl = stripArkApiV3Suffix(
    process.env.VOLCENGINE_BASE_URL || process.env.COZE_INTEGRATION_BASE_URL || modelBaseUrl
  );

  return new Config({
    ...(apiKey ? { apiKey } : {}),
    ...(baseUrl ? { baseUrl } : {}),
    ...(modelBaseUrl ? { modelBaseUrl } : {}),
  });
}

function createLlmClient(requestHeaders: Headers): LLMClient {
  return new LLMClient(createVolcengineConfig(), getForwardHeaders(requestHeaders));
}

function createImageClient(requestHeaders: Headers): ImageGenerationClient {
  return new ImageGenerationClient(createVolcengineConfig(), getForwardHeaders(requestHeaders));
}

function resolveVolcengineGeneralImageModel(): string {
  return (
    process.env.VOLCENGINE_GENERAL_IMAGE_MODEL ||
    process.env.VOLCENGINE_IMAGE_MODEL ||
    "doubao-seedream-5-0-260128"
  );
}

export async function volcengineInvoke(params: {
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

export function volcengineStream(params: {
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

export async function volcengineGenerateImage(params: {
  requestHeaders: Headers;
  prompt: string;
  size?: string;
  watermark?: boolean;
  image?: string | string[];
  optimizePromptMode?: string;
}): Promise<{ imageUrl: string | null; error?: string }> {
  const client = createImageClient(params.requestHeaders);
  const model = resolveVolcengineGeneralImageModel();
  (client as unknown as { model: string }).model = model;

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
    error: helper.errorMessages.join("；") || "火山通用生图未返回结果",
  };
}
