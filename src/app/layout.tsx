import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";

export const metadata: Metadata = {
  title: "AI穿搭助手 - 用已有衣物，发现全新可能",
  description: "通过AI智能搭配，让你的衣柜焕发新生。每天出门前，获得专属穿搭建议。",
  keywords: ["AI穿搭", "虚拟试衣", "智能衣柜", "每日穿搭", "搭配推荐"],
  authors: [{ name: "AI穿搭助手" }],
  openGraph: {
    title: "AI穿搭助手",
    description: "用已有衣物，发现全新可能",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1a1a2e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
