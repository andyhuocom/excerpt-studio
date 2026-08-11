/**
 * [INPUT]: themes 的 FontMeta；本目录的 DropdownSelect
 * [OUTPUT]: FontSelect 字体选择器（下拉面板 + 搜索，紧凑触发器与完整选项均用该字体自身渲染）
 * [POS]: controls 里的**字体**选择器。fonts 由调用方(Dock)传入——只收 useAvailableFonts
 *        探测通过的档位，选择器本身不关心探测逻辑。每个选项直接用 f.cssVar 当
 *        inline font-family 渲染自己的名字；触发器用 compactLabel 保证与粗细控件同行不截断，
 *        下拉选项保留完整 label。选中吐 FontId 回写 style.font。
 * [SYNC]: FontMeta 形状变更时同步；下拉行为变更时同步 DropdownSelect。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { FontId, FontMeta } from "@/themes/themes";
import { DropdownSelect } from "./DropdownSelect";

interface FontSelectProps {
  value: FontId;
  onChange: (id: FontId) => void;
  fonts: FontMeta[];
}

export function FontSelect({ value, onChange, fonts }: FontSelectProps) {
  return (
    <DropdownSelect
      items={fonts}
      value={value}
      onChange={onChange}
      getId={(f) => f.id}
      getSearchText={(f) => f.label}
      ariaLabel="字体"
      emptyLabel="无匹配字体"
      searchPlaceholder="搜索字体…"
      renderTrigger={(f) => (
        <span className="dd-value" style={{ fontFamily: f.cssVar }} title={f.label}>
          {f.compactLabel}
        </span>
      )}
      renderOption={(f) => <span style={{ fontFamily: f.cssVar }}>{f.label}</span>}
    />
  );
}
