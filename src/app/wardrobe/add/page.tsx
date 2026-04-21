"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, ChevronLeft, Loader2, Shirt } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RemoteImage } from "@/components/remote-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageSourceSheet } from "@/components/image-source-sheet";
import { processImageFile } from "@/lib/image-utils";
import { getCurrentUser } from "@/lib/auth-local";
import {
  getLocalizedClothingCategories,
  getLocalizedColors,
  getLocalizedSeasons,
  getLocalizedStyleTags,
  t,
} from "@/lib/locale";
import { useLocale } from "@/contexts/locale-context";
import { useTurnstileFetch } from "@/hooks/use-turnstile-fetch";

// 客户端挂载状态 Hook
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

export default function AddClothPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const turnstileFetch = useTurnstileFetch();
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useMounted();
  const [userId, setUserId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadPicker, setShowUploadPicker] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<{
    category?: string;
    color?: string;
    style_tags?: string[];
    scenes?: string[];
    seasons?: string[];
    pairing_suggestions?: string[];
    body_type?: string[];
    description?: string;
  } | null>(null);

  // Form state
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [season, setSeason] = useState("");
  const [description, setDescription] = useState("");

  const localizedCategories = getLocalizedClothingCategories(locale);
  const localizedColors = getLocalizedColors(locale);
  const localizedStyleTags = getLocalizedStyleTags(locale);
  const localizedSeasons = getLocalizedSeasons(locale);

  const initUser = useCallback(async () => {
    try {
      // 使用 auth-local 获取当前用户
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUserId(currentUser.id);
      } else {
        setError(t(locale, "Please log in first.", "请先登录"));
      }
    } catch (err) {
      console.error("初始化用户失败:", err);
      setError(
        t(locale, "Initialization failed. Please refresh and try again.", "初始化失败，请刷新页面重试")
      );
    }
  }, [locale]);

  useEffect(() => {
    if (isMounted) {
      void initUser();
    }
  }, [initUser, isMounted]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    console.log("选择的文件:", file.name, file.type, file.size);
    await processImage(file);
  };

  const openUploadPicker = () => {
    if (!isAnalyzing && !isSaving) {
      setShowUploadPicker(true);
    }
  };

  const processImage = async (file: File) => {
    setIsAnalyzing(true);
    try {
      // 处理图片（HEIC转换 + 压缩）
      const base64 = await processImageFile(file);
      console.log("图片处理完成，大小:", Math.round(base64.length / 1024), "KB");
      
      // 创建预览
      setImageUrl(base64);

      const response = await turnstileFetch("/api/analyze-cloth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("AI 分析结果:", data);
        setAnalyzedData(data);

        // Auto-fill form
        if (data.category) setCategory(data.category);
        if (data.color) setColor(data.color);
        if (data.style_tags && Array.isArray(data.style_tags)) setStyleTags(data.style_tags);
        if (data.description) setDescription(data.description);
      } else {
        console.error("AI 分析失败:", response.statusText);
        alert(
          t(
            locale,
            "AI analysis failed, but you can still fill in the item manually.",
            "AI 分析失败，但您仍可以手动填写信息并保存"
          )
        );
      }
    } catch (err) {
      console.error("图片处理失败:", err);
      alert(
        t(
          locale,
          "Image processing failed. Please try a JPEG or PNG image.",
          "图片处理失败，请尝试使用 JPEG/PNG 格式"
        )
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    // 验证必填项
    if (!imageUrl) {
      alert(t(locale, "Please upload a clothing photo first.", "请先上传衣服照片"));
      return;
    }

    if (!category) {
      alert(t(locale, "Please choose a clothing category.", "请选择衣服类别"));
      return;
    }

    setIsSaving(true);
    try {
      // 上传图片到对象存储
      let finalImageUrl = imageUrl;
      let imagePath = imageUrl;
      console.log("handleSave - imageUrl 是否为 base64:", imageUrl?.startsWith('data:'));
      
      if (imageUrl.startsWith('data:')) {
        console.log("开始上传图片到对象存储...");
        console.log("图片大小:", Math.round(imageUrl.length / 1024), "KB");
        try {
          const uploadResponse = await turnstileFetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: imageUrl,
              category: "wardrobe",
              userId: userId || "anonymous"
            }),
          });

          const uploadData = await uploadResponse.json();
          console.log("上传响应状态:", uploadResponse.status);
          console.log("上传响应数据:", uploadData);
          
          if (uploadResponse.ok && uploadData.success && uploadData.url) {
            finalImageUrl = uploadData.url;
            imagePath = uploadData.key || uploadData.url;
            console.log("图片上传成功，URL:", finalImageUrl.substring(0, 80));
          } else {
            console.error("上传失败:", uploadData.error || "未知错误");
            alert(
              t(locale, "Image upload failed. Please try again: ", "图片上传失败，请重试: ") +
                (uploadData.error || t(locale, "Unknown error", "未知错误"))
            );
            setIsSaving(false);
            return;
          }
        } catch (err) {
          console.error("上传请求失败:", err);
          alert(
            err instanceof Error
              ? t(locale, "Image upload request failed: ", "图片上传请求失败：") + err.message
              : t(locale, "Image upload request failed. Please try again.", "图片上传请求失败，请重试")
          );
          setIsSaving(false);
          return;
        }
      } else {
        console.log("使用已有URL（签名）:", imageUrl.substring(0, 80));
      }

      const saveResponse = await fetch("/api/wardrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath,
          imageUrl: finalImageUrl,
          category,
          color: color || analyzedData?.color || "gray",
          style_tags: styleTags.length > 0 ? styleTags : analyzedData?.style_tags || [],
          season: season || analyzedData?.seasons?.[0] || "all",
          scenes: analyzedData?.scenes || [],
          seasons: analyzedData?.seasons || [],
          pairing_suggestions: analyzedData?.pairing_suggestions || [],
          body_type: analyzedData?.body_type || [],
          ai_description: analyzedData?.description || null,
          user_description: description || null,
        }),
      });

      const saveData = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveData.error || t(locale, "Save failed.", "保存失败"));
      }

      alert(t(locale, "Saved to your wardrobe.", "保存成功！"));
      router.push("/wardrobe");
    } catch (err: unknown) {
      console.error("保存失败:", err);
      alert(
        t(locale, "Save failed: ", "保存失败: ") +
          ((err as Error)?.message || t(locale, "Please try again.", "请重试"))
      );
      setIsSaving(false);
    }
  };

  const toggleStyleTag = (tag: string) => {
    setStyleTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Show form directly on server, client will handle hydration
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-sm">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            {t(locale, "Refresh", "刷新页面")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff5ef] via-white to-[#f4ecff]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 px-4 pt-12 pb-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/80"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">{t(locale, "Add clothing", "添加衣服")}</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 space-y-6 pb-28">
        {/* Image Upload */}
        <section>
          <div
            className={`
              aspect-square rounded-3xl overflow-hidden bg-white/80 shadow-sm relative
              ${imageUrl ? "" : "border-2 border-dashed border-gray-300/80"}
            `}
          >
            {imageUrl ? (
              <>
                <RemoteImage
                  src={imageUrl}
                  alt={t(locale, "Clothing photo", "衣服照片")}
                  width={1200}
                  height={1200}
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={() => {
                    setImageUrl(null);
                    setAnalyzedData(null);
                    setCategory("");
                    setColor("");
                    setStyleTags([]);
                    setDescription("");
                  }}
                  className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div
                className="flex flex-col items-center justify-center h-full gap-4 cursor-pointer"
                onClick={openUploadPicker}
              >
                <div className="w-16 h-16 rounded-2xl bg-[#fff1ea] flex items-center justify-center">
                  <Shirt className="w-8 h-8 text-[#d96d4f]" />
                </div>
                <p className="text-gray-500 text-center px-8">
                  {t(locale, "Tap to upload a clothing photo", "点击上传衣服照片")}
                  <br />
                  <span className="text-sm">{t(locale, "A plain background works best", "建议使用纯色背景")}</span>
                </p>
              </div>
            )}

            {/* Analyzing overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
                <p className="text-white font-medium">{t(locale, "AI is analyzing...", "AI 正在分析...")}</p>
              </div>
            )}
          </div>

          {/* Upload buttons */}
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-full bg-white/80 hover:bg-white"
              onClick={openUploadPicker}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t(locale, "Choose upload method", "选择上传方式")}
            </Button>
            <input
              ref={libraryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </section>

        {/* AI Analysis Result */}
        {analyzedData && (
          <Card className="p-4 bg-white/80 border-white/60 shadow-sm rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#fff1ea] flex items-center justify-center flex-shrink-0">
                <span className="text-[#d96d4f] text-sm font-medium">AI</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">{t(locale, "AI result", "AI 分析结果")}</h3>
                <p className="text-sm text-gray-600">
                  {analyzedData.description ||
                    t(
                      locale,
                      "We recognized the item. Please confirm or adjust the details below.",
                      "已识别衣服特征，请确认或修改下方信息"
                    )}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Form */}
        <section className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t(locale, "Category", "类别")} <span className="text-red-500">*</span>
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t(locale, "Choose a category", "选择衣服类别")} />
              </SelectTrigger>
              <SelectContent>
                {localizedCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t(locale, "Color", "颜色")}
            </label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t(locale, "Choose a main color", "选择主色调")} />
              </SelectTrigger>
              <SelectContent>
                {localizedColors.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t(locale, "Style tags", "风格标签")}
            </label>
            <div className="flex flex-wrap gap-2">
              {localizedStyleTags.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleStyleTag(tag.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    styleTags.includes(tag.value)
                      ? "bg-accent text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t(locale, "Season", "适合季节")}
            </label>
            <Select value={season} onValueChange={setSeason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t(locale, "Choose a season", "选择适合季节")} />
              </SelectTrigger>
              <SelectContent>
                {localizedSeasons.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t(locale, "Custom note", "自定义描述")}
            </label>
            <Input
              placeholder={t(locale, "Add a note, such as when you bought it or why you like it", "添加备注，如：去年夏天买的，很喜欢...")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>
      </main>

      {/* Save Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-white/60 bg-white/70 backdrop-blur shadow-[0_-4px_18px_rgba(31,41,55,0.08)] safe-bottom z-50">
        <div className="max-w-lg mx-auto space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 bg-[#d96d4f] hover:bg-[#bf5b3f] text-white font-semibold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t(locale, "Saving...", "保存中...")}
                </>
              ) : (
                t(locale, "Save to wardrobe", "保存到衣柜")
              )}
            </button>
          {imageUrl && !category && (
            <p className="text-xs text-center text-gray-400">
              {t(locale, "Please choose a category", "请选择衣服类别")}
            </p>
          )}
        </div>
      </div>

      <ImageSourceSheet
        open={showUploadPicker}
        title={t(locale, "Add a clothing photo", "添加衣服照片")}
        description={t(
          locale,
          "Choose from your photo library, take a photo now, or import an image file.",
          "你可以从照片图库选择、现场拍照，或从文件中导入衣服图片。"
        )}
        onClose={() => setShowUploadPicker(false)}
        onChooseLibrary={() => libraryInputRef.current?.click()}
        onChooseCamera={() => cameraInputRef.current?.click()}
        onChooseFile={() => fileInputRef.current?.click()}
      />
    </div>
  );
}
