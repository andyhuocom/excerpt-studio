/**
 * [INPUT]: themes 的 FONTS/FontMeta；浏览器 canvas 2d context
 * [OUTPUT]: useAvailableFonts() → 运行时确认可用的 FontMeta[]
 * [POS]: 字体可用性探测(单一事实来源)。FONTS 是静态登记表(11 档 macOS 系统字体)，
 *        本 hook 在其上叠一层运行时校验：档位登了不代表当前系统真的装了，探测不到的档位
 *        从结果里剔除，FontSelect 只渲染这份过滤后的列表。
 *        **踩坑记录**：最初用 `document.fonts.check()` 探测，实测对系统本地字体(非 @font-face
 *        声明)不可靠——传一个完全不存在的字体名它也返回 true，因为规范上它只校验"声明过的
 *        FontFace 是否加载完成"，本地字体匹配失败时浏览器静默回退到通用族，check() 察觉不到。
 *        改用经典的 canvas measureText 宽度对比法：同一段拉丁探针文本，分别用"目标字体,通用族"
 *        与纯通用族两种 font-family 渲染并测宽，若两者宽度不同即说明目标字体真的参与了渲染
 *        (换了字体度量)；若完全相同则说明浏览器静默跳过目标字体直落通用族，视为未安装。
 *        对三种形态迥异的通用族(monospace/sans-serif/serif)都测一遍，只要有一个测出差异就
 *        判定可用——避免目标字体恰好与某一个通用族同宽的小概率误判。探针文本只用拉丁字符/数字，
 *        不夹中文：CJK 通用族在 macOS 上本就默认落到苹方，若探针含中文，测"苹方,sans-serif"会
 *        跟纯"sans-serif"基线撞出同宽，反而把最常见的苹方误判为未安装。
 * [SYNC]: 新增字体档位或改探测策略时同步 themes.ts 的 FontMeta 契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useMemo } from "react";
import { FONTS, type FontMeta } from "@/themes/themes";

const BASELINE_FAMILIES = ["monospace", "sans-serif", "serif"] as const;
const PROBE_TEXT = "AVAWi1lI0O modernizing 0123456789";
const PROBE_SIZE = 100;

let probeCtx: CanvasRenderingContext2D | null | undefined;

function getProbeCtx(): CanvasRenderingContext2D | null {
  if (probeCtx === undefined) {
    probeCtx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  }
  return probeCtx;
}

function measure(ctx: CanvasRenderingContext2D, fontFamily: string): number {
  ctx.font = `${PROBE_SIZE}px ${fontFamily}`;
  return ctx.measureText(PROBE_TEXT).width;
}

function isProbeAvailable(probe: string): boolean {
  const ctx = getProbeCtx();
  if (!ctx) return true; // 无 canvas 环境(理论上不会发生)：探测不了，不惩罚该档位
  try {
    return BASELINE_FAMILIES.some((base) => measure(ctx, `"${probe}", ${base}`) !== measure(ctx, base));
  } catch {
    return true;
  }
}

export function useAvailableFonts(): FontMeta[] {
  return useMemo(() => FONTS.filter((f) => f.probe === undefined || isProbeAvailable(f.probe)), []);
}
