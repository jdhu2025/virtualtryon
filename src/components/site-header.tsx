import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SiteHeaderProps {
  sectionLinks?: boolean;
}

export function SiteHeader({ sectionLinks = false }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#eaded2] bg-[#fffaf5]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d96d4f] text-sm font-semibold text-white">
            衣
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1f2937]">AI 穿搭助手</p>
            <p className="text-xs text-[#8a6f5b]">Dress what you already own</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-[#5b4b41] lg:flex">
          {sectionLinks ? (
            <>
              <a href="#benefits" className="transition-colors hover:text-[#d96d4f]">优势</a>
              <a href="#features" className="transition-colors hover:text-[#d96d4f]">功能</a>
              <a href="#pricing" className="transition-colors hover:text-[#d96d4f]">价格</a>
            </>
          ) : null}
          <Link href="/about" className="transition-colors hover:text-[#d96d4f]">关于我们</Link>
          <Link href="/blog" className="transition-colors hover:text-[#d96d4f]">博客</Link>
          <Link href="/contact" className="transition-colors hover:text-[#d96d4f]">联系我们</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-[#5b4b41] hover:bg-[#f5ece4] hover:text-[#d96d4f]">
              登录
            </Button>
          </Link>
          <Link href="/auth/register" className="hidden sm:block">
            <Button className="rounded-full bg-[#d96d4f] text-white hover:bg-[#bf5b3f]">
              免费开始
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
