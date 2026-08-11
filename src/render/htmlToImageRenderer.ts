/**
 * [INPUT]: html-to-image 的 toBlob；本模块的 Renderer 接口
 * [OUTPUT]: htmlToImageRenderer（Renderer 的默认实现）
 * [POS]: 渲染核心的当前实现。DOM → SVG(foreignObject) → PNG。
 *        三处规避 WebKit/CJK 已知坑：等 document.fonts.ready、首帧预热一次、
 *        用 data-no-export 过滤掉拖拽手柄等不应入图的元素。
 * [SYNC]: 变更截图策略时同步 render/CLAUDE.md 的保真边界与 exportImage 预期。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { toBlob } from "html-to-image";
import type { Renderer } from "./Renderer";

// 首帧偶发丢字体/图片：全局只需预热一次（字体加载是一次性的）
let warmed = false;

async function ensureFontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts?.ready) {
    try {
      await fonts.ready;
    } catch {
      /* 忽略字体就绪异常，继续尝试截图 */
    }
  }
}

// 排除拖拽手柄等标了 data-no-export 的装饰元素
function keepInExport(el: HTMLElement): boolean {
  return !(el instanceof HTMLElement && el.hasAttribute("data-no-export"));
}

export const htmlToImageRenderer: Renderer = {
  async toPngBlob(node, options) {
    await ensureFontsReady();

    const opts = {
      pixelRatio: options.pixelRatio,
      backgroundColor: options.backgroundColor,
      cacheBust: true,
      filter: keepInExport,
    };

    if (!warmed) {
      // 丢弃首帧结果，仅用于让 WebKit 完成字体/图片的首次布局
      await toBlob(node, opts);
      warmed = true;
    }

    const blob = await toBlob(node, opts);
    if (!blob) throw new Error("导出失败：渲染结果为空");
    return blob;
  },
};
