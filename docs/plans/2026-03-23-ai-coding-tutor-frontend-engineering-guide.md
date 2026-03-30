# AI编程学习教练 前端工程说明

> 文档类型：前端工程说明  
> 产品名称：AI编程学习教练  
> 版本：v1.1  
> 状态：已按当前代码实现同步  
> 创建日期：2026-03-23  
> 关联文档：`docs/plans/2026-03-23-ai-coding-tutor-prd.md`、`docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`

---

## 1. 文档目标

本文档用于说明当前仓库中前端工程的真实落地结构、目录职责、模块边界和开发约定，方便后续继续迭代时快速定位代码，不再反复阅读历史重构过程。

本说明以当前仓库实际代码为准，不重复描述理想态设计，而是回答以下问题：

- 当前前端工程已经整理到什么程度
- 顶层目录分别负责什么
- 七个页面分别位于哪里
- 什么代码应该放在 `features/`，什么代码应该上提到顶层
- 当前哪些页面已经接入真实接口，哪些仍是静态展示层

---

## 2. 当前工程状态

当前仓库已经是一个可运行的 `Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui` 前端工程，并且已经接入同仓 `app/api` 与 Supabase。

当前已具备：

- `app/` 路由入口
- `app/api/` BFF Route Handlers
- `features/` 业务域代码
- `components/ui` 共享 UI 组件
- `components/layout` 共享布局组件
- `constants/` 顶层常量
- `lib/api` 接口客户端与契约
- `lib/supabase` 浏览器端 / 服务端 Supabase 封装
- `providers/` 全局 Provider 入口
- `types/` 顶层共享类型

当前已可直接访问的页面：

1. `/`：首页
2. `/login`：登录页
3. `/onboarding`：三步式新手引导页
4. `/learn`：学习页
5. `/map`：地图页
6. `/achievements`：成就页
7. `/history`：学习记录页

---

## 3. 顶层目录职责

当前前端目录建议按以下理解使用：

```text
app/
components/
constants/
docs/
features/
hooks/
lib/
providers/
public/
types/
```

### 3.1 `app/`

职责：

- 只作为 Next.js App Router 的路由入口
- 页面文件只做极薄装配，不承载业务实现

当前示例：

- `app/page.tsx` -> `features/marketing/pages/landing-page.tsx`
- `app/login/page.tsx` -> `features/auth/pages/login-page.tsx`
- `app/onboarding/page.tsx` -> `features/onboarding/pages/onboarding-page.tsx`
- `app/learn/page.tsx` -> `features/learning/pages/learn-page.tsx`
- `app/map/page.tsx` -> `features/progress/pages/map-page.tsx`
- `app/achievements/page.tsx` -> `features/achievement/pages/achievements-page.tsx`

规则：

- `app/` 不直接放复杂 JSX 结构
- `app/` 不直接放页面假数据
- `app/` 不直接放业务状态逻辑

### 3.2 `features/`

职责：

- 前端主工作目录
- 按业务域承载页面、局部组件、局部类型、局部假数据

当前业务域：

- `features/marketing`
- `features/auth`
- `features/onboarding`
- `features/learning`
- `features/progress`
- `features/achievement`
- `features/history`

每个业务域当前大致采用如下结构：

```text
features/<domain>/
├── components/
├── data/
├── pages/
└── types.ts
```

说明：

- `components/` 放只在该业务域内使用的组件
- `data/` 放当前阶段的静态假数据、展示配置、局部常量
- `pages/` 放该业务域的页面装配层
- `types.ts` 放该业务域自己的类型

### 3.3 `components/`

职责：

- 真正跨业务域共享的组件

当前拆分：

- `components/ui`：shadcn/ui 和基础通用 UI
- `components/layout`：布局类组件

当前示例：

- `components/layout/dashboard-sidebar.tsx`
- `components/ui/settings-popover.tsx`

规则：

- 只有跨多个 feature 复用的组件才进入 `components/`
- 如果组件只被一个 feature 使用，应优先放回对应 `features/<domain>/components`

