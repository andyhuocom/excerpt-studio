/**
 * [INPUT]: 无（纯数据 + 派生函数）
 * [OUTPUT]: SchemeId 类型，SCHEMES 预设(12 套)，SchemeTokens，resolveScheme()/deriveScheme()
 * [POS]: themes 模块的**配色**字典。配色 = 卡片一整套颜色，与版式正交、可任意组合。一套只需定 (底色 bg,
 *        正文色 ink, 深浅 dark)——次要/水印/装饰皆由 ink 按透明度阶梯派生(toTokens)，保证同源和谐。
 *        12 套刻意拉开色相与明度(暖黑/暖炭/藏青/松/绛/栗 + 米/素/绯/雪/天/沙)，不留重复。值不落 CSS——
 *        App 把选中套写入 root 的 --c-* 令牌，studio.css 只消费(对齐 --bg 打法)。选择串以 "#" 开头即自定义
 *        底色，deriveScheme 按明暗配可读文字。各版式的默认配色见 themes.ts 的 LAYOUTS.defaultScheme。
 * [SYNC]: 增删配色时同步选择器；令牌名变更时同步 App 写入与 studio.css 消费点。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type SchemeId =
  | "ink" | "slate" | "navy" | "forest" | "wine" | "espresso"
  | "cream" | "paper" | "blush" | "snow" | "sky" | "sand";

// 卡片语义色令牌：bg 底色(可渐变)、ink 正文/标题、mut 次要(日期/出处)、faint 水印、
// accent 装饰(粗杠/边框)、qr 二维码衬底(深底铺白盒以可扫)
export interface SchemeTokens {
  bg: string;
  ink: string;
  mut: string;
  faint: string;
  accent: string;
  qr: string;
}

export interface SchemeMeta {
  id: SchemeId;
  label: string;
  bg: string;
  ink: string;
  dark: boolean;
}

// 12 套：色相/明度拉开，无重复。前六深底、后六浅底
export const SCHEMES: SchemeMeta[] = [
  { id: "ink", label: "墨", dark: true, bg: "#1b1c1e", ink: "#e9e0cb" },
  { id: "slate", label: "黛", dark: true, bg: "#26262a", ink: "#ece3cf" },
  { id: "navy", label: "藏青", dark: true, bg: "#1b2340", ink: "#d9e2f4" },
  { id: "forest", label: "松", dark: true, bg: "#1a2a20", ink: "#d7e8da" },
  { id: "wine", label: "绛", dark: true, bg: "#2a1a1d", ink: "#f0d9db" },
  { id: "espresso", label: "栗", dark: true, bg: "#241b14", ink: "#f0dcc4" },
  { id: "cream", label: "米", dark: false, bg: "#f5f3ee", ink: "#2a251d" },
  { id: "paper", label: "素", dark: false, bg: "#f6f7f8", ink: "#23262a" },
  { id: "blush", label: "绯", dark: false, bg: "linear-gradient(178deg, #f4e3e4 0%, #efe7df 88%)", ink: "#3b2f30" },
  { id: "snow", label: "雪", dark: false, bg: "#fdfdfb", ink: "#242322" },
  { id: "sky", label: "天", dark: false, bg: "#e9eef7", ink: "#27374d" },
  { id: "sand", label: "沙", dark: false, bg: "#efe6d3", ink: "#473d2b" },
];

const HEX = /^#([0-9a-fA-F]{6})$/;

// hex → rgba 串(带透明度)；非 hex(如渐变)原样返回
function rgba(hex: string, a: number): string {
  const m = HEX.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// (底色, 正文色, 深浅) → 整套令牌：次要/水印/装饰=正文色的透明度阶梯，同源和谐
function toTokens(bg: string, ink: string, dark: boolean): SchemeTokens {
  return {
    bg,
    ink,
    mut: rgba(ink, 0.62),
    faint: rgba(ink, 0.42),
    accent: rgba(ink, 0.5),
    qr: dark ? "#fff" : "transparent",
  };
}

// 相对亮度(sRGB 近似)：判定底色深浅
function luminance(hex: string): number {
  const m = HEX.exec(hex);
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

// 自定义底色 → 可读令牌：深底铺暖白正文、浅底铺暖近黑正文
export function deriveScheme(bg: string): SchemeTokens {
  const dark = luminance(bg) < 0.5;
  return toTokens(bg, dark ? "#f2ede2" : "#1f1c19", dark);
}

// 解析配色选择串：以 "#" 开头=自定义底色(派生)，否则=预设 id
export function resolveScheme(sel: string): SchemeTokens {
  if (sel.startsWith("#")) return deriveScheme(sel);
  const s = SCHEMES.find((x) => x.id === sel) ?? SCHEMES[0];
  return toTokens(s.bg, s.ink, s.dark);
}
