"use client";

import Link from "next/link";
import {
  Camera,
  Check,
  Heart,
  Shirt,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GradientCard } from "@/components/ui/gradient-card";
import { t, type Locale } from "@/lib/locale";

interface LoggedInHomeProps {
  wardrobeCount: number;
  isLoading: boolean;
  locale: Locale;
}

const unsplashImages = {
  continue:
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
  wardrobe:
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80",
  stylist:
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
  history:
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
} as const;

export function LoggedInHome({
  wardrobeCount,
  isLoading,
  locale,
}: LoggedInHomeProps) {
  const wardrobeSummary =
    wardrobeCount === 0
      ? t(
          locale,
          "Start with 2 to 3 everyday pieces and the assistant becomes useful right away.",
          "先录入 2 到 3 件常穿衣服，AI 就能很快开始给出靠谱建议。"
        )
      : wardrobeCount < 6
        ? t(
            locale,
            "You already have enough material for daily outfit suggestions.",
            "你已经有足够的素材来生成日常穿搭建议。"
          )
        : t(
            locale,
            "Your wardrobe is ready for richer combinations, repeats, and lighter planning.",
            "你的衣橱已经足够支撑更丰富的组合、复穿和更轻松的日常决策。"
          );

  const cards = [
    {
      badgeText: t(locale, "Most used", "高频入口"),
      badgeColor: "#F97316",
      title: t(locale, "Continue styling", "继续穿搭"),
      description: t(
        locale,
        "Recent chat context stays here, so you can jump back in without starting over.",
        "最近的聊天上下文会保留下来，回来就能继续，不需要重新开始。"
      ),
      ctaText: t(locale, "Open chat", "继续聊天"),
      ctaHref: "/chat",
      imageUrl: unsplashImages.continue,
      gradient: "orange" as const,
      wrapperClassName: "md:col-span-2",
      cardClassName: "min-h-[240px] sm:min-h-[260px]",
    },
    {
      badgeText: t(locale, "Wardrobe capture", "衣橱录入"),
      badgeColor: "#EA580C",
      title: t(locale, "Add from photo", "拍照添加"),
      description: t(
        locale,
        "Take one clear photo and let AI tag category, color, and style for you.",
        "拍一张清晰照片，AI 会自动识别类别、颜色和风格标签。"
      ),
      ctaText: t(locale, "Add a piece", "添加单品"),
      ctaHref: "/wardrobe/add",
      imageUrl: unsplashImages.wardrobe,
      gradient: "gray" as const,
      wrapperClassName: "",
      cardClassName: "min-h-[230px]",
    },
    {
      badgeText: t(locale, "Daily outfit", "今日搭配"),
      badgeColor: "#7C3AED",
      title: t(locale, "Ask AI stylist", "AI 穿搭"),
      description: t(
        locale,
        "Tell the assistant your mood, scene, or concern and get a wearable direction first.",
        "告诉 AI 今天的场景、心情或顾虑，先拿到一套真正能穿的方向。"
      ),
      ctaText: t(locale, "Start styling", "开始搭配"),
      ctaHref: "/chat",
      imageUrl: unsplashImages.stylist,
      gradient: "purple" as const,
      wrapperClassName: "",
      cardClassName: "min-h-[230px]",
    },
    {
      badgeText: t(locale, "Saved looks", "已保存方案"),
      badgeColor: "#10B981",
      title: t(locale, "Review outfit history", "查看历史"),
      description: t(
        locale,
        "Keep the looks you liked, compare what worked, and return to a good answer faster.",
        "把喜欢的搭配留住，对比哪些最适合自己，下次更快找到好答案。"
      ),
      ctaText: t(locale, "Open history", "查看历史"),
      ctaHref: "/history",
      imageUrl: unsplashImages.history,
      gradient: "green" as const,
      wrapperClassName: "md:col-span-2",
      cardClassName: "min-h-[220px] sm:min-h-[240px]",
    },
  ];

  const capabilities = [
    {
      icon: Shirt,
      title: t(locale, "Discover wardrobe potential", "发现衣橱潜力"),
      description: t(
        locale,
        "AI helps you find new combinations inside the pieces you already trust.",
        "AI 会在你已经熟悉和信任的衣服里，继续挖出新的组合。"
      ),
    },
    {
      icon: TrendingUp,
      title: t(locale, "Keep daily dressing fresh", "每天都有新鲜感"),
      description: t(
        locale,
        "The same wardrobe can support different moods without forcing endless browsing.",
        "同一套衣橱也能支撑不同状态，而不是让你反复浏览、越看越累。"
      ),
    },
    {
      icon: Heart,
      title: t(locale, "Save what feels like you", "记录最像你的搭配"),
      description: t(
        locale,
        "The product learns through lightweight feedback, so your preference memory grows naturally.",
        "通过很轻的反馈方式，产品会逐渐记住你的偏好，不需要你额外费劲训练。"
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#d7705f_0%,#d97a71_12%,#f7f1ec_30%,#fffdfb_100%)] pb-32">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1.5 text-xs font-medium tracking-[0.16em] text-white/90 backdrop-blur-sm uppercase">
              <Sparkles className="h-4 w-4" />
              {t(locale, "AI Closet Home", "AI 衣橱首页")}
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {t(locale, "Discover the beauty you already own", "发现你已经拥有的美")}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/84 sm:text-base">
              {t(
                locale,
                "Start from your real wardrobe, keep the flow light, and let AI help you decide faster on mobile or desktop.",
                "从你真实拥有的衣服开始，让流程保持轻盈，在手机和桌面上都能更快得到今天的搭配答案。"
              )}
            </p>
          </div>

          <LanguageSwitcher className="border-white/30 bg-white/90 shadow-[0_16px_40px_rgba(32,24,58,0.12)]" />
        </div>

        <Card className="mt-6 rounded-[28px] border-0 bg-white/92 p-5 shadow-[0_18px_55px_rgba(70,34,20,0.12)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#776a63]">
                {t(locale, "My wardrobe", "我的衣柜")}
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-semibold tracking-tight text-[#1f2937]">
                  {isLoading ? "-" : wardrobeCount}
                </span>
                <span className="pb-1 text-lg font-medium text-[#6b7280]">
                  {t(locale, "pieces", "件衣服")}
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
                {wardrobeSummary}
              </p>
            </div>

            <Link href="/wardrobe" className="sm:self-start">
              <Button
                variant="outline"
                className="h-11 rounded-full border-[#e6ddd8] bg-white px-5 text-[#1f2937] shadow-sm hover:bg-[#faf6f3]"
              >
                {t(locale, "Manage", "管理")}
              </Button>
            </Link>
          </div>
        </Card>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <div key={card.title} className={card.wrapperClassName}>
              <GradientCard
                badgeText={card.badgeText}
                badgeColor={card.badgeColor}
                title={card.title}
                description={card.description}
                ctaText={card.ctaText}
                ctaHref={card.ctaHref}
                imageUrl={card.imageUrl}
                gradient={card.gradient}
                className={card.cardClassName}
              />
            </div>
          ))}
        </div>

        <Card className="mt-6 rounded-[28px] border-0 bg-white/94 p-6 shadow-[0_18px_55px_rgba(70,34,20,0.1)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#de6f4f]">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#ca6d54]">
                {t(locale, "What you can do", "你可以做什么")}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-[#1f2937]">
                {t(locale, "Turn a small wardrobe into more daily answers", "把有限衣橱变成更多日常答案")}
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {capabilities.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-[24px] bg-[#fffaf7] px-4 py-4 ring-1 ring-[#f3e7df]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#de6f4f] shadow-sm">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1f2937]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] bg-[#1f2937] px-5 py-4 text-white">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/14">
                <Check className="h-4 w-4" />
              </div>
              <p className="text-sm leading-6 text-white/86">
                {t(
                  locale,
                  "You do not need to catalog everything up front. Add a few real pieces, keep chatting, and let the product earn the next step.",
                  "你不需要一开始就把整个衣橱录完。先放几件真实衣服，先开始聊，让产品先给出价值，再逐步补齐。"
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
