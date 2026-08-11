@AGENTS.md

# 书摘 Excerpt Studio - 本地离线的微信读书风格书摘卡片生成器

Tauri 2 + React 19 + Vite 8 + Tailwind 4 + jotai + html-to-image

100% 客户端渲染，Rust 外壳只提供 Web 拿不到的两件事：原生保存对话框写盘、系统文件管理器定位。
核心链路「输入 → 卡片实时预览 → 导出高清 PNG」。渲染核心藏在 render/Renderer 接口后(DIP)——
当前实现 html-to-image，WebKit 保真若掉链子可无痛换 Canvas 而不动上层。
UI 借鉴 ray.so：居中画布 + 右侧磨砂设置栏(可收起) + 就地编辑。设计与技术决策见 ANALYSIS.md。

<directory>
src/ - React 前端与装配入口 (6 子目录: components/render/state/themes/styles/services)
src-tauri/ - Tauri 原生外壳 (4 子目录: src/capabilities/icons/gen)；save_png / reveal_path 两命令，跨平台(macOS/Windows/Linux)
script/ - macOS 可复现打包入口；稳定 ad-hoc 身份签名并封装 DMG
.github/ - GitHub Actions CI；按 tag 触发 macOS(DMG)/Windows(nsis+msi) 双平台构建并发布 Release
screenshots/ - README 引用的应用截图与版式样张，纯展示用图片资产，非运行时依赖
output/ - 本地导出结果，属于用户生成物并由 .gitignore 排除
</directory>

<config>
package.json - 依赖与脚本；test 串联正文编辑器、共享状态迁移、排版设置回归测试与前端构建，tauri:build 统一进入稳定签名的 macOS 打包链路
package-lock.json - npm 依赖解析锁，确保前端构建可复现
vite.config.ts - Vite + React + Tailwind，@ 别名，固定 5173 端口
tsconfig.json - TypeScript 工程引用入口，串联 app 与 node 两套配置
src-tauri/tauri.conf.json - 窗口/app 打包/中间态 ad-hoc 签名/assetProtocol $HOME
.claude/launch.json - Claude 本地开发启动配置，执行 npm run dev 并探测 5173 端口
ANALYSIS.md - 需求分析与技术决策(渲染核心/字体/设计语言)
AGENTS.md - 工作协议与 GEB 分形文档教义
README.md - 面向外部贡献者的项目说明：功能/构建/测试/许可证，引用 screenshots/ 下的应用截图与版式样张
LICENSE - MIT 许可证全文
</config>

法则: 极简·稳定·导航·版本精确
[PROTOCOL]: 顶级模块增删或技术栈变更时更新此文件
