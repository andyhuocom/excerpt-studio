/**
 * [INPUT]: render/Renderer + htmlToImageRenderer；services/desktopBridge 的 savePng/SaveResult
 * [OUTPUT]: exportExcerpt(req, renderer?)，ExportRequest
 * [POS]: 导出编排层。把「节点 + 倍率」交给注入的 Renderer 得 PNG Blob，再交 desktopBridge 落盘。
 *        默认注入 htmlToImageRenderer，但只依赖抽象 Renderer(DIP)。上层 TopBar 只调此函数。
 * [SYNC]: 变更导出契约时同步 App/TopBar 调用与 desktopBridge 落盘边界。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { Renderer } from "./Renderer";
import { htmlToImageRenderer } from "./htmlToImageRenderer";
import { savePng, type SaveResult } from "@/services/desktopBridge";

export interface ExportRequest {
  /** 被截取的 DOM 节点：有背景截 .frame，无背景截 .card */
  node: HTMLElement;
  /** 导出倍率 */
  scale: number;
  /** 文件名主体（通常取书名），扩展名由本层补 .png */
  fileBaseName: string;
}

// 清洗成安全文件名：去掉路径非法字符、压缩空白、限长
function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[/\\:*?"<>|\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return cleaned || "书摘";
}

// 只渲染、不落盘：供复制到剪贴板等场景复用同一条渲染路径
export async function renderExcerpt(
  req: ExportRequest,
  renderer: Renderer = htmlToImageRenderer,
): Promise<Blob> {
  return renderer.toPngBlob(req.node, { pixelRatio: req.scale });
}

export async function exportExcerpt(
  req: ExportRequest,
  renderer: Renderer = htmlToImageRenderer,
): Promise<SaveResult> {
  try {
    const blob = await renderExcerpt(req, renderer);
    return await savePng(blob, `${sanitizeFileName(req.fileBaseName)}.png`);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
