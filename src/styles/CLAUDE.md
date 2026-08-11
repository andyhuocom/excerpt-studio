# styles/
> L2 | 父级: ../CLAUDE.md

设计系统(bespoke tokens，非 shadcn oklch)。主题思路：温润文学卡片悬浮在冷调磨砂暗房，强调色手稿琥珀，只留给主操作与选中态。

成员清单
tokens.css: 令牌层，单一事实来源。暗房颜色/形状/十一档字体变量，以及运行时 --bg/--card-w/--card-font/--quote-max/--quote-weight/--quote-weight-emphasis 与卡片配色令牌兜底默认。
studio.css: 布局与组件实现。五版式结构、配色/背景令牌消费、直角背景与 bare 卡片、右侧控制栏。字体行用 `.font-ctl` 将下拉和正文粗细三档并排；`.quote` 消费基础字重，日历消费强化一级令牌，`.quote strong` 固定 800 保持语义强调。正文 Markdown 的隐藏定界符零占位，下划线/高亮/行内代码均遵守 html-to-image 导出安全约束。

法则: 成员完整·一行一文件·父级链接·技术词前置
同步约束: 改配色或版式时同步 components 与 themes 注册表。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
