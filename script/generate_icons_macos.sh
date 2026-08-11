#!/usr/bin/env bash
# [INPUT]: 依赖 src-tauri/icons/app-icon-master.png 的 1024px sRGB RGBA 母版，依赖 Tauri CLI 与 macOS sips 编码派生资产
# [OUTPUT]: 对外维护 tauri.conf.json 消费的 PNG/ICNS、AppIcon.iconset 验收切片与 icon-assets.sha256 新鲜度清单
# [POS]: script 模块的图标单一事实源执行器；清单一致时零写入，任一资产漂移时从母版全量再生
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
ICON_DIR="$PROJECT_ROOT/src-tauri/icons"
MASTER_ICON="$ICON_DIR/app-icon-master.png"
TAURI_CLI="$PROJECT_ROOT/node_modules/.bin/tauri"
ASSET_MANIFEST="$ICON_DIR/icon-assets.sha256"
ASSET_PATHS=(
  "app-icon-master.png"
  "icon.png"
  "icon.icns"
  "icon.ico"
  "32x32.png"
  "128x128.png"
  "128x128@2x.png"
  "AppIcon.iconset/icon_16x16.png"
  "AppIcon.iconset/icon_16x16@2x.png"
  "AppIcon.iconset/icon_32x32.png"
  "AppIcon.iconset/icon_32x32@2x.png"
  "AppIcon.iconset/icon_128x128.png"
  "AppIcon.iconset/icon_128x128@2x.png"
  "AppIcon.iconset/icon_256x256.png"
  "AppIcon.iconset/icon_256x256@2x.png"
  "AppIcon.iconset/icon_512x512.png"
  "AppIcon.iconset/icon_512x512@2x.png"
)

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "错误：macOS 图标生成脚本只能在 Darwin 上运行。" >&2
  exit 1
fi

if [[ ! -f "$MASTER_ICON" ]]; then
  echo "错误：找不到图标母版：$MASTER_ICON" >&2
  exit 1
fi

if [[ ! -x "$TAURI_CLI" ]]; then
  echo "错误：找不到 Tauri CLI，请先运行 npm install。" >&2
  exit 1
fi

for command_name in cmp shasum sips; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "错误：缺少系统命令 $command_name。" >&2
    exit 1
  fi
done

assets_match_manifest() {
  [[ -f "$ASSET_MANIFEST" ]] || return 1
  (
    cd "$ICON_DIR"
    shasum -a 256 "${ASSET_PATHS[@]}"
  ) | cmp -s - "$ASSET_MANIFEST"
}

if assets_match_manifest; then
  echo "==> 图标派生资产已与母版同步"
  exit 0
fi

TEMP_ICON_DIR="$(mktemp -d "${TMPDIR:-/tmp}/excerpt-studio-icons.XXXXXX")"
cleanup() {
  if [[ -n "${TEMP_ICON_DIR:-}" && -d "$TEMP_ICON_DIR" ]]; then
    rm -rf "$TEMP_ICON_DIR"
  fi
}
trap cleanup EXIT

echo "==> 从 1024px 母版刷新应用图标"
"$TAURI_CLI" icon "$MASTER_ICON" --output "$TEMP_ICON_DIR"
cp "$TEMP_ICON_DIR/icon.icns" "$ICON_DIR/icon.icns"
cp "$TEMP_ICON_DIR/icon.ico" "$ICON_DIR/icon.ico"
cp "$MASTER_ICON" "$ICON_DIR/icon.png"

resize_icon() {
  local size="$1"
  local output="$2"
  sips -z "$size" "$size" "$MASTER_ICON" --out "$output" >/dev/null
}

resize_icon 32 "$ICON_DIR/32x32.png"
resize_icon 128 "$ICON_DIR/128x128.png"
resize_icon 256 "$ICON_DIR/128x128@2x.png"

resize_icon 16 "$ICON_DIR/AppIcon.iconset/icon_16x16.png"
resize_icon 32 "$ICON_DIR/AppIcon.iconset/icon_16x16@2x.png"
resize_icon 32 "$ICON_DIR/AppIcon.iconset/icon_32x32.png"
resize_icon 64 "$ICON_DIR/AppIcon.iconset/icon_32x32@2x.png"
resize_icon 128 "$ICON_DIR/AppIcon.iconset/icon_128x128.png"
resize_icon 256 "$ICON_DIR/AppIcon.iconset/icon_128x128@2x.png"
resize_icon 256 "$ICON_DIR/AppIcon.iconset/icon_256x256.png"
resize_icon 512 "$ICON_DIR/AppIcon.iconset/icon_256x256@2x.png"
resize_icon 512 "$ICON_DIR/AppIcon.iconset/icon_512x512.png"
resize_icon 1024 "$ICON_DIR/AppIcon.iconset/icon_512x512@2x.png"

(
  cd "$ICON_DIR"
  shasum -a 256 "${ASSET_PATHS[@]}"
) > "$TEMP_ICON_DIR/icon-assets.sha256"
cp "$TEMP_ICON_DIR/icon-assets.sha256" "$ASSET_MANIFEST"
