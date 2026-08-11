# src/
> L2 | 父级: /CLAUDE.md

React 前端边界。根文件只负责启动与跨模块装配；业务状态、展示、渲染、主题、样式和原生桥分别下沉到独立子模块，避免入口层吸收领域逻辑。

成员清单
App.tsx: 应用装配与副作用中枢；连接 jotai 状态、主题令牌、UI 组件和导出服务，写入卡片字体/字号/基础字重与日历强化字重等运行时 CSS 变量，持有导出节点与右侧栏开合状态。
main.tsx: 浏览器启动入口；挂载 React 严格模式并把 App 接入根节点，不承载业务逻辑。
index.css: 全局样式组合入口；按 Tailwind → tokens → studio 的依赖顺序建立级联。
components/ - 展示与交互组件，包含 controls 无状态控件子目录。
render/ - Renderer 抽象、html-to-image 实现与导出编排。
services/ - 前端与 Tauri 原生命令之间的唯一桥接层。
state/ - jotai 状态与持久化策略的单一事实来源。
styles/ - 设计令牌和工作室/卡片布局实现。
themes/ - 版式、配色与图片背景的纯数据注册表。

法则: 入口只装配·依赖指向子模块·一行一成员·父级链接稳定
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
