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
- 核心用户页面与内部开发调试页分别位于哪里
- 什么代码应该放在 `features/`，什么代码应该上提到顶层
- 当前哪些页面已经接入真实接口，哪些仍是静态展示层
- 当前学习消息链路已经细化到什么程度

---

## 2. 当前工程状态

当前仓库已经是一个可运行的 `Next.js 16.2.0 + React 19.2.4 + TypeScript 5.7.3 + Tailwind CSS 4.2 + shadcn/ui` 前端工程，并且已经接入同仓 `app/api` 与 Supabase。

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
- 运行时 OpenAPI 3.1 文档与 `/api-docs` Swagger UI 调试页
- 生产构建当前使用 `next build --webpack`
- `POST /api/learning/message` 已接入真实 SiliconFlow provider，并支持 JSON / SSE 双返回模式
- `/learn` 已优先消费结构化 `structuredContent`，消息展示按 `interactionType` 驱动，再按 `variant` 做次级细分

当前已可直接访问的用户端页面：

1. `/`：首页
2. `/login`：登录页
3. `/onboarding`：三步式新手引导页
4. `/learn`：学习页
5. `/map`：地图页
6. `/achievements`：成就页
7. `/history`：学习记录页

当前已可直接访问的管理端页面（Phase 1 + 用户运营 + 学习运营 + AI 运营 + 系统设置）：

8. `/admin/login`：管理员登录页
9. `/admin`：总览看板页
10. `/admin/users`：用户管理列表页（筛选、导出、行内编辑抽屉）
11. `/admin/users/[userId]`：用户详情页
12. `/admin/learning`：学习运营列表页（学习路径实例筛选、导出、详情跳转）
13. `/admin/learning/[pathId]`：学习路径详情页（时间线、步骤、最近会话、状态操作）
14. `/admin/ai`：AI 运营概览页
15. `/admin/ai/providers`：Provider 管理页
16. `/admin/ai/providers/[providerId]`：Provider 详情页
17. `/admin/ai/models`：Model 管理页
18. `/admin/ai/models/[modelId]`：Model 详情页
19. `/admin/ai/agents`：Agent 管理页
20. `/admin/ai/agents/[agentId]`：Agent 详情页
21. `/admin/ai/bindings`：命中规则页
22. `/admin/ai/skills`：Skill 管理页
23. `/admin/ai/invocations`：调用日志页
24. `/admin/ai/invocations/[invocationId]`：调用日志详情页
25. `/admin/ai/test`：AI 测试与命中预览页
26. `/admin/settings`：系统设置页
27. `/admin/feedback`：反馈工单列表页
28. `/admin/feedback/[id]`：反馈工单详情页

另外还有一个内部开发调试页：

29. `/api-docs`：Swagger UI 接口文档与调试面板

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
- `app/(workspace)/learn/page.tsx` -> `features/learning/pages/learn-page.tsx`
- `app/(workspace)/map/page.tsx` -> `features/progress/pages/map-page.tsx`
- `app/(workspace)/achievements/page.tsx` -> `features/achievement/pages/achievements-page.tsx`
- `app/(workspace)/history/page.tsx` -> `features/history/pages/history-page.tsx`
- `app/admin/(login)/login/page.tsx` -> `features/admin-shell/components/admin-login-form.tsx`
- `app/(admin-shell)/admin/page.tsx` -> `features/admin-dashboard/components/dashboard-page.tsx`
- `app/(admin-shell)/admin/users/page.tsx` -> `features/admin-users/components/user-list-page.tsx`
- `app/(admin-shell)/admin/users/[userId]/page.tsx` -> `features/admin-users/components/user-detail-page.tsx`
- `app/(admin-shell)/admin/learning/page.tsx` -> `features/admin-learning/components/learning-path-list-page.tsx`
- `app/(admin-shell)/admin/learning/[pathId]/page.tsx` -> `features/admin-learning/components/learning-path-detail-page.tsx`

规则：

