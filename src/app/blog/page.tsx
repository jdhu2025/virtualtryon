import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";
import { t } from "@/lib/locale";
import { getServerLocale } from "@/lib/locale-server";

export default async function BlogPage() {
  const locale = await getServerLocale();
  const posts = [
    {
      category: t(locale, "Product thinking", "产品思考"),
      title: t(locale, "Why “what should I wear today?” is closer to the real need than “inspiration”", "为什么“今天穿什么”比“灵感推荐”更接近真实需求"),
      excerpt: t(locale, "Most people are not trying to see more options. They want to reach one good decision quickly.", "大多数用户不是想看更多方案，而是想尽快做出一个不出错的决定。"),
      date: "2026-04-18",
    },
    {
      category: t(locale, "Best practice", "最佳实践"),
      title: t(locale, "How to build your first digital wardrobe with just 3 everyday pieces", "如何用 3 件常穿衣服，快速建立你的第一版数字衣橱"),
      excerpt: t(locale, "Start with the items you wear most often and that best represent your wardrobe.", "先从最常穿、最有代表性的单品开始，比要求用户一次录完整个衣柜更符合人性。"),
      date: "2026-04-18",
    },
    {
      category: t(locale, "Industry view", "行业观察"),
      title: t(locale, "The hard part of AI styling is not generation. It is trust.", "AI 穿搭的真正难点，不是生成图，而是建立信任"),
      excerpt: t(locale, "Cool renders are not enough for retention. People come back for stability, trust, and less mental load.", "生图足够酷不代表产品能留存，真正让用户回来的是稳定、可信和省脑力。"),
      date: "2026-04-18",
    },
  ];

  return (
    <PublicPageShell>
      <main className="mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b8684c]">Blog</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#1f2937]">{t(locale, "Blog", "博客")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#6b5a4d]">
            {t(locale, "Notes on product thinking, user insight, industry movement, and practical usage so both users and teams can understand the direction faster.", "分享产品思考、用户洞察、行业趋势与使用建议，帮助用户和团队都更快理解这个方向。")}
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {posts.map((post) => (
            <article key={post.title} className="rounded-[28px] border border-[#eaded2] bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-[#b8684c]">{post.category}</p>
              <h2 className="mt-4 text-2xl font-semibold leading-8 text-[#1f2937]">{post.title}</h2>
              <p className="mt-4 text-base leading-7 text-[#6b5a4d]">{post.excerpt}</p>
              <div className="mt-6 flex items-center justify-between text-sm text-[#8a6f5b]">
                <span>{post.date}</span>
                <Link href="/contact" className="font-medium text-[#d96d4f] hover:underline">
                  {t(locale, "Discuss this post →", "想交流这篇内容 →")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </PublicPageShell>
  );
}
