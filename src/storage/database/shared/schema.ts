import { pgTable, index, unique, pgPolicy, serial, varchar, timestamp, text, integer, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: varchar({ length: 50 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("users_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("users_username_unique").on(table.username),
	pgPolicy("users_禁止删除", { as: "permissive", for: "delete", to: ["public"], using: sql`false` }),
	pgPolicy("users_禁止更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("users_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("users_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * 用户资料表
 */
export const profiles = pgTable(
  "profiles",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    avatar_url: text("avatar_url"),
    nickname: varchar("nickname", { length: 50 }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("profiles_user_id_idx").on(table.user_id),
    pgPolicy("profiles_禁止删除", { as: "permissive", for: "delete", to: ["public"], using: sql`false` }),
    pgPolicy("profiles_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("profiles_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("profiles_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
  ]
);

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

/**
 * 衣柜单品表
 */
export const wardrobeItems = pgTable(
  "wardrobe_items",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    image_url: text("image_url").notNull(),
    category: varchar("category", { length: 20 }).notNull(),
    color: varchar("color", { length: 20 }).notNull(),
    style_tags: jsonb("style_tags").$type<string[]>(),
    season: varchar("season", { length: 20 }).notNull(),
    ai_description: text("ai_description"),
    user_description: text("user_description"),
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("wardrobe_items_user_id_idx").on(table.user_id),
    index("wardrobe_items_category_idx").on(table.category),
    index("wardrobe_items_created_at_idx").on(table.created_at),
    pgPolicy("wardrobe_items_禁止删除", { as: "permissive", for: "delete", to: ["public"], using: sql`false` }),
    pgPolicy("wardrobe_items_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("wardrobe_items_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("wardrobe_items_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
  ]
);

export type WardrobeItem = typeof wardrobeItems.$inferSelect;
export type InsertWardrobeItem = typeof wardrobeItems.$inferInsert;

/**
 * 穿搭推荐表
 */
export const outfitRecommendations = pgTable(
  "outfit_recommendations",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    user_requirement: text("user_requirement").notNull(),
    scene: varchar("scene", { length: 20 }),
    recommended_style: varchar("recommended_style", { length: 20 }),
    reason: text("reason"),
    result_image_url: text("result_image_url"),
    is_selected: integer("is_selected").default(0),
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("outfit_recommendations_user_id_idx").on(table.user_id),
    index("outfit_recommendations_created_at_idx").on(table.created_at),
    pgPolicy("outfit_recommendations_禁止删除", { as: "permissive", for: "delete", to: ["public"], using: sql`false` }),
    pgPolicy("outfit_recommendations_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("outfit_recommendations_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("outfit_recommendations_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
  ]
);

export type OutfitRecommendation = typeof outfitRecommendations.$inferSelect;
export type InsertOutfitRecommendation = typeof outfitRecommendations.$inferInsert;

/**
 * 穿搭方案单品表
 */
export const outfitItems = pgTable(
  "outfit_items",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    outfit_id: varchar("outfit_id", { length: 36 }).notNull().references(() => outfitRecommendations.id, { onDelete: "cascade" }),
    item_id: varchar("item_id", { length: 36 }).notNull().references(() => wardrobeItems.id, { onDelete: "cascade" }),
    display_order: integer("display_order").notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("outfit_items_outfit_id_idx").on(table.outfit_id),
    index("outfit_items_item_id_idx").on(table.item_id),
    pgPolicy("outfit_items_禁止删除", { as: "permissive", for: "delete", to: ["public"], using: sql`false` }),
    pgPolicy("outfit_items_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("outfit_items_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("outfit_items_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
  ]
);

export type OutfitItem = typeof outfitItems.$inferSelect;
export type InsertOutfitItem = typeof outfitItems.$inferInsert;

/**
 * 用户反馈表
 */
export const userFeedback = pgTable(
  "user_feedback",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    outfit_id: varchar("outfit_id", { length: 36 }).notNull().references(() => outfitRecommendations.id, { onDelete: "cascade" }),
    user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    feedback_type: varchar("feedback_type", { length: 20 }).notNull(),
    feedback_reason: text("feedback_reason"),
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("user_feedback_outfit_id_idx").on(table.outfit_id),
    index("user_feedback_user_id_idx").on(table.user_id),
    pgPolicy("user_feedback_禁止删除", { as: "permissive", for: "delete", to: ["public"], using: sql`false` }),
    pgPolicy("user_feedback_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
    pgPolicy("user_feedback_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("user_feedback_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
  ]
);

export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = typeof userFeedback.$inferInsert;

/**
 * 服装类别常量
 */
export const CLOTHING_CATEGORIES = [
  { value: "tops", label: "上装" },
  { value: "bottoms", label: "下装" },
  { value: "dresses", label: "裙装" },
  { value: "outerwear", label: "外套" },
  { value: "shoes", label: "鞋子" },
  { value: "bags", label: "包包" },
  { value: "accessories", label: "配饰" },
  { value: "hats", label: "帽子" },
] as const;

/**
 * 颜色常量
 */
export const COLORS = [
  { value: "red", label: "红色", hex: "#E53935" },
  { value: "blue", label: "蓝色", hex: "#1E88E5" },
  { value: "black", label: "黑色", hex: "#212121" },
  { value: "white", label: "白色", hex: "#FAFAFA" },
  { value: "gray", label: "灰色", hex: "#9E9E9E" },
  { value: "pink", label: "粉色", hex: "#EC407A" },
  { value: "purple", label: "紫色", hex: "#8E24AA" },
  { value: "green", label: "绿色", hex: "#43A047" },
  { value: "yellow", label: "黄色", hex: "#FDD835" },
  { value: "orange", label: "橙色", hex: "#FB8C00" },
  { value: "brown", label: "棕色", hex: "#6D4C41" },
] as const;

/**
 * 季节常量
 */
export const SEASONS = [
  { value: "spring", label: "春季" },
  { value: "summer", label: "夏季" },
  { value: "autumn", label: "秋季" },
  { value: "winter", label: "冬季" },
  { value: "all", label: "四季通用" },
] as const;

/**
 * 风格标签
 */
export const STYLE_TAGS = [
  { value: "casual", label: "休闲" },
  { value: "formal", label: "正式" },
  { value: "sporty", label: "运动" },
  { value: "elegant", label: "优雅" },
  { value: "vintage", label: "复古" },
  { value: "street", label: "街头" },
  { value: "bohemian", label: "波西米亚" },
  { value: "minimalist", label: "简约" },
] as const;
