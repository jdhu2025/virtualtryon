function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function formatSupabaseErrorMessage(
  error: unknown,
  fallback: string
): string {
  const message = getErrorMessage(error, fallback);

  if (
    message.includes("COZE_SUPABASE_URL is not set") ||
    message.includes("COZE_SUPABASE_ANON_KEY is not set")
  ) {
    return "Supabase 环境变量未配置，请检查 COZE_SUPABASE_URL 和 COZE_SUPABASE_ANON_KEY";
  }

  if (
    message.includes("schema cache") ||
    message.includes("Could not find the table 'public.")
  ) {
    return "Supabase 数据库尚未初始化，请先执行 supabase/init.sql";
  }

  return message || fallback;
}

export function formatStorageErrorMessage(
  error: unknown,
  fallback: string
): string {
  const message = getErrorMessage(error, fallback);

  if (message.includes("R2 存储未配置完整")) {
    return message;
  }

  if (message.includes("AccessDenied") || message.includes("Access Denied")) {
    return "Cloudflare R2 没有上传权限，请确认当前 S3 凭证包含 Object Read、Object Write、List 权限";
  }

  if (
    message.includes("EPROTO") ||
    message.includes("ssl/tls alert handshake failure") ||
    message.includes("SSL alert number 40")
  ) {
    return "Cloudflare R2 连接失败，请确认 Account ID、Bucket、Access Key ID、Secret Access Key 和 r2.dev 域名来自同一个 bucket";
  }

  if (
    message.includes("NoSuchBucket") ||
    message.includes("bucket does not exist")
  ) {
    return "Cloudflare R2 bucket 不存在，请检查 CLOUDFLARE_R2_BUCKET";
  }

  return message || fallback;
}
