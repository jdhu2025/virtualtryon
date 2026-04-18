"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Shirt,
  ArrowRight,
  Sparkles,
  Heart,
  TrendingUp,
  CheckCircle2,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth-local";
import { PublicPageShell } from "@/components/public-page-shell";

export default function HomePage() {
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
      <div className="min-h-screen flex items-center justify-center bg-[#f7efe7]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-[#d96d4f]" />
          <p className="mt-4 text-sm text-[#8a6f5b]">正在准备页面...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <MarketingLandingPage />;
  }

  return <AppHomePage wardrobeCount={wardrobeCount} isLoading={isLoading} />;
}

function MarketingLandingPage() {
  const benefits = [
    {
      title: "减少每天出门前的犹豫",
      description: "一句话说出今天的状态，AI 会先给你一套能直接执行的方案。",
      icon: MessageSquareText,
    },
    {
      title: "把已有衣服真正用起来",
      description: "重点不是继续买，而是把现有衣橱里的潜力重新挖出来。",
      icon: Shirt,
    },
    {
      title: "把信任感做在产品里",
      description: "从隐私到退款，再到反馈控制，都尽量让用户心里有底。",
      icon: ShieldCheck,
    },
  ];

  const features = [
    {
      eyebrow: "1. Quick Intake",
      title: "直接上传图片，自动判断是人像还是衣服",
      description: "用户不用先理解复杂流程。把图扔进聊天框，系统自动识别、打标签、进衣橱或进我的照片。",
    },
    {
      eyebrow: "2. Daily Decision",
      title: "输入一句真实诉求，先给 1 套主方案",
      description: "不像传统筛选器那样把人逼进‘场景标签’，而是支持‘想显瘦一点’‘今天不想费劲’这种真实语言。",
    },
    {
      eyebrow: "3. Lightweight Memory",
      title: "聊天记录保留、反馈极轻、越用越懂你",
      description: "用户不用重新开始，也不用写长评。喜欢 / 不喜欢 / 今天不适合，就足够形成偏好记忆。",
    },
  ];

  const earlySignals = [
    "把复杂穿搭产品缩成一句话决策工具，理解成本更低。",
    "聊天里直接上传人像和衣服，首日启动摩擦更小。",
    "常用诉求和自定义输入都能被记住，能明显降低第二次使用门槛。",
  ];

  const pricing = [
    {
      name: "体验版",
      price: "免费",
      note: "适合个人试用",
      bullets: ["基础衣橱录入", "聊天式穿搭推荐", "最近记录保留"],
      featured: false,
    },
    {
      name: "Plus",
      price: "即将开放",
      note: "适合高频使用者",
      bullets: ["更稳定的试穿生成", "更多偏好记忆", "更长聊天与历史保留"],
      featured: true,
    },
    {
      name: "团队版",
      price: "联系销售",
      note: "适合内容/零售团队",
      bullets: ["多人协作", "品牌知识库", "定制化部署支持"],
      featured: false,
    },
  ];

  return (
    <PublicPageShell sectionLinks>
      <main>
        <section className="overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-24">
            <div>
              <div className="inline-flex rounded-full border border-[#efcdbd] bg-[#fff7f1] px-4 py-2 text-sm text-[#b8684c]">
                AI Closet Copilot for daily dressing
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight text-[#1f2937] lg:text-6xl">
                让用户用更少的脑力，
                <br />
                穿出今天最稳的一套。
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6b5a4d]">
                AI 穿搭助手不是要你买更多，而是帮你把已经拥有的衣服，变成今天能放心穿出去的一套。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/auth/register">
                  <Button className="rounded-full bg-[#d96d4f] px-6 py-6 text-base text-white hover:bg-[#bf5b3f]">
                    免费试用
                  </Button>
                </Link>
                <a href="#features">
                  <Button
                    variant="outline"
                    className="rounded-full border-[#d7c4b7] bg-white px-6 py-6 text-base text-[#5b4b41] hover:bg-[#fffaf5]"
                  >
                    了解更多
                  </Button>
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-4 text-sm text-[#6b5a4d]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#d96d4f]" />
                  服务条款与隐私页面已就位
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#d96d4f]" />
                  登录后直接进入主页面
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-[#ffd9c9]/60 blur-3xl" />
              <div className="absolute -right-6 bottom-8 h-40 w-40 rounded-full bg-[#fff0b8]/70 blur-3xl" />
              <div className="relative rounded-[32px] border border-[#eaded2] bg-white p-5 shadow-[0_30px_80px_rgba(158,103,74,0.12)]">
                <div className="rounded-[24px] bg-[#f8f2ec] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#8a6f5b]">今天穿什么</p>
                      <p className="mt-1 text-2xl font-semibold text-[#1f2937]">先给 1 套主方案</p>
                    </div>
                    <div className="rounded-full bg-[#fff7f1] px-3 py-1 text-xs text-[#b8684c]">
                      聊天式输入
                    </div>
                  </div>

                  <div className="mt-5 rounded-[20px] bg-white p-4 shadow-sm">
                    <p className="text-sm text-[#8a6f5b]">用户输入</p>
                    <p className="mt-2 rounded-2xl bg-[#f4ebe3] px-4 py-3 text-sm text-[#3b2f28]">
                      / 想显瘦一点，但今天不想太费劲
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
                    <div className="rounded-[20px] bg-white p-4 shadow-sm">
                      <p className="text-sm text-[#8a6f5b]">AI 给出的理由</p>
                      <p className="mt-2 text-sm leading-6 text-[#3b2f28]">
                        用深色上装 + 直线感下装，先保住显瘦和稳妥，再减少过度搭配带来的负担。
                      </p>
                    </div>
                    <div className="rounded-[20px] bg-white p-4 shadow-sm">
                      <p className="text-sm text-[#8a6f5b]">轻反馈</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {["喜欢", "不喜欢", "今天不适合"].map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-[#eaded2] bg-[#fffaf5] px-3 py-2 text-xs text-[#5b4b41]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="benefits" className="mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-10">
          <div className="rounded-[32px] bg-[#f1fbf6] px-6 py-8">
            <p className="text-center text-sm font-medium uppercase tracking-[0.18em] text-[#5e8d78]">Benefits</p>
            <h2 className="mt-3 text-center text-3xl font-semibold text-[#1f2937]">核心优势</h2>
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
            <h2 className="mt-3 text-3xl font-semibold text-[#1f2937]">功能介绍</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#6b5a4d]">
              从低门槛录入，到今天穿什么，再到轻反馈记忆，重点都围绕真实使用频率最高的环节。
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
            <h2 className="mt-3 text-center text-3xl font-semibold text-[#1f2937]">早期体验反馈</h2>
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
            <h2 className="mt-4 text-3xl font-semibold text-[#1f2937]">先从 1 张人像 + 2 件衣服开始</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#6b5a4d]">
              不要求用户先整理完整衣橱。先给价值，再要求补数据，才更符合真实使用习惯。
            </p>
            <div className="mt-8">
              <Link href="/auth/register">
                <Button className="rounded-full bg-[#d96d4f] px-8 py-6 text-base text-white hover:bg-[#bf5b3f]">
                  立即开始免费试用
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
          <div className="rounded-[32px] border border-[#dad4f0] bg-[#ece8fb] px-6 py-8">
            <p className="text-center text-sm font-medium uppercase tracking-[0.18em] text-[#6d5cc7]">Pricing</p>
            <h2 className="mt-3 text-center text-3xl font-semibold text-[#1f2937]">价格方案</h2>
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
    </PublicPageShell>
  );
}

function AppHomePage({ wardrobeCount, isLoading }: { wardrobeCount: number; isLoading: boolean }) {
  const quickActions = [
    {
      title: "拍照添加",
      description: "拍一张衣服照片",
      icon: Camera,
      href: "/wardrobe/add",
      color: "bg-[#d96d4f]",
    },
    {
      title: "AI 穿搭",
      description: "让 AI 帮你搭配",
      icon: Sparkles,
      href: "/chat",
      color: "bg-[#6d5cc7]",
    },
  ];

  const features = [
    {
      title: "发现衣橱潜力",
      description: "AI 帮你发现已有衣服的新搭配",
      icon: Shirt,
    },
    {
      title: "每日新鲜感",
      description: "同样的衣服，穿出不同的风格",
      icon: TrendingUp,
    },
    {
      title: "记录你的美",
      description: "收藏喜欢的穿搭方案",
      icon: Heart,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff5ef] via-white to-[#f4ecff] pb-20">
      <div className="bg-gradient-to-r from-[#d96d4f] to-[#c66f8a] px-6 py-10 text-white">
        <h1 className="text-3xl font-bold mb-2">AI 穿搭助手</h1>
        <p className="text-[#ffe9df] text-lg">发现你已经拥有的美</p>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        <Card className="p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">我的衣柜</p>
              <p className="text-3xl font-bold text-gray-900">
                {isLoading ? "-" : wardrobeCount}
                <span className="text-base font-normal text-gray-500 ml-1">件衣服</span>
              </p>
            </div>
            <Link href="/wardrobe">
              <Button variant="outline" size="sm">
                管理
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>

        <Link href="/chat">
          <Card className="p-5 shadow-lg bg-gradient-to-r from-[#fff4ef] to-[#fff8f4] border-[#f4d6c8]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[#b8684c]">高频入口</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">继续穿搭</h2>
                <p className="mt-2 text-sm text-gray-600">最近的聊天记录会保留，回到这里就能继续聊，不会重置。</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#f08f6e] flex items-center justify-center text-white shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className={`${action.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">{action.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{action.description}</p>
              </Card>
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">你可以做什么</h2>
          <div className="space-y-4">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="bg-[#fff1ea] w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-4 w-4 text-[#d96d4f]" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">{feature.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
