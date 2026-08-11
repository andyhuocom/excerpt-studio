# state/
> L2 | 父级: ../CLAUDE.md

全应用状态的单一事实来源(jotai)。组件读写这些 atom，不在组件里散养 state。

成员清单
atoms.ts: contentAtom(书摘正文与元数据；shareDate=全局共享摘录日期，null 跟随今天，全版式同源)、DEFAULT_CARD_WIDTH(卡片默认宽度常量，Stage 的「恢复默认宽度」按钮与 styleAtom 初值共用同一份)、styleAtom(版式/schemeByLayout 每版式配色/font 字体/quoteFontSize 正文字号 16|18|20|22/quoteFontWeight 正文粗细 400|500|600 全局统一且迁移时白名单收敛/图片背景/有背景/framePadding 外框留白/卡片宽度，以及八项跨版式共享显隐；章节仍受书名级联)、exportAtom(倍率/格式)、avatarAtom(头像库)。styleAtom 升 key excerpt.style.v12，并按 v11→v10 顺序迁移旧外观配置；contentAtom 持久化到 excerpt.content.v1，读取时用 normalizeContentState 把 shareDate 无条件归零为 null(重开永远跟随今天)，其余字段(正文/书名/章节/作者/二维码/署名/平台)正常跨会话保留，无历史 key 需迁移。
styleVisibility.ts: SharedVisibilityState 与默认全显值；migrateSharedVisibility 将 v10 的逐版式显隐记录收敛成共享布尔值，冲突时隐藏优先；createMigratingStyleStringStorage 按当前→v11→v10 顺序验证对象候选，语法/结构损坏值不会遮住更早的完好配置，较新候选写入失败也不会降级覆盖为旧状态；成功写入后才清理旧 key，reset 先逐项清旧 key，再删 current，任一阶段删除失败都写入默认态屏障阻止旧状态复活。
styleVisibility.test.mjs: 状态边界回归测试，覆盖共享布尔状态、v10 隐藏优先迁移、多代存储晋升/reset 生命周期、语法/结构损坏候选继续回退、写入失败不降级，以及 legacy/current 任一阶段重置清理失败时默认态屏障可跨重启生效。
typography.test.mjs: 正文排版设置契约测试，覆盖 400/500/600 三档、默认值与非法持久化值收敛、字体与粗细同行、App 写令牌及日历版式强化一级。
content.test.mjs: contentAtom 持久化契约测试，钉死其经 atomWithStorage 落盘 excerpt.content.v1(而非会话态 atom)、normalizeContentState 把 shareDate 归零晚于展开持久化值(不会被旧值覆盖)、损坏或非对象候选回退默认样例。
useAvatarLibrary.ts: 头像库行为封装(hook)。卡片头像位与 Dock 共用它读写 avatarAtom：upload 校验输入、居中裁剪为 ≤256px WebP 并限制编码长度后再入库；upload/select 共享单调意图序号，过期异步结果作废；解码、编码或持久化失败不落坏状态且不向事件处理器抛异常。current=selected??最新。
useAvailableFonts.ts: 字体可用性探测(hook)。在 themes.ts 的静态 FONTS 登记表之上叠一层运行时校验，用 canvas measureText 宽度对比法(非 document.fonts.check()——实测它对本地系统字体不可靠，见文件头注释)逐个探测 FontMeta.probe，探测不到的档位从 Dock 的字体选择器里剔除；同步返回，无需 loading 态；无 probe 的档位(San Francisco)恒可用。

法则: 成员完整·一行一文件·父级链接·技术词前置
同步约束: 增删字段时同步 ExcerptCard 渲染与 Dock 控件；改 style/avatar 形状即升对应存储 key。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
