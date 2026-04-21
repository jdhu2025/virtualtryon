"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  MessageCircle,
  Shirt,
  Sparkles,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { RemoteImage } from "@/components/remote-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth-local";
import {
  t,
  translateCategory,
  translateScene,
} from "@/lib/locale";
import { useLocale } from "@/contexts/locale-context";

interface HistoryItem {
  id: string;
  category: string;
  color: string | null;
  description: string;
  image_url: string;
}

interface HistoryRecord {
  id: string;
  user_requirement: string;
  scene: string | null;
  recommended_style: string | null;
  reason: string | null;
  result_image_url: string;
  is_selected: number;
  created_at: string;
  items: HistoryItem[];
}

function formatHistoryDate(value: string, locale: "en" | "zh"): string {
  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function HistoryPage() {
  const { locale } = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setIsLoggedIn(!!currentUser);

    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const response = await fetch("/api/history");
        if (!response.ok) {
          throw new Error("Failed to load history");
        }

        const data = await response.json();
        setHistory(data.history || []);
      } catch (error) {
        console.error("加载穿搭历史失败:", error);
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadHistory();
  }, []);

  return (
    <div className="app-gradient-shell min-h-screen pb-36">
      <div className="soft-grid pointer-events-none absolute inset-0 opacity-35" />

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 lg:px-8 lg:pt-8">
        <header className="glass-panel-strong rounded-[34px] p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#826f90]">
                <CalendarClock className="h-4 w-4 text-[#6f5ce2]" />
                {t(locale, "Outfit Archive", "穿搭档案")}
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-[#20183a] lg:text-4xl">
                {t(locale, "Outfit history", "穿搭历史")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#73677f] sm:text-base">
                {t(
                  locale,
                  "Keep track of every outfit idea you liked enough to remember.",
                  "把每一次值得记住的搭配方向沉淀下来。"
                )}
              </p>
            </div>
            <Link href="/chat">
              <Button className="rounded-full bg-[#20183a] px-5 text-white shadow-[0_16px_40px_rgba(32,24,58,0.22)] hover:bg-[#322655]">
                <Sparkles className="mr-2 h-4 w-4" />
                {t(locale, "Create a new look", "继续生成新穿搭")}
              </Button>
            </Link>
          </div>
        </header>

        <main className="mt-5">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="glass-panel h-[360px] rounded-[30px] p-4">
                  <div className="skeleton h-full rounded-[24px]" />
                </div>
              ))}
            </div>
          ) : !isLoggedIn ? (
            <Card className="glass-panel rounded-[34px] border-0 px-6 py-14 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/80">
                <Shirt className="h-10 w-10 text-[#8d8195]" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-[#20183a]">
                {t(locale, "Log in to see your history", "登录后查看历史")}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#73677f]">
                {t(
                  locale,
                  "After logging in you can review and manage your outfit history.",
                  "登录后可查看和管理你的穿搭历史记录。"
                )}
              </p>
              <div className="mt-6">
                <Link href="/auth/login">
                  <Button variant="outline" className="rounded-full border-white/80 bg-white/70 px-6 text-[#3a2f51] hover:bg-white">
                    {t(locale, "Log in", "登录")}
                  </Button>
                </Link>
              </div>
            </Card>
          ) : history.length === 0 ? (
            <Card className="glass-panel rounded-[34px] border-0 px-6 py-14 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/80">
                <Sparkles className="h-10 w-10 text-[#de6f8e]" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-[#20183a]">
                {t(locale, "No outfit history yet", "暂无穿搭记录")}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#73677f]">
                {t(
                  locale,
                  "Start a conversation with AI to generate your first outfit ideas.",
                  "先去和 AI 对话，生成第一批可保存的穿搭方案。"
                )}
              </p>
              <div className="mt-6">
                <Link href="/chat">
                  <Button className="rounded-full bg-[#20183a] px-6 text-white hover:bg-[#322655]">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {t(locale, "Start styling", "开始穿搭")}
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {history.map((entry) => {
                const coverImage = entry.result_image_url || entry.items[0]?.image_url || "";
                const sceneLabel = entry.scene
                  ? translateScene(entry.scene, locale) || entry.scene
                  : "";

                return (
                  <Card
                    key={entry.id}
                    className="glass-panel shine-border overflow-hidden rounded-[30px] border-0 p-3"
                  >
                    <div className="relative overflow-hidden rounded-[24px] bg-white/70">
                      <div className="relative aspect-[4/5] bg-gray-100">
                        {coverImage ? (
                          <RemoteImage
                            src={coverImage}
                            alt={entry.user_requirement}
                            fill
                            sizes="(min-width: 1280px) 24vw, (min-width: 768px) 38vw, 92vw"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                        <Badge className="border-0 bg-white/85 text-[#3a2f51] shadow-sm">
                          {entry.recommended_style || t(locale, "Saved look", "已保存方案")}
                        </Badge>
                        {entry.is_selected ? (
                          <Badge className="border-0 bg-[#20183a] text-white">
                            {t(locale, "Top pick", "主推荐")}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#20183a]/88 via-[#20183a]/44 to-transparent px-4 pb-4 pt-14 text-white">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                          {formatHistoryDate(entry.created_at, locale)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-lg font-medium">
                          {entry.user_requirement}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 px-2 pb-2 pt-4">
                      <div className="flex flex-wrap gap-2">
                        {sceneLabel ? (
                          <Badge
                            variant="outline"
                            className="border-white/80 bg-white/72 px-3 py-1 text-[#5f526a]"
                          >
                            {sceneLabel}
                          </Badge>
                        ) : null}
                        {entry.items.slice(0, 2).map((item) => (
                          <Badge
                            key={`${entry.id}_${item.id}`}
                            variant="outline"
                            className="border-white/80 bg-white/72 px-3 py-1 text-[#5f526a]"
                          >
                            {translateCategory(item.category, locale) || item.category}
                          </Badge>
                        ))}
                      </div>

                      <p className="line-clamp-3 text-sm leading-6 text-[#73677f]">
                        {entry.reason || t(locale, "A saved styling direction from your chat history.", "这是一条从聊天中沉淀下来的穿搭方向。")}
                      </p>

                      {entry.items.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {entry.items.map((item) => (
                            <div
                              key={`${entry.id}_${item.id}_thumb`}
                              className="w-14 shrink-0"
                            >
                              <div className="relative h-16 overflow-hidden rounded-[16px] bg-gray-100">
                                {item.image_url ? (
                                  <RemoteImage
                                    src={item.image_url}
                                    alt={item.description || item.category}
                                    fill
                                    sizes="56px"
                                    className="object-cover"
                                  />
                                ) : null}
                              </div>
                              <p className="mt-1 truncate text-center text-[11px] text-[#8d8195]">
                                {translateCategory(item.category, locale) || item.category}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="flex justify-end">
                        <Link
                          href={`/share/${entry.id}`}
                          className="inline-flex items-center text-sm font-medium text-[#3a2f51]"
                        >
                          {t(locale, "View share page", "查看分享页")}
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
