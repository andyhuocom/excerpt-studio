# src-tauri/
> L2 | 父级: /CLAUDE.md

Tauri 2 原生外壳。前端 100% 客户端，Rust 只做 Web 拿不到的事：原生保存对话框写盘、系统文件管理器定位。macOS 侧 Tauri 先以 signingIdentity "-" 产出 app 中间态，顶层 script/package_macos.sh 再把 designated requirement 钉到固定 bundle id 后封装 DMG；Windows 侧 tauri.windows.conf.json 覆盖 bundle.targets 为 nsis/msi，走 CI 里的 `tauri build` 直出安装包，无需等价签名脚本。assetProtocol 限 $HOME(Tauri 跨平台解析，Windows 落在 %USERPROFILE%)。骨架照搬 squoosh-batch-app，但精简掉其 CLI 安装逻辑。

成员清单
src/main.rs: 入口 + 两命令 save_png(rfd 保存对话框 + 写 PNG 字节, 取消返回 None)/reveal_path(按 cfg(target_os) 三分支：macOS `open -R`、Windows `explorer /select,`、其余 `xdg-open` 定位父目录)。
Cargo.toml: tauri 2.11.2 + rfd 0.15；release profile 极致瘦身(lto/opt-z/strip)。
Cargo.lock: Cargo 解析后的依赖锁，保障 Rust/Tauri 构建可复现；由 Cargo 维护，不手工编辑。
build.rs: tauri_build 构建脚本。
tauri.conf.json: 窗口默认 1280×1000、最小 1080×820(可调)、基础 bundle.targets 只含 app(macOS 中间产物)、ad-hoc 签名、devUrl 5173；最终签名与 DMG 由顶层打包脚本负责。
tauri.windows.conf.json: Windows 平台覆盖配置，仅重写 bundle.targets 为 ["nsis","msi"]（基础配置的 "app" 目标是 macOS 专属，Windows 必须覆盖才能出包）；构建时 Tauri 自动与 tauri.conf.json 合并。
capabilities/default.json: 主窗口权限 core:default；自定义命令属应用本地命令无需登记。
icons/ - 已定稿的 1024px 图标母版、跨平台 Tauri 打包资产(icns/ico/png)与人工验收切片；详见 icons/CLAUDE.md。
gen/ - Tauri CLI 生成的 schema，仅供工具消费且由 .gitignore 排除。
target/ - Cargo 构建缓存与应用安装包，仅由构建命令生成且由 .gitignore 排除。

法则: 成员完整·一行一文件·父级链接·技术词前置
同步约束: 增删命令时同步 generate_handler!、前端 bridge 与 capabilities。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
