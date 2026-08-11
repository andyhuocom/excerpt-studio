/**
 * [INPUT]: 无（纯数据）
 * [OUTPUT]: ImageTheme 类型，IMAGE_THEMES 预设，imageThemeCss()
 * [POS]: themes 模块的**图片背景**字典 = 卡片外框(导出图)的底色。直接复刻 ray.so(code) 的 14 套
 *        预设主题(140° 渐变 + 强调色点)，css 写入 --bg，供 .frame 底板消费。
 *        Dock 的 ThemeSelect 下拉消费之(命名+色点+搜索)；atoms 存选中 id，App 解析 css。
 * [SYNC]: 增删预设时同步 ThemeSelect 消费与 themes/CLAUDE.md 注册表边界。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface ImageTheme {
  id: string;
  /** 展示名，沿用 ray.so 英文名 */
  name: string;
  /** 140° 线性渐变，写入 --bg */
  css: string;
  /** 强调色，用作下拉里的色点与选中环 */
  dot: string;
}

// 复刻 ray.so 主题的背景渐变与强调色（raycast/ray-so，140deg）
export const IMAGE_THEMES: ImageTheme[] = [
  { id: "bitmap", name: "Bitmap", css: "linear-gradient(140deg, #881616, #F1393F)", dot: "#C90028" },
  { id: "noir", name: "Noir", css: "linear-gradient(140deg, #B1B1B1, #181818)", dot: "#666666" },
  { id: "ice", name: "Ice", css: "linear-gradient(140deg, #ffffff, #80deea)", dot: "#00B0E9" },
  { id: "sand", name: "Sand", css: "linear-gradient(140deg, #EED5B6, #AF8856)", dot: "#DA8744" },
  { id: "forest", name: "Forest", css: "linear-gradient(140deg, #506853, #213223)", dot: "#4B9442" },
  { id: "mono", name: "Mono", css: "linear-gradient(140deg, #333333, #181818)", dot: "#a7a7a7" },
  { id: "breeze", name: "Breeze", css: "linear-gradient(140deg, #CF2F98, #6A3DEC)", dot: "#C44170" },
  { id: "candy", name: "Candy", css: "linear-gradient(140deg, #A58EFB, #E9BFF8)", dot: "#DC155E" },
  { id: "crimson", name: "Crimson", css: "linear-gradient(140deg, #FF6363, #733434)", dot: "#BE3B3B" },
  { id: "falcon", name: "Falcon", css: "linear-gradient(140deg, #BDE3EC, #363654)", dot: "#5C827D" },
  { id: "meadow", name: "Meadow", css: "linear-gradient(140deg, #59D499, #A0872D)", dot: "#049649" },
  { id: "midnight", name: "Midnight", css: "linear-gradient(140deg, #4CC8C8, #202033)", dot: "#7DA9AB" },
  { id: "raindrop", name: "Raindrop", css: "linear-gradient(140deg, #8EC7FB, #1C55AA)", dot: "#008DAC" },
  { id: "sunset", name: "Sunset", css: "linear-gradient(140deg, #FFCF73, #FF7A2F)", dot: "#FFAF65" },
];

// 取选中图片主题的 css；未命中回落首个
export function imageThemeCss(id: string): string {
  return IMAGE_THEMES.find((t) => t.id === id)?.css ?? IMAGE_THEMES[0].css;
}
