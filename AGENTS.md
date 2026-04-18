# AI穿搭助手 - 项目开发规范

## 项目概述

**产品名称**: AI穿搭助手
**产品定位**: 帮助女性用户用AI发现已有衣橱搭配潜力的每日穿搭助手
**核心理念**: 不是让你买更多衣服，而是让你发现——你已经拥有的，就足够好看。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **本地存储**: localStorage (用户认证) + IndexedDB (衣物数据)
- **云存储 (可选)**: Supabase (PostgreSQL)
- **AI**: LLM API + Image Generation API

## 认证方案

### 当前方案：双方案支持（localStorage + Supabase）

项目已支持两种认证方案：

1. **localStorage 临时方案**（默认）
   - 适合快速体验和开发
   - 用户数据（用户名、密码哈希）存储在 localStorage
   - 衣物数据存储在 IndexedDB，与 user_id 关联
   - 无需配置 Supabase 环境变量即可使用

2. **Supabase 云端方案**（推荐生产使用）
   - 数据云端存储，支持跨设备同步
   - 使用 Supabase Auth 管理用户认证
   - 使用 Supabase PostgreSQL 存储业务数据

**核心文件**：
- `src/lib/auth-local.ts` - localStorage 认证核心逻辑（注册、登录、登出）
- `src/lib/auth-client.ts` - 客户端认证 Hook
- `src/contexts/auth-context.tsx` - React Context 提供全局认证状态
- `src/app/auth/login/page.tsx` - 登录页面
- `src/app/auth/register/page.tsx` - 注册页面
- `src/storage/database/supabase-client.ts` - Supabase 客户端

**数据隔离**：
- localStorage 方案：用户数据与 user_id 关联存储在本地
- Supabase 方案：通过 RLS 策略实现数据隔离

### Supabase 云端方案配置

#### 第一步：通过 Coze 平台界面配置

在 Coze 平台上完成以下操作：

1. **开通 Supabase 服务**
   - 登录 Coze 平台
   - 进入项目设置 → 集成
   - 找到 **Supabase** 集成并开通

2. **获取配置信息**
   开通后会获得以下环境变量（由平台自动注入）：
   ```
   COZE_SUPABASE_URL=https://xxx.supabase.co
   COZE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
   （可选）`COZE_SUPABASE_SERVICE_ROLE_KEY` 用于服务端绕过 RLS

#### 第二步：切换到 Supabase 方案

配置完成后，可以将认证逻辑从 localStorage 迁移到 Supabase Auth。

#### 第三步：数据迁移（可选）

如果已有 localStorage 数据，可以：
1. 导出本地数据
2. 注册 Supabase 账号
3. 将数据导入到 Supabase 数据库

### 技术说明

| 项目 | localStorage 方案 | Supabase 方案 |
|------|------------------|---------------|
| 用户认证 | localStorage | Supabase Auth |
| 数据存储 | IndexedDB | PostgreSQL |
| 跨设备同步 | ❌ | ✅ |
| 数据安全 | 浏览器本地 | 云端加密 |
| 配置难度 | 无 | 需开通集成 |

## 目录结构

```
/workspace/projects
├── src/
│   ├── app/                      # Next.js App Router 页面
│   │   ├── page.tsx              # 首页
│   │   ├── layout.tsx            # 根布局
│   │   ├── globals.css           # 全局样式
│   │   ├── wardrobe/             # 衣柜管理
│   │   │   ├── page.tsx          # 衣柜列表页
│   │   │   └── add/page.tsx      # 添加衣服页
│   │   ├── chat/                 # AI穿搭对话
│   │   │   └── page.tsx          # 聊天页
│   │   ├── history/              # 穿搭历史
│   │   │   └── page.tsx          # 历史记录页
│   │   ├── profile/              # 个人资料
│   │   │   └── page.tsx          # 资料页
│   │   ├── share/                # 分享页面
│   │   │   └── [id]/page.tsx     # 分享详情页
│   │   └── api/                  # API 路由
│   │       ├── analyze-cloth/    # 衣服分析 API
│   │       ├── chat/             # AI 对话 API (流式)
│   │       ├── generate-outfit/  # 穿搭生成 API
│   │       └── share/            # 分享 API
│   ├── components/               # 组件
│   │   ├── ui/                   # shadcn/ui 组件
│   │   └── BottomNav.tsx         # 底部导航
│   ├── storage/                  # 数据库相关
│   │   ├── database/
│   │   │   ├── shared/
│   │   │   │   └── schema.ts    # 数据库表定义
│   │   │   └── supabase-client.ts # Supabase 客户端
│   │   └── ...
│   └── hooks/                    # 自定义 Hooks
├── public/                       # 静态资源
├── scripts/                      # 构建脚本
└── .coze                         # Coze CLI 配置
```

## 数据库表结构

### 1. profiles - 用户资料表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) | 主键 UUID |
| avatar_url | text | 人像照片 URL |
| nickname | varchar(50) | 昵称 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

### 2. wardrobe_items - 衣柜单品表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) | 主键 UUID |
| user_id | varchar(36) | 所属用户 ID |
| image_url | text | 服装图片 URL |
| category | varchar(20) | 类别 (tops/bottoms/dresses/outerwear/shoes/bags/accessories/hats) |
| color | varchar(20) | 主色调 |
| style_tags | text[] | 风格标签数组 |
| season | varchar(20) | 适合季节 |
| ai_description | text | AI 识别描述 |
| user_description | text | 用户自定义描述 |
| created_at | timestamp | 创建时间 |

### 3. outfit_recommendations - 穿搭推荐表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) | 主键 UUID |
| user_id | varchar(36) | 所属用户 ID |
| user_requirement | text | 用户需求描述 |
| scene | varchar(20) | 场景标签 |
| recommended_style | varchar(20) | 推荐风格 |
| reason | text | 穿搭理由 |
| result_image_url | text | 效果图 URL |
| is_selected | integer | 是否被选用 (0/1) |
| created_at | timestamp | 创建时间 |

### 4. outfit_items - 穿搭方案单品表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) | 主键 UUID |
| outfit_id | varchar(36) | 所属穿搭推荐 ID |
| item_id | varchar(36) | 单品 ID |
| display_order | integer | 显示顺序 |
| created_at | timestamp | 创建时间 |

### 5. user_feedback - 用户反馈表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) | 主键 UUID |
| outfit_id | varchar(36) | 所属穿搭推荐 ID |
| user_id | varchar(36) | 用户 ID |
| feedback_type | varchar(20) | 反馈类型 (like/dislike/share) |
| feedback_reason | text | 反馈理由 |
| created_at | timestamp | 创建时间 |

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式 (热更新)
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务
pnpm start

# 代码检查
pnpm lint
```

