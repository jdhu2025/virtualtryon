"use client";

import { useState } from "react";
import { PublicPageShell } from "@/components/public-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const subject = encodeURIComponent(`联系 AI 穿搭助手：${name || "未填写姓名"}`);
    const body = encodeURIComponent(`邮箱：${email}\n\n内容：\n${message}`);
    window.location.href = `mailto:hello@aioutfit.app?subject=${subject}&body=${body}`;
  };

  return (
    <PublicPageShell>
      <main className="mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-[#eaded2] bg-white p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b8684c]">Contact</p>
            <h1 className="mt-4 text-4xl font-semibold text-[#1f2937]">联系我们</h1>
            <p className="mt-4 text-base leading-7 text-[#6b5a4d]">
              如果你想反馈产品问题、讨论合作、申请退款，或者只是想聊聊这个方向，都可以联系我们。
            </p>

            <div className="mt-8 space-y-5 text-sm text-[#6b5a4d]">
              <div>
                <p className="font-semibold text-[#1f2937]">客服邮箱</p>
                <p className="mt-1">hello@aioutfit.app</p>
              </div>
              <div>
                <p className="font-semibold text-[#1f2937]">工作时间</p>
                <p className="mt-1">周一至周五 10:00 - 18:00（GMT+8）</p>
              </div>
              <div>
                <p className="font-semibold text-[#1f2937]">实时支持</p>
                <p className="mt-1">当前以邮件支持为主，实时聊天支持将在后续版本开放。</p>
              </div>
              <div>
                <p className="font-semibold text-[#1f2937]">办公地址</p>
                <p className="mt-1">中国，上海（远程协作团队）</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-[#eaded2] bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#1f2937]">联系表单</h2>
            <p className="mt-3 text-sm leading-6 text-[#6b5a4d]">
              提交后会打开你的默认邮箱客户端。后续如接入客服系统，这里会升级为站内表单。
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="怎么称呼你" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">内容</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="告诉我们你想咨询什么"
                  rows={8}
                />
              </div>
              <Button type="submit" className="rounded-full bg-[#d96d4f] text-white hover:bg-[#bf5b3f]">
                发送邮件
              </Button>
            </form>
          </div>
        </div>
      </main>
    </PublicPageShell>
  );
}
