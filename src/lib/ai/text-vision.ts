import { parseProviderList, resolveAiTier, resolveProviderChain } from "@/lib/ai/config";
import { cozeInvoke, cozeStream, type AiMessage } from "@/lib/ai/providers/coze";
import { bailianInvoke } from "@/lib/ai/providers/bailian";
import { geminiInvoke } from "@/lib/ai/providers/gemini";
import { modelscopeInvoke } from "@/lib/ai/providers/modelscope";
import { volcengineInvoke, volcengineStream } from "@/lib/ai/providers/volcengine";

export type TextVisionProvider = "coze" | "bailian" | "volcengine" | "gemini" | "modelscope";

const TEXT_VISION_PROVIDERS = ["coze", "bailian", "volcengine", "gemini", "modelscope"] as const;
const DEFAULT_TEXT_VISION_FREE: TextVisionProvider[] = ["modelscope", "volcengine"];
const DEFAULT_TEXT_VISION_PAID: TextVisionProvider[] = ["modelscope", "volcengine"];

type TextVisionCapability = "text" | "vision";

function getTextVisionProviderChain(): TextVisionProvider[] {
  const tier = resolveAiTier(process.env.AI_TEXT_VISION_TIER, "free");
  const freeProviders = parseProviderList(
    process.env.AI_TEXT_VISION_PROVIDERS_FREE,
    DEFAULT_TEXT_VISION_FREE,
    TEXT_VISION_PROVIDERS
  );
  const paidProviders = parseProviderList(
    process.env.AI_TEXT_VISION_PROVIDERS_PAID,
    DEFAULT_TEXT_VISION_PAID,
    TEXT_VISION_PROVIDERS
  );

  return resolveProviderChain({
    tier,
    freeProviders,
    paidProviders,
    hasPaidCredentials: false,
  });
}

function getDefaultModel(capability: TextVisionCapability): string {
  if (capability === "vision") {
    return process.env.AI_TEXT_VISION_VISION_MODEL || "doubao-seed-1-6-vision-250815";
  }
  return process.env.AI_TEXT_VISION_TEXT_MODEL || "doubao-seed-1-6-251015";
}

function getProviderModel(provider: TextVisionProvider, capability: TextVisionCapability, explicitModel?: string): string {
  if (explicitModel) return explicitModel;

  if (provider === "bailian") {
    if (capability === "vision") {
      return process.env.BAILIAN_TEXT_VISION_VISION_MODEL || "qwen3-vl-flash";
    }
    return process.env.BAILIAN_TEXT_VISION_TEXT_MODEL || "qwen-flash";
  }

  if (provider === "gemini") {
    if (capability === "vision") {
      return process.env.GEMINI_TEXT_VISION_VISION_MODEL || "gemini-2.5-flash";
    }
    return process.env.GEMINI_TEXT_VISION_TEXT_MODEL || "gemini-2.5-flash";
  }

  if (provider === "volcengine") {
    if (capability === "vision") {
      return process.env.VOLCENGINE_TEXT_VISION_VISION_MODEL || getDefaultModel("vision");
    }
    return process.env.VOLCENGINE_TEXT_VISION_TEXT_MODEL || getDefaultModel("text");
  }

  if (provider === "modelscope") {
    if (capability === "vision") {
      return process.env.MODELSCOPE_TEXT_VISION_VISION_MODEL || "Qwen/Qwen2.5-VL-72B-Instruct";
    }
    return process.env.MODELSCOPE_TEXT_VISION_TEXT_MODEL || "Qwen/Qwen2.5-7B-Instruct";
  }

  return getDefaultModel(capability);
}

export async function invokeTextVision(params: {
  requestHeaders: Headers;
  messages: AiMessage[];
  capability?: TextVisionCapability;
  temperature?: number;
  model?: string;
}): Promise<{ content: string; provider: TextVisionProvider; triedProviders: TextVisionProvider[] }> {
  const providers = getTextVisionProviderChain();
  let lastError = "";
  const triedProviders: TextVisionProvider[] = [];

  for (const provider of providers) {
    triedProviders.push(provider);

    try {
      const capability = params.capability || "text";
      const model = getProviderModel(provider, capability, params.model);

      const content =
        provider === "bailian"
          ? await bailianInvoke({
              messages: params.messages,
              model,
              temperature: params.temperature,
            })
          : provider === "modelscope"
            ? await modelscopeInvoke({
                messages: params.messages,
                model,
                temperature: params.temperature,
              })
          : provider === "volcengine"
            ? await volcengineInvoke({
                requestHeaders: params.requestHeaders,
                messages: params.messages,
                model,
                temperature: params.temperature,
              })
          : provider === "gemini"
            ? await geminiInvoke({
                messages: params.messages,
                model,
                temperature: params.temperature,
              })
            : await cozeInvoke({
                requestHeaders: params.requestHeaders,
                messages: params.messages,
                model,
                temperature: params.temperature,
              });

      return {
        content,
        provider,
        triedProviders,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "文本/识图调用失败";
    }
  }

  throw new Error(lastError || "文本/识图 provider 未返回结果");
}

export function streamTextVision(params: {
  requestHeaders: Headers;
  messages: AiMessage[];
  temperature?: number;
  model?: string;
}) {
  const providerChain = getTextVisionProviderChain();
  const provider = providerChain[0] || "modelscope";

  if (provider === "volcengine") {
    return volcengineStream({
      requestHeaders: params.requestHeaders,
      messages: params.messages,
      model: getProviderModel(provider, "text", params.model),
      temperature: params.temperature,
    });
  }

  if (provider === "coze") {
    return cozeStream({
      requestHeaders: params.requestHeaders,
      messages: params.messages,
      model: getProviderModel(provider, "text", params.model),
      temperature: params.temperature,
    });
  }

  return (async function* () {
    const result = await invokeTextVision({
      requestHeaders: params.requestHeaders,
      messages: params.messages,
      capability: "text",
      temperature: params.temperature,
      model: params.model,
    });

    yield {
      content: result.content,
    };
  })();
}

export type { AiMessage, AiContentPart } from "@/lib/ai/providers/coze";
