"use client";

import Script from "next/script";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale } from "@/contexts/locale-context";
import { t } from "@/lib/locale";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: Record<string, unknown>
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileContextValue {
  isReady: boolean;
  isEnabled: boolean;
  getToken: () => Promise<string>;
}

function getErrorFamily(errorCode: string | number | undefined): number | null {
  if (errorCode === undefined || errorCode === null) {
    return null;
  }

  const normalized = String(errorCode).trim();
  const family = Number(normalized.slice(0, 3));
  return Number.isFinite(family) ? family : null;
}

function getClientErrorMessage(
  locale: "en" | "zh",
  errorCode: string | number | undefined
) {
  const family = getErrorFamily(errorCode);

  if (family === 300 || family === 600) {
    return t(
      locale,
      "The security check could not complete in this browser. Turn off extensions or VPN, then try Incognito or another browser.",
      "当前浏览器未能完成安全校验。请先关闭扩展或 VPN，再试试无痕模式或换一个浏览器。"
    );
  }

  return t(
    locale,
    "Human verification failed. Please try again.",
    "人机验证失败，请重试。"
  );
}

const TurnstileContext = createContext<TurnstileContextValue>({
  isReady: false,
  isEnabled: false,
  getToken: async () => {
    throw new Error("Turnstile is not ready.");
  },
});

export function TurnstileProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const pendingRef = useRef<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const [isReady, setIsReady] = useState(false);

  const rejectPending = useCallback((message: string) => {
    if (pendingRef.current) {
      pendingRef.current.reject(new Error(message));
      pendingRef.current = null;
    }
  }, []);

  const renderWidget = useCallback(() => {
    if (!siteKey || !window.turnstile || !containerRef.current) {
      return;
    }

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      execution: "execute",
      appearance: "interaction-only",
      theme: "auto",
      language: locale === "zh" ? "zh-cn" : "en",
      callback: (token: string) => {
        retryCountRef.current = 0;
        if (pendingRef.current) {
          pendingRef.current.resolve(token);
          pendingRef.current = null;
        }
      },
      "error-callback": (errorCode?: string | number) => {
        const family = getErrorFamily(errorCode);

        if (process.env.NODE_ENV !== "production") {
          console.error("Turnstile client error:", errorCode);
        }

        if ((family === 300 || family === 600) && pendingRef.current) {
          retryCountRef.current += 1;

          if (retryCountRef.current <= 2) {
            return false;
          }
        }

        rejectPending(getClientErrorMessage(locale, errorCode));
        return true;
      },
      "expired-callback": () => {
        retryCountRef.current = 0;
        rejectPending(
          t(
            locale,
            "Human verification expired. Please try again.",
            "人机验证已过期，请重试。"
          )
        );
      },
      "timeout-callback": () => {
        retryCountRef.current = 0;
        rejectPending(
          t(
            locale,
            "Human verification timed out. Please try again.",
            "人机验证超时，请重试。"
          )
        );
      },
    });

    setIsReady(true);
  }, [locale, rejectPending, siteKey]);

  useEffect(() => {
    if (window.turnstile && siteKey) {
      renderWidget();
    }

    return () => {
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget, siteKey]);

  const getToken = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      if (!siteKey) {
        reject(
          new Error(
            t(
              locale,
              "Turnstile is not configured. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY.",
              "Turnstile 尚未配置，请设置 NEXT_PUBLIC_TURNSTILE_SITE_KEY。"
            )
          )
        );
        return;
      }

      if (!window.turnstile || !widgetIdRef.current) {
        reject(
          new Error(
            t(
              locale,
              "Human verification is still loading. Please try again.",
              "人机验证组件仍在加载，请稍后重试。"
            )
          )
        );
        return;
      }

      if (pendingRef.current) {
        reject(
          new Error(
            t(
              locale,
              "A verification request is already in progress.",
              "当前已有一条验证请求正在进行。"
            )
          )
        );
        return;
      }

      retryCountRef.current = 0;
      pendingRef.current = { resolve, reject };
      window.turnstile.reset(widgetIdRef.current);
      window.turnstile.execute(widgetIdRef.current);
    });
  }, [locale, siteKey]);

  return (
    <TurnstileContext.Provider
      value={{
        isReady,
        isEnabled: Boolean(siteKey),
        getToken,
      }}
    >
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          renderWidget();
        }}
      />
      <div
        ref={containerRef}
        className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2"
        aria-hidden="true"
      />
      {children}
    </TurnstileContext.Provider>
  );
}

export function useTurnstile() {
  return useContext(TurnstileContext);
}
