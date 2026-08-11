# themes/
> L2 | 父级: ../CLAUDE.md

外观注册表(纯数据)。三轴正交：**版式**(结构)×**配色**(卡片颜色)×**图片背景**(外框)。样式实现不在此——
版式在 studio.css 以 `.stage[data-layout]` 承载结构；配色/图片背景为数据，App 写入 --c-*/--bg 令牌，CSS 只消费。

成员清单
themes.ts: LayoutId/FontId 类型 + LAYOUTS(五版式)/FONTS(十一档 macOS 系统字体，label 为下拉完整系统名，compactLabel 为与粗细同行的稳定短名，probe 供 useAvailableFonts 做 canvas 测宽探测；San Francisco 无 probe 恒可用，New York 无替代寻址通路故不登记)/AVATAR_LAYOUTS/NAME_LAYOUTS/CHAPTER_LAYOUTS/QR_LAYOUTS 结构能力注册表。
schemes.ts: SchemeId + SCHEMES(12 套配色, 色相/明度拉开无重复, 一套只定 bg/ink/dark, 余色由 ink 透明度阶梯派生) + resolveScheme(串)/deriveScheme(custom 底色按明暗自动配可读文字)。写入 --c-bg/ink/mut/faint/accent/qr。
backgrounds.ts: ImageTheme + IMAGE_THEMES(复刻 ray.so 14 主题, 140° 渐变+色点) + imageThemeCss(id)。css 写入 --bg，供 .frame 底板消费。

法则: 成员完整·一行一文件·父级链接·技术词前置
同步约束: 增删版式、配色或图片背景时同步 studio.css 的结构段或令牌消费点。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
