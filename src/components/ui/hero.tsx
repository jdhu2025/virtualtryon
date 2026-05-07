import Link from "next/link";
import { ArrowRight, Check, Shirt, Sparkles } from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { t, type Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";

interface ShaderShowcaseProps {
  locale?: Locale;
  className?: string;
}

const previewSteps = {
  en: [
    "1 photo of you",
    "2 to 3 real clothes",
    "1 plain-language request",
  ],
  zh: ["1 张本人照片", "2 到 3 件真实衣服", "1 句自然语言需求"],
} as const;

export default function ShaderShowcase({
  locale = "en",
  className,
}: ShaderShowcaseProps) {
  return (
    <section
      className={cn(
        "relative min-h-screen overflow-hidden bg-[#11130f] text-white",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_74%,rgba(196,95,58,0.36),transparent_31%),radial-gradient(circle_at_72%_28%,rgba(65,126,118,0.34),transparent_30%),linear-gradient(135deg,#11130f_0%,#1a231f_48%,#2a211a_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#f8f4ee] to-transparent" />

      <header className="relative z-20 px-4 pb-2 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        <div className="mx-auto max-w-7xl rounded-lg border border-white/12 bg-[#11130f]/45 px-4 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" prefetch={false} className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#f8f4ee] text-[#11130f] shadow-[0_10px_40px_rgba(255,255,255,0.12)]">
                  <Shirt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t(locale, "AI Outfit Assistant", "AI 穿搭助手")}
                  </p>
                  <p className="text-xs text-white/70">
                    {t(locale, "Dress what you already own", "发现你已拥有的美")}
                  </p>
                </div>
              </Link>

              <LanguageSwitcher tone="dark" className="shadow-none lg:hidden" />
            </div>

            <nav className="scrollbar-hide flex items-center gap-2 overflow-x-auto text-xs sm:text-sm">
              <a
                href="#benefits"
                className="rounded-md px-3 py-2 text-white/82 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t(locale, "Benefits", "优势")}
              </a>
              <a
                href="#features"
                className="rounded-md px-3 py-2 text-white/82 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t(locale, "Features", "功能")}
              </a>
              <a
                href="#pricing"
                className="rounded-md px-3 py-2 text-white/82 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t(locale, "Pricing", "价格")}
              </a>
              <Link
                href="/blog"
                prefetch={false}
                className="rounded-md px-3 py-2 text-white/82 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t(locale, "Blog", "博客")}
              </Link>
            </nav>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <LanguageSwitcher
                tone="dark"
                className="hidden shadow-none lg:inline-flex"
              />
              <Link
                href="/auth/login"
                prefetch={false}
                className="rounded-md bg-[#f8f4ee] px-5 py-2.5 text-sm font-medium text-[#11130f] transition-colors hover:bg-white"
              >
                {t(locale, "Login", "登录")}
              </Link>
              <Link
                href="/auth/register"
                prefetch={false}
                className="rounded-md border border-white/18 bg-white/8 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/12"
              >
                {t(locale, "Start free", "免费开始")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-20 mx-auto flex min-h-[calc(100vh-112px)] max-w-7xl items-end px-4 pb-14 pt-10 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_0.86fr] lg:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-md border border-white/12 bg-white/6 px-3 py-2 text-sm text-white/88 backdrop-blur-sm">
              <Sparkles className="mr-2 h-4 w-4 text-[#d8a172]" />
              {t(
                locale,
                "A calmer way to decide what to wear",
                "一种更轻松的每日穿搭方式"
              )}
            </div>

            <h1 className="mt-6 font-display text-5xl font-semibold leading-[0.96] text-[#f8f4ee] sm:text-7xl lg:text-8xl">
              <span className="block text-[0.54em] font-normal text-[#b9d4cb]">
                {t(locale, "Discover the style", "发现你已经拥有的")}
              </span>
              <span className="mt-2 block">
                {t(locale, "You Already Own", "搭配潜力")}
              </span>
              <span className="mt-1 block font-normal italic text-white/80">
                {t(locale, "Beautifully", "而不是继续买更多")}
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
              {t(
                locale,
                "Start with real pieces from your wardrobe, explain what today needs in plain language, and let AI give you one wearable direction first.",
                "从你已经拥有的真实衣服开始，用一句自然语言说出今天的需求，再让 AI 先给你一套真正能穿出去的方向。"
              )}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/auth/register"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-md bg-[#d97545] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(217,117,69,0.22)] transition-colors hover:bg-[#c86638]"
              >
                {t(locale, "Get Started", "免费开始")}
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-md border border-white/26 bg-white/6 px-7 py-3.5 text-sm font-medium text-white/88 backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                {t(locale, "View Pricing", "查看价格")}
              </a>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-white/76 sm:max-w-xl sm:grid-cols-3">
              {previewSteps[locale].map((step) => (
                <div
                  key={step}
                  className="rounded-md border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:justify-self-end">
            <div className="relative border border-white/12 bg-[#f8f4ee] p-4 text-[#171a15] shadow-[0_30px_90px_rgba(2,6,23,0.34)] sm:p-5 lg:max-w-[27rem]">
              <div className="border border-[#d8cec0] bg-white p-4">
                <div className="flex items-center justify-between border-b border-[#e7ded2] pb-3 text-[11px] uppercase text-[#817466]">
                  <span>{t(locale, "Daily outfit brief", "每日穿搭简报")}</span>
                  <span>{t(locale, "Mobile ready", "支持手机")}</span>
                </div>

                <div className="mt-4 border border-[#e7ded2] bg-[#fbf7f0] p-4">
                  <p className="text-sm font-medium text-[#6f6256]">
                    {t(locale, "Today I want...", "今天我想...")}
                  </p>
                  <p className="mt-3 border-l-2 border-[#d97545] bg-white px-4 py-3 text-sm leading-6 text-[#242821]">
                    {t(
                      locale,
                      "Look slimmer for work, but keep it low effort.",
                      "去上班想显瘦一点，但今天别太费劲。"
                    )}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="border border-[#e7ded2] bg-white p-4">
                    <p className="text-xs uppercase text-[#817466]">
                      {t(locale, "AI reason", "AI 理由")}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#4c453d]">
                      {t(
                        locale,
                        "Anchor with a darker top and a cleaner lower line so the look stays office-safe, slimmer, and easy to repeat.",
                        "先用深色上装和更干净的下半身线条做主轴，让整套看起来更稳妥、显瘦，也更容易复穿。"
                      )}
                    </p>
                  </div>

                  <div className="border border-[#e7ded2] bg-white p-4">
                    <p className="text-xs uppercase text-[#817466]">
                      {t(locale, "Feedback", "轻反馈")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        t(locale, "Like", "喜欢"),
                        t(locale, "Not for me", "不喜欢"),
                        t(locale, "Not today", "今天不适合"),
                      ].map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 rounded-md border border-[#e7ded2] bg-[#fbf7f0] px-2.5 py-2 text-xs text-[#4c453d]"
                        >
                          <Check className="h-3 w-3 text-[#4f8176]" />
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border border-[#d8cec0] bg-[#171a15] px-4 py-4 text-white">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {t(locale, "Start with less setup", "从更少的准备开始")}
                    </p>
                    <p className="mt-1 text-xs text-white/66">
                      {t(
                        locale,
                        "You do not need a full wardrobe before it becomes useful.",
                        "不需要先录完整个衣橱，产品就可以开始给你价值。"
                      )}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#d8a172]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}
