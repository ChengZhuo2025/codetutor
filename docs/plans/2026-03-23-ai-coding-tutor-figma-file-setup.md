# AI编程学习教练 Figma 建稿清单与 Frame 目录结构

> 文档类型：Figma 建稿清单  
> 产品名称：AI编程学习教练  
> 版本：v1.0  
> 状态：初稿  
> 创建日期：2026-03-23  
> 关联文档：`docs/plans/2026-03-23-ai-coding-tutor-low-fidelity-wireframes.md`、`docs/plans/2026-03-23-ai-coding-tutor-ui-visual-design-spec.md`

---

## 1. 文档目标

本文档用于指导设计师在 Figma 中从 0 到 1 搭建本项目的设计文件，明确：

- Figma 文件应该怎么分层
- 每个 Page 下要放什么内容
- 每个核心页面要建哪些 Frame
- Frame 应如何命名
- 哪些状态必须单独出稿
- 组件库、样式库、标注区如何组织

目标是让设计文件结构清晰、可协作、可扩展、便于研发接入。

---

## 2. 建稿原则

### 2.1 先结构，后视觉

先搭文件骨架和页面目录，再开始画高保真稿，避免后期大量搬运。

### 2.2 页面与状态分开，不混在同一屏

常态、空态、加载态、报错态、完成态应拆成独立 Frame，不要把多个状态挤在一张长图里。

### 2.3 组件与业务页面分离

通用组件、样式 Token、页面稿、交付标注要放在不同 Page，避免高保真页面里混入大量组件草稿。

### 2.4 命名统一，方便检索

Figma 中所有 Page、Section、Frame、Component、Variant 命名统一使用同一套规则，便于搜索、交接和开发映射。

---

## 3. 推荐 Figma 文件结构

建议一个主文件完成 MVP 设计，文件名建议：

`AI Coding Tutor - MVP Product Design`

Figma Page 建议按以下顺序建立：

1. `00 Cover`
2. `01 Foundations`
3. `02 Components`
4. `03 Flows`
5. `04 Marketing`
6. `05 Onboarding`
7. `06 Learning Workspace`
8. `07 Progress & Growth`
9. `08 Overlays & States`
10. `09 Dev Handoff`
11. `99 Archive`

---

## 4. 各 Figma Page 说明

## 4.1 `00 Cover`

用途：

- 文件封面
- 项目说明
- 文档索引
- 当前版本记录

建议内容：

- 产品名
- 一句话定位
- 当前版本
- 更新时间
- 关联文档链接说明
- 文件目录导航

## 4.2 `01 Foundations`

用途：

- 设计基础规范

建议内容：

- 色彩系统
- 字体系统
- Grid / Spacing
- Radius / Shadow
- 图标风格
- 设计原则摘要

Section 建议：

- `Colors`
- `Typography`
- `Spacing`
- `Grid`
- `Radius & Shadow`
- `Icons`

## 4.3 `02 Components`

用途：

- 通用组件库

建议内容：

- 按钮
- 输入框
- 卡片
- 标签
- 导航
- 消息气泡
- 学分段位组件
- 路径节点组件
- 弹层组件

Section 建议：

- `Actions`
- `Inputs`
- `Navigation`
- `Cards`
- `Chat`
- `Progress`
- `Feedback`

## 4.4 `03 Flows`

用途：

- 关键用户流程总览

建议内容：

- 新用户首登流程
- 学习主流程
- 卡住求助流程
- 完成任务流程
- 恢复历史学习流程

Section 建议：

- `Onboarding Flow`
- `Learning Flow`
- `Help Flow`
- `Completion Flow`

## 4.5 `04 Marketing`

用途：

- 未登录营销页与转化页

建议内容：

- Landing Page
- Landing Page 关键状态

## 4.6 `05 Onboarding`

用途：

- 登录 / 注册
- 欢迎页
- 工具选择页

## 4.7 `06 Learning Workspace`

用途：

- 学习主界面及其核心状态

说明：

这是最重要的 Page，应作为 MVP 设计核心页。

## 4.8 `07 Progress & Growth`

用途：

- 闯关地图页
- 成就中心页
- 历史记录相关页面

## 4.9 `08 Overlays & States`

用途：

- 弹层
- Toast
- 空状态
- 加载状态
- 错误状态

## 4.10 `09 Dev Handoff`

用途：

- 研发标注稿
- 响应式说明
- 页面尺寸说明
- 组件使用映射

## 4.11 `99 Archive`

用途：

- 废弃稿
- 历史版本
- 备选方案

---

## 5. 命名规范

## 5.1 Page 命名

格式：

`序号 空格 名称`

示例：

- `04 Marketing`
- `06 Learning Workspace`

## 5.2 Section 命名

格式：

`模块类别 / 场景`

示例：

- `Landing / Hero`
- `Learning / Default`
- `Overlay / Completion`

## 5.3 Frame 命名

格式：

`页面-场景-状态-端`

示例：

