import {
  CLOTHING_CATEGORIES,
  COLORS,
  SEASONS,
  STYLE_TAGS,
} from "@/storage/database/shared/schema";

export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE_NAME = "app_locale";
export const SUPPORTED_LOCALES = ["en", "zh"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

type LocalizedValue = {
  en: string;
  zh: string;
};

const categoryLabels: Record<string, LocalizedValue> = {
  tops: { en: "Tops", zh: "上装" },
  bottoms: { en: "Bottoms", zh: "下装" },
  dresses: { en: "Dresses", zh: "裙装" },
  outerwear: { en: "Outerwear", zh: "外套" },
  shoes: { en: "Shoes", zh: "鞋子" },
  bags: { en: "Bags", zh: "包包" },
  accessories: { en: "Accessories", zh: "配饰" },
  hats: { en: "Hats", zh: "帽子" },
};

const colorLabels: Record<string, LocalizedValue> = {
  red: { en: "Red", zh: "红色" },
  blue: { en: "Blue", zh: "蓝色" },
  black: { en: "Black", zh: "黑色" },
  white: { en: "White", zh: "白色" },
  gray: { en: "Gray", zh: "灰色" },
  beige: { en: "Beige", zh: "米色" },
  green: { en: "Green", zh: "绿色" },
  pink: { en: "Pink", zh: "粉色" },
  purple: { en: "Purple", zh: "紫色" },
  yellow: { en: "Yellow", zh: "黄色" },
  orange: { en: "Orange", zh: "橙色" },
  brown: { en: "Brown", zh: "棕色" },
  navy: { en: "Navy", zh: "藏青色" },
  khaki: { en: "Khaki", zh: "卡其色" },
};

const seasonLabels: Record<string, LocalizedValue> = {
  spring: { en: "Spring", zh: "春季" },
  summer: { en: "Summer", zh: "夏季" },
  autumn: { en: "Autumn", zh: "秋季" },
  fall: { en: "Fall", zh: "秋季" },
  winter: { en: "Winter", zh: "冬季" },
  all: { en: "All season", zh: "四季通用" },
};

const styleLabels: Record<string, LocalizedValue> = {
  casual: { en: "Casual", zh: "休闲" },
  formal: { en: "Formal", zh: "正式" },
  sporty: { en: "Sporty", zh: "运动" },
  elegant: { en: "Elegant", zh: "优雅" },
  vintage: { en: "Vintage", zh: "复古" },
  street: { en: "Street", zh: "街头" },
  bohemian: { en: "Bohemian", zh: "波西米亚" },
  minimalist: { en: "Minimalist", zh: "简约" },
  chic: { en: "Chic", zh: "时尚" },
  feminine: { en: "Feminine", zh: "女性化" },
  edgy: { en: "Edgy", zh: "酷感" },
};

const sceneLabels: Record<string, LocalizedValue> = {
  meeting: { en: "Meeting", zh: "会议" },
  date: { en: "Date", zh: "约会" },
  casual: { en: "Casual", zh: "日常" },
  party: { en: "Party", zh: "派对" },
  travel: { en: "Travel", zh: "旅行" },
  work: { en: "Work", zh: "办公" },
  office: { en: "Office", zh: "办公" },
  outdoor: { en: "Outdoor", zh: "户外" },
  evening: { en: "Evening", zh: "晚宴" },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "zh";
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  const normalized = value.toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh";
  }
  if (normalized.startsWith("en")) {
    return "en";
  }
  return DEFAULT_LOCALE;
}

export function t(locale: Locale, en: string, zh: string): string {
  return locale === "zh" ? zh : en;
}

export function getHtmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en";
}

export function translateCategory(value: string, locale: Locale): string {
  const label = categoryLabels[value];
  return label ? label[locale] : value;
}

export function translateColor(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  const label = colorLabels[value];
  return label ? label[locale] : value;
}

export function translateSeason(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  const label = seasonLabels[value];
  return label ? label[locale] : value;
}

export function translateStyleTag(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  const label = styleLabels[value];
  return label ? label[locale] : value;
}

export function translateScene(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  const label = sceneLabels[value];
  return label ? label[locale] : value;
}

export function getLocalizedClothingCategories(locale: Locale) {
  return CLOTHING_CATEGORIES.map((item) => ({
    ...item,
    label: translateCategory(item.value, locale),
  }));
}

export function getLocalizedColors(locale: Locale) {
  return COLORS.map((item) => ({
    ...item,
    label: translateColor(item.value, locale),
  }));
}

export function getLocalizedSeasons(locale: Locale) {
  return SEASONS.map((item) => ({
    ...item,
    label: translateSeason(item.value, locale),
  }));
}

export function getLocalizedStyleTags(locale: Locale) {
  return STYLE_TAGS.map((item) => ({
    ...item,
    label: translateStyleTag(item.value, locale),
  }));
}