- `app/` 不直接放复杂 JSX 结构
- `app/` 不直接放页面假数据
- `app/` 不直接放业务状态逻辑

### 3.2 `features/`

职责：

- 前端主工作目录
- 按业务域承载页面、局部组件、局部类型、局部假数据

当前业务域：

- `features/api-docs`
- `features/marketing`
- `features/auth`
- `features/onboarding`
- `features/learning`
- `features/progress`
- `features/achievement`
- `features/history`
- `features/admin-shell`
- `features/admin-dashboard`
- `features/admin-users`
- `features/admin-learning`
- `features/admin-ai`
- `features/admin-settings`
- `features/admin-feedback`

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
- `providers/workspace-sidebar-provider.tsx`

当前状态：

- `providers/app-providers.tsx` 当前承载全局包裹入口、`next-themes` 的 `ThemeProvider`（`attribute="class"`、`defaultTheme="dark"`、`storageKey="codetutor-theme"`）与 `Analytics`
- 工作台左侧栏共享数据缓存当前挂在 `app/(workspace)/layout.tsx`，由 `WorkspaceSidebarDataProvider` 仅覆盖工作台路由组
- 明暗切换入口：`components/layout/theme-toggle.tsx`（太阳/月亮），挂载在营销首页导航、登录页右上角、工作台 `DashboardSidebar` 底部设置行右侧
- 设计令牌：`app/globals.css` 中 `:root` 为浅色、`.dark` 为深色（与 `html` 上的 `dark` class 联动）
- 后续接入认证 Session、数据请求缓存等时，应继续在这里扩展

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
- `lib/auth/`：浏览器侧登录态恢复辅助
- `lib/learning/`：结构化学习消息等共用轻量工具
- `lib/mocks/`：仍需保留的局部 mock 数据
- `lib/supabase/`：浏览器端与服务端 Supabase client、环境变量和 Storage 约定
- `lib/profile/`：个人资料更新事件分发
- `lib/utils.ts`：基础通用工具

约束：

- `lib/` 适合放“被多个 feature 或前后端共同依赖”的基础能力
- 具体业务规则仍应放在 `features/` 或 `server/modules/`，不要把 `lib/` 演化成新的杂物目录

### 3.8 `hooks/`

职责：

- 预留跨 feature 通用 Hook 的放置位置

当前状态：

- 当前仓库里 `hooks/` 仍基本为空，尚未沉淀出稳定的顶层共享 Hook
- 若后续 Hook 只在单个 feature 内使用，优先放回对应 feature

### 3.9 `public/`

职责：

- 承载无需走构建产物编译的静态资源

当前内容：

- 应用图标
- 各学习工具 logo 资源

### 3.10 `docs/`

职责：

- 存放当前仍有效的持久化产品、架构、接口和设计文档

当前重点：

- `docs/plans/` 是后续接手项目时的权威阅读入口

---

## 4. 用户页面与内部调试页的代码位置

### 首页

- 路由入口：`app/page.tsx`
- 页面装配：`features/marketing/pages/landing-page.tsx`
- 页面数据：`features/marketing/data/marketing-content.ts`
- 页面组件：`features/marketing/components/*`
- 当前真实依赖：`features/marketing/providers/landing-auth-provider.tsx`、`GET /api/auth/session`
- 当前职责补充：已登录用户回到首页时，会恢复 Supabase 会话并把导航、Hero、套餐区、页脚与最终 CTA 切换为“继续学习”；目标路由由 `GET /api/auth/session` 统一返回 `/learn`、`/history` 或 `/onboarding`

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

