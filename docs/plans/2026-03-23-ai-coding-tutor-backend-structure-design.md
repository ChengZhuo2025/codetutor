# AI编程学习教练 后端模块目录结构设计文档

> 文档类型：后端模块目录结构设计文档  
> 产品名称：AI编程学习教练  
> 版本：v1.1  
> 状态：已按当前代码实现同步  
> 创建日期：2026-03-23  
> 适用阶段：MVP  
> 关联文档：`docs/plans/2026-03-23-ai-coding-tutor-technical-architecture.md`、`docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`

---

## 1. 文档目标

本文档用于定义 AI编程学习教练 MVP 服务端代码的目录结构、模块边界、命名规则和职责归属，作为 BFF 层和领域服务层的落地规范。

本设计基于：

- Next.js API Routes / Route Handlers
- TypeScript 5.9
- 阿里云 AnalyticDB PostgreSQL 版 Supabase
- Claude API
- Node.js 24 Active LTS

补充说明：

- 本文档同时包含“当前已落地目录形态”和“后续可演进方向”
- 涉及当前仓库真实目录与接口时，以已落地结构为准，不再假定 `src/` 根目录或尚未存在的模块层级

---

## 2. 设计目标

后端目录结构需要满足以下目标：

1. 保持模块化单体的清晰边界。
2. 将 Route Handler、应用编排、领域逻辑、数据访问和外部集成分层。
3. 保证任务状态、积分计算、AI 编排等核心能力统一在服务端权威实现。
4. 便于后续按域拆分服务，而不是一开始就写成脚本式 API。
5. 直接支撑当前前端原型已经存在的 `/onboarding`、`/learn`、`/map`、`/achievements`、`/history` 页面。

---

## 3. 分层原则

建议后端按五层组织：

1. Route Layer
2. Application Layer
3. Domain Layer
4. Infrastructure Layer
5. Shared Layer

### 3.1 Route Layer

职责：

- 接收 HTTP 请求
- 鉴权
- 参数解析
- 调用应用服务
- 统一返回格式

不负责：

- 直接写业务规则
- 直接写 SQL
- 直接拼 Prompt 细节

### 3.2 Application Layer

职责：

- 组织多个领域服务协作
- 完成一个完整用例

例如：

- 完成任务并发分
- 恢复当前学习上下文
- 处理学习消息输入

### 3.3 Domain Layer

职责：

- 承载领域规则
- 定义核心服务和状态机

例如：

- 任务状态规则
- 积分段位规则
- 路径生成规则

### 3.4 Infrastructure Layer

职责：

- 数据库访问
- 第三方服务集成
- 持久化实现

### 3.5 Shared Layer

职责：

- 错误定义
- 日志
- 配置
- 通用 schema
- 公共工具

---

## 4. 当前已落地顶层目录结构

当前仓库真实与后端相关的顶层目录如下：

```text
app/
├── api/
└── ...
lib/
├── api/
└── supabase/
scripts/
server/
supabase/
└── migrations/
types/
```

说明：

- `app/api/` 存放 Next.js Route Handlers
- `server/` 存放真正的服务端业务代码
- `lib/api/` 存放接口契约与浏览器端请求封装
- `lib/supabase/` 存放浏览器端和服务端 Supabase client
- `supabase/migrations/` 存放实际已执行的数据库迁移

---

## 5. `app/api` 目录设计

当前 `app/api` 已作为接口入口层使用：

```text
app/
└── api/
    ├── achievement/
    │   └── summary/route.ts
    ├── admin/
    │   └── feedback/
    │       ├── route.ts
    │       └── [id]/
    │           ├── route.ts
    │           ├── reply/route.ts
    │           └── status/route.ts
    ├── auth/
    │   └── login/route.ts
    ├── feedback/
    │   ├── route.ts
    │   └── mine/
    │       ├── route.ts
    │       └── [id]/route.ts
    ├── history/
    │   └── recent/route.ts
    ├── learning/
    │   ├── current-session/route.ts
    │   └── message/route.ts
    ├── onboarding/
    │   ├── complete/route.ts
    │   ├── path-options/route.ts
    │   └── tools/route.ts
    ├── profile/
    │   ├── avatar/route.ts
    │   └── me/route.ts
    ├── progress/
    │   ├── current/route.ts
    │   └── map/route.ts
```

规则：

- 每个 `route.ts` 只做入口处理
- 不在 `route.ts` 中写复杂数据库访问
- `/history/recent` 在命名上保留原型兼容性，但实际承载“历史学习路径实例分页列表”
- 当前尚未落地的 `task/*`、`checkin/*`、`analytics/*`、`learning/stuck-help` 仍属于后续开发项

