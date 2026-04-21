import type { AiContentPart, AiMessage } from "@/lib/ai/providers/coze";

interface ModelscopeChatResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
    delta?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
  message?: string;
}

interface ModelscopeImageResponse {
  images?: Array<{
    url?: string;
  }>;
  data?: Array<{
    url?: string;
  }>;
  output_images?: string[];
  outputs?: {
    images?: Array<{
      url?: string;
    }>;
    data?: Array<{
      url?: string;
    }>;
    output_images?: string[];
  };
  task_id?: string | number;
  task_status?: string;
  request_id?: string;
  error?: {
    message?: string;
  };
  errors?: {
    message?: string;
  };
  message?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModelscopeBaseUrl(): string {
  return (
    process.env.MODELSCOPE_BASE_URL ||
    process.env.MODELSCOPE_API_BASE_URL ||
    "https://api-inference.modelscope.cn/v1"
  ).replace(/\/+$/, "");
}

function getModelscopeApiKey(): string {
  const apiKey =
    process.env.MODELSCOPE_API_KEY ||
    process.env.MODELSCOPE_SDK_TOKEN ||
    process.env.MODELSCOPE_ACCESS_TOKEN;

  if (!apiKey) {
    throw new Error("MODELSCOPE_API_KEY、MODELSCOPE_SDK_TOKEN 或 MODELSCOPE_ACCESS_TOKEN 未配置");
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

function extractModelscopeImageUrl(data: ModelscopeImageResponse): string | null {
  return (
    data.images?.[0]?.url ||
    data.data?.[0]?.url ||
    data.output_images?.[0] ||
    data.outputs?.images?.[0]?.url ||
    data.outputs?.data?.[0]?.url ||
    data.outputs?.output_images?.[0] ||
    null
  );
}

function extractModelscopeErrorMessage(data: ModelscopeImageResponse): string {
  return data.errors?.message || data.error?.message || data.message || "ModelScope 通用生图失败";
}

function isDataUrl(value: string): boolean {
  return /^data:/i.test(value);
}

function stripDataUrlPrefix(value: string): string {
  return value.replace(/^data:[^,]+,/, "");
}

function requiresReferenceImage(model: string): boolean {
  return /qwen\/qwen-image-edit/i.test(model);
}

export async function modelscopeInvoke(params: {
  messages: AiMessage[];
  model: string;
  temperature?: number;
}): Promise<string> {
  const response = await fetch(`${getModelscopeBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getModelscopeApiKey()}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: toOpenAiMessages(params.messages),
      temperature: params.temperature,
      stream: false,
    }),
  });

  const data = (await response.json()) as ModelscopeChatResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || "ModelScope 文本/识图调用失败");
  }

  const content = extractTextContent(data.choices?.[0]?.message?.content);
  if (!content) {
    throw new Error("ModelScope 未返回文本内容");
  }

  return content;
}

export async function* modelscopeStream(params: {
  messages: AiMessage[];
  model: string;
  temperature?: number;
}): AsyncGenerator<{ content: string }> {
  const response = await fetch(`${getModelscopeBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getModelscopeApiKey()}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: toOpenAiMessages(params.messages),
      temperature: params.temperature,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    let errorMessage = "ModelScope 流式调用失败";
    try {
      const data = (await response.json()) as ModelscopeChatResponse;
      errorMessage = data.error?.message || data.message || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  const decoder = new TextDecoder();
  let buffer = "";

  const reader = response.body.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const separatorIndex = buffer.indexOf("\n\n");
      if (separatorIndex < 0) break;

      const event = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") {
          continue;
        }

        const payload = JSON.parse(data) as ModelscopeChatResponse;
        const delta = extractTextContent(payload.choices?.[0]?.delta?.content);
        if (delta) {
          yield { content: delta };
        }
      }
    }
  }

  const tail = buffer.trim();
  if (tail.startsWith("data:")) {
    const data = tail.slice(5).trim();
    if (data && data !== "[DONE]") {
      const payload = JSON.parse(data) as ModelscopeChatResponse;
      const delta = extractTextContent(payload.choices?.[0]?.delta?.content);
      if (delta) {
        yield { content: delta };
      }
    }
  }
}

export async function modelscopeGenerateImage(params: {
  prompt: string;
  referenceImages?: string[];
  model?: string;
}): Promise<{ imageUrl: string | null; error?: string }> {
  const model = params.model || process.env.MODELSCOPE_GENERAL_IMAGE_MODEL || "MAILAND/majicflus_v1";
  const referenceImages = (params.referenceImages || []).filter(Boolean).slice(0, 3);

  if (requiresReferenceImage(model) && referenceImages.length === 0) {
    throw new Error(`${model} 需要至少 1 张参考图`);
  }

  const body: Record<string, unknown> = {
    model,
    prompt: params.prompt,
  };

  if (referenceImages.length > 0) {
    if (referenceImages.every(isDataUrl)) {
      body.images = referenceImages.map(stripDataUrlPrefix);
    } else {
      body.image_url = referenceImages;
    }
  }

  const response = await fetch(`${getModelscopeBaseUrl()}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getModelscopeApiKey()}`,
      "X-ModelScope-Async-Mode": "true",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as ModelscopeImageResponse;
  if (!response.ok) {
    throw new Error(extractModelscopeErrorMessage(data));
  }

  const immediateImageUrl = extractModelscopeImageUrl(data);
  if (immediateImageUrl) {
    return {
      imageUrl: immediateImageUrl,
    };
  }

  const taskId = data.task_id ? String(data.task_id) : "";
  if (!taskId) {
    return {
      imageUrl: null,
      error: "ModelScope 未返回 task_id 或图片结果",
    };
  }

  const timeoutMs = Number(process.env.MODELSCOPE_GENERAL_IMAGE_TIMEOUT_MS || process.env.MODELSCOPE_IMAGE_TIMEOUT_MS || 60000);
  const pollIntervalMs = Number(
    process.env.MODELSCOPE_GENERAL_IMAGE_POLL_INTERVAL_MS || process.env.MODELSCOPE_IMAGE_POLL_INTERVAL_MS || 3000
  );
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(pollIntervalMs);

    const statusResponse = await fetch(`${getModelscopeBaseUrl()}/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${getModelscopeApiKey()}`,
        "X-ModelScope-Task-Type": "image_generation",
      },
    });

    const statusData = (await statusResponse.json()) as ModelscopeImageResponse;
    if (!statusResponse.ok) {
      throw new Error(extractModelscopeErrorMessage(statusData));
    }

    const imageUrl = extractModelscopeImageUrl(statusData);
    if (imageUrl) {
      return {
        imageUrl,
      };
    }

    const taskStatus = String(statusData.task_status || "").toUpperCase();
    if (taskStatus === "FAILED" || taskStatus === "CANCELED" || taskStatus === "CANCELLED") {
      throw new Error(extractModelscopeErrorMessage(statusData));
    }
  }

  return {
    imageUrl: null,
    error: "ModelScope 生图任务超时",
  };
}