- 路由入口：`app/(workspace)/learn/page.tsx`
- 页面装配：`features/learning/pages/learn-page.tsx`
- 当前真实依赖：`GET /api/learning/current-session`、`GET /api/learning/messages`、`POST /api/learning/message`、`POST /api/task/complete`、`POST /api/task/update-status`；自学模式下另依赖 `POST /api/learning/plan-from-material`、`POST /api/learning/plan-drafts/{id}/confirm`、`POST /api/learning/plan-drafts/{id}/regenerate`（入口组件 `features/learning/components/material-plan-panel.tsx`，仅当 `planSummary.selectionMode === "self_directed"` 时展示）
- 页面组件：`features/learning/components/*`
- 当前职责补充：若当前用户没有 `active` 学习计划，页面会根据 `/api/auth/session` 的真实 gate 状态自动跳转到 `/history` 或 `/onboarding`；“我完成了”和求助类动作已接入真实任务写接口；学习消息支持历史分页恢复、SSE 增量显示、`task_patch` 状态联动，以及 `interactionType` 级别的结构化消息展示

### 地图页

- 路由入口：`app/(workspace)/map/page.tsx`
- 页面装配：`features/progress/pages/map-page.tsx`
- 当前真实依赖：`GET /api/progress/current`、`GET /api/progress/map`
- 页面组件：`features/progress/components/*`
- 当前职责补充：若没有 `active` 学习计划，会自动按真实 gate 状态离开地图页，而不是停留错误空态

### 成就页

- 路由入口：`app/(workspace)/achievements/page.tsx`
- 页面装配：`features/achievement/pages/achievements-page.tsx`
- 当前真实依赖：`GET /api/achievement/summary`
- 页面组件：`features/achievement/components/*`
- 当前职责补充：无成长数据时，空态 CTA 会根据真实 gate 状态跳转到 `/history` 或 `/onboarding`

### 历史页

- 路由入口：`app/(workspace)/history/page.tsx`
- 页面装配：`features/history/pages/history-page.tsx`
- 当前真实依赖：`GET /api/history/recent`、`GET /api/history/[id]`、`POST /api/history/[id]/status`，侧栏 FAQ 仍为本地静态数据
- 页面组件：`features/history/components/*`
- 当前职责：展示历史学习计划列表，而不是最近对话消息列表；支持复盘详情、放弃当前计划、重新激活中断或已放弃计划、删除历史记录

### 管理员登录页

- 路由入口：`app/admin/(login)/login/page.tsx`
- 路由守卫：`app/admin/(login)/layout.tsx`
- 页面组件：`features/admin-shell/components/admin-login-form.tsx`
- 当前真实依赖：`POST /api/admin/auth/login`

### 管理后台总览页

- 路由入口：`app/(admin-shell)/admin/page.tsx`
- 路由守卫：`app/(admin-shell)/admin/layout.tsx`
- 页面装配：`features/admin-dashboard/components/dashboard-page.tsx`
- 当前真实依赖：`GET /api/admin/dashboard/overview`

### 管理后台用户管理页

- 路由入口：`app/(admin-shell)/admin/users/page.tsx`、`app/(admin-shell)/admin/users/[userId]/page.tsx`
- 页面装配：`features/admin-users/components/user-list-page.tsx`、`features/admin-users/components/user-detail-page.tsx`
- 当前真实依赖：`GET/PATCH /api/admin/users`、`GET /api/admin/users/export`、`GET /api/admin/users/{userId}`、`POST .../soft-delete`、`POST .../restore`；详情页另拉 `GET /api/admin/feedback?userId=...` 展示最近工单
- 页面组件：`features/admin-users/components/user-list.tsx`、`user-detail.tsx`、`user-edit-sheet.tsx` 等

### 管理后台学习运营页

- 路由入口：`app/(admin-shell)/admin/learning/page.tsx`、`app/(admin-shell)/admin/learning/[pathId]/page.tsx`
- 页面装配：`features/admin-learning/components/learning-path-list-page.tsx`、`features/admin-learning/components/learning-path-detail-page.tsx`
- 当前真实依赖：`GET /api/admin/learning-paths`、`GET /api/admin/learning-paths/export`、`GET /api/admin/learning-paths/{pathId}`、`POST /api/admin/learning-paths/{pathId}/status`
- 页面组件：`features/admin-learning/components/learning-path-list.tsx`、`learning-path-detail.tsx`
- 页面联动：
  - 列表页进入学习路径详情页
  - 详情页右侧展示用户快照，并可继续跳到 `/admin/users/[userId]`
  - 状态操作仅允许 `reactivate / archive`，统一走后台 API，而不是页面层直接改写

