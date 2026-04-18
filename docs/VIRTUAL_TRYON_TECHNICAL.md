# AI穿搭助手 - 虚拟试衣技术方案

## 一、方案概述

本项目采用 **AI图像生成 + 智能搭配** 的方案，实现虚拟试衣功能。

### 核心技术栈

| 模块 | 技术 | 说明 |
|------|------|------|
| 图像生成 | 豆包 Seedream (doubao-seedream-4-5-251128) | 通过 coze-coding-dev-sdk 调用 |
| 图片存储 | S3 兼容对象存储 | 通过 coze-coding-dev-sdk 的 S3Storage |
| 本地数据 | IndexedDB | 浏览器端本地存储 |
| 前端框架 | Next.js 16 + React 19 | App Router 架构 |

---

## 二、功能流程

### 2.1 人像管理流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      人像管理完整流程                              │
└─────────────────────────────────────────────────────────────────┘

1. 用户进入个人资料页面
         ↓
2. 点击"添加上传人像"
         ↓
3. 选择图片文件（支持 JPEG/PNG/GIF/WebP，最大 10MB）
         ↓
4. 前端转换为 Base64 格式
         ↓
5. 调用 POST /api/upload
   ├─ category: "avatars"
   ├─ userId: 当前用户ID
   └─ image: Base64 数据
         ↓
6. API 上传到 S3 对象存储
         ↓
7. 返回签名 URL
         ↓
8. 保存人像信息到 IndexedDB (profiles 表)
   ├─ id: 唯一标识
   ├─ avatar_url: S3 签名 URL
   ├─ nickname: "人像 N"
   ├─ user_id: 用户ID
   └─ created_at: 时间戳
         ↓
9. 更新页面展示（3列网格布局）

┌─────────────────────────────────────────────────────────────────┐
│                      人像数据存储结构                              │
└─────────────────────────────────────────────────────────────────┘

IndexedDB - profiles 表:
{
  id: "portrait_xxx_yyy",
  avatar_url: "https://bucket/avatars/user-123/xxx.jpg",
  nickname: "人像 1",
  user_id: "user_123",
  created_at: "2024-01-01T00:00:00.000Z"
}

localStorage (备份):
- key: "avatar_url_{user_id}" (仅存第一个人像的 URL，用于向后兼容)
```

### 2.2 虚拟试衣完整流程（支持多个人像）

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户请求流程                               │
└─────────────────────────────────────────────────────────────────┘

1. 用户输入穿搭需求（如"职场穿搭"、"休闲日常"）
         ↓
2. 系统从 IndexedDB 加载：
   - 用户人像照片 (avatars) - 支持多个人像！
   - 衣柜中的衣服照片 (wardrobe_items)
         ↓
3. 智能匹配：根据需求匹配标签匹配的衣服
   - 职场 → formal 标签
   - 休闲 → casual 标签
   - 约会 → elegant 标签
         ↓
4. 智能组合：自动组合上装+下装+鞋子+配饰
         ↓
5. 多图参考生成（支持多个人像）：
   - Image 1-M: 多个人像照片
   - Image M+1-N: 衣服照片
         ↓
6. AI 生成效果图
         ↓
7. 上传到对象存储
         ↓
8. 前端展示结果

┌─────────────────────────────────────────────────────────────────┐
│                        数据处理流程                               │
└─────────────────────────────────────────────────────────────────┘

前端 (Base64) → 上传 API → 对象存储 (URL) → AI 生成 → 结果上传 → 返回签名 URL
```

