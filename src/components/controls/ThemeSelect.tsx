/**
 * [INPUT]: themes/backgrounds 的 IMAGE_THEMES；本目录的 DropdownSelect
 * [OUTPUT]: ThemeSelect 图片背景选择器（下拉面板 + 搜索，复刻 ray.so）
 * [POS]: controls 里的**图片背景**选择器。只负责"选项长什么样"——色点+名，色点用主题渐变
 *        当预览；开合/定位/搜索这套通用机制交给 DropdownSelect。选中吐主题 id 回写 style.background。
 *        .theme-dot 是本组件专属的装饰(色点)，不下沉进 DropdownSelect(那边只关心通用的 .dd-*)。
 * [SYNC]: 增删预设时同步 themes/backgrounds.ts 注册表；下拉行为变更时同步 DropdownSelect。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { IMAGE_THEMES } from "@/themes/backgrounds";
import { DropdownSelect } from "./DropdownSelect";

interface ThemeSelectProps {
  value: string;
  onChange: (id: string) => void;
}

export function ThemeSelect({ value, onChange }: ThemeSelectProps) {
  return (
    <DropdownSelect
      items={IMAGE_THEMES}
      value={value}
      onChange={onChange}
      getId={(t) => t.id}
      getSearchText={(t) => t.name}
      ariaLabel="图片背景主题"
      emptyLabel="无匹配主题"
      renderTrigger={(t) => (
        <>
          <span className="theme-dot" style={{ background: t.css }} />
          <span className="dd-value">{t.name}</span>
        </>
      )}
      renderOption={(t) => (
        <>
          <span className="theme-dot" style={{ background: t.css }} />
          <span>{t.name}</span>
        </>
      )}
    />
  );
}
