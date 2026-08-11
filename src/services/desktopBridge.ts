/**
 * [INPUT]: @tauri-apps/api/core 的 invoke
 * [OUTPUT]: isDesktop / savePng / revealPath / downloadBlob / SaveResult
 * [POS]: 前端与 Tauri Rust 命令之间唯一的桥。桌面态走原生保存对话框(save_png)，
 *        浏览器态降级为 <a download>。render/exportImage 只经此模块落盘，不直接 invoke。
 * [SYNC]: 新增原生能力时同步本桥接层、src-tauri/src/main.rs 命令与 capabilities。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { invoke } from "@tauri-apps/api/core";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export interface SaveResult {
  ok: boolean;
  path?: string;
  cancelled?: boolean;
  error?: string;
}

export function isDesktop(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

// 浏览器降级：触发一次下载
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 桌面态弹原生对话框写盘；浏览器态直接下载
export async function savePng(blob: Blob, fileName: string): Promise<SaveResult> {
  if (!isDesktop()) {
    downloadBlob(blob, fileName);
    return { ok: true };
  }
  const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
  const path = await invoke<string | null>("save_png", { bytes, defaultName: fileName });
  if (path === null) return { ok: false, cancelled: true };
  return { ok: true, path };
}

export async function revealPath(path: string): Promise<void> {
  if (!isDesktop()) return;
  await invoke("reveal_path", { path });
}