### 3.4 `constants/`

职责：

- 放跨 feature 复用的顶层常量和全局配置

当前内容：

- `constants/app.ts`：应用名、版本、标题、描述、语言
- `constants/routes.ts`：页面路由、营销锚点
- `constants/navigation.ts`：公共导航配置生成函数

适合放这里的内容：

- 应用级元信息
- 统一路由常量
- 全局导航项
- 跨 feature 的枚举或固定字符串

不适合放这里的内容：

- 某个页面单独使用的静态卡片数据
- 只在单个 feature 内使用的配置

### 3.5 `providers/`

职责：

- 放全局 Provider 入口

当前内容：

- `providers/app-providers.tsx`

当前状态：

- 目前这里只统一承载了全局包裹入口和 `Analytics`
- 后续接入主题、认证 Session、数据请求缓存时，应继续在这里扩展

### 3.6 `types/`

职责：

- 放跨 feature 共用的类型定义

当前内容：

- `types/navigation.ts`

适合放这里的内容：

- 通用导航类型
- 全局 API 响应基础类型
- 跨 feature 共用的数据结构

如果类型只被一个业务域使用，优先放在对应 feature 的 `types.ts`

### 3.7 `lib/`

职责：

- 放前后端共享的轻量基础能力

当前内容重点包括：

- `lib/api/`：接口契约、浏览器端请求封装、基础响应类型
- `lib/supabase/`：浏览器端与服务端 Supabase client、环境变量和 Storage 约定
- `lib/profile/`：个人资料更新事件分发

约束：

- `lib/` 适合放“被多个 feature 或前后端共同依赖”的基础能力
- 具体业务规则仍应放在 `features/` 或 `server/modules/`，不要把 `lib/` 演化成新的杂物目录

---

## 4. 七个页面的代码位置

### 首页

- 路由入口：`app/page.tsx`
- 页面装配：`features/marketing/pages/landing-page.tsx`
- 页面数据：`features/marketing/data/marketing-content.ts`
- 页面组件：`features/marketing/components/*`

### 登录页

- 路由入口：`app/login/page.tsx`
- 页面装配：`features/auth/pages/login-page.tsx`
- 当前真实依赖：Supabase Auth 短信 OTP、微信 OAuth 跳转、`POST /api/auth/login`
- 页面组件：`features/auth/components/*`

### 工具选择页

- 路由入口：`app/onboarding/page.tsx`
- 页面装配：`features/onboarding/pages/onboarding-page.tsx`
- 当前真实依赖：`GET /api/onboarding/tools`、`GET /api/onboarding/path-options`、`POST /api/onboarding/complete`
- 页面组件：`features/onboarding/components/*`
- 当前职责：承载“主工具选择 -> 当前水平确认 -> 起始训练路线选择”的三步流程

### 学习页

- 路由入口：`app/learn/page.tsx`
- 页面装配：`features/learning/pages/learn-page.tsx`
- 当前真实依赖：`GET /api/learning/current-session`、`POST /api/learning/message`
- 页面组件：`features/learning/components/*`

### 地图页

- 路由入口：`app/map/page.tsx`
- 页面装配：`features/progress/pages/map-page.tsx`
- 当前真实依赖：`GET /api/progress/current`、`GET /api/progress/map`
- 页面组件：`features/progress/components/*`

### 成就页

- 路由入口：`app/achievements/page.tsx`
- 页面装配：`features/achievement/pages/achievements-page.tsx`
- 当前真实依赖：`GET /api/achievement/summary`
- 页面组件：`features/achievement/components/*`

### 历史页

- 路由入口：`app/history/page.tsx`
- 页面装配：`features/history/pages/history-page.tsx`
- 当前真实依赖：`GET /api/history/recent`，侧栏 FAQ 仍为本地静态数据
- 页面组件：`features/history/components/*`
- 当前职责：展示历史学习计划列表，而不是最近对话消息列表

### 当前已接真实接口的跨页组件

