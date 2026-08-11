# components/controls/
> L2 | 父级: ../CLAUDE.md

通用无状态控件。视觉全在 styles/studio.css，组件只管行为与 aria。

成员清单
Editable.tsx: 光标安全的纯文本就地编辑底座。挂载写初值；外部值变更且元素未聚焦时才回写，打字(聚焦)时绝不回写，故同一字段跨主题的重复绑定能同步而不跳光标。IME 组字期间(compositionstart~compositionend)不把中间态经 onChange 外传，只在组字结束报一次最终文本，避免拼音候选这类半成品触发受控重渲染。
MarkdownQuote.tsx: 正文专属的单 DOM markdown 编辑器；同一个 contentEditable 同时承载真实 <strong>/<em>/<u>/<s>/<mark>/<code> 样式和浏览器光标，从结构上消除可见层/透明输入层的字形 metric 漂移。React 只持有空编辑根，内部格式 DOM 由 layout effect 原子重建，避免浏览器输入与 React children 协调重复。contentAtom.content 仍保存含定界符的源码；定界符默认 hidden 零占位，光标进入片段才显示并统一 data-no-export。输入重解析前把 DOM 选区映射为源码 UTF-16 偏移、提交后恢复，IME 组字期间延迟到 compositionend；格式重建会清空原生撤销栈，因此组件保存源码与选区快照并接管撤销/重做快捷键；非 code 内容递归解析以支持嵌套组合。
MarkdownQuote.test.mjs: MarkdownQuote 的结构、导出样式与编辑历史回归保护；用 Node 内建测试加载真实解析/历史函数，并联合检查组件源码与 CSS 契约，验证单一 contentEditable、hidden 标记零占位、光标进入片段后标记可见、高亮与行内代码均不依赖导出不可靠的投影且不以横向 padding 切断嵌套下划线，以及 DOM 重建后的撤销/重做。
Segmented.tsx: 泛型分段选择器(版式/字号/倍率/留白共用)。
Switch.tsx: iOS 风开关(有背景/二维码/各项内容显隐)，支持 disabled 表达级联关系(如章节开关随书名开关联动置灰)。
SchemeSwatches.tsx: 配色选择器，12 预设色块(底色+中心 ink 点)+自定义底色，绑当前版式。选中吐配色串(scheme id 或 "#hex")。
DropdownSelect.tsx: 泛型搜索下拉底座，从 ThemeSelect 抽出的通用壳(开合/外点收起/Esc/打开时测量触发器上下空间择大侧弹出并动态收缩列表/搜索过滤)；"选项长什么样"交调用方 renderTrigger/renderOption，样式在 studio.css 的 .dd-*。ThemeSelect/FontSelect 共用它。
ThemeSelect.tsx: 图片背景选择器，基于 DropdownSelect；选项画色点(主题渐变)+名，色点是本组件专属的 .theme-dot 装饰。选中吐主题 id 写 --bg。
FontSelect.tsx: 字体选择器，基于 DropdownSelect；fonts 由 Dock 传入(只含探测通过档位)，紧凑触发器用 compactLabel 保证与粗细三档同行不截断并以 title 暴露完整名，下拉选项保留 label；两处都用字体自身 font-family 渲染。
AvatarUpload.tsx: 卡片头像位，点击选图 → useAvatarLibrary.upload(缩放入库并设为当前)，显示当前头像随卡片入图；库(历史/选择/持久化)在 state/useAvatarLibrary。
QrCode.tsx: 右下角真实二维码；用 qrcode 异步生成透明底 SVG，value 变化时重绘，静默区和主题底衬由 studio.css 提供。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
