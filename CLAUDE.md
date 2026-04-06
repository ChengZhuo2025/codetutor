# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AI编程学习教练 - 一个面向中文用户的 AI 编程学习陪练产品，核心价值在于把零散教程、视频、代码片段和学习资料转化为可执行、可追踪、可反馈的学习过程。

**快速了解项目：**
- 先阅读 `docs/plans/README.md`
- 再按其中的推荐顺序查看 PRD、页面原型、前端工程说明、技术架构、API/数据库/后端设计文档

**技术栈：**
- 前端：Next.js 16.2.0 + React 19.2.4 + TypeScript 5.7.3 + Tailwind CSS 4.2 + shadcn/ui
- 后端：Next.js API Routes（BFF 入口层 + `server/modules` 服务层）
- 数据库：阿里云 AnalyticDB PostgreSQL 版 Supabase（已接入，含迁移与远程库）
- 文件存储：Supabase Storage（已用于头像上传）
- AI 服务：外部 AI provider 抽象层（当前首阶段已接通真实 provider 编排链路与 SSE 流式输出；现阶段主接入为硅基流动，详见 `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`）
- 部署：Vercel（规划）
- 本地验证环境：`Node.js 22.18.0`

## 常用开发命令

```bash
# 开发服务器
pnpm dev

# 生产构建
pnpm build

# 运行生产服务器
pnpm start

# 代码检查
pnpm lint
```

## 项目架构

### 目录结构

```
app/                    # Next.js App Router 路由入口（薄层装配）和 API 路由
components/             # 跨业务域共享组件
  ├── ui/              # shadcn/ui 和基础通用 UI
  └── layout/          # 布局类组件
constants/             # 跨 feature 复用的顶层常量和全局配置
docs/                  # 项目文档和设计文档
features/              # 前端主工作目录，按业务域组织
  ├── marketing/       # 营销页
  ├── auth/           # 登录认证
  ├── onboarding/     # 新手引导/工具选择
  ├── learning/       # AI 导师学习页
  ├── progress/       # 学习地图/进度
  ├── achievement/    # 成就/段位系统
  ├── history/        # 历史学习计划页
  ├── api-docs/       # Swagger UI API 文档页
  ├── admin-shell/    # 管理后台壳层（布局、侧边栏、头部）
  ├── admin-dashboard/ # 管理后台看板
  ├── admin-users/    # 管理后台用户运营（列表、详情、导出、资料编辑）
  ├── admin-learning/ # 管理后台学习运营（路径列表、详情、状态操作）
  ├── admin-ai/       # 管理后台 AI 运营（概览、Provider/Model/Agent、规则、日志、测试）
  ├── admin-settings/ # 管理后台系统设置（资料、安全、管理员账号、审计）
  └── admin-feedback/ # 管理后台反馈工单
hooks/                 # 自定义 React Hooks
lib/                   # 工具函数、API 契约与 mock client
server/                # 服务端逻辑
  ├── lib/            # 服务端通用库（请求校验、统一响应、错误映射、Supabase 客户端）
  └── modules/        # 按域划分的业务服务层
    ├── auth/         # 认证域
    ├── learning/     # AI 学习域
    ├── tasks/        # 任务域
    ├── gamification/ # 成长/段位域
    ├── checkins/     # 打卡域
    ├── achievement/  # 成就域
    ├── progress/    # 地图/进度域
    ├── onboarding/   # onboarding 域
    ├── history/      # 历史学习计划域
    ├── feedback/     # 反馈域
    ├── admin-auth/   # 管理员认证域
    ├── admin-dashboard/ # 管理员看板域
    ├── admin-users/  # 管理员用户运营域
    ├── admin-learning/ # 管理员学习运营域
    ├── admin-ai/     # 管理员 AI 运营域
    ├── admin-settings/ # 管理员系统设置域
    └── api-docs/     # OpenAPI 文档注册
supabase/              # 数据库迁移与相关 SQL
providers/            # 全局 Provider 入口
types/                # 跨 feature 共用的类型定义
```

### 页面路由

