# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AI编程学习教练 - 一个面向中文用户的 AI 编程学习陪练产品，核心价值在于把零散教程、视频、代码片段和学习资料转化为可执行、可追踪、可反馈的学习过程。

**技术栈：**
- 前端：Next.js 16 + React 19.2 + TypeScript 5.9 + Tailwind CSS 4 + shadcn/ui
- 后端：Next.js API Routes
- 数据库：阿里云 AnalyticDB PostgreSQL 版 Supabase（计划）
- AI 服务：Claude API（计划）
- 部署：Vercel（计划）

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
app/                    # Next.js App Router 路由入口（薄层装配）
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
  └── achievement/    # 成就/段位系统
hooks/                 # 自定义 React Hooks
lib/                   # 工具函数和 API 客户端（计划）
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

## 当前开发状态

**已完成：**
- ✅ 前端工程结构搭建
- ✅ 六个核心页面的静态实现
- ✅ 共享 UI 组件库（shadcn/ui）
- ✅ 布局组件和导航系统
- ✅ 事件追踪基础设施（`constants/events.ts`）

**进行中/待完成：**
- ⏳ 后端 API 接入
- ⏳ 数据库集成
- ⏳ AI 服务集成
- ⏳ 用户认证系统
- ⏳ 真实数据状态管理

**开发策略：**
当前阶段前端使用 `features/<domain>/data/` 中的静态假数据驱动页面迭代。等后端接口准备好后，将逐步替换为服务端返回数据。

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
- 学分规则：完成步骤+10，每日打卡+20，完成项目+100
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
- `2026-03-23-ai-coding-tutor-prd.md` - 产品需求文档
- `2026-03-23-ai-coding-tutor-technical-architecture.md` - 技术架构设计
- `2026-03-23-ai-coding-tutor-frontend-engineering-guide.md` - 前端工程说明
- `2026-03-23-ai-coding-tutor-database-schema-design.md` - 数据库设计
- `2026-03-23-ai-coding-tutor-api-spec.md` - API 规范

## 重要提醒

1. **前端主导期**：当前项目处于前端结构完善阶段，重点在于稳定交互和信息结构
2. **假数据驱动**：使用 `features/<domain>/data/` 中的静态数据，等后端准备好后再替换
3. **保持结构清晰**：遵循代码组织原则，避免在 `app/` 中直接实现业务逻辑
4. **渐进式集成**：后续接入认证、数据库、AI 服务时，结构已预留好扩展空间