## 环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| COZE_BUCKET_ENDPOINT_URL | 对象存储端点 | https://bucket.cn-beijing.myzerver.com |
| COZE_BUCKET_NAME | 存储桶名称 | your-bucket-name |
| COZE_SUPABASE_URL | Supabase 数据库 URL | https://xxx.supabase.co |
| COZE_SUPABASE_ANON_KEY | Supabase 匿名密钥 | eyJhbGci... |
| DEPLOY_RUN_PORT | 服务监听端口 | 5000 |

## 核心功能流程

### 1. 添加衣服到衣柜
1. 用户拍照/上传衣服图片
2. 调用 `/api/analyze-cloth` 进行 AI 识别
3. AI 返回类别、颜色、风格标签
4. 用户确认/修改信息后保存到衣柜

### 2. AI 穿搭推荐
1. 用户输入今日需求（场景/风格/心情）
2. 调用 `/api/chat` 获取流式对话响应
3. AI 分析衣柜中的单品
4. 调用 `/api/generate-outfit` 生成 3 套穿搭方案
5. 每套方案附带上身效果图

### 3. 分享穿搭
1. 用户选择满意的穿搭方案
2. 调用 `/api/share` 生成分享数据
3. 可分享到微信/小红书等平台

## API 文档

### POST /api/analyze-cloth
分析衣服图片，返回识别结果。

**请求体**:
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**响应**:
```json
{
  "category": "tops",
  "color": "blue",
  "style_tags": ["casual", "minimalist"],
  "description": "蓝色棉质T恤，简约百搭"
}
```

### POST /api/chat (流式)
AI 对话接口，支持流式输出。

**请求体**:
```json
{
  "message": "今天要开会，想显瘦一些",
  "wardrobeItems": [...],
  "userId": "user-uuid"
}
```

**响应**: SSE 流式输出

### POST /api/generate-outfit
生成穿搭方案。

**请求体**:
```json
{
  "requirement": "今天要开会，想显瘦一些",
  "wardrobeItems": [...],
  "userId": "user-uuid"
}
```

**响应**:
```json
{
  "results": [
    {
      "style": "简约干练",
      "scene": "meeting",
      "reason": "深色系显瘦，剪裁利落",
      "items": [...],
      "imageUrl": "https://..."
    }
  ]
}
```

## 服装类别常量

```typescript
const CLOTHING_CATEGORIES = [
  { value: "tops", label: "上装" },
  { value: "bottoms", label: "下装" },
  { value: "dresses", label: "裙装" },
  { value: "outerwear", label: "外套" },
  { value: "shoes", label: "鞋子" },
  { value: "bags", label: "包包" },
  { value: "accessories", label: "配饰" },
  { value: "hats", label: "帽子" },
];
```

