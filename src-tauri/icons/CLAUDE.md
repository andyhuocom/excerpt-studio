# icons/
> L2 | 父级: /src-tauri/CLAUDE.md

跨平台应用图标资产，在 macOS 上由 script/generate_icons_macos.sh 从母版统一派生。app-icon-master.png 是唯一生产母版，脚本每次打包前通过 icon-assets.sha256 检查新鲜度，仅在漂移时刷新 icon.icns/icon.ico 与多尺寸 PNG；AppIcon.iconset 用于人工检查，不作为 ICNS 编码入口。

成员清单
app-icon-master.png: 已定稿的 1024×1024 sRGB RGBA 生产母版；深靛蓝胶囊、暖象牙书页与朱橙双引号在 16px 和明暗 Dock 下保持可辨。
icon.png: 由 generate_icons_macos.sh 从生产母版派生的 Tauri 通用 1024×1024 PNG 图标输入。
icon.icns: 由 generate_icons_macos.sh 调用 Tauri 图标编码器生成、macOS bundle 实际消费的多分辨率图标容器。
icon.ico: 由 generate_icons_macos.sh 调用 Tauri 图标编码器生成、Windows nsis/msi bundle 实际消费的多分辨率图标容器。
icon-assets.sha256: 母版与全部派生图标的字节清单，保证无变更构建零写入、手工篡改能被打包前再生纠正。
32x32.png: Tauri 小尺寸 PNG 打包资产。
128x128.png: Tauri 标准尺寸 PNG 打包资产。
128x128@2x.png: Tauri Retina PNG 打包资产。
AppIcon.iconset/: 由 generate_icons_macos.sh 从生产母版刷新的 macOS 分辨率切片，仅供人工抽查小尺寸辨识度。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