| 路由 | 页面 | 实现位置 |
|------|------|---------|
| `/` | 首页 | `features/marketing/pages/landing-page.tsx` |
| `/login` | 登录页 | `features/auth/pages/login-page.tsx` |
| `/onboarding` | 工具选择页 | `features/onboarding/pages/onboarding-page.tsx` |
| `/learn` | 学习页 | `features/learning/pages/learn-page.tsx` |
| `/map` | 地图页 | `features/progress/pages/map-page.tsx` |
| `/achievements` | 成就页 | `features/achievement/pages/achievements-page.tsx` |
| `/history` | 历史学习页 | `features/history/pages/history-page.tsx` |
| `/api-docs` | Swagger UI API 文档 | `features/api-docs/pages/api-docs-page.tsx` |
| `/admin` | 管理后台看板 | `features/admin-dashboard/components/dashboard-page.tsx` |
| `/admin/users` | 用户管理列表 | `features/admin-users/components/user-list-page.tsx` |
| `/admin/users/[userId]` | 用户详情 | `features/admin-users/components/user-detail-page.tsx` |
| `/admin/learning` | 学习运营列表 | `features/admin-learning/components/learning-path-list-page.tsx` |
| `/admin/learning/[pathId]` | 学习路径详情 | `features/admin-learning/components/learning-path-detail-page.tsx` |
| `/admin/ai` | AI 运营概览 | `features/admin-ai/components/ai-overview-page.tsx` |
| `/admin/ai/providers` | Provider 管理 | `features/admin-ai/components/provider-management-page.tsx` |
| `/admin/ai/providers/[providerId]` | Provider 详情 | `features/admin-ai/components/provider-detail-page.tsx` |
| `/admin/ai/models` | Model 管理 | `features/admin-ai/components/model-management-page.tsx` |
| `/admin/ai/models/[modelId]` | Model 详情 | `features/admin-ai/components/model-detail-page.tsx` |
| `/admin/ai/agents` | Agent 管理 | `features/admin-ai/components/agent-management-page.tsx` |
| `/admin/ai/agents/[agentId]` | Agent 详情 | `features/admin-ai/components/agent-detail-page.tsx` |
| `/admin/ai/bindings` | 命中规则 | `features/admin-ai/components/binding-management-page.tsx` |
| `/admin/ai/skills` | Skill 管理 | `features/admin-ai/components/skill-management-page.tsx` |
| `/admin/ai/invocations` | 调用日志 | `features/admin-ai/components/invocation-log-page.tsx` |
| `/admin/ai/invocations/[invocationId]` | 调用日志详情 | `features/admin-ai/components/invocation-detail-page.tsx` |
| `/admin/ai/test` | 测试调试 | `features/admin-ai/components/ai-test-console-page.tsx` |
| `/admin/settings` | 系统设置 | `features/admin-settings/components/system-settings-page.tsx` |
| `/admin/feedback` | 反馈工单列表 | `features/admin-feedback/components/feedback-list.tsx` |
| `/admin/feedback/[id]` | 反馈工单详情 | `features/admin-feedback/components/feedback-detail.tsx` |

### 代码组织原则

**重要约定：**

1. **`app/` 目录**：只作为路由入口，页面文件只做极薄装配，不承载业务实现
2. **`features/` 目录**：前端主工作目录，按业务域承载页面、局部组件、局部类型、局部假数据
3. **`components/` 目录**：只有真正跨业务域共享的组件才放在这里
4. **`constants/` 目录**：放跨 feature 复用的顶层常量，单个 feature 使用的配置放在其 `data/` 目录
5. **`types/` 目录**：放跨 feature 共用的类型，单个业务域的类型放在其 `types.ts`

**判断规则：**
- 组件只被一个业务域使用 → `features/<domain>/components`
- 组件被多个业务域复用 → `components/`
- 常量只在单个 feature 内使用 → `features/<domain>/data`
- 常量多个 feature 复用 → `constants/`
- 类型仅服务单个业务域 → `features/<domain>/types.ts`
- 类型跨业务域共享 → `types/`

### 后端路由规范

- **`app/api/` 目录**：只作为薄入口层，路由文件只做参数解析和路由分发
- **业务逻辑下沉**：`server/lib/` 中的 `request-validation.ts`、`route-response.ts`、`route-error.ts` 集中处理请求校验、统一响应和错误映射
- **各域 route-handler**：`server/modules/<domain>/route-handler.ts` 处理域内路由编排
- **OpenAPI 文档维护**：新增/修改接口后需同步更新 `server/modules/api-docs/openapi.ts` 与 `schemas.ts`

## 当前开发状态

