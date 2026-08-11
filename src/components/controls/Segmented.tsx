/**
 * [INPUT]: 无
 * [OUTPUT]: Segmented 泛型分段控件
 * [POS]: controls 里的分段选择器（主题/字体/倍率共用）。样式在 studio.css 的 .seg。
 * [SYNC]: 变更视觉契约时同步 studio.css 的 .seg 选择器。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

interface SegOption<T> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SegOption<T>[];
  mini?: boolean;
}

export function Segmented<T extends string | number>({ value, onChange, options, mini }: SegmentedProps<T>) {
  return (
    <div className={mini ? "seg mini" : "seg"}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
