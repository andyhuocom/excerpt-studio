# render/
> L2 | 父级: ../CLAUDE.md

渲染核心与导出编排。DIP 边界：上层只依赖 Renderer 接口，底层实现可换。这道缝是 Phase 0 的核心资产。

成员清单
Renderer.ts: 抽象边界。toPngBlob(node, {pixelRatio}) 契约；DOM→PNG，实现无关。
htmlToImageRenderer.ts: 当前实现。DOM→SVG(foreignObject)→PNG。三处规避 WebKit/CJK 坑：等 document.fonts.ready、首帧全局预热一次、data-no-export 过滤拖拽手柄。
exportImage.ts: 编排。renderExcerpt(只渲染, 供复制复用)/exportExcerpt(渲染+落盘)；默认注入 htmlToImageRenderer，文件名取书名清洗后。

法则: 成员完整·一行一文件·父级链接·技术词前置
同步约束: 变更截图策略或导出契约时同步 Renderer、默认实现与调用方。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
