# .github/
> L2 | 父级: /CLAUDE.md

GitHub Actions CI 入口。macOS 与 Windows 各自在原生 runner 上出包（Tauri 是原生编译，无法交叉编译），互不复用对方的打包路径；两条产物汇总后统一挂到同一个 GitHub Release。

成员清单
workflows/release.yml: 推 `v*` 标签或手动触发。macOS job 直接跑 `npm run tauri:build`(script/package_macos.sh)，保留稳定签名与 DMG 封装；Windows job 跑 `npx tauri build`，靠 src-tauri/tauri.windows.conf.json 把 bundle.targets 覆盖成 nsis+msi。两个 job 产物各自 upload-artifact，第三个 release job 下载汇总后用 softprops/action-gh-release 建 draft release。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
