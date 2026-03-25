# AI编程学习教练 后端模块目录结构设计文档

> 文档类型：后端模块目录结构设计文档  
> 产品名称：AI编程学习教练  
> 版本：v1.0  
> 状态：初稿  
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

---

## 2. 设计目标

后端目录结构需要满足以下目标：

1. 保持模块化单体的清晰边界。
2. 将 Route Handler、应用编排、领域逻辑、数据访问和外部集成分层。
3. 保证任务状态、积分计算、AI 编排等核心能力统一在服务端权威实现。
4. 便于后续按域拆分服务，而不是一开始就写成脚本式 API。

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

## 4. 推荐顶层目录结构

建议结构如下：

```text
src/
├── app/
├── server/
├── shared/
├── types/
└── tests/
```

说明：

- `app/` 存放 Next.js route handlers
- `server/` 存放真正的服务端业务代码
- 不建议把业务逻辑直接堆在 `app/api/*`

---

## 5. `app/api` 目录设计

建议仅作为接口入口层使用：

```text
app/
└── api/
    ├── achievement/
    │   └── summary/route.ts
    ├── analytics/
    │   └── event/route.ts
    ├── auth/
    │   └── login/route.ts
    ├── checkin/
    │   └── daily/route.ts
    ├── history/
    │   └── recent/route.ts
    ├── learning/
    │   ├── current-session/route.ts
    │   ├── message/route.ts
    │   └── stuck-help/route.ts
    ├── onboarding/
    │   ├── complete/route.ts
    │   ├── path-options/route.ts
    │   └── tools/route.ts
    ├── profile/
    │   ├── init/route.ts
    │   └── me/route.ts
    ├── progress/
    │   ├── current/route.ts
    │   └── map/route.ts
    └── task/
        ├── complete/route.ts
        └── update-status/route.ts
```

规则：

- 每个 `route.ts` 只做入口处理
- 不在 `route.ts` 中写复杂数据库访问

---

## 6. `server/` 目录设计

建议结构：

```text
server/
├── application/
├── domain/
├── infrastructure/
├── modules/
├── schemas/
├── config/
└── lib/
```

说明：

- `application/`：用例编排
- `domain/`：核心领域规则
- `infrastructure/`：数据库与第三方
- `modules/`：按业务域聚合导出
- `schemas/`：请求和响应 schema
- `config/`：环境配置
- `lib/`：服务端通用能力

---

## 7. `server/modules` 业务域组织

建议按域组织：

```text
server/modules/
├── achievement/
├── analytics/
├── auth/
├── gamification/
├── history/
├── learning/
├── onboarding/
├── profile/
└── task/
```

每个模块建议包含：

```text
server/modules/learning/
├── application/
├── domain/
├── infrastructure/
├── dto/
├── schemas/
└── index.ts
```

这是一种“按域聚合、域内分层”的结构，适合模块化单体。

---

## 8. 业务域细化设计

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
│   └── user-preference-repository.ts
└── index.ts
```

## 8.4 `learning`

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
│   ├── claude-client.ts
│   └── content-parser.ts
├── dto/
├── schemas/
└── index.ts
```

## 8.5 `task`

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
│   └── task-repository.ts
└── index.ts
```

## 8.6 `gamification`

职责：

- 学分
- 段位
- 打卡
- 成就

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

## 8.7 `history`

职责：

- 最近学习历史
- 历史摘要聚合

建议结构：

```text
server/modules/history/
├── application/
│   └── get-recent-history.ts
├── domain/
│   └── history-service.ts
├── infrastructure/
│   └── history-repository.ts
└── index.ts
```

## 8.8 `analytics`

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

## 14. 后端推荐目录树

```text
app/
└── api/
    ├── achievement/summary/route.ts
    ├── analytics/event/route.ts
    ├── auth/login/route.ts
    ├── checkin/daily/route.ts
    ├── history/recent/route.ts
    ├── learning/current-session/route.ts
    ├── learning/message/route.ts
    ├── learning/stuck-help/route.ts
    ├── onboarding/complete/route.ts
    ├── onboarding/path-options/route.ts
    ├── onboarding/tools/route.ts
    ├── profile/init/route.ts
    ├── profile/me/route.ts
    ├── progress/current/route.ts
    ├── progress/map/route.ts
    ├── task/complete/route.ts
    └── task/update-status/route.ts

server/
├── config/
├── infrastructure/
│   ├── ai/
│   ├── auth/
│   ├── db/
│   ├── logging/
│   └── storage/
├── lib/
│   ├── auth/
│   ├── errors/
│   ├── idempotency/
│   ├── logger/
│   └── observability/
├── modules/
│   ├── achievement/
│   ├── analytics/
│   ├── auth/
│   ├── gamification/
│   ├── history/
│   ├── learning/
│   ├── onboarding/
│   ├── profile/
│   └── task/
├── schemas/
└── tests/
```

---

## 15. 请求处理推荐流转

每个接口推荐遵循以下流转：

1. `route.ts` 接收请求
2. 调用 `require-user` 做鉴权
3. 使用 `schema` 做参数校验
4. 调用 `application use case`
5. use case 调用 `domain service + repository + external client`
6. 统一格式返回响应

示例：

`POST /api/task/complete`

- `app/api/task/complete/route.ts`
- `server/modules/task/application/complete-task.ts`
- `server/modules/task/domain/task-service.ts`
- `server/modules/gamification/application/award-score.ts`
- `server/modules/task/infrastructure/task-repository.ts`

---

## 16. 不建议的做法

- 在 `route.ts` 中直接写阿里云 Supabase 查询
- 在 repository 中直接调用 Claude API
- 在一个 service 文件里同时处理认证、任务和积分
- 用一个 `services/` 目录承载全部后端逻辑
- DTO、entity、HTTP response 混成一套类型

---

## 17. 演进建议

如果后续系统复杂度提升，可按以下顺序演进：

1. 保持目录不变，先强化 domain 和 application 分层
2. 再将 `learning`、`gamification` 等高复杂域单独拆 package
3. 最后在业务量足够时拆独立服务

MVP 阶段不建议过早引入 DDD 全套重型写法，但必须保留分层意识。

---

## 18. 结论

这套后端模块目录设计的核心是：让 API 路由层足够薄，让用例编排清楚，让领域规则有明确归属，让基础设施实现与业务规则分离。只要这一点建立起来，即使当前是模块化单体，后续也能平滑演进，而不会在 MVP 阶段把服务端写成难以维护的接口脚本集合。