**已完成：**
- ✅ 前端工程结构搭建
- ✅ 七个核心用户页面 + API 文档页
- ✅ 共享 UI 组件库（shadcn/ui）
- ✅ 布局组件和导航系统
- ✅ 手机验证码登录与微信 OAuth 跳转
- ✅ 首页登录态恢复与真实推荐分流（`/learn`、`/history`、`/onboarding`）
- ✅ onboarding / learn / map / achievements / history 的核心 read model API
- ✅ `/api/task/complete` 与 `/api/task/update-status` 首版落地，学习页可真实推进关卡
- ✅ `score_ledgers` / `user_ranks` 成长写模型落地，任务积分与段位变化可追溯
- ✅ `daily_checkins` 与 `/api/checkin/daily` 落地，成就页支持真实每日打卡
- ✅ 历史学习计划详情、放弃/重新激活/删除记录状态操作
- ✅ 用户资料编辑、头像上传、反馈系统
- ✅ AI 学习消息链路第一阶段（真实 provider 编排 + SSE 流式输出 + 结构化 `structuredContent`）
- ✅ 自学模式教程链接生成计划 Phase A（`plan-from-material` / `plan-drafts` confirm·regenerate，`learning-materials` + `learning-plans` 模块）
- ✅ OpenAPI 3.1 文档（`/api/docs/openapi`）与 Swagger UI（`/api-docs`）
- ✅ Supabase 迁移与远程数据库接入（当前已到 `021`，含自学材料摄取、计划草稿、analytics / notifications，以及 Provider API Key 数据库加密托管）
- ✅ Phase 1 运行时性能与稳定性加固（进程内短 TTL 用户鉴权 / 管理员会话缓存、AI 配置快照缓存、关键接口限流、请求级观测头与结构化日志；当前仍未引入 Redis / 消息队列）
- ✅ 管理后台 Phase 1（管理员认证、看板、反馈工单）
- ✅ 管理后台用户运营（`/admin/users`、`/admin/users/[userId]`：列表筛选、CSV 导出、详情聚合、受控资料 PATCH、软删除/恢复；`server/modules/admin-users`、`OpenAPI` 分组 `admin-users`）
- ✅ 管理后台学习运营（`/admin/learning`、`/admin/learning/[pathId]`：学习路径列表筛选、CSV 导出、详情聚合、最近会话回看、`reactivate/archive` 状态操作；`server/modules/admin-learning`、`OpenAPI` 分组 `admin-learning`）
- ✅ 管理后台 AI 运营（`/admin/ai`、`/admin/ai/providers`、`/admin/ai/providers/[providerId]`、`/admin/ai/models`、`/admin/ai/models/[modelId]`、`/admin/ai/agents`、`/admin/ai/agents/[agentId]`、`/admin/ai/bindings`、`/admin/ai/skills`、`/admin/ai/invocations`、`/admin/ai/invocations/[invocationId]`、`/admin/ai/test`；对应 `/api/admin/ai/*`、`server/modules/admin-ai`、`OpenAPI` 分组 `admin-ai`，已支持 Provider API Key 脱敏展示、按需明文读取、修改并加密保存到数据库）
- ✅ 管理后台系统设置（`/admin/settings`：我的资料、安全设置、管理员账号列表与启停、角色权限说明、操作审计、系统信息；`server/modules/admin-settings`、`OpenAPI` 分组 `admin-settings`）

**进行中/待完成：**
- ⏳ 管理员后台后续能力（细粒度权限深化；用户域后续如内部备注、人工积分调整；AI 域更深能力如 prompt 版本化、灰度/回滚、成本与稳定性面板等以设计文档与代码为准）
- ⏳ AI 编排第二阶段（更细粒度 agent 控制、prompt 版本化管理）
- ✅ analytics 事件入库（`POST /api/analytics/event`、`event_logs`、基础聚合）
- ✅ 通知设置落库（用户偏好、站内提醒记录、工作台左侧栏提醒卡）

**开发策略：**
当前项目已是“部分真实接口 + 部分静态展示数据”的状态。优先继续扩展真实用户主链路；营销内容、FAQ、订阅占位等仍可继续用本地静态数据承载，但 analytics 与通知设置已不再是纯前端占位。

运行时基础设施当前要按“单实例进程内实现”理解：已有短 TTL 缓存、限流与请求观测加固，但还没有 Redis、分布式缓存或消息队列。

### 当前状态机补充

- 学习计划当前真实状态区分为 `active`、`interrupted`、`completed`、`abandoned`、`archived`
- `interrupted` 表示系统自动中断，当前规则为连续 7 天无学习行为
- `abandoned` 表示用户主动放弃，不允许再次激活
- 历史页前端展示状态 `in_progress` 实际映射数据库中的 `active`

## 核心业务概念

### 用户等级
- **入门用户**：产品经理、设计师、创业者、运营
- **进阶用户**：有前端/后端基础的开发者
- **高阶用户**：有一定项目经验，希望系统化提升的人

