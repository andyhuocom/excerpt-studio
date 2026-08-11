/**
 * [INPUT]: node:test/assert，以及 atoms.ts 源码
 * [OUTPUT]: 对 contentAtom 持久化(excerpt.content.v1)与 shareDate 归零语义提供回归保护
 * [POS]: state 的正文持久化契约测试，钉死"正文/书名/章节/作者等字段跨会话保留，
 *        但 shareDate 无条件归零跟随今天"这一行为，防止误改回会话态或误持久化 shareDate
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const atoms = await readFile(new URL("./atoms.ts", import.meta.url), "utf8");

test("contentAtom 通过 atomWithStorage 持久化到 excerpt.content.v1，而非会话态 atom", () => {
  assert.match(atoms, /export const contentAtom = atomWithStorage<ExcerptContent>\(\s*CONTENT_STORAGE_KEY/);
  assert.match(atoms, /CONTENT_STORAGE_KEY = "excerpt\.content\.v1"/);
  assert.doesNotMatch(atoms, /export const contentAtom = atom<ExcerptContent>/);
});

test("normalizeContentState 无条件把 shareDate 归零为 null，且晚于展开持久化值", () => {
  assert.match(
    atoms,
    /\.\.\.DEFAULT_CONTENT_STATE,\s*\.\.\.\(value as Partial<ExcerptContent>\),\s*shareDate:\s*null/,
  );
});

test("损坏或非对象的持久化值回退到默认样例，而不是崩溃或呈现半份内容", () => {
  assert.match(
    atoms,
    /if \(!value \|\| typeof value !== "object" \|\| Array\.isArray\(value\)\) return DEFAULT_CONTENT_STATE;/,
  );
});
