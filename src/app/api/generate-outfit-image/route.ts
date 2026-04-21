import { NextRequest, NextResponse } from "next/server";
import { resolveStoredFileUrl, uploadImageFromBase64, uploadFromUrl } from "@/storage/s3-storage";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getUserIdFromRequest } from "@/lib/server-session";
import { generateVirtualTryOn } from "@/lib/ai/virtual-tryon";
import {
  t,
  translateCategory,
  translateColor,
  type Locale,
} from "@/lib/locale";
import { getLocaleFromRequest } from "@/lib/locale-server";
import { requireTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * 智能穿搭搭配 + 虚拟试衣 v2
 * 
 * 核心原则：
 * 1. 保留原貌：人像和衣服完全不变
 * 2. 精准匹配：根据用户需求匹配对应标签的衣服
 * 3. 真实试穿：衣服复制到模特身上
 */

type RequirementMode = "meeting" | "date" | "party" | "sport" | "casual";
type ReplaceCategory = "tops" | "bottoms";

interface WardrobeItemData {
  id: string;
  category: string;
  image_url: string;
  color?: string | null;
  ai_description?: string | null;
  user_description?: string | null;
  style_tags?: string[];
  scenes?: string[];
}

interface AvatarReferenceData {
  id?: string;
  avatar_url: string;
  nickname?: string;
}

interface GenerateOutfitImageRequestBody {
  message?: string;
  wardrobeItems?: WardrobeItemData[];
  avatars?: AvatarReferenceData[];
  userId?: string;
  lockedItemIds?: string[];
  baseOutfitItemIds?: string[];
  replaceCategory?: ReplaceCategory;
  replaceWithItemId?: string;
}

interface MatchedWardrobeItems {
  tops: WardrobeItemData[];
  bottoms: WardrobeItemData[];
  dresses: WardrobeItemData[];
  outerwear: WardrobeItemData[];
  shoes: WardrobeItemData[];
  accessories: WardrobeItemData[];
  bags: WardrobeItemData[];
  hats: WardrobeItemData[];
}

interface OutfitResultItem {
  id: string;
  category: string;
  image_url: string;
  ai_description: string;
}

interface OutfitResponseResult {
  style: string;
  scene: string;
  outfitType: string;
  reason: string;
  items: OutfitResultItem[];
  imageUrl: string | null;
  personUrl: string;
  generationMethod: string;
  clothing: string;
  generationError?: string;
  outfitId?: string;
}

const MAX_TRY_ON_AVATAR_REFERENCES = 1;
const MAX_TRY_ON_GARMENT_REFERENCES = 2;

async function normalizeReferenceImageUrl(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) {
    return url;
  }

  return resolveStoredFileUrl(url);
}

