"use client";

import { useState, useEffect, useCallback, useDeferredValue } from "react";
import Link from "next/link";
import { Camera, Search, Shirt, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { RemoteImage } from "@/components/remote-image";
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
import { getCurrentUser } from "@/lib/auth-local";
import { useLocale } from "@/contexts/locale-context";
import {
  getLocalizedClothingCategories,
  t,
  translateCategory,
  translateColor,
  translateSeason,
  translateStyleTag,
} from "@/lib/locale";

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
  const { locale } = useLocale();
  const isMounted = useMounted();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WardrobeItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);

  const localizedCategories = getLocalizedClothingCategories(locale);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setItems([]);
        setFilteredItems([]);
        return;
      }

      const response = await fetch("/api/wardrobe");
      if (!response.ok) {
        throw new Error(t(locale, "Failed to load wardrobe.", "加载衣柜失败"));
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("加载数据失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (isMounted) {
      loadData();
    }
  }, [isMounted, loadData]);

  useEffect(() => {
    let filtered = items;

    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    if (deferredSearchQuery) {
      const query = deferredSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.ai_description?.toLowerCase().includes(query) ||
          item.user_description?.toLowerCase().includes(query) ||
          item.color?.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  }, [items, selectedCategory, deferredSearchQuery]);

  const deleteItem = async (item: WardrobeItem) => {
    if (!confirm(t(locale, "Delete this item?", "确定要删除这件衣服吗？"))) return;

    try {
      const response = await fetch(`/api/wardrobe?id=${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t(locale, "Delete failed.", "删除失败"));
      }
      
      // 更新本地状态
      setItems(prev => prev.filter(i => i.id !== item.id));
      setSelectedItem(null);
    } catch (error) {
      console.error("删除失败:", error);
      alert(t(locale, "Delete failed. Please try again.", "删除失败，请重试"));
    }
  };

  // 清除所有数据（调试用）
  const handleClearAll = async () => {
    if (!confirm(t(locale, "Clear all wardrobe data? This cannot be undone.", "确定要清除所有衣服数据吗？此操作不可恢复！"))) return;

    try {
      const response = await fetch("/api/clear-data", { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t(locale, "Clear failed.", "清除失败"));
      }
      setItems([]);
      setFilteredItems([]);
      alert(t(locale, "All data cleared. Please refresh.", "已清除所有数据，请刷新页面"));
      window.location.reload();
    } catch (error) {
      console.error("清除数据失败:", error);
      alert(t(locale, "Clear failed. Please refresh and try again.", "清除失败，请刷新页面后重试"));
    }
  };

  const getCategoryLabel = (category: string) => {
    return translateCategory(category, locale) || category;
  };

  const getColorLabel = (color: string | null | undefined) => {
    return translateColor(color, locale) || color || "";
  };

  const getSeasonLabel = (season: string | null | undefined) => {
    return translateSeason(season, locale) || season || "";
  };

  const getStyleLabel = (style: string | null | undefined) => {
    return translateStyleTag(style, locale) || style || "";
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

  const activeFilterLabel = selectedCategory
    ? getCategoryLabel(selectedCategory)
    : t(locale, "All categories", "全部分类");
  const indexedStyles = Array.from(
    new Set(
      items.flatMap((item) =>
        Array.isArray(item.style_tags) ? item.style_tags.filter(Boolean) : []
      )
    )
  ).slice(0, 4);
  const captureRatio = Math.min(items.length / 12, 1);

  return (
    <div className="app-gradient-shell min-h-screen pb-36">
      <div className="soft-grid pointer-events-none absolute inset-0 opacity-35" />
      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 lg:px-8 lg:pt-8">
        <header className="sticky top-3 z-40 pb-4">
          <div className="glass-panel-strong rounded-[34px] p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#826f90]">
                  <Shirt className="h-4 w-4 text-[#6f5ce2]" />
                  {t(locale, "Wardrobe Library", "衣橱素材库")}
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-[#20183a] lg:text-4xl">
                  {t(locale, "My wardrobe", "我的衣柜")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#73677f] sm:text-base">
                  {t(locale, "Add a few real pieces first, then let AI style around them.", "先录入几件真实衣服，再让 AI 围绕它们帮你搭配。")}
                </p>
              </div>
              <Link href="/wardrobe/add">
                <Button size="sm" className="rounded-full bg-[#20183a] px-5 text-white shadow-[0_16px_40px_rgba(32,24,58,0.22)] hover:bg-[#322655]">
                  <Camera className="mr-2 h-4 w-4" />
                  {t(locale, "Add from photo", "拍照添加")}
                </Button>
              </Link>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1.5fr_0.75fr_0.75fr]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8d8195]" />
                <Input
                  placeholder={t(locale, "Search clothes, color, or style...", "搜索衣服、颜色或风格...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 rounded-full border-white/70 bg-white/72 pl-12 text-[#20183a] placeholder:text-[#8d8195]"
                />
              </div>
              <div className="rounded-[24px] bg-white/70 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#826f90]">
                  {t(locale, "Indexed Pieces", "已入库")}
                </p>
                <p className="mt-2 text-3xl font-semibold text-[#20183a]">{items.length}</p>
              </div>
              <div className="rounded-[24px] bg-white/70 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#826f90]">
                  {t(locale, "Current Filter", "当前筛选")}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#20183a]">{activeFilterLabel}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  selectedCategory === null
                    ? "bg-[#20183a] text-white shadow-[0_12px_30px_rgba(32,24,58,0.22)]"
                    : "bg-white/70 text-[#5f526a] hover:bg-white"
                }`}
              >
                {t(locale, "All", "全部")}
              </button>
              {localizedCategories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    selectedCategory === cat.value
                      ? "bg-[#20183a] text-white shadow-[0_12px_30px_rgba(32,24,58,0.22)]"
                      : "bg-white/70 text-[#5f526a] hover:bg-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Link href="/wardrobe/add" className="block">
              <Card className="glass-panel shine-border h-full rounded-[30px] border-0 p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#826f90]">
                      {t(locale, "Quick Intake", "快速录入")}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-[#20183a]">
                      {t(locale, "Turn closet photos into tagged pieces", "把衣服照片变成可用素材")}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#73677f]">
                      {t(locale, "Use plain backgrounds when possible. Once the item is in here, AI can reuse it across outfit requests.", "尽量用干净背景拍摄。单品一旦进衣橱，AI 之后就能在多次搭配里重复调用。")}
                    </p>
                  </div>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#f59a7f] to-[#de6f8e] text-white shadow-[0_18px_36px_rgba(222,111,142,0.28)]">
                    <Camera className="h-8 w-8" />
                  </div>
                </div>
              </Card>
            </Link>

            <Card className="glass-panel rounded-[30px] border-0 p-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#826f90]">
                {t(locale, "Wardrobe Surface", "衣橱覆盖度")}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#73677f]">
                {t(locale, "The more categories and styles you add, the less repetitive the AI suggestions become.", "衣服类别和风格越完整，AI 生成的结果就越不容易重复。")}
              </p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#de6f8e] via-[#f0be81] to-[#6f5ce2]"
                  style={{ width: `${Math.max(captureRatio * 100, items.length > 0 ? 16 : 8)}%` }}
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {indexedStyles.length > 0 ? (
                  indexedStyles.map((style) => (
                    <Badge
                      key={style}
                      variant="outline"
                      className="border-white/80 bg-white/70 px-3 py-1 text-[#5f526a]"
                    >
                      {getStyleLabel(style)}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="border-dashed border-white/80 bg-white/70 px-3 py-1 text-[#5f526a]">
                    {t(locale, "Style tags will appear here", "录入后风格标签会显示在这里")}
                  </Badge>
                )}
              </div>
            </Card>
          </div>

          {isMounted && isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="glass-panel h-[320px] rounded-[28px] p-4">
                  <div className="skeleton h-full rounded-[22px]" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="glass-panel rounded-[34px] border-0 px-6 py-14 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/80">
                <Shirt className="h-10 w-10 text-[#8d8195]" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-[#20183a]">
                {items.length === 0
                  ? t(locale, "Your wardrobe is still empty", "衣柜还没有开始建立")
                  : t(locale, "No matching clothes found", "没有找到匹配的衣服")}
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#73677f]">
                {items.length === 0
                  ? t(locale, "Add your first piece and the AI stylist can start working with real material instead of guesses.", "先录入第一件衣服，AI 才能基于真实衣橱而不是凭空猜。")
                  : t(locale, "Try another keyword or clear the current category filter to broaden the wardrobe view.", "试试其他关键词，或者清掉当前分类筛选，看更完整的衣橱。")}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {items.length === 0 ? (
                  <Link href="/wardrobe/add">
                    <Button className="rounded-full bg-[#20183a] px-6 text-white hover:bg-[#322655]">
                      <Camera className="mr-2 h-4 w-4" />
                      {t(locale, "Add from photo", "拍照添加")}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    className="rounded-full border-white/80 bg-white/70 px-6 text-[#3a2f51] hover:bg-white"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory(null);
                    }}
                  >
                    {t(locale, "Clear filters", "清除筛选")}
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item, index) => (
                <HoverCard key={item.id} openDelay={120}>
                  <HoverCardTrigger asChild>
                    <Card
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedItem(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedItem(item);
                        }
                      }}
                      className="glass-panel shine-border group cursor-pointer overflow-hidden rounded-[30px] border-0 p-3 text-left transition-all duration-300 hover:-translate-y-1"
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <div className="relative overflow-hidden rounded-[24px] bg-white/70">
                        <div className="relative aspect-[4/5] bg-gray-100">
                          <RemoteImage
                            src={item.image_url}
                            alt={item.ai_description || "衣服"}
                            fill
                            sizes="(min-width: 1280px) 24vw, (min-width: 640px) 38vw, 92vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                          <div className="flex items-center gap-2 rounded-full bg-white/82 px-3 py-2 text-xs font-medium text-[#3a2f51] shadow-sm backdrop-blur">
                            {getColorDot(item.color)}
                            <span>{getCategoryLabel(item.category)}</span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/82 text-[#3a2f51] shadow-sm backdrop-blur tap-highlight-none"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedItem(item)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                {t(locale, "View", "查看")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteItem(item)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t(locale, "Delete", "删除")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#20183a]/88 via-[#20183a]/44 to-transparent px-4 pb-4 pt-12 text-white">
                          <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                            {item.season ? getSeasonLabel(item.season) : t(locale, "Wardrobe piece", "衣橱单品")}
                          </p>
                          <p className="mt-1 line-clamp-2 text-base font-medium">
                            {item.user_description || item.ai_description || t(locale, "Untitled", "未命名")}
                          </p>
                        </div>
                      </div>
                      <div className="px-2 pb-2 pt-4">
                        <div className="flex flex-wrap gap-2">
                          {(item.style_tags || []).slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="border-white/80 bg-white/72 px-3 py-1 text-[#5f526a]"
                            >
                              {getStyleLabel(tag)}
                            </Badge>
                          ))}
                          {!item.style_tags?.length && item.color ? (
                            <Badge
                              variant="outline"
                              className="border-white/80 bg-white/72 px-3 py-1 text-[#5f526a]"
                            >
                              {getColorLabel(item.color)}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  </HoverCardTrigger>
                  <HoverCardContent className="glass-panel-strong w-[320px] rounded-[28px] border-0 p-0">
                    <div className="p-4">
                      <div className="flex gap-4">
                        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[18px] bg-gray-100">
                          <RemoteImage
                            src={item.image_url}
                            alt={item.ai_description || "衣服"}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#826f90]">
                            {getCategoryLabel(item.category)}
                          </p>
                          <h3 className="mt-2 line-clamp-2 text-base font-semibold text-[#20183a]">
                            {item.user_description || item.ai_description || t(locale, "Untitled", "未命名")}
                          </h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.color ? (
                              <Badge variant="outline" className="border-white/80 bg-white/72 text-[#5f526a]">
                                {getColorLabel(item.color)}
                              </Badge>
                            ) : null}
                            {item.season ? (
                              <Badge variant="outline" className="border-white/80 bg-white/72 text-[#5f526a]">
                                {getSeasonLabel(item.season)}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      {item.ai_description ? (
                        <div className="mt-4 rounded-[20px] bg-white/70 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#826f90]">
                            {t(locale, "AI note", "AI 识别描述")}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#5f526a]">{item.ai_description}</p>
                        </div>
                      ) : null}
                      {item.style_tags?.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.style_tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="border-white/80 bg-white/72 text-[#5f526a]"
                            >
                              {getStyleLabel(tag)}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Item Detail Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <SheetContent side="bottom" className="glass-panel-strong rounded-t-[32px] border-0">
          <SheetHeader>
            <SheetTitle>{t(locale, "Item details", "衣服详情")}</SheetTitle>
          </SheetHeader>
          {selectedItem && (
            <div className="mt-4 space-y-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-white/80">
                <RemoteImage
                  src={selectedItem.image_url}
                  alt={selectedItem.ai_description || "衣服"}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">{t(locale, "Category", "类别")}</div>
                  <div className="font-medium">
                    {getCategoryLabel(selectedItem.category)}
                  </div>
                </div>
                {selectedItem.color && (
                  <div>
                    <div className="text-sm text-gray-500">{t(locale, "Color", "颜色")}</div>
                    <div className="flex items-center gap-2">
                      {getColorDot(selectedItem.color)}
                      <span className="font-medium">
                        {getColorLabel(selectedItem.color)}
                      </span>
                    </div>
                  </div>
                )}
                {selectedItem.style_tags && selectedItem.style_tags.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500">{t(locale, "Style tags", "风格标签")}</div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedItem.style_tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="border-white/80 bg-white/72 px-3 py-1 text-[#5f526a]"
                        >
                          {getStyleLabel(tag)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(selectedItem.ai_description || selectedItem.user_description) && (
                  <div>
                    <div className="text-sm text-gray-500">{t(locale, "Description", "描述")}</div>
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
                  className="w-full rounded-full"
                  onClick={() => deleteItem(selectedItem)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t(locale, "Delete this item", "删除这件衣服")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 调试：清除所有数据按钮 */}
      {items.length > 0 && (
        <div className="mx-auto max-w-7xl px-5 py-4 text-center">
          <button
            onClick={handleClearAll}
            className="rounded-full bg-white/60 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white hover:text-red-500"
          >
            {t(locale, "Clear all data", "清除所有数据")}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
