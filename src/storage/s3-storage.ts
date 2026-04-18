/**
 * Cloudflare R2 存储工具模块
 *
 * 存储目录结构：
 * - avatars/{userId}/：人像照片
 * - wardrobe/{userId}/：衣柜衣服照片
 * - generated/{userId}/：生成的穿搭效果图
 *
 * 对外统一返回永久公开 URL，数据库也直接保存该 URL。
 */

import {
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type StorageCategory = "avatars" | "wardrobe" | "generated";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || "";
const PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/+$/, "");

let bucketReadyPromise: Promise<void> | null = null;

function getMissingEnvVars(): string[] {
  const missing: string[] = [];

  if (!ACCOUNT_ID) missing.push("CLOUDFLARE_ACCOUNT_ID");
  if (!ACCESS_KEY_ID) missing.push("CLOUDFLARE_R2_ACCESS_KEY_ID");
  if (!SECRET_ACCESS_KEY) missing.push("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  if (!BUCKET) missing.push("CLOUDFLARE_R2_BUCKET");
  if (!PUBLIC_URL) missing.push("CLOUDFLARE_R2_PUBLIC_URL");

  return missing;
}

function assertStorageConfigured(): void {
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    throw new Error(`R2 存储未配置完整: 缺少 ${missing.join(", ")}`);
  }
}

function getClient(): S3Client {
  assertStorageConfigured();

  return new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });
}

async function ensureBucketAccessible(): Promise<void> {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const client = getClient();
      await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    })();
  }

  return bucketReadyPromise;
}

function normalizeKey(key: string): string {
  return key.replace(/^\/+|\/+$/g, "");
}

function isDirectUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return (
    value.startsWith("/") ||
    value.startsWith("blob:") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  );
}

function decodePathSegments(value: string): string {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

function encodePathSegments(value: string): string {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function extractManagedKey(value: string | null | undefined): string | null {
  if (!value) return null;

  if (!isDirectUrl(value)) {
    return normalizeKey(value);
  }

  if (!PUBLIC_URL || !value.startsWith(`${PUBLIC_URL}/`)) {
    return null;
  }

  return decodePathSegments(value.slice(PUBLIC_URL.length + 1));
}

function getPublicUrl(key: string): string {
  assertStorageConfigured();
  return `${PUBLIC_URL}/${encodePathSegments(normalizeKey(key))}`;
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/heic": "heic",
    "image/heif": "heif",
  };

  return mimeToExt[mimeType] || "jpg";
}

function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  const extToMime: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    heic: "image/heic",
    heif: "image/heif",
  };

  return extToMime[ext] || "image/jpeg";
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "image.jpg";
}

function buildObjectKey(category: StorageCategory, userId: string, contentType?: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = getExtensionFromMimeType(contentType || "image/jpeg");
  return `${category}/${userId}/${timestamp}_${randomStr}.${extension}`;
}

function parseBase64Image(base64Data: string): { contentType: string; buffer: Buffer } {
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid base64 format");
  }

  return {
    contentType: matches[1],
    buffer: Buffer.from(matches[2], "base64"),
  };
}

async function uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string> {
  await ensureBucketAccessible();

  const cleanKey = normalizeKey(key);
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: cleanKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return cleanKey;
}

export async function resolveStoredFileUrl(
  value: string | null | undefined
): Promise<string> {
  if (!value) return "";
  if (isDirectUrl(value)) return value;
  return getPublicUrl(value);
}

/**
 * 上传 base64 图片并返回永久公开 URL
 */
export async function uploadImageFromBase64(
  base64Data: string,
  category: StorageCategory,
  userId: string
): Promise<string> {
  const { contentType, buffer } = parseBase64Image(base64Data);
  const key = buildObjectKey(category, userId, contentType);

  console.log(`[Storage] 上传 ${category}: ${key}, 大小: ${buffer.length} bytes`);
  await uploadBuffer(buffer, key, contentType);

  return getPublicUrl(key);
}

/**
 * 上传文件并返回对象 Key
 */
export async function uploadFileGetKey(
  base64Data: string,
  category: StorageCategory,
  userId: string
): Promise<string> {
  const { contentType, buffer } = parseBase64Image(base64Data);
  const key = buildObjectKey(category, userId, contentType);
  return uploadBuffer(buffer, key, contentType);
}

/**
 * 为兼容历史接口保留函数名，当前直接返回永久公开 URL
 */
