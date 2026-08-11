/**
 * [INPUT]: qrcode 库；react 的 useEffect/useState
 * [OUTPUT]: QrCode 组件
 * [POS]: 卡片右下角二维码。用 qrcode 库把 value 编码成真实可扫的 SVG(黑模块、透明底)，
 *        白盒静默区由 .qr 容器按主题提供(见 studio.css 的主题化底衬)。异步生成，value 变则重绘。
 * [SYNC]: 变更编码参数时同步 studio.css 的 .qr 静默区与主题底衬。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value }: { value: string }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let alive = true;
    QRCode.toString(value || " ", {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#00000000" }, // 黑模块 + 透明底，白盒交给 .qr 容器
    })
      .then((s) => {
        if (alive) setSvg(s);
      })
      .catch(() => {
        if (alive) setSvg("");
      });
    return () => {
      alive = false;
    };
  }, [value]);

  return <div className="qr" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
