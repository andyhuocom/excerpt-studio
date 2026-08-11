/**
 * [INPUT]: react 的 useState/useRef/useEffect/useMemo/CSSProperties
 * [OUTPUT]: DropdownSelect 泛型组件（视口感知的搜索下拉）
 * [POS]: controls 里的下拉选择底座，从 ThemeSelect 抽出的通用壳——开合态、外点/Esc 收起、
 *        打开时测量触发器上下可用空间择大侧弹出并动态收缩列表高度、按 getSearchText 过滤——
 *        这套机制与"选项到底长什么样"正交，交调用方的 renderTrigger/renderOption 决定
 *        (ThemeSelect 画色点+主题名，FontSelect 画各自 font-family 的字体名预览)。
 *        样式复用 studio.css 的 .dd-*，与调用方无关的展示细节(如 ThemeSelect 的 .theme-dot)
 *        由调用方自带 class。
 * [SYNC]: 变更下拉行为(定位/搜索/键盘)时同步 studio.css 的 .dd-* 契约与两个调用方(ThemeSelect/FontSelect)。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

interface DropdownSelectProps<T, TId extends string> {
  items: T[];
  value: TId;
  getId: (item: T) => TId;
  getSearchText: (item: T) => string;
  renderTrigger: (current: T) => ReactNode;
  renderOption: (item: T) => ReactNode;
  onChange: (id: TId) => void;
  ariaLabel: string;
  emptyLabel: string;
  searchPlaceholder?: string;
}

export function DropdownSelect<T, TId extends string = string>({
  items,
  value,
  getId,
  getSearchText,
  renderTrigger,
  renderOption,
  onChange,
  ariaLabel,
  emptyLabel,
  searchPlaceholder = "搜索…",
}: DropdownSelectProps<T, TId>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [placement, setPlacement] = useState<"up" | "down">("up");
  const [listMaxHeight, setListMaxHeight] = useState(264);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const current = items.find((item) => getId(item) === value) ?? items[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((item) => getSearchText(item).toLowerCase().includes(q)) : items;
  }, [items, query, getSearchText]);

  // 外点 / Esc 收起；打开即聚焦搜索框
  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (id: TId) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  const toggle = () => {
    if (open) return setOpen(false);
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const gap = 8;
      const panelChrome = 56; // 搜索框 + 分隔 + 面板内边距；列表高度之外的固定部分
      const above = rect.top - gap;
      const below = window.innerHeight - rect.bottom - gap;
      const nextPlacement = above >= below ? "up" : "down";
      const available = nextPlacement === "up" ? above : below;
      setPlacement(nextPlacement);
      setListMaxHeight(Math.max(96, Math.min(264, available - panelChrome)));
    }
    setOpen(true);
  };

  if (!current) return null;

  return (
    <div className="dd-select" ref={rootRef}>
      <button type="button" className="dd-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={toggle}>
        {renderTrigger(current)}
        <svg width="11" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
        </svg>
      </button>

      {open && (
        <div className="dd-panel" data-placement={placement} role="listbox" aria-label={ariaLabel} style={{ "--dd-list-max": `${listMaxHeight}px` } as CSSProperties}>
          <div className="dd-list">
            {filtered.map((item) => (
              <button key={getId(item)} type="button" className="dd-opt" role="option" aria-selected={getId(item) === value} onClick={() => pick(getId(item))}>
                {renderOption(item)}
              </button>
            ))}
            {filtered.length === 0 && <div className="dd-empty">{emptyLabel}</div>}
          </div>
          <div className="dd-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} aria-label={`搜索${ariaLabel}`} spellCheck={false} />
          </div>
        </div>
      )}
    </div>
  );
}
