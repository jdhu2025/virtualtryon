"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { t } from "@/lib/locale";
import { useLocale } from "@/contexts/locale-context";

interface SiteHeaderProps {
  sectionLinks?: boolean;
}

export function SiteHeader({ sectionLinks = false }: SiteHeaderProps) {
  const { locale } = useLocale();

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 lg:px-5">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <div className="glass-panel-strong mx-auto flex w-full max-w-7xl items-center justify-between rounded-[28px] px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#20183a] text-sm font-semibold text-white shadow-[0_16px_40px_rgba(32,24,58,0.24)]">
              AI
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1f2937]">
                {t(locale, "AI Outfit Assistant", "AI 穿搭助手")}
              </p>
              <p className="text-xs text-[#7b6887]">
                {t(locale, "Dress what you already own", "发现已有衣橱的潜力")}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-[#5b4b41] lg:flex">
            {sectionLinks ? (
              <>
                <a href="#benefits" className="transition-colors hover:text-[#d96d4f]">
                  {t(locale, "Benefits", "优势")}
                </a>
                <a href="#features" className="transition-colors hover:text-[#d96d4f]">
                  {t(locale, "Features", "功能")}
                </a>
                <a href="#pricing" className="transition-colors hover:text-[#d96d4f]">
                  {t(locale, "Pricing", "价格")}
                </a>
              </>
            ) : null}
            <Link href="/about" className="transition-colors hover:text-[#d96d4f]">
              {t(locale, "About", "关于我们")}
            </Link>
            <Link href="/blog" className="transition-colors hover:text-[#d96d4f]">
              {t(locale, "Blog", "博客")}
            </Link>
            <Link href="/contact" className="transition-colors hover:text-[#d96d4f]">
              {t(locale, "Contact", "联系我们")}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden border-white/60 bg-white/72 shadow-none sm:inline-flex" />
            <Link href="/auth/login">
              <Button variant="ghost" className="rounded-full text-[#5b4b41] hover:bg-white/60 hover:text-[#20183a]">
                {t(locale, "Log in", "登录")}
              </Button>
            </Link>
            <Link href="/auth/register" className="hidden sm:block">
              <Button className="rounded-full bg-[#20183a] text-white shadow-[0_16px_40px_rgba(32,24,58,0.22)] hover:bg-[#322655]">
                {t(locale, "Start free", "免费开始")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
