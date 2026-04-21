"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ImageSourceSheet } from "@/components/image-source-sheet";
import { RemoteImage } from "@/components/remote-image";
import { toast } from "sonner";
import { processImageFile } from "@/lib/image-utils";
import { getCurrentUser } from "@/lib/auth-local";
import {
  t,
  translateCategory,
  translateColor,
} from "@/lib/locale";
import { useLocale } from "@/contexts/locale-context";
import { useTurnstileFetch } from "@/hooks/use-turnstile-fetch";

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
  generationError?: string;
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

interface HistoryRecord {
  id: string;
  user_requirement: string;
  scene: string | null;
  recommended_style: string | null;
  reason: string | null;
  result_image_url: string;
  is_selected: number;
  created_at: string;
  items: Array<{
    id: string;
    category: string;
    color: string | null;
    description: string;
    image_url: string;
  }>;
}

const DEFAULT_SLASH_PROMPTS = {
  en: [
    "I want to look slimmer",
    "Keep it comfortable but still polished",
    "Something cooler for today",
    "Same as yesterday",
  ],
  zh: [
    "想显瘦一点",
    "要舒服但别太随便",
    "想清凉一点的",
    "昨天那种",
  ],
} as const;

const MAX_STORED_MESSAGES = 40;
const MAX_STORED_PROMPTS = 8;
const TOP_LIKE_CATEGORIES = ["tops", "outerwear"] as const;
const BOTTOM_LIKE_CATEGORIES = ["bottoms"] as const;
const CHAT_COMPOSER_BOTTOM_OFFSET = "calc(env(safe-area-inset-bottom) + 104px)";
const CHAT_CONTENT_BOTTOM_PADDING = "calc(env(safe-area-inset-bottom) + 236px)";

interface ReplacePickerState {
  messageId: string;
  requestText: string;
  category: ReplaceableCategory;
  currentItemId?: string;
  baseItems?: WardrobeItem[];
}

function getCategoryLabel(category: string, locale: "en" | "zh") {
  return translateCategory(category, locale) || t(locale, "Item", "单品");
}

function getColorLabel(color: string | null | undefined, locale: "en" | "zh") {
  if (!color) return "";
  return translateColor(color, locale) || color;
}

function getItemDisplayName(item: Partial<WardrobeItem>, locale: "en" | "zh") {
  const categoryLabel = getCategoryLabel(item.category || "", locale);
  const colorLabel = getColorLabel(item.color, locale);
  if (colorLabel) {
    return locale === "zh" ? `${colorLabel}${categoryLabel}` : `${colorLabel} ${categoryLabel}`;
  }
  return item.user_description || item.ai_description || categoryLabel;
}

