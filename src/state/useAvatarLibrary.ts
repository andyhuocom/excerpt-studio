/**
 * [INPUT]: jotai 的 avatarAtom / MAX_AVATAR_HISTORY；浏览器 FileReader/Image/canvas
 * [OUTPUT]: useAvatarLibrary() → { current, history, selected, upload, select }；可测试的 prepareAvatarDataUrl / createLatestIntentGate
 * [POS]: 头像库的行为封装(单一事实来源)。卡片头像位(AvatarUpload)与 Dock 专属设置的头像组共用此 hook
 *        读写同一 avatarAtom：upload 校验文件后居中裁剪为 ≤256px WebP，并以编码长度上限守住 localStorage；
 *        upload/select 共用单调意图序号，过期异步结果不得覆盖后发生的选择。current = selected ?? 最新。
 *        解码/编码/持久化失败均不落坏状态，upload 返回失败原因而非把拒绝泄漏给事件处理器。
 * [SYNC]: 变更头像数据形状或压缩策略时同步 atoms.ts 的 AvatarState 与 Dock/AvatarUpload 消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useAtom } from "jotai";
import { avatarAtom, MAX_AVATAR_HISTORY } from "./atoms";

const AVATAR_MAX_PX = 256;
const AVATAR_MAX_FILE_BYTES = 20 * 1024 * 1024;
const AVATAR_MAX_DATA_URL_CHARS = 240_000;

export function createLatestIntentGate() {
  let latest = 0;
  return {
    begin: () => ++latest,
    isCurrent: (intent: number) => intent === latest,
  };
}

const avatarIntents = createLatestIntentGate();

export type AvatarUploadResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "stale" | "storage" };

// file → 居中正方形裁剪并缩放至 ≤AVATAR_MAX_PX 的 WebP dataURL(头像 1:1)。
// 任何一步失败都拒绝，绝不回退原图：容量闸门一旦可绕过，localStorage 就失去上限。
export function prepareAvatarDataUrl(file: File): Promise<string> {
  if ((file.type && !file.type.startsWith("image/")) || file.size > AVATAR_MAX_FILE_BYTES) {
    return Promise.reject(new Error("invalid avatar file"));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("avatar read failed"));
    reader.onload = () => {
      if (typeof reader.result !== "string") return reject(new Error("avatar read failed"));
      const raw = reader.result;
      const img = new Image();
      img.onerror = () => reject(new Error("avatar decode failed"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        if (!Number.isFinite(side) || side <= 0) return reject(new Error("avatar dimensions invalid"));
        const out = Math.min(side, AVATAR_MAX_PX);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = out;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("avatar canvas unavailable"));
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        try {
          ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
          const encoded = canvas.toDataURL("image/webp", 0.84);
          if (!encoded.startsWith("data:image/") || encoded.length > AVATAR_MAX_DATA_URL_CHARS) {
            return reject(new Error("avatar encoding too large"));
          }
          resolve(encoded);
        } catch (error) {
          reject(error);
        }
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

export function useAvatarLibrary() {
  const [lib, setLib] = useAtom(avatarAtom);
  const current = lib.selected ?? lib.history[lib.history.length - 1] ?? null;

  // 上传与历史选择竞争时，以最后一次用户意图为准；旧任务完成只能作废，不能篡改当前头像或历史顺序。
  const upload = async (file: File): Promise<AvatarUploadResult> => {
    const intent = avatarIntents.begin();
    let url: string;
    try {
      url = await prepareAvatarDataUrl(file);
    } catch {
      return { ok: false, reason: "invalid" };
    }

    if (!avatarIntents.isCurrent(intent)) return { ok: false, reason: "stale" };

    let previous = lib;
    try {
      setLib((state) => {
        previous = state;
        return {
          history: [...state.history.filter((item) => item !== url), url].slice(-MAX_AVATAR_HISTORY),
          selected: url,
        };
      });
      return { ok: true };
    } catch {
      // atomWithStorage 先改内存再写 localStorage；落盘失败必须把内存一并回滚，避免“本次看似成功、重启丢失”。
      try {
        setLib(previous);
      } catch {
        // previous 本来就是已持久化状态；若环境连回滚都拒绝，只能保持 upload 不再抛异常。
      }
      return { ok: false, reason: "storage" };
    }
  };

  const select = (url: string) => {
    avatarIntents.begin();
    if (url === current || !lib.history.includes(url)) return;
    try {
      setLib({ ...lib, selected: url });
    } catch {
      try {
        setLib(lib);
      } catch {
        // 与 upload 同理：不让同步存储异常逃逸到点击事件。
      }
    }
  };

  return { current, history: lib.history, selected: lib.selected, upload, select };
}