- `Landing-Hero-Default-Desktop`
- `Auth-Login-Default-Desktop`
- `ToolSelect-Recommendation-Selected-Desktop`
- `Learning-Chat-InProgress-Desktop`
- `Learning-Chat-StuckHelp-Desktop`
- `Map-CurrentNode-Desktop`
- `Achievement-Default-Desktop`

## 5.4 Component 命名

格式：

`类别/组件名/变体`

示例：

- `Button/Primary/Default`
- `Button/Primary/Hover`
- `Card/Tool/Selected`
- `Tag/Status/InProgress`
- `ChatBubble/AI/Default`
- `Overlay/TaskCompletion/Default`

---

## 6. 建稿顺序建议

建议按以下顺序开稿：

1. `01 Foundations`
2. `02 Components`
3. `06 Learning Workspace`
4. `05 Onboarding`
5. `04 Marketing`
6. `07 Progress & Growth`
7. `08 Overlays & States`
8. `03 Flows`
9. `09 Dev Handoff`

原因：

- 学习主界面是产品核心
- 组件与基础规范先确定，能减少后续反复返工
- 营销页虽然重要，但依赖产品表达已经稳定

---

## 7. Page 级 Frame 目录

以下为建议直接在 Figma 中建立的 Frame 清单。

## 7.1 `04 Marketing`

### Section：`Landing / Desktop`

建议 Frame：

1. `Landing-Hero-Default-Desktop`
2. `Landing-Hero-Scrolled-Desktop`
3. `Landing-HowItWorks-Desktop`
4. `Landing-TargetUsers-Desktop`
5. `Landing-ToolEcosystem-Desktop`
6. `Landing-Benefits-Desktop`
7. `Landing-FinalCTA-Desktop`
8. `Landing-FullPage-Desktop`

### Section：`Landing / Responsive`

建议 Frame：

1. `Landing-FullPage-Tablet`
2. `Landing-FullPage-Mobile`

## 7.2 `05 Onboarding`

### Section：`Auth / Desktop`

建议 Frame：

1. `Auth-Login-Default-Desktop`
2. `Auth-Login-Loading-Desktop`
3. `Auth-Login-Error-Desktop`

### Section：`Welcome / Desktop`

建议 Frame：

1. `Welcome-Intro-Default-Desktop`

### Section：`ToolSelect / Desktop`

建议 Frame：

1. `ToolSelect-Default-Desktop`
2. `ToolSelect-LevelSelected-Desktop`
3. `ToolSelect-ToolSelected-Desktop`
4. `ToolSelect-Recommendation-Desktop`
5. `ToolSelect-Confirmed-Desktop`

### Section：`Onboarding / Responsive`

建议 Frame：

1. `Auth-Login-Mobile`
2. `ToolSelect-Mobile`

## 7.3 `06 Learning Workspace`

### Section：`Learning / Core`

建议 Frame：

1. `Learning-Chat-FirstVisit-Desktop`
2. `Learning-Chat-InProgress-Desktop`
3. `Learning-Chat-AIThinking-Desktop`
4. `Learning-Chat-TaskCompleted-Desktop`
5. `Learning-Chat-ResumeSession-Desktop`
6. `Learning-Chat-StuckHelp-Desktop`
7. `Learning-Chat-ParseError-Desktop`
8. `Learning-Chat-EmptyInputGuide-Desktop`

### Section：`Learning / Detail`

建议 Frame：

1. `Learning-RightPanel-CurrentStep-Desktop`
2. `Learning-RightPanel-ExpandedHints-Desktop`
3. `Learning-LeftNav-TaskProgress-Desktop`

### Section：`Learning / Responsive`

建议 Frame：

1. `Learning-Chat-Tablet`
2. `Learning-Chat-MobileViewOnly`

## 7.4 `07 Progress & Growth`

### Section：`Map / Desktop`

建议 Frame：

1. `Map-Default-Desktop`
2. `Map-CurrentNode-Desktop`
3. `Map-CompletedNode-Desktop`
4. `Map-LockedNode-Desktop`
5. `Map-NodeDetailPanel-Desktop`

### Section：`Achievement / Desktop`

建议 Frame：

1. `Achievement-Default-Desktop`
2. `Achievement-LowScore-Desktop`
3. `Achievement-RankUp-Desktop`

### Section：`History / Desktop`

建议 Frame：

1. `HistoryDrawer-Default-Desktop`
2. `HistoryDrawer-Empty-Desktop`

## 7.5 `08 Overlays & States`

### Section：`Overlay / Feedback`

建议 Frame：

1. `Overlay-TaskCompletion-Desktop`
2. `Overlay-DailyCheckIn-Desktop`
3. `Overlay-RankUp-Desktop`
4. `Overlay-StuckHelp-Desktop`

### Section：`Toast / System`

建议 Frame：

1. `Toast-Success-Desktop`
2. `Toast-Error-Desktop`
3. `Toast-Info-Desktop`

### Section：`State / Empty`

建议 Frame：

1. `State-Empty-NewUser-Desktop`
2. `State-Empty-NoHistory-Desktop`

### Section：`State / Error`

建议 Frame：

