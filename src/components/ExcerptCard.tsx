/**
 * [INPUT]: jotai 的 contentAtom；controls 的 Editable/MarkdownQuote/AvatarUpload/QrCode
 * [OUTPUT]: ExcerptCard 组件（接收 cardRef 供导出取节点）
 * [POS]: 卡片渲染器，是被导出的实体本身。单一 DOM 承载全部五版式——结构差异由
 *        studio.css 的 `.stage[data-layout]` 选择器 显隐/重排 这些块：cal(日历表头)/jin(标题表头,
 *        锦书大标题·墨白大标题二态)/hdr(头像头,经典手札带像·墨白仅昵称)/
 *        bar(墨白做旧粗杠)/hdr-rule(手札头下分隔)/credit(页脚昵称·日期)。默认隐藏、按版式点亮。
 *        颜色不在版式里——卡片全部吃配色令牌 --c-*(见 themes/schemes.ts)，故任一配色可配任一版式。
 *        全版式日期(经典/手札「摘录于」·墨白中文·日历大数字·锦书页脚)同源于全局共享 shareDate(未设跟随今天)，
 *        只在 Dock 专属设置改、卡上纯展示；头像取自 useAvatarLibrary；昵称(shareName)/书名/章节/作者/
 *        平台(brand)/二维码值仍就地编辑写 contentAtom，但显隐由 Stage 的跨版式共享 data-hide-* 驱动，
 *        与结构选择器正交。章节有共享独立开关，但书名隐藏时仍会被 Stage 级联隐藏。
 *        正文字号不再自适应，由 Dock 的「字号」全局直选(styleAtom.quoteFontSize)，App 写入
 *        --quote-max 直接落地 font-size；长摘录不再收缩，卡片随内容自然变高。正文支持行内
 *        markdown 编辑(**粗体**、*斜体*、~下划线~、~~删除线~~、==高亮==、`代码`，且支持手写
 *        嵌套组合)，由 MarkdownQuote 在单一 contentEditable 中同步呈现样式与原生光标，
 *        contentAtom.content 存的仍是原始 markdown 源文本。
 * [SYNC]: 增删字段或结构块时同步 atoms.ts 与 studio.css 的 [data-layout] 段。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { RefObject } from "react";
import { useAtom } from "jotai";
import { contentAtom, type ExcerptContent } from "@/state/atoms";
import { Editable } from "./controls/Editable";
import { MarkdownQuote } from "./controls/MarkdownQuote";
import { AvatarUpload } from "./controls/AvatarUpload";
import { QrCode } from "./controls/QrCode";

// 从 "YYYY/M/D" 解析出日期
function parseDate(s: string): Date | null {
  const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

// 阿拉伯数字 → 中文数字（墨白主题日期："二〇二六年八月五日"）
const CN = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
function cnNum(n: number): string {
  if (n < 10) return CN[n];
  if (n === 10) return "十";
  if (n < 20) return "十" + CN[n - 10];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return CN[tens] + "十" + (ones ? CN[ones] : "");
}
function toChineseDate(d: Date | null): string {
  if (!d) return "";
  const year = String(d.getFullYear())
    .split("")
    .map((ch) => CN[Number(ch)])
    .join("");
  return `${year}年${cnNum(d.getMonth() + 1)}月${cnNum(d.getDate())}日`;
}

export function ExcerptCard({ cardRef }: { cardRef: RefObject<HTMLElement | null> }) {
  const [c, setC] = useAtom(contentAtom);
  const patch = (p: Partial<ExcerptContent>) => setC((prev) => ({ ...prev, ...p }));

  // 全局共享摘录日期：未设(null)则跟随今天；下面各表头同源于此 d，仅格式化不同
  const d = (c.shareDate ? parseDate(c.shareDate) : null) ?? new Date();
  const dateNormal = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  const cnDate = toChineseDate(d);
  const calDay = String(d.getDate());
  const calMon = `${d.toLocaleString("en-US", { month: "long" }).toUpperCase()} ${d.getFullYear()}`;
  const calWd = d.toLocaleDateString("zh-CN", { weekday: "long" });

  return (
    <article className="card" ref={cardRef}>
      {/* 墨白 顶部做旧粗杠 */}
      <div className="bar bar-top" />

      {/* 日历表头（派生自摘录日期） */}
      <div className="cal">
        <div className="num">{calDay}</div>
        <div className="mon">{calMon}</div>
        <div className="wd">{calWd}</div>
        <div className="rule" />
      </div>

      {/* 标题表头（锦书/墨白=大标题） */}
      <div className="jin">
        <Editable className="title" value={c.bookTitle} onChange={(v) => patch({ bookTitle: v })} ariaLabel="书名" />
        <Editable className="author" value={c.author} onChange={(v) => patch({ author: v })} ariaLabel="作者" />
      </div>

      {/* 头像表头（经典/手札=带头像；墨白=仅昵称+中文日期） */}
      <div className="hdr">
        <AvatarUpload />
        <div className="who">
          <Editable as="span" className="name" value={c.shareName} onChange={(v) => patch({ shareName: v })} ariaLabel="分享人" />
          <span className="date">
            摘录于{" "}
            <span className="date-normal">{dateNormal}</span>
            <span className="date-cn">{cnDate}</span>
          </span>
        </div>
      </div>

      {/* 手札 头下分隔 */}
      <div className="hdr-rule" />

      {/* 正文：支持 **粗体**、*斜体*、~下划线~、~~删除线~~、==高亮==、`代码` 行内 markdown 编辑(可嵌套组合)，见 MarkdownQuote */}
      <MarkdownQuote value={c.content} onChange={(v) => patch({ content: v })} ariaLabel="书摘正文" />

      {/* 出处 */}
      <div className="src">
        <div>
          <span className="slash">/ </span>
          <Editable as="span" className="book" value={c.bookTitle} onChange={(v) => patch({ bookTitle: v })} ariaLabel="书名" />
          <span className="dot"> · </span>
          <Editable as="span" className="chapter" value={c.chapter} onChange={(v) => patch({ chapter: v })} ariaLabel="章节" />
        </div>
        <Editable className="author" value={c.author} onChange={(v) => patch({ author: v })} ariaLabel="作者" />
      </div>

      <div className="divider" />

      {/* 页脚 */}
      <div className="foot">
        <div className="foot-left">
          <div className="credit">
            <Editable as="span" className="credit-name" value={c.shareName} onChange={(v) => patch({ shareName: v })} ariaLabel="分享人" />
            <span className="credit-date">
              <span className="credit-sep"> · 摘录于 </span>
              {dateNormal}
            </span>
          </div>
          <Editable as="span" className="brand-line" value={c.brand} onChange={(v) => patch({ brand: v })} ariaLabel="水印" />
        </div>
        <QrCode value={c.qrUrl} />
      </div>

      {/* 墨白 底部做旧粗杠 */}
      <div className="bar bar-bottom" />
    </article>
  );
}
