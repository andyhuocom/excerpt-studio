/**
 * [INPUT]: 无
 * [OUTPUT]: Renderer 接口，RenderOptions
 * [POS]: 渲染核心的抽象边界（DIP）。上层 exportImage 只依赖此接口，不知道底层是
 *        html-to-image、Satori 还是 Canvas。当前实现见 htmlToImageRenderer.ts。
 *        这道缝是 Phase 0 的核心资产：WebKit 保真若掉链子，换实现而不动上层。
 * [SYNC]: 接口变更时同步所有 Renderer 实现与 exportImage 调用方。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface RenderOptions {
  /** 导出倍率，映射到清晰度（2 / 4 / 6 倍） */
  pixelRatio: number;
  /** 可选背景色；缺省透明，由被截节点自带背景决定 */
  backgroundColor?: string;
}

export interface Renderer {
  /** 将给定 DOM 节点按选项光栅化为 PNG Blob */
  toPngBlob(node: HTMLElement, options: RenderOptions): Promise<Blob>;
}
