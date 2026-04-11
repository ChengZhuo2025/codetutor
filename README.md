# CodeTutor - AI 编程学习陪练

面向中文用户的 AI 编程学习陪练产品，把零散教程、视频、代码片段和学习资料转化为可执行、可追踪、可反馈的学习过程。

## 已落地能力

### 用户端

- **首页** — 营销页 + 登录态恢复（未登录展示 CTA，已登录智能跳转到 `/learn` / `/history` / `/onboarding`）
- **登录** — 手机验证码 + 微信 OAuth
- **工具选择（Onboarding）** — Cursor、Windsurf、Claude Code、Codex CLI 等主流 AI 编程工具入门引导
- **AI 学习页** — 真实 AI 对话陪练，SSE 流式输出，任务推进与学分联动
- **学习地图** — 关卡式进度可视化
- **成就系统** — 学分积累、段位晋升、每日打卡
- **历史学习** — 历史计划查看、放弃/重新激活/删除

### 管理后台（`/admin`）

- **看板总览** — 核心运营指标
- **用户运营** — 用户列表筛选、CSV 导出、详情聚合、软删除/恢复
- **学习运营** — 学习路径列表、详情、最近会话回看、`reactivate/archive` 状态操作
- **AI 运营** — Provider / Model / Agent 管理、绑定规则、Skill 配置、调用日志、Agent 测试
- **系统设置** — 管理员账号、角色权限、操作审计
- **反馈工单** — 用户反馈接收与处理

### 数据与基础设施

- **OpenAPI 3.1 文档** — `/api-docs` Swagger UI 查看与调试，`/api/docs/openapi` 返回 JSON
- **自学模式教程链接** — 异步摄取 + 多模态证据提取（文字/字幕/ASR/OCR） + 质量闸门 + 可编辑计划草稿
- **Provider API Key 安全托管** — 数据库加密存储，脱敏展示，按需明文读取
- **运行时加固** — 进程内鉴权缓存、AI 配置快照缓存、关键接口限流、结构化日志与观测头
- **数据库** — Supabase PostgreSQL，迁移 `001`–`026`

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16.2.0 + React 19.2.4 |
| 语言 | TypeScript 5.7.3 |
| 样式 | Tailwind CSS 4.2 + shadcn/ui |
| 数据校验 | Zod + zod-to-openapi |
| 后端 | Next.js API Routes（BFF）+ `server/modules` 服务层 |
| 数据库 | Supabase PostgreSQL（阿里云 AnalyticDB） |
| 文件存储 | Supabase Storage |
| AI 服务 | 外部 provider 抽象层（已接通硅基流动） |
| 本地环境 | Node.js 22.18.0 |

## 快速开始

### 前置条件

- Node.js 22.18.0
- pnpm
- Supabase 项目（本地或远程）

### 安装与运行

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 SUPABASE_* 等变量

# 开发模式
pnpm dev

# 生产构建
pnpm build
pnpm start

# 代码检查
pnpm lint
```

访问 `http://localhost:3000`，管理后台在 `/admin`（需管理员账号）。

## 项目结构

```
app/                    # Next.js App Router 路由入口（薄层装配）
  └── api/             # BFF 入口层，参数解析后分发到 server/modules
ai/                    # AI provider 编排层（provider 抽象、agent、skill）
components/            # 跨业务域共享组件（ui/、layout/）
constants/             # 跨 feature 顶层常量（如 events.ts）
docs/plans/            # 产品/设计/架构文档（YYYY-MM-DD-topic-name.md）
features/              # 前端主工作目录，按业务域组织
  └── */pages/         # 页面装配文件（极薄）
  └── */components/     # 业务域内部组件
  └── */data/           # 静态展示数据
  └── */types.ts       # 业务域局部类型
hooks/                 # 自定义 React Hooks
lib/                   # 工具函数、API 契约、Supabase 客户端
server/
  ├── lib/             # 服务端通用库（请求校验、统一响应、错误映射）
  └── modules/          # 按域划分的业务服务层
supabase/migrations/    # 数据库迁移文件
types/                 # 跨 feature 共用类型定义
```

**核心约定：**
- `app/` 只做路由入口，页面逻辑在 `features/`
- 组件只被一个域使用 → `features/<domain>/components`；被多个域复用 → `components/`
- OpenAPI 文档维护：`server/modules/api-docs/openapi.ts` + `schemas.ts`（修改接口后需同步）

## 文档索引

| 文档 | 内容 |
|------|------|
| `docs/plans/2026-03-23-ai-coding-tutor-prd.md` | 产品需求文档 |
| `docs/plans/2026-03-23-ai-coding-tutor-frontend-engineering-guide.md` | 前端工程现状 |
| `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md` | API 规范与接口契约 |
| `docs/plans/2026-03-23-ai-coding-tutor-technical-architecture.md` | 技术架构设计 |
| `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md` | 数据库 Schema 设计 |
| `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md` | AI 编排设计 |
| `docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md` | 管理后台设计 |

完整文档列表见 `docs/plans/README.md`。

## 状态说明

当前为"部分真实接口 + 部分静态展示数据"的同仓 MVP 阶段。已完成核心用户链路和管理后台 Phase 1；待落地能力包括：AI 编排第二阶段（更细粒度 agent 控制、prompt 版本化管理）、订阅支付、Redis/消息队列基础设施等。

**文档与代码冲突时**，以代码和迁移文件为准，再回写文档。