- `components/layout/dashboard-sidebar.tsx`
  当前会读取 `/api/learning/current-session` 或 `/api/profile/me`
- `components/layout/profile-edit-dialog.tsx`
  当前会读取和更新 `/api/profile/me`，并通过 `/api/profile/avatar` 上传头像
- `components/layout/feedback-dialog.tsx`
  当前会读取和写入 `/api/feedback`、`/api/feedback/mine`，支持查看反馈记录与回复

---

## 5. 当前公共层的使用方式

### 5.1 应用元信息

统一放在：

- `constants/app.ts`

当前已用于：

- `app/layout.tsx`
- `components/layout/dashboard-sidebar.tsx`
- `components/ui/settings-popover.tsx`
- 多个 feature 中的品牌文案显示

### 5.2 路由常量

统一放在：

- `constants/routes.ts`

目的：

- 避免页面内反复硬编码 `/login`、`/learn`、`/map` 等字符串

当前已用于：

- 登录、Onboarding、地图、营销导航等跳转逻辑

### 5.3 导航配置

统一放在：

- `constants/navigation.ts`

当前已提供：

- 营销页导航项
- 应用页侧边导航项生成函数

目的：

- 避免 `map`、`achievement`、`learning` 等页面重复维护相同导航配置

### 5.4 全局 Provider

统一入口：

- `providers/app-providers.tsx`

当前由：

- `app/layout.tsx`

负责包裹。

后续如需接入：

- 主题 Provider
- Session Provider
- Query Provider
- 埋点 Provider

都应优先接入该入口，而不是散落在各页面中。

当前事件追踪约定：

- 事件名统一放在 `constants/events.ts`
- 页面和组件通过 `useAppEventTracker()` 触发事件
- 当前仅保留前端事件常量与浏览器 `CustomEvent` 分发，不额外引入新的埋点平台
- 当前已覆盖：
  - Landing CTA
  - 登录提交
  - 工具选择提交
  - 学习输入发送
  - 快捷帮助操作
  - 地图关卡点击
  - 成就页关键 CTA

---

## 6. 开发约定

### 6.1 新增页面时

应按以下顺序创建：

1. 在 `features/<domain>/pages/` 下创建页面装配文件
2. 在 `features/<domain>/components/` 下拆页面内部组件
3. 在 `features/<domain>/data/` 下放静态展示数据
4. 在 `app/<route>/page.tsx` 中仅保留薄路由封装

### 6.2 新增共享组件时

判断规则：

- 只被一个业务域使用：放入对应 `features/<domain>/components`
- 被多个业务域复用：放入 `components/`

### 6.3 新增常量时

判断规则：

- 只在单个 feature 内使用：放在该 feature 的 `data/`
- 多个 feature 复用：放在 `constants/`

### 6.4 新增类型时

判断规则：

- 仅服务单个业务域：放 `features/<domain>/types.ts`
- 跨业务域共享：放 `types/`

### 6.5 页面文案和静态数据

当前项目已经接入一批真实接口，但并不是所有展示块都来自后端。

约定：

- 静态展示数据优先放到对应 feature 的 `data/`
- 不要把长数据对象直接写在页面 JSX 文件里
- 当前仍然保留静态的内容主要包括：营销页内容、FAQ、订阅占位、通知设置默认值、部分成就页本地图标/段位展示配置
- 当前已经改为真实接口的数据主链路包括：登录、用户资料、头像上传、onboarding、学习会话、地图、成就、历史、反馈

### 6.6 统一反馈态

当前统一反馈态组件位于：

- `components/ui/state-panel.tsx`

当前统一 section 包装组件位于：

- `components/ui/page-section.tsx`

使用约定：

- `loading / empty / error / success` 四类状态优先复用 `StatePanel`
- 需要统一标题、描述、右上角动作时，优先使用 `PageSection`
- 页面级兜底状态优先在 feature 的 `pages/` 中处理
- 组件级空态和局部错误态优先在对应 feature 组件中处理

---

## 7. 当前限制与边界

