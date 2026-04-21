import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { t } from "@/lib/locale";
import { getLocaleFromRequest } from "@/lib/locale-server";
import { TURNSTILE_TOKEN_HEADER } from "@/lib/turnstile-shared";

interface TurnstileVerifyResponse {
  success: boolean;
  action?: string;
  cdata?: string;
  hostname?: string;
  "error-codes"?: string[];
}

function isDevEnvironment() {
  return process.env.NODE_ENV !== "production";
}

function getClientIp(request: NextRequest): string | undefined {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return undefined;
}

function getVerificationErrorMessage(
  locale: ReturnType<typeof getLocaleFromRequest>,
  errorCodes: string[] = []
) {
  if (errorCodes.includes("timeout-or-duplicate")) {
    return t(
      locale,
      "Verification expired or was already used. Please try again.",
      "验证已过期或已被使用，请重试。"
    );
  }

  return t(
    locale,
    "Human verification failed. Please try again.",
    "人机验证失败，请重试。"
  );
}

export async function requireTurnstile(request: NextRequest) {
  const locale = getLocaleFromRequest(request);
  const token = request.headers.get(TURNSTILE_TOKEN_HEADER);

  if (!token) {
    return NextResponse.json(
      {
        error: t(
          locale,
          "Human verification is required.",
          "需要完成人机验证。"
        ),
      },
      { status: 400 }
    );
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not configured.");
    return NextResponse.json(
      {
        error: t(
          locale,
          "Human verification is not configured on the server.",
          "服务端尚未配置人机验证。"
        ),
      },
      { status: 500 }
    );
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  body.set("idempotency_key", randomUUID());

  const remoteIp = getClientIp(request);
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  let result: TurnstileVerifyResponse;

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        cache: "no-store",
      }
    );

    result = (await response.json()) as TurnstileVerifyResponse;
  } catch (error) {
    console.error("Turnstile siteverify request failed:", error);
    return NextResponse.json(
      {
        error: t(
          locale,
          "Unable to verify the request right now. Please try again.",
          "暂时无法完成验证，请稍后重试。"
        ),
      },
      { status: 502 }
    );
  }

  if (!result.success) {
    const errorCodes = result["error-codes"] || [];

    if (isDevEnvironment()) {
      console.error("Turnstile verification failed:", {
        errorCodes,
        hostname: result.hostname || null,
      });
    }

    return NextResponse.json(
      {
        error: getVerificationErrorMessage(locale, errorCodes),
        turnstileErrorCodes: errorCodes,
        ...(isDevEnvironment()
          ? {
              turnstileDebug: {
                errorCodes,
                hostname: result.hostname || null,
              },
            }
          : {}),
      },
      { status: 403 }
    );
  }

  return null;
}