function getItemSecondaryText(item: Partial<WardrobeItem>, locale: "en" | "zh") {
  return item.user_description || item.ai_description || t(locale, "Saved in wardrobe", "已收进衣橱");
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
  const { locale } = useLocale();
  const turnstileFetch = useTurnstileFetch();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uploadLibraryInputRef = useRef<HTMLInputElement>(null);
  const uploadCameraInputRef = useRef<HTMLInputElement>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
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
  const [showUploadPicker, setShowUploadPicker] = useState(false);

  const slashQuery = inputValue.startsWith("/") ? inputValue.slice(1).trim() : "";
  const shouldShowSlashSuggestions = inputValue.startsWith("/");
  const defaultSlashPrompts = DEFAULT_SLASH_PROMPTS[locale];

  const promptSuggestions = useMemo(() => {
    const all = [...customPrompts, ...defaultSlashPrompts.filter((item) => !customPrompts.includes(item))];
    if (!slashQuery) return all.slice(0, MAX_STORED_PROMPTS);
    return all.filter((item) => item.toLowerCase().includes(slashQuery.toLowerCase())).slice(0, MAX_STORED_PROMPTS);
  }, [customPrompts, defaultSlashPrompts, slashQuery]);

  const wardrobeSlashSuggestions = useMemo(() => {
    const filtered = wardrobeItems.filter((item) => {
      if (!slashQuery) return true;
      const haystack = [
        getItemDisplayName(item, locale),
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
  }, [locale, slashQuery, wardrobeItems]);

  const buildHistoryMessages = useCallback((
    historyEntries: HistoryRecord[],
    existingOutfitIds: Set<string>,
    currentUserId: string | null
  ): ChatMessage[] => {
    const seededMessages: ChatMessage[] = [];

    [...historyEntries]
      .reverse()
      .forEach((entry) => {
        if (!entry.id || existingOutfitIds.has(entry.id)) {
          return;
        }

        seededMessages.push({
          id: `history_user_${entry.id}`,
          role: "user",
          content: entry.user_requirement,
          metaType: "summary",
        });

        seededMessages.push({
          id: `history_result_${entry.id}`,
          role: "assistant",
          content:
            entry.reason ||
            entry.user_requirement ||
            t(locale, "Saved look", "历史穿搭"),
          reason: entry.reason || undefined,
          imageUrl: entry.result_image_url || undefined,
          style: entry.recommended_style || undefined,
          scene: entry.scene || undefined,
          items: entry.items.map((item) => ({
            id: item.id,
            user_id: currentUserId || "",
            image_url: item.image_url,
            category: item.category,
            color: item.color,
            ai_description: item.description,
          })),
          generationMethod: t(locale, "Saved look", "历史穿搭"),
          outfitId: entry.id,
          metaType: "result",
          requestText: entry.user_requirement,
        });
      });

    return seededMessages;
  }, [locale]);

  const loadData = useCallback(async () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    const storedMessages = readJsonArray<ChatMessage>(getChatHistoryKey(currentUser?.id || null));
    const storedPrompts = readJsonArray<string>(getPromptMemoryKey(currentUser?.id || null));
    setCustomPrompts(storedPrompts.map(String));

    try {
      const [wardrobeResponse, portraitResponse, historyResponse] = await Promise.all([
        fetch("/api/wardrobe"),
        fetch("/api/portraits"),
        fetch("/api/history"),
      ]);

      const wardrobeData = wardrobeResponse.ok ? await wardrobeResponse.json() : { items: [] };
      const portraitsData = portraitResponse.ok ? await portraitResponse.json() : { portraits: [] };
      const historyData = historyResponse.ok ? await historyResponse.json() : { history: [] };

      const items = (wardrobeData.items || []) as WardrobeItem[];
      const avatarList: Avatar[] = (portraitsData.portraits || []).map((portrait: Avatar) => ({
        id: portrait.id,
        avatar_url: portrait.avatar_url,
        nickname: portrait.nickname || t(locale, "Untitled", "未命名"),
      }));
      const historyEntries = (historyData.history || []) as HistoryRecord[];

      setWardrobeItems(items);
      setAllAvatars(avatarList);

      const existingOutfitIds = new Set(
        storedMessages
          .map((message) => message.outfitId)
          .filter(Boolean) as string[]
      );
      const seededHistoryMessages = buildHistoryMessages(
        historyEntries,
        existingOutfitIds,
        currentUser?.id || null
      );
      const mergedMessages = [...seededHistoryMessages, ...storedMessages].slice(-MAX_STORED_MESSAGES);
      setMessages(mergedMessages);

      const storedAvatarIds = readJsonArray<string>(getSelectedAvatarKey(currentUser?.id || null));
      const restoredAvatars = avatarList.filter((avatar) => storedAvatarIds.includes(avatar.id));

      if (restoredAvatars.length > 0) {
        setSelectedAvatars(restoredAvatars);
      } else if (avatarList[0]) {
        setSelectedAvatars([avatarList[0]]);
      }
    } catch (error) {
      console.error("加载聊天数据失败:", error);
      setMessages(storedMessages);
    } finally {
      setIsInitialized(true);
    }
  }, [locale, buildHistoryMessages]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      void loadData();
    }
  }, [mounted, loadData]);

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

  const appendMessages = (nextMessages: ChatMessage[]) => {
    setMessages((current) => [...current, ...nextMessages]);
  };

  const updateMessage = (messageId: string, updater: (message: ChatMessage) => ChatMessage) => {
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? updater(message) : message))
    );
  };

  const buildResultMessages = useCallback((data: { results?: Array<Record<string, unknown>> }, requestText: string) => {
    const summaryMessage: ChatMessage = {
      id: makeId(),
      role: "assistant",
      content: t(
        locale,
        `Here are ${data.results?.length || 1} looks to start with. This thread stays here, so you can come back and keep going.`,
        `这次先给你 ${data.results?.length || 1} 套结果。聊天记录会保留在这里，下次回来还能继续看。`
      ),
      metaType: "summary",
    };

    const resultMessages: ChatMessage[] = (data.results || []).map((result: Record<string, unknown>, index: number) => ({
      id: makeId(),
      role: "assistant",
      content: String(result.reason || t(locale, `Look ${index + 1}`, `方案 ${index + 1}`)),
      reason: String(result.reason || ""),
      imageUrl: result.imageUrl ? String(result.imageUrl) : undefined,
      personUrl: result.personUrl ? String(result.personUrl) : undefined,
      style: result.style ? String(result.style) : undefined,
      scene: result.scene ? String(result.scene) : undefined,
      items: Array.isArray(result.items) ? (result.items as WardrobeItem[]) : [],
      generationMethod: result.generationMethod ? String(result.generationMethod) : undefined,
      clothing: result.clothing ? String(result.clothing) : undefined,
      generationError: result.generationError ? String(result.generationError) : undefined,
      outfitId: result.outfitId ? String(result.outfitId) : undefined,
      metaType: "result",
      requestText,
    }));

    return [summaryMessage, ...resultMessages];
  }, [locale]);

  const rememberPrompt = (prompt: string) => {
    const value = prompt.trim();
    if (!value || defaultSlashPrompts.some((item) => item === value)) return;

    setCustomPrompts((current) => [
      value,
      ...current.filter((item) => item !== value),
    ].slice(0, MAX_STORED_PROMPTS));
  };

  const buildPendingJobCopy = useCallback((requestText: string) =>
    t(
      locale,
      `Generating "${requestText}" now. Usually this takes about 20-45 seconds.`,
      `正在生成“${requestText}”。通常需要 20-45 秒。`
    ), [locale]);

  const buildPendingLoadingCopy = useCallback((requestText: string) =>
    t(
      locale,
      `Generating "${requestText}" now. We're matching pieces and rendering the try-on.`,
      `正在生成“${requestText}”，会先选衣服，再出试衣图。`
    ), [locale]);

  const resolveRequirementText = (rawText: string): string => {
    const repeatPrompt = t(locale, "Same as yesterday", "昨天那种");
    if (rawText !== repeatPrompt) {
      return rawText;
    }

    const previousUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user" && message.content !== repeatPrompt);

    return previousUserMessage?.content || t(locale, "Keep the same vibe as yesterday", "延续昨天那种感觉");
  };

  const buildMissingGuide = () => {
    const missingPortrait = selectedAvatars.length === 0;
    const missingWardrobe = wardrobeItems.length === 0;

    if (missingPortrait && missingWardrobe) {
      return t(
        locale,
        "Start with 1 portrait and 2-3 clothes you wear often. You can upload from the button on the left and AI will sort them automatically.",
        "先传 1 张本人照和 2-3 件常穿衣服。你也可以直接点输入框左边上传，AI 会自动判断是人像还是衣服并帮你入库。"
      );
    }
    if (missingPortrait) {
      return t(
        locale,
        "You still need 1 portrait. Upload from the button on the left and AI will add it to your portraits.",
        "还缺 1 张本人照。直接点输入框左边上传，AI 会自动识别并加入“我的照片”。"
      );
    }
    return t(
      locale,
      "You still need a few everyday clothes. Upload from the button on the left and AI will tag and save them to your wardrobe.",
      "还缺几件常穿衣服。直接点输入框左边上传，AI 会自动识别颜色、类型并加入衣橱。"
    );
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
    const assistantMessageId = makeId();

    try {
      appendMessages([
        {
          id: assistantMessageId,
          role: "assistant",
          content: buildPendingJobCopy(requestText),
          metaType: "system",
        },
      ]);

      const response = await turnstileFetch("/api/generate-outfit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: requestText,
          userFacingText,
          wardrobeItems,
          avatars: selectedAvatars,
          lockedItemIds,
          baseOutfitItemIds,
          replaceCategory,
          replaceWithItemId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t(locale, "Generation failed.", "生成失败"));
      }

      updateMessage(assistantMessageId, (pendingMessage) => ({
        ...pendingMessage,
        content: t(
          locale,
          "The look is ready below.",
          "结果已经好了，往下看。"
        ),
      }));
      appendMessages(buildResultMessages(data, requestText));
    } catch (error) {
      const message = error instanceof Error ? error.message : t(locale, "Generation failed.", "生成失败");
      updateMessage(assistantMessageId, (pendingMessage) => ({
        ...pendingMessage,
        content: t(locale, `This one didn't go through: ${message}`, `这次没成功：${message}`),
      }));
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
        toast.warning(t(locale, "Keep at least one portrait selected.", "至少保留一张试衣人像"));
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
    const normalizedText = messageText || (lockedItem ? t(locale, "Give me one easy outfit", "给我一套不用想的") : "");
    if (!normalizedText || isLoading) return;

    rememberPrompt(normalizedText);
    if (!text) {
      setInputValue("");
    }

    const resolvedRequirement = resolveRequirementText(normalizedText);
    const userFacingText = lockedItem
      ? t(
          locale,
          `Build around "${getItemDisplayName(lockedItem, locale)}"${normalizedText ? `: ${normalizedText}` : ""}`,
          `用“${getItemDisplayName(lockedItem, locale)}”来搭${normalizedText ? `：${normalizedText}` : ""}`
        )
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
      requestText: message.requestText || message.scene || t(locale, "Give me one easy outfit", "给我一套不用想的"),
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
      toast.error(t(locale, "Please log in before uploading images.", "请先登录后再上传图片"));
      router.push("/auth/login");
      return;
    }

    setIsUploading(true);

    try {
      const base64 = await processImageFile(file);
      const previewMessage: ChatMessage = {
        id: makeId(),
        role: "user",
        content: t(locale, "Uploaded an image", "上传了一张图片"),
        uploadPreviewUrl: base64,
        metaType: "summary",
      };
      appendMessages([previewMessage]);

      const intakeResponse = await turnstileFetch("/api/chat-image-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const intakeData = await intakeResponse.json();
      if (!intakeResponse.ok) {
        throw new Error(intakeData.error || t(locale, "Image recognition failed.", "图片识别失败"));
      }

      const result = intakeData.result as {
        kind: "portrait" | "clothing";
        nickname?: string;
        category?: string | null;
        color?: string | null;
        style_tags?: string[];
        description?: string;
      };

      const uploadResponse = await turnstileFetch("/api/upload", {
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
        throw new Error(uploadData.error || t(locale, "Image upload failed.", "图片上传失败"));
      }

      if (result.kind === "portrait") {
        const saveResponse = await fetch("/api/portraits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatarPath: uploadData.key || uploadData.url,
            nickname: result.nickname || t(locale, `Portrait ${allAvatars.length + 1}`, `人像 ${allAvatars.length + 1}`),
          }),
        });
        const saveData = await saveResponse.json();
        if (!saveResponse.ok) {
          throw new Error(saveData.error || t(locale, "Failed to save portrait.", "保存人像失败"));
        }

        const portrait = saveData.portrait as Avatar;
        setAllAvatars((current) => [portrait, ...current]);
        setSelectedAvatars((current) => [portrait, ...current.filter((item) => item.id !== portrait.id)]);
        appendMessages([
          {
            id: makeId(),
            role: "assistant",
            content: t(
              locale,
              `Recognized as your portrait and added to your portraits. ${
                wardrobeItems.length === 0
                  ? "Upload 2-3 clothes you wear often and I can start styling."
                  : "You can send a styling request now."
              }`,
              `已识别为本人照，已经加入“我的照片”。${
                wardrobeItems.length === 0 ? "接下来再传 2-3 件常穿衣服，我就能开始搭配。" : "现在可以直接发需求开始搭配了。"
              }`
            ),
            metaType: "system",
          },
        ]);
      } else {
        const saveResponse = await fetch("/api/wardrobe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imagePath: uploadData.key || uploadData.url,
            category: result.category || "tops",
            color: result.color || "gray",
            style_tags: Array.isArray(result.style_tags) ? result.style_tags : [],
            ai_description: result.description || "已识别衣橱单品",
            user_description: null,
          }),
        });
        const saveData = await saveResponse.json();
        if (!saveResponse.ok) {
          throw new Error(saveData.error || t(locale, "Failed to save the clothing item.", "保存衣服失败"));
        }

        const item = saveData.item as WardrobeItem;
        setWardrobeItems((current) => [item, ...current]);
        appendMessages([
          {
            id: makeId(),
            role: "assistant",
            content: t(
              locale,
              `Recognized as ${
                result.color ? `${translateColor(result.color, locale)} ` : ""
              }${
                result.category ? getCategoryLabel(result.category, locale) : "item"
              } and added to your wardrobe. ${
                selectedAvatars.length === 0
                  ? "Upload 1 portrait next and we can start."
                  : "You can send your styling request now."
              }`,
              `已识别为${result.color || "这件"}${
                result.category ? getCategoryLabel(result.category, locale) : "单品"
              }，自动加入衣橱了。${
                selectedAvatars.length === 0 ? "再传 1 张本人照就能开始搭配。" : "你现在可以直接发诉求让我搭配。"
              } `
            ),
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
          content:
            error instanceof Error
              ? error.message
              : t(locale, "Upload failed. Please try again.", "上传失败，请重试"),
          metaType: "system",
        },
      ]);
    } finally {
      setIsUploading(false);
      [uploadLibraryInputRef, uploadCameraInputRef, uploadFileInputRef].forEach((ref) => {
        if (ref.current) {
          ref.current.value = "";
        }
      });
    }
  };

  const openChatUploadPicker = () => {
    if (!isLoading && !isUploading) {
      setShowUploadPicker(true);
    }
  };

  const getReplacementItems = (category: ReplaceableCategory, currentItemId?: string) =>
    wardrobeItems.filter((item) => {
      const itemCategory = getReplaceableCategory(item);
      if (itemCategory !== category) return false;
      if (currentItemId && item.id === currentItemId) return false;
      return true;
    });

  const topItemLabel = (category: ReplaceableCategory) =>
    category === "tops"
      ? t(locale, "top", "上衣")
      : t(locale, "bottom", "裤子");

  const readyForStyling = selectedAvatars.length > 0 && wardrobeItems.length > 0;
  const readinessCopy = readyForStyling
    ? t(
        locale,
        `Ready: ${wardrobeItems.length} clothes + ${selectedAvatars.length} portraits. Type / for common prompts or lock one item first.`,
        `已就绪：${wardrobeItems.length} 件衣服 + ${selectedAvatars.length} 张人像。输入 / 可选常用诉求，也能锁定某件单品。`
      )
    : t(
        locale,
        `Still missing: ${
          selectedAvatars.length === 0 ? "portrait" : ""
        }${
          selectedAvatars.length === 0 && wardrobeItems.length === 0 ? " + " : ""
        }${
          wardrobeItems.length === 0 ? "clothes" : ""
        }. Upload directly from the button on the left.`,
        `还差素材：${selectedAvatars.length === 0 ? "本人照" : ""}${
          selectedAvatars.length === 0 && wardrobeItems.length === 0 ? " + " : ""
        }${wardrobeItems.length === 0 ? "衣服照片" : ""}。可直接在聊天框左侧上传。`
      );
  const welcomePrompts = locale === "zh"
    ? ["想显瘦一点", "今天要见客户", "想松弛一点但别邋遢", "用昨天那条裤子继续搭"]
    : [
        "I want to look slimmer",
        "I have a client meeting today",
        "Relaxed but still polished",
        "Keep the same pants as yesterday",
      ];

  if (!mounted || !isInitialized) {
    return (
      <div className="app-gradient-shell min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#de6f8e]" />
        <p className="text-[#73677f]">{t(locale, "Loading...", "加载中...")}</p>
      </div>
    );
  }

  return (
    <div className="app-gradient-shell min-h-screen flex flex-col pb-28">
      <div className="soft-grid pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative mx-auto w-full max-w-3xl px-4 pt-6 lg:pt-8">
        <div className="glass-panel-strong rounded-[34px] p-4 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/72 text-[#2a2146] transition-colors hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#20183a] text-white shadow-[0_16px_36px_rgba(32,24,58,0.26)]">
                <Sparkles className="h-5 w-5 text-[#ffd3de]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#826f90]">
                  {t(locale, "Conversation Stylist", "对话式搭配师")}
                </p>
                <h1 className="text-lg font-semibold text-[#20183a]">
                  {t(locale, "AI Stylist", "AI 穿搭")}
                </h1>
              </div>
            </div>
            <div className="rounded-full bg-white/72 px-3 py-2 text-xs font-medium text-[#5f526a]">
              {t(locale, "Thread stays saved", "聊天会保留")}
            </div>
          </div>

          <div className="mt-4 rounded-[28px] bg-[#20183a] px-4 py-4 text-white">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">
              {t(locale, "Styling Status", "搭配状态")}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/86">{readinessCopy}</p>
          </div>
        </div>
      </div>

      {(selectedAvatars.length > 0 || allAvatars.length > 0) && (
        <div className="relative mx-auto mt-4 w-full max-w-3xl px-4">
          <div className="glass-panel rounded-[30px] p-4">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
              <span className="shrink-0 text-xs font-medium uppercase tracking-[0.18em] text-[#826f90]">
                {t(locale, "Try-on portraits", "试衣人像")}
              </span>

              {selectedAvatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => toggleAvatarSelection(avatar)}
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#de6f8e] shadow-[0_10px_24px_rgba(222,111,142,0.18)]"
                >
                  <RemoteImage
                    src={avatar.avatar_url}
                    alt={avatar.nickname}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                  <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#20183a]">
                    <X className="h-2.5 w-2.5 text-white" />
                  </div>
                </button>
              ))}

              {allAvatars.length > selectedAvatars.length && (
                <button
                  onClick={() => setShowAvatarSelector(true)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-white/80 bg-white/72 text-[#6f5ce2] transition-colors hover:bg-white"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}

              {allAvatars.length > 0 && allAvatars.length === selectedAvatars.length && (
                <button
                  onClick={() => router.push("/profile")}
                  className="rounded-full border border-white/80 bg-white/72 px-4 py-2 text-sm font-medium text-[#5f526a] transition-colors hover:bg-white"
                >
                  {t(locale, "Manage portraits", "管理人像")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showAvatarSelector && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#140f24]/55 backdrop-blur-sm">
          <div className="glass-panel-strong w-full max-w-lg rounded-t-[32px] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#20183a]">{t(locale, "Choose portraits", "选择人像")}</h3>
              <button
                onClick={() => setShowAvatarSelector(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/72 text-[#2a2146]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {allAvatars.map((avatar) => {
                const isSelected = selectedAvatars.some((item) => item.id === avatar.id);
                return (
                  <button
                    key={avatar.id}
                    onClick={() => toggleAvatarSelection(avatar)}
                    className="relative text-left"
                  >
                    <div className={`relative aspect-square overflow-hidden rounded-[18px] border-2 ${isSelected ? "border-[#de6f8e]" : "border-white/70"}`}>
                      <RemoteImage
                        src={avatar.avatar_url}
                        alt={avatar.nickname}
                        fill
                        sizes="25vw"
                        className="object-cover"
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#20183a]">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    <p className="mt-1 truncate text-center text-xs text-[#6e6279]">{avatar.nickname}</p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setShowAvatarSelector(false);
                router.push("/profile");
              }}
              className="mt-6 w-full rounded-[20px] border border-dashed border-white/80 bg-white/72 py-3 text-sm font-medium text-[#5f526a] transition-colors hover:bg-white"
            >
              <div className="flex items-center justify-center gap-2">
                <Plus className="h-5 w-5" />
                <span>{t(locale, "Add more portraits", "去添加更多人像")}</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {replacePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#140f24]/55 backdrop-blur-sm">
          <div className="glass-panel-strong w-full max-w-lg rounded-t-[32px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[#20183a]">
                  {t(
                    locale,
                    `Choose the ${topItemLabel(replacePicker.category)} to swap in`,
                    `指定替换这件${topItemLabel(replacePicker.category)}`
                  )}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#73677f]">
                  {t(
                    locale,
                    "Keep the rest of the outfit direction and only replace this category. Your selected piece becomes the new anchor item.",
                    "先保留其它单品，只替换这一类。你选中的会作为新主角重新生成。"
                  )}
                </p>
              </div>
              <button
                onClick={() => setReplacePicker(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/72 text-[#2a2146]"
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
                        label: t(
                          locale,
                          `Replace the ${topItemLabel(replacePicker.category)} with "${getItemDisplayName(item, locale)}"`,
                          `把${topItemLabel(replacePicker.category)}换成“${getItemDisplayName(item, locale)}”`
                        ),
                      });
                    }}
                    className="flex w-full items-center gap-3 rounded-[22px] border border-white/80 bg-white/72 p-3 text-left transition-colors hover:bg-white"
                  >
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[16px] bg-gray-100">
                      <RemoteImage
                        src={item.image_url}
                        alt={getItemDisplayName(item, locale)}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#20183a]">{getItemDisplayName(item, locale)}</p>
                      <p className="mt-1 text-sm leading-6 text-[#73677f]">{getItemSecondaryText(item, locale)}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/80 bg-white/60 px-4 py-8 text-center text-sm text-[#73677f]">
                  {t(
                    locale,
                    `There isn't another ${topItemLabel(replacePicker.category)} to swap in yet. Add one or two more pieces for better options.`,
                    `衣橱里还没有别的可替换${topItemLabel(replacePicker.category)}，先去多加一两件会更有选择。`
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6"
        style={{ paddingBottom: CHAT_CONTENT_BOTTOM_PADDING }}
      >
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="glass-panel-strong overflow-hidden rounded-[36px]">
              <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#826f90]">
                    <ImageIcon className="h-4 w-4 text-[#de6f8e]" />
                    {t(locale, "AI Chat", "AI 对话")}
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold text-[#20183a]">
                    {t(locale, "Describe today's need and keep the thread alive", "说出今天的诉求，让线程持续记住你")}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[#73677f]">
                    {t(locale, "Type `/` for common prompts, upload directly from the composer, or lock one item and let the assistant build around it.", "输入 `/` 看常用诉求，直接从输入区上传素材，或者先锁一件单品再让 AI 补齐整套。")}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {welcomePrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleChooseSuggestion(prompt)}
                        className="rounded-full border border-white/80 bg-white/72 px-3 py-2 text-sm text-[#3a2f51] transition-colors hover:bg-white"
                      >
                        / {prompt}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={openChatUploadPicker}
                      className="rounded-full bg-[#20183a] px-5 py-3 text-sm font-medium text-white shadow-[0_16px_36px_rgba(32,24,58,0.24)] transition-colors hover:bg-[#322655]"
                    >
                      {t(locale, "Upload now", "直接上传图片")}
                    </button>
                    <button
                      onClick={() => router.push("/wardrobe/add")}
                      className="rounded-full border border-white/80 bg-white/72 px-5 py-3 text-sm font-medium text-[#3a2f51] transition-colors hover:bg-white"
                    >
                      {t(locale, "Add clothes", "去加衣服")}
                    </button>
                    <button
                      onClick={() => router.push("/profile")}
                      className="rounded-full border border-white/80 bg-white/72 px-5 py-3 text-sm font-medium text-[#3a2f51] transition-colors hover:bg-white"
                    >
                      {t(locale, "Add portraits", "去加人像")}
                    </button>
                  </div>
                </div>

                <div className="rounded-[30px] bg-[#20183a] p-5 text-white shadow-[0_22px_56px_rgba(32,24,58,0.3)]">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">
                    {t(locale, "Minimum Setup", "最小起步")}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold">
                    {t(locale, "1 portrait + 2-3 clothes", "1 张人像 + 2-3 件衣服")}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/78">
                    {t(locale, "That is enough to start. The assistant will auto-sort uploads, remember the thread, and keep your best outfit directions in context.", "这就足够开始。AI 会自动识别上传内容、记住你的线程，并把最好的搭配方向留在上下文里。")}
                  </p>
                  <div className="mt-6 space-y-3">
                    <div className="rounded-[22px] bg-white/10 px-4 py-3 text-sm text-white/86">
                      {t(locale, "Upload a portrait or clothing photo directly from the composer.", "直接从输入区上传人像或衣服照片。")}
                    </div>
                    <div className="rounded-[22px] bg-white/10 px-4 py-3 text-sm text-white/86">
                      {t(locale, "Use / prompts for fast starts, or anchor one item to guide the look.", "用 / 诉求快速起步，或者锁定一件单品作为主角。")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[92%] sm:max-w-[86%] ${message.role === "user" ? "order-2" : "order-1"}`}>
                <div
                  className={`rounded-[24px] px-4 py-3 text-base ${
                    message.role === "user"
                      ? "rounded-br-md bg-[#20183a] text-white shadow-[0_18px_40px_rgba(32,24,58,0.24)]"
                      : message.metaType === "system"
                        ? "rounded-bl-md border border-[#f1cfde] bg-[#fff8fb] text-[#8d2d62]"
                        : "glass-panel rounded-bl-md text-[#2d2347]"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>

                {message.uploadPreviewUrl && (
                  <div className="glass-panel mt-3 w-fit overflow-hidden rounded-[24px] p-3">
                    <RemoteImage
                      src={message.uploadPreviewUrl}
                      alt="upload-preview"
                      width={160}
                      height={160}
                      sizes="160px"
                      className="w-40 rounded-[18px] object-cover"
                    />
                  </div>
                )}

                {message.items && message.items.length > 0 && (
                  <div className="glass-panel-strong mt-3 overflow-hidden rounded-[30px]">
                    <div className="border-b border-white/60 px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#20183a] px-3 py-1 text-xs font-medium text-white">
                          {message.generationMethod || t(locale, "Outfit result", "搭配结果")}
                        </span>
                        {message.style ? <p className="font-medium text-[#20183a]">{message.style}</p> : null}
                      </div>

                      {message.reason ? (
                        <div className="mt-4 rounded-[22px] bg-white/72 px-4 py-4">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#826f90]">
                            {t(locale, "Why this works", "搭配理由")}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-[#5f526a]">{message.reason}</p>
                        </div>
                      ) : null}
                    </div>

                    {message.imageUrl ? (
                      <div className="bg-[linear-gradient(135deg,rgba(255,223,232,0.7),rgba(238,234,255,0.7))] p-4">
                        <p className="mb-3 text-sm font-medium text-[#6f5ce2]">
                          {t(locale, "Rendered look", "穿搭效果图")}
                        </p>
                        <div className="overflow-hidden rounded-[22px] bg-white/86 shadow-[0_18px_40px_rgba(61,39,112,0.08)]">
                          <RemoteImage
                            src={message.imageUrl}
                            alt={t(locale, "Virtual try-on result", "虚拟试衣效果")}
                            width={1024}
                            height={1280}
                            sizes="(min-width: 1024px) 640px, 100vw"
                            className="mx-auto h-auto w-full max-w-md"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="border-y border-[#fde7cf] bg-[#fff8ee] p-4">
                        <p className="text-sm font-medium text-[#b45309]">
                          {t(locale, "The try-on image did not render this time", "这次没成功生成试穿图")}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#92400e]">
                          {t(
                            locale,
                            "You can still review the outfit structure and rationale below, then retry the render afterward.",
                            "先看下面这套结构和理由，稍后我们可以再重试一版生图。"
                          )}
                        </p>
                        {message.generationError ? (
                          <p className="mt-2 text-xs leading-5 text-[#9a3412]">
                            {t(locale, "Failure reason:", "失败原因：")} {message.generationError}
                          </p>
                        ) : null}
                      </div>
                    )}

                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#2d2347]">{t(locale, "Outfit structure", "搭配结构")}</p>
                        <span className="text-xs text-[#6e6279]">{message.clothing}</span>
                      </div>

                      <div className="rounded-[26px] bg-[#f8f5ff] p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#826f90]">
                          {t(locale, "AI detected structure", "AI 识别结构")}
                        </p>
                        <div className="mt-4 grid gap-4 lg:grid-cols-[112px_1fr] lg:items-center">
                          <div className="mx-auto">
                            <p className="mb-2 text-center text-xs text-[#8d8195]">
                              {t(locale, "Your portrait", "你的照片")}
                            </p>
                            <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white shadow-sm">
                              <RemoteImage
                                src={message.personUrl || selectedAvatars[0]?.avatar_url || ""}
                                alt={t(locale, "Your portrait", "你的照片")}
                                width={96}
                                height={144}
                                sizes="96px"
                                className="h-36 w-24 object-cover"
                              />
                            </div>
                          </div>

                          <div className="relative">
                            <div className="pulse-beam absolute left-0 top-1/2 hidden h-[4px] w-12 -translate-y-1/2 rounded-full lg:block" />
                            <div className="grid gap-3 sm:grid-cols-2 lg:pl-14">
                              {message.items.map((item, index) => (
                                <div
                                  key={`${message.id}_${index}`}
                                  className="rounded-[22px] bg-white/82 p-3 shadow-[0_12px_28px_rgba(61,39,112,0.06)]"
                                >
                                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#826f90]">
                                    {getCategoryLabel(item.category, locale)}
                                  </p>
                                  <div className="mt-3 flex items-center gap-3">
                                    <div className="relative h-16 w-14 overflow-hidden rounded-[16px] bg-gray-100">
                                      <RemoteImage
                                        src={item.image_url}
                                        alt={item.ai_description || t(locale, "Clothing item", "衣服")}
                                        fill
                                        sizes="56px"
                                        className="object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-[#20183a]">
                                        {getItemDisplayName(item, locale)}
                                      </p>
                                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#73677f]">
                                        {getItemSecondaryText(item, locale)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
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
                          <div className="mt-4 rounded-[24px] border border-[#f1cfde] bg-[#fff8fb] p-4">
                            <p className="text-sm font-medium text-[#20183a]">{t(locale, "Swap one piece", "局部换件")}</p>
                            <p className="mt-1 text-xs leading-5 text-[#73677f]">
                              {t(locale, "Keep the overall direction and only replace the piece you most want to change.", "先保留整套方向不变，只替换你最想调整的那件。")}
                            </p>
                            <div className="mt-3 space-y-3">
                              {replacementEntries.map(({ item, category }) => (
                                <div
                                  key={`${message.id}_${category}_replace`}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-white/88 px-3 py-3"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-[#20183a]">
                                      {topItemLabel(category)}：{getItemDisplayName(item, locale)}
                                    </p>
                                    <p className="mt-1 text-xs text-[#73677f]">{getItemSecondaryText(item, locale)}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() =>
                                        void runReplaceAction({
                                          message,
                                          category,
                                          label: t(
                                            locale,
                                            `Swap the ${topItemLabel(category)} in this look`,
                                            `把这套里的${topItemLabel(category)}换一件`
                                          ),
                                        })
                                      }
                                      disabled={isLoading}
                                      className="rounded-full border border-white/80 bg-white px-3 py-2 text-sm text-[#3a2f51] disabled:opacity-50"
                                    >
                                      {t(locale, `Swap ${topItemLabel(category)}`, `换${topItemLabel(category)}`)}
                                    </button>
                                    <button
                                      onClick={() =>
                                        setReplacePicker({
                                          messageId: message.id,
                                          requestText: message.requestText || message.scene || t(locale, "Give me one easy outfit", "给我一套不用想的"),
                                          category,
                                          currentItemId: item.id,
                                          baseItems: message.items || [],
                                        })
                                      }
                                      disabled={isLoading}
                                      className="rounded-full bg-[#20183a] px-3 py-2 text-sm text-white disabled:opacity-50"
                                    >
                                      {t(locale, "Choose replacement", "指定替换")}
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
                            { type: "like" as FeedbackType, label: t(locale, "Like", "喜欢") },
                            { type: "dislike" as FeedbackType, label: t(locale, "Not for me", "不喜欢") },
                            { type: "not_today" as FeedbackType, label: t(locale, "Not today", "今天不适合") },
                          ].map((feedback) => {
                            const active = message.feedbackType === feedback.type;
                            return (
                              <button
                                key={feedback.type}
                                onClick={() => void saveFeedback(message.id, message.outfitId, feedback.type)}
                                disabled={feedbackLoadingId === message.id}
                                className={`rounded-full px-3 py-2 text-sm transition-colors ${
                                  active
                                    ? "bg-[#20183a] text-white"
                                    : "border border-white/80 bg-white/72 text-[#3a2f51]"
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
              <div className="glass-panel flex items-center gap-2 rounded-[24px] rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-[#73677f]" />
                <span className="text-sm text-[#73677f]">
                  {pendingActionLabel
                    ? buildPendingLoadingCopy(pendingActionLabel)
                    : t(locale, "Choosing pieces, writing the rationale, and rendering the result...", "正在选衣服、生成理由和效果图...")}
                </span>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="flex justify-start">
              <div className="glass-panel flex items-center gap-2 rounded-[24px] rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-[#73677f]" />
                <span className="text-sm text-[#73677f]">{t(locale, "Figuring out whether this image is a portrait or clothing...", "正在识别这张图是人像还是衣服...")}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div
        className="fixed left-0 right-0 z-[60] px-4"
        style={{ bottom: CHAT_COMPOSER_BOTTOM_OFFSET }}
      >
        <div className="relative mx-auto max-w-3xl">
          {shouldShowSlashSuggestions && (
            <div className="glass-panel-strong absolute left-0 right-0 bottom-[calc(100%+12px)] overflow-hidden rounded-[28px] border-0">
              {promptSuggestions.length > 0 || wardrobeSlashSuggestions.length > 0 ? (
                <div className="max-h-[50vh] overflow-y-auto py-2">
                  {promptSuggestions.length > 0 ? (
                    <div>
                      <p className="px-4 pb-2 pt-1 text-xs font-medium uppercase tracking-[0.16em] text-[#826f90]">
                        {t(locale, "Common prompts", "常用诉求")}
                      </p>
                      {promptSuggestions.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleChooseSuggestion(prompt)}
                          className="w-full border-b border-white/60 px-4 py-3 text-left text-sm text-[#3a2f51] transition-colors hover:bg-white/72 last:border-b-0"
                        >
                          / {prompt}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {wardrobeSlashSuggestions.length > 0 ? (
                    <div className={promptSuggestions.length > 0 ? "border-t border-white/60 pt-2" : ""}>
                      <p className="px-4 pb-2 pt-1 text-xs font-medium uppercase tracking-[0.16em] text-[#826f90]">
                        {t(locale, "My wardrobe", "我的衣橱")}
                      </p>
                      {wardrobeSlashSuggestions.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleChooseWardrobeSuggestion(item)}
                          className="flex w-full items-center gap-3 border-b border-white/60 px-4 py-3 text-left transition-colors hover:bg-white/72 last:border-b-0"
                        >
                          <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-[14px] bg-gray-100">
                            <RemoteImage
                              src={item.image_url}
                              alt={getItemDisplayName(item, locale)}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#20183a]">{getItemDisplayName(item, locale)}</p>
                            <p className="mt-1 truncate text-xs text-[#73677f]">{getItemSecondaryText(item, locale)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-[#73677f]">{t(locale, "No match yet. You can still type and send a new prompt.", "没有匹配项，直接输入后发送也会记住。")}</div>
              )}
            </div>
          )}

          {lockedItem ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#826f90]">
                {t(locale, "Anchor item", "主角单品")}
              </span>
              <div className="glass-panel inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[#3a2f51]">
                <span>{getItemDisplayName(lockedItem, locale)}</span>
                <button
                  onClick={() => setLockedItem(null)}
                  className="rounded-full bg-white/80 p-0.5 text-[#6f5ce2]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}

          <input
            ref={uploadLibraryInputRef}
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
          <input
            ref={uploadCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleChatUpload(file);
              }
            }}
          />
          <input
            ref={uploadFileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleChatUpload(file);
              }
            }}
          />

          <div className="glass-dock rounded-[30px] p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={openChatUploadPicker}
                disabled={isLoading || isUploading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#20183a] text-white transition-colors disabled:opacity-50 sm:h-12 sm:w-12"
              >
                <Upload className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1 rounded-[22px] border border-white/70 bg-white/72 px-4 py-2.5 sm:rounded-[24px] sm:py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#826f90] sm:text-[11px]">
                  {t(locale, "Animated Input", "动态输入框")}
                </p>
                <input
                  ref={textInputRef}
                  type="text"
                  placeholder={lockedItem ? t(locale, "Keep going and I'll build around this item", "继续说需求，我会围绕这件来搭") : t(locale, "Type / for prompts, or just tell me what you need today", "输入 / 看常用诉求，或直接说今天想穿什么")}
                  aria-label={t(locale, "Enter your outfit request", "输入穿搭需求")}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleSend();
                    }
                  }}
                  disabled={isLoading || isUploading}
                  className="mt-1 block h-7 w-full bg-transparent text-[16px] leading-7 text-[#20183a] placeholder:text-[#8d8195] focus:outline-none disabled:opacity-50 sm:text-[17px]"
                />
              </div>

              <button
                onClick={() => void handleSend()}
                disabled={
                  ((!inputValue.trim() || inputValue.trim() === "/") && !lockedItem) ||
                  isLoading ||
                  isUploading
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#20183a] text-white shadow-[0_16px_36px_rgba(32,24,58,0.24)] transition-colors disabled:bg-gray-200 disabled:text-gray-500 sm:h-12 sm:w-12"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ImageSourceSheet
        open={showUploadPicker}
        title={t(locale, "Upload image", "上传图片")}
        description={t(locale, "Upload clothing photos or portraits and I'll sort them into the right place automatically.", "可以上传衣服照片，也可以上传本人照，我会自动识别并入库。")}
        onClose={() => setShowUploadPicker(false)}
        onChooseLibrary={() => uploadLibraryInputRef.current?.click()}
        onChooseCamera={() => uploadCameraInputRef.current?.click()}
        onChooseFile={() => uploadFileInputRef.current?.click()}
      />

      <BottomNav compact />
    </div>
  );
}
