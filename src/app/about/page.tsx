import { PublicPageShell } from "@/components/public-page-shell";

const milestones = [
  "把穿搭从“大而全灵感工具”收敛成“今天穿什么”的决策工具",
  "支持聊天式输入、图片直传入库与基础试穿生图",
  "逐步补齐服务条款、隐私政策、退款政策与联系方式等信任基础设施",
];

const team = [
  {
    name: "产品 / 设计",
    description: "聚焦用户真实决策路径，优先解决‘今天到底穿什么’而不是堆砌功能。",
  },
  {
    name: "AI / 工程",
    description: "负责图像识别、衣橱建档、试穿生成和聊天交互体验的基础能力搭建。",
  },
];

export default function AboutPage() {
  return (
    <PublicPageShell>
      <main className="mx-auto max-w-5xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="rounded-[32px] border border-[#eaded2] bg-white p-8 shadow-sm lg:p-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b8684c]">About</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#1f2937]">关于我们</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#6b5a4d]">
            我们想做的不是另一个“看起来很聪明”的搭配工具，而是一个真正能替用户减少穿搭决策疲劳的产品。
          </p>

          <section className="mt-10 rounded-[28px] bg-[#f8f2ec] p-6">
            <h2 className="text-2xl font-semibold text-[#1f2937]">为什么做这件事</h2>
            <p className="mt-4 text-base leading-7 text-[#6b5a4d]">
              很多用户的真实问题不是“没有衣服”，而是“衣服很多，但今天还是不知道怎么穿”。我们希望把这个问题拆到足够小、足够可执行。
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-[#1f2937]">阶段性进展</h2>
            <div className="mt-5 space-y-4">
              {milestones.map((item) => (
                <div key={item} className="rounded-[22px] border border-[#eaded2] px-5 py-4 text-[#6b5a4d]">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-[#1f2937]">核心团队</h2>
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
