# components/
> L2 | 父级: ../CLAUDE.md

展示与交互层。组件只表达界面状态和用户意图；导出编排留在上层 App，落盘能力留在 services。

成员清单
TopBar.tsx: 极简顶栏 + 「导出图片」分裂按钮(主=保存对话框, 下拉=复制剪贴板)，只发 onExport/onCopy 意图。
Stage.tsx: 居中舞台。承载 data-layout(驱动版式选择器)、八个 data-hide-*(avatar/name/date/title/chapter/author/brand/qr，直接消费跨版式共享显隐，当前版式只呈现结构支持项)、直角渐变底板 .frame、两侧拖拽调宽手柄(标 data-no-export 不入图)、卡片。showFrame=false 时追加 bare，关闭背景与留白并去掉卡片圆角；有背景时卡片保留自身圆角。data-hide-chapter 折入书名开关：书名关闭时无条件为真，不看章节自身状态。.frame 外层叠 .width-hud：拖拽中显示实时像素徽标(ref 直写 textContent，与 --card-w 同一条命令式路径)，松手后若宽度≠DEFAULT_CARD_WIDTH 换成「恢复默认宽度」按钮，二者皆标 data-no-export。
Dock.tsx: 右侧磨砂设置栏。顶层全局项纵向堆叠：版式/配色/字体与正文粗细同行(FontSelect 只列探测通过的档位，粗细为标准400/适中500/偏粗600)/字号16|18|20|22/背景/留白/倍率；左缘竖拉手开合。面板底是可折叠「版式专属设置」：头像/昵称/日期/书名(+章节)/作者/平台/二维码，内容值与显隐开关均跨版式共享，只在结构支持的版式露出对应项；章节随书名级联。
ExcerptCard.tsx: 被导出的实体本身。单一 DOM 承载五版式，结构差异由 studio.css 的 [data-layout] 显隐重排、颜色吃配色令牌 --c-*；全版式日期同源于全局共享 shareDate(未设跟随今天，卡上纯展示、只在 Dock 专属设置改)，头像取自 useAvatarLibrary，昵称/书名/章节/作者/平台/二维码值仍就地编辑写 contentAtom，显隐由 Stage 的跨版式共享 data-hide-* 驱动并与结构选择器正交。正文字号不再自适应，由 Dock「字号」全局直选(styleAtom.quoteFontSize)，App 写入 --quote-max；正文由 controls/MarkdownQuote 在单一 contentEditable 中同步呈现与编辑粗体、斜体、下划线、删除线、高亮和行内代码，光标进入样式片段时露出原始定界符。
controls/ - 通用无状态控件子目录

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
