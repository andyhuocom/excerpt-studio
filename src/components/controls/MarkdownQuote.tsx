/**
 * [INPUT]: react 的 useEffect/useLayoutEffect/useRef/useState 与浏览器 Selection/contentEditable/DOM/键盘事件 API
 * [OUTPUT]: MarkdownQuote 组件
 * [POS]: 正文专属的单 DOM markdown 编辑器，只服务 ExcerptCard 的 .quote 字段。React 只拥有空的
 *        contentEditable 根，根内格式节点由 layout effect 原子重建，避免浏览器编辑与 React 子节点
 *        协调互相重复；样式标签与原生光标始终共处这一个排版坐标系。contentAtom.content 仍保存含
 *        定界符的源码；粗体、斜体、下划线、删除线、高亮、代码映射为 strong/em/u/s/mark/code，
 *        非 code 内容递归解析。定界符默认 hidden 零占位，光标进入片段才显示，且统一标记
 *        data-no-export。重建前把 DOM 选区换算为源码 UTF-16 偏移，重建后恢复；IME 组字期间不重建，
 *        直到 compositionend 一次提交，避免拆散中文输入法 preedit。由于格式重建会清空浏览器原生
 *        contentEditable 历史，本组件同步维护源码与选区快照，接管撤销/重做快捷键。
 * [SYNC]: 变更行内语法、选区映射或标记显隐时同步 studio.css 的 .md-quote/.md-marker 契约与本目录测试。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CompositionEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

type NodeType = "text" | "bold" | "italic" | "underline" | "strike" | "highlight" | "code";

interface InlineNode {
  type: NodeType;
  text: string;
  inner: string;
  children?: InlineNode[];
  start: number;
  end: number;
}

interface SelectionOffsets {
  anchor: number;
  focus: number;
}

interface DomPoint {
  node: Node;
  offset: number;
}

interface EditorSnapshot {
  value: string;
  selection: SelectionOffsets | null;
}

interface EditorHistory {
  past: EditorSnapshot[];
  future: EditorSnapshot[];
}

type HistoryDirection = "undo" | "redo";

interface HistoryKey {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

// 双字符定界符必须排在对应的单字符之前，避免粗体和删除线被提前拆成单字符语法。
const INLINE_MD_RE = /(\*\*[^*\n]+?\*\*|~~[^~\n]+?~~|==[^=\n]+?==|`[^`\n]+?`|\*[^*\n]+?\*|~[^~\n]+?~)/g;

function classify(raw: string): NodeType {
  if (raw.startsWith("**")) return "bold";
  if (raw.startsWith("~~")) return "strike";
  if (raw.startsWith("==")) return "highlight";
  if (raw.startsWith("`")) return "code";
  if (raw.startsWith("~")) return "underline";
  return "italic";
}

function markerLength(type: NodeType): number {
  return type === "bold" || type === "strike" || type === "highlight" ? 2 : 1;
}

const TAG = {
  bold: "strong",
  italic: "em",
  underline: "u",
  strike: "s",
  highlight: "mark",
  code: "code",
} as const;

const HISTORY_LIMIT = 100;

function historyDirectionForKey(event: HistoryKey): HistoryDirection | null {
  if ((!event.metaKey && !event.ctrlKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && !event.shiftKey) return "redo";
  return null;
}

function takeHistoryStep(
  history: EditorHistory,
  current: EditorSnapshot,
  direction: HistoryDirection,
): { history: EditorHistory; snapshot: EditorSnapshot } | null {
  if (direction === "undo") {
    const snapshot = history.past.at(-1);
    if (!snapshot) return null;
    return {
      snapshot,
      history: {
        past: history.past.slice(0, -1),
        future: [current, ...history.future],
      },
    };
  }

  const snapshot = history.future[0];
  if (!snapshot) return null;
  return {
    snapshot,
    history: {
      past: [...history.past, current].slice(-HISTORY_LIMIT),
      future: history.future.slice(1),
    },
  };
}

// offset 把递归节点重新投影到最外层源码坐标；浏览器 Selection 同样使用 UTF-16 偏移，二者同构。
function parseInlineMarkdown(text: string, offset: number): InlineNode[] {
  const nodes: InlineNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_MD_RE)) {
    const start = match.index ?? 0;
    if (start > last) {
      const plain = text.slice(last, start);
      nodes.push({ type: "text", text: plain, inner: plain, start: offset + last, end: offset + start });
    }

    const raw = match[0];
    const type = classify(raw);
    const marker = markerLength(type);
    const inner = raw.slice(marker, raw.length - marker);
    const end = start + raw.length;
    const node: InlineNode = { type, text: raw, inner, start: offset + start, end: offset + end };
    if (type !== "code") node.children = parseInlineMarkdown(inner, offset + start + marker);
    nodes.push(node);
    last = end;
  }

  if (last < text.length) {
    const plain = text.slice(last);
    nodes.push({ type: "text", text: plain, inner: plain, start: offset + last, end: offset + text.length });
  }
  return nodes;
}

function isMarkerRevealed(start: number, end: number, caret: number | null): boolean {
  return caret !== null && caret >= start && caret <= end;
}

function appendEditorNodes(parent: Node, nodes: InlineNode[], caret: number | null, document: Document): void {
  for (const node of nodes) {
    if (node.type === "text") {
      parent.appendChild(document.createTextNode(node.text));
      continue;
    }

    const marker = markerLength(node.type);
    const revealing = isMarkerRevealed(node.start, node.end, caret);
    const opening = document.createElement("span");
    opening.className = "md-marker";
    opening.hidden = !revealing;
    opening.setAttribute("data-no-export", "");
    opening.textContent = node.text.slice(0, marker);

    const content = document.createElement(TAG[node.type]);
    if (node.type === "code") content.textContent = node.inner;
    else if (node.children) appendEditorNodes(content, node.children, caret, document);
    else content.textContent = node.inner;

    const closing = opening.cloneNode() as HTMLSpanElement;
    closing.textContent = node.text.slice(-marker);
    parent.appendChild(opening);
    parent.appendChild(content);
    parent.appendChild(closing);
  }
}

function renderEditor(editor: HTMLElement, value: string, caret: number | null): void {
  const document = editor.ownerDocument;
  const fragment = document.createDocumentFragment();
  appendEditorNodes(fragment, parseInlineMarkdown(value, 0), caret, document);
  editor.replaceChildren(fragment);
}

function sourceOffsetAtPoint(root: HTMLElement, target: Node, pointOffset: number): number | null {
  let total = 0;
  let found = false;

  const visit = (node: Node): void => {
    if (found) return;
    if (node === target) {
      if (node.nodeType === Node.TEXT_NODE) {
        total += Math.min(pointOffset, node.textContent?.length ?? 0);
      } else {
        const children = node.childNodes;
        for (let index = 0; index < Math.min(pointOffset, children.length); index += 1) {
          total += children[index]?.textContent?.length ?? 0;
        }
      }
      found = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      total += node.textContent?.length ?? 0;
      return;
    }
    node.childNodes.forEach(visit);
  };

  visit(root);
  return found ? total : null;
}

function readSelection(root: HTMLElement): SelectionOffsets | null {
  const selection = window.getSelection();
  if (!selection?.anchorNode || !selection.focusNode || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) {
    return null;
  }

  const anchor = sourceOffsetAtPoint(root, selection.anchorNode, selection.anchorOffset);
  const focus = sourceOffsetAtPoint(root, selection.focusNode, selection.focusOffset);
  return anchor === null || focus === null ? null : { anchor, focus };
}

function domPointAtOffset(root: HTMLElement, sourceOffset: number): DomPoint {
  let remaining = Math.max(0, Math.min(sourceOffset, root.textContent?.length ?? 0));
  const stack: Node[] = Array.from(root.childNodes).reverse();

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) break;
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) return { node, offset: remaining };
      remaining -= length;
      continue;
    }
    stack.push(...Array.from(node.childNodes).reverse());
  }

  return { node: root, offset: root.childNodes.length };
}

function restoreSelection(root: HTMLElement, offsets: SelectionOffsets): void {
  const selection = window.getSelection();
  if (!selection) return;
  const anchor = domPointAtOffset(root, offsets.anchor);
  const focus = domPointAtOffset(root, offsets.focus);
  selection.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
}

interface MarkdownQuoteProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export function MarkdownQuote({ value, onChange, ariaLabel }: MarkdownQuoteProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);
  const pendingSelectionRef = useRef<SelectionOffsets | null>(null);
  const caretRef = useRef<number | null>(null);
  const historyRef = useRef<EditorHistory>({ past: [], future: [] });
  const currentSnapshotRef = useRef<EditorSnapshot>({ value, selection: null });
  const [caret, setCaret] = useState<number | null>(null);

  const updateCaret = (next: number | null, offsets: SelectionOffsets | null = null) => {
    if (offsets) {
      currentSnapshotRef.current = { ...currentSnapshotRef.current, selection: offsets };
      pendingSelectionRef.current = offsets;
    }
    if (caretRef.current === next) return;
    caretRef.current = next;
    setCaret(next);
  };

  const commit = (editor: HTMLElement) => {
    const offsets = readSelection(editor);
    const nextValue = editor.textContent ?? "";
    const current = currentSnapshotRef.current;
    if (nextValue !== current.value) {
      historyRef.current = {
        past: [...historyRef.current.past, current].slice(-HISTORY_LIMIT),
        future: [],
      };
      currentSnapshotRef.current = { value: nextValue, selection: offsets };
    }
    if (offsets) updateCaret(offsets.focus, offsets);
    onChange(nextValue);
  };

  const applyHistory = (direction: HistoryDirection) => {
    const editor = editorRef.current;
    if (!editor) return;
    const liveSelection = readSelection(editor);
    const current: EditorSnapshot = {
      ...currentSnapshotRef.current,
      selection: liveSelection ?? currentSnapshotRef.current.selection,
    };
    const step = takeHistoryStep(historyRef.current, current, direction);
    if (!step) return;

    const targetSelection = step.snapshot.selection ?? {
      anchor: step.snapshot.value.length,
      focus: step.snapshot.value.length,
    };
    historyRef.current = step.history;
    currentSnapshotRef.current = { value: step.snapshot.value, selection: targetSelection };
    pendingSelectionRef.current = targetSelection;
    caretRef.current = targetSelection.focus;
    setCaret(targetSelection.focus);
    onChange(step.snapshot.value);
  };

  const handleHistoryKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (composingRef.current) return;
    const direction = historyDirectionForKey(event);
    if (!direction) return;
    event.preventDefault();
    applyHistory(direction);
  };

  // React 不管理根内 children；每次值/活动标记变化时由本组件原子重建，再恢复源码选区。
  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || composingRef.current) return;
    if (currentSnapshotRef.current.value !== value) {
      historyRef.current = { past: [], future: [] };
      currentSnapshotRef.current = { value, selection: null };
    }
    const pending = pendingSelectionRef.current;
    renderEditor(editor, value, caret);
    if (pending && document.activeElement === editor) {
      restoreSelection(editor, pending);
    }
    pendingSelectionRef.current = null;
  }, [value, caret]);

  useEffect(() => {
    const sync = () => {
      const editor = editorRef.current;
      if (!editor || document.activeElement !== editor) {
        updateCaret(null);
        return;
      }
      if (composingRef.current) return;
      const offsets = readSelection(editor);
      updateCaret(offsets?.focus ?? null, offsets);
    };
    document.addEventListener("selectionchange", sync);
    return () => document.removeEventListener("selectionchange", sync);
  }, []);

  return (
    <div
      ref={editorRef}
      className="edit quote md-quote"
      contentEditable
      role="textbox"
      aria-label={ariaLabel}
      spellCheck={false}
      onKeyDown={handleHistoryKeyDown}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={(event: CompositionEvent<HTMLDivElement>) => {
        composingRef.current = false;
        commit(event.currentTarget);
      }}
      onInput={(event: FormEvent<HTMLDivElement>) => {
        if (composingRef.current) return;
        commit(event.currentTarget);
      }}
    />
  );
}
