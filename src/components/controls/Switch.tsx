/**
 * [INPUT]: 无
 * [OUTPUT]: Switch 开关控件
 * [POS]: controls 里的 iOS 风开关（有背景/二维码/各项内容显隐）。disabled 用于表达级联关系
 *        (如章节开关在书名关闭时不可交互)：原生 disabled 属性拦截点击，样式靠 studio.css 的
 *        .switch:disabled 调暗，语义仍是"暂不可用"而非"已关闭"。
 * [SYNC]: 变更视觉契约时同步 studio.css 的 .switch 选择器。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

interface SwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, ariaLabel, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-pressed={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}
