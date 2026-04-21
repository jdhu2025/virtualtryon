"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shirt,
  CheckCircle2,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoggedInHome } from "@/components/home/logged-in-home";
import { getCurrentUser } from "@/lib/auth-local";
import { SiteFooter } from "@/components/site-footer";
import ShaderShowcase from "@/components/ui/hero";
import { useLocale } from "@/contexts/locale-context";
import { t } from "@/lib/locale";

export default function HomePage() {
  const { locale } = useLocale();
  const [wardrobeCount, setWardrobeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    void loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = getCurrentUser();
      setIsLoggedIn(!!user);

      if (user) {
        const response = await fetch("/api/wardrobe");
        if (response.ok) {
          const data = await response.json();
          setWardrobeCount((data.items || []).length);
        } else {
          setWardrobeCount(0);
        }
      } else {
        setWardrobeCount(0);
      }
    } catch (error) {
      console.error("加载用户数据失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-gradient-shell min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-[#d96d4f]" />
          <p className="mt-4 text-sm text-[#8a6f5b]">{t(locale, "Preparing your space...", "正在准备页面...")}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <MarketingLandingPage locale={locale} />;
  }

  return <AppHomePage wardrobeCount={wardrobeCount} isLoading={isLoading} locale={locale} />;
}

function MarketingLandingPage({ locale }: { locale: "en" | "zh" }) {
  const benefits = [
    {
      title: t(locale, "Less hesitation before you head out", "减少每天出门前的犹豫"),
      description: t(locale, "Describe how today feels in one sentence and AI starts with one outfit you can actually wear.", "一句话说出今天的状态，AI 会先给你一套能直接执行的方案。"),
      icon: MessageSquareText,
    },
    {
      title: t(locale, "Make better use of the clothes you already own", "把已有衣服真正用起来"),
      description: t(locale, "The goal is not to buy more. It is to uncover the unused potential in your current wardrobe.", "重点不是继续买，而是把现有衣橱里的潜力重新挖出来。"),
      icon: Shirt,
    },
    {
      title: t(locale, "Build trust into the product itself", "把信任感做在产品里"),
      description: t(locale, "From privacy to refunds to feedback control, we want the experience to feel grounded and safe.", "从隐私到退款，再到反馈控制，都尽量让用户心里有底。"),
      icon: ShieldCheck,
    },
  ];

  const features = [
    {
      eyebrow: "1. Quick Intake",
      title: t(locale, "Upload directly and let the system detect portrait vs clothing", "直接上传图片，自动判断是人像还是衣服"),
      description: t(locale, "People should not have to learn a flow first. Drop an image into chat and the system can label it and route it to wardrobe or portraits.", "用户不用先理解复杂流程。把图扔进聊天框，系统自动识别、打标签、进衣橱或进我的照片。"),
    },
    {
      eyebrow: "2. Daily Decision",
      title: t(locale, "Start from a real need and get one main direction first", "输入一句真实诉求，先给 1 套主方案"),
      description: t(locale, "Instead of forcing people into rigid scenario labels, support real language like “I want to look slimmer” or “I don't want to overthink it today.”", "不像传统筛选器那样把人逼进‘场景标签’，而是支持‘想显瘦一点’‘今天不想费劲’这种真实语言。"),
    },
    {
      eyebrow: "3. Lightweight Memory",
      title: t(locale, "Keep chat history, keep feedback light, learn over time", "聊天记录保留、反馈极轻、越用越懂你"),
      description: t(locale, "People should not need to restart every time or write long reviews. Like / not for me / not today is enough to build preference memory.", "用户不用重新开始，也不用写长评。喜欢 / 不喜欢 / 今天不适合，就足够形成偏好记忆。"),
    },
  ];

  const earlySignals = [
    t(locale, "Compressing a complex styling product into a one-sentence decision tool lowers the learning cost.", "把复杂穿搭产品缩成一句话决策工具，理解成本更低。"),
    t(locale, "Letting people upload portraits and clothes straight inside chat reduces first-day friction.", "聊天里直接上传人像和衣服，首日启动摩擦更小。"),
    t(locale, "Remembering common prompts and custom inputs makes the second session much easier to start.", "常用诉求和自定义输入都能被记住，能明显降低第二次使用门槛。"),
  ];

  const pricing = [
    {
      name: t(locale, "Starter", "体验版"),
      price: t(locale, "Free", "免费"),
      note: t(locale, "Best for trying it yourself", "适合个人试用"),
      bullets: [
        t(locale, "Basic wardrobe intake", "基础衣橱录入"),
        t(locale, "Chat-based outfit help", "聊天式穿搭推荐"),
        t(locale, "Recent history saved", "最近记录保留"),
      ],
      featured: false,
    },
    {
      name: "Plus",
      price: t(locale, "Coming soon", "即将开放"),
      note: t(locale, "Best for frequent users", "适合高频使用者"),
      bullets: [
        t(locale, "More stable try-on generation", "更稳定的试穿生成"),
        t(locale, "More preference memory", "更多偏好记忆"),
        t(locale, "Longer chat and history retention", "更长聊天与历史保留"),
      ],
      featured: true,
    },
    {
      name: t(locale, "Team", "团队版"),
      price: t(locale, "Talk to sales", "联系销售"),
      note: t(locale, "Best for content and retail teams", "适合内容/零售团队"),
      bullets: [
        t(locale, "Multi-user collaboration", "多人协作"),
        t(locale, "Brand knowledge base", "品牌知识库"),
        t(locale, "Custom deployment support", "定制化部署支持"),
      ],
      featured: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#fffaf5] text-[#1f2937]">
      <ShaderShowcase locale={locale} />

      <main className="bg-[#fffaf5]">
        <section id="benefits" className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
          <div className="rounded-[32px] bg-[#f1fbf6] px-6 py-8">
            <p className="text-center text-sm font-medium uppercase tracking-[0.18em] text-[#5e8d78]">Benefits</p>
            <h2 className="mt-3 text-center text-3xl font-semibold text-[#1f2937]">{t(locale, "Core advantages", "核心优势")}</h2>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {benefits.map((item) => (
                <Card key={item.title} className="rounded-[24px] border-0 bg-white p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff8f3] text-[#5e8d78]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[#1f2937]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#6b5a4d]">{item.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b8684c]">Features</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#1f2937]">{t(locale, "How it works", "功能介绍")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#6b5a4d]">
              {t(locale, "From low-friction intake to daily outfit decisions to lightweight feedback memory, the focus stays on the moments people use most often.", "从低门槛录入，到今天穿什么，再到轻反馈记忆，重点都围绕真实使用频率最高的环节。")}
            </p>
          </div>

          <div className="mt-10 grid gap-6">
            {features.map((item, index) => (
              <div
                key={item.title}
                className={`grid gap-6 rounded-[32px] border border-[#eaded2] bg-white p-6 shadow-sm lg:grid-cols-[1fr_0.9fr] lg:items-center ${
                  index % 2 === 1 ? "lg:grid-cols-[0.9fr_1fr]" : ""
                }`}
              >
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  <p className="text-sm font-medium text-[#b8684c]">{item.eyebrow}</p>
                  <h3 className="mt-3 text-2xl font-semibold text-[#1f2937]">{item.title}</h3>
                  <p className="mt-4 text-base leading-7 text-[#6b5a4d]">{item.description}</p>
                </div>
                <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                  <div className="rounded-[28px] bg-[#f8f2ec] p-5">
                    <div className="rounded-[22px] border border-[#eaded2] bg-white p-4 shadow-sm">
                      <div className="grid gap-3">
                        <div className="h-10 rounded-2xl bg-[#fff7f1]" />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="h-28 rounded-2xl bg-[#f4ebe3]" />
                          <div className="h-28 rounded-2xl bg-[#f4ebe3]" />
                        </div>
                        <div className="h-16 rounded-2xl bg-[#f4ebe3]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-4 lg:px-8 lg:py-8">
          <div className="rounded-[32px] bg-[#fff7cc] px-6 py-8">
            <p className="text-center text-sm font-medium uppercase tracking-[0.18em] text-[#9f7d0a]">Signals</p>
            <h2 className="mt-3 text-center text-3xl font-semibold text-[#1f2937]">{t(locale, "Early usage signals", "早期体验反馈")}</h2>
            <div className="mt-8 grid gap-4">
              {earlySignals.map((item) => (
                <Card key={item} className="rounded-[24px] border-0 bg-[#fff4a8] px-5 py-4 text-[#5c4a18] shadow-none">
                  {item}
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-14">
          <div className="rounded-[36px] border border-[#f1cfc2] bg-[#ffe8df] px-6 py-10 text-center shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b8684c]">CTA</p>
            <h2 className="mt-4 text-3xl font-semibold text-[#1f2937]">{t(locale, "Start with 1 portrait + 2 clothes", "先从 1 张人像 + 2 件衣服开始")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#6b5a4d]">
              {t(locale, "Do not ask people to catalogue everything up front. Give value first, then ask for more data later.", "不要求用户先整理完整衣橱。先给价值，再要求补数据，才更符合真实使用习惯。")}
            </p>
            <div className="mt-8">
              <Link href="/auth/register">
                <Button className="rounded-full bg-[#d96d4f] px-8 py-6 text-base text-white hover:bg-[#bf5b3f]">
                  {t(locale, "Start free now", "立即开始免费试用")}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
          <div className="rounded-[32px] border border-[#dad4f0] bg-[#ece8fb] px-6 py-8">
            <p className="text-center text-sm font-medium uppercase tracking-[0.18em] text-[#6d5cc7]">Pricing</p>
            <h2 className="mt-3 text-center text-3xl font-semibold text-[#1f2937]">{t(locale, "Pricing", "价格方案")}</h2>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {pricing.map((item) => (
                <Card
                  key={item.name}
                  className={`rounded-[24px] border-0 p-6 ${
                    item.featured ? "bg-[#cdbdf7] text-[#1f2937]" : "bg-white text-[#1f2937]"
                  }`}
                >
                  <p className="text-lg font-semibold">{item.name}</p>
                  <p className="mt-3 text-3xl font-semibold">{item.price}</p>
                  <p className="mt-2 text-sm text-[#6b5a4d]">{item.note}</p>
                  <div className="mt-6 space-y-3 text-sm text-[#4b5563]">
                    {item.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#d96d4f]" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function AppHomePage({
  wardrobeCount,
  isLoading,
  locale,
}: {
  wardrobeCount: number;
  isLoading: boolean;
  locale: "en" | "zh";
}) {
  return (
    <LoggedInHome
      wardrobeCount={wardrobeCount}
      isLoading={isLoading}
      locale={locale}
    />
  );
}