function containsAny(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

function detectRequirementMode(requirement: string): RequirementMode {
  const value = requirement.toLowerCase();

  if (
    containsAny(value, [
      "职场",
      "会议",
      "上班",
      "正式",
      "work",
      "office",
      "meeting",
      "business",
      "professional",
      "formal",
    ])
  ) {
    return "meeting";
  }

  if (
    containsAny(value, [
      "约会",
      "浪漫",
      "晚宴",
      "date",
      "romantic",
      "dinner",
      "feminine",
    ])
  ) {
    return "date";
  }

  if (
    containsAny(value, [
      "派对",
      "聚会",
      "party",
      "night out",
      "celebration",
    ])
  ) {
    return "party";
  }

  if (
    containsAny(value, [
      "运动",
      "健身",
      "sport",
      "sports",
      "gym",
      "workout",
      "athletic",
    ])
  ) {
    return "sport";
  }

  return "casual";
}

function getStyleLabel(mode: RequirementMode, locale: Locale): string {
  switch (mode) {
    case "meeting":
      return t(locale, "Sharp workwear", "干练职场");
    case "date":
      return t(locale, "Elegant date look", "优雅约会");
    case "party":
      return t(locale, "Statement party look", "时尚派对");
    case "sport":
      return t(locale, "Active easy look", "活力运动");
    default:
      return t(locale, "Effortless casual", "休闲日常");
  }
}

function getGenerationMethodLabel(provider: string | undefined, locale: Locale): string {
  switch (provider) {
    case "volcengine":
      return t(locale, "Virtual try-on (Volcengine)", "虚拟试衣（火山）");
    case "modelscope":
      return t(locale, "Rendered outfit (ModelScope)", "效果图（ModelScope）");
    case "bailian":
      return t(locale, "Virtual try-on (Bailian)", "虚拟试衣（阿里）");
    case "fashn":
      return t(locale, "Virtual try-on (FASHN)", "虚拟试衣（FASHN）");
    case "vertex":
      return t(locale, "Virtual try-on (Vertex)", "虚拟试衣（Vertex）");
    case "coze":
      return t(locale, "Virtual try-on (multi-reference)", "虚拟试衣（多图参考）");
    default:
      return t(locale, "Styled outfit", "搭配展示");
  }
}

function getClothingSummary(items: WardrobeItemData[], locale: Locale): string {
  return items
    .map((item) => {
      const color = translateColor(item.color, locale);
      const category = translateCategory(item.category, locale);
      return [color, category].filter(Boolean).join(" ").trim() || t(locale, "item", "单品");
    })
    .join(locale === "zh" ? " + " : " + ");
}

/**
 * 匹配用户需求的衣服
 */
function matchClothesByRequirement(
  items: WardrobeItemData[],
  requirement: string
): MatchedWardrobeItems {
  const result: MatchedWardrobeItems = {
    tops: [],
    bottoms: [],
    dresses: [],
    outerwear: [],
    shoes: [],
    accessories: [],
    bags: [],
    hats: []
  };
  
  const reqLower = requirement.toLowerCase();
  const mode = detectRequirementMode(reqLower);
  
  // 判断用户需求的风格
  let targetStyles: string[] = [];
  const targetScenes: string[] = [];
  
  if (mode === "meeting") {
    targetStyles.push("formal", "正式", "职业", "office", "professional");
    targetScenes.push("meeting", "work", "office");
  }
  if (mode === "date") {
    targetStyles.push("elegant", "优雅", "约会", "romantic", "feminine");
    targetScenes.push("date", "romantic", "evening");
  }
  if (mode === "casual") {
    targetStyles.push("casual", "休闲", "日常", "minimalist", "daily");
    targetScenes.push("casual", "daily", "travel");
  }
  if (mode === "party") {
    targetStyles.push("party", "时尚", "派对", "chic", "statement");
    targetScenes.push("party", "evening");
  }
  if (mode === "sport") {
    targetStyles.push("sporty", "运动", "健身", "athletic", "active");
    targetScenes.push("sport", "gym", "outdoor");
  }
  
  // 如果没有指定，使用中性风格
  if (targetStyles.length === 0) {
    targetStyles = ['casual', '休闲', '日常', 'normal', '简约'];
  }
  
  // 按类别分组并匹配
  for (const item of items) {
    const tags = (item.style_tags || []).map((tag) => tag.toLowerCase());
    const desc = (item.ai_description || item.user_description || "").toLowerCase();
    const category = item.category;
    
    // 检查是否匹配目标风格
    const matchesStyle = targetStyles.some((style) =>
      tags.some((tag) => tag.includes(style.toLowerCase())) ||
      desc.includes(style.toLowerCase())
    );
    
    // 检查是否匹配目标场景
    const matchesScene = (item.scenes || []).some((scene) =>
      targetScenes.includes(scene.toLowerCase())
    );
    
    if (matchesStyle || matchesScene) {
      switch (category) {
        case 'tops':
          result.tops.push(item);
          break;
        case 'bottoms':
          result.bottoms.push(item);
          break;
        case 'dresses':
          result.dresses.push(item);
          break;
        case 'outerwear':
          result.outerwear.push(item);
          break;
        case 'shoes':
          result.shoes.push(item);
          break;
        case 'accessories':
          result.accessories.push(item);
          break;
        case 'bags':
          result.bags.push(item);
          break;
        case 'hats':
          result.hats.push(item);
          break;
      }
    }
  }
  
  // 如果精确匹配不够，添加所有衣服作为备选
  if (result.tops.length === 0 && result.dresses.length === 0) {
    for (const item of items) {
      if (item.category === 'tops' && !result.tops.includes(item)) result.tops.push(item);
      if (item.category === 'dresses' && !result.dresses.includes(item)) result.dresses.push(item);
    }
  }
  if (result.bottoms.length === 0) {
    for (const item of items) {
      if (item.category === 'bottoms' && !result.bottoms.includes(item)) result.bottoms.push(item);
    }
  }
  if (result.shoes.length === 0) {
    for (const item of items) {
      if (item.category === 'shoes' && !result.shoes.includes(item)) result.shoes.push(item);
    }
  }
  
  return result;
}

function isTopLikeCategory(category: string): boolean {
  return category === "tops" || category === "outerwear";
}

function belongsToReplaceCategory(item: WardrobeItemData, category: ReplaceCategory): boolean {
  if (category === "tops") {
    return isTopLikeCategory(item.category);
  }
  return item.category === "bottoms";
}

function getCategoryCandidates(
  category: ReplaceCategory,
  matched: MatchedWardrobeItems,
  allItems: WardrobeItemData[]
): WardrobeItemData[] {
  const matchedCandidates =
    category === "tops"
      ? [...matched.tops, ...matched.outerwear]
      : [...matched.bottoms];

  const fallbackCandidates = allItems.filter((item) =>
    category === "tops" ? isTopLikeCategory(item.category) : item.category === "bottoms"
  );

  return [...matchedCandidates, ...fallbackCandidates];
}

function pickFirstAvailable(candidates: WardrobeItemData[], excludedIds: Set<string>): WardrobeItemData | null {
  for (const candidate of candidates) {
    if (!candidate?.id) continue;
    if (!excludedIds.has(candidate.id)) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (candidate?.id) {
      return candidate;
    }
  }

  return null;
}

function sortOutfitItems(items: WardrobeItemData[]): WardrobeItemData[] {
  const priority: Record<string, number> = {
    dresses: 10,
    tops: 20,
    outerwear: 25,
    bottoms: 30,
    shoes: 40,
    accessories: 50,
    bags: 60,
    hats: 70,
  };

  return [...items].sort((a, b) => (priority[a.category] || 999) - (priority[b.category] || 999));
}

function isTryOnCoreCategory(category: string): boolean {
  return category === "dresses" || category === "tops" || category === "outerwear" || category === "bottoms";
}

function selectTryOnReferenceItems(items: WardrobeItemData[]): WardrobeItemData[] {
  const sortedItems = sortOutfitItems(items);
  const selected: WardrobeItemData[] = [];
  const selectedIds = new Set<string>();

  const addItem = (item: WardrobeItemData | undefined) => {
    if (!item?.id || selectedIds.has(item.id)) return;
    selected.push(item);
    selectedIds.add(item.id);
  };

  const dress = sortedItems.find((item) => item.category === "dresses");
  if (dress) {
    addItem(dress);
  } else {
    addItem(sortedItems.find((item) => item.category === "tops"));
    addItem(sortedItems.find((item) => item.category === "bottoms"));

    if (selected.length === 0) {
      addItem(sortedItems.find((item) => item.category === "outerwear"));
    }
  }

  if (selected.length < MAX_TRY_ON_GARMENT_REFERENCES) {
    for (const item of sortedItems) {
      if (!isTryOnCoreCategory(item.category)) continue;
      addItem(item);
      if (selected.length >= MAX_TRY_ON_GARMENT_REFERENCES) {
        break;
      }
    }
  }

  if (selected.length === 0) {
    for (const item of sortedItems) {
      addItem(item);
      if (selected.length >= MAX_TRY_ON_GARMENT_REFERENCES) {
        break;
      }
    }
  }

  return selected.slice(0, MAX_TRY_ON_GARMENT_REFERENCES);
}

/**
 * 构建穿搭方案 - 智能组合
 */
function buildOutfit(
  matched: MatchedWardrobeItems,
  allItems: WardrobeItemData[],
  options?: {
    lockedItems?: WardrobeItemData[];
    baseItems?: WardrobeItemData[];
    replaceCategory?: ReplaceCategory;
    replaceWithItem?: WardrobeItemData | null;
  }
): {
  items: WardrobeItemData[];
  description: string;
  outfitType: string;
} {
  const items: WardrobeItemData[] = [];
  const selectedIds = new Set<string>();
  const lockedItems = options?.lockedItems || [];
  const baseItems = options?.baseItems || [];
  const replaceCategory = options?.replaceCategory;
  const replaceWithItem = options?.replaceWithItem || null;

  const addItem = (item: WardrobeItemData | null) => {
    if (!item?.id || selectedIds.has(item.id)) return;
    items.push(item);
    selectedIds.add(item.id);
  };

  if (replaceCategory && baseItems.length > 0) {
    for (const item of baseItems) {
      if (!belongsToReplaceCategory(item, replaceCategory)) {
        addItem(item);
      }
    }

    const currentTargetIds = new Set(
      baseItems.filter((item) => belongsToReplaceCategory(item, replaceCategory)).map((item) => item.id)
    );

    const replacementItem =
      replaceWithItem ||
      pickFirstAvailable(
        getCategoryCandidates(replaceCategory, matched, allItems),
        new Set([...selectedIds, ...currentTargetIds])
      );

    addItem(replacementItem);
  }

  for (const item of lockedItems) {
    addItem(item);
  }

  const hasDress = items.some((item) => item.category === "dresses");
  const hasTop = items.some((item) => isTopLikeCategory(item.category));
  const hasBottom = items.some((item) => item.category === "bottoms");

  if (!hasDress) {
    if (!hasTop) {
      addItem(pickFirstAvailable(getCategoryCandidates("tops", matched, allItems), selectedIds));
    }

    if (!hasBottom) {
      addItem(pickFirstAvailable(getCategoryCandidates("bottoms", matched, allItems), selectedIds));
    }

    const stillHasTop = items.some((item) => isTopLikeCategory(item.category));
    const stillHasBottom = items.some((item) => item.category === "bottoms");
    if (!stillHasTop && !stillHasBottom) {
      addItem(pickFirstAvailable([...matched.dresses, ...allItems.filter((item) => item.category === "dresses")], selectedIds));
    }
  }

  if (!replaceCategory) {
    addItem(pickFirstAvailable(matched.shoes, selectedIds));
    if (items.length < 4) {
      addItem(pickFirstAvailable(matched.accessories, selectedIds));
    }
    if (items.length < 5) {
      addItem(pickFirstAvailable(matched.bags, selectedIds));
    }
    if (items.length < 6) {
      addItem(pickFirstAvailable(matched.hats, selectedIds));
    }
  }

  if (items.length === 0 && allItems.length > 0) {
    addItem(allItems[0]);
  }

  const sortedItems = sortOutfitItems(items);
  const outfitType = sortedItems.some((item) => item.category === "dresses") ? "连衣裙" : "上下装套装";
  const description =
    outfitType === "连衣裙"
      ? "连衣裙主方案"
      : `${sortedItems.some((item) => isTopLikeCategory(item.category)) ? "上衣" : "主单品"} + ${
          sortedItems.some((item) => item.category === "bottoms") ? "裤子" : "搭配单品"
        }`;

  return { items: sortedItems, description, outfitType };
}

/**
 * 生成虚拟试衣提示词 - 零幻想版
 * 核心：只复制，不创造 - 100%基于参考图
 */
function generateTryOnPrompt(
  outfitItems: WardrobeItemData[],
  avatarReferenceCount: number
): { prompt: string } {
  const clothingInfo = outfitItems.map((item) => {
    const color = item.color || 'this color';
    const category = item.category;
    return `${color} ${category}`;
  }).join(', ');

  const clothingStartIndex = avatarReferenceCount + 1;
  const clothingEndIndex = avatarReferenceCount + outfitItems.length;
  const avatarLine =
    avatarReferenceCount > 1
      ? `Use the same person shown in Images 1-${avatarReferenceCount}. Image 1 is the main person photo and the others are extra reference photos of the same person.`
      : "Use the person shown in Image 1.";
  const clothingLine =
    outfitItems.length > 1
      ? `Use the clothing pieces from Images ${clothingStartIndex}-${clothingEndIndex}.`
      : `Use the clothing piece from Image ${clothingStartIndex}.`;

  const prompt = `${avatarLine}
${clothingLine}
Put those exact clothes on the person from Image 1.
Keep the person's identity, face, body shape, pose, and background.
Do not invent new garments, colors, layers, props, or accessories.
Reference garments: ${clothingInfo}.
Output one realistic photo of the same person wearing the referenced clothes.`;

  return { prompt };
}

function buildOutfitReason(
  requirement: string,
  clothingCNStr: string,
  outfitType: string,
  options?: {
    locale?: Locale;
    lockedItems?: WardrobeItemData[];
    replaceCategory?: ReplaceCategory;
    replaceWithItem?: WardrobeItemData | null;
  }
): string {
  const locale = options?.locale || "en";
  const mode = detectRequirementMode(requirement);
  const outfitTypeLabel =
    locale === "zh"
      ? outfitType
      : outfitType === "连衣裙"
        ? "dress-led outfit"
        : "top-and-bottom set";
  const direction =
    mode === "meeting"
      ? t(locale, "It keeps the outfit polished, reliable, and presentation-ready.", "优先保证利落、稳妥、适合见人")
      : mode === "date"
        ? t(locale, "It keeps the outfit soft, refined, and a little romantic.", "优先保证柔和、有一点精致感")
        : mode === "sport"
          ? t(locale, "It keeps the outfit easy, light, and movement-friendly.", "优先保证轻松、方便活动")
          : mode === "party"
            ? t(locale, "It keeps the outfit confident, expressive, and photo-ready.", "优先保证醒目、有氛围感")
            : t(locale, "It keeps the outfit easy to wear and visually steady for everyday use.", "优先保证日常耐看、不费劲");

  const contextParts: string[] = [];
  if (options?.lockedItems && options.lockedItems.length > 0) {
    const lockedItem = options.lockedItems[0];
    contextParts.push(
      t(
        locale,
        `We kept your chosen ${
          [translateColor(lockedItem.color, locale), translateCategory(lockedItem.category || "", locale)]
            .filter(Boolean)
            .join(" ")
            .trim() || "item"
        } as the anchor piece`,
        `先保留了你指定的${lockedItem.color || ""}${lockedItem.category || "单品"}`
      )
    );
  }
  if (options?.replaceCategory) {
    if (options.replaceWithItem) {
      contextParts.push(
        t(
          locale,
          `and swapped the ${options.replaceCategory === "tops" ? "top" : "bottom"} for your chosen piece`,
          `并把${options.replaceCategory === "tops" ? "上衣" : "裤子"}换成了指定那件`
        )
      );
    } else {
      contextParts.push(
        t(
          locale,
          `and only adjusted the ${options.replaceCategory === "tops" ? "top" : "bottom"}`,
          `并只调整了${options.replaceCategory === "tops" ? "上衣" : "裤子"}这一件`
        )
      );
    }
  }

  const prefix =
    contextParts.length > 0
      ? locale === "zh"
        ? `${contextParts.join("，")}。`
        : `${contextParts.join(", ")}. `
      : "";

  return t(
    locale,
    `${prefix}This look uses ${clothingCNStr}, follows a ${outfitTypeLabel} direction, and ${direction.toLowerCase()}.`,
    `${prefix}这套用了 ${clothingCNStr}，属于${outfitType}思路，${direction}。`
  );
}

function inferSceneTag(requirement: string): string {
  const mode = detectRequirementMode(requirement);
  if (mode === "meeting") return "meeting";
  if (mode === "date") return "date";
  if (mode === "party") return "party";
  return "casual";
}

export async function POST(request: NextRequest) {
  try {
    const locale = getLocaleFromRequest(request);
    const turnstileResponse = await requireTurnstile(request);
    if (turnstileResponse) {
      return turnstileResponse;
    }

    const body = (await request.json()) as GenerateOutfitImageRequestBody;
    const message = typeof body.message === "string" ? body.message : "";
    const wardrobeItems = Array.isArray(body.wardrobeItems) ? body.wardrobeItems : [];
    const avatars = Array.isArray(body.avatars) ? body.avatars : [];
    const userId = typeof body.userId === "string" ? body.userId : "anonymous";
    const lockedItemIds = Array.isArray(body.lockedItemIds) ? body.lockedItemIds : [];
    const baseOutfitItemIds = Array.isArray(body.baseOutfitItemIds) ? body.baseOutfitItemIds : [];
    const replaceCategory =
      body.replaceCategory === "tops" || body.replaceCategory === "bottoms"
        ? body.replaceCategory
        : undefined;
    const replaceWithItemId = typeof body.replaceWithItemId === "string" ? body.replaceWithItemId : undefined;
    const sessionUserId = getUserIdFromRequest(request);
    const storageUserId = String(sessionUserId || userId || "anonymous");
    
    console.log("========== 智能穿搭请求 v2 ==========");
    console.log("用户需求:", message);
    console.log("衣服数量:", wardrobeItems?.length || 0);
    console.log("锁定单品:", Array.isArray(lockedItemIds) ? lockedItemIds : []);
    console.log("局部替换:", replaceCategory || "无", replaceWithItemId || "自动挑选");
    
    // 验证数据
    if (!wardrobeItems || wardrobeItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: t(locale, "There are no clothes in the wardrobe yet.", "衣柜中没有衣服，请先添加衣服")
      }, { status: 400 });
    }
    
    if (!avatars || avatars.length === 0 || !avatars[0]?.avatar_url) {
      return NextResponse.json({
        success: false,
        error: t(locale, "Please upload at least one portrait first.", "请先上传人像照片")
      }, { status: 400 });
    }
    
    // ========== 第一步：处理所有头像 ==========
    const processedAvatars: string[] = [];
    for (const avatar of avatars) {
      if (avatar.avatar_url) {
        let url = avatar.avatar_url;
        if (url.startsWith('data:')) {
          url = await uploadImageFromBase64(url, "avatars", storageUserId);
        } else {
          url = await normalizeReferenceImageUrl(url);
        }
        processedAvatars.push(url);
      }
    }
    
    if (processedAvatars.length === 0) {
      return NextResponse.json({
        success: false,
        error: t(locale, "Please upload at least one portrait first.", "请先上传人像照片")
      }, { status: 400 });
    }
    
    console.log("人像URL数量:", processedAvatars.length);
    processedAvatars.forEach((url, i) => console.log(`- 第${i + 1}个人像:`, url));
    
    // ========== 第二步：处理所有衣服图片 ==========
    const processedItems: WardrobeItemData[] = [];
    for (const item of wardrobeItems) {
      if (item.image_url) {
        let url = item.image_url;
        if (url.startsWith('data:')) {
          try {
            url = await uploadImageFromBase64(url, "wardrobe", storageUserId);
          } catch (e) {
            console.error("上传单品失败:", e);
            continue;
          }
        } else {
          url = await normalizeReferenceImageUrl(url);
        }
        processedItems.push({ ...item, image_url: url });
      }
    }
    console.log("衣服图片处理完成:", processedItems.length, "件");

    const lockedItems = processedItems.filter((item) => lockedItemIds.includes(item.id));
    const baseItems = processedItems.filter((item) => baseOutfitItemIds.includes(item.id));
    const replaceWithItem = replaceWithItemId
      ? processedItems.find((item) => item.id === replaceWithItemId) || null
      : null;
    
    // ========== 第三步：根据需求匹配衣服 ==========
    const requirement = message || t(locale, "casual everyday outfit", "休闲日常");
    const requirementMode = detectRequirementMode(requirement);
    console.log("\n========== 匹配衣服 ==========");
    
    const matched = matchClothesByRequirement(processedItems, requirement);
    console.log("匹配结果:", {
      tops: matched.tops.length,
      bottoms: matched.bottoms.length,
      dresses: matched.dresses.length,
      shoes: matched.shoes.length
    });
    
    // ========== 第四步：构建穿搭方案 ==========
    console.log("\n========== 构建穿搭方案 ==========");
    const { items: outfitItems, description, outfitType } = buildOutfit(matched, processedItems, {
      lockedItems,
      baseItems,
      replaceCategory,
      replaceWithItem,
    });
    console.log("穿搭方案:", { outfitType, description, items: outfitItems.length });
    
    if (outfitItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: t(locale, "No suitable outfit could be assembled.", "没有找到合适的衣服搭配")
      }, { status: 400 });
    }
    
    // ========== 第五步：生成虚拟试衣 ==========
    console.log("\n========== 生成虚拟试衣 ==========");
    
    const tryOnReferenceItems = selectTryOnReferenceItems(outfitItems);
    const avatarReferences = processedAvatars.slice(0, MAX_TRY_ON_AVATAR_REFERENCES);
    const referenceImages = [
      ...avatarReferences,
      ...tryOnReferenceItems.map((item) => item.image_url),
    ];

    console.log("试衣参考图:", {
      avatars: avatarReferences.length,
      clothes: tryOnReferenceItems.map((item) => ({
        id: item.id,
        category: item.category,
        image_url: item.image_url,
      })),
    });

    const primaryAvatarUrl = processedAvatars[0];
    const { prompt } = generateTryOnPrompt(tryOnReferenceItems, avatarReferences.length);
    console.log("提示词:", prompt.substring(0, 200) + "...");
    
    let resultImageUrl: string | null = null;
    let generationError: string | null = null;
    let generationMethod = t(locale, "Styled outfit", "搭配展示");
    
    try {
      console.log("开始生成...");
      console.log("多图参考数量:", referenceImages.length);
      avatarReferences.forEach((url, i) => console.log(`- 第${i + 1}张: 人像${i + 1}`));
      tryOnReferenceItems.forEach((item, i) =>
        console.log(`- 第${avatarReferences.length + i + 1}张: ${item.category}`)
      );

      const tryOnResult = await generateVirtualTryOn({
        requestHeaders: request.headers,
        personImageUrl: primaryAvatarUrl,
        garmentImageUrls: tryOnReferenceItems.map((item) => item.image_url),
        garmentCategories: tryOnReferenceItems.map((item) => item.category),
        prompt,
        referenceImages,
      });

      generationMethod = getGenerationMethodLabel(tryOnResult.provider, locale);

      if (tryOnResult.imageUrl) {
        resultImageUrl = tryOnResult.imageUrl;
        console.log("生成成功! provider:", tryOnResult.provider);

        try {
          if (resultImageUrl.startsWith("data:")) {
            resultImageUrl = await uploadImageFromBase64(resultImageUrl, "generated", storageUserId);
          } else {
            resultImageUrl = await uploadFromUrl(resultImageUrl, "generated", storageUserId);
          }
          console.log("效果图上传成功:", resultImageUrl);
        } catch (e: unknown) {
          console.error("上传失败:", e instanceof Error ? e.message : e);
        }
      } else {
        generationError = tryOnResult.error || t(locale, "The image service returned no result.", "图像服务未返回结果");
        console.log("生成失败:", generationError, "provider:", tryOnResult.provider);
      }
    } catch (e: unknown) {
      generationError = e instanceof Error ? e.message : t(locale, "Image generation failed.", "图像生成异常");
      console.error("生成异常:", e);
    }
    
    // ========== 返回结果 ==========
    
    // 构建衣服描述
    const clothingSummary = getClothingSummary(outfitItems, locale);
    
    // 默认不显示AI效果图（因为衣服会变形），只展示搭配方案
    const results: OutfitResponseResult[] = [{
      style: getStyleLabel(requirementMode, locale),
      scene: requirement,
      outfitType,
      reason: buildOutfitReason(requirement, clothingSummary, outfitType, {
        locale,
        lockedItems,
        replaceCategory,
        replaceWithItem,
      }),
      items: outfitItems.map((item) => ({
        id: item.id,
        category: item.category,
        image_url: item.image_url,
        ai_description: item.ai_description || item.color || item.category
      })),
      // AI生成效果图
      imageUrl: resultImageUrl,
      // 人像照片
      personUrl: primaryAvatarUrl,
      generationMethod: resultImageUrl ? generationMethod : t(locale, "Styled outfit", "搭配展示"),
      clothing: clothingSummary,
      generationError: generationError || undefined,
    }];

    if (sessionUserId) {
      const client = getSupabaseClient();
      const sceneTag = inferSceneTag(requirement);

      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const { data: savedOutfit, error: saveError } = await client
          .from("outfit_recommendations")
          .insert({
            user_id: sessionUserId,
            user_requirement: requirement,
            scene: sceneTag,
            recommended_style: result.style,
            reason: result.reason,
            result_image_url: result.imageUrl,
            is_selected: index === 0 ? 1 : 0,
          })
          .select("id")
          .single();

        if (saveError || !savedOutfit) {
          console.error("保存穿搭推荐失败:", saveError?.message || "未知错误");
          continue;
        }

        result.outfitId = savedOutfit.id;

        const outfitItemRows = outfitItems
          .filter((item) => item.id)
          .map((item, itemIndex) => ({
            outfit_id: savedOutfit.id,
            item_id: item.id,
            display_order: itemIndex,
          }));

        if (outfitItemRows.length > 0) {
          const { error: itemInsertError } = await client
            .from("outfit_items")
            .insert(outfitItemRows);

          if (itemInsertError) {
            console.error("保存穿搭单品关联失败:", itemInsertError.message);
          }
        }
      }
    }
    
    console.log("\n========== 完成 ==========");
    console.log("最终结果:", {
      hasImage: !!resultImageUrl,
      itemsCount: outfitItems.length,
      generationError,
    });
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalClothes: processedItems.length,
        matchedClothes: outfitItems.length,
        requirement,
        personUrl: primaryAvatarUrl,
        generationError,
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("智能穿搭失败:", error);
    return NextResponse.json({
      success: false,
      error: t(getLocaleFromRequest(request), "Outfit generation failed: ", "智能穿搭失败: ") + errorMessage
    }, { status: 500 });
  }
}