当前前端工程已经完成主要页面和核心接口接入，但仍有以下边界需要明确：

- 尚未引入 React Query / SWR 一类的数据请求缓存层
- 尚未形成系统性的前端自动化测试覆盖
- 通知设置、订阅模块、FAQ 仍是静态或占位实现
- 管理员后台前端页面尚未开始
- 任务完成写接口、每日打卡、埋点写入等链路尚未接入到当前页面主流程

因此，当前阶段的目标仍然是：

- 保持页面结构清晰
- 在不引入重型状态层的前提下继续扩展真实接口覆盖
- 让未来新增接口和后台页面时无需再次大规模搬迁目录

---

## 8. 前端人工验收矩阵

当前 7 个页面至少按以下矩阵做人工检查：

| 页面 | 桌面 | 平板 | 手机 | 空状态 | 交互态 |
| --- | --- | --- | --- | --- | --- |
| `/` 首页 | 首屏 CTA、模块节奏、导航吸顶正常 | Hero 与模块间距不拥挤 | CTA、导航、定价区可滚动浏览 | 不要求页面级空态 | 顶部 CTA、锚点跳转、首屏滚动反馈正常 |
| `/login` 登录页 | 左右双栏平衡，品牌区与表单区层级清晰 | 品牌信息不压缩到不可读 | 单栏表单可完整操作 | 验证码待发送、发送中、已发送状态可见 | tab 切换、模式切换、发送验证码、提交按钮禁用态正常 |
| `/onboarding` 新手引导页 | 三步流程切换顺畅，工具/水平/路线层级清晰 | 自学模式与平台路径分区明确，步骤头清晰 | 卡片、按钮、返回操作可单手完成 | 未完成当前步骤时主 CTA 保持禁用；无平台路径时自学模式仍可用 | 工具选中、步骤切换、修改上一步后路线重算、完成引导正常 |
| `/learn` 学习页 | 三栏或主内容 + 辅助区层级明确 | 右侧上下文以抽屉或辅助区方式可达 | 主聊天区优先，输入区和快捷操作可达 | 消息区 reconnect / error / empty 与右侧任务空态可见 | 发送消息、快捷帮助、图片预览、重试发送正常 |
| `/map` 地图页 | 关卡地图、详情面板、继续学习 CTA 连贯 | 路径列表与详情切换不割裂 | 主地图滚动和关卡点击可用 | 无关卡数据时页面级空态可见 | 点击关卡、切换工具、从地图返回学习页正常 |
| `/achievements` 成就页 | 段位卡、统计、徽章、打卡和侧栏节奏清晰 | 主内容与侧栏权重仍清楚 | 主要 CTA、统计卡和徽章卡片可顺序浏览 | 无成长数据、无徽章、无 XP 流水时有统一空态 | 继续学习、打开地图、浏览徽章与打卡记录正常 |
| `/history` 历史页 | 列表信息层级清晰，状态标签、进度和 XP 不混乱 | 列表卡片与 FAQ 侧栏不互抢注意力 | 卡片可纵向连续浏览，筛选和按钮可点击 | 无学习记录时页面级空态可见 | 查看进行中/已完成/已放弃计划的视觉区分准确 |

建议手动检查断点：

- 1440px
- 1024px
- 768px
- 390px

每次执行较大前端修改后，至少重新运行：

- `pnpm lint`
- `pnpm build`

## 9. 后续开发建议

结合当前代码现状，前端下一步建议按以下顺序推进：

1. 继续把剩余静态模块切到真实接口，优先级依次为任务完成写接口、每日打卡、埋点事件、通知设置。
2. 为已接接口的高频页面补充页面级自动化测试或最小交互测试。
3. 在确认请求复杂度继续上升后，再评估是否引入 Query 缓存层，而不是过早全局化。
4. 管理员后台开始前，先把用户侧 read model 稳定下来，避免后台列表和用户页使用两套口径。

如果后续目录与本说明出现偏差，应优先更新本文档，再继续扩展代码。
