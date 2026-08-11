/**
 * [INPUT]: jotai 的 atomWithStorage/createJSONStorage；themes 的 LayoutId/FontId；styleVisibility 的共享显隐状态与多代迁移器
 * [OUTPUT]: contentAtom / styleAtom / exportAtom / avatarAtom 及其状态类型
 * [POS]: 全应用状态的单一事实来源。content=书摘内容与元数据，style=外观参数，
 *        export=导出参数，avatar=头像库(用户身份资产，独立于书摘内容)。四者皆用
 *        atomWithStorage 持久化到 localStorage；style v12 在共享显隐基础上加入全局正文粗细，并从
 *        v11/v10 迁移；迁移边界会把非法字重收敛回默认档。content(v1) 读取时把 shareDate 强制
 *        归零为 null——日期字段不跟随正文持久化，重开永远跟随今天，其余字段(正文/书名/章节/
 *        作者/二维码/署名/平台)正常跨会话保留。
 * [SYNC]: 增删字段时同步 ExcerptCard 渲染、Dock 控件与持久化迁移约束(改 style/content/avatar 形状即升 key)。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { LAYOUTS, type LayoutId, type FontId } from "@/themes/themes";
import {
  createMigratingStyleStringStorage,
  DEFAULT_SHARED_VISIBILITY,
  migrateSharedVisibility,
  type SharedVisibilityState,
} from "@/state/styleVisibility";

// 书摘内容与元数据（卡片上的一切文字来源；头像不在此，见 avatarAtom）
export interface ExcerptContent {
  content: string;
  bookTitle: string;
  chapter: string;
  author: string;
  qrUrl: string;
  shareName: string;
  /** 全局共享的摘录日期(ISO "YYYY-MM-DD"，parseDate 亦可解析)；null=跟随今天。所有版式日期同源于此，仅格式化不同 */
  shareDate: string | null;
  brand: string;
}

// 外观参数：三轴正交 —— 版式(结构) / 配色(卡片色) / 图片背景(外框)
export interface StyleState extends SharedVisibilityState {
  layout: LayoutId;
  /** 每版式各记一份配色选择(串)：预设 id 或 "#hex"(自定义底色)。故每版式默认沿用原色、且各自可切各自记 */
  schemeByLayout: Record<LayoutId, string>;
  // 继承的八项内容显隐皆跨版式共享；不支持某项的版式只是不消费对应值。章节仍受书名级联约束。
  /** 图片背景 = ray.so 主题 id（见 backgrounds.ts） */
  background: string;
  /** 有背景模式下 .frame 的外框留白厚度，复刻 ray.so 的 16/32/64/128 四档；写入 --frame-pad */
  framePadding: FramePadding;
  font: FontId;
  /** 正文(.quote)字号，全局统一四档，用户直选、不再自适应；写入 --quote-max，直接落地 font-size */
  quoteFontSize: QuoteFontSize;
  /** 正文基础字重，全版式共享三档；日历版式在此基础上强化一级，写入 --quote-weight* */
  quoteFontWeight: QuoteFontWeight;
  showFrame: boolean;
  cardWidth: number;
}

// ray.so 同款四档外框留白（px）
export type FramePadding = 16 | 32 | 64 | 128;

// 正文字号四档（px）；20 为原自适应算法的「理想值」默认，故延续为新默认，老用户观感不突变
export type QuoteFontSize = 16 | 18 | 20 | 22;

// 正文基础字重三档；500 延续现有苹方 Medium 观感，避免升级后默认样式漂移
export type QuoteFontWeight = 400 | 500 | 600;

export type ExportScale = 2 | 4 | 6;

// 导出参数
export interface ExportState {
  scale: ExportScale;
  format: "png";
}

// 默认样例：首屏即有一组完整、可直接导出的真实书摘内容；localStorage 为空或损坏时回退到这份默认值
const DEFAULT_CONTENT_STATE: ExcerptContent = {
  content:
    "一个人在学会将他的语句变作一辆满载语义的大车之前，在学会从爱人的相貌中分辨出并爱上那种“朝圣者的灵魂”之前，在熟知“一度荣光的任何记忆/都无法补偿之后的漠视，/或使结局少些苦涩”这样的诗句之前，在这些东西注入他的血液之前，他就仍属于无语言家族。",
  bookTitle: "悲伤与理智",
  chapter: "一个不温和的建议",
  author: "约瑟夫·布罗茨基",
  qrUrl: "https://example.com",
  shareName: "YOLO",
  shareDate: null,
  brand: "Apple Books",
};

// shareDate 语义是「null=跟随今天」：若原样持久化，用户几天前设的具体日期会在重开后被当作「今天」
// 静默展示，比「根本没设日期」更隐蔽。故读取时无条件把它归零，只有其余字段跨会话保留。
const CONTENT_STORAGE_KEY = "excerpt.content.v1";

