import { parseProviderList, resolveAiTier, resolveProviderChain } from "@/lib/ai/config";
import { bailianGenerateImage, isBailianGeneralImageModel } from "@/lib/ai/providers/bailian";
import { cozeGenerateImage } from "@/lib/ai/providers/coze";
import { modelscopeGenerateImage } from "@/lib/ai/providers/modelscope";
import { volcengineGenerateImage } from "@/lib/ai/providers/volcengine";

export type VerticalTryOnProvider =
  | "disabled"
  | "modelscope"
  | "volcengine"
  | "bailian"
  | "fashn"
  | "vertex"
  | "coze";

interface GenerateVirtualTryOnParams {
  requestHeaders: Headers;
  personImageUrl: string;
  garmentImageUrls: string[];
  garmentCategories?: string[];
  prompt: string;
  referenceImages?: string[];
}

export interface GenerateVirtualTryOnResult {
  imageUrl: string | null;
  provider: VerticalTryOnProvider;
  error?: string;
  triedProviders: VerticalTryOnProvider[];
}

const TRY_ON_PROVIDERS = ["disabled", "modelscope", "volcengine", "bailian", "fashn", "vertex", "coze"] as const;
const DEFAULT_FREE_PROVIDERS: VerticalTryOnProvider[] = ["bailian", "volcengine"];
const DEFAULT_PAID_PROVIDERS: VerticalTryOnProvider[] = ["fashn", "bailian", "volcengine"];
const FASHN_RUN_URL = "https://api.fashn.ai/v1/run";
const FASHN_STATUS_URL = "https://api.fashn.ai/v1/status";
const DEFAULT_BAILIAN_SYNC_MODEL = "qwen-image-2.0";
const MAX_GARMENT_REFERENCE_IMAGES = 2;

