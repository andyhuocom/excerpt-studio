/**
 * [INPUT]: react 的 useState/useEffect
 * [OUTPUT]: TopBar 组件
 * [POS]: 极简顶栏。左 wordmark，右「导出图片」分裂按钮（主按钮=保存对话框，
 *        下拉=复制到剪贴板）。只发出 onExport/onCopy 意图，具体编排在 App。
 * [SYNC]: 增删导出动作时同步 App 的 handler。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useState } from "react";

interface TopBarProps {
  busy: boolean;
  onExport: () => void;
  onCopy: () => void;
}

export function TopBar({ busy, onExport, onCopy }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark">书摘</span>
        <span className="sub">Excerpt&nbsp;Studio</span>
      </div>

      <div className="top-actions">
        <div className="split">
          <button className="btn-primary" disabled={busy} onClick={onExport}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            {busy ? "导出中…" : "导出图片"}
          </button>
          <button
            className="btn-caret"
            disabled={busy}
            aria-label="更多导出选项"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {menuOpen && (
            <div className="menu" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onCopy();
                }}
              >
                复制到剪贴板 <span>⌘C</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