1. `State-Error-AIResponse-Desktop`
2. `State-Error-LinkParse-Desktop`
3. `State-Error-Login-Desktop`

---

## 8. `01 Foundations` 建稿清单

建议在 `01 Foundations` 中至少建立以下 Frame：

1. `Foundations-ColorPalette`
2. `Foundations-ColorUsage`
3. `Foundations-TypographyScale`
4. `Foundations-SpacingScale`
5. `Foundations-RadiusShadow`
6. `Foundations-GridDesktop`
7. `Foundations-GridTablet`
8. `Foundations-GridMobile`
9. `Foundations-IconStyle`

---

## 9. `02 Components` 建稿清单

建议建立以下组件组。

## 9.1 Actions

- `Button/Primary`
- `Button/Secondary`
- `Button/Text`
- `Button/Icon`

状态至少包含：

- Default
- Hover
- Pressed
- Disabled
- Loading

## 9.2 Inputs

- `Input/Text`
- `Input/Multiline`
- `Input/LinkPaste`
- `Input/CodePaste`

## 9.3 Navigation

- `Nav/TopBar`
- `Nav/SideMenuItem`
- `Nav/UserMenu`

## 9.4 Cards

- `Card/Tool`
- `Card/Achievement`
- `Card/History`
- `Card/ProgressSummary`

## 9.5 Chat

- `ChatBubble/AI`
- `ChatBubble/User`
- `ChatBubble/System`
- `QuickAction/Chip`

## 9.6 Progress

- `Tag/Status`
- `Badge/Score`
- `Badge/Rank`
- `ProgressBar/Learning`
- `Node/Map`

## 9.7 Feedback

- `Overlay/Completion`
- `Overlay/RankUp`
- `Overlay/StuckHelp`
- `Toast/System`

---

## 10. `03 Flows` 建稿清单

建议用连接线和注释整理 4 条核心流程。

## 10.1 新用户首次进入流程

`Landing -> Login -> Welcome -> Tool Select -> Learning First Visit`

## 10.2 日常学习流程

`Resume Session -> Current Task -> Ask AI -> Complete Task -> Next Step`

## 10.3 卡住求助流程

`Stuck Click -> Help Overlay -> Hint / Break Down / Example -> Back To Learning`

## 10.4 任务完成流程

`Complete Button -> Completion Overlay -> Score Update -> Next Step`

---

## 11. `09 Dev Handoff` 建稿清单

这一页是交付给研发最直接的页面。

建议包含：

1. 页面尺寸说明
2. 栅格与断点说明
3. 页面主组件映射
4. 间距标注
5. 字号与字重标注
6. 颜色 Token 对照
7. 组件状态说明
8. 交互注释

建议 Frame：

1. `Handoff-Breakpoints`
2. `Handoff-LayoutRules`
3. `Handoff-PageMapping`
4. `Handoff-ComponentMapping`
5. `Handoff-Tokens`

---

## 12. 组件与页面摆放建议

### 12.1 每个 Page 内的布局顺序

建议从左到右排列：

- 常态
- 关键交互态
- 异常态
- 响应式态

示例：

`Default -> Selected -> Loading -> Error -> Tablet -> Mobile`

### 12.2 Frame 间距建议

- 同一 Section 内 Frame 间距：160
- 不同 Section 间距：240

### 12.3 注释层建议

每个核心页面稿右侧保留注释区：

- 页面目标
- 关键交互
- 状态说明
- 开发注意点

---

## 13. 文件协作规范

### 13.1 版本规范

建议在 `00 Cover` 记录版本：

- `v0.1 信息结构`
- `v0.2 低保真`
- `v0.3 高保真`
- `v1.0 开发交付`

### 13.2 协作建议

- 产品只在注释区改需求，不直接改视觉组件
- 视觉调整优先在组件库中统一修改
- 废弃方案统一移动到 `99 Archive`

### 13.3 文件清洁要求

- 不保留大量未命名 Frame
- 不允许出现 `Rectangle 132` 这种无意义命名
- 临时草稿 24 小时内整理或归档

---

## 14. 首批必须出稿的 Frame

如果时间有限，建议优先完成以下 10 个 Frame：

1. `Landing-FullPage-Desktop`
2. `Auth-Login-Default-Desktop`
3. `ToolSelect-ToolSelected-Desktop`
4. `Learning-Chat-FirstVisit-Desktop`
5. `Learning-Chat-InProgress-Desktop`
6. `Learning-Chat-StuckHelp-Desktop`
7. `Learning-Chat-TaskCompleted-Desktop`
8. `Map-Default-Desktop`
9. `Achievement-Default-Desktop`
10. `Overlay-TaskCompletion-Desktop`

这 10 个 Frame 足够支撑首轮产品评审和视觉方向确认。

---

## 15. 结论

这份 Figma 建稿目录的核心价值，不是把文件分得很复杂，而是让整个项目从一开始就具备清晰的结构秩序。只要 Page、Section、Frame、Component 命名统一，页面状态拆分清楚，后续从产品评审到 UI 设计、再到研发交付都会顺很多。
