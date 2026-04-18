import { PublicPageShell } from "@/components/public-page-shell";

const sections = [
  {
    title: "我们收集哪些数据",
    content:
      "我们会收集账户信息、衣物图片、人像图片、聊天内容、穿搭反馈以及基础设备信息，以保障服务运行、改进推荐质量和进行必要的安全审计。",
  },
  {
    title: "这些数据怎么用",
    content:
      "数据主要用于登录认证、衣橱管理、AI 识别、穿搭推荐、试穿生成、历史记录保留以及产品质量优化。除非获得授权或法律要求，我们不会将个人数据用于无关目的。",
  },
  {
    title: "你的控制权",
    content:
      "用户可以查看、修改、删除自己的衣橱数据和人像数据，也可以停止使用服务并请求清理账户相关数据。我们会尽量提供清晰的删除和退出路径。",
  },
  {
    title: "数据共享政策",
    content:
      "我们不会向无关第三方出售用户数据。只有在提供基础云存储、AI 处理或满足法律义务的必要情况下，才会向受约束的服务提供商传输最小范围的数据。",
  },
  {
    title: "安全措施",
    content:
      "我们采用访问控制、最小权限、数据隔离与服务提供商的安全能力来保护信息安全。但任何网络服务都无法承诺绝对零风险。",
  },
];

export default function PrivacyPage() {
  return (
    <PublicPageShell>
      <main className="mx-auto max-w-4xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="rounded-[32px] border border-[#eaded2] bg-white p-8 shadow-sm lg:p-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b8684c]">Privacy Policy</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#1f2937]">隐私政策</h1>
          <p className="mt-4 text-base leading-7 text-[#6b5a4d]">
            最后更新：2026 年 4 月 18 日。我们尽量用简单语言说明数据如何被收集、使用和保护。
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
