#!/usr/bin/env bash
# [INPUT]: 依赖 generate_icons_macos.sh 从唯一母版刷新图标，依赖 Tauri CLI 与 tauri.conf.json 生成 app，依赖 macOS codesign/hdiutil 完成签名和镜像封装
# [OUTPUT]: 对外提供 npm run tauri:build 的唯一 macOS 打包链路，安全晋升新 DMG 后产出稳定 designated requirement 的 .app 与压缩镜像
# [POS]: script 模块的发布编排器，隔离 Tauri 裸 ad-hoc 中间签名与最终可重复身份；拒绝已挂载镜像和符号链接目标，并以同文件系统原子晋升避免失败构建破坏既有安装包
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
TAURI_CONFIG="$PROJECT_ROOT/src-tauri/tauri.conf.json"
TAURI_CLI="$PROJECT_ROOT/node_modules/.bin/tauri"
BUNDLE_ROOT="$PROJECT_ROOT/src-tauri/target/release/bundle"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "错误：macOS 打包脚本只能在 Darwin 上运行。" >&2
  exit 1
fi

for command_name in codesign hdiutil plutil; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "错误：缺少系统命令 $command_name。" >&2
    exit 1
  fi
done

if [[ ! -x "$TAURI_CLI" ]]; then
  echo "错误：找不到 Tauri CLI，请先运行 npm install。" >&2
  exit 1
fi

PRODUCT_NAME="$(plutil -extract productName raw "$TAURI_CONFIG")"
VERSION="$(plutil -extract version raw "$TAURI_CONFIG")"
BUNDLE_ID="$(plutil -extract identifier raw "$TAURI_CONFIG")"

case "$(uname -m)" in
  arm64) BUNDLE_ARCH="aarch64" ;;
  x86_64) BUNDLE_ARCH="x64" ;;
  *)
    echo "错误：不支持的 macOS 架构 $(uname -m)。" >&2
    exit 1
    ;;
esac

DMG_FILENAME="${PRODUCT_NAME}_${VERSION}_${BUNDLE_ARCH}.dmg"
EXPECTED_DMG_PATH="$BUNDLE_ROOT/dmg/$DMG_FILENAME"

is_disk_image_attached() {
  local target_path="$1"
  local info_line
  local image_path

  while IFS= read -r info_line; do
    if [[ "$info_line" == image-path* ]]; then
      image_path="${info_line#*: }"
      if [[ "$image_path" == "$target_path" ]]; then
        return 0
      fi
    fi
  done < <(hdiutil info)

  return 1
}

if is_disk_image_attached "$EXPECTED_DMG_PATH"; then
  echo "错误：旧 DMG 仍处于挂载状态，请先推出 $PRODUCT_NAME 后重试：$EXPECTED_DMG_PATH" >&2
  exit 1
fi

echo "==> 构建 Tauri release app"
"$SCRIPT_DIR/generate_icons_macos.sh"
"$TAURI_CLI" build --bundles app

PHYSICAL_BUNDLE_ROOT="$(cd "$BUNDLE_ROOT" && pwd -P)"
if [[ "$PHYSICAL_BUNDLE_ROOT" != "$BUNDLE_ROOT" ]]; then
  echo "错误：bundle 输出目录经过符号链接越出预期物理路径：$PHYSICAL_BUNDLE_ROOT" >&2
  exit 1
fi

APP_PATH="$PHYSICAL_BUNDLE_ROOT/macos/$PRODUCT_NAME.app"
DMG_DIR="$PHYSICAL_BUNDLE_ROOT/dmg"
DMG_PATH="$DMG_DIR/$DMG_FILENAME"
CANDIDATE_DMG_PATH="$PHYSICAL_BUNDLE_ROOT/.$DMG_FILENAME.pending"

if [[ "$DMG_PATH" != "$EXPECTED_DMG_PATH" ]]; then
  echo "错误：DMG 物理输出路径偏离预期：$DMG_PATH" >&2
  exit 1
fi

