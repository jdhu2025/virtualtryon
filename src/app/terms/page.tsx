import { PublicPageShell } from "@/components/public-page-shell";
import { t } from "@/lib/locale";
import { getServerLocale } from "@/lib/locale-server";

export default async function TermsPage() {
  const locale = await getServerLocale();
  const sections = [
    {
      title: t(locale, "1. Service overview", "1. 服务说明"),
      content: t(locale, "AI Outfit Assistant provides digital services such as wardrobe management, outfit suggestions, image recognition, and try-on generation. We keep improving the product, but we do not guarantee uninterrupted, error-free service in every situation.", "AI 穿搭助手为用户提供衣橱管理、穿搭建议、图片识别与试穿效果生成等数字化服务。我们会持续优化产品，但不承诺服务始终完全无中断、无错误或适用于所有场景。"),
    },
    {
      title: t(locale, "2. Account responsibility", "2. 账户责任"),
      content: t(locale, "Users are responsible for keeping account credentials secure and for activity under their account. If you suspect unauthorized access, contact us promptly.", "用户需要妥善保管账号信息，并对账号下发生的行为负责。若发现账号被未经授权使用，请及时联系我们。"),
    },
    {
      title: t(locale, "3. Usage limits", "3. 使用限制"),
      content: t(locale, "Users must not upload content that infringes privacy, portrait, copyright, or other lawful rights, and must not use the service for illegal, deceptive, abusive, or system-disruptive behavior.", "用户不得上传侵犯他人隐私、肖像权、著作权或其他合法权益的内容；不得利用本服务进行违法、欺诈、骚扰、误导或破坏系统稳定性的行为。"),
    },
    {
      title: t(locale, "4. Content and intellectual property", "4. 内容与知识产权"),
      content: t(locale, "Users retain ownership of uploaded garment photos, portrait photos, and text where they lawfully hold rights. The platform retains the relevant rights over its interface, algorithm flow, brand content, and related materials.", "用户上传的服装照片、人像照片及文字内容，仍归用户或合法权利人所有。平台对产品界面、算法流程、品牌内容及相关材料保留相应知识产权。"),
    },
    {
      title: t(locale, "5. Service termination", "5. 服务终止"),
      content: t(locale, "If a user violates law or these terms, the platform may suspend or terminate access. Users may also stop using the service at any time and remove personal data through the provided product paths.", "若用户违反法律法规或本条款，平台有权暂停或终止服务访问。用户也可随时停止使用，并按产品提供的方式删除个人数据。"),
    },
    {
      title: t(locale, "6. Disclaimer and dispute handling", "6. 免责声明与争议处理"),
      content: t(locale, "Styling suggestions are decision support, not professional guarantees. We do not guarantee real-world results from using suggestions. If disputes arise, both parties should first try to resolve them amicably.", "穿搭建议属于辅助决策，不构成专业保证。因使用建议产生的实际效果差异，平台不承担结果保证责任。若发生争议，双方应优先友好协商解决。"),
    },
  ];

  return (
    <PublicPageShell>
      <main className="mx-auto max-w-4xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="rounded-[32px] border border-[#eaded2] bg-white p-8 shadow-sm lg:p-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b8684c]">Terms of Service</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#1f2937]">{t(locale, "Terms of service", "服务条款")}</h1>
          <p className="mt-4 text-base leading-7 text-[#6b5a4d]">
            {t(locale, "Last updated: April 18, 2026. These terms define the service relationship between users and AI Outfit Assistant.", "最后更新：2026 年 4 月 18 日。以下条款用于明确用户与 AI 穿搭助手之间的服务关系。")}
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