---

## 6. `server/` 目录设计

当前 `server/` 已落地结构：

```text
server/
├── lib/
│   ├── api-response.ts
│   ├── request-admin.ts
│   ├── request-auth.ts
│   └── supabase.ts
└── modules/
    ├── achievement/
    ├── auth/
    ├── feedback/
    ├── history/
    ├── learning/
    ├── onboarding/
    └── progress/
```

说明：

- 当前代码采用更轻量的“`route.ts` + `modules/<domain>/service.ts`” 结构
- 还没有拆出独立 `application / domain / infrastructure` 目录
- `server/lib/` 负责公共响应、鉴权和 Supabase 错误处理
- 如果后续业务复杂度继续上升，再逐步演进到域内分层

---

## 7. `server/modules` 业务域组织

当前已落地模块：

```text
server/modules/
├── achievement/
├── auth/
├── feedback/
├── history/
├── learning/
├── onboarding/
└── progress/
```

当前每个模块的最小形态通常是：

```text
server/modules/<domain>/
└── service.ts
```

这是一种适合当前 MVP 阶段的“按域聚合、先保留单 service 入口”的结构。等单个域的复杂度明显上升后，再在域内继续细分 application、domain、repository。

---

## 8. 后续可演进业务域细化设计

## 8.1 `auth`

职责：

- 登录态校验
- 用户身份映射
- 会话权限校验

建议结构：

```text
server/modules/auth/
├── application/
│   └── login-user.ts
├── domain/
│   ├── auth-service.ts
│   └── auth-errors.ts
├── infrastructure/
│   ├── supabase-auth-repository.ts
│   └── wechat-auth-adapter.ts
├── dto/
└── index.ts
```

## 8.2 `profile`

职责：

- 用户档案初始化
- 用户顶层状态读取
- 向工作台侧栏提供稳定的基础用户快照

建议结构：

```text
server/modules/profile/
├── application/
│   ├── get-profile.ts
│   └── init-profile.ts
├── domain/
│   └── profile-service.ts
├── infrastructure/
│   └── profile-repository.ts
└── index.ts
```

## 8.3 `onboarding`

职责：

- 获取工具列表
- 获取起始路线候选
- 提交 onboarding 结果并初始化学习上下文
- 创建 `user_learning_path` 与首批 `user_tasks`

建议结构：

```text
server/modules/onboarding/
├── application/
│   ├── get-tool-list.ts
│   ├── get-path-options.ts
│   └── complete-onboarding.ts
├── domain/
│   ├── onboarding-service.ts
│   └── path-template-selector.ts
├── infrastructure/
│   ├── learning-tool-repository.ts
│   ├── learning-path-repository.ts
│   ├── user-learning-path-repository.ts
│   └── user-preference-repository.ts
└── index.ts
```

## 8.4 `progress`

职责：

- 返回 `/map` 页需要的当前总览与路径地图 read model
- 将 `user_learning_paths + user_tasks + path_steps` 聚合成前端可直接渲染的数据

建议结构：

```text
server/modules/progress/
├── application/
│   ├── get-current-progress.ts
│   └── get-progress-map.ts
├── domain/
│   └── progress-read-model-builder.ts
├── infrastructure/
│   ├── user-learning-path-repository.ts
│   ├── task-repository.ts
│   └── learning-path-repository.ts
└── index.ts
```

## 8.5 `learning`

职责：

- 学习消息输入处理
- AI 编排
- 会话恢复
- 卡住帮助

这是核心模块。

建议结构：

```text
server/modules/learning/
├── application/
│   ├── handle-learning-message.ts
│   ├── get-current-session.ts
│   └── request-stuck-help.ts
├── domain/
│   ├── learning-orchestrator.ts
│   ├── prompt-builder.ts
│   ├── response-parser.ts
│   ├── session-service.ts
│   └── learning-errors.ts
├── infrastructure/
│   ├── conversation-repository.ts
│   ├── message-repository.ts
│   ├── user-learning-path-repository.ts
│   ├── task-repository.ts
│   ├── claude-client.ts
│   └── content-parser.ts
├── dto/
├── schemas/
└── index.ts
```

说明：

- `/learn` 页中的 `mission`、`resume`、`rightPanel`、`tasks` 属于 read model，可由 learning 模块聚合返回。
- `quickActions`、`supportOptions`、提示文案等展示性字段可在首期继续前端静态维护，不强制服务端化。

## 8.6 `task`

职责：