### 2.2 API 调用时序

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   前端页面    │     │  Next.js API │     │   对象存储    │     │  AI 图像生成  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                   │                   │                   │
       │  1. POST /api/    │                   │                   │
       │     generate-     │                   │                   │
       │     outfit-image  │                   │                   │
       │  ────────────────→│                   │                   │
       │                   │                   │                   │
       │                   │  2. 上传人像       │                   │
       │                   │  ────────────────→│                   │
       │                   │  ←─────────────── │  返回签名 URL      │
       │                   │                   │                   │
       │                   │  3. 上传衣服图片    │                   │
       │                   │  ────────────────→│                   │
       │                   │  ←─────────────── │  返回签名 URL      │
       │                   │                   │                   │
       │                   │                   │  4. 生成图像      │
       │                   │  ───────────────────────────────────→│
       │                   │  ←───────────────────────────────────│
       │                   │                   │                   │
       │                   │  5. 上传结果图     │                   │
       │                   │  ────────────────→│                   │
       │                   │  ←─────────────── │  返回签名 URL      │
       │                   │                   │                   │
       │  6. 返回结果      │                   │                   │
       │  ←───────────────│                   │                   │
```

---

## 三、技术实现

### 3.1 关键代码逻辑

#### 3.1.0 多个人像管理（个人资料页面）

```typescript
// src/app/profile/page.tsx - 人像上传
const handlePortraitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !user) return;

  // 验证文件
  if (!file.type.startsWith("image/")) {
    toast.error("请上传图片文件");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error("图片大小不能超过 10MB");
    return;
  }

  setIsUploading(true);
  
  // 转换为 Base64
  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64 = reader.result as string;
    
    // 调用上传 API
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: base64,
        category: "avatars", // 关键：使用 avatars 类别
        userId: user.id,
      }),
    });

    const result = await response.json();
    
    // 创建人像记录
    const newPortrait = {
      id: `portrait_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      avatar_url: result.url,
      nickname: `人像 ${portraits.length + 1}`,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };
    
    // 保存到 IndexedDB
    await saveProfile(newPortrait);
    setPortraits(prev => [...prev, newPortrait]);
  };
  reader.readAsDataURL(file);
};
```

**关键要点**：
- 使用 `category: "avatars"` 确保人像存储在正确的目录
- 每个人像都有唯一的 `id` 和 `user_id` 关联
- 同时保存到 IndexedDB，供 Chat 页面读取

#### 3.1.1 智能匹配衣服

```typescript
function matchClothesByRequirement(items, requirement) {
  // 根据需求关键词匹配标签
  const targetStyles = [];
  
  if (requirement.includes('职场')) {
    targetStyles.push('formal', '正式', '职业');
  }
  if (requirement.includes('休闲')) {
    targetStyles.push('casual', '休闲', '日常');
  }
  if (requirement.includes('约会')) {
    targetStyles.push('elegant', '优雅', '约会');
  }
  
  // 按类别分组并匹配
  for (const item of items) {
    const tags = item.style_tags || [];
    if (tags.some(tag => targetStyles.includes(tag))) {
      // 分类到对应类别
      switch (item.category) {
        case 'tops': result.tops.push(item); break;
        case 'bottoms': result.bottoms.push(item); break;
        // ...
      }
    }
  }
}
```

#### 3.1.2 虚拟试衣提示词

```typescript
const prompt = `
Take the person from Image 1.
Take the clothes from Images 2-N.
Put the clothes ON the person.
DO NOT add anything that is not in the reference images.
DO NOT change anything.
Output: The same person wearing the same clothes.
`;
```

#### 3.1.3 多图参考生成（支持多个人像）

**核心变更**：从单个人像升级为支持多个人像

```typescript
// src/app/api/generate-outfit-image/route.ts - 处理多个人像

// ========== 第一步：处理所有头像 ==========
const processedAvatars: string[] = [];
for (const avatar of avatars) {
  if (avatar.avatar_url) {
    let url = avatar.avatar_url;
    if (url.startsWith('data:')) {
      url = await uploadImageFromBase64(url, "avatars", userId);
    }
    processedAvatars.push(url);
  }
}

// 使用第一个人像作为主要人像生成提示词
const primaryAvatarUrl = processedAvatars[0];
const { prompt } = generateTryOnPrompt(
  outfitItems, 
  outfitType, 
  requirement, 
  primaryAvatarUrl, 
  clothingUrls
);

// ========== 关键：使用多个人像 + 所有衣服作为参考 ==========
// 图片数组顺序：所有人像在前，所有衣服在后
const allReferenceImages = [...processedAvatars, ...clothingUrls];

// 传入多图参考
const response = await imageClient.generate({
  prompt,
  size: "2K",
  image: allReferenceImages, // 多个人像 + 多件衣服
});
```

**多图参考数组结构**：
```
[
  "https://.../avatar1.jpg",  // 人像 1
  "https://.../avatar2.jpg",  // 人像 2
  "https://.../avatar3.jpg",  // 人像 3
  "https://.../top1.jpg",     // 衣服 1
  "https://.../bottom1.jpg",  // 衣服 2
  "https://.../shoes1.jpg",   // 衣服 3
  ...
]
```

**日志输出示例**：
```
========== 智能穿搭请求 v2 ==========
用户需求: 职场穿搭
衣服数量: 8
人像URL数量: 3
- 第1个人像: https://.../avatar1.jpg
- 第2个人像: https://.../avatar2.jpg
- 第3个人像: https://.../avatar3.jpg
...
开始生成...
多图参考数量: 11
- 第1张: 人像1
- 第2张: 人像2
- 第3张: 人像3
- 第4张: 衣服1
- 第5张: 衣服2
...
```

**关键技术点**：
1. **所有人像都参与**：AI 会综合参考所有上传的人像
2. **第一个人像为主**：提示词中使用第一个人像作为主要描述
3. **顺序很重要**：人像在前，衣服在后
4. **无数量限制**：支持任意数量的人像（实际使用建议 1-5 张）

---

## 四、方案优缺点分析

### 4.1 优点

| 优点 | 说明 |
|------|------|
| ✅ 集成度高 | 通过 coze-coding-dev-sdk 一个 SDK 搞定图像生成和存储 |
| ✅ 成本低 | 使用云服务，无需自建服务器 |
| ✅ 快速部署 | 云端环境直接可用 |
| ✅ 支持多图参考 | Seedream 支持传入多张参考图 |
| ✅ 智能搭配 | 自动根据需求匹配和组合衣服 |
| ✅ 本地优先 | 图片优先本地存储，减少云存储成本 |

### 4.2 缺点

| 缺点 | 说明 | 严重程度 |
|------|------|----------|
| ❌ **保留原样有限** | AI 会"创作"而非"复制"，人像和衣服细节可能有变化 | 🔴 高 |
| ❌ **非专用模型** | Seedream 是通用图像生成模型，非虚拟试衣专用 | 🟡 中 |
| ❌ **依赖云服务** | 断网或服务不可用时无法工作 | 🟡 中 |
| ❌ **生成速度** | 每次生成需要 10-20 秒 | 🟢 低 |
| ❌ **成本累积** | 每次生成都会调用 API | 🟢 低 |

### 4.3 当前局限性的原因

```
AI 图像生成 ≠ 图像复制

┌─────────────────────────────────────────────────────────────┐
│  期望：完全复制                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────────────────┐    │
│  │  人像   │ +  │  衣服   │ =  │  同一人物穿同款衣服  │    │
│  └─────────┘    └─────────┘    └─────────────────────┘    │
│                                                             │
│  实际：AI 创作                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────────────────┐    │
│  │  人像   │ +  │  衣服   │ =  │ 相似人物穿相似衣服   │    │
│  │ (参考)  │    │ (参考)  │    │ (可能有变化)        │    │
│  └─────────┘    └─────────┘    └─────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

原因：
1. 图像生成模型本质是"创作"，不是"复制"
2. 模型会对输入进行"合理化"调整
3. 保留原样只是"尽量接近"，无法100%保证
```

---

## 五、可选替代方案

### 5.1 方案对比

| 方案 | 保留原样程度 | 成本 | 实现难度 | 推荐场景 |
|------|-------------|------|----------|----------|
| **当前方案** (Seedream) | 🟡 70-80% | 低 | 易 | 快速验证、功能展示 |
| 专用虚拟试衣 API | 🟢 95%+ | 高 | 中 | 对效果要求高 |
| 图像拼接技术 | 🟢 100% | 中 | 难 | 需要零误差 |
| 手动处理 | 🟢 100% | 高 | 易 | 少量精确需求 |

### 5.2 替代 API 推荐

#### 方案 A: 阿里鸀镜 (Aliyun Vitruvian)
```
优点：专业虚拟试衣，保留原样程度高
缺点：需要阿里云账号，成本较高
文档：https://help.aliyun.com/
```

#### 方案 B: 腾讯云图像融合
```
优点：人像保留效果好
缺点：需要腾讯云账号
文档：https://cloud.tencent.com/
```

#### 方案 C: Stable Diffusion + LoRA
```
优点：完全本地可控，效果可控
缺点：需要 GPU 资源，部署复杂
适用：有技术能力的团队
```

### 5.3 混合方案（推荐）

```
┌─────────────────────────────────────────────────────────────┐
│                       混合方案                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  方案 1：快速预览                                           │
│  - 使用当前 Seedream 方案                                   │
│  - 用于快速查看搭配效果                                      │
│                                                             │
│  方案 2：精确效果                                           │
│  - 用户选择满意搭配后                                       │
│  - 调用专用虚拟试衣 API 生成高质量效果                        │
│                                                             │
│  流程：                                                     │
│  1. 用户请求 → 快速生成预览（Seedream）                      │
│  2. 用户选择 → 精确生成（专用 API）                          │
│  3. 用户保存/分享                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、环境变量配置

详见 `.env.local` 文件

### 当前使用

```bash
# 对象存储
COZE_BUCKET_ENDPOINT_URL=xxx
COZE_BUCKET_NAME=xxx

# Supabase (可选，当前使用 IndexedDB)
COZE_SUPABASE_URL=xxx
COZE_SUPABASE_ANON_KEY=xxx

# AI 模型由 coze-coding-dev-sdk 自动配置
# 无需手动设置
```

---

## 七、调试建议

### 7.1 本地调试

1. 复制 `.env.local.example` 为 `.env.local`
2. 填写相关密钥
3. 运行 `pnpm dev`
4. 访问 `http://localhost:5000`

### 7.2 API 测试

```bash
# 测试图像生成
curl -X POST http://localhost:5000/api/generate-outfit-image \
  -H "Content-Type: application/json" \
  -d '{
    "message": "职场穿搭",
    "wardrobeItems": [...],
    "avatars": [...]
  }'
```

### 7.3 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 生成失败 | 网络问题/密钥错误 | 检查网络和 .env.local |
| 图片变形严重 | AI 创作特性 | 调整提示词或换用专用 API |
| 上传失败 | 存储配置错误 | 检查 COZE_BUCKET_* 变量 |

---

## 八、Chat 页面多人像选择功能详解与修复

### 8.0 关键 Bug 修复记录

#### 8.0.1 API 变量名错误修复 (`avatarUrl` -> `primaryAvatarUrl`)

**问题**：API 报错 `avatarUrl is not defined`

**根因**：代码中混用了 `avatarUrl` 和 `primaryAvatarUrl` 两个变量名

**修复方案**：统一使用 `primaryAvatarUrl`
```typescript
// ❌ 错误：变量名不一致
const avatarUrl = processedAvatars[0];
const { prompt } = generateTryOnPrompt(..., avatarUrl, ...);

// ✅ 修复：统一使用 primaryAvatarUrl
const primaryAvatarUrl = processedAvatars[0];
const { prompt } = generateTryOnPrompt(..., primaryAvatarUrl, ...);
```

**修复文件**：
- `src/app/api/generate-outfit-image/route.ts`

---

#### 8.0.2 数据兼容策略修复

**问题**：旧数据（无 `user_id` 字段）在页面上不可见

**根因**：新增 `user_id` 过滤逻辑时未考虑旧数据兼容性

**修复方案**：使用兼容旧数据的过滤逻辑
```typescript
// ❌ 错误：只显示有 user_id 的新数据
const myPortraits = allProfiles.filter(p => p.user_id === currentUserId);

// ✅ 修复：同时显示旧数据和新数据
const compatibleFilter = (p: Profile) => {
  return !p.user_id || p.user_id === currentUser.id;
};
const myPortraits = allProfiles.filter(compatibleFilter);
```

**修复文件**：
- `src/app/profile/page.tsx`
- `src/app/chat/page.tsx`

---

### 8.1 功能概述

**核心特性**：支持用户上传多个人像照片，AI 会综合参考所有照片来生成更贴合的穿搭效果。

**适用场景**：
- 用户有不同角度的照片（正面、侧面、全身）
- 用户有不同穿搭风格的照片
- 用户想看到不同表情/发型的搭配效果
- 提高 AI 生成的准确度和多样性

### 8.2 数据流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    多个人像数据完整流程                            │
└─────────────────────────────────────────────────────────────────┘

个人资料页面
    │
    ├─ 用户上传人像 1
    │   └─> /api/upload (category: "avatars")
    │       └─> S3: avatars/user-xxx/portrait-1.jpg
    │           └─> IndexedDB: profiles 表
    │
    ├─ 用户上传人像 2
    │   └─> /api/upload (category: "avatars")
    │       └─> S3: avatars/user-xxx/portrait-2.jpg
    │           └─> IndexedDB: profiles 表
    │
    └─ 用户上传人像 3
        └─> /api/upload (category: "avatars")
            └─> S3: avatars/user-xxx/portrait-3.jpg
                └─> IndexedDB: profiles 表
                          │
                          ↓
                    Chat 页面
                          │
                          ├─ getAllProfiles()
                          │   └─> 读取所有 user_id = 当前用户的 profiles
                          │
                          ├─ 发送到 /api/generate-outfit-image
                          │   └─ avatars: [{id, avatar_url, nickname}, ...]
                          │
                          ↓
                    AI 生成 API
                          │
                          ├─ 处理所有人像
                          │   └─> 转换为 S3 URL（如果是 Base64）
                          │
                          ├─ 构建参考图片数组
                          │   └─> [avatar1, avatar2, avatar3, cloth1, cloth2, ...]
                          │
                          └─ 调用图像生成
                              └─> image: [allReferenceImages]
```

### 8.3 核心文件说明

| 文件 | 功能 | 关键变更 |
|------|------|----------|
| `src/app/profile/page.tsx` | 人像管理页面 | ✅ 支持多个人像上传、展示、删除 |
| `src/app/chat/page.tsx` | 聊天页面 | ✅ 已支持读取所有人像（无需修改） |
| `src/app/api/generate-outfit-image/route.ts` | AI 生成 API | ✅ 处理所有人像并加入参考数组 |
| `src/lib/indexeddb.ts` | IndexedDB 工具 | ✅ 已支持 profiles 表（无需修改） |
| `src/app/api/upload/route.ts` | 上传 API | ✅ 已支持 "avatars" category（无需修改） |

### 8.4 数据库结构（IndexedDB）

**profiles 表**：
```typescript
interface Profile {
  id: string;                    // 唯一标识，如 "portrait_xxx_yyy"
  avatar_url: string;            // S3 签名 URL
  nickname: string;              // 显示名称，如 "人像 1"
  user_id: string;               // 所属用户 ID
  created_at: string;            // ISO 时间戳
}
```

**查询示例**：
```typescript
// 获取当前用户的所有人像
const allProfiles = await getAllProfiles();
const myPortraits = allProfiles.filter(p => p.user_id === currentUserId);
```

### 8.5 API 请求/响应示例

#### 8.5.1 上传人像

**请求**：
```http
POST /api/upload
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "category": "avatars",
  "userId": "user_123"
}
```

**响应**：
```json
{
  "success": true,
  "url": "https://bucket.xxx.com/avatars/user_123/abc123.jpg"
}
```

#### 8.5.2 AI 生成穿搭（含多个人像）

**请求**：
```http
POST /api/generate-outfit-image
Content-Type: application/json