### 学习工具分类
- 图形化工具（Cursor、Windsurf 等）
- CLI 工具（Claude Code、Codex CLI 等）
- 轻量在线工具

### 学分与段位系统
- 学分规则：完成步骤+10，每日打卡+5，完成项目+100
- 段位：萌新码农(0-200) → AI学徒(200-500) → Vibe Coder(500-1000) → AI建造者(1000-2000) → AI编程大师(2000+)

## 事件追踪

项目使用统一的事件追踪系统：

- 事件名定义：`constants/events.ts`
- 触发方式：`useAppEventTracker()` Hook
- 当前已覆盖关键用户行为：Landing CTA、登录提交、工具选择、学习输入、快捷帮助等

## 开发约定

### 新增页面
1. 在 `features/<domain>/pages/` 创建页面装配文件
2. 在 `features/<domain>/components/` 拆页面内部组件
3. 在 `features/<domain>/data/` 放静态展示数据
4. 在 `app/<route>/page.tsx` 仅保留薄路由封装

### 组件开发
- 页面级兜底状态在 feature 的 `pages/` 中处理
- 组件级空态和局部错误态在对应 feature 组件中处理
- 优先使用 `components/ui/state-panel.tsx` 统一反馈态
- 使用 `components/ui/page-section.tsx` 包装页面区块

### 代码质量
- 提交前运行 `pnpm lint`
- 大修改后运行 `pnpm build` 验证构建
- 遵循 TypeScript 严格模式
- 遵循 ESLint 规则

### 响应式设计断点
检查断点：1440px, 1024px, 768px, 390px

## 相关文档

详细设计和技术文档位于 `docs/plans/` 目录：

**必读文档（按推荐顺序）：**
1. `README.md` - 项目状态速览与文档索引
2. `2026-03-23-ai-coding-tutor-frontend-engineering-guide.md` - 前端工程现状
3. `2026-03-23-ai-coding-tutor-api-spec.md` - API 规范与接口契约

**补充文档：**
- `2026-03-23-ai-coding-tutor-prd.md` - 产品需求文档
- `2026-03-23-ai-coding-tutor-page-prototype-spec.md` - 页面职责与信息架构
- `2026-03-23-ai-coding-tutor-technical-architecture.md` - 技术架构设计
- `2026-03-23-ai-coding-tutor-database-schema-design.md` - 数据库设计
- `2026-03-23-ai-coding-tutor-backend-structure-design.md` - 后端结构设计
- `2026-03-23-ai-coding-tutor-ui-visual-design-spec.md` - UI 视觉设计
- `2026-03-23-ai-coding-tutor-adr-records.md` - 架构决策记录
- `2026-03-30-ai-coding-tutor-ai-orchestration-design.md` - AI 编排设计（第一阶段已完成）
- `2026-03-31-ai-coding-tutor-admin-console-design.md` - 管理后台设计（Phase 1 + 用户运营 + 学习运营 + AI 运营 + 系统设置已落地；余下深水区能力见文档）
- `2026-03-31-admin-console-phase1-design.md` - 管理后台 Phase 1 详细设计
- `2026-03-31-admin-console-phase1-implementation.md` - 管理后台 Phase 1 实施计划

## 重要提醒

1. **当前已是同仓 MVP**：项目包含前端页面 + `app/api` BFF + `server/modules` 服务层 + Supabase migrations，是一个完整全栈项目
2. **AI 学习消息链路已接通**：真实 provider 编排链路已通过 SSE 流式输出接入 `POST /api/learning/message`，返回结构化 `structuredContent`，第一阶段已完成
3. **Provider 密钥机制已更新**：`/admin/ai/providers` 支持脱敏查看、按需明文读取与修改；Provider API Key 现可由服务端加密后存入数据库，运行时优先读取数据库密文，`envSecretRef` 仅作兼容环境变量回退；启用该路径需配置 `AI_PROVIDER_SECRET_ENCRYPTION_KEY`
4. **运行时加固边界要看清**：当前已落地进程内鉴权/会话缓存、AI 配置快照缓存、关键接口限流与 `X-Request-Id` / `X-Auth-Cache` / `X-Config-Cache` / `X-Rate-Limit` / `Server-Timing` 观测头，但这些都不是 Redis 或消息队列方案
5. **API 文档地址**：`/api-docs` 提供 Swagger UI 查看与调试，`/api/docs/openapi` 返回 OpenAPI 3.1 JSON
6. **文档与代码冲突时**：以代码和迁移文件为准，再回写文档