function normalizeContentState(value: unknown): ExcerptContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_CONTENT_STATE;
  return { ...DEFAULT_CONTENT_STATE, ...(value as Partial<ExcerptContent>), shareDate: null };
}

const contentStorage = createJSONStorage<ExcerptContent>(
  () => window.localStorage,
  { reviver: (key, value) => (key === "" ? normalizeContentState(value) : value) },
);

export const contentAtom = atomWithStorage<ExcerptContent>(
  CONTENT_STORAGE_KEY,
  DEFAULT_CONTENT_STATE,
  contentStorage,
);

// ============ 头像库(持久化) ============
// 头像为 base64 图片，裸存 localStorage 易撑爆：上传侧(useAvatarLibrary)已缩放至 ≤256px，此处再封顶历史条数
export const MAX_AVATAR_HISTORY = 12;

// 用户身份资产，独立于书摘内容、跨会话保留：上传历史 + 当前选择
export interface AvatarState {
  /** 上传历史(缩放后 dataURL)，去重，末尾为最新，超 MAX_AVATAR_HISTORY 淘汰最旧 */
  history: string[];
  /** 当前选中的头像；null=用最新(history 末尾) */
  selected: string | null;
}

export const avatarAtom = atomWithStorage<AvatarState>("excerpt.avatar.v1", {
  history: [],
  selected: null,
});

// 卡片默认宽度(px)；导出为常量供 Stage 的「恢复默认宽度」按钮复用，避免与此处默认值各存一份走样。
// 390 贴近主流手机屏幕宽度(iPhone 非 Pro Max 机型 390pt)，也接近本项目视觉校准依据本身
// (design/ 里微信读书原图截屏 375pt)，让默认导出图更接近手机原生截图的观感，而非桌面卡片尺寸感。
export const DEFAULT_CARD_WIDTH = 390;

// 每版式默认配色 = 其 defaultScheme(当前统一 ink)，铺成 schemeByLayout 初值
const DEFAULT_SCHEME_BY_LAYOUT = Object.fromEntries(
  LAYOUTS.map((l) => [l.id, l.defaultScheme]),
) as Record<LayoutId, string>;

const DEFAULT_STYLE_STATE: StyleState = {
  layout: "classic",
  schemeByLayout: DEFAULT_SCHEME_BY_LAYOUT,
  ...DEFAULT_SHARED_VISIBILITY,
  background: "midnight",
  framePadding: 64,
  font: "pingfang",
  quoteFontSize: 20,
  quoteFontWeight: 500,
  showFrame: true,
  cardWidth: DEFAULT_CARD_WIDTH,
};

const STYLE_STORAGE_KEY = "excerpt.style.v12";
const LEGACY_STYLE_STORAGE_KEYS = ["excerpt.style.v11", "excerpt.style.v10"] as const;
const LEGACY_VISIBILITY_KEYS = [
  "showAvatarByLayout",
  "showNameByLayout",
  "showDateByLayout",
  "showTitleByLayout",
  "showChapterByLayout",
  "showAuthorByLayout",
  "showBrandByLayout",
  "showQrByLayout",
] as const;

function normalizeQuoteFontWeight(value: unknown): QuoteFontWeight {
  return value === 400 || value === 500 || value === 600 ? value : DEFAULT_STYLE_STATE.quoteFontWeight;
}

function migrateStyleState(value: unknown): StyleState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_STYLE_STATE;

  const migrated = {
    ...DEFAULT_STYLE_STATE,
    ...value,
    quoteFontWeight: normalizeQuoteFontWeight((value as Record<string, unknown>).quoteFontWeight),
    ...migrateSharedVisibility(value),
  } as StyleState & Record<string, unknown>;

  for (const key of LEGACY_VISIBILITY_KEYS) delete migrated[key];
  return migrated;
}

// 新 key 优先；首次命中 v11/v10 时立即规范化写入 v12，成功后删除旧 key。重置时三代 key 一并清除。
const styleStringStorage = createMigratingStyleStringStorage(
  () => typeof window === "undefined" ? undefined : window.localStorage,
  STYLE_STORAGE_KEY,
  LEGACY_STYLE_STORAGE_KEYS,
  migrateStyleState,
);

const styleStorage = createJSONStorage<StyleState>(() => styleStringStorage, {
  reviver: (key, value) => key === "" ? migrateStyleState(value) : value,
});

// 存储 key 升 v12：新增全局 quoteFontWeight；v11/v10 的其余外观配置与共享显隐原样迁移。
export const styleAtom = atomWithStorage<StyleState>(STYLE_STORAGE_KEY, DEFAULT_STYLE_STATE, styleStorage);

export const exportAtom = atomWithStorage<ExportState>("excerpt.export", {
  scale: 4,
  format: "png",
});
