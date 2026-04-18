import { NextRequest, NextResponse } from "next/server";
import { ImageGenerationClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { uploadImageFromBase64, uploadFromUrl } from "@/storage/s3-storage";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getUserIdFromRequest } from "@/lib/server-session";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 智能穿搭搭配 + 虚拟试衣 v2
 * 
 * 核心原则：
 * 1. 保留原貌：人像和衣服完全不变
 * 2. 精准匹配：根据用户需求匹配对应标签的衣服
 * 3. 真实试穿：衣服复制到模特身上
 */

/**
 * 匹配用户需求的衣服
 */
function matchClothesByRequirement(
  items: any[], 
  requirement: string
): {
  tops: any[];
  bottoms: any[];
  dresses: any[];
  outerwear: any[];
  shoes: any[];
  accessories: any[];
  bags: any[];
  hats: any[];
} {
  const result: {
    tops: any[];
    bottoms: any[];
    dresses: any[];
    outerwear: any[];
    shoes: any[];
    accessories: any[];
    bags: any[];
    hats: any[];
  } = {
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
  
  // 判断用户需求的风格
  let targetStyles: string[] = [];
  let targetScenes: string[] = [];
  
  if (reqLower.includes('职场') || reqLower.includes('会议') || reqLower.includes('上班') || reqLower.includes('正式')) {
    targetStyles.push('formal', '正式', '职业');
    targetScenes.push('meeting', 'work');
  }
  if (reqLower.includes('约会') || reqLower.includes('浪漫') || reqLower.includes('晚宴')) {
    targetStyles.push('elegant', '优雅', '约会');
    targetScenes.push('date', 'romantic');
  }
  if (reqLower.includes('休闲') || reqLower.includes('日常') || reqLower.includes('逛街')) {
    targetStyles.push('casual', '休闲', '日常');
    targetScenes.push('casual', 'daily');
  }
  if (reqLower.includes('派对') || reqLower.includes('聚会')) {
    targetStyles.push('party', '时尚', '派对');
    targetScenes.push('party');
  }
  if (reqLower.includes('运动') || reqLower.includes('健身')) {
    targetStyles.push('sporty', '运动', '健身');
    targetScenes.push('sport', 'gym');
  }
  
  // 如果没有指定，使用中性风格
  if (targetStyles.length === 0) {
    targetStyles = ['casual', '休闲', '日常', 'normal', '简约'];
  }
  
  // 按类别分组并匹配
  for (const item of items) {
    const tags = (item.style_tags || []).map((t: string) => t.toLowerCase());
    const desc = (item.ai_description || item.user_description || '').toLowerCase();
    const category = item.category;
    
    // 检查是否匹配目标风格
    const matchesStyle = targetStyles.some(style => 
      tags.some((tag: string) => tag.includes(style.toLowerCase())) ||
      desc.includes(style.toLowerCase())
    );
    
    // 检查是否匹配目标场景
    const matchesScene = (item.scenes || []).some((s: string) => 
      targetScenes.includes(s.toLowerCase())
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

function belongsToReplaceCategory(item: any, category: "tops" | "bottoms"): boolean {
  if (category === "tops") {
    return isTopLikeCategory(item.category);
  }
  return item.category === "bottoms";
}

function getCategoryCandidates(
  category: "tops" | "bottoms",
  matched: ReturnType<typeof matchClothesByRequirement>,
  allItems: any[]
): any[] {
  const matchedCandidates =
    category === "tops"
      ? [...matched.tops, ...matched.outerwear]
      : [...matched.bottoms];

  const fallbackCandidates = allItems.filter((item) =>
    category === "tops" ? isTopLikeCategory(item.category) : item.category === "bottoms"
  );

  return [...matchedCandidates, ...fallbackCandidates];
}

function pickFirstAvailable(candidates: any[], excludedIds: Set<string>): any | null {
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

function sortOutfitItems(items: any[]): any[] {
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

/**
 * 构建穿搭方案 - 智能组合
 */
function buildOutfit(
  matched: ReturnType<typeof matchClothesByRequirement>,
  requirement: string,
  allItems: any[],
  options?: {
    lockedItems?: any[];
    baseItems?: any[];
    replaceCategory?: "tops" | "bottoms";
    replaceWithItem?: any | null;
  }
): {
  items: any[];
  description: string;
  outfitType: string;
} {
  const items: any[] = [];
  const selectedIds = new Set<string>();
  const lockedItems = options?.lockedItems || [];
  const baseItems = options?.baseItems || [];
  const replaceCategory = options?.replaceCategory;
  const replaceWithItem = options?.replaceWithItem || null;

  const addItem = (item: any | null) => {
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
  outfitItems: any[],
  outfitType: string,
  requirement: string,
  personUrl: string,
  clothingUrls: string[]
): { prompt: string } {
  
  // 构建服装描述
  const clothingInfo = outfitItems.map((item, i) => {
    const color = item.color || 'this color';
    const category = item.category;
    return `Image ${i + 2}: ${color} ${category}`;
  }).join(', ');
  
  // 根据需求调整场景
  let sceneDesc = 'simple plain background';
  if (requirement.includes('职场') || requirement.includes('会议') || requirement.includes('正式')) {
    sceneDesc = 'clean office background';
  } else if (requirement.includes('约会') || requirement.includes('浪漫')) {
    sceneDesc = 'soft indoor background';
  }
  
  // 极简提示词 - 只复制，不创造
  const prompt = `Take the person from Image 1.
Take the clothes from Images 2-${clothingUrls.length + 1}.
Put the clothes ON the person.
DO NOT add anything that is not in the reference images.
DO NOT change anything.
Output: The same person wearing the same clothes.`;

  return { prompt };
}

async function fetchImageAsDataUrl(url: string, label: string): Promise<string> {
  if (!url) {
    throw new Error(`${label} 地址为空`);
  }

  if (url.startsWith("data:")) {
    return url;
  }

  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "image/*",
      "User-Agent": "ai-outfit-assistant/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${label} 下载失败: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

async function runWithoutProxy<T>(task: () => Promise<T>): Promise<T> {
  const proxyKeys = [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
  ] as const;

  const previous = new Map<string, string | undefined>();
  for (const key of proxyKeys) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }

  const previousNoProxy = process.env.NO_PROXY;
  const previousNoProxyLower = process.env.no_proxy;
  process.env.NO_PROXY = "*";
  process.env.no_proxy = "*";

  try {
    return await task();
  } finally {
    for (const key of proxyKeys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    if (previousNoProxy === undefined) {
      delete process.env.NO_PROXY;
    } else {
      process.env.NO_PROXY = previousNoProxy;
    }

    if (previousNoProxyLower === undefined) {
      delete process.env.no_proxy;
    } else {
      process.env.no_proxy = previousNoProxyLower;
    }
  }
}

function buildOutfitReason(
  requirement: string,
  clothingCNStr: string,
  outfitType: string,
  options?: {
    lockedItems?: any[];
    replaceCategory?: "tops" | "bottoms";
    replaceWithItem?: any | null;
  }
): string {
  const direction =
    requirement.includes("职场") || requirement.includes("会议") || requirement.includes("正式")
      ? "优先保证利落、稳妥、适合见人"
      : requirement.includes("约会") || requirement.includes("浪漫")
        ? "优先保证柔和、有一点精致感"
        : requirement.includes("运动") || requirement.includes("健身")
          ? "优先保证轻松、方便活动"
          : "优先保证日常耐看、不费劲";

  const contextParts: string[] = [];
  if (options?.lockedItems && options.lockedItems.length > 0) {
    const lockedItem = options.lockedItems[0];
    contextParts.push(`先保留了你指定的${lockedItem.color || ""}${lockedItem.category || "单品"}`);
  }
  if (options?.replaceCategory) {
    if (options.replaceWithItem) {
      contextParts.push(`并把${options.replaceCategory === "tops" ? "上衣" : "裤子"}换成了指定那件`);
    } else {
      contextParts.push(`并只调整了${options.replaceCategory === "tops" ? "上衣" : "裤子"}这一件`);
    }
  }

  const prefix = contextParts.length > 0 ? `${contextParts.join("，")}。` : "";
  return `${prefix}这套用了 ${clothingCNStr}，属于${outfitType}思路，${direction}。`;
}

function inferSceneTag(requirement: string): string {
  if (requirement.includes("职场") || requirement.includes("会议") || requirement.includes("正式")) {
    return "meeting";
  }
  if (requirement.includes("约会") || requirement.includes("浪漫")) {
    return "date";
  }
  if (requirement.includes("派对") || requirement.includes("聚会")) {
    return "party";
  }
  if (requirement.includes("运动") || requirement.includes("健身")) {
    return "casual";
  }
  return "casual";
}

export async function POST(request: NextRequest) {
  try {
    const {
      message = '',
      wardrobeItems = [],
      avatars = [],
      userId = "anonymous",
      lockedItemIds = [],
      baseOutfitItemIds = [],
      replaceCategory,
      replaceWithItemId,
    } = await request.json();
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
        error: '衣柜中没有衣服，请先添加衣服'
      }, { status: 400 });
    }
    
    if (!avatars || avatars.length === 0 || !avatars[0]?.avatar_url) {
      return NextResponse.json({
        success: false,
        error: '请先上传人像照片'
      }, { status: 400 });
    }
    
    // ========== 第一步：处理所有头像 ==========
    const processedAvatars: string[] = [];
    for (const avatar of avatars) {
      if (avatar.avatar_url) {
        let url = avatar.avatar_url;
        if (url.startsWith('data:')) {
          url = await uploadImageFromBase64(url, "avatars", storageUserId);
        }
        processedAvatars.push(url);
      }
    }
    
    if (processedAvatars.length === 0) {
      return NextResponse.json({
        success: false,
        error: '请先上传人像照片'
      }, { status: 400 });
    }
    
    console.log("人像URL数量:", processedAvatars.length);
    processedAvatars.forEach((url, i) => console.log(`- 第${i + 1}个人像:`, url));
    
    // ========== 第二步：处理所有衣服图片 ==========
    const processedItems: any[] = [];
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
        }
        processedItems.push({ ...item, image_url: url });
      }
    }
    console.log("衣服图片处理完成:", processedItems.length, "件");

    const lockedItems = Array.isArray(lockedItemIds)
      ? processedItems.filter((item) => lockedItemIds.includes(item.id))
      : [];
    const baseItems = Array.isArray(baseOutfitItemIds)
      ? processedItems.filter((item) => baseOutfitItemIds.includes(item.id))
      : [];
    const replaceWithItem = replaceWithItemId
      ? processedItems.find((item) => item.id === replaceWithItemId) || null
      : null;
    
    // ========== 第三步：根据需求匹配衣服 ==========
    const requirement = message || '休闲日常';
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
    const { items: outfitItems, description, outfitType } = buildOutfit(matched, requirement, processedItems, {
      lockedItems,
      baseItems,
      replaceCategory: replaceCategory === "tops" || replaceCategory === "bottoms" ? replaceCategory : undefined,
      replaceWithItem,
    });
    console.log("穿搭方案:", { outfitType, description, items: outfitItems.length });
    
    if (outfitItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: '没有找到合适的衣服搭配'
      }, { status: 400 });
    }
    
    // ========== 第五步：生成虚拟试衣 ==========
    console.log("\n========== 生成虚拟试衣 ==========");
    
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const imageClient = new ImageGenerationClient(config, customHeaders);
    
    // 收集衣服图片URL
    const clothingUrls = outfitItems.map(item => item.image_url);
    console.log("衣服图片URL:", clothingUrls);
    
    // 生成提示词 - 使用第一个人像作为主要人像
    const primaryAvatarUrl = processedAvatars[0];
    const { prompt } = generateTryOnPrompt(outfitItems, outfitType, requirement, primaryAvatarUrl, clothingUrls);
    console.log("提示词:", prompt.substring(0, 200) + "...");
    
    let resultImageUrl: string | null = null;
    
    // 使用多图参考：所有人像 + 所有衣服
    // 图片数组顺序：人像在前，衣服在后
    const allReferenceImages = await Promise.all([
      ...processedAvatars.map((url, index) => fetchImageAsDataUrl(url, `人像 ${index + 1}`)),
      ...clothingUrls.map((url, index) => fetchImageAsDataUrl(url, `衣服 ${index + 1}`)),
    ]);
    
    try {
      console.log("开始生成...");
      console.log("多图参考数量:", allReferenceImages.length);
      processedAvatars.forEach((url, i) => console.log(`- 第${i + 1}张: 人像${i + 1}`));
      clothingUrls.forEach((url, i) => console.log(`- 第${processedAvatars.length + i + 1}张: 衣服${i + 1}`));
      
      // 使用多图参考生成
      const response = await runWithoutProxy(() =>
        imageClient.generate({
          prompt,
          size: "2K",
          image: allReferenceImages, // 多图参考！
        })
      );
      
      const helper = imageClient.getResponseHelper(response);
      
      if (helper.success && helper.imageUrls[0]) {
        resultImageUrl = helper.imageUrls[0];
        console.log("生成成功!");
        
        // 上传结果
        try {
          resultImageUrl = await runWithoutProxy(() =>
            uploadFromUrl(resultImageUrl!, "generated", storageUserId)
          );
          console.log("效果图上传成功:", resultImageUrl);
        } catch (e) {
          console.error("上传失败");
        }
      } else {
        console.log("生成失败:", helper.errorMessages);
      }
    } catch (e: any) {
      console.error("生成异常:", e.message);
    }
    
    // ========== 返回结果 ==========
    
    // 构建衣服描述
    const clothingCNStr = outfitItems.map(item => {
      const color = item.color || '彩色';
      const category = item.category;
      switch (category) {
        case 'tops': return `${color}上装`;
        case 'bottoms': return `${color}下装`;
        case 'dresses': return `${color}连衣裙`;
        case 'outerwear': return `${color}外套`;
        case 'shoes': return `${color}鞋子`;
        case 'accessories': return '配饰';
        case 'bags': return `${color}包包`;
        case 'hats': return `${color}帽子`;
        default: return '单品';
      }
    }).join(' + ');
    
    // 默认不显示AI效果图（因为衣服会变形），只展示搭配方案
    const results: Array<{
      style: string;
      scene: string;
      outfitType: string;
      reason: string;
      items: Array<{
        id: string;
        category: string;
        image_url: string;
        ai_description: string;
      }>;
      imageUrl: string | null;
      personUrl: string;
      generationMethod: string;
      clothing: string;
      outfitId?: string;
    }> = [{
      style: requirement.includes('职场') ? '干练职场' :
             requirement.includes('约会') ? '优雅约会' :
             requirement.includes('派对') ? '时尚派对' :
             requirement.includes('运动') ? '活力运动' : '休闲日常',
      scene: requirement,
      outfitType,
      reason: buildOutfitReason(requirement, clothingCNStr, outfitType, {
        lockedItems,
        replaceCategory: replaceCategory === "tops" || replaceCategory === "bottoms" ? replaceCategory : undefined,
        replaceWithItem,
      }),
      items: outfitItems.map(item => ({
        id: item.id,
        category: item.category,
        image_url: item.image_url,
        ai_description: item.ai_description || item.color || item.category
      })),
      // AI生成效果图
      imageUrl: resultImageUrl,
      // 人像照片
      personUrl: primaryAvatarUrl,
      generationMethod: resultImageUrl ? '虚拟试衣（多图参考）' : '搭配展示',
      clothing: clothingCNStr
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
      itemsCount: outfitItems.length
    });
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalClothes: processedItems.length,
        matchedClothes: outfitItems.length,
        requirement,
        personUrl: primaryAvatarUrl
      }
    });
    
  } catch (error: any) {
    console.error("智能穿搭失败:", error);
    return NextResponse.json({
      success: false,
      error: '智能穿搭失败: ' + error.message
    }, { status: 500 });
  }
}
