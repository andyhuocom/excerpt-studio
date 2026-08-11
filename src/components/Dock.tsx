/**
 * [INPUT]: jotai 的 styleAtom/exportAtom/contentAtom；state 的 useAvatarLibrary；themes 注册表
 *          (LAYOUTS/FONTS/AVATAR_LAYOUTS/QR_LAYOUTS/NAME_LAYOUTS/CHAPTER_LAYOUTS)；controls；
 *          open/onToggle(开合态在 App)
 * [OUTPUT]: Dock 组件
 * [POS]: 右侧磨砂设置栏（原底部条竖排右移，设计不变）。分两段：顶层是「高于版式」的全局项——
 *        版式/配色/字体(FontSelect 下拉，只列探测通过的档位，同行紧跟正文粗细 400/500/600)/
 *        字号(16/18/20/22，取代已删除的 useAutoFit 自适应算法，全局统一直选、不逐版式)/
 *        背景(有背景开关+图片背景 select 合一行)/留白(ray.so 同款 16/32/64/128，仅「有背景」
 *        开启时才露出——关闭时外框留白恒为 0，此控件无意义)/倍率，切版式不影响它们
 *        (配色虽也逐版式各记，但作为主要视觉决策仍留顶层，不下沉专属区)。面板底是可折叠的
 *        「版式专属设置」(默认收起，标题栏点开/收，内容区固定高度、超出内部滚动——见 studio.css 的
 *        .section-body)：头像/昵称/日期/书名(+章节子开关)/作者/平台/二维码——内容值与显隐开关都全局共享，
 *        在任一版式修改都会同步影响所有支持同项的版式。头像/昵称/章节/二维码仅在结构支持的版式
 *        (AVATAR_LAYOUTS/NAME_LAYOUTS/CHAPTER_LAYOUTS/QR_LAYOUTS)才露出对应分组，其余版式该开关无
 *        意义故不渲染。章节开关并排挂在书名开关之后：书名关闭时章节开关置灰不可点(级联隐藏，
 *        见 Stage 的 data-hide-chapter)。昵称/书名/章节/作者/平台无需在此重复编辑入口，值仍在卡片上就地改。
 * [SYNC]: 增删控件时同步对应 atom 字段与 studio.css。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useRef, useState } from "react";
import { useAtom } from "jotai";
import { contentAtom, exportAtom, styleAtom, type ExportScale, type FramePadding, type QuoteFontSize, type QuoteFontWeight } from "@/state/atoms";
import { useAvatarLibrary } from "@/state/useAvatarLibrary";
import { useAvailableFonts } from "@/state/useAvailableFonts";
import { LAYOUTS, AVATAR_LAYOUTS, NAME_LAYOUTS, CHAPTER_LAYOUTS, QR_LAYOUTS } from "@/themes/themes";
import { Segmented } from "./controls/Segmented";
import { Switch } from "./controls/Switch";
import { SchemeSwatches } from "./controls/SchemeSwatches";
import { ThemeSelect } from "./controls/ThemeSelect";
import { FontSelect } from "./controls/FontSelect";

const SCALES = [
  { value: 2 as ExportScale, label: "2×" },
  { value: 4 as ExportScale, label: "4×" },
  { value: 6 as ExportScale, label: "6×" },
];

// ray.so 同款留白档位
const PADDINGS = [
  { value: 16 as FramePadding, label: "16" },
  { value: 32 as FramePadding, label: "32" },
  { value: 64 as FramePadding, label: "64" },
  { value: 128 as FramePadding, label: "128" },
];

// 正文字号四档，取代已删除的 useAutoFit 自适应算法
const QUOTE_SIZES = [
  { value: 16 as QuoteFontSize, label: "16" },
  { value: 18 as QuoteFontSize, label: "18" },
  { value: 20 as QuoteFontSize, label: "20" },
  { value: 22 as QuoteFontSize, label: "22" },
];

const QUOTE_WEIGHTS = [
  { value: 400 as QuoteFontWeight, label: "标准" },
  { value: 500 as QuoteFontWeight, label: "适中" },
  { value: 600 as QuoteFontWeight, label: "偏粗" },
];

// 今日 → "YYYY-MM-DD"（type=date 原生值格式；日期未设时的兜底，parseDate 亦可解析）
function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 单开关一行(标签 + Switch)：书名/作者/平台/有背景等纯显隐项复用
function ToggleRow({ label, checked, onChange, ariaLabel }: { label: string; checked: boolean; onChange: (v: boolean) => void; ariaLabel?: string }) {
  return (
    <div className="grp">
      <span className="lbl">{label}</span>
      <Switch checked={checked} onChange={onChange} ariaLabel={ariaLabel ?? `显示${label}`} />
    </div>
  );
}

export function Dock({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [style, setStyle] = useAtom(styleAtom);
  const [exp, setExp] = useAtom(exportAtom);
  const [content, setContent] = useAtom(contentAtom);
  const [qrDraft, setQrDraft] = useState(content.qrUrl);
  const [panelOpen, setPanelOpen] = useState(false); // 版式专属设置默认收起
  const avatar = useAvatarLibrary();
  const availableFonts = useAvailableFonts();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const commitQr = () => setContent((c) => ({ ...c, qrUrl: qrDraft.trim() }));
  const hasAvatar = AVATAR_LAYOUTS.includes(style.layout);
  const hasName = NAME_LAYOUTS.includes(style.layout);
  const hasChapter = CHAPTER_LAYOUTS.includes(style.layout);
  const hasQr = QR_LAYOUTS.includes(style.layout);
  const layoutLabel = LAYOUTS.find((l) => l.id === style.layout)?.label ?? "";

  return (
    <div className="dock-wrap">
      {/* 竖向拉手贴在侧栏左缘：展开时点它收起(→)，收起后仍浮在右缘点它展开(←) */}
      <button className="dock-tab" aria-label={open ? "收起设置栏" : "展开设置栏"} aria-expanded={open} onClick={onToggle}>
        <svg width="10" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d={open ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
        </svg>
      </button>

      <div className="dock">
        <div className="grp">
          <span className="lbl">版式</span>
          <Segmented
            value={style.layout}
            onChange={(layout) => setStyle((s) => ({ ...s, layout }))}
            options={LAYOUTS.map((l) => ({ value: l.id, label: l.label }))}
          />
        </div>

        <div className="grp">
          <span className="lbl">配色</span>
          <SchemeSwatches
            value={style.schemeByLayout[style.layout]}
            onPick={(sel) => setStyle((s) => ({ ...s, schemeByLayout: { ...s.schemeByLayout, [s.layout]: sel } }))}
          />
        </div>

        <div className="grp">
          <span className="lbl">字体</span>
          <div className="font-ctl">
            <FontSelect value={style.font} onChange={(font) => setStyle((s) => ({ ...s, font }))} fonts={availableFonts} />
            <div className="font-weight-ctl" role="group" aria-label="正文粗细">
              <Segmented
                mini
                value={style.quoteFontWeight}
                onChange={(quoteFontWeight) => setStyle((s) => ({ ...s, quoteFontWeight }))}
                options={QUOTE_WEIGHTS}
              />
            </div>
          </div>
        </div>

        <div className="grp">
          <span className="lbl">字号</span>
          <Segmented mini value={style.quoteFontSize} onChange={(quoteFontSize) => setStyle((s) => ({ ...s, quoteFontSize }))} options={QUOTE_SIZES} />
        </div>

        <div className="grp">
          <span className="lbl">背景</span>
          <div className="bg-ctl">
            <Switch checked={style.showFrame} onChange={(v) => setStyle((s) => ({ ...s, showFrame: v }))} ariaLabel="有背景" />
            <ThemeSelect value={style.background} onChange={(background) => setStyle((s) => ({ ...s, background }))} />
          </div>
        </div>

        {/* 留白只在有背景时才有视觉意义(关闭时 .frame padding 恒为 0)，故随「背景」开关联动出现 */}
        {style.showFrame && (
          <div className="grp">
            <span className="lbl">留白</span>
            <Segmented mini value={style.framePadding} onChange={(framePadding) => setStyle((s) => ({ ...s, framePadding }))} options={PADDINGS} />
          </div>
        )}

        <div className="grp">
          <span className="lbl">倍率</span>
          <Segmented mini value={exp.scale} onChange={(scale) => setExp((e) => ({ ...e, scale }))} options={SCALES} />
        </div>

        {/* 版式专属设置：可折叠(默认收起)，置于面板底。同语义项的值与显隐跨版式共享 */}
        <div className="section">
          <button type="button" className="section-head" aria-expanded={panelOpen} onClick={() => setPanelOpen((v) => !v)}>
            <span className="lbl">版式专属 · {layoutLabel}</span>
            <svg className="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {panelOpen && (
            <div className="section-body">
              {hasAvatar && (
                <>
                  <div className="grp">
                    <span className="lbl">头像</span>
                    <div className="avatar-ctl">
                      <Switch
                        checked={style.showAvatar}
                        onChange={(showAvatar) => setStyle((s) => ({ ...s, showAvatar }))}
                        ariaLabel="显示头像"
                      />
                      <button type="button" className="dock-btn" onClick={() => avatarInputRef.current?.click()}>上传</button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void avatar.upload(f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  </div>

                  {avatar.history.length > 0 && (
                    <div className="grp">
                      <span className="lbl">头像历史</span>
                      <div className="avatar-history">
                        {avatar.history.slice().reverse().map((url) => (
                          <button
                            key={url}
                            type="button"
                            className={`avatar-thumb${url === avatar.current ? " on" : ""}`}
                            style={{ backgroundImage: `url(${url})` }}
                            onClick={() => avatar.select(url)}
                            aria-label="选择此头像"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {hasName && (
                <ToggleRow
                  label="昵称"
                  checked={style.showName}
                  onChange={(showName) => setStyle((s) => ({ ...s, showName }))}
                />
              )}

              <div className="grp">
                <span className="lbl">日期</span>
                <div className="date-ctl">
                  <Switch
                    checked={style.showDate}
                    onChange={(showDate) => setStyle((s) => ({ ...s, showDate }))}
                    ariaLabel="显示日期"
                  />
                  <input
                    type="date"
                    className="dock-input dock-date"
                    value={content.shareDate || todayISO()}
                    onChange={(e) => setContent((c) => ({ ...c, shareDate: e.target.value }))}
                    aria-label="日期"
                  />
                </div>
              </div>

              <div className="grp">
                <span className="lbl">书名</span>
                <div className="title-ctl">
                  <Switch
                    checked={style.showTitle}
                    onChange={(showTitle) => setStyle((s) => ({ ...s, showTitle }))}
                    ariaLabel="显示书名"
                  />
                  {hasChapter && (
                    <>
                      <span className="title-ctl-sep">章节</span>
                      <Switch
                        checked={style.showChapter}
                        onChange={(showChapter) => setStyle((s) => ({ ...s, showChapter }))}
                        ariaLabel="显示章节"
                        disabled={!style.showTitle}
                      />
                    </>
                  )}
                </div>
              </div>
              <ToggleRow
                label="作者"
                checked={style.showAuthor}
                onChange={(showAuthor) => setStyle((s) => ({ ...s, showAuthor }))}
              />
              <ToggleRow
                label="平台"
                checked={style.showBrand}
                onChange={(showBrand) => setStyle((s) => ({ ...s, showBrand }))}
              />

              {hasQr && (
                <div className="grp">
                  <span className="lbl">二维码</span>
                  <div className="qr-ctl">
                    <Switch
                      checked={style.showQr}
                      onChange={(showQr) => setStyle((s) => ({ ...s, showQr }))}
                      ariaLabel="显示二维码"
                    />
                    <input
                      className="dock-input"
                      value={qrDraft}
                      onChange={(e) => setQrDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitQr();
                      }}
                      placeholder="二维码内容 / 网址"
                      aria-label="二维码内容"
                    />
                    <button type="button" className="dock-btn" onClick={commitQr}>生成</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
