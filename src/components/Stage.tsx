/**
 * [INPUT]: jotai 的 styleAtom；ExcerptCard
 * [OUTPUT]: Stage 组件
 * [POS]: 居中舞台。承载 data-layout/data-font（驱动 studio.css 的版式/字体选择器）、八个
 *        data-hide-*(avatar/name/date/title/chapter/author/brand/qr，跨版式共享的内容元素显隐，当前版式
 *        只消费其结构支持的字段)、渐变底板 .frame、两侧拖拽调宽手柄、以及卡片本身。
 *        data-hide-chapter 是唯二的复合计算(另一个隐含在 data-hide-title 自身)：章节自身开关关闭
 *        或书名开关关闭，任一为真即隐藏——书名关闭时章节必然随之隐藏，不依赖章节自身状态。
 *        .frame 之上叠一个可选的 .width-hud：拖拽中显示实时像素徽标(ref 直写 textContent，
 *        与 --card-w 同一条命令式更新路径，不逐帧触发 React)；松手后若宽度≠DEFAULT_CARD_WIDTH，
 *        换成「恢复默认宽度」按钮。二者皆标 data-no-export 且位于 .frame 外层，天然不入导出图；
 *        .width-hud 在 studio.css 里是绝对定位悬浮，不占 .canvas 的文档流——它的出现/消失不会
 *        改变 .canvas 高度，故不会牵动 .stage 的 safe center 把卡片顶上顶下。
 *        showFrame=false 时根节点追加 bare：图片背景与留白关闭，同时由 studio.css 去掉卡片圆角；
 *        有背景时卡片保留自身圆角，但外层 .frame 始终保持直角。
 *        frameRef/cardRef 由 App 注入，导出时二选一取节点。手柄标了 data-no-export，不入图。
 * [SYNC]: 变更舞台结构时同步 studio.css 的 .stage/.frame/.width-hud 契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useAtom } from "jotai";
import { DEFAULT_CARD_WIDTH, styleAtom } from "@/state/atoms";
import { ExcerptCard } from "./ExcerptCard";

interface StageProps {
  frameRef: RefObject<HTMLDivElement | null>;
  cardRef: RefObject<HTMLElement | null>;
}

interface DragState {
  x: number;
  base: number;
  side: number;
  latest: number;
}

const MIN_W = 320;
const MAX_W = 620;

export function Stage({ frameRef, cardRef }: StageProps) {
  const [style, setStyle] = useAtom(styleAtom);
  const drag = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);

  // 拖拽期间直接写 --card-w 与徽标文字（顺滑，不惊动状态）；松手时才落一次 cardWidth
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const w = Math.max(MIN_W, Math.min(MAX_W, d.base + (e.clientX - d.x) * d.side * 2));
      d.latest = w;
      document.documentElement.style.setProperty("--card-w", `${w}px`);
      if (badgeRef.current) badgeRef.current.textContent = `${Math.round(w)} px`;
    };
    const up = () => {
      const d = drag.current;
      if (!d) return;
      const committed = d.latest;
      drag.current = null;
      setDragging(false);
      setStyle((s) => ({ ...s, cardWidth: committed }));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [setStyle]);

  const startDrag = (side: number) => (e: ReactPointerEvent) => {
    drag.current = { x: e.clientX, base: style.cardWidth, side, latest: style.cardWidth };
    setDragging(true);
    e.preventDefault();
  };

  const cls = `stage${style.showFrame ? "" : " bare"}`;
  const showReset = !dragging && style.cardWidth !== DEFAULT_CARD_WIDTH;

  return (
    <main
      className={cls}
      data-layout={style.layout}
      data-font={style.font}
      data-hide-avatar={!style.showAvatar}
      data-hide-name={!style.showName}
      data-hide-date={!style.showDate}
      data-hide-title={!style.showTitle}
      data-hide-chapter={!style.showChapter || !style.showTitle}
      data-hide-author={!style.showAuthor}
      data-hide-brand={!style.showBrand}
      data-hide-qr={!style.showQr}
    >
      <div className="canvas">
        {(dragging || showReset) && (
          <div className="width-hud">
            {dragging ? (
              <span ref={badgeRef} className="width-badge" data-no-export>
                {Math.round(style.cardWidth)} px
              </span>
            ) : (
              <button
                type="button"
                className="width-reset"
                data-no-export
                onClick={() => setStyle((s) => ({ ...s, cardWidth: DEFAULT_CARD_WIDTH }))}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
                </svg>
                恢复默认宽度
              </button>
            )}
          </div>
        )}
        <div className="frame" ref={frameRef}>
          <span className="handle l" data-no-export onPointerDown={startDrag(-1)} />
          <span className="handle r" data-no-export onPointerDown={startDrag(1)} />
          <ExcerptCard cardRef={cardRef} />
        </div>
      </div>
    </main>
  );
}
