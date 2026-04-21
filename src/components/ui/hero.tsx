"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MeshGradient, PulsingBorder } from "@paper-design/shaders-react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Shirt, Sparkles } from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { t, type Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";

interface ShaderShowcaseProps {
  locale?: Locale;
  className?: string;
}

const orbitLabels = {
  en: "AI Outfit Assistant • Dress what you already own • ",
  zh: "AI 穿搭助手 • 发现你已拥有的美 • ",
} as const;

const previewSteps = {
  en: [
    "1 photo of you",
    "2 to 3 real clothes",
    "1 plain-language request",
  ],
  zh: [
    "1 张本人照片",
    "2 到 3 件真实衣服",
    "1 句自然语言需求",
  ],
} as const;

export default function ShaderShowcase({
  locale = "en",
  className,
}: ShaderShowcaseProps) {
  const [isMounted, setIsMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const allowMotion = isMounted && !shouldReduceMotion;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section
      className={cn(
        "relative min-h-screen overflow-hidden bg-black text-white",
        className
      )}
    >
      <svg className="absolute inset-0 h-0 w-0">
        <defs>
          <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.004" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.22" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0.02
                      0 1 0 0 0.02
                      0 0 1 0 0.06
                      0 0 0 0.94 0"
            />
          </filter>
          <filter id="gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
          <filter id="text-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {isMounted ? (
        <MeshGradient
          className="absolute inset-0 h-full w-full"
          colors={["#000000", "#06b6d4", "#164e63", "#f97316", "#e2e8f0"]}
          speed={0.24}
        />
      ) : null}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_78%,rgba(249,115,22,0.4),transparent_32%),radial-gradient(circle_at_58%_30%,rgba(6,182,212,0.38),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.28),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.62))]" />
      <div className="absolute inset-0 bg-black/14" />

      <header className="relative z-20 px-4 pb-2 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-3">
                <motion.div
                  whileHover={allowMotion ? { scale: 1.04 } : undefined}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black shadow-[0_10px_40px_rgba(255,255,255,0.16)]"
                >
                  <Shirt className="h-5 w-5" />
                </motion.div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    {t(locale, "AI Outfit Assistant", "AI 穿搭助手")}
                  </p>
                  <p className="text-xs text-white/65">
                    {t(locale, "Dress what you already own", "发现你已拥有的美")}
                  </p>
                </div>
              </Link>

              <LanguageSwitcher tone="dark" className="shadow-none lg:hidden" />
            </div>

            <nav className="scrollbar-hide flex items-center gap-2 overflow-x-auto text-xs sm:text-sm">
              <a
                href="#benefits"
                className="rounded-full px-3 py-2 text-white/78 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t(locale, "Benefits", "优势")}
              </a>
              <a
                href="#features"
                className="rounded-full px-3 py-2 text-white/78 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t(locale, "Features", "功能")}
              </a>
              <a
                href="#pricing"
                className="rounded-full px-3 py-2 text-white/78 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t(locale, "Pricing", "价格")}
              </a>
              <Link
                href="/blog"
                className="rounded-full px-3 py-2 text-white/78 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t(locale, "Blog", "博客")}
              </Link>
            </nav>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <LanguageSwitcher tone="dark" className="hidden shadow-none lg:inline-flex" />
              <Link
                href="/auth/login"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
              >
                {t(locale, "Login", "登录")}
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full border border-white/18 bg-white/8 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/12"
              >
                {t(locale, "Start free", "免费开始")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-20 mx-auto flex min-h-[calc(100vh-112px)] max-w-7xl items-end px-4 pb-10 pt-10 sm:px-6 sm:pb-14 lg:px-8 lg:pb-18">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="max-w-3xl">
            <motion.div
              className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white/88 backdrop-blur-sm"
              style={{ filter: "url(#glass-effect)" }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              <Sparkles className="mr-2 h-4 w-4 text-cyan-300" />
              {t(
                locale,
                "A calmer way to decide what to wear",
                "一种更轻松的每日穿搭方式"
              )}
            </motion.div>

            <motion.h1
              className="mt-6 text-[2.8rem] font-black leading-[0.92] tracking-[-0.05em] sm:text-[4.4rem] lg:text-[7rem]"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.2 }}
            >
              <span
                className="block text-[0.5em] font-light tracking-[0.02em]"
                style={{
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #67e8f9 35%, #fb923c 78%, #ffffff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "url(#text-glow)",
                }}
              >
                {t(locale, "Discover the style", "发现你已经拥有的")}
              </span>
              <span className="mt-1 block drop-shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
                {t(locale, "You Already Own", "搭配潜力")}
              </span>
              <span className="mt-1 block font-light italic text-white/82">
                {t(locale, "Beautifully", "而不是继续买更多")}
              </span>
            </motion.h1>

            <motion.p
              className="mt-6 max-w-2xl text-base leading-8 text-white/72 sm:text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.35 }}
            >
              {t(
                locale,
                "Start with real pieces from your wardrobe, explain what today needs in plain language, and let AI give you one wearable direction first.",
                "从你已经拥有的真实衣服开始，用一句自然语言说出今天的需求，再让 AI 先给你一套真正能穿出去的方向。"
              )}
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.45 }}
            >
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-orange-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(14,165,233,0.25)] transition-transform hover:scale-[1.02]"
              >
                {t(locale, "Get Started", "免费开始")}
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-full border border-white/26 bg-white/6 px-7 py-3.5 text-sm font-medium text-white/88 backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                {t(locale, "View Pricing", "查看价格")}
              </a>
            </motion.div>

            <motion.div
              className="mt-8 grid gap-3 text-sm text-white/70 sm:max-w-xl sm:grid-cols-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.55 }}
            >
              {previewSteps[locale].map((step) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm"
                >
                  {step}
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            className="relative lg:justify-self-end"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="relative overflow-hidden rounded-[32px] border border-white/12 bg-white/8 p-4 shadow-[0_30px_80px_rgba(2,6,23,0.32)] backdrop-blur-2xl sm:p-5 lg:max-w-[26rem]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.16),transparent_34%)]" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-white/56">
                  <span>{t(locale, "Live flow", "实时体验")}</span>
                  <span>{t(locale, "Mobile ready", "支持手机")}</span>
                </div>

                <div className="rounded-[26px] border border-white/12 bg-black/28 p-4">
                  <p className="text-sm font-medium text-white/66">
                    {t(locale, "Today I want...", "今天我想...")}
                  </p>
                  <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-6 text-white/90">
                    {t(
                      locale,
                      "Look slimmer for work, but keep it low effort.",
                      "去上班想显瘦一点，但今天别太费劲。"
                    )}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/50">
                      {t(locale, "AI reason", "AI 理由")}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/82">
                      {t(
                        locale,
                        "Anchor with a darker top and a cleaner lower line so the look stays office-safe, slimmer, and easy to repeat.",
                        "先用深色上装和更干净的下半身线条做主轴，让整套看起来更稳妥、显瘦，也更容易复穿。"
                      )}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/50">
                      {t(locale, "Feedback", "轻反馈")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[t(locale, "Like", "喜欢"), t(locale, "Not for me", "不喜欢"), t(locale, "Not today", "今天不适合")].map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs text-white/82"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/8 px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {t(locale, "Start with less setup", "从更少的准备开始")}
                    </p>
                    <p className="mt-1 text-xs text-white/58">
                      {t(
                        locale,
                        "You do not need a full wardrobe before it becomes useful.",
                        "不需要先录完整个衣橱，产品就可以开始给你价值。"
                      )}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/72" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <div className="absolute bottom-5 right-5 z-30 hidden sm:block">
        <div className="relative h-20 w-20">
          {isMounted ? (
            <PulsingBorder
              colors={["#06b6d4", "#0891b2", "#f97316", "#22c55e", "#ffffff"]}
              colorBack="#00000000"
              speed={1.3}
              roundness={1}
              thickness={0.1}
              softness={0.2}
              intensity={0.55}
              bloom={0.75}
              spots={5}
              spotSize={0.1}
              pulse={0.12}
              smoke={0.45}
              smokeSize={0.42}
              scale={0.65}
              rotation={0}
              style={{ width: "60px", height: "60px", borderRadius: "9999px" }}
            />
          ) : (
            <div className="h-[60px] w-[60px] rounded-full border border-white/30 bg-white/6" />
          )}

          <motion.svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            animate={allowMotion ? { rotate: 360 } : undefined}
            transition={
              allowMotion
                ? {
                    duration: 18,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }
                : undefined
            }
            style={{ transform: "scale(1.7)" }}
          >
            <defs>
              <path id="orbit-circle" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
            </defs>
            <text className="fill-white/78 text-[10px] font-medium tracking-[0.12em]">
              <textPath href="#orbit-circle" startOffset="0%">
                {orbitLabels[locale].repeat(2)}
              </textPath>
            </text>
          </motion.svg>
        </div>
      </div>
    </section>
  );
}