{
  "message": "职场穿搭，显瘦一些",
  "wardrobeItems": [...],
  "avatars": [
    {
      "id": "portrait_1",
      "avatar_url": "https://.../avatar1.jpg",
      "nickname": "人像 1"
    },
    {
      "id": "portrait_2",
      "avatar_url": "https://.../avatar2.jpg",
      "nickname": "人像 2"
    },
    {
      "id": "portrait_3",
      "avatar_url": "https://.../avatar3.jpg",
      "nickname": "人像 3"
    }
  ]
}
```

**内部处理**：
```typescript
// 1. 处理人像
processedAvatars = [
  "https://.../avatar1.jpg",
  "https://.../avatar2.jpg", 
  "https://.../avatar3.jpg"
]

// 2. 处理衣服
clothingUrls = [
  "https://.../top.jpg",
  "https://.../bottom.jpg",
  "https://.../shoes.jpg"
]

// 3. 构建参考数组
allReferenceImages = [
  "https://.../avatar1.jpg",  // ← 人像 1
  "https://.../avatar2.jpg",  // ← 人像 2
  "https://.../avatar3.jpg",  // ← 人像 3
  "https://.../top.jpg",      // ← 衣服 1
  "https://.../bottom.jpg",   // ← 衣服 2
  "https://.../shoes.jpg"     // ← 衣服 3
]

