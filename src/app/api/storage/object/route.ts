import { NextRequest, NextResponse } from "next/server";

import { readStoredFile } from "@/storage/s3-storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const key = new URL(request.url).searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing storage key" }, { status: 400 });
    }

    const file = await readStoredFile(key);

    return new NextResponse(Buffer.from(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.contentLength || file.buffer.byteLength),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        ...(file.lastModified
          ? { "Last-Modified": file.lastModified.toUTCString() }
          : {}),
        ...(file.etag ? { ETag: file.etag } : {}),
      },
    });
  } catch (error) {
    console.error("读取存储对象失败:", error);
    return NextResponse.json({ error: "Failed to read storage object" }, { status: 500 });
  }
}
