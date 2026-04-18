"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  Sparkles,
  ChevronLeft,
  Plus,
  Image as ImageIcon,
  X,
  Check,
  Upload,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { processImageFile } from "@/lib/image-utils";
import { getCurrentUser } from "@/lib/auth-local";

interface WardrobeItem {
  id: string;
  user_id: string;
  image_url: string;
  category: string;
  color?: string | null;
  ai_description?: string | null;
  user_description?: string | null;
  created_at?: string;
}

interface Avatar {
  id: string;
  avatar_url: string;
  nickname: string;
}

type FeedbackType = "like" | "dislike" | "not_today";
type ReplaceableCategory = "tops" | "bottoms";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  personUrl?: string;
  style?: string;
  scene?: string;
  reason?: string;
  items?: WardrobeItem[];
  generationMethod?: string;
  clothing?: string;
  outfitId?: string;
  feedbackType?: FeedbackType;
  uploadPreviewUrl?: string;
  metaType?: "summary" | "result" | "system";
  requestText?: string;
}

interface SessionUser {
  id: string;
  username: string;
}

const DEFAULT_SLASH_PROMPTS = [
  "想显瘦一点",
  "要舒服但别太随便",
  "想清凉一点的",
  "昨天那种",
];

const MAX_STORED_MESSAGES = 40;
const MAX_STORED_PROMPTS = 8;
const TOP_LIKE_CATEGORIES = ["tops", "outerwear"] as const;
const BOTTOM_LIKE_CATEGORIES = ["bottoms"] as const;

interface ReplacePickerState {
  messageId: string;
  requestText: string;
  category: ReplaceableCategory;
  currentItemId?: string;
  baseItems?: WardrobeItem[];
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    tops: "上装",
    bottoms: "下装",
    dresses: "裙装",
    outerwear: "外套",
    shoes: "鞋子",
    bags: "包包",
    accessories: "配饰",
    hats: "帽子",
  };
  return labels[category] || category || "单品";
}

function getColorLabel(color?: string | null) {
  const labels: Record<string, string> = {
    red: "红色",
    blue: "蓝色",
    black: "黑色",
    white: "白色",
    gray: "灰色",
    pink: "粉色",
    purple: "紫色",
    green: "绿色",
    yellow: "黄色",
    orange: "橙色",
    brown: "棕色",
  };
  if (!color) return "";
  return labels[color] || color;
}

function getItemDisplayName(item: Partial<WardrobeItem>) {
  const categoryLabel = getCategoryLabel(item.category || "");
  const colorLabel = getColorLabel(item.color);
  if (colorLabel) {
    return `${colorLabel}${categoryLabel}`;
  }
  return item.user_description || item.ai_description || categoryLabel;
}

function getItemSecondaryText(item: Partial<WardrobeItem>) {
  return item.user_description || item.ai_description || "已收进衣橱";
}

function getReplaceableCategory(item: Pick<WardrobeItem, "category">): ReplaceableCategory | null {
  if (TOP_LIKE_CATEGORIES.includes(item.category as (typeof TOP_LIKE_CATEGORIES)[number])) {
    return "tops";
  }
  if (BOTTOM_LIKE_CATEGORIES.includes(item.category as (typeof BOTTOM_LIKE_CATEGORIES)[number])) {
    return "bottoms";
  }
  return null;
}

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getChatHistoryKey(userId: string | null): string {
  return `ai_outfit_chat_history:${userId || "guest"}`;
}

function getPromptMemoryKey(userId: string | null): string {
  return `ai_outfit_chat_prompts:${userId || "guest"}`;
}

function getSelectedAvatarKey(userId: string | null): string {
  return `ai_outfit_selected_avatars:${userId || "guest"}`;
}

function readJsonArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const value = localStorage.getItem(key);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJsonArray(key: string, value: unknown[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const replaceUploadInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [allAvatars, setAllAvatars] = useState<Avatar[]>([]);
  const [selectedAvatars, setSelectedAvatars] = useState<Avatar[]>([]);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [customPrompts, setCustomPrompts] = useState<string[]>([]);
  const [lockedItem, setLockedItem] = useState<WardrobeItem | null>(null);
  const [replacePicker, setReplacePicker] = useState<ReplacePickerState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackLoadingId, setFeedbackLoadingId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingActionLabel, setPendingActionLabel] = useState<string | null>(null);

  const slashQuery = inputValue.startsWith("/") ? inputValue.slice(1).trim() : "";
  const shouldShowSlashSuggestions = inputValue.startsWith("/");

  const promptSuggestions = useMemo(() => {
    const all = [...customPrompts, ...DEFAULT_SLASH_PROMPTS.filter((item) => !customPrompts.includes(item))];
    if (!slashQuery) return all.slice(0, MAX_STORED_PROMPTS);
    return all.filter((item) => item.toLowerCase().includes(slashQuery.toLowerCase())).slice(0, MAX_STORED_PROMPTS);
  }, [customPrompts, slashQuery]);

  const wardrobeSlashSuggestions = useMemo(() => {
    const filtered = wardrobeItems.filter((item) => {
      if (!slashQuery) return true;
      const haystack = [
        getItemDisplayName(item),
        item.ai_description || "",
        item.user_description || "",
        item.category || "",
        item.color || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(slashQuery.toLowerCase());
    });

    return filtered.slice(0, 6);
  }, [slashQuery, wardrobeItems]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      void loadData();
    }
  }, [mounted]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!mounted) return;
    saveJsonArray(getChatHistoryKey(user?.id || null), messages.slice(-MAX_STORED_MESSAGES));
  }, [mounted, messages, user?.id]);

  useEffect(() => {
    if (!mounted) return;
    saveJsonArray(getPromptMemoryKey(user?.id || null), customPrompts.slice(0, MAX_STORED_PROMPTS));
  }, [mounted, customPrompts, user?.id]);

  useEffect(() => {
    if (!mounted) return;
    saveJsonArray(
      getSelectedAvatarKey(user?.id || null),
      selectedAvatars.map((avatar) => avatar.id)
    );
  }, [mounted, selectedAvatars, user?.id]);

  const loadData = async () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    const storedMessages = readJsonArray<ChatMessage>(getChatHistoryKey(currentUser?.id || null));
    const storedPrompts = readJsonArray<string>(getPromptMemoryKey(currentUser?.id || null));
    setMessages(storedMessages);
    setCustomPrompts(storedPrompts.map(String));

    try {
      const [wardrobeResponse, portraitResponse] = await Promise.all([
        fetch("/api/wardrobe"),
        fetch("/api/portraits"),
      ]);

      const wardrobeData = wardrobeResponse.ok ? await wardrobeResponse.json() : { items: [] };
      const portraitsData = portraitResponse.ok ? await portraitResponse.json() : { portraits: [] };

      const items = (wardrobeData.items || []) as WardrobeItem[];
      const avatarList: Avatar[] = (portraitsData.portraits || []).map((portrait: Avatar) => ({
        id: portrait.id,
        avatar_url: portrait.avatar_url,
        nickname: portrait.nickname || "未命名",
      }));

      setWardrobeItems(items);
      setAllAvatars(avatarList);

      const storedAvatarIds = readJsonArray<string>(getSelectedAvatarKey(currentUser?.id || null));
      const restoredAvatars = avatarList.filter((avatar) => storedAvatarIds.includes(avatar.id));

      if (restoredAvatars.length > 0) {
        setSelectedAvatars(restoredAvatars);
      } else if (avatarList[0]) {
        setSelectedAvatars([avatarList[0]]);
      }
    } catch (error) {
      console.error("加载聊天数据失败:", error);
    } finally {
      setIsInitialized(true);
    }
  };

  const appendMessages = (nextMessages: ChatMessage[]) => {
    setMessages((current) => [...current, ...nextMessages]);
  };

  const buildResultMessages = (data: { results?: Array<Record<string, unknown>> }, requestText: string) => {
    const summaryMessage: ChatMessage = {
      id: makeId(),
      role: "assistant",
      content: `这次先给你 ${data.results?.length || 1} 套结果。聊天记录会保留在这里，下次回来还能继续看。`,
      metaType: "summary",
    };

    const resultMessages: ChatMessage[] = (data.results || []).map((result: Record<string, unknown>, index: number) => ({
      id: makeId(),
      role: "assistant",
      content: String(result.reason || `方案 ${index + 1}`),
      reason: String(result.reason || ""),
      imageUrl: result.imageUrl ? String(result.imageUrl) : undefined,
      personUrl: result.personUrl ? String(result.personUrl) : undefined,
      style: result.style ? String(result.style) : undefined,
      scene: result.scene ? String(result.scene) : undefined,
      items: Array.isArray(result.items) ? (result.items as WardrobeItem[]) : [],
      generationMethod: result.generationMethod ? String(result.generationMethod) : undefined,
      clothing: result.clothing ? String(result.clothing) : undefined,
      outfitId: result.outfitId ? String(result.outfitId) : undefined,
      metaType: "result",
      requestText,
    }));

    return [summaryMessage, ...resultMessages];
  };

  const rememberPrompt = (prompt: string) => {
    const value = prompt.trim();
    if (!value || DEFAULT_SLASH_PROMPTS.includes(value)) return;

    setCustomPrompts((current) => [
      value,
      ...current.filter((item) => item !== value),
    ].slice(0, MAX_STORED_PROMPTS));
  };

  const resolveRequirementText = (rawText: string): string => {
    if (rawText !== "昨天那种") {
      return rawText;
    }

    const previousUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user" && message.content !== "昨天那种");

    return previousUserMessage?.content || "延续昨天那种感觉";
  };

  const buildMissingGuide = () => {
    const missingPortrait = selectedAvatars.length === 0;
    const missingWardrobe = wardrobeItems.length === 0;

    if (missingPortrait && missingWardrobe) {
      return "先传 1 张本人照和 2-3 件常穿衣服。你也可以直接点输入框左边上传，AI 会自动判断是人像还是衣服并帮你入库。";
    }
    if (missingPortrait) {
      return "还缺 1 张本人照。直接点输入框左边上传，AI 会自动识别并加入“我的照片”。";
    }
    return "还缺几件常穿衣服。直接点输入框左边上传，AI 会自动识别颜色、类型并加入衣橱。";
  };

  const requestOutfit = async ({
    userFacingText,
    requestText,
    lockedItemIds = [],
    baseOutfitItemIds = [],
    replaceCategory,
    replaceWithItemId,
  }: {
    userFacingText: string;
    requestText: string;
    lockedItemIds?: string[];
    baseOutfitItemIds?: string[];
    replaceCategory?: ReplaceableCategory;
    replaceWithItemId?: string;
  }) => {
    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: userFacingText,
      metaType: "summary",
    };

    if (selectedAvatars.length === 0 || wardrobeItems.length === 0) {
      appendMessages([
        userMessage,
        {
          id: makeId(),
          role: "assistant",
          content: buildMissingGuide(),
          metaType: "system",
        },
      ]);
      return;
    }

    appendMessages([userMessage]);
    setIsLoading(true);
    setPendingActionLabel(userFacingText);

    try {
      const response = await fetch("/api/generate-outfit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: requestText,
          wardrobeItems,
          avatars: selectedAvatars,
          lockedItemIds,
          baseOutfitItemIds,
          replaceCategory,
          replaceWithItemId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      appendMessages(buildResultMessages(data, requestText));
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      appendMessages([
        {
          id: makeId(),
          role: "assistant",
          content: `这次没成功：${message}`,
          metaType: "system",
        },
      ]);
    } finally {
      setIsLoading(false);
      setPendingActionLabel(null);
    }
  };

  const toggleAvatarSelection = (avatar: Avatar) => {
    const isSelected = selectedAvatars.some((item) => item.id === avatar.id);

    if (isSelected) {
      if (selectedAvatars.length > 1) {
        setSelectedAvatars((current) => current.filter((item) => item.id !== avatar.id));
      } else {
        toast.warning("至少保留一张试衣人像");
      }
      return;
    }

    setSelectedAvatars((current) => [...current, avatar]);
  };

  const saveFeedback = async (messageId: string, outfitId: string | undefined, feedbackType: FeedbackType) => {
    if (!outfitId || feedbackLoadingId) return;

    setFeedbackLoadingId(messageId);
    const previousMessages = messages;
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, feedbackType } : message
      )
    );

    try {
      const response = await fetch("/api/outfit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outfitId,
          feedbackType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "保存反馈失败");
      }
    } catch (error) {
      console.error("保存反馈失败:", error);
      setMessages(previousMessages);
      toast.error(error instanceof Error ? error.message : "保存反馈失败");
    } finally {
      setFeedbackLoadingId(null);
    }
  };

  const handleSend = async (text?: string) => {
    const rawValue = (text ?? inputValue).trim();
    const messageText = rawValue.startsWith("/") ? rawValue.slice(1).trim() : rawValue;
    const normalizedText = messageText || (lockedItem ? "给我一套不用想的" : "");
    if (!normalizedText || isLoading) return;

    rememberPrompt(normalizedText);
    if (!text) {
      setInputValue("");
    }

    const resolvedRequirement = resolveRequirementText(normalizedText);
    const userFacingText = lockedItem
      ? `用“${getItemDisplayName(lockedItem)}”来搭${normalizedText ? `：${normalizedText}` : ""}`
      : normalizedText;

    await requestOutfit({
      userFacingText,
      requestText: resolvedRequirement,
      lockedItemIds: lockedItem ? [lockedItem.id] : [],
    });
  };

  const runReplaceAction = async ({
    message,
    category,
    replaceWithItemId,
    label,
  }: {
    message: ChatMessage;
    category: ReplaceableCategory;
    replaceWithItemId?: string;
    label: string;
  }) => {
    if (!message.items || message.items.length === 0 || isLoading) {
      return;
    }

    await requestOutfit({
      userFacingText: label,
      requestText: message.requestText || message.scene || "给我一套不用想的",
      baseOutfitItemIds: message.items.map((item) => item.id).filter(Boolean),
      replaceCategory: category,
      replaceWithItemId,
    });
  };

  const handleChooseSuggestion = (prompt: string) => {
    setInputValue(prompt);
    requestAnimationFrame(() => {
      textInputRef.current?.focus();
    });
  };

  const handleChooseWardrobeSuggestion = (item: WardrobeItem) => {
    setLockedItem(item);
    setInputValue("");
    requestAnimationFrame(() => {
      textInputRef.current?.focus();
    });
  };

  const handleChatUpload = async (file: File) => {
    if (!user) {
      toast.error("请先登录后再上传图片");
      router.push("/auth/login");
      return;
    }

    setIsUploading(true);

    try {
      const base64 = await processImageFile(file);
      const previewMessage: ChatMessage = {
        id: makeId(),
        role: "user",
        content: "上传了一张图片",
        uploadPreviewUrl: base64,
        metaType: "summary",
      };
      appendMessages([previewMessage]);

      const intakeResponse = await fetch("/api/chat-image-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const intakeData = await intakeResponse.json();
      if (!intakeResponse.ok) {
        throw new Error(intakeData.error || "图片识别失败");
      }

      const result = intakeData.result as {
        kind: "portrait" | "clothing";
        nickname?: string;
        category?: string | null;
        color?: string | null;
        style_tags?: string[];
        description?: string;
      };

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          category: result.kind === "portrait" ? "avatars" : "wardrobe",
          userId: user.id,
        }),
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || "图片上传失败");
      }

      if (result.kind === "portrait") {
        const saveResponse = await fetch("/api/portraits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatarPath: uploadData.url,
            nickname: result.nickname || `人像 ${allAvatars.length + 1}`,
          }),
        });
        const saveData = await saveResponse.json();
        if (!saveResponse.ok) {
          throw new Error(saveData.error || "保存人像失败");
        }

        const portrait = saveData.portrait as Avatar;
        setAllAvatars((current) => [portrait, ...current]);
        setSelectedAvatars((current) => [portrait, ...current.filter((item) => item.id !== portrait.id)]);
        appendMessages([
          {
            id: makeId(),
            role: "assistant",
            content: `已识别为本人照，已经加入“我的照片”。${wardrobeItems.length === 0 ? "接下来再传 2-3 件常穿衣服，我就能开始搭配。" : "现在可以直接发需求开始搭配了。"}`,
            metaType: "system",
          },
        ]);
      } else {
        const saveResponse = await fetch("/api/wardrobe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imagePath: uploadData.url,
            category: result.category || "tops",
            color: result.color || "gray",
            style_tags: Array.isArray(result.style_tags) ? result.style_tags : [],
            ai_description: result.description || "已识别衣橱单品",
            user_description: null,
          }),
        });
        const saveData = await saveResponse.json();
        if (!saveResponse.ok) {
          throw new Error(saveData.error || "保存衣服失败");
        }

        const item = saveData.item as WardrobeItem;
        setWardrobeItems((current) => [item, ...current]);
        appendMessages([
          {
            id: makeId(),
            role: "assistant",
            content: `已识别为${result.color || "这件"}${result.category ? getCategoryLabel(result.category) : "单品"}，自动加入衣橱了。${selectedAvatars.length === 0 ? "再传 1 张本人照就能开始搭配。" : "你现在可以直接发诉求让我搭配。"} `,
            metaType: "system",
          },
        ]);
      }
    } catch (error) {
      console.error("聊天上传失败:", error);
      appendMessages([
        {
          id: makeId(),
          role: "assistant",
          content: error instanceof Error ? error.message : "上传失败，请重试",
          metaType: "system",
        },
      ]);
    } finally {
      setIsUploading(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  };

  const getReplacementItems = (category: ReplaceableCategory, currentItemId?: string) =>
    wardrobeItems.filter((item) => {
      const itemCategory = getReplaceableCategory(item);
      if (itemCategory !== category) return false;
      if (currentItemId && item.id === currentItemId) return false;
      return true;
    });

  const topItemLabel = (category: ReplaceableCategory) => (category === "tops" ? "上衣" : "裤子");

  if (!mounted || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ paddingBottom: "80px" }}>
      <header className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <span className="font-semibold">AI 穿搭</span>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="bg-accent/5 px-4 py-2 border-b border-accent/10">
        <p className="text-sm text-accent">
          {selectedAvatars.length > 0 && wardrobeItems.length > 0
            ? `已就绪：${wardrobeItems.length} 件衣服 + ${selectedAvatars.length} 张人像。输入 / 可选常用诉求，也能锁定某件单品。`
            : `还差素材：${selectedAvatars.length === 0 ? "本人照" : ""}${selectedAvatars.length === 0 && wardrobeItems.length === 0 ? " + " : ""}${wardrobeItems.length === 0 ? "衣服照片" : ""}。可直接在聊天框左侧上传。`}
        </p>
      </div>

      {(selectedAvatars.length > 0 || allAvatars.length > 0) && (
        <div className="bg-white px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <span className="text-sm text-gray-500 shrink-0">试衣人:</span>

            {selectedAvatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => toggleAvatarSelection(avatar)}
                className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-accent shrink-0"
              >
                <img src={avatar.avatar_url} alt={avatar.nickname} className="w-full h-full object-cover" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <X className="w-2.5 h-2.5 text-white" />
                </div>
              </button>
            ))}

            {allAvatars.length > selectedAvatars.length && (
              <button
                onClick={() => setShowAvatarSelector(true)}
                className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 shrink-0 hover:border-accent hover:text-accent transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}

            {allAvatars.length > 0 && allAvatars.length === selectedAvatars.length && (
              <button
                onClick={() => router.push("/profile")}
                className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 shrink-0 hover:border-accent hover:text-accent transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {showAvatarSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">选择人像</h3>
              <button
                onClick={() => setShowAvatarSelector(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {allAvatars.map((avatar) => {
                const isSelected = selectedAvatars.some((item) => item.id === avatar.id);
                return (
                  <button
                    key={avatar.id}
                    onClick={() => toggleAvatarSelection(avatar)}
                    className="relative"
                  >
                    <div className={`aspect-square rounded-xl overflow-hidden border-2 ${isSelected ? "border-accent" : "border-gray-200"}`}>
                      <img src={avatar.avatar_url} alt={avatar.nickname} className="w-full h-full object-cover" />
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1 text-center truncate">{avatar.nickname}</p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setShowAvatarSelector(false);
                router.push("/profile");
              }}
              className="w-full mt-6 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-accent hover:text-accent transition-colors"
            >
              <div className="flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                <span>去添加更多人像</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {replacePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">指定替换这件{topItemLabel(replacePicker.category)}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  先保留其它单品，只替换这一类。你选中的会作为新主角重新生成。
                </p>
              </div>
              <button
                onClick={() => setReplacePicker(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {getReplacementItems(replacePicker.category, replacePicker.currentItemId).length > 0 ? (
                getReplacementItems(replacePicker.category, replacePicker.currentItemId).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      const message = messages.find((entry) => entry.id === replacePicker.messageId);
                      if (!message) return;
                      setReplacePicker(null);
                      void runReplaceAction({
                        message,
                        category: replacePicker.category,
                        replaceWithItemId: item.id,
                        label: `把${topItemLabel(replacePicker.category)}换成“${getItemDisplayName(item)}”`,
                      });
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 p-3 text-left hover:border-accent/40 hover:bg-accent/5"
                  >
                    <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      <img src={item.image_url} alt={getItemDisplayName(item)} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{getItemDisplayName(item)}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-500">{getItemSecondaryText(item)}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                  衣橱里还没有别的可替换{topItemLabel(replacePicker.category)}，先去多加一两件会更有选择。
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">把需求发过来，我会保留最近几次穿搭记录</h2>
              <p className="text-gray-500 mb-6">输入 `/` 查看常用诉求，也可以直接锁定某件单品，再让我补齐整套。</p>

              <div className="max-w-md mx-auto rounded-2xl bg-white p-4 shadow-sm text-left">
                <p className="text-sm font-medium text-gray-900">最小起步</p>
                <p className="mt-2 text-sm text-gray-600">1 张本人照 + 2-3 件常穿衣服就够了。上传后我会自动判断并入库。</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    className="px-3 py-2 rounded-full bg-accent text-white text-sm"
                  >
                    直接上传图片
                  </button>
                  <button
                    onClick={() => router.push("/wardrobe/add")}
                    className="px-3 py-2 rounded-full border border-gray-200 text-sm text-gray-700"
                  >
                    去加衣服
                  </button>
                  <button
                    onClick={() => router.push("/profile")}
                    className="px-3 py-2 rounded-full border border-gray-200 text-sm text-gray-700"
                  >
                    去加人像
                  </button>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[88%] ${message.role === "user" ? "order-2" : "order-1"}`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-base ${
                    message.role === "user"
                      ? "bg-accent text-white rounded-br-md"
                      : "bg-white text-gray-800 rounded-bl-md shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>

                {message.uploadPreviewUrl && (
                  <div className="mt-3 rounded-2xl overflow-hidden bg-white shadow-sm p-3">
                    <img
                      src={message.uploadPreviewUrl}
                      alt="upload-preview"
                      className="w-36 rounded-xl object-cover"
                    />
                  </div>
                )}

                {message.items && message.items.length > 0 && (
                  <div className="mt-3 bg-white rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                          {message.generationMethod || "搭配结果"}
                        </span>
                        {message.style ? <p className="font-medium text-gray-800">{message.style}</p> : null}
                      </div>

                      {message.reason ? (
                        <div className="mt-3 rounded-xl bg-[#f8f5ef] px-3 py-3">
                          <p className="text-xs font-medium text-gray-500">搭配理由</p>
                          <p className="mt-1 text-sm text-gray-700 leading-relaxed">{message.reason}</p>
                        </div>
                      ) : null}
                    </div>

                    {message.imageUrl ? (
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50">
                        <p className="text-sm font-medium text-purple-700 mb-2">穿搭效果图</p>
                        <div className="rounded-xl overflow-hidden bg-white shadow-sm">
                          <img src={message.imageUrl} alt="虚拟试衣效果" className="w-full max-w-md mx-auto" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#fff7ed] border-y border-[#fde7cf]">
                        <p className="text-sm font-medium text-[#b45309]">这次没成功生成试穿图</p>
                        <p className="mt-1 text-sm text-[#92400e]">先看下面这套结构和理由，稍后我们可以再重试一版生图。</p>
                      </div>
                    )}

                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-700">搭配结构</p>
                        <span className="text-xs text-gray-500">{message.clothing}</span>
                      </div>

                      <div className="flex gap-3 overflow-x-auto pb-2">
                        <div className="shrink-0">
                          <p className="text-xs text-gray-400 mb-1 text-center">你的照片</p>
                          <div className="w-20 h-28 rounded-lg overflow-hidden bg-gray-100 border border-accent/30 shadow-sm">
                            <img
                              src={message.personUrl || selectedAvatars[0]?.avatar_url}
                              alt="你的照片"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center">
                          <span className="text-lg text-gray-300">→</span>
                        </div>

                        {message.items.map((item, index) => (
                          <div key={`${message.id}_${index}`} className="shrink-0">
                            <p className="text-xs text-gray-400 mb-1 text-center">{getCategoryLabel(item.category)}</p>
                            <div className="w-16 h-22 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                              <img
                                src={item.image_url}
                                alt={item.ai_description || "衣服"}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {(() => {
                        const topItem = message.items.find((item) => getReplaceableCategory(item) === "tops");
                        const bottomItem = message.items.find((item) => getReplaceableCategory(item) === "bottoms");
                        const replacementEntries = [
                          topItem ? { item: topItem, category: "tops" as ReplaceableCategory } : null,
                          bottomItem ? { item: bottomItem, category: "bottoms" as ReplaceableCategory } : null,
                        ].filter(Boolean) as Array<{ item: WardrobeItem; category: ReplaceableCategory }>;

                        if (replacementEntries.length === 0) {
                          return null;
                        }

                        return (
                          <div className="mt-4 rounded-2xl border border-[#eaded2] bg-[#fffaf5] p-3">
                            <p className="text-sm font-medium text-gray-900">局部换件</p>
                            <p className="mt-1 text-xs leading-5 text-gray-500">
                              先保留整套方向不变，只替换你最想调整的那件。
                            </p>
                            <div className="mt-3 space-y-3">
                              {replacementEntries.map(({ item, category }) => (
                                <div
                                  key={`${message.id}_${category}_replace`}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {topItemLabel(category)}：{getItemDisplayName(item)}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">{getItemSecondaryText(item)}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() =>
                                        void runReplaceAction({
                                          message,
                                          category,
                                          label: `把这套里的${topItemLabel(category)}换一件`,
                                        })
                                      }
                                      disabled={isLoading}
                                      className="rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
                                    >
                                      换{topItemLabel(category)}
                                    </button>
                                    <button
                                      onClick={() =>
                                        setReplacePicker({
                                          messageId: message.id,
                                          requestText: message.requestText || message.scene || "给我一套不用想的",
                                          category,
                                          currentItemId: item.id,
                                          baseItems: message.items || [],
                                        })
                                      }
                                      disabled={isLoading}
                                      className="rounded-full border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent disabled:opacity-50"
                                    >
                                      指定替换
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {message.outfitId ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {[
                            { type: "like" as FeedbackType, label: "喜欢" },
                            { type: "dislike" as FeedbackType, label: "不喜欢" },
                            { type: "not_today" as FeedbackType, label: "今天不适合" },
                          ].map((feedback) => {
                            const active = message.feedbackType === feedback.type;
                            return (
                              <button
                                key={feedback.type}
                                onClick={() => void saveFeedback(message.id, message.outfitId, feedback.type)}
                                disabled={feedbackLoadingId === message.id}
                                className={`px-3 py-2 rounded-full text-sm transition-colors ${
                                  active
                                    ? "bg-accent text-white"
                                    : "border border-gray-200 text-gray-700 bg-white"
                                } ${feedbackLoadingId === message.id ? "opacity-60" : ""}`}
                              >
                                {feedback.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">
                  {pendingActionLabel ? `正在处理“${pendingActionLabel}”...` : "正在选衣服、生成理由和效果图..."}
                </span>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">正在识别这张图是人像还是衣服...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div
        className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-lg mx-auto relative">
          {shouldShowSlashSuggestions && (
            <div className="absolute left-0 right-0 bottom-[calc(100%+12px)] rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
              {promptSuggestions.length > 0 || wardrobeSlashSuggestions.length > 0 ? (
                <div className="max-h-[50vh] overflow-y-auto py-2">
                  {promptSuggestions.length > 0 ? (
                    <div>
                      <p className="px-4 pb-2 pt-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
                        常用诉求
                      </p>
                      {promptSuggestions.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleChooseSuggestion(prompt)}
                          className="w-full border-b border-gray-50 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 last:border-b-0"
                        >
                          / {prompt}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {wardrobeSlashSuggestions.length > 0 ? (
                    <div className={promptSuggestions.length > 0 ? "border-t border-gray-100 pt-2" : ""}>
                      <p className="px-4 pb-2 pt-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
                        我的衣橱
                      </p>
                      {wardrobeSlashSuggestions.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleChooseWardrobeSuggestion(item)}
                          className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 last:border-b-0"
                        >
                          <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            <img src={item.image_url} alt={getItemDisplayName(item)} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800">{getItemDisplayName(item)}</p>
                            <p className="mt-1 truncate text-xs text-gray-500">{getItemSecondaryText(item)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">没有匹配项，直接输入后发送也会记住。</div>
              )}
            </div>
          )}

          {lockedItem ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500">已指定主角单品</span>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-accent">
                <span>{getItemDisplayName(lockedItem)}</span>
                <button
                  onClick={() => setLockedItem(null)}
                  className="rounded-full bg-white/80 p-0.5 text-accent"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex gap-2 items-center">
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleChatUpload(file);
                }
              }}
            />

            <button
              onClick={() => uploadInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="w-12 h-12 rounded-full border border-gray-200 bg-white text-gray-600 flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
            </button>

            <input
              ref={textInputRef}
              type="text"
              placeholder={lockedItem ? "继续说需求，我会围绕这件来搭" : "输入 / 看常用诉求，或直接描述今天想穿什么"}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSend();
                }
              }}
              disabled={isLoading || isUploading}
              className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
            />

            <button
              onClick={() => void handleSend()}
              disabled={
                (
                  (!inputValue.trim() || inputValue.trim() === "/") &&
                  !lockedItem
                ) ||
                isLoading ||
                isUploading
              }
              className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center disabled:bg-gray-300 transition-colors shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