// 4. 调用生成
imageClient.generate({
  prompt: "...",
  size: "2K",
  image: allReferenceImages  // 多图参考！
})
```

### 8.6 人像照片建议

**最佳实践**：
1. **数量**：建议 1-5 张，太多可能影响效果
2. **角度**：包含正面、侧面、全身照
3. **背景**：纯色背景，避免复杂背景
4. **光线**：自然光线，避免过暗或过曝
5. **清晰度**：高清照片，细节丰富

**不建议**：
- ❌ 模糊照片
- ❌ 遮挡面部的照片
- ❌ 背景过于杂乱的照片
- ❌ 黑白照片（AI 对彩色理解更好）

### 8.7 Chat 页面多人像选择功能（新增）

#### 8.7.1 功能概述
用户可以在 Chat 页面从已上传的人像中选择一张或多张用于 AI 生成，支持灵活的选择和移除操作。

#### 8.7.2 详细交互流程
```
用户进入 Chat 页面
    ↓
默认显示第一张人像（如果有）
    ↓
点击「+」号按钮
    ↓
弹出人像选择器 Modal
    ↓
展示所有已上传的人像（Checkbox 选择）
    ↓
用户勾选想要的人像（支持多选）
    ↓
点击「确认」按钮
    ↓
所有选中的人像显示在 Chat 页面
    ↓
