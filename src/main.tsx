/**
 * [INPUT]: 依赖 react 的 StrictMode、react-dom/client 的 createRoot、App 根组件与 index.css 全局样式入口
 * [OUTPUT]: 向 #root 挂载 React 应用的浏览器启动副作用
 * [POS]: src 前端边界的唯一启动入口，只负责装配运行时，不承载业务状态与交互逻辑
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
