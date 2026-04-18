"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Share2, Heart, Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ShareData {
  title: string;
  description: string;
  imageUrl: string;
  userName: string;
  scene: string;
  items: Array<{
    category: string;
    description: string;
  }>;
}

export default function SharePage() {
  const params = useParams();
  const outfitId = params.id as string;
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 尝试从 API 获取分享数据
    loadShareData();
  }, [outfitId]);

  const loadShareData = async () => {
    try {
      const response = await fetch(`/api/share?id=${outfitId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setShareData(data.data);
        }
      }
    } catch (error) {
      console.error("加载分享数据失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!shareData) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.description,
          url: window.location.href,
        });
      } catch (error) {
        // 用户取消分享
      }
    } else {
      // 复制链接
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    if (!shareData?.imageUrl) return;

    try {
      const response = await fetch(shareData.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `outfit-${Date.now()}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("下载失败:", error);
    }
  };

  const getSceneLabel = (scene: string) => {
    const sceneMap: Record<string, string> = {
      meeting: "会议",
      date: "约会",
      casual: "日常",
      party: "派对",
      travel: "旅行",
      work: "办公",
    };
    return sceneMap[scene] || scene;
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      tops: "上装",
      bottoms: "下装",
      dresses: "裙装",
      outerwear: "外套",
      shoes: "鞋子",
      bags: "包包",
      accessories: "配饰",
      hats: "帽子",
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-5 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="text-sm">返回首页</span>
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center text-pink-500 hover:text-pink-600"
          >
            {copied ? (
              <Check className="h-5 w-5" />
            ) : (
              <Share2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="px-5 py-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-80 rounded-2xl" />
            <Skeleton className="w-32 h-6" />
            <Skeleton className="w-full h-20" />
          </div>
        ) : shareData ? (
          <div className="space-y-4">
            {/* 穿搭效果图 */}
            <Card className="overflow-hidden">
              {shareData.imageUrl ? (
                <img
                  src={shareData.imageUrl}
                  alt="穿搭效果"
                  className="w-full object-cover"
                />
              ) : (
                <div className="w-full h-80 bg-gray-100 flex items-center justify-center">
                  <Sparkles className="h-12 w-12 text-gray-300" />
                </div>
              )}
            </Card>

            {/* 场景标签 */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-sm">
                {getSceneLabel(shareData.scene)}
              </span>
              <span className="text-sm text-gray-500">by {shareData.userName}</span>
            </div>

            {/* 穿搭描述 */}
            <Card className="p-4">
              <h2 className="font-semibold text-gray-900 mb-2">{shareData.title}</h2>
              <p className="text-sm text-gray-600">{shareData.description}</p>
            </Card>

            {/* 搭配单品 */}
            {shareData.items.length > 0 && (
              <Card className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">搭配单品</h3>
                <div className="space-y-3">
                  {shareData.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {getCategoryLabel(item.category)}
                      </span>
                      <span className="text-sm text-gray-600">{item.description}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsLiked(!isLiked)}
              >
                <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-pink-500 text-pink-500" : ""}`} />
                {isLiked ? "已收藏" : "收藏"}
              </Button>
              {shareData.imageUrl && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  下载图片
                </Button>
              )}
            </div>

            {/* AI 穿搭助手推广 */}
            <Card className="p-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">AI 穿搭助手</h3>
                  <p className="text-xs text-pink-100">发现你已经拥有的美</p>
                </div>
              </div>
              <Link href="/">
                <Button variant="secondary" className="w-full mt-3">
                  立即体验
                </Button>
              </Link>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-12 w-12 text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">分享不存在</h2>
            <p className="text-sm text-gray-500 mb-6">
              该穿搭分享可能已被删除或不存在
            </p>
            <Link href="/">
              <Button variant="outline">返回首页</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
