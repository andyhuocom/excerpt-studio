/**
 * [INPUT]: themes/schemes 的 SCHEMES
 * [OUTPUT]: SchemeSwatches 配色选择器（12 预设 + 自定义底色）
 * [POS]: controls 里的**配色**选择器，绑定「当前版式」的配色选择串。每个色块=某套配色，主体填底色、
 *        中心叠一枚 ink 色点(令深色配色也可区分)。末尾自定义取色吐 "#hex"。选择串以 "#" 开头即自定义态。
 *        样式复用 studio.css 的 .swatches/.sw/.sw-custom + .sw-ink。
 * [SYNC]: 增删配色时同步 themes/schemes.ts 注册表。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { SCHEMES } from "@/themes/schemes";

interface SchemeSwatchesProps {
  /** 当前版式的配色选择：预设 id 或 "#hex" */
  value: string;
  onPick: (sel: string) => void;
}

const HEX = /^#([0-9a-fA-F]{6})$/;

export function SchemeSwatches({ value, onPick }: SchemeSwatchesProps) {
  const isCustom = HEX.test(value);

  return (
    <div className="swatches">
      {SCHEMES.map((s) => (
        <button
          key={s.id}
          type="button"
          className="sw sw-scheme"
          title={s.label}
          aria-label={`配色 ${s.label}`}
          aria-pressed={value === s.id}
          style={{ background: s.bg }}
          onClick={() => onPick(s.id)}
        >
          <span className="sw-ink" style={{ background: s.ink }} />
        </button>
      ))}
      <label className="sw sw-custom" title="自定义底色" aria-pressed={isCustom}>
        <input
          type="color"
          value={isCustom ? value : "#1b1c1e"}
          onChange={(e) => onPick(e.target.value)}
          aria-label="自定义卡片底色"
        />
      </label>
    </div>
  );
}