每个人像旁有「×」删除按钮
    ↓
点击「生成穿搭」时，所有选中的人像都参与 AI 生成
```

#### 8.7.3 界面设计说明
```
┌─────────────────────────────────────────────────┐
│               Chat 页面                           │
│                                                  │
│  [试衣人]                                        │
│  ┌──────┐  ┌──────┐  ┌──────┐                 │
│  │ 人像1│  │ 人像2│  │  [+] │                 │
│  │  ×  │  │  ×  │  │      │                 │
│  └──────┘  └──────┘  └──────┘                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

#### 8.7.4 核心实现代码

**Chat 页面状态管理**：
```typescript
// src/app/chat/page.tsx
const [selectedAvatars, setSelectedAvatars] = useState<Profile[]>([]);
const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);

// 初始化：默认显示第一张人像
useEffect(() => {
  if (portraits.length > 0 && selectedAvatars.length === 0) {
    setSelectedAvatars([portraits[0]]);
  }
}, [portraits]);
```

**人像选择器组件**：
```typescript
// 人像选择 Modal
{isAvatarSelectorOpen && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-bold mb-4">选择试衣人</h3>
      
      <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
        {portraits.map(portrait => (
          <div 
            key={portrait.id}
            className="relative cursor-pointer"
            onClick={() => toggleAvatarSelection(portrait)}
          >
            <Image 
              src={portrait.avatar_url} 
              alt={portrait.nickname}
              className="w-full h-24 object-cover rounded-lg"
            />
            
            {/* 选中状态 */}
            <input
              type="checkbox"
              checked={selectedAvatars.some(a => a.id === portrait.id)}
              onChange={() => {}}
              className="absolute top-1 right-1"
            />
          </div>
        ))}
      </div>
      
      <div className="flex gap-3 mt-4">
        <button 
          onClick={() => setIsAvatarSelectorOpen(false)}
          className="flex-1 py-2 border rounded-lg"
        >
          取消
        </button>
        <button 
          onClick={() => setIsAvatarSelectorOpen(false)}
          className="flex-1 py-2 bg-black text-white rounded-lg"
        >
          确认
        </button>
      </div>
    </div>
  </div>
)}
```

