/**
 * [INPUT]: node:test/assert，以及 atoms.ts/App.tsx/Dock.tsx/tokens.css/studio.css 源码
 * [OUTPUT]: 对正文粗细三档、持久化值收敛、同行控件接线、CSS 令牌与日历强化规则提供结构回归保护
 * [POS]: state 与排版消费链路的契约测试，防止非法存储值穿透、设置存在但预览/导出未消费，
 *        或同行布局退化
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const atoms = await readFile(new URL("./atoms.ts", import.meta.url), "utf8");
const app = await readFile(new URL("../App.tsx", import.meta.url), "utf8");
const dock = await readFile(new URL("../components/Dock.tsx", import.meta.url), "utf8");
const themes = await readFile(new URL("../themes/themes.ts", import.meta.url), "utf8");
const fontSelect = await readFile(new URL("../components/controls/FontSelect.tsx", import.meta.url), "utf8");
const tokens = await readFile(new URL("../styles/tokens.css", import.meta.url), "utf8");
const studio = await readFile(new URL("../styles/studio.css", import.meta.url), "utf8");

test("正文粗细只开放 400/500/600 三档并默认保持 500", () => {
  assert.match(atoms, /export type QuoteFontWeight = 400 \| 500 \| 600;/);
  assert.match(atoms, /quoteFontWeight:\s*500,/);
  assert.match(atoms, /value === 400 \|\| value === 500 \|\| value === 600/);
  assert.match(atoms, /quoteFontWeight:\s*normalizeQuoteFontWeight/);
  assert.match(atoms, /STYLE_STORAGE_KEY = "excerpt\.style\.v12"/);
  assert.match(dock, /label: "标准"/);
  assert.match(dock, /label: "适中"/);
  assert.match(dock, /label: "偏粗"/);
});

test("字体与正文粗细同行，预览和日历版式消费对应字重令牌", () => {
  assert.match(dock, /className="font-ctl"[\s\S]*<FontSelect[\s\S]*aria-label="正文粗细"/);
  assert.match(app, /setProperty\("--quote-weight",/);
  assert.match(app, /setProperty\("--quote-weight-emphasis",/);
  assert.match(tokens, /--quote-weight:\s*500;/);
  assert.match(tokens, /--quote-weight-emphasis:\s*600;/);
  assert.match(studio, /\.quote\s*\{[^}]*font-weight:\s*var\(--quote-weight\)/s);
  assert.match(studio, /\[data-layout="calendar"\] \.quote\s*\{[^}]*font-weight:\s*var\(--quote-weight-emphasis\)/s);
  assert.match(studio, /\.font-ctl\s*\{[^}]*grid-template-columns:\s*minmax\(128px, 1fr\) auto/s);
  assert.equal(themes.match(/compactLabel:/g)?.length, 12);
  assert.match(fontSelect, /title=\{f\.label\}[\s\S]*\{f\.compactLabel\}/);
});
