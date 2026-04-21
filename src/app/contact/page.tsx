"use client";

import { useState } from "react";
import { PublicPageShell } from "@/components/public-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/contexts/locale-context";
import { t } from "@/lib/locale";

export default function ContactPage() {
  const { locale } = useLocale();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const subject = encodeURIComponent(
      t(locale, `Contact AI Outfit Assistant: ${name || "No name provided"}`, `联系 AI 穿搭助手：${name || "未填写姓名"}`)
    );
    const body = encodeURIComponent(
      t(locale, `Email: ${email}\n\nMessage:\n${message}`, `邮箱：${email}\n\n内容：\n${message}`)
    );
    window.location.href = `mailto:hello@aioutfit.app?subject=${subject}&body=${body}`;
  };

  return (
    <PublicPageShell>
      <main className="mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-[#eaded2] bg-white p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b8684c]">Contact</p>
            <h1 className="mt-4 text-4xl font-semibold text-[#1f2937]">{t(locale, "Contact us", "联系我们")}</h1>
            <p className="mt-4 text-base leading-7 text-[#6b5a4d]">
              {t(locale, "If you want to report a product issue, discuss a partnership, request a refund, or simply talk about the direction, you can reach us here.", "如果你想反馈产品问题、讨论合作、申请退款，或者只是想聊聊这个方向，都可以联系我们。")}
            </p>

            <div className="mt-8 space-y-5 text-sm text-[#6b5a4d]">
              <div>
                <p className="font-semibold text-[#1f2937]">{t(locale, "Support email", "客服邮箱")}</p>
                <p className="mt-1">hello@aioutfit.app</p>
              </div>
              <div>
                <p className="font-semibold text-[#1f2937]">{t(locale, "Working hours", "工作时间")}</p>
                <p className="mt-1">{t(locale, "Monday to Friday, 10:00 - 18:00 (GMT+8)", "周一至周五 10:00 - 18:00（GMT+8）")}</p>
              </div>
              <div>
                <p className="font-semibold text-[#1f2937]">{t(locale, "Live support", "实时支持")}</p>
                <p className="mt-1">{t(locale, "Email is the main support channel for now. Live chat support will come in a later version.", "当前以邮件支持为主，实时聊天支持将在后续版本开放。")}</p>
              </div>
              <div>
                <p className="font-semibold text-[#1f2937]">{t(locale, "Location", "办公地址")}</p>
                <p className="mt-1">{t(locale, "Shanghai, China (remote collaboration team)", "中国，上海（远程协作团队）")}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-[#eaded2] bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#1f2937]">{t(locale, "Contact form", "联系表单")}</h2>
            <p className="mt-3 text-sm leading-6 text-[#6b5a4d]">
              {t(locale, "Submitting opens your default email client. If we add a support system later, this section can become an in-app form.", "提交后会打开你的默认邮箱客户端。后续如接入客服系统，这里会升级为站内表单。")}
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">{t(locale, "Name", "姓名")}</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t(locale, "How should we address you?", "怎么称呼你")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t(locale, "Email", "邮箱")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">{t(locale, "Message", "内容")}</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t(locale, "Tell us what you want to ask about", "告诉我们你想咨询什么")}
                  rows={8}
                />
              </div>
              <Button type="submit" className="rounded-full bg-[#d96d4f] text-white hover:bg-[#bf5b3f]">
                {t(locale, "Send email", "发送邮件")}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </PublicPageShell>
  );
}
