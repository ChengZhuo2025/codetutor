# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 快速了解项目

**优先阅读顺序：**
1. `docs/plans/README.md` — 项目状态速览与权威文档索引
2. `docs/plans/2026-03-23-ai-coding-tutor-frontend-engineering-guide.md` — 前端工程现状
3. `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md` — API 规范与接口契约

> 注意：`AGENTS.md` 包含同等重要的代码库状态快照，两者内容对齐。若两份文档不一致，以代码和迁移文件为准，再回写文档。

## 常用开发命令

```bash
pnpm dev              # 开发服务器（本地默认 http://localhost:3000）
pnpm build            # 生产构建
pnpm start            # 运行生产服务器
pnpm lint             # 代码检查

# 功能验证脚本（关键页面/接口回归检查）
pnpm test:map-page
pnpm test:achievements-page
pnpm test:workspace-sidebar
pnpm test:settings-logout
pnpm test:workspace-layout-widths
pnpm test:workspace-aside-styles
pnpm test:workspace-shell-collapse
pnpm test:learning-plan-from-material
pnpm test:admin-users
pnpm test:admin-learning
pnpm test:admin-ai
pnpm test:admin-settings
```

**本地开发环境：**
- 技术栈：Next.js 16.2.0 + React 19.2.4 + TypeScript 5.7.3 + Tailwind CSS 4.2 + shadcn/ui + Zod + zod-to-openapi + Swagger UI
- 本地 Node.js：`Node.js 22.18.0`
- 数据库：Supabase PostgreSQL（迁移 `001`–`057`）
- AI 服务：外部 provider 抽象层（已接通硅基流动，详见 AI Orchestration 设计文档）
- 环境变量：参考 `.env.example` 配置，需要 `SUPABASE_*`、`AI_PROVIDER_SECRET_ENCRYPTION_KEY` 等

## 项目架构

### 目录结构

```
app/                  # Next.js App Router 路由入口（薄层装配）和 API 路由（app/api/）
ai/                   # AI provider 编排层（provider 抽象、agent、skill）
components/           # 跨业务域共享组件（ui/、layout/）
constants/            # 跨 feature 复用的顶层常量（如 events.ts）
docs/plans/           # 项目设计文档（YYYY-MM-DD-topic-name.md 命名）
features/             # 前端主工作目录，按业务域组织 pages/components/data/types
hooks/                # 自定义 React Hooks
lib/                  # 工具函数、API 契约、mock client、Supabase 客户端
providers/            # 全局 Provider 入口
scripts/              # 功能验证脚本（check-*.mjs / check-*.ts）
server/               # 服务端逻辑
  ├── lib/            # 通用库（请求校验、统一响应、错误映射、Supabase 客户端）
  └── modules/        # 按域划分的业务服务层（auth/、learning/、admin-*/ 等）
supabase/migrations/  # 数据库迁移（001–057）
types/                # 跨 feature 共用的类型定义
vendor/               # vendored 依赖（如 server-only）
```

### 核心架构原则

**前后端分层：**
- `app/` 只做路由入口，不承载业务逻辑
- `features/` 是前端主工作目录，按业务域组织页面、组件、数据
- `server/modules/` 是后端业务逻辑层，各域有独立的 route-handler
- `server/lib/` 集中处理请求校验、统一响应、错误映射

**组件归属判断：**
- 组件只被一个域使用 → `features/<domain>/components`
- 组件被多个域复用 → `components/`
- 常量只在单个 feature 内 → `features/<domain>/data`
- 类型只服务单个域 → `features/<domain>/types.ts`

**后端路由规范：**
- `app/api/` 只做薄入口层，参数解析后分发到 `server/modules/<domain>/route-handler.ts`
- OpenAPI 文档注册：`server/modules/api-docs/openapi.ts` + `schemas.ts`（新增/修改接口需同步）

**主题与状态持久化：**
- 用户端明暗主题：`next-themes`，默认暗色，`localStorage` key `codetutor-theme`，无 REST API
- 工作台左右栏折叠态：`localStorage` 持久化，无 REST API

### 关键实现机制

**Provider API Key 加密存储：**
- `/admin/ai/providers` 支持脱敏展示、按需明文读取、修改并加密保存到数据库
- 运行时优先读数据库密文，`envSecretRef` 仅作兼容环境变量回退
- 服务端需配置 `AI_PROVIDER_SECRET_ENCRYPTION_KEY`

**学习计划状态机：**
- `active` → 用户进行中
- `interrupted` → 连续 7 天无学习行为，系统自动中断
- `completed` → 完成
- `abandoned` → 用户主动放弃（不可再激活）
- `archived` → 归档

**运行时基础设施（单实例进程内，无 Redis/MQ）：**
- 用户鉴权 / 管理员会话短 TTL 缓存
- AI provider / model / agent / binding / skill 配置快照缓存
- 关键接口限流（`/api/learning/message`、登录、Provider 密钥读取等）
- 请求级观测头：`X-Request-Id` / `X-Auth-Cache` / `X-Config-Cache` / `X-Rate-Limit` / `Server-Timing`

### 用户端核心页面

| 路由 | 页面 | 实现位置 |
|------|------|---------|
| `/` | 首页 | `features/marketing/pages/landing-page.tsx` |
| `/login` | 登录页 | `features/auth/pages/login-page.tsx` |
| `/onboarding` | 工具选择页 | `features/onboarding/pages/onboarding-page.tsx` |
| `/learn` | AI 学习页 | `features/learning/pages/learn-page.tsx` |
| `/map` | 学习地图 | `features/progress/pages/map-page.tsx` |
| `/achievements` | 成就页 | `features/achievement/pages/achievements-page.tsx` |
| `/history` | 历史学习页 | `features/history/pages/history-page.tsx` |
| `/api-docs` | Swagger UI | `features/api-docs/pages/api-docs-page.tsx` |

### 管理后台页面

| 路由 | 页面 |
|------|------|
| `/admin` | 看板总览 |
| `/admin/users`、`/admin/users/[userId]` | 用户运营 |
| `/admin/learning`、`/admin/learning/[pathId]` | 学习记录 |
| `/admin/ai/*` | Ai 管理（providers/models/agents/bindings/skills/invocations/test） |
| `/admin/settings` | 系统设置 |
| `/admin/feedback`、`/admin/feedback/[id]` | 反馈工单 |

### 事件追踪

- 事件名定义：`constants/events.ts`
- 触发 Hook：`useAppEventTracker()`

### 代码质量

- 提交前：`pnpm lint`
- 大修改后：`pnpm build`
- 遵循 TypeScript 严格模式
- 响应式断点：1440px, 1024px, 768px, 390px

### 文档与代码一致性

**文档与代码冲突时**：以代码和迁移文件为准，再回写文档。

文档同步检查清单（改动后必查）：
- 路由 / 请求体 / 响应体 变更 → 更新 API 规范 + `server/modules/api-docs/openapi.ts` + `schemas.ts`
- 迁移 / 字段 / 密钥策略 变更 → 更新数据库设计文档 + `.env.example`
- AI / Provider 行为变更 → 重新检查 AI Orchestration 设计文档
- 影响当前实现状态 → 更新 `AGENTS.md` 和 `docs/plans/README.md`
