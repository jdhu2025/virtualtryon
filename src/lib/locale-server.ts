import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { LOCALE_COOKIE_NAME, normalizeLocale, type Locale } from "@/lib/locale";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export function getLocaleFromRequest(request: NextRequest): Locale {
  return normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value);
}
