import { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface SessionPayload {
  userId: number;
  username: string;
  timestamp: number;
}

export function createSessionToken(userId: number, username: string): string {
  return Buffer.from(
    JSON.stringify({
      userId,
      username,
      timestamp: Date.now(),
    })
  ).toString("base64");
}

export function parseSessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null;

  try {
    const parsed = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    const userId = Number(parsed.userId);
    const username = String(parsed.username || "");
    const timestamp = Number(parsed.timestamp);

    if (!Number.isFinite(userId) || !username || !Number.isFinite(timestamp)) {
      return null;
    }

    const isExpired = Date.now() - timestamp > SESSION_MAX_AGE * 1000;
    if (isExpired) {
      return null;
    }

    return {
      userId,
      username,
      timestamp,
    };
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest): SessionPayload | null {
  return parseSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function getUserIdFromRequest(request: NextRequest): number | null {
  return getSessionFromRequest(request)?.userId ?? null;
}
