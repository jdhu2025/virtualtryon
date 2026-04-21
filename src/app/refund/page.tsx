import { PublicPageShell } from "@/components/public-page-shell";
import { t } from "@/lib/locale";
import { getServerLocale } from "@/lib/locale-server";

export default async function RefundPage() {
  const locale = await getServerLocale();
  const faqs = [
    {
      question: t(locale, "How long do I have to request a refund?", "可以在什么时间内申请退款？"),
      answer: t(locale, "If you purchase a paid plan and are not satisfied, you can request a refund within 14 days of the first payment.", "如用户购买付费版本后对产品不满意，可在首次付款后的 14 天内提交退款申请。"),
    },
    {
      question: t(locale, "When is a refund not supported?", "哪些情况不支持退款？"),
      answer: t(locale, "We may refuse refunds in cases of clear abuse, malicious trial farming, violations of the terms, or requests outside the refund window.", "若存在明显滥用、恶意刷试用、违反服务条款或超出退款时间限制的情况，我们可能拒绝退款请求。"),
    },
    {
      question: t(locale, "How does the refund process work?", "退款怎么处理？"),
      answer: t(locale, "Please contact us with your registered email, order details, and refund reason. Once approved, the refund goes back through the original payment path.", "请通过联系我们页面提交申请，并提供注册邮箱、订单信息和退款原因。审核通过后，会按原支付路径退回。"),
    },
  ];

  return (
    <PublicPageShell>
      <main className="mx-auto max-w-4xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="rounded-[32px] border border-[#eaded2] bg-white p-8 shadow-sm lg:p-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b8684c]">Refund Policy</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#1f2937]">{t(locale, "Refund policy", "退款政策")}</h1>
          <p className="mt-4 text-base leading-7 text-[#6b5a4d]">
            {t(locale, "We want expectations to be clear before purchase and the handling path to be clear after purchase if something goes wrong.", "我们希望用户在购买前有充分预期，也希望购买后遇到问题时有明确处理路径。")}
          </p>

          <div className="mt-10 rounded-[28px] bg-[#fff7f1] p-6">
            <h2 className="text-xl font-semibold text-[#1f2937]">{t(locale, "14-day refund promise", "14 天退款承诺")}</h2>
            <p className="mt-3 text-base leading-7 text-[#6b5a4d]">
              {t(locale, "For a first paid purchase, we provide a 14-day window to request a refund. A short explanation is enough for manual review.", "对首次购买的付费方案，我们提供 14 天内申请退款的窗口。用户只需说明基本原因，我们会进行人工审核。")}
            </p>
          </div>

          <div className="mt-10 space-y-6">
            {faqs.map((item) => (
              <section key={item.question} className="rounded-[24px] border border-[#eaded2] p-5">
                <h2 className="text-lg font-semibold text-[#1f2937]">{item.question}</h2>
                <p className="mt-3 text-base leading-7 text-[#6b5a4d]">{item.answer}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
    </PublicPageShell>
  );
}