## 颜色常量

```typescript
const COLORS = [
  { value: "red", label: "红色", hex: "#E53935" },
  { value: "blue", label: "蓝色", hex: "#1E88E5" },
  { value: "black", label: "黑色", hex: "#212121" },
  { value: "white", label: "白色", hex: "#FAFAFA" },
  { value: "gray", label: "灰色", hex: "#9E9E9E" },
  // ... 更多颜色
];
```

## 风格标签

```typescript
const STYLE_TAGS = [
  { value: "casual", label: "休闲" },
  { value: "formal", label: "正式" },
  { value: "sporty", label: "运动" },
  { value: "elegant", label: "优雅" },
  { value: "vintage", label: "复古" },
  { value: "street", label: "街头" },
  { value: "bohemian", label: "波西米亚" },
  { value: "minimalist", label: "简约" },
];
```

## 常见问题

### Q: Supabase 连接失败
A: 确保 `COZE_SUPABASE_URL` 和 `COZE_SUPABASE_ANON_KEY` 环境变量已正确设置。

### Q: 图片上传失败
A: 检查图片大小是否超过限制，格式是否为支持的格式 (JPEG/PNG/GIF/WebP)。

### Q: AI 分析结果不准确
A: 建议使用纯色背景拍摄，可手动修正识别结果。

## Tailwind CSS 4 配置说明

由于项目使用 Tailwind CSS 4，需要在 `globals.css` 中正确配置 shadcn/ui 所需的 CSS 变量：

```css
@import "tailwindcss";
@source "../components/ui/**/*.tsx";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    /* ... 其他 CSS 变量 */
  }
}

@theme {
  --color-background: hsl(var(--background));
  /* ... 其他 Tailwind 颜色变量 */
}
```

**关键点**：
1. 使用 `@source` 指令扫描 shadcn/ui 组件文件
2. 在 `@layer base` 中定义 CSS 变量（使用 hsl 格式）
3. 在 `@theme` 中将 CSS 变量映射为 Tailwind 颜色

## 下一步开发建议

1. **用户认证**: 添加 Supabase Auth 实现用户登录
2. **实时预览**: 优化虚拟试衣效果图的生成速度
3. **社交分享**: 优化分享图的样式和分享体验
4. **数据统计**: 添加用户行为分析，了解用户偏好
5. **推送提醒**: 添加每日穿搭提醒功能

## 虚拟试衣技术方案

### 当前方案概述

本项目采用 **AI图像生成 + 智能搭配** 方案：

| 模块 | 技术 | 说明 |
|------|------|------|
| 图像生成 | 豆包 Seedream | 通过 coze-coding-dev-sdk 调用 |
| 图片存储 | S3 兼容对象存储 | 通过 coze-coding-dev-sdk 的 S3Storage |
| 本地数据 | IndexedDB | 浏览器端本地存储 |

### 功能流程

```
用户输入需求 → 智能匹配衣服 → 多图参考生成 → 展示效果图
```

### 方案优缺点

**优点**：
- ✅ 集成度高，一个 SDK 搞定图像生成和存储
- ✅ 成本低，无需自建服务器
- ✅ 支持多图参考
- ✅ 自动智能搭配

**缺点**：
- ❌ **保留原样有限**：AI 会"创作"而非"复制"，人像和衣服细节可能有变化
- ❌ **非专用模型**：Seedream 是通用图像生成模型，非虚拟试衣专用

### 替代 API 推荐

| 方案 | 保留原样程度 | 成本 | 说明 |
|------|-------------|------|------|
| 当前方案 (Seedream) | 🟡 70-80% | 低 | 快速验证 |
| 阿里鸀镜 | 🟢 95%+ | 高 | 专业虚拟试衣 |
| 腾讯云图像融合 | 🟢 90%+ | 中 | 人像保留好 |
| Stable Diffusion + LoRA | 🟢 95%+ | 中 | 完全本地可控 |

### 详细文档

详见 `docs/VIRTUAL_TRYON_TECHNICAL.md`

### 环境变量配置

详见 `.env.local.example`，主要变量：

```bash
# 对象存储 (必须)
COZE_BUCKET_ENDPOINT_URL=xxx
COZE_BUCKET_NAME=xxx

# Supabase (可选)
COZE_SUPABASE_URL=xxx
COZE_SUPABASE_ANON_KEY=xxx
```

### 本地调试

1. 复制 `.env.local.example` 为 `.env.local`
2. 填写密钥
3. 运行 `pnpm dev`
4. 访问 `http://localhost:5000`
