/**
 * [INPUT]: react 的 useLayoutEffect/useRef
 * [OUTPUT]: Editable 组件
 * [POS]: controls 里的可编辑文本原子。就地编辑(ray.so 手感)的底座——卡片上每个
 *        文字节点都是它。核心是光标安全：挂载写初值；外部值变更且元素未聚焦时才回写，
 *        正在打字(聚焦)时绝不回写。因此同一字段跨主题的重复绑定能保持同步而不跳光标。
 *        回写用 layout effect(非 passive)：绘制前完成，免旧值闪一帧。
 *        **IME 组字保护**：中文/日文等输入法组字期间(拼音候选还没选定)，contentEditable 会连续
 *        触发 input 事件、textContent 是候选拼音这类中间态，不是用户最终想要的字。若这些中间态
 *        直接经 onChange 泄漏给外部状态，受控消费方会用不完整文本重算、期间还可能触发
 *        selectionchange，干扰输入法自己的组字状态。
 *        这是有据可查的一类"受控 contentEditable 在 IME 组字中被外部重渲染打断"的真实 bug。
 *        故 compositionstart~compositionend 之间忽略 input 事件，只在 compositionend 报一次
 *        最终文本。
 * [SYNC]: 变更编辑语义时同步 ExcerptCard 的调用约束。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useLayoutEffect, useRef } from "react";
import type { CompositionEvent, FormEvent, RefObject } from "react";

interface EditableProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  as?: "div" | "span";
  ariaLabel?: string;
}

export function Editable({ value, onChange, className, as = "div", ariaLabel }: EditableProps) {
  const ref = useRef<HTMLElement>(null);
  const composingRef = useRef(false);

  // layout effect(非 passive)：未聚焦时的外部回写在绘制前完成，免旧值闪一帧。
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.textContent !== value) {
      el.textContent = value;
    }
  }, [value]);

  // 运行时可能是 span；类型按 div 收敛，避免联合 intrinsic 标签的 ref/props 类型冲突
  const Tag = as as "div";
  return (
    <Tag
      ref={ref as RefObject<HTMLDivElement>}
      className={className ? `edit ${className}` : "edit"}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      spellCheck={false}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={(e: CompositionEvent<HTMLElement>) => {
        composingRef.current = false;
        onChange(e.currentTarget.textContent ?? "");
      }}
      onInput={(e: FormEvent<HTMLElement>) => {
        if (composingRef.current) return; // IME 组字中：中间态不外传，等 compositionend 报最终结果
        onChange(e.currentTarget.textContent ?? "");
      }}
    />
  );
}