### 管理后台 AI 运营页

- 路由入口：
  `app/(admin-shell)/admin/ai/page.tsx`、
  `app/(admin-shell)/admin/ai/providers/page.tsx`、
  `app/(admin-shell)/admin/ai/providers/[providerId]/page.tsx`、
  `app/(admin-shell)/admin/ai/models/page.tsx`、
  `app/(admin-shell)/admin/ai/models/[modelId]/page.tsx`、
  `app/(admin-shell)/admin/ai/agents/page.tsx`、
  `app/(admin-shell)/admin/ai/agents/[agentId]/page.tsx`、
  `app/(admin-shell)/admin/ai/bindings/page.tsx`、
  `app/(admin-shell)/admin/ai/skills/page.tsx`、
  `app/(admin-shell)/admin/ai/invocations/page.tsx`、
  `app/(admin-shell)/admin/ai/invocations/[invocationId]/page.tsx`、
  `app/(admin-shell)/admin/ai/test/page.tsx`
- 页面装配：
  `features/admin-ai/components/ai-overview-page.tsx`、
  `provider-management-page.tsx`、
  `provider-detail-page.tsx`、
  `model-management-page.tsx`、
  `model-detail-page.tsx`、
  `agent-management-page.tsx`、
  `agent-detail-page.tsx`、
  `binding-management-page.tsx`、
  `skill-management-page.tsx`、
  `invocation-log-page.tsx`、
  `invocation-detail-page.tsx`、
  `ai-test-console-page.tsx`
- 当前真实依赖：
  `GET /api/admin/ai/overview`、
  `GET/POST/PATCH /api/admin/ai/providers*`、
  `GET/POST/PATCH /api/admin/ai/models*`、
  `GET/POST/PATCH /api/admin/ai/agents*`、
  `GET/POST/PATCH /api/admin/ai/agent-bindings*`、
  `GET /api/admin/ai/skills`、
  `GET/POST/PATCH /api/admin/ai/agent-skill-bindings*`、
  `GET /api/admin/ai/invocations`、
  `GET /api/admin/ai/invocations/{invocationId}`、
  `POST /api/admin/ai/resolve-preview`、
  `POST /api/admin/ai/agent/test`
- 页面组件：
  `features/admin-ai/components/ai-overview.tsx`、`provider-management.tsx`、`provider-detail.tsx`、`model-management.tsx`、`model-detail.tsx`、`agent-management.tsx`、`agent-detail.tsx`、`binding-management.tsx`、`skill-management.tsx`、`invocation-log.tsx`、`invocation-detail.tsx`、`ai-test-console.tsx`
- 页面联动：
  - Provider / Model / Agent / Invocation 采用“列表页 + 独立详情页”结构，新增与编辑通过抽屉完成，避免双栏长页布局。
  - AI 侧边栏子菜单与实际页面路由一致，当前 `AI 概览 / Provider 管理 / Model 管理 / Agent 管理 / 命中规则 / Skill 管理 / 调用日志 / 测试调试` 全部可点通。
  - 调用日志详情、Provider 详情、Model 详情、Agent 详情统一复用后台壳层、breadcrumb、管理员会话守卫与 BFF 错误处理。

### 管理后台系统设置页

- 路由入口：`app/(admin-shell)/admin/settings/page.tsx`
- 页面装配：`features/admin-settings/components/system-settings-page.tsx`
- 当前真实依赖：`GET /api/admin/settings/overview`、`GET /api/admin/settings/admin-accounts`、`POST /api/admin/settings/admin-accounts/{adminAccountId}/status`、`GET /api/admin/settings/audit-logs`
- 页面组件：`features/admin-settings/components/system-settings.tsx`
- 页面联动：
  - 页面内部按“我的资料 / 安全设置 / 管理员账号 / 角色权限 / 操作审计 / 系统信息”分 tab 展示。
  - 资料编辑与修改密码复用 `admin-shell` 域通用弹框组件，管理员账号启停操作统一写入审计。