ACTUAL_BUNDLE_ID="$(plutil -extract CFBundleIdentifier raw "$APP_PATH/Contents/Info.plist")"
if [[ "$ACTUAL_BUNDLE_ID" != "$BUNDLE_ID" ]]; then
  echo "错误：App bundle id ($ACTUAL_BUNDLE_ID) 与配置 ($BUNDLE_ID) 不一致。" >&2
  exit 1
fi

echo "==> 固定 designated requirement: $BUNDLE_ID"
codesign \
  --force \
  --sign - \
  --identifier "$BUNDLE_ID" \
  --requirements "=designated => identifier \"$BUNDLE_ID\"" \
  "$APP_PATH"

codesign --verify --deep --strict "$APP_PATH"
DR_OUTPUT="$(codesign -dr - "$APP_PATH" 2>&1)"
EXPECTED_DR="designated => identifier \"$BUNDLE_ID\""
if [[ "$DR_OUTPUT" != *"$EXPECTED_DR"* || "$DR_OUTPUT" == *"cdhash"* ]]; then
  echo "错误：designated requirement 未稳定绑定 bundle id：$DR_OUTPUT" >&2
  exit 1
fi

STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/excerpt-studio-dmg.XXXXXX")"
TEMP_DMG_PATH="${STAGING_DIR}.dmg"
cleanup() {
  if [[ -n "${STAGING_DIR:-}" && -d "$STAGING_DIR" ]]; then
    rm -rf "$STAGING_DIR"
  fi
  if [[ -n "${TEMP_DMG_PATH:-}" && -f "$TEMP_DMG_PATH" ]]; then
    rm -f "$TEMP_DMG_PATH"
  fi
  if [[ -n "${CANDIDATE_DMG_PATH:-}" && -f "$CANDIDATE_DMG_PATH" ]]; then
    rm -f "$CANDIDATE_DMG_PATH"
  fi
}
trap cleanup EXIT

EXPECTED_DMG_DIR="$PHYSICAL_BUNDLE_ROOT/dmg"
if [[ "$DMG_DIR" != "$EXPECTED_DMG_DIR" ]]; then
  echo "错误：拒绝清理非预期 DMG 目录：$DMG_DIR" >&2
  exit 1
fi

echo "==> 封装 DMG"
/usr/bin/ditto "$APP_PATH" "$STAGING_DIR/$PRODUCT_NAME.app"
ln -s /Applications "$STAGING_DIR/Applications"
hdiutil create \
  -volname "$PRODUCT_NAME" \
  -srcfolder "$STAGING_DIR" \
  -format UDZO \
  -ov \
  "$TEMP_DMG_PATH"
hdiutil verify "$TEMP_DMG_PATH"

if [[ -L "$DMG_DIR" ]]; then
  echo "错误：拒绝向符号链接 DMG 目录发布：$DMG_DIR" >&2
  exit 1
fi

echo "==> 原子晋升 DMG"
mkdir -p "$DMG_DIR"
rm -f "$CANDIDATE_DMG_PATH"
/usr/bin/ditto "$TEMP_DMG_PATH" "$CANDIDATE_DMG_PATH"
hdiutil verify "$CANDIDATE_DMG_PATH"

if [[ -L "$DMG_PATH" || ( -e "$DMG_PATH" && ! -f "$DMG_PATH" ) ]]; then
  echo "错误：拒绝替换符号链接或非普通文件 DMG 目标：$DMG_PATH" >&2
  exit 1
fi

mv -f "$CANDIDATE_DMG_PATH" "$DMG_PATH"

if [[ -L "$DMG_PATH" || ! -f "$DMG_PATH" ]]; then
  echo "错误：原子晋升后未得到可信普通文件：$DMG_PATH" >&2
  exit 1
fi
hdiutil verify "$DMG_PATH"

shopt -s nullglob dotglob
for output_entry in "$DMG_DIR"/*; do
  if [[ "$output_entry" != "$DMG_PATH" ]]; then
    rm -rf -- "$output_entry"
  fi
done
shopt -u nullglob dotglob

"$SCRIPT_DIR/test_package_macos.sh"

echo "==> 打包完成"
echo "App: $APP_PATH"
echo "DMG: $DMG_PATH"
echo "$DR_OUTPUT"
