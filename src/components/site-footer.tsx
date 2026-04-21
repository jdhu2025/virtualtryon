"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { t } from "@/lib/locale";
import { useLocale } from "@/contexts/locale-context";

export function SiteFooter() {
  const { locale } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#eaded2] bg-[#fffaf5]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 text-sm text-[#6d5a4c] lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d96d4f] text-sm font-semibold text-white">
              AI
            </div>
            <div>
              <p className="font-semibold text-[#1f2937]">
                {t(locale, "AI Outfit Assistant", "AI 穿搭助手")}
              </p>
              <p className="text-xs text-[#8a6f5b]">
                {t(locale, "Look better with what you already own.", "少买一点，也能穿得更好看。")}
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-md leading-6">
            {t(
              locale,
              "Help people make one solid outfit decision with less mental overhead.",
              "帮助用户用更少的决策成本，找到今天可以直接穿出去的一套。"
            )}
          </p>
          <div className="mt-4">
            <LanguageSwitcher />
          </div>
        </div>

        <div>
          <p className="font-semibold text-[#1f2937]">{t(locale, "Product", "产品")}</p>
          <div className="mt-4 space-y-3">
            <Link href="/auth/register" className="block hover:text-[#d96d4f]">
              {t(locale, "Start free", "免费开始")}
            </Link>
            <Link href="/auth/login" className="block hover:text-[#d96d4f]">
              {t(locale, "Log in", "登录")}
            </Link>
            <Link href="/blog" className="block hover:text-[#d96d4f]">
              {t(locale, "Blog", "博客")}
            </Link>
          </div>
        </div>

        <div>
          <p className="font-semibold text-[#1f2937]">{t(locale, "Company", "公司")}</p>
          <div className="mt-4 space-y-3">
            <Link href="/about" className="block hover:text-[#d96d4f]">
              {t(locale, "About", "关于我们")}
            </Link>
            <Link href="/contact" className="block hover:text-[#d96d4f]">
              {t(locale, "Contact", "联系我们")}
            </Link>
            <Link href="/refund" className="block hover:text-[#d96d4f]">
              {t(locale, "Refund policy", "退款政策")}
            </Link>
          </div>
        </div>

        <div>
          <p className="font-semibold text-[#1f2937]">{t(locale, "Legal", "法律")}</p>
          <div className="mt-4 space-y-3">
            <Link href="/terms" className="block hover:text-[#d96d4f]">
              {t(locale, "Terms of service", "服务条款")}
            </Link>
            <Link href="/privacy" className="block hover:text-[#d96d4f]">
              {t(locale, "Privacy policy", "隐私政策")}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-[#eaded2] px-5 py-4 text-center text-xs text-[#8a6f5b]">
        © {year} {t(locale, "AI Outfit Assistant. All rights reserved.", "AI 穿搭助手. 保留所有权利。")}
      </div>
    </footer>
  );
}