### 管理后台反馈页

- 路由入口：`app/(admin-shell)/admin/feedback/page.tsx`、`app/(admin-shell)/admin/feedback/[id]/page.tsx`
- 页面装配：`features/admin-feedback/components/feedback-list-page.tsx`、`features/admin-feedback/components/feedback-detail-page.tsx`
- 当前真实依赖：`GET /api/admin/feedback`、`GET /api/admin/feedback/{id}`、`POST /api/admin/feedback/{id}/reply`、`POST /api/admin/feedback/{id}/status`

### 接口文档页

- 路由入口：`app/api-docs/page.tsx`
- 页面装配：`features/api-docs/pages/api-docs-page.tsx`
- 页面组件：`features/api-docs/components/swagger-api-viewer.tsx`
- 当前真实依赖：`GET /api/docs/openapi`、`GET /api/docs/swagger-ui-bundle`
- 当前职责：提供内部接口查看与调试面板，按标签分组展示接口，补充常见成功响应示例、错误说明、管理员接口调试提示和学习消息 SSE 调试说明
- 当前鉴权行为：页面受管理员登录态保护；未登录访问 `/api-docs` 会重定向到 `/admin/login?next=/api-docs`，登录成功后回跳；文档里的管理员接口按 `admin-auth`、`admin-dashboard`、`admin-profile`、`admin-feedback`、`admin-users`、`admin-learning` 等标签展示
- 当前实现边界：该页面消费的是运行时注册出来的 OpenAPI 文档；新增后端接口后，需要同步维护 `server/modules/api-docs/openapi.ts` 与 `server/modules/api-docs/schemas.ts`，这里才会一起更新

### 当前已接真实接口的跨页组件

- `components/layout/workspace-sidebar.tsx` / `components/layout/dashboard-sidebar.tsx`
  当前通过 `providers/workspace-sidebar-provider.tsx` 在根级缓存侧栏所需数据；首次优先读取 `/api/learning/current-session`，无 active session 时回退 `/api/profile/me`
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

- Session Provider
- Query Provider
- 其他全局 Provider

都应优先接入该入口，而不是散落在各页面中。（主题已通过 `next-themes` 接入 `AppProviders`。）

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
- 当前已经改为真实接口的数据主链路包括：登录、首页登录态恢复、用户资料、头像上传、onboarding、学习会话、地图、成就、历史计划管理、反馈

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
- 当前已通过 `app/(workspace)/layout.tsx` 为工作台左侧栏实现最小共享缓存，但还没有形成通用请求缓存体系
- 尚未形成系统性的前端自动化测试覆盖
- 通知设置、订阅模块、FAQ 仍是静态或占位实现
- 埋点写入与通知设置落库尚未接入真实后端
- 管理员后台当前已完成 Phase 1，并已落地用户运营、学习运营、AI 运营与系统设置；更深用户运营写能力、细粒度权限与 AI 深水区能力仍未开始

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

1. 继续把剩余静态模块切到真实接口，优先级依次为埋点事件、通知设置、订阅模块。
2. 为已接接口的高频页面补充页面级自动化测试或最小交互测试。
3. 在确认请求复杂度继续上升后，再评估是否引入 Query 缓存层，而不是过早全局化。
4. 继续推进管理员后台后续能力前，先保持用户侧与管理侧鉴权分流口径一致，避免两端状态判断逻辑漂移。（用户运营、学习运营、AI 运营与系统设置页面/API 已交付，新增后台域时继续遵守 `features/admin-*` 与 `server/modules/admin-*` 约定。）

如果后续目录与本说明出现偏差，应优先更新本文档，再继续扩展代码。
