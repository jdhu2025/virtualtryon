"use client";

import { useCallback } from "react";
import { useTurnstile } from "@/contexts/turnstile-context";
import { TURNSTILE_TOKEN_HEADER } from "@/lib/turnstile-shared";

export function useTurnstileFetch() {
  const { getToken } = useTurnstile();

  return useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const token = await getToken();
      const headers = new Headers(init.headers);
      headers.set(TURNSTILE_TOKEN_HEADER, token);

      return fetch(input, {
        ...init,
        headers,
      });
    },
    [getToken]
  );
}
