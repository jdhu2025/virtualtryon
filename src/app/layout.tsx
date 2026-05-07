import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { LocaleProvider } from "@/contexts/locale-context";
import { TurnstileProvider } from "@/contexts/turnstile-context";
import { getHtmlLang, t } from "@/lib/locale";
import { getServerLocale } from "@/lib/locale-server";

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://virtualtryon.dpdns.org"
);

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const title = t(
    locale,
    "AI Outfit Assistant - Make More of What You Already Own",
    "AI穿搭助手 - 用已有衣物，发现全新可能"
  );
  const description = t(
    locale,
    "Get AI outfit suggestions from the clothes you already own, with wardrobe memory, styling help, and virtual try-on support.",
    "通过AI智能搭配，让你的衣柜焕发新生。每天出门前，获得专属穿搭建议。"
  );

  return {
    metadataBase: siteUrl,
    title,
    description,
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
    alternates: {
      canonical: "/",
    },
    manifest: "/manifest.webmanifest",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: "/",
      siteName: t(locale, "AI Outfit Assistant", "AI穿搭助手"),
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: t(
            locale,
            "AI Outfit Assistant virtual wardrobe styling preview",
            "AI穿搭助手虚拟衣橱搭配预览"
          ),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
