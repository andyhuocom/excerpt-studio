/**
 * [INPUT]: node:test/assert、TypeScript transpileModule，以及 styleVisibility.ts/Dock.tsx/Stage.tsx 源码
 * [OUTPUT]: 对共享显隐默认值、多代容错迁移及组件共享字段接线提供回归保护
 * [POS]: styleVisibility 的状态边界测试，钉死“同语义配置跨版式共享”、隐藏优先升级策略、
 *        损坏候选继续回退与消费端不退化
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("./styleVisibility.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const dockSource = await readFile(new URL("../components/Dock.tsx", import.meta.url), "utf8");
const stageSource = await readFile(new URL("../components/Stage.tsx", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourceUrl.pathname,
}).outputText;
const visibility = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);

test("显隐配置以全局布尔值作为单一事实源", () => {
  assert.deepEqual(visibility.DEFAULT_SHARED_VISIBILITY, {
    showAvatar: true,
    showName: true,
    showDate: true,
    showTitle: true,
    showChapter: true,
    showAuthor: true,
    showBrand: true,
    showQr: true,
  });

  assert.equal(visibility.migrateSharedVisibility({ showQr: false }).showQr, false);
  assert.equal(visibility.migrateSharedVisibility({ showQr: true }).showQr, true);
});

test("v10 逐版式显隐迁移为共享值时隐藏优先", () => {
  const migrated = visibility.migrateSharedVisibility({
    showQrByLayout: { classic: false, calendar: true },
    showAvatarByLayout: { classic: true, handnote: true },
  });

  assert.equal(migrated.showQr, false);
  assert.equal(migrated.showAvatar, true);
});

test("Dock 与 Stage 只读写共享显隐字段", () => {
  assert.doesNotMatch(dockSource, /show(?:Avatar|Name|Date|Title|Chapter|Author|Brand|Qr)ByLayout/);
  assert.doesNotMatch(stageSource, /show(?:Avatar|Name|Date|Title|Chapter|Author|Brand|Qr)ByLayout/);

  for (const field of ["showAvatar", "showName", "showDate", "showTitle", "showChapter", "showAuthor", "showBrand", "showQr"]) {
    assert.match(dockSource, new RegExp(`style\\.${field}\\b`));
    assert.match(stageSource, new RegExp(`style\\.${field}\\b`));
  }
});

test("首次读取旧配置会原子晋升当前版本，重置时多代配置一并清理", () => {
  const values = new Map([
    ["excerpt.style.v10", JSON.stringify({ showQrByLayout: { classic: false, calendar: true } })],
  ]);
  const rawStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const storage = visibility.createMigratingStyleStringStorage(
    () => rawStorage,
    "excerpt.style.v12",
    ["excerpt.style.v11", "excerpt.style.v10"],
    visibility.migrateSharedVisibility,
  );

  const migrated = JSON.parse(storage.getItem("excerpt.style.v12"));
  assert.equal(migrated.showQr, false);
  assert.equal(values.has("excerpt.style.v10"), false);
  assert.equal(values.get("excerpt.style.v12"), JSON.stringify(migrated));

  storage.removeItem("excerpt.style.v12");
  assert.equal(values.has("excerpt.style.v12"), false);
  assert.equal(values.has("excerpt.style.v11"), false);
  assert.equal(values.has("excerpt.style.v10"), false);
});

test("损坏的新配置不会遮住更早但完好的旧配置", () => {
  const values = new Map([
    ["excerpt.style.v12", "{broken"],
    ["excerpt.style.v11", "{also-broken"],
    ["excerpt.style.v10", JSON.stringify({ showQrByLayout: { classic: false } })],
  ]);
  const rawStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const storage = visibility.createMigratingStyleStringStorage(
    () => rawStorage,
    "excerpt.style.v12",
    ["excerpt.style.v11", "excerpt.style.v10"],
    visibility.migrateSharedVisibility,
  );

  const migrated = JSON.parse(storage.getItem("excerpt.style.v12"));
  assert.equal(migrated.showQr, false);
  assert.equal(values.get("excerpt.style.v12"), JSON.stringify(migrated));
  assert.equal(values.has("excerpt.style.v11"), false);
  assert.equal(values.has("excerpt.style.v10"), false);
});

test("合法 JSON 但非对象的候选也会继续回退", () => {
  const scenarios = [
    new Map([
      ["excerpt.style.v12", "null"],
      ["excerpt.style.v11", JSON.stringify({ showBrand: false })],
    ]),
    new Map([
      ["excerpt.style.v11", "[]"],
      ["excerpt.style.v10", JSON.stringify({ showDateByLayout: { classic: false } })],
    ]),
  ];

  for (const values of scenarios) {
    const rawStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
    const storage = visibility.createMigratingStyleStringStorage(
      () => rawStorage,
      "excerpt.style.v12",
      ["excerpt.style.v11", "excerpt.style.v10"],
      visibility.migrateSharedVisibility,
    );

    const migrated = JSON.parse(storage.getItem("excerpt.style.v12"));
    assert.equal(migrated.showBrand === false || migrated.showDate === false, true);
  }
});

test("较新候选写入失败时不会降级覆盖为更旧状态", () => {
  const values = new Map([
    ["excerpt.style.v11", JSON.stringify({ showQr: false })],
    ["excerpt.style.v10", JSON.stringify({ showQrByLayout: { classic: true } })],
  ]);
  const rawStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: () => { throw new Error("quota"); },
    removeItem: (key) => values.delete(key),
  };
  const storage = visibility.createMigratingStyleStringStorage(
    () => rawStorage,
    "excerpt.style.v12",
    ["excerpt.style.v11", "excerpt.style.v10"],
    visibility.migrateSharedVisibility,
  );

  const migrated = JSON.parse(storage.getItem("excerpt.style.v12"));
  assert.equal(migrated.showQr, false);
  assert.equal(values.has("excerpt.style.v12"), false);
  assert.equal(values.has("excerpt.style.v11"), true);
  assert.equal(values.has("excerpt.style.v10"), true);
});

test("重置清理失败时继续清理其余旧 key，并写入默认态阻止旧状态复活", () => {
  const values = new Map([
    ["excerpt.style.v11", JSON.stringify({ showQr: false })],
    ["excerpt.style.v10", JSON.stringify({ showQrByLayout: { classic: true } })],
  ]);
  const attempts = [];
  const rawStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => {
      attempts.push(key);
      if (key === "excerpt.style.v11") throw new Error("blocked");
      values.delete(key);
    },
  };
  const storage = visibility.createMigratingStyleStringStorage(
    () => rawStorage,
    "excerpt.style.v12",
    ["excerpt.style.v11", "excerpt.style.v10"],
    visibility.migrateSharedVisibility,
  );

  assert.doesNotThrow(() => storage.removeItem("excerpt.style.v12"));
  assert.deepEqual(attempts, ["excerpt.style.v11", "excerpt.style.v10"]);
  assert.equal(values.has("excerpt.style.v12"), true);
  assert.equal(values.has("excerpt.style.v11"), true);
  assert.equal(values.has("excerpt.style.v10"), false);
  assert.equal(JSON.parse(values.get("excerpt.style.v12")).showQr, true);

  const reopened = JSON.parse(storage.getItem("excerpt.style.v12"));
  assert.equal(reopened.showQr, true);
});

test("当前 key 删除失败时用默认态覆盖，重启后不恢复旧配置", () => {
  const values = new Map([
    ["excerpt.style.v12", JSON.stringify({ showQr: false })],
    ["excerpt.style.v11", JSON.stringify({ showQr: false })],
  ]);
  const rawStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => {
      if (key === "excerpt.style.v12") throw new Error("blocked");
      values.delete(key);
    },
  };
  const storage = visibility.createMigratingStyleStringStorage(
    () => rawStorage,
    "excerpt.style.v12",
    ["excerpt.style.v11", "excerpt.style.v10"],
    visibility.migrateSharedVisibility,
  );

  assert.doesNotThrow(() => storage.removeItem("excerpt.style.v12"));
  assert.equal(values.has("excerpt.style.v11"), false);
  assert.equal(JSON.parse(values.get("excerpt.style.v12")).showQr, true);
  assert.equal(JSON.parse(storage.getItem("excerpt.style.v12")).showQr, true);
});