function getVerticalTryOnProviderChain(): VerticalTryOnProvider[] {
  const tier = resolveAiTier(process.env.AI_VERTICAL_TRYON_TIER || process.env.AI_TRYON_TIER, "free");
  const freeProviders = parseProviderList(
    process.env.AI_VERTICAL_TRYON_PROVIDERS_FREE || process.env.AI_TRYON_PROVIDERS_FREE,
    DEFAULT_FREE_PROVIDERS,
    TRY_ON_PROVIDERS
  );
  const paidProviders = parseProviderList(
    process.env.AI_VERTICAL_TRYON_PROVIDERS_PAID || process.env.AI_TRYON_PROVIDERS_PAID,
    DEFAULT_PAID_PROVIDERS,
    TRY_ON_PROVIDERS
  );

  return resolveProviderChain({
    tier,
    freeProviders,
    paidProviders,
    hasPaidCredentials: Boolean(
      process.env.FASHN_API_KEY || process.env.VERTEX_AI_ACCESS_TOKEN || process.env.GOOGLE_CLOUD_ACCESS_TOKEN
    ),
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBailianApiKey(): string {
  const apiKey = process.env.BAILIAN_API_KEY || process.env.DASHSCOPE_API_KEY || "";
  if (!apiKey) {
    throw new Error("BAILIAN_API_KEY 或 DASHSCOPE_API_KEY 未配置");
  }
  return apiKey;
}

function normalizeGarmentCategory(category: string | undefined): "auto" | "tops" | "bottoms" | "one-pieces" {
  switch (category) {
    case "tops":
    case "outerwear":
      return "tops";
    case "bottoms":
      return "bottoms";
    case "dresses":
      return "one-pieces";
    default:
      return "auto";
  }
}

function pickPrimaryGarmentIndex(categories: string[] = []): number {
  const priorities = ["dresses", "tops", "outerwear", "bottoms"];
  for (const category of priorities) {
    const index = categories.findIndex((item) => item === category);
    if (index >= 0) return index;
  }
  return 0;
}

function pickBailianTryOnInputs(params: GenerateVirtualTryOnParams): {
  topGarmentUrl?: string;
  bottomGarmentUrl?: string;
} {
  let topGarmentUrl: string | undefined;
  let bottomGarmentUrl: string | undefined;

  params.garmentImageUrls.forEach((imageUrl, index) => {
    const category = params.garmentCategories?.[index];
    if (!imageUrl) return;

    if (category === "dresses") {
      topGarmentUrl ||= imageUrl;
      return;
    }

    if (category === "tops" || category === "outerwear") {
      topGarmentUrl ||= imageUrl;
      return;
    }

    if (category === "bottoms") {
      bottomGarmentUrl ||= imageUrl;
    }
  });

  if (!topGarmentUrl && !bottomGarmentUrl) {
    topGarmentUrl = params.garmentImageUrls[0];
  }

  return {
    topGarmentUrl,
    bottomGarmentUrl,
  };
}

function buildBailianGeneralEditPrompt(garmentCategories: string[], referenceImageCount: number): string {
  const garmentLabels = garmentCategories.filter(Boolean).join(", ");

  return [
    "Image 1 is the original person photo that must stay the same.",
    referenceImageCount > 1
      ? `Images 2-${referenceImageCount} are garment reference images.`
      : "Use the same clothes already visible in the original photo.",
    "Edit the person in Image 1 so they wear the garments shown in the reference images.",
    "Keep the same identity, face, hair, body shape, pose, hands, phone, and background.",
    "Keep the result realistic, natural, and consistent with indoor mirror selfie lighting.",
    "Do not add new garments, accessories, props, logos, jewelry, or extra layers.",
    garmentLabels ? `Referenced garment categories: ${garmentLabels}.` : "",
    "Output one realistic full-body fashion photo.",
  ]
    .filter(Boolean)
    .join("\n");
}

function pickBailianGeneralReferenceImages(params: GenerateVirtualTryOnParams): Array<{
  imageUrl: string;
  category?: string;
}> {
  const garmentPriority = ["dresses", "tops", "outerwear", "bottoms", "shoes", "bags", "accessories", "hats"];
  const garmentEntries = params.garmentImageUrls
    .map((imageUrl, index) => ({
      imageUrl,
      category: params.garmentCategories?.[index] || "",
      priority: garmentPriority.indexOf(params.garmentCategories?.[index] || ""),
    }))
    .filter((entry) => entry.imageUrl)
    .sort((a, b) => {
      const aPriority = a.priority < 0 ? 999 : a.priority;
      const bPriority = b.priority < 0 ? 999 : b.priority;
      return aPriority - bPriority;
    });

  return [
    { imageUrl: params.personImageUrl, category: "person" },
    ...garmentEntries.slice(0, 2).map((entry) => ({
      imageUrl: entry.imageUrl,
      category: entry.category,
    })),
  ].filter((entry) => entry.imageUrl);
}

async function runDisabledProvider(): Promise<GenerateVirtualTryOnResult> {
  return {
    imageUrl: null,
    provider: "disabled",
    error: "当前策略已显式关闭试衣生图，只返回搭配结果。",
    triedProviders: ["disabled"],
  };
}

async function runBailianProvider(params: GenerateVirtualTryOnParams): Promise<GenerateVirtualTryOnResult> {
  const model =
    process.env.BAILIAN_VERTICAL_TRYON_MODEL ||
    process.env.BAILIAN_GENERAL_IMAGE_MODEL ||
    DEFAULT_BAILIAN_SYNC_MODEL;

  if (isBailianGeneralImageModel(model)) {
    const referenceImages = pickBailianGeneralReferenceImages(params);
    const result = await bailianGenerateImage({
      model,
      prompt: buildBailianGeneralEditPrompt(
        referenceImages.slice(1).map((entry) => entry.category || ""),
        referenceImages.length
      ),
      referenceImages: referenceImages.map((entry) => entry.imageUrl),
      size: process.env.BAILIAN_VERTICAL_GENERAL_IMAGE_SIZE || process.env.BAILIAN_GENERAL_IMAGE_SIZE,
      watermark: false,
    });

    return {
      imageUrl: result.imageUrl,
      provider: "bailian",
      error: result.error,
      triedProviders: ["bailian"],
    };
  }

  const apiKey = getBailianApiKey();
  const endpoint =
    process.env.BAILIAN_VERTICAL_TRYON_API_URL ||
    process.env.DASHSCOPE_VERTICAL_TRYON_API_URL ||
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis";
  const tasksBaseUrl =
    process.env.BAILIAN_VERTICAL_TRYON_TASKS_BASE_URL ||
    process.env.DASHSCOPE_TASKS_API_URL ||
    "https://dashscope.aliyuncs.com/api/v1/tasks";
  const { topGarmentUrl, bottomGarmentUrl } = pickBailianTryOnInputs(params);

  if (!topGarmentUrl && !bottomGarmentUrl) {
    throw new Error("百炼 AI试衣缺少可用的服装参考图");
  }

  const resolution = Number(process.env.BAILIAN_VERTICAL_TRYON_RESOLUTION || -1);
  const restoreFace = String(process.env.BAILIAN_VERTICAL_TRYON_RESTORE_FACE || "true").toLowerCase() !== "false";

  const runResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({
      model,
      input: {
        person_image_url: params.personImageUrl,
        ...(topGarmentUrl ? { top_garment_url: topGarmentUrl } : {}),
        ...(bottomGarmentUrl ? { bottom_garment_url: bottomGarmentUrl } : {}),
      },
      parameters: {
        resolution,
        restore_face: restoreFace,
      },
    }),
  });

  const runData = (await runResponse.json()) as {
    output?: {
      task_id?: string;
      task_status?: string;
    };
    code?: string;
    message?: string;
  };

  const taskId = runData.output?.task_id;
  if (!runResponse.ok || !taskId) {
    throw new Error(runData.message || runData.code || "百炼 AI试衣提交失败");
  }

  const timeoutMs = Number(process.env.BAILIAN_VERTICAL_TRYON_TIMEOUT_MS || 60000);
  const pollIntervalMs = Number(process.env.BAILIAN_VERTICAL_TRYON_POLL_INTERVAL_MS || 3000);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(pollIntervalMs);

    const statusResponse = await fetch(`${tasksBaseUrl.replace(/\/+$/, "")}/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const statusData = (await statusResponse.json()) as {
      output?: {
        task_status?: string;
        image_url?: string;
        code?: string;
        message?: string;
      };
      code?: string;
      message?: string;
    };

    if (!statusResponse.ok) {
      throw new Error(statusData.message || statusData.code || "百炼 AI试衣轮询失败");
    }

    const taskStatus = statusData.output?.task_status;
    if (taskStatus === "SUCCEEDED" && statusData.output?.image_url) {
      return {
        imageUrl: statusData.output.image_url,
        provider: "bailian",
        triedProviders: ["bailian"],
      };
    }

    if (taskStatus === "FAILED" || taskStatus === "UNKNOWN" || taskStatus === "CANCELED") {
      throw new Error(statusData.output?.message || statusData.output?.code || `百炼 AI试衣任务状态异常: ${taskStatus}`);
    }
  }

  throw new Error("百炼 AI试衣生成超时");
}

async function runVolcengineProvider(params: GenerateVirtualTryOnParams): Promise<GenerateVirtualTryOnResult> {
  const trimmedReferenceImages = (params.referenceImages || [])
    .filter(Boolean)
    .slice(0, MAX_GARMENT_REFERENCE_IMAGES + 1);
  const sourceImages =
    trimmedReferenceImages.length > 0
      ? trimmedReferenceImages
      : [params.personImageUrl, ...params.garmentImageUrls.slice(0, MAX_GARMENT_REFERENCE_IMAGES)];
  const inlineReferenceImages = await Promise.all(sourceImages.map((imageUrl) => fetchImageAsDataUrl(imageUrl)));

  const result = await volcengineGenerateImage({
    requestHeaders: params.requestHeaders,
    prompt: params.prompt,
    size: "2K",
    watermark: false,
    image: inlineReferenceImages,
    optimizePromptMode: "standard",
  });

  return {
    imageUrl: result.imageUrl,
    provider: "volcengine",
    error: result.error,
    triedProviders: ["volcengine"],
  };
}

async function runModelscopeProvider(params: GenerateVirtualTryOnParams): Promise<GenerateVirtualTryOnResult> {
  const result = await modelscopeGenerateImage({
    prompt: params.prompt,
    referenceImages: (params.referenceImages || [])
      .filter(Boolean)
      .slice(0, MAX_GARMENT_REFERENCE_IMAGES + 1),
  });

  return {
    imageUrl: result.imageUrl,
    provider: "modelscope",
    error: result.error,
    triedProviders: ["modelscope"],
  };
}

async function runCozeProvider(params: GenerateVirtualTryOnParams): Promise<GenerateVirtualTryOnResult> {
  const trimmedReferenceImages = (params.referenceImages || [])
    .filter(Boolean)
    .slice(0, MAX_GARMENT_REFERENCE_IMAGES + 1);
  const result = await cozeGenerateImage({
    requestHeaders: params.requestHeaders,
    prompt: params.prompt,
    size: "2K",
    image: trimmedReferenceImages.length > 0 ? trimmedReferenceImages : [
      params.personImageUrl,
      ...params.garmentImageUrls.slice(0, MAX_GARMENT_REFERENCE_IMAGES),
    ],
  });

  return {
    imageUrl: result.imageUrl,
    provider: "coze",
    error: result.error,
    triedProviders: ["coze"],
  };
}

async function runFashnProvider(params: GenerateVirtualTryOnParams): Promise<GenerateVirtualTryOnResult> {
  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) {
    throw new Error("FASHN_API_KEY 未配置");
  }

  const garmentIndex = pickPrimaryGarmentIndex(params.garmentCategories);
  const garmentImageUrl = params.garmentImageUrls[garmentIndex] || params.garmentImageUrls[0];
  if (!garmentImageUrl) {
    throw new Error("FASHN 缺少服装参考图");
  }

  const category = normalizeGarmentCategory(params.garmentCategories?.[garmentIndex]);
  const runResponse = await fetch(FASHN_RUN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model_name: process.env.FASHN_MODEL_NAME || "tryon-v1.6",
      inputs: {
        model_image: params.personImageUrl,
        garment_image: garmentImageUrl,
        category,
        mode: process.env.FASHN_MODE || "balanced",
        output_format: "png",
        num_samples: 1,
      },
    }),
  });

  const runData = (await runResponse.json()) as { id?: string; message?: string; error?: unknown };
  if (!runResponse.ok || !runData.id) {
    throw new Error(String(runData.message || runData.error || "FASHN 提交失败"));
  }

  const timeoutMs = Number(process.env.FASHN_TIMEOUT_MS || 45000);
  const pollIntervalMs = Number(process.env.FASHN_POLL_INTERVAL_MS || 1500);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(pollIntervalMs);

    const statusResponse = await fetch(`${FASHN_STATUS_URL}/${runData.id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const statusData = (await statusResponse.json()) as {
      status?: string;
      output?: string[];
      error?: { message?: string; name?: string } | string | null;
    };

    if (!statusResponse.ok) {
      throw new Error(
        typeof statusData.error === "string"
          ? statusData.error
          : statusData.error?.message || "FASHN 轮询失败"
      );
    }

    if (statusData.status === "completed" && statusData.output?.[0]) {
      return {
        imageUrl: statusData.output[0],
        provider: "fashn",
        triedProviders: ["fashn"],
      };
    }

    if (statusData.status === "failed") {
      throw new Error(
        typeof statusData.error === "string"
          ? statusData.error
          : statusData.error?.message || "FASHN 生成失败"
      );
    }
  }

  throw new Error("FASHN 生成超时");
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "image/*",
    },
  });

  if (!response.ok) {
    throw new Error(`下载图片失败: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "image/*",
    },
  });

  if (!response.ok) {
    throw new Error(`下载图片失败: ${response.status}`);
  }

  const mimeType = response.headers.get("content-type") || "image/png";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

async function runVertexProvider(params: GenerateVirtualTryOnParams): Promise<GenerateVirtualTryOnResult> {
  const accessToken = process.env.VERTEX_AI_ACCESS_TOKEN || process.env.GOOGLE_CLOUD_ACCESS_TOKEN;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
  const model = process.env.VERTEX_VTO_MODEL || "virtual-try-on-preview-08-04";

  if (!accessToken) {
    throw new Error("VERTEX_AI_ACCESS_TOKEN 或 GOOGLE_CLOUD_ACCESS_TOKEN 未配置");
  }
  if (!projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT 未配置");
  }

  const personImage = await fetchImageAsBase64(params.personImageUrl);
  const productImages = await Promise.all(
    params.garmentImageUrls.slice(0, MAX_GARMENT_REFERENCE_IMAGES).map(async (imageUrl) => ({
      image: {
        bytesBase64Encoded: await fetchImageAsBase64(imageUrl),
      },
    }))
  );

  const response = await fetch(
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: params.prompt,
            personImage: {
              image: {
                bytesBase64Encoded: personImage,
              },
            },
            productImages,
          },
        ],
        parameters: {
          addWatermark: false,
          sampleCount: 1,
          baseSteps: Number(process.env.VERTEX_VTO_BASE_STEPS || 32),
          personGeneration: "allow_adult",
          safetySetting: process.env.VERTEX_VTO_SAFETY_SETTING || "block_medium_and_above",
          outputOptions: {
            mimeType: "image/png",
          },
        },
      }),
    }
  );

  const data = (await response.json()) as {
    predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
    error?: { message?: string } | string;
  };

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : data.error?.message || "Vertex 试衣请求失败"
    );
  }

  const prediction = data.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    throw new Error("Vertex 未返回图片结果");
  }

  const mimeType = prediction.mimeType || "image/png";
  return {
    imageUrl: `data:${mimeType};base64,${prediction.bytesBase64Encoded}`,
    provider: "vertex",
    triedProviders: ["vertex"],
  };
}

export async function generateVirtualTryOn(
  params: GenerateVirtualTryOnParams
): Promise<GenerateVirtualTryOnResult> {
  const providers = getVerticalTryOnProviderChain();
  let lastError = "";
  const triedProviders: VerticalTryOnProvider[] = [];

  for (const provider of providers) {
    triedProviders.push(provider);

    try {
      if (provider === "disabled") {
        return {
          ...(await runDisabledProvider()),
          triedProviders,
        };
      }

      if (provider === "fashn") {
        const result = await runFashnProvider(params);
        if (result.imageUrl) {
          return {
            ...result,
            triedProviders,
          };
        }

        lastError = result.error || "FASHN 未返回图片结果";
        continue;
      }

      if (provider === "bailian") {
        const result = await runBailianProvider(params);
        if (result.imageUrl) {
          return {
            ...result,
            triedProviders,
          };
        }

        lastError = result.error || "百炼试衣未返回图片结果";
        continue;
      }

      if (provider === "volcengine") {
        const result = await runVolcengineProvider(params);
        if (result.imageUrl) {
          return {
            ...result,
            triedProviders,
          };
        }

        lastError = result.error || "火山试衣未返回图片结果";
        continue;
      }

      if (provider === "modelscope") {
        const result = await runModelscopeProvider(params);
        if (result.imageUrl) {
          return {
            ...result,
            triedProviders,
          };
        }

        lastError = result.error || "ModelScope 试衣未返回图片结果";
        continue;
      }

      if (provider === "vertex") {
        const result = await runVertexProvider(params);
        if (result.imageUrl) {
          return {
            ...result,
            triedProviders,
          };
        }

        lastError = result.error || "Vertex 试衣未返回图片结果";
        continue;
      }

      const result = await runCozeProvider(params);
      if (result.imageUrl) {
        return {
          ...result,
          triedProviders,
        };
      }

      lastError = result.error || "Coze 未返回图片结果";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "试衣生成失败";
    }
  }

  return {
    imageUrl: null,
    provider: providers[providers.length - 1] || "volcengine",
    error: lastError || "所有试衣 provider 都未成功返回结果",
    triedProviders,
  };
}
