/**
 * [INPUT]: node:test/assert、TypeScript transpileModule，以及 MarkdownQuote.tsx/studio.css 源码
 * [OUTPUT]: 单 DOM 编辑面、隐藏标记零占位、光标内标记可见、导出安全样式、撤销重做历史五项回归保护
 * [POS]: MarkdownQuote 的结构级回归测试；钉死导致坐标漂移或高倍率导出失真的 DOM/CSS 不变量
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("./MarkdownQuote.tsx", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const styles = await readFile(new URL("../../styles/studio.css", import.meta.url), "utf8");

async function loadMarkdownQuote() {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourceUrl.pathname,
  }).outputText;

  const runnable = `${transpiled
    .replaceAll('from "react"', `from ${JSON.stringify(import.meta.resolve("react"))}`)
    .replaceAll('from "react/jsx-runtime"', `from ${JSON.stringify(import.meta.resolve("react/jsx-runtime"))}`)}
export { parseInlineMarkdown, isMarkerRevealed, historyDirectionForKey, takeHistoryStep };`;

  return import(`data:text/javascript;base64,${Buffer.from(runnable).toString("base64")}`);
}

test("正文样式与编辑共用单一排版坐标系，隐藏标记不占位", async () => {
  // 负断言与单一编辑根、零占位规则两个正断言成对，避免永远为真的假测试。
  assert.doesNotMatch(source, /md-quote-overlay|md-quote-input/);
  assert.equal(source.match(/^\s+contentEditable$/gm)?.length, 1);
  assert.match(styles, /\.md-marker\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
  assert.match(styles, /\.quote u\s*\{[^}]*text-decoration-thickness:\s*0\.1em;[^}]*text-underline-offset:\s*0\.28em;[^}]*text-decoration-skip-ink:\s*none;/s);
  assert.match(styles, /\.quote mark\s*\{[^}]*box-shadow:\s*none;[^}]*padding-inline:\s*0;/s);
  assert.match(styles, /\.quote code\s*\{[^}]*box-shadow:\s*none;[^}]*padding-inline:\s*0;[^}]*box-decoration-break:\s*clone;/s);

  const { isMarkerRevealed, parseInlineMarkdown } = await loadMarkdownQuote();
  const styled = parseInlineMarkdown("甲**乙**丙`code`丁", 0).filter((node) => node.type !== "text");
  assert.deepEqual(styled.map((node) => node.type), ["bold", "code"]);
  assert.equal(isMarkerRevealed(styled[0].start, styled[0].end, null), false);
  assert.equal(isMarkerRevealed(styled[0].start, styled[0].end, 4), true);
});

test("正文 DOM 重建后仍支持撤销与重做快捷键", async () => {
  assert.match(source, /onKeyDown=\{handleHistoryKeyDown\}/);

  const { historyDirectionForKey, takeHistoryStep } = await loadMarkdownQuote();
  const selection = (focus) => ({ anchor: focus, focus });
  const first = { value: "甲", selection: selection(1) };
  const second = { value: "甲乙", selection: selection(2) };
  const current = { value: "甲乙丙", selection: selection(3) };

  const undone = takeHistoryStep({ past: [first, second], future: [] }, current, "undo");
  assert.deepEqual(undone?.snapshot, second);
  assert.deepEqual(undone?.history, { past: [first], future: [current] });

  const redone = takeHistoryStep(undone.history, undone.snapshot, "redo");
  assert.deepEqual(redone?.snapshot, current);
  assert.deepEqual(redone?.history, { past: [first, second], future: [] });

  assert.equal(historyDirectionForKey({ key: "z", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }), "undo");
  assert.equal(historyDirectionForKey({ key: "z", metaKey: true, ctrlKey: false, shiftKey: true, altKey: false }), "redo");
  assert.equal(historyDirectionForKey({ key: "y", metaKey: false, ctrlKey: true, shiftKey: false, altKey: false }), "redo");
});
