"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Shirt, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CLOTHING_CATEGORIES } from "@/storage/database/shared/schema";
import { getCurrentUser } from "@/lib/auth-local";

// 客户端挂载状态 Hook
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

interface WardrobeItem {
  id: string;
  user_id: string;
  image_url: string;
  category: string;
  color?: string | null;
  style_tags?: string[] | null;
  season?: string | null;
  ai_description?: string | null;
  user_description?: string | null;
  created_at: string;
}

export default function WardrobePage() {
  const isMounted = useMounted();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WardrobeItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setItems([]);
        return;
      }

      const response = await fetch("/api/wardrobe");
      if (!response.ok) {
        throw new Error("加载衣柜失败");
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("加载数据失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      loadData();
    }
  }, [isMounted, loadData]);

  useEffect(() => {
    filterItems();
  }, [items, selectedCategory, searchQuery]);

  const filterItems = () => {
    let filtered = items;

    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.ai_description?.toLowerCase().includes(query) ||
          item.user_description?.toLowerCase().includes(query) ||
          item.color?.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  };

  const deleteItem = async (item: WardrobeItem) => {
    if (!confirm("确定要删除这件衣服吗？")) return;

    try {
      const response = await fetch(`/api/wardrobe?id=${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "删除失败");
      }
      
      // 更新本地状态
      setItems(prev => prev.filter(i => i.id !== item.id));
      setSelectedItem(null);
    } catch (error) {
      console.error("删除失败:", error);
      alert("删除失败，请重试");
    }
  };

  // 清除所有数据（调试用）
  const handleClearAll = async () => {
    if (!confirm("确定要清除所有衣服数据吗？此操作不可恢复！")) return;

    try {
      const response = await fetch("/api/clear-data", { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "清除失败");
      }
      setItems([]);
      setFilteredItems([]);
      alert("已清除所有数据，请刷新页面");
      window.location.reload();
    } catch (error) {
      console.error("清除数据失败:", error);
      alert("清除失败，请刷新页面后重试");
    }
  };

  const getCategoryLabel = (category: string) => {
    return CLOTHING_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getColorDot = (color: string | null | undefined) => {
    if (!color) return null;
    const colorMap: Record<string, string> = {
      red: "#E53935",
      blue: "#1E88E5",
      black: "#212121",
      white: "#FAFAFA",
      gray: "#9E9E9E",
      beige: "#F5F5DC",
      green: "#43A047",
      pink: "#EC407A",
      purple: "#8E24AA",
      yellow: "#FDD835",
      orange: "#FB8C00",
      brown: "#6D4C41",
      navy: "#1A237E",
      khaki: "#C8B560",
    };
    const hex = colorMap[color] || "#9E9E9E";
    return (
      <div
        className="w-4 h-4 rounded-full border border-gray-200"
        style={{ backgroundColor: hex }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 px-5 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">我的衣柜</h1>
          <Link href="/wardrobe/add">
            <Button size="sm" className="bg-accent">
              <Plus className="w-4 h-4 mr-1" />
              添加
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="搜索衣服..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-accent text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            全部
          </button>
          {CLOTHING_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.value
                  ? "bg-accent text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="px-5 py-4">
        {isMounted && isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-48" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Shirt className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {items.length === 0 ? "衣柜空空如也" : "没有找到匹配的衣服"}
            </h3>
            <p className="text-gray-500 mb-4">
              {items.length === 0
                ? "添加你的第一件衣服，开启智能穿搭之旅"
                : "试试其他关键词或分类"}
            </p>
            {items.length === 0 && (
              <Link href="/wardrobe/add">
                <Button className="bg-accent">
                  <Plus className="w-4 h-4 mr-2" />
                  添加衣服
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map((item, index) => (
              <Card
                key={item.id}
                className={`overflow-hidden border-0 animate-fade-in`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative aspect-square bg-gray-100">
                  <img
                    src={item.image_url}
                    alt={item.ai_description || "衣服"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    {getColorDot(item.color)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center tap-highlight-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setSelectedItem(item)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteItem(item)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="p-3">
                  <div className="text-xs text-gray-500 mb-1">
                    {getCategoryLabel(item.category)}
                  </div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {item.user_description || item.ai_description || "未命名"}
                  </p>
                  {item.style_tags && item.style_tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.style_tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Item Detail Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>衣服详情</SheetTitle>
          </SheetHeader>
          {selectedItem && (
            <div className="mt-4 space-y-4">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.ai_description || "衣服"}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">类别</div>
                  <div className="font-medium">
                    {getCategoryLabel(selectedItem.category)}
                  </div>
                </div>
                {selectedItem.color && (
                  <div>
                    <div className="text-sm text-gray-500">颜色</div>
                    <div className="flex items-center gap-2">
                      {getColorDot(selectedItem.color)}
                      <span className="font-medium capitalize">
                        {selectedItem.color}
                      </span>
                    </div>
                  </div>
                )}
                {selectedItem.style_tags && selectedItem.style_tags.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500">风格标签</div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedItem.style_tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(selectedItem.ai_description || selectedItem.user_description) && (
                  <div>
                    <div className="text-sm text-gray-500">描述</div>
                    <div className="text-gray-900">
                      {selectedItem.user_description ||
                        selectedItem.ai_description}
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => deleteItem(selectedItem)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除这件衣服
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 调试：清除所有数据按钮 */}
      {items.length > 0 && (
        <div className="px-5 py-4 text-center">
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            清除所有数据
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