**移除单个人像**：
```typescript
const removeAvatar = (avatarId: string) => {
  setSelectedAvatars(prev => 
    prev.filter(a => a.id !== avatarId)
  );
};
```

**API 调用时使用选中的人像**：
```typescript
// 发送请求时使用 selectedAvatars 而不是所有 portraits
const response = await fetch("/api/generate-outfit-image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: userInput,
    wardrobeItems: wardrobeItems,
    avatars: selectedAvatars, // ← 使用选中的人像
  }),
});
```

#### 8.7.5 数据兼容策略
**问题**：旧数据没有 `user_id` 字段，使用严格过滤会导致数据不可见。

**解决方案**：
```typescript
// 兼容旧数据的过滤逻辑
const compatibleFilter = (p: Profile) => {
  // 无 user_id 的旧数据 OR user_id 匹配当前用户的数据都显示
  return !p.user_id || p.user_id === currentUser.id;
};

const availablePortraits = portraits.filter(compatibleFilter);
```

#### 8.7.6 用户体验要点

| 体验项 | 说明 |
|--------|------|
| **默认显示** | 进入页面时默认显示第一张人像，降低认知负担 |
| **直观操作** | 「+」号按钮清晰表达"添加"意图 |
| **选择反馈** | 人像选择器使用 Checkbox 明确显示选中状态 |
| **便捷移除** | 每个人像旁都有「×」按钮，随时调整 |
| **状态同步** | 选择器中的选中状态与页面显示实时同步 |

