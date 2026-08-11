#!/usr/bin/env bash
# [INPUT]: 依赖 package_macos.sh 已完成一次构建，读取 release/bundle/dmg 的顶层产物集合
# [OUTPUT]: 对外提供 macOS 包装回归检查；仅当物理输出路径可信、目录中恰有一个普通 DMG 文件且无陈旧辅助文件时成功
# [POS]: script 模块的生成物边界测试，拒绝目录与最终镜像的符号链接越界，并阻止旧 icon.icns、bundle_dmg.sh 或历史 DMG 干扰验收
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
BUNDLE_ROOT="$PROJECT_ROOT/src-tauri/target/release/bundle"

PHYSICAL_BUNDLE_ROOT="$(cd "$BUNDLE_ROOT" && pwd -P)"
if [[ "$PHYSICAL_BUNDLE_ROOT" != "$BUNDLE_ROOT" ]]; then
  echo "错误：bundle 输出目录经过符号链接越出预期物理路径：$PHYSICAL_BUNDLE_ROOT" >&2
  exit 1
fi

DMG_DIR="$PHYSICAL_BUNDLE_ROOT/dmg"

if [[ -L "$DMG_DIR" ]]; then
  echo "错误：拒绝验证符号链接 DMG 输出目录：$DMG_DIR" >&2
  exit 1
fi

if [[ ! -d "$DMG_DIR" ]]; then
  echo "错误：DMG 输出目录不存在，请先运行 npm run tauri:build。" >&2
  exit 1
fi

shopt -s nullglob dotglob
OUTPUT_ENTRIES=("$DMG_DIR"/*)
DMG_FILES=("$DMG_DIR"/*.dmg)

if [[ "${#DMG_FILES[@]}" -ne 1 ]]; then
  echo "错误：DMG 输出目录应恰有一个 .dmg，实际为 ${#DMG_FILES[@]} 个。" >&2
  exit 1
fi

if [[ -L "${DMG_FILES[0]}" || ! -f "${DMG_FILES[0]}" ]]; then
  echo "错误：最终 DMG 必须是输出目录内的普通文件，拒绝符号链接或其他类型：${DMG_FILES[0]}" >&2
  exit 1
fi

if [[ "${#OUTPUT_ENTRIES[@]}" -ne 1 ]]; then
  echo "错误：DMG 输出目录含陈旧辅助文件或历史安装包：" >&2
  printf '  %s\n' "${OUTPUT_ENTRIES[@]}" >&2
  exit 1
fi

echo "DMG 输出目录干净：${DMG_FILES[0]}"