- 任务状态机
- 完成任务
- 更新任务状态

建议结构：

```text
server/modules/task/
├── application/
│   ├── complete-task.ts
│   └── update-task-status.ts
├── domain/
│   ├── task-service.ts
│   ├── task-state-machine.ts
│   └── task-errors.ts
├── infrastructure/
│   ├── task-repository.ts
│   └── user-learning-path-repository.ts
└── index.ts
```

## 8.7 `gamification`

职责：

- 学分
- 段位
- 打卡
- 成就
- `/achievements` 页总览 read model

建议结构：

```text
server/modules/gamification/
├── application/
│   ├── award-score.ts
│   ├── process-daily-checkin.ts
│   └── get-achievement-summary.ts
├── domain/
│   ├── score-service.ts
│   ├── rank-service.ts
│   ├── achievement-service.ts
│   └── gamification-errors.ts
├── infrastructure/
│   ├── score-ledger-repository.ts
│   ├── rank-repository.ts
│   ├── daily-checkin-repository.ts
│   └── achievement-repository.ts
└── index.ts
```

说明：

- `achievement summary` 读取侧可以在模块内聚合 `user_ranks + score_ledgers + daily_checkins + user_achievements`
- 图标、颜色、日历矩阵等表现层细节不建议下沉到基础领域模型

## 8.8 `history`

职责：

- 历史学习计划列表
- 历史摘要聚合
- 面向 `/history` 页输出分页 read model

建议结构：

```text
server/modules/history/
├── application/
│   └── get-recent-history.ts
├── domain/
│   └── history-service.ts
├── infrastructure/
│   ├── user-learning-path-repository.ts
│   └── history-repository.ts
└── index.ts
```

说明：

- `history` 模块读的主对象应是 `user_learning_paths`，不是 `conversations`
- 是否显示 `in_progress` / `completed` / `abandoned`，由路径实例状态决定

## 8.9 `analytics`

职责：

- 事件接收
- 基础聚合支持

建议结构：

```text
server/modules/analytics/
├── application/
│   └── track-event.ts
├── domain/
│   └── analytics-service.ts
├── infrastructure/
│   └── event-log-repository.ts
└── index.ts
```

---

## 9. `application/` 设计原则

应用层是“用例”层。

命名建议：

- `handle-learning-message.ts`
- `complete-task.ts`
- `process-daily-checkin.ts`

规则：

- 一个文件对应一个清晰用例
- 应用层可以调用多个 domain service 和 repository
- 应用层不应该直接写 HTTP 响应结构

---

## 10. `domain/` 设计原则

领域层承载业务规则。

应放：

- 状态机
- 规则引擎
- 业务校验
- Prompt 组装规则

不应放：

- HTTP 请求对象
- 数据库客户端细节

示例：

- `task-state-machine.ts`
- `rank-service.ts`
- `prompt-builder.ts`

---

## 11. `infrastructure/` 设计原则

基础设施层承载外部依赖实现。

建议结构：

```text
server/infrastructure/
├── db/
│   ├── supabase-admin.ts
│   └── transaction.ts
├── ai/
│   └── claude-client.ts
├── auth/
│   └── wechat-oauth-client.ts
├── storage/
└── logging/
```

若按域组织，域内 `infrastructure/` 可直接引用这些底层 client。

规则：

- repository 负责持久化
- client 负责第三方调用
- 不在 repository 内写复杂业务规则

---

## 12. `schemas/` 与 `dto/` 设计

## 12.1 `schemas/`

用途：

- 参数校验
- AI 输出结构校验

建议使用：

- Zod 或等价 schema 工具

示例：

```text
server/schemas/
├── common/
├── api/
└── ai/
```

例如：

- `server/schemas/api/task-complete.schema.ts`
- `server/schemas/ai/learning-response.schema.ts`

## 12.2 `dto/`

用途：

- 应用层输入输出对象

规则：

- DTO 用于稳定应用层接口
- DTO 不等于数据库 entity
- DTO 可以是面向页面的 read model，但不应直接携带前端组件专属的图标对象、颜色 token、营销文案

---

## 13. `config/` 与 `lib/` 设计

建议结构：

```text
server/config/
├── env.ts
├── feature-flags.ts
└── constants.ts

server/lib/
├── errors/
│   ├── app-error.ts
│   ├── error-codes.ts
│   └── to-http-response.ts
├── logger/
│   └── logger.ts
├── auth/
│   └── require-user.ts
├── idempotency/
│   └── ensure-idempotency.ts
└── observability/
    └── metrics.ts
```

---

