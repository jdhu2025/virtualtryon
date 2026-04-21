import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { LocaleProvider } from "@/contexts/locale-context";
import { TurnstileProvider } from "@/contexts/turnstile-context";
import { getHtmlLang, t } from "@/lib/locale";
import { getServerLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();

  return {
    title: t(
      locale,
      "AI Outfit Assistant - Make More of What You Already Own",
      "AI穿搭助手 - 用已有衣物，发现全新可能"
    ),
    description: t(
      locale,
      "Get AI outfit suggestions from the clothes you already own, with wardrobe memory, styling help, and virtual try-on support.",
      "通过AI智能搭配，让你的衣柜焕发新生。每天出门前，获得专属穿搭建议。"
    ),
    keywords:
      locale === "zh"
        ? ["AI穿搭", "虚拟试衣", "智能衣柜", "每日穿搭", "搭配推荐"]
        : [
            "AI outfit assistant",
            "virtual try-on",
            "smart wardrobe",
            "daily outfit",
            "outfit recommendation",
          ],
    authors: [{ name: t(locale, "AI Outfit Assistant", "AI穿搭助手") }],
    openGraph: {
      title: t(locale, "AI Outfit Assistant", "AI穿搭助手"),
      description: t(
        locale,
        "Dress what you already own with more confidence.",
        "用已有衣物，发现全新可能"
      ),
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1a1a2e",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();

  return (
    <html lang={getHtmlLang(locale)} suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        <Script id="strip-yd-root-attrs" strategy="beforeInteractive">
          {`(() => {
            const strip = () => {
              document.documentElement.removeAttribute("data-yd-content-ready");
              if (document.body) {
                document.body.removeAttribute("data-yd-content-ready");
              }
            };
            strip();
            const rootObserver = new MutationObserver(strip);
            rootObserver.observe(document.documentElement, {
              attributes: true,
              attributeFilter: ["data-yd-content-ready"],
            });
            let bodyObserver = null;
            const watchBody = () => {
              if (!document.body || bodyObserver) return;
              bodyObserver = new MutationObserver(strip);
              bodyObserver.observe(document.body, {
                attributes: true,
                attributeFilter: ["data-yd-content-ready"],
              });
            };
            watchBody();
            document.addEventListener("DOMContentLoaded", watchBody, { once: true });
            window.addEventListener("load", strip, { once: true });
            setTimeout(() => {
              rootObserver.disconnect();
              if (bodyObserver) bodyObserver.disconnect();
            }, 4000);
          })();`}
        </Script>
        <LocaleProvider initialLocale={locale}>
          <TurnstileProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </TurnstileProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
