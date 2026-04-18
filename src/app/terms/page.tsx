import { PublicPageShell } from "@/components/public-page-shell";

const sections = [
  {
    title: "1. 服务说明",
    content:
      "AI 穿搭助手为用户提供衣橱管理、穿搭建议、图片识别与试穿效果生成等数字化服务。我们会持续优化产品，但不承诺服务始终完全无中断、无错误或适用于所有场景。",
  },
  {
    title: "2. 账户责任",
    content:
      "用户需要妥善保管账号信息，并对账号下发生的行为负责。若发现账号被未经授权使用，请及时联系我们。",
  },
  {
    title: "3. 使用限制",
    content:
      "用户不得上传侵犯他人隐私、肖像权、著作权或其他合法权益的内容；不得利用本服务进行违法、欺诈、骚扰、误导或破坏系统稳定性的行为。",
  },
  {
    title: "4. 内容与知识产权",
    content:
      "用户上传的服装照片、人像照片及文字内容，仍归用户或合法权利人所有。平台对产品界面、算法流程、品牌内容及相关材料保留相应知识产权。",
  },
  {
    title: "5. 服务终止",
    content:
      "若用户违反法律法规或本条款，平台有权暂停或终止服务访问。用户也可随时停止使用，并按产品提供的方式删除个人数据。",
  },
  {
    title: "6. 免责声明与争议处理",
    content:
      "穿搭建议属于辅助决策，不构成专业保证。因使用建议产生的实际效果差异，平台不承担结果保证责任。若发生争议，双方应优先友好协商解决。",
  },
];

export default function TermsPage() {
  return (
    <PublicPageShell>
      <main className="mx-auto max-w-4xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="rounded-[32px] border border-[#eaded2] bg-white p-8 shadow-sm lg:p-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b8684c]">Terms of Service</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#1f2937]">服务条款</h1>
          <p className="mt-4 text-base leading-7 text-[#6b5a4d]">
            最后更新：2026 年 4 月 18 日。以下条款用于明确用户与 AI 穿搭助手之间的服务关系。
          </p>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-[#1f2937]">{section.title}</h2>
                <p className="mt-3 text-base leading-7 text-[#6b5a4d]">{section.content}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
    </PublicPageShell>
  );
}
