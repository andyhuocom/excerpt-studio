# services/
> L2 | 父级: ../CLAUDE.md

前端与 Tauri Rust 命令之间唯一的桥。

成员清单
desktopBridge.ts: isDesktop 运行时探测；savePng(桌面态 invoke save_png 弹原生对话框写盘, 浏览器态降级 <a download>)；revealPath(Finder 定位)；downloadBlob。render/exportImage 只经此落盘，不直接 invoke。

法则: 成员完整·一行一文件·父级链接·技术词前置
同步约束: 新增原生能力时同步 src-tauri/src/main.rs 的命令注册。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
