"use client";

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
import { cn } from "@/lib/utils";

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
  const interactiveTimeoutCountRef = useRef(0);
  const scriptPromiseRef = useRef<Promise<void> | null>(null);
  const pendingRef = useRef<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);

  const clearInteractiveState = useCallback(() => {
    interactiveTimeoutCountRef.current = 0;
    setIsInteractive(false);
  }, []);

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
      size: "flexible",
      theme: "auto",
      language: locale === "zh" ? "zh-cn" : "en",
      retry: "auto",
      "refresh-timeout": "auto",
      "before-interactive-callback": () => {
        interactiveTimeoutCountRef.current = 0;
        setIsInteractive(true);
      },
      "after-interactive-callback": () => {
        setIsInteractive(false);
      },
      callback: (token: string) => {
        retryCountRef.current = 0;
        clearInteractiveState();
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

        clearInteractiveState();
        rejectPending(getClientErrorMessage(locale, errorCode));
        return true;
      },
      "expired-callback": () => {
        retryCountRef.current = 0;
        clearInteractiveState();
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
        interactiveTimeoutCountRef.current += 1;
        setIsInteractive(true);

        if (
          widgetIdRef.current &&
          window.turnstile &&
          interactiveTimeoutCountRef.current < 2
        ) {
          window.turnstile.reset(widgetIdRef.current);
          window.turnstile.execute(widgetIdRef.current);
          return;
        }

        clearInteractiveState();
        rejectPending(
          t(
            locale,
            "The security check timed out. Complete the checkbox as soon as it appears, then try again.",
            "安全校验已超时。请在复选框出现后尽快完成验证，然后再重试。"
          )
        );
      },
    });

    setIsReady(true);
  }, [clearInteractiveState, locale, rejectPending, siteKey]);

  const loadTurnstileScript = useCallback(() => {
    if (window.turnstile) {
      return Promise.resolve();
    }

    if (scriptPromiseRef.current) {
      return scriptPromiseRef.current;
    }

    scriptPromiseRef.current = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Failed to load Turnstile.")),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Turnstile."));
      document.head.appendChild(script);
    });

    return scriptPromiseRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      clearInteractiveState();
    };
  }, [clearInteractiveState]);

  const getToken = useCallback(async () => {
    await loadTurnstileScript();

    if (!widgetIdRef.current) {
      renderWidget();
    }

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
      interactiveTimeoutCountRef.current = 0;
      setIsInteractive(false);
      pendingRef.current = { resolve, reject };
      window.turnstile.reset(widgetIdRef.current);
      window.turnstile.execute(widgetIdRef.current);
    });
  }, [loadTurnstileScript, locale, renderWidget, siteKey]);

  return (
    <TurnstileContext.Provider
      value={{
        isReady,
        isEnabled: Boolean(siteKey),
        getToken,
      }}
    >
      {isInteractive ? (
        <>
          <div
            className="fixed inset-0 z-[98] bg-black/45 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <div className="fixed left-1/2 top-[calc(50%-112px)] z-[101] w-[min(92vw,420px)] -translate-x-1/2 rounded-[24px] bg-white/92 px-4 py-3 text-center shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur">
            <p className="text-sm font-semibold text-[#20183a]">
              {t(locale, "Complete the security check to continue", "请先完成人机验证，再继续生成")}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#62586f]">
              {t(
                locale,
                "If a checkbox appears, tap it right away. This step is only shown when Cloudflare needs extra confirmation.",
                "如果出现复选框，请尽快点一下。只有 Cloudflare 需要额外确认时，才会显示这一步。"
              )}
            </p>
          </div>
        </>
      ) : null}
      <div
        ref={containerRef}
        className={cn(
          "fixed left-1/2 z-[100] w-[min(92vw,420px)] -translate-x-1/2 transition-all duration-200",
          isInteractive
            ? "top-1/2 -translate-y-1/2 opacity-100"
            : "bottom-4 opacity-0 pointer-events-none"
        )}
        aria-hidden={!isInteractive}
      />
      {children}
    </TurnstileContext.Provider>
  );
}

export function useTurnstile() {
  return useContext(TurnstileContext);
}
