/**
 * [INPUT]: state 的 useAvatarLibrary(读当前头像 / 上传)；react useRef
 * [OUTPUT]: AvatarUpload 组件(无 props)
 * [POS]: 卡片头像位。点击弹文件框选图 → useAvatarLibrary.upload(缩放入库并设为当前)。显示当前头像，
 *        无图时默认渐变+心形占位，随卡片被 html-to-image 内嵌进导出图。头像库(历史/选择/持久化)集中在
 *        useAvatarLibrary；此处只管卡片上的显示与点击上传，与 Dock 专属设置的头像组共用同一库。
 * [SYNC]: 变更头像处理时同步 useAvatarLibrary 与 Dock 专属设置的头像组。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useRef } from "react";
import type { ChangeEvent } from "react";
import { useAvatarLibrary } from "@/state/useAvatarLibrary";

export function AvatarUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { current, upload } = useAvatarLibrary();

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    e.target.value = "";
  };

  return (
    <div
      className="avatar"
      style={current ? { backgroundImage: `url(${current})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      onClick={() => inputRef.current?.click()}
      title="点击更换头像（1:1）"
    >
      {!current && (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" aria-hidden="true">
          <path d="M12 21s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 3.7C19 16.6 12 21 12 21z" fill="rgba(255,255,255,.25)" />
        </svg>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} data-no-export />
    </div>
  );
}
