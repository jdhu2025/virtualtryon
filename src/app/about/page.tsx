import { PublicPageShell } from "@/components/public-page-shell";
import { t } from "@/lib/locale";
import { getServerLocale } from "@/lib/locale-server";

export default async function AboutPage() {
  const locale = await getServerLocale();
  const milestones = [
    t(locale, "Reframed outfit discovery from a broad inspiration tool into a daily “what should I wear today?” decision tool.", "把穿搭从“大而全灵感工具”收敛成“今天穿什么”的决策工具"),
    t(locale, "Supports chat-based input, direct image intake, wardrobe storage, and early try-on generation.", "支持聊天式输入、图片直传入库与基础试穿生图"),
    t(locale, "Keeps building trust infrastructure such as terms, privacy, refunds, and contact paths.", "逐步补齐服务条款、隐私政策、退款政策与联系方式等信任基础设施"),
  ];

  const team = [
    {
      name: t(locale, "Product / Design", "产品 / 设计"),
      description: t(locale, "Focused on real decision paths and solving “what should I wear today?” before piling on features.", "聚焦用户真实决策路径，优先解决‘今天到底穿什么’而不是堆砌功能。"),
    },
    {
      name: t(locale, "AI / Engineering", "AI / 工程"),
      description: t(locale, "Builds the foundations for image recognition, wardrobe structure, try-on generation, and conversational styling.", "负责图像识别、衣橱建档、试穿生成和聊天交互体验的基础能力搭建。"),
    },
  ];

  return (
    <PublicPageShell>
      <main className="mx-auto max-w-5xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="rounded-[32px] border border-[#eaded2] bg-white p-8 shadow-sm lg:p-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b8684c]">About</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#1f2937]">{t(locale, "About us", "关于我们")}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#6b5a4d]">
            {t(locale, "We do not want to build another product that merely looks clever. We want something that genuinely reduces outfit decision fatigue.", "我们想做的不是另一个“看起来很聪明”的搭配工具，而是一个真正能替用户减少穿搭决策疲劳的产品。")}
          </p>

          <section className="mt-10 rounded-[28px] bg-[#f8f2ec] p-6">
            <h2 className="text-2xl font-semibold text-[#1f2937]">{t(locale, "Why we are building this", "为什么做这件事")}</h2>
            <p className="mt-4 text-base leading-7 text-[#6b5a4d]">
              {t(locale, "For many people, the real problem is not “I have no clothes.” It is “I have many clothes but still do not know what to wear today.” We want to break that problem into something smaller and more actionable.", "很多用户的真实问题不是“没有衣服”，而是“衣服很多，但今天还是不知道怎么穿”。我们希望把这个问题拆到足够小、足够可执行。")}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-[#1f2937]">{t(locale, "Progress so far", "阶段性进展")}</h2>
            <div className="mt-5 space-y-4">
              {milestones.map((item) => (
                <div key={item} className="rounded-[22px] border border-[#eaded2] px-5 py-4 text-[#6b5a4d]">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-[#1f2937]">{t(locale, "Core team", "核心团队")}</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {team.map((member) => (
                <div key={member.name} className="rounded-[22px] border border-[#eaded2] p-5">
                  <p className="text-lg font-semibold text-[#1f2937]">{member.name}</p>
                  <p className="mt-3 text-base leading-7 text-[#6b5a4d]">{member.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </PublicPageShell>
  );
}
