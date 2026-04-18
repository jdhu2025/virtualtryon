"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, MessageCircle, Shirt } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 检查登录状态
    const user = localStorage.getItem("user");
    setIsLoggedIn(!!user);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">穿搭历史</h1>
        <p className="text-sm text-gray-500 mt-1">记录你的每一次搭配</p>
      </header>

      {/* Content */}
      <main className="px-5 py-4">
        {isLoggedIn ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-pink-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-pink-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">暂无穿搭记录</h2>
            <p className="text-sm text-gray-500 mb-6">
              开始和 AI 对话，生成你的专属穿搭方案
            </p>
            <Link href="/chat">
              <Button>
                <MessageCircle className="h-4 w-4 mr-2" />
                开始穿搭
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Shirt className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">登录后查看历史</h2>
            <p className="text-sm text-gray-500 mb-6">
              登录后可查看和管理你的穿搭历史记录
            </p>
            <Link href="/auth/login">
              <Button variant="outline">登录</Button>
            </Link>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