export async function getSignedUrl(keyOrUrl: string): Promise<string> {
  if (!keyOrUrl) {
    throw new Error("key is required");
  }

  if (isDirectUrl(keyOrUrl)) {
    return keyOrUrl;
  }

  return getPublicUrl(keyOrUrl);
}

/**
 * 下载远程图片并上传到 R2，返回永久公开 URL
 */
export async function uploadFromUrl(
  imageUrl: string,
  category: StorageCategory,
  userId: string
): Promise<string> {
  if (!imageUrl) {
    throw new Error("imageUrl is required");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`下载远程图片失败: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType =
    response.headers.get("content-type") ||
    getMimeTypeFromFileName(imageUrl.split("/").pop()?.split("?")[0] || "image.jpg");
  const originalName = imageUrl.split("/").pop()?.split("?")[0] || "image.jpg";
  const safeName = sanitizeFileName(originalName);
  const prefix = buildObjectKey(category, userId, contentType).replace(/\.[^.]+$/, "");
  const key = `${prefix}_${safeName}`;

  console.log(`[Storage] 从URL上传到 ${category}: ${imageUrl.substring(0, 80)}...`);
  await uploadBuffer(Buffer.from(arrayBuffer), key, contentType);

  return getPublicUrl(key);
}

/**
 * 删除文件
 */
export async function deleteFile(keyOrUrl: string): Promise<boolean> {
  const key = extractManagedKey(keyOrUrl);

  if (!key) {
    return true;
  }

  await ensureBucketAccessible();
  const client = getClient();
  console.log(`[Storage] 删除文件: ${key}`);

  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );

  return true;
}

/**
 * 检查文件是否存在
 */
export async function fileExists(keyOrUrl: string): Promise<boolean> {
  const key = extractManagedKey(keyOrUrl);

  if (!key) {
    return false;
  }

  try {
    await ensureBucketAccessible();
    const client = getClient();
    await client.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * 列出目录下的文件
 */
export async function listFiles(
  prefix: string,
  maxKeys: number = 100
): Promise<{ keys: string[]; isTruncated: boolean }> {
  await ensureBucketAccessible();

  const cleanPrefix = normalizeKey(prefix || "");
  const client = getClient();
  const keys: string[] = [];
  let continuationToken: string | undefined;
  let truncated = false;

  while (keys.length < maxKeys) {
    const remaining = Math.max(1, Math.min(1000, maxKeys - keys.length));
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: cleanPrefix || undefined,
        ContinuationToken: continuationToken,
        MaxKeys: remaining,
      })
    );

    for (const item of result.Contents || []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }

    continuationToken = result.NextContinuationToken;
    truncated = Boolean(result.IsTruncated);

    if (!continuationToken || !truncated) {
      break;
    }
  }

  return {
    keys,
    isTruncated: truncated,
  };
}

/**
 * 清除用户的所有存储数据
 */
export async function clearUserStorage(userId: string): Promise<{ deleted: number; errors: string[] }> {
  const categories: StorageCategory[] = ["avatars", "wardrobe", "generated"];
  let deleted = 0;
  const errors: string[] = [];

  for (const category of categories) {
    const prefix = `${category}/${userId}/`;

    try {
      const result = await listFiles(prefix, 5000);

      for (const key of result.keys) {
        try {
          await deleteFile(key);
          deleted += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "未知错误";
          errors.push(`删除 ${key} 失败: ${message}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      errors.push(`列出 ${prefix} 文件失败: ${message}`);
    }
  }

  return { deleted, errors };
}

/**
 * 清除所有存储数据（管理员功能）
 */
export async function clearAllStorage(): Promise<{ deleted: number; errors: string[] }> {
  let deleted = 0;
  const errors: string[] = [];

  try {
    const result = await listFiles("", 5000);

    for (const key of result.keys) {
      try {
        await deleteFile(key);
        deleted += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        errors.push(`删除 ${key} 失败: ${message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    errors.push(`列出文件失败: ${message}`);
  }

  return { deleted, errors };
}

/**
 * 获取存储使用统计
 */
export async function getStorageStats(userId?: string): Promise<Record<string, number>> {
  const categories: StorageCategory[] = ["avatars", "wardrobe", "generated"];
  const stats: Record<string, number> = {};

  for (const category of categories) {
    const prefix = userId ? `${category}/${userId}/` : `${category}/`;

    try {
      const result = await listFiles(prefix, 5000);
      stats[category] = result.keys.length;
    } catch {
      stats[category] = 0;
    }
  }

  return stats;
}