## 14. 当前落地目录树

```text
app/
└── api/
    ├── achievement/summary/route.ts
    ├── admin/feedback/route.ts
    ├── admin/feedback/[id]/route.ts
    ├── admin/feedback/[id]/reply/route.ts
    ├── admin/feedback/[id]/status/route.ts
    ├── auth/login/route.ts
    ├── feedback/route.ts
    ├── feedback/mine/route.ts
    ├── feedback/mine/[id]/route.ts
    ├── history/recent/route.ts
    ├── learning/current-session/route.ts
    ├── learning/message/route.ts
    ├── onboarding/complete/route.ts
    ├── onboarding/path-options/route.ts
    ├── onboarding/tools/route.ts
    ├── profile/avatar/route.ts
    ├── profile/me/route.ts
    ├── progress/current/route.ts
    └── progress/map/route.ts

lib/
├── api/
│   ├── client.ts
│   ├── types.ts
│   └── contracts/
├── profile/
└── supabase/

server/
├── lib/
│   ├── api-response.ts
│   ├── request-admin.ts
│   ├── request-auth.ts
│   └── supabase.ts
├── modules/
│   ├── achievement/service.ts
│   ├── auth/service.ts
│   ├── feedback/service.ts
│   ├── history/service.ts
│   ├── learning/service.ts
│   ├── onboarding/service.ts
│   └── progress/service.ts

supabase/
└── migrations/
```

---

## 15. 当前请求处理流转

每个接口推荐遵循以下流转：

1. `route.ts` 接收请求
2. 调用 `getRequestAuth` 或 `getRequestAdmin` 做鉴权
3. 在 route 内做轻量参数解析与校验
4. 调用 `server/modules/<domain>/service.ts`
5. service 使用 Supabase Admin Client 读取或写入数据库
6. 通过 `ok / fail` 统一格式返回响应

示例：

`POST /api/feedback`

- `app/api/feedback/route.ts`
- `server/lib/request-auth.ts`
- `server/modules/feedback/service.ts`
- `lib/supabase/admin.ts`

---

## 16. 不建议的做法

- 在 `route.ts` 中直接写阿里云 Supabase 查询
- 在 repository 中直接调用 Claude API
- 在一个 service 文件里同时处理认证、任务和积分
- 用一个 `services/` 目录承载全部后端逻辑
- DTO、entity、HTTP response 混成一套类型
- 为了迎合现有前端 mock，把 `icon`、`color`、`bg`、FAQ、订阅文案直接做成后端权威字段

---

## 17. MVP 推荐开发顺序

结合当前代码，后端开发顺序已经推进到如下状态：

1. 已完成：`auth + profile`
   - 登录态处理
   - 用户档案读取与更新
   - 头像上传到 Supabase Storage
2. 已完成：`onboarding`
   - 工具列表
   - 路径候选
   - 完成 onboarding 时创建 `user_learning_path + user_tasks`
3. 已完成：`progress + history + achievement`
   - 当前路径总览
   - 地图 read model
   - 历史学习计划分页列表
   - 成长总览 read model
4. 已完成首版：`learning`
   - 当前学习会话恢复
   - 消息提交接口
   - 仍未接入真正的外部 AI provider 编排
5. 已完成：`feedback`
   - 用户反馈提交
   - 我的反馈列表与详情
   - 管理员查询与回复接口
6. 待实现：`task + gamification write`
   - 完成任务
   - 更新状态
   - XP、段位、打卡写入
7. 待实现：`analytics`
   - 事件入库

这样做的原因是：

- `onboarding -> progress -> task` 能先形成一条不依赖 AI 的最小学习主链路
- `/history` 和 `/achievements` 都依赖前面的路径实例、任务状态和积分流水
- `learning` 模块复杂度最高，放在后面最稳

## 18. 演进建议

如果后续系统复杂度提升，可按以下顺序演进：

1. 保持目录不变，先强化 domain 和 application 分层
2. 再将 `learning`、`gamification` 等高复杂域单独拆 package
3. 最后在业务量足够时拆独立服务

MVP 阶段不建议过早引入 DDD 全套重型写法，但必须保留分层意识。

---

## 19. 结论

这套后端模块目录设计的核心是：让 API 路由层足够薄，让用例编排清楚，让领域规则有明确归属，让基础设施实现与业务规则分离。当前前端原型真正需要的是一条围绕 `user_learning_paths` 展开的主线，而不是零散接口集合。只要先把 onboarding、progress、task、gamification 这条主线打通，后续 AI 学习会话和历史页、成就页都能自然落位。
