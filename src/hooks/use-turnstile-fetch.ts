"use client";

import { useCallback } from "react";
import { useTurnstile } from "@/contexts/turnstile-context";
import { TURNSTILE_TOKEN_HEADER } from "@/lib/turnstile-shared";

const RETRYABLE_TURNSTILE_ERROR_CODES = new Set(["timeout-or-duplicate"]);

async function shouldRetryWithFreshTurnstileToken(response: Response) {
  if (response.status !== 403) {
    return false;
  }

  try {
    const data = (await response.clone().json()) as {
      turnstileErrorCodes?: unknown;
    };

    if (!Array.isArray(data.turnstileErrorCodes)) {
      return false;
    }

    return data.turnstileErrorCodes.some(
      (code) =>
        typeof code === "string" &&
        RETRYABLE_TURNSTILE_ERROR_CODES.has(code)
    );
  } catch {
    return false;
  }
}

export function useTurnstileFetch() {
  const { getToken } = useTurnstile();

  return useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const runWithFreshToken = async () => {
        const token = await getToken();
        const headers = new Headers(init.headers);
        headers.set(TURNSTILE_TOKEN_HEADER, token);

        return fetch(input, {
          ...init,
          headers,
        });
      };

      const firstResponse = await runWithFreshToken();
      if (await shouldRetryWithFreshTurnstileToken(firstResponse)) {
        return runWithFreshToken();
      }

      return firstResponse;
    },
    [getToken]
  );
}