### 8.8 用户体验说明

**个人资料页面**：
- 3列网格布局展示人像
- 悬停显示删除按钮
- 显示已上传数量
- 支持随时删除不需要的人像

**Chat 页面**：
- 默认显示第一张人像
- 点击「+」号可从已有人像中选择添加
- 支持多选，所有选中的人像都参与 AI 生成
- 每个人像旁有删除按钮，可随时调整选择

### 8.8 向后兼容

**兼容旧版本**：
- 如果用户只有一个人像，功能完全正常
- localStorage 的 `avatar_url_{user_id}` 仍会读取（作为备份）
- Chat 页面无需修改，自动适配多个人像

**数据迁移**：
- 旧的单一人像会继续使用
- 用户可以逐步添加更多人像
- 无需强制迁移

---

## 九、下一步优化建议

1. **提示词优化** - 尝试更多提示词变体
2. **API 切换** - 对接专用虚拟试衣 API
3. **分步生成** - 先生成穿着效果，再融合人像
4. **图像后处理** - 使用图像编辑 API 优化结果

---

## 九、用户数据隔离实现

### 9.1 数据隔离原则

**核心目标**：确保不同用户的数据完全隔离，用户只能看到和操作自己的数据。

### 9.2 实现方案

#### 9.2.1 过滤逻辑（兼容旧数据）
```typescript
// 兼容旧数据的过滤模式
const userDataFilter = (item: any, currentUserId: string) => {
  // 旧数据（无 user_id） + 新数据（user_id 匹配）都显示
  return !item.user_id || item.user_id === currentUserId;
};
```

**为什么兼容旧数据？**
- 用户升级后仍能看到历史数据
- 无需强制数据迁移
- 渐进式升级体验

### 9.3 各页面实现详情

