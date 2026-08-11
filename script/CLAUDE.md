# script/
> L2 | 父级: /CLAUDE.md

macOS 发布链路的唯一入口。Tauri 负责构建 app 中间产物，本模块负责稳定身份签名、严格复检并将同一份已签名 App 封装为 DMG，避免构建工具在 DMG 阶段重新签名造成身份漂移。

成员清单
generate_icons_macos.sh: 用 icon-assets.sha256 检查母版与全部派生字节；一致时零写入，漂移时从 app-icon-master.png 全量刷新 Tauri PNG、验收切片与 ICNS。
package_macos.sh: 预检并拒绝覆盖已挂载镜像，刷新图标后执行 release app 构建并将 designated requirement 钉到固定 identifier；临时镜像经验证和同文件系统候选复制后，在拒绝符号链接目标的边界内原子晋升，再清理非目标旧文件。
test_package_macos.sh: 校验 bundle 物理路径未被符号链接替换且 DMG 目录只有一个非符号链接普通镜像，阻止越界写入及旧 Tauri 辅助文件伪装成本次产物。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
