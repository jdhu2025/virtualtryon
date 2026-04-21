import { parseProviderList, resolveAiTier, resolveProviderChain } from "@/lib/ai/config";
import { cozeGenerateImage } from "@/lib/ai/providers/coze";
import { bailianGenerateImage } from "@/lib/ai/providers/bailian";
import { geminiGenerateImage } from "@/lib/ai/providers/gemini";
import { modelscopeGenerateImage } from "@/lib/ai/providers/modelscope";
import { volcengineGenerateImage } from "@/lib/ai/providers/volcengine";

export type GeneralImageProvider = "coze" | "bailian" | "volcengine" | "gemini" | "modelscope";

const GENERAL_IMAGE_PROVIDERS = ["coze", "bailian", "volcengine", "gemini", "modelscope"] as const;
const DEFAULT_GENERAL_IMAGE_FREE: GeneralImageProvider[] = ["bailian", "volcengine", "modelscope", "coze"];
const DEFAULT_GENERAL_IMAGE_PAID: GeneralImageProvider[] = ["bailian", "volcengine", "modelscope", "coze"];

function getGeneralImageProviderChain(): GeneralImageProvider[] {
  const tier = resolveAiTier(process.env.AI_GENERAL_IMAGE_TIER, "free");
  const freeProviders = parseProviderList(
    process.env.AI_GENERAL_IMAGE_PROVIDERS_FREE,
    DEFAULT_GENERAL_IMAGE_FREE,
    GENERAL_IMAGE_PROVIDERS
  );
  const paidProviders = parseProviderList(
    process.env.AI_GENERAL_IMAGE_PROVIDERS_PAID,
    DEFAULT_GENERAL_IMAGE_PAID,
    GENERAL_IMAGE_PROVIDERS
  );

  return resolveProviderChain({
    tier,
    freeProviders,
    paidProviders,
    hasPaidCredentials: false,
  });
}

export async function generateGeneralImage(params: {
  requestHeaders: Headers;
  prompt: string;
  size?: string;
  watermark?: boolean;
  referenceImages?: string | string[];
  optimizePromptMode?: string;
}): Promise<{
  imageUrl: string | null;
  provider: GeneralImageProvider;
  error?: string;
  triedProviders: GeneralImageProvider[];
}> {
  const providers = getGeneralImageProviderChain();
  let lastError = "";
  const triedProviders: GeneralImageProvider[] = [];

  for (const provider of providers) {
    triedProviders.push(provider);

    try {
      const referenceImages = Array.isArray(params.referenceImages)
        ? params.referenceImages
        : params.referenceImages
          ? [params.referenceImages]
          : [];

      const result =
        provider === "bailian"
          ? await bailianGenerateImage({
              prompt: params.prompt,
              size: params.size,
              watermark: params.watermark,
              referenceImages,
            })
          : provider === "modelscope"
            ? await modelscopeGenerateImage({
                prompt: params.prompt,
                referenceImages,
              })
          : provider === "volcengine"
            ? await volcengineGenerateImage({
                requestHeaders: params.requestHeaders,
                prompt: params.prompt,
                size: params.size,
                watermark: params.watermark,
                image: params.referenceImages,
                optimizePromptMode: params.optimizePromptMode,
              })
          : provider === "gemini"
            ? await geminiGenerateImage({
                prompt: params.prompt,
                referenceImages,
              })
            : await cozeGenerateImage({
                requestHeaders: params.requestHeaders,
                prompt: params.prompt,
                size: params.size,
                watermark: params.watermark,
                image: params.referenceImages,
                optimizePromptMode: params.optimizePromptMode,
              });

      if (result.imageUrl) {
        return {
          imageUrl: result.imageUrl,
          provider,
          triedProviders,
        };
      }

      lastError = result.error || "通用生图未返回结果";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "通用生图失败";
    }
  }

  return {
    imageUrl: null,
    provider: providers[providers.length - 1] || "volcengine",
    error: lastError || "通用生图 provider 未返回结果",
    triedProviders,
  };
}