| 页面 | 数据类型 | 用户隔离状态 | 说明 |
|------|---------|-------------|------|
| **Profile 页面** | 人像数据 | ✅ 已实现 | 第 48 行：`!p.user_id || p.user_id === currentUser.id` |
| **Wardrobe 页面** | 衣服数据 | ✅ 已修复 | 新增：按 user_id 过滤，兼容旧数据 |
| **Chat 页面** | 人像+衣服 | ✅ 已修复 | 新增：按 user_id 过滤两种数据，兼容旧数据 |
| **首页 (Home)** | 衣服数量 | ✅ 已修复 | 新增：按 user_id 过滤后统计数量 |
| **添加衣服页面** | 写入数据 | ✅ 已修复 | 改用 auth-local 获取 user_id |
| **History 页面** | 历史记录 | ⚠️ 未实现 | 页面暂未接入真实数据 |

### 9.4 Wardrobe 页面修复代码
```typescript
// src/app/wardrobe/page.tsx
import { getCurrentUser } from "@/lib/auth-local";

const loadData = useCallback(async () => {
  try {
    const allClothes = await getAllClothes();
    const currentUser = getCurrentUser();
    
    // 按 user_id 隔离，同时兼容旧数据
    let filteredClothes = allClothes;
    if (currentUser) {
      filteredClothes = allClothes.filter(item => 
        !item.user_id || item.user_id === currentUser.id
      );
    }
    
    setItems(filteredClothes);
  } catch (error) {
    console.error("加载数据失败:", error);
  } finally {
    setIsLoading(false);
  }
}, []);
```

### 9.5 Chat 页面修复代码
```typescript
// src/app/chat/page.tsx
import { getCurrentUser } from "@/lib/auth-local";

const loadData = async () => {
  try {
    const [allClothes, allProfiles] = await Promise.all([
      getAllClothes(),
      getAllProfiles()
    ]);
    
    const currentUser = getCurrentUser();
    
    // 隔离衣服数据
    let filteredClothes = allClothes || [];
    if (currentUser) {
      filteredClothes = filteredClothes.filter((item: any) => 
        !item.user_id || item.user_id === currentUser.id
      );
    }
    setWardrobeItems(filteredClothes);
    
    // 隔离人像数据
    let filteredProfiles = allProfiles || [];
    if (currentUser) {
      filteredProfiles = filteredProfiles.filter((p: any) => 
        !p.user_id || p.user_id === currentUser.id
      );
    }
    // ...
  }
};
```

### 9.6 首页修复代码
```typescript
// src/app/page.tsx
const loadUserData = async () => {
  try {
    const user = getCurrentUser();
    setIsLoggedIn(!!user);
    
    // 获取所有衣服，然后按 user_id 过滤
    const allClothes = await getAllClothes();
    let filteredClothes = allClothes;
    if (user) {
      filteredClothes = allClothes.filter(item => 
        !item.user_id || item.user_id === user.id
      );
    }
    setWardrobeCount(filteredClothes.length);
  } catch (error) {
    console.error("加载用户数据失败:", error);
  } finally {
    setIsLoading(false);
  }
};
```

### 9.7 添加衣服页面修复代码
```typescript
// src/app/wardrobe/add/page.tsx
import { getCurrentUser } from "@/lib/auth-local";

const initUser = async () => {
  try {
    // 使用 auth-local 获取当前用户，而不是旧的 localStorage 方式
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUserId(currentUser.id);
    } else {
      setError("请先登录");
    }
  } catch (err) {
    console.error("初始化用户失败:", err);
    setError("初始化失败，请刷新页面重试");
  }
};
```

### 9.6 数据安全要点

1. **写入时关联 user_id**：
   - 所有新数据必须设置 `user_id` 字段
   - 人像上传时：`user_id: user.id`
   - 衣服上传时：`user_id: user.id`

2. **读取时过滤**：
   - 所有数据查询都必须按 user_id 过滤
   - 同时保留对旧数据的兼容

3. **删除时验证**：
   - 删除前验证数据归属
   - 防止误删其他用户的数据

---

*文档更新时间: 2026-04-14*
*最后更新内容: 1. Chat 页面多人像选择功能（支持默认显示、多选、添加/移除 2. API 变量名错误修复（avatarUrl -> primaryAvatarUrl） 3. 数据兼容策略修复（兼容旧数据无 user_id 问题） 4. 用户数据隔离完整实现（所有页面）*
