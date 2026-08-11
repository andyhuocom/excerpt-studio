/**
 * [INPUT]: jotai 状态；render/exportImage；components(TopBar/Stage/Dock)
 * [OUTPUT]: App 根组件（default）
 * [POS]: 装配层与副作用中枢。持有 frame/card 两个导出目标 ref；把外观参数写进
 *        :root 的 CSS 变量(图片背景 --bg / 卡片配色 --c-* / --card-w/--card-font/--frame-pad/
 *        --quote-max/--quote-weight/--quote-weight-emphasis)；编排导出/复制并出 toast。
 *        有背景截 .frame，无背景截 .card。
 * [SYNC]: 变更装配或导出编排时同步 src/CLAUDE.md 与对应模块契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { contentAtom, exportAtom, styleAtom } from "@/state/atoms";
import { FONTS } from "@/themes/themes";
import { resolveScheme } from "@/themes/schemes";
import { imageThemeCss } from "@/themes/backgrounds";
import { exportExcerpt, renderExcerpt } from "@/render/exportImage";
import { TopBar } from "@/components/TopBar";
import { Stage } from "@/components/Stage";
import { Dock } from "@/components/Dock";

export default function App() {
  const style = useAtomValue(styleAtom);
  const content = useAtomValue(contentAtom);
  const exp = useAtomValue(exportAtom);

  const frameRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  // 外观参数 → :root CSS 变量（三轴：图片背景 --bg / 配色 --c-* / 版式经 Stage 的 data-layout）
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--bg", imageThemeCss(style.background));
    r.setProperty("--card-w", `${style.cardWidth}px`);
    r.setProperty("--frame-pad", `${style.framePadding}px`);
    r.setProperty("--quote-max", `${style.quoteFontSize}px`);
    r.setProperty("--quote-weight", `${style.quoteFontWeight}`);
    r.setProperty("--quote-weight-emphasis", `${Math.min(style.quoteFontWeight + 100, 700)}`);
    const font = FONTS.find((f) => f.id === style.font);
    r.setProperty("--card-font", font ? font.cssVar : "var(--font-pingfang)");
    // 配色令牌：取当前版式的配色选择(预设 id 或 #hex)，解析成整套；一次写六个 --c-*
    const sc = resolveScheme(style.schemeByLayout[style.layout] ?? "ink");
    r.setProperty("--c-bg", sc.bg);
    r.setProperty("--c-ink", sc.ink);
    r.setProperty("--c-mut", sc.mut);
    r.setProperty("--c-faint", sc.faint);
    r.setProperty("--c-accent", sc.accent);
    r.setProperty("--c-qr", sc.qr);
  }, [style.background, style.cardWidth, style.framePadding, style.font, style.layout, style.quoteFontSize, style.quoteFontWeight, style.schemeByLayout]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  // 有背景取渐变底板 .frame，无背景取纯卡片 .card
  const pickNode = useCallback(
    () => (style.showFrame ? frameRef.current : cardRef.current),
    [style.showFrame],
  );

  const handleExport = useCallback(async () => {
    const node = pickNode();
    if (!node) return;
    setBusy(true);
    const res = await exportExcerpt({ node, scale: exp.scale, fileBaseName: content.bookTitle });
    setBusy(false);
    if (res.ok) notify(res.path ? `已导出 · ${res.path}` : "已导出");
    else if (!res.cancelled) notify(`导出失败：${res.error ?? "未知错误"}`);
  }, [pickNode, exp.scale, content.bookTitle, notify]);

  const handleCopy = useCallback(async () => {
    const node = pickNode();
    if (!node) return;
    setBusy(true);
    try {
      const blob = await renderExcerpt({ node, scale: exp.scale, fileBaseName: content.bookTitle });
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      notify("已复制到剪贴板");
    } catch {
      notify("复制失败，请改用导出");
    } finally {
      setBusy(false);
    }
  }, [pickNode, exp.scale, content.bookTitle, notify]);

  return (
    <>
      <div className="app">
        <TopBar busy={busy} onExport={handleExport} onCopy={handleCopy} />
        {/* 右侧栏与舞台同处一行；收起时舞台回收右侧空间(见 studio.css 的 .workspace) */}
        <div className={`workspace${dockOpen ? "" : " dock-collapsed"}`}>
          <Stage frameRef={frameRef} cardRef={cardRef} />
          <Dock open={dockOpen} onToggle={() => setDockOpen((v) => !v)} />
        </div>
      </div>
      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        <span className="dot" />
        <span>{toast}</span>
      </div>
    </>
  );
}
