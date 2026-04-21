import { GoogleGenAI } from "@google/genai";
import type { AiMessage, AiContentPart } from "@/lib/ai/providers/coze";

function getGeminiClient(): GoogleGenAI {
  const useVertex = String(process.env.GOOGLE_GENAI_USE_VERTEXAI || "").toLowerCase() === "true";

  if (useVertex) {
    return new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
      apiVersion: process.env.GEMINI_API_VERSION,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 或 GOOGLE_API_KEY 未配置");
  }

  return new GoogleGenAI({
    apiKey,
    apiVersion: process.env.GEMINI_API_VERSION,
  });
}

async function toInlineData(url: string): Promise<{ mimeType: string; data: string }> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Gemini 图片 data URL 格式无效");
    }

    return {
      mimeType: match[1],
      data: match[2],
    };
  }

  const response = await fetch(url, {
    headers: {
      Accept: "image/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Gemini 下载参考图失败: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const arrayBuffer = await response.arrayBuffer();

  return {
    mimeType: contentType,
    data: Buffer.from(arrayBuffer).toString("base64"),
  };
}

async function toGeminiPart(part: AiContentPart) {
  if (part.type === "text") {
    return {
      text: part.text || "",
    };
  }

  const inlineData = await toInlineData(part.image_url?.url || "");
  return {
    inlineData,
  };
}

async function toGeminiContents(messages: AiMessage[]) {
  const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  for (const message of messages) {
    if (typeof message.content === "string") {
      userParts.push({
        text: `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`,
      });
      continue;
    }

    for (const part of message.content) {
      userParts.push(await toGeminiPart(part));
    }
  }

  return [
    {
      role: "user",
      parts: userParts,
    },
  ];
}

function getSystemInstruction(messages: AiMessage[]): string | undefined {
  const systemTexts = messages
    .filter((message) => message.role === "system" && typeof message.content === "string")
    .map((message) => String(message.content).trim())
    .filter(Boolean);

  return systemTexts.length > 0 ? systemTexts.join("\n\n") : undefined;
}

export async function geminiInvoke(params: {
  messages: AiMessage[];
  model: string;
  temperature?: number;
}): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: params.model,
    contents: await toGeminiContents(params.messages.filter((message) => message.role !== "system")),
    config: {
      ...(getSystemInstruction(params.messages)
        ? { systemInstruction: getSystemInstruction(params.messages) }
        : {}),
      ...(typeof params.temperature === "number" ? { temperature: params.temperature } : {}),
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini 未返回文本内容");
  }

  return text;
}

export async function geminiGenerateImage(params: {
  prompt: string;
  referenceImages?: string[];
  model?: string;
}): Promise<{ imageUrl: string | null; error?: string }> {
  const ai = getGeminiClient();
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  for (const image of params.referenceImages || []) {
    parts.push({
      inlineData: await toInlineData(image),
    });
  }
  parts.push({ text: params.prompt });

  const response = await ai.models.generateContent({
    model: params.model || process.env.GEMINI_GENERAL_IMAGE_MODEL || "gemini-2.5-flash-image",
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  });

  const candidateParts = response.candidates?.[0]?.content?.parts || [];
  const inlineImage = candidateParts.find((part) => part.inlineData?.data);

  if (!inlineImage?.inlineData?.data) {
    return {
      imageUrl: null,
      error: "Gemini 未返回图片结果",
    };
  }

  return {
    imageUrl: `data:${inlineImage.inlineData.mimeType || "image/png"};base64,${inlineImage.inlineData.data}`,
  };
}
