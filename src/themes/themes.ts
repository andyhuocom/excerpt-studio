/**
 * [INPUT]: 无（纯数据）
 * [OUTPUT]: LayoutId / FontId 类型，LAYOUTS / FONTS / AVATAR_LAYOUTS / QR_LAYOUTS / NAME_LAYOUTS 注册表
 * [POS]: themes 模块的版式与字体字典。**版式(layout)只管结构**——版面排布/显隐/内边距/字号，
 *        由 studio.css 的 `.stage[data-layout="<id>"]` 选择器承载；卡片颜色不在此，交 schemes(配色)。
 *        每个版式登记 defaultScheme = 其初始配色(当前统一 ink)，供 atoms 铺 schemeByLayout 初值(仍可切换)。
 *        此处只登记 id/标签/默认配色，供 Dock 渲染分段控件、供 Stage 写 data-layout。二者靠 id 字符串对齐。
 *        FONTS 登记十一档 macOS 系统字体(中文六+西文五)，label 是完整系统字体名，compactLabel
 *        是字体与粗细同行时的稳定短名；probe 是给
 *        state/useAvailableFonts 做运行时探测(canvas 测宽法)用的 family 名，本模块仍是纯数据，
 *        探测逻辑不在此处。
 * [SYNC]: 新增版式或字体时同步注册表、studio.css 结构选择器/字体变量与默认配色。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { SchemeId } from "./schemes";

export type LayoutId = "classic" | "calendar" | "mono" | "note" | "jinshu";
export type FontId =
  | "pingfang"
  | "songti"
  | "heiti"
  | "kaiti"
  | "fangsong"
  | "yuanti"
  | "sanfrancisco"
  | "helveticaneue"
  | "timesnewroman"
  | "georgia"
  | "avenirnext";

export interface LayoutMeta {
  id: LayoutId;
  label: string;
  /** 该版式初始配色(当前统一 ink)；atoms 用它铺 schemeByLayout 初值，用户仍可另切 */
  defaultScheme: SchemeId;
}

export const LAYOUTS: LayoutMeta[] = [
  { id: "classic", label: "经典", defaultScheme: "ink" },
  { id: "calendar", label: "日历", defaultScheme: "ink" },
  { id: "mono", label: "墨白", defaultScheme: "ink" },
  { id: "note", label: "手札", defaultScheme: "ink" },
  { id: "jinshu", label: "锦书", defaultScheme: "ink" },
];

// 有头像槽的版式(经典/手札)；其余版式无头像位。供 styleAtom 铺显隐初值、Dock 决定是否露「头像」专属设置
export const AVATAR_LAYOUTS: LayoutId[] = ["classic", "note"];

// 有二维码槽的版式(经典/日历)；锦书/墨白/手札结构上无二维码位。供 Dock 决定是否露「二维码」专属设置
export const QR_LAYOUTS: LayoutId[] = ["classic", "calendar"];

// 有昵称展示位的版式(除日历外皆有：经典/手札走 .hdr .who .name，墨白同走 .hdr 仅无头像，
// 锦书走页脚 .credit)。日历表头是纯日期数字，无昵称落点。供 Dock 决定是否露「昵称」专属设置
export const NAME_LAYOUTS: LayoutId[] = ["classic", "mono", "note", "jinshu"];

// 有章节展示位的版式(除日历外皆有，经典/手札/锦书/墨白 .src .chapter 结构上均可见)。日历的 .src
// 只留《书名》，永久隐藏 chapter，与 NAME_LAYOUTS 当前同值纯属巧合(语义各异，故不复用同一常量)。
// 供 Dock 决定是否在「书名」旁露出「章节」子开关
export const CHAPTER_LAYOUTS: LayoutId[] = ["classic", "mono", "note", "jinshu"];

export interface FontMeta {
  id: FontId;
  /** 展示名，直接对应真实系统字体名(非营销名)，Dock 字体下拉与预览都读它 */
  label: string;
  /** 紧凑触发器短名；只用于已选值，完整下拉选项仍显示 label，避免同排粗细控件挤出省略号 */
  compactLabel: string;
  /** 写入 root 的 --card-font 的值；映射到 tokens.css 里该字体的 fallback 栈 */
  cssVar: string;
  /** state/useAvailableFonts 运行时探测用的真实 family 名；缺省=恒可用(San Francisco 只能靠
   *  -apple-system 关键字取用，无法按字面名探测，故不设 probe) */
  probe?: string;
}

// 十一档均为 macOS 系统预置字体，中文六档 + 西文五档；label 即系统字体真名，不再用"兰亭黑/思源宋/
// 今楷"这类营销名。可用性由 state/useAvailableFonts 在运行时逐个 probe，探测不到的档位不进选择器。
// 西文本应有六档，但 New York 实测和 San Francisco 一样受 WebKit 限制、无法按字面名寻址(探测三种
// 通用族全部同宽，等同未安装)——且它没有 -apple-system 那样的关键字替代通路，选了也渲染不出，
// 属于死档位，故未登记(而非登记后指望探测把它藏起来)。
export const FONTS: FontMeta[] = [
  { id: "pingfang", label: "苹方 PingFang SC", compactLabel: "苹方", cssVar: "var(--font-pingfang)", probe: "PingFang SC" },
  { id: "songti", label: "宋体 Songti SC", compactLabel: "宋体", cssVar: "var(--font-songti)", probe: "Songti SC" },
  { id: "heiti", label: "黑体 Heiti SC", compactLabel: "黑体", cssVar: "var(--font-heiti)", probe: "Heiti SC" },
  { id: "kaiti", label: "楷体 Kaiti SC", compactLabel: "楷体", cssVar: "var(--font-kaiti)", probe: "Kaiti SC" },
  { id: "fangsong", label: "仿宋 STFangsong", compactLabel: "仿宋", cssVar: "var(--font-fangsong)", probe: "STFangsong" },
  { id: "yuanti", label: "圆体 Yuanti SC", compactLabel: "圆体", cssVar: "var(--font-yuanti)", probe: "Yuanti SC" },
  { id: "sanfrancisco", label: "San Francisco", compactLabel: "SF", cssVar: "var(--font-sanfrancisco)" },
  { id: "helveticaneue", label: "Helvetica Neue", compactLabel: "Helvetica", cssVar: "var(--font-helveticaneue)", probe: "Helvetica Neue" },
  { id: "timesnewroman", label: "Times New Roman", compactLabel: "Times", cssVar: "var(--font-timesnewroman)", probe: "Times New Roman" },
  { id: "georgia", label: "Georgia", compactLabel: "Georgia", cssVar: "var(--font-georgia)", probe: "Georgia" },
  { id: "avenirnext", label: "Avenir Next", compactLabel: "Avenir", cssVar: "var(--font-avenirnext)", probe: "Avenir Next" },
];
