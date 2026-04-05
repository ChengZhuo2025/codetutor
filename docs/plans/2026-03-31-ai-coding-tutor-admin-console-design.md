# AI编程学习教练 管理后台设计文档

> 文档类型：管理后台设计文档
> 产品名称：AI编程学习教练
> 版本：v0.4
> 状态：Phase 1 已完成；**用户运营**与**学习运营**已落地；AI 核心配置、细粒度权限与更深用户域运营能力仍为后续阶段
> 创建日期：2026-03-31
> 更新日期：2026-04-05
> 适用阶段：MVP 后续运营化阶段
> 关联文档：`docs/plans/2026-03-23-ai-coding-tutor-technical-architecture.md`、`docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`、`docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`、`docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`、`docs/plans/2026-03-31-admin-console-phase1-design.md`、`docs/plans/2026-03-31-admin-console-phase1-implementation.md`

---

## 1. 文档目标

本文档用于定义 AI编程学习教练管理后台的目标边界、运营需求、技术方案、后端 API 契约、数据库扩展与推进计划，作为后续后台能力建设的统一设计依据。

本文档只讨论管理后台的产品能力与系统设计，不展开后台前端视觉与交互细节。等本文档确认后，再单独产出后台前端设计文档。

---

## 2. 当前代码基线

> 2026-04-05 对齐说明（以代码为准）：
>
> - 管理后台 Phase 1 已落地管理员登录、会话、登出、改密、看板、反馈、管理员资料编辑（含头像上传）链路。
> - **用户运营**已落地：用户列表、详情、导出、受控资料更新、软删除与恢复、与反馈列表联动；路由为 `app/(admin-shell)/admin/users/*`，业务域为 `features/admin-users`，服务层为 `server/modules/admin-users`，OpenAPI 分组为 `admin-users`。
> - **学习运营**已落地：学习路径实例列表、详情、CSV 导出、最近会话摘要、`reactivate / archive` 状态操作；路由为 `app/(admin-shell)/admin/learning/*`，业务域为 `features/admin-learning`，服务层为 `server/modules/admin-learning`，OpenAPI 分组为 `admin-learning`。
> - 管理端鉴权主链路已切换为 `admin-access-token` / `admin-refresh-token` Cookie，会话守卫与 `/api-docs` 访问守卫已接入 `proxy.ts`。
> - 运行时 API 文档（`/api/docs/openapi`、`/api-docs`）已补齐 `admin-auth`、`admin-dashboard`、`admin-profile`、`admin-feedback`、`admin-users`、`admin-learning` 分组。
> - 本文中关于 `x-admin-secret` 的描述仅代表早期过渡方案背景，不再代表当前主实现。若与代码冲突，优先以 `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md` 与实际代码为准。

### 2.1 已经落地的后台相关能力

当前仓库里，已落地的管理员能力按模块包括：

**认证、看板与资料**

- `POST /api/admin/auth/login`、`GET /api/admin/auth/session`、`POST /api/admin/auth/logout`、`POST /api/admin/auth/change-password`
- `GET /api/admin/dashboard/overview`
- `GET /api/admin/profile/me`、`PATCH /api/admin/profile/me`、`POST /api/admin/profile/avatar`

**反馈工单**

- `GET /api/admin/feedback`
- `GET /api/admin/feedback/{id}`
- `POST /api/admin/feedback/{id}/reply`
- `POST /api/admin/feedback/{id}/status`

**用户运营（终端用户）**

- `GET /api/admin/users`：分页列表，支持关键词与筛选（账号状态、onboarding、是否具备进行中的学习计划等，以查询参数与 OpenAPI 为准）
- `GET /api/admin/users/export`：基于 `user_profile_export_view` 的 CSV 导出
- `GET /api/admin/users/{userId}`：详情 read model（与导出视图同构字段 + 学习/任务聚合）
- `PATCH /api/admin/users/{userId}`：受控更新昵称、简介、联系邮箱、微信、内容语言等（非任意字段、不替代 Supabase Auth 凭证管理）
- `POST /api/admin/users/{userId}/soft-delete`、`POST /api/admin/users/{userId}/restore`：软删除与恢复

当前实现特征：

- 统一挂在 `/api/admin/*` 命名空间
- 使用 `admin-access-token` / `admin-refresh-token` Cookie 做管理员会话鉴权
- 复用现有 `server/lib/request-validation.ts`、`server/lib/route-response.ts`、`server/lib/route-error.ts`
- 已补 OpenAPI 3.1 文档与 Swagger UI 调试入口

### 2.2 当前已具备、可被后台复用的数据资产

当前代码和数据库已经提供了不少适合后台复用的运营数据基础：

- `public.user_profile_export_view`
  聚合用户资料、账号、引导状态、当前 active path 与任务统计，适合后台列表和导出。
- `public.feedback_tickets`、`public.feedback_replies`
  已可支撑反馈工单列表、详情、回复与状态流转。
- `public.user_learning_paths`、`public.user_tasks`
  已可支撑学习计划状态、任务推进、卡点与路径复盘。
- `public.score_ledgers`、`public.user_ranks`、`public.daily_checkins`
  已可支撑成长写模型、积分流水、段位快照与打卡统计。
- `public.conversation_sessions`、`public.conversation_messages`
  已可支撑学习会话回看、任务关联、消息链路排查。
- `public.ai_providers`、`public.ai_models`、`public.agent_templates`、`public.skill_packs`、`public.agent_skill_bindings`
  已具备 AI 配置 registry 基础。
- `public.llm_invocations`
  已具备 AI 调用审计基础，可用于成功率、延迟、错误码、模型分布与成本代理分析。

### 2.3 当前仍缺失或仅部分具备的后台能力

以下条目表示**截至 2026-04-04** 与代码对照后仍不足或未开工的部分（已落地项不再重复列举）：

- **细粒度 UI/API 权限**：库表与角色模型已有雏形，菜单上仍有大量「占位/禁用」项；按角色隐藏能力、接口级授权与完整审计覆盖仍在演进中。
- **用户域后续能力**：内部备注（`user_admin_notes` 等）、人工积分调整（`score_ledgers` + 审计）等**尚未**按设计文档中的独立 API 交付。
- **AI 运营读写**：provider/model/agent 等后台 CRUD、调用日志只读面板、健康看板等仍待建设。
- **事件埋点写入链路与 `event_logs` 实际迁移**仍待落地。

因此，管理后台后续迭代应建立在「Phase 1 + 用户运营 + 学习运营 + 反馈」已可用，其余模块按优先级补齐的现实之上。

---

## 3. 设计目标与非目标

### 3.1 设计目标

管理后台首期要解决的不是“做一个大而全 CMS”，而是解决运营与客服最需要的四类问题：

1. 能对 LLM provider、model、agent、binding 做可控配置与微调，因为 AI 导师质量直接受这些后台配置影响。
2. 能看到当前用户与学习主链路的真实状态，而不是靠数据库手查。
3. 能处理用户反馈工单，并形成基本的流转和审计。
4. 能定位学习链路中的异常，包括计划状态、任务卡点、AI 调用失败。
5. 能基于已有数据做导出和人工运营动作，而不破坏用户主链路一致性。

### 3.2 非目标

首期后台不追求以下目标：

- 完整 BI 平台
- 复杂可视化拖拽式配置系统
- 多租户企业权限体系
- 独立运营中台服务
- 支付/订阅后台
- 全量内容 CMS

---

## 4. 运营角色与核心场景

### 4.1 角色划分

建议首期按三个角色设计：

- `support_admin`
  负责处理用户反馈、查看用户资料快照、定位基本问题。
- `ops_admin`
  负责用户导出、学习路径运营、积分人工调整、活动与增长排查。
- `ai_ops_admin`
  负责 AI provider、模型、agent、binding、skill、调用日志和失败案例排查。

首期可以先不做细粒度 UI 级权限控制，但数据库和 API 模型必须先按角色体系预留。

### 4.2 核心场景

管理后台首期需要覆盖的真实场景：

- AI 运营根据线上效果，调整 provider、model、自由学习模式 agent、平台预设不同工具/路径 agent 的配置与命中规则。
- AI 运营排查某个工具或某条预设路径为什么教学质量下降，确认最终命中的 agent、绑定的 skill 和默认模型。
- 客服收到用户问题后，快速检索用户、查看当前学习状态、最近反馈与历史计划。
- 运营查看反馈工单池，按状态、类型、关键词筛选并处理。
- 运营导出用户资料与学习进度，做回访、群运营或内容迭代分析。
- 运营排查某个用户为什么停留在 onboarding、为什么没有 active plan、为什么 streak 中断。
- AI 运营查看某段时间的调用失败、延迟异常、provider/model 分布和典型错误。
- 管理员对确需人工介入的积分或学习计划状态做受控修正，并留下审计记录。

---

## 5. 功能需求

### 5.1 管理员认证与权限

首期需求：

- 支持管理员登录后台并获取后台会话。
- 支持查看当前管理员身份、角色与权限摘要。
- 支持管理员退出登录。

实现原则：

- 管理端认证主链路采用“Supabase Auth + `admin_accounts` / `admin_roles` / `admin_account_roles` + 服务端权限解析”。
- 浏览器后台请求以管理员会话 Cookie 为准（`admin-access-token` / `admin-refresh-token`）。

### 5.2 总览看板

首期后台首页应提供“运营值班面板”，优先展示当前已有数据能直接支撑的指标：

- 今日新增用户数
- 今日完成 onboarding 用户数
- 当前 active 学习计划数
- 今日完成任务数
- 今日打卡人数
- 待处理反馈数
- 最近 24 小时 AI 调用成功率
- 最近 24 小时 AI 平均延迟

说明：

- 在 `event_logs` 尚未落地前，首页看板应优先使用现有业务表和写模型表做 read model 聚合。
- 真正的激活、留存、转化等指标需要等 `event_logs` 落地后再补齐。

### 5.3 用户运营

#### 已落地（与代码对齐，2026-04）

- **用户列表**：分页、`keyword`、账号状态（含已软删）、onboarding、是否具备进行中计划等筛选；列表行内打开资料编辑抽屉。
- **用户详情**（`/admin/users/[userId]`）：单页纵向信息架构——身份与徽章、运营摘要、可点击跳转的指标摘要卡、资料与登录渠道字段、当前学习计划与任务分布、累计任务统计、最近反馈工单与跳转全量列表；顶栏提供刷新、复制 ID/邮箱/手机、编辑资料、跳转工单列表；侧栏提供锚点导航与软删除/恢复。
- **用户导出**：`GET /api/admin/users/export`，数据源为 `user_profile_export_view`。
- **受控资料更新**：`PATCH /api/admin/users/{userId}` 限定白名单字段（昵称、简介、联系邮箱、微信、内容语言等），**不**承担修改 Supabase Auth 手机/邮箱或任意列覆盖。
- **账号状态**：`POST .../soft-delete`（可选原因）、`POST .../restore`。

#### 仍属后续规划（未作为当前里程碑验收）

- **用户备注**：后台内部备注、独立 `notes` API 与表（若与设计中的 `user_admin_notes` 一致，以未来迁移为准）。
- **人工积分调整**：`POST .../score-adjustments` 写入 `score_ledgers`（如 `manual_adjustment`）并强制审计。

#### 原则（仍然有效）

- 不提供任意删除学习主数据、不提供绕过领域规则直接改任务状态的后台入口；软删除为**账号级**受控能力，与学习路径数据删除分离。

### 5.4 反馈工单

反馈工单是当前最成熟的后台模块，应作为首期后台的第一个正式页面。

首期页面需求：

- 工单列表
- 工单详情
- 工单状态切换
- 管理员回复
- 工单筛选与搜索
- 查看用户快照
- 查看处理时间和最近回复时间

建议补充的后台能力：

- 指派处理人
- 内部备注
- SLA 字段
- 首响时间、关闭时间、解决时间
- 常用回复模板

### 5.5 学习运营

学习运营模块面向“用户为什么没学下去”的问题，而不是单纯做数据浏览。

首期应具备：

- 学习计划列表
  支持按状态 `active / interrupted / completed / abandoned`、工具、等级、更新时间筛选。
- 学习计划详情
  查看路径快照、当前步骤、任务状态、最近活动时间、累计 XP。
- 最近会话概览
  查看当前路径关联的 `conversation_sessions` 和最近消息摘要。
- 路径状态运营动作
  对特殊情况支持受控的 `archive`、`reactivate`。

原则：

- 任何管理员写操作都必须通过后台专用 API，由服务端复用现有领域规则，不允许直接在页面层拼 SQL。
- 后台不应绕过用户侧状态机；确需越权动作时，必须落审计。

### 5.6 AI 运营

AI 运营能力要和 `2026-03-30-ai-coding-tutor-ai-orchestration-design.md` 保持一致。

这里需要强调：AI 运营不是后台的附属功能，而是当前系统的核心管理业务。AI 导师的实际业务效果，很大程度上取决于后台对 provider、model、agent、binding、skill 的设置和微调质量。

首期建议提供只读能力：

- AI 调用日志列表
  支持按 provider、model、agent、status、时间范围筛选。
- AI 调用详情
  查看会话、用户、任务、延迟、token、错误码、脱敏 request/response payload。
- AI 健康面板
  查看最近成功率、失败分布、延迟分位、模型使用量。

首期后台必须纳入受控写能力，其中有两个关键后台模块必须明确作为核心主业务建设：

#### 5.6.1 LLM 管理

LLM 管理不是只看调用日志，而是要能管理当前 AI registry。

后台需要支持对以下对象做增删改查：

- `ai_providers`
  管理大模型供应商配置，如 `code`、`name`、`provider_type`、`base_url`、`auth_mode`、`secret_ref`、超时、重试、是否启用。
- `ai_models`
  管理具体 LLM 配置，如 `code`、`display_name`、`model_name`、所属 provider、stream/json/tool calling 能力、上下文长度、默认输出上限、推荐 temperature、定价元信息、启停状态。

后台需要提供的典型能力：

- provider 列表、详情、新建、编辑、启用、停用
- model 列表、详情、新建、编辑、启用、停用
- 按 provider 查看模型
- 校验 `default_provider_code` / `default_model_code` 的引用完整性
- 标记“生产可用模型”和“仅后台测试模型”

关键约束：

- 不允许在后台直接编辑明文密钥；后台只允许维护 `secret_ref`，真实密钥仍放服务端环境变量或安全 Secret 存储。
- 不允许删除已经被生产 agent 引用且仍在使用的 provider / model；首期优先支持“停用”而不是物理删除。

#### 5.6.2 Agents 管理

Agents 管理必须覆盖两类场景：

- 自由学习模式 agent
  即 `selection_mode = self_directed` 下的通用学习教练 agent。
- 平台预设训练模式 agent
  即 `selection_mode = preset_training` 下按不同工具、不同路径模板、不同场景命中的教学 agent。

后台需要支持对以下对象做增删改查：

- `agent_templates`
  管理 agent 模板本身，如 `code`、`name`、`scenario_type`、系统提示词、开发者提示词、默认 provider / model、上下文窗口、输出上限、temperature、stream 开关、版本、启停状态。
- `agent_bindings`
  管理 agent 命中规则，如工具、学习等级、`selection_mode`、路径、步骤、`interaction_type`、优先级、启停状态。
- `agent_skill_bindings`
  管理 agent 与 skill 的绑定关系，确保 agent 的运行时上下文来源可控。

后台需要支持的典型能力：

- 自由学习模式 agent 列表与详情
- 平台预设不同工具 / 路径的 agent 列表与详情
- agent 模板的新建、复制、编辑、启用、停用
- 绑定规则的新建、编辑、优先级调整、启用、停用
- 查看某个 agent 当前绑定了哪些 skill
- 查看某个路径 / 工具 / 交互类型最终会命中哪个 agent

关键约束：

- agent 不是一段随意可改的 prompt 文本，而是带默认 provider / model、上下文策略和 skill 绑定的完整配置实体。
- 不能把命中逻辑重新写死在后台页面；后台只编辑 `agent_templates`、`agent_bindings`、`agent_skill_bindings`，实际解析仍由服务端编排层统一执行。
- 对平台预设训练模式，必须能按“工具 + `preset_training` + path + interaction_type”管理不同 agent。
- 对自由学习模式，必须能按“工具 + `self_directed` + interaction_type”管理通用 agent。

#### 5.6.3 AI 核心后台页面信息架构

后台 AI 模块建议采用“配置真源管理 + 解析结果验证 + 调用观测”三段式结构，而不是只做表格 CRUD。

建议页面树：

- `/admin/ai`
  AI 运营首页，展示最近 24 小时成功率、失败率、P95 延迟、调用量、停用配置告警、最近变更记录。
- `/admin/ai/providers`
  provider 列表页，支持按 `provider_type`、状态、关键词筛选。
- `/admin/ai/providers/new`
  provider 新建页。
- `/admin/ai/providers/[id]`
  provider 详情页，包含基本信息、关联模型、最近调用概览、最近变更审计。
- `/admin/ai/models`
  model 列表页，支持按 provider、状态、能力标签筛选。
- `/admin/ai/models/new`
  model 新建页。
- `/admin/ai/models/[id]`
  model 详情页，包含所属 provider、关联 agent、调用概览、最近变更审计。
- `/admin/ai/agents`
  agent 模板列表页，支持按 `scenario_type`、工具家族、`selection_mode`、状态筛选。
- `/admin/ai/agents/new`
  agent 模板新建页。
- `/admin/ai/agents/[id]`
  agent 模板详情页，包含 prompt、默认 provider/model、技能绑定、命中规则、最近调用概览、版本历史摘要。
- `/admin/ai/bindings`
  命中规则列表页，支持按工具、路径、交互类型、状态筛选，并提供优先级排序与命中预览入口。
- `/admin/ai/skills`
  skill pack 与 `agent_skill_bindings` 管理页，首期可先以只读列表 + 绑定编辑为主。
- `/admin/ai/invocations`
  AI 调用日志列表页，支持时间范围、provider、model、agent、status、用户、路径筛选。
- `/admin/ai/invocations/[id]`
  调用详情页，展示脱敏 request/response、上下游对象引用、错误信息与处理建议。
- `/admin/ai/test`
  后台调试页，支持 resolve preview 与 agent test。

页面编排原则：

- 列表页只承担检索、筛选、启停与进入详情，不在列表里塞复杂编辑表单。
- 详情页必须能看到“当前对象影响了谁”和“谁在依赖当前对象”，避免误停用。
- AI 测试页与真实 CRUD 页分离，避免把调试动作和生产配置改动混在一起。

#### 5.6.4 LLM 管理表单字段设计

`ai_providers` 新建/编辑表单建议字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | 全局唯一，首期创建后不允许修改 |
| `name` | string | 是 | 后台展示名 |
| `provider_type` | enum | 是 | 现与 `public.ai_provider_type` 对齐 |
| `base_url` | string | 是 | provider API 基地址 |
| `auth_mode` | enum | 是 | 现与 `public.ai_auth_mode` 对齐 |
| `secret_ref` | string | 是 | 仅填 Secret 引用名，不允许填明文密钥 |
| `supports_stream` | boolean | 是 | provider 级能力标记 |
| `supports_json_mode` | boolean | 是 | provider 级能力标记 |
| `timeout_ms` | integer | 是 | 范围建议 `1000-180000` |
| `retry_count` | integer | 是 | 范围建议 `0-5` |
| `is_active` | boolean | 是 | 是否允许被运行时使用 |
| `metadata` | json editor | 否 | 仅存补充元信息，如 `consoleUrl`、`phase` |
| `changeReason` | string | 是 | 本次修改原因，写审计日志 |

`ai_models` 新建/编辑表单建议字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | 全局唯一，首期创建后不允许修改 |
| `provider_id` | uuid | 是 | 关联 `ai_providers.id` |
| `display_name` | string | 是 | 后台展示名 |
| `model_name` | string | 是 | 真正传给 provider 的模型名 |
| `supports_stream` | boolean | 是 | 运行时能力标记 |
| `supports_json_mode` | boolean | 是 | 运行时能力标记 |
| `supports_tool_calling` | boolean | 是 | 运行时能力标记 |
| `max_context_tokens` | integer | 是 | 必须大于 `default_max_output_tokens` |
| `default_max_output_tokens` | integer | 是 | 默认输出上限 |
| `recommended_temperature` | number | 否 | 范围建议 `0-2` |
| `pricing_metadata` | json editor | 否 | 成本元信息 |
| `is_active` | boolean | 是 | 是否可被 agent 使用 |
| `metadata` | json editor | 否 | 扩展字段，如 `profileGroup`、`routePolicy` |
| `changeReason` | string | 是 | 本次修改原因 |

LLM 管理页的额外交互要求：

- provider 详情页必须展示“关联模型数、活跃模型数、近 24 小时调用量、错误率”。
- model 详情页必须展示“被哪些 agent 模板引用、近 24 小时调用量、最近一次失败样例”。
- 首期不提供 provider / model 的物理删除按钮，只提供停用。

#### 5.6.5 Agents 管理表单字段设计

`agent_templates` 新建/编辑表单建议字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | 全局唯一，首期创建后不允许修改 |
| `name` | string | 是 | 后台展示名 |
| `scenario_type` | enum | 是 | 现与 `public.agent_scenario_type` 对齐 |
| `description` | string | 否 | 用于后台说明，不进入运行时 prompt |
| `system_prompt_template` | textarea | 是 | 主系统提示词 |
| `developer_prompt_template` | textarea | 否 | 附加约束 |
| `default_provider_code` | string | 是 | 关联 `ai_providers.code` |
| `default_model_code` | string | 是 | 关联 `ai_models.code` |
| `context_message_limit` | integer | 是 | 建议范围 `1-30` |
| `max_output_tokens` | integer | 是 | 运行时输出上限 |
| `temperature` | number | 是 | 范围建议 `0-2` |
| `top_p` | number | 否 | 范围建议 `0-1` |
| `stream_enabled` | boolean | 是 | 是否开启流式输出 |
| `is_active` | boolean | 是 | 是否可被命中 |
| `metadata` | json editor | 否 | 可包含 `toolFamily`、`profileCode` 等 |
| `changeReason` | string | 是 | 本次修改原因 |

`agent_bindings` 新建/编辑表单建议字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agent_code` | string | 是 | 关联 `agent_templates.code` |
| `tool_id` | uuid | 否 | 关联 `learning_tools.id` |
| `learning_level` | enum | 否 | 现与 `public.learning_level` 对齐 |
| `selection_mode` | enum | 否 | 现与 `public.path_selection_mode` 对齐 |
| `path_id` | uuid | 否 | 关联 `learning_paths.id` |
| `step_no` | integer | 否 | 对应关卡号 |
| `interaction_type` | string | 是 | 与运行时 `LearningInteractionType` 保持一致 |
| `priority` | integer | 是 | 数值越小优先级越高 |
| `is_active` | boolean | 是 | 是否参与命中 |
| `metadata` | json editor | 否 | 如 `bindingKind` |
| `changeReason` | string | 是 | 本次修改原因 |

`agent_skill_bindings` 新建/编辑表单建议字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agent_code` | string | 是 | 关联 `agent_templates.code` |
| `skill_code` | string | 是 | 关联 `skill_packs.code` |
| `priority` | integer | 是 | 数值越小越靠前 |
| `is_required` | boolean | 是 | 是否必带 |
| `context_budget_tokens` | integer | 否 | 分配给 skill 的上下文预算 |
| `is_active` | boolean | 是 | 是否加载 |
| `metadata` | json editor | 否 | 如 `bindingKind` |
| `changeReason` | string | 是 | 本次修改原因 |

Agents 管理页必须补齐的辅助能力：

- agent 模板复制
  复制当前模板生成新 `code`，用于灰度试验和快速回滚。
- 命中预览
  输入 `tool_id / selection_mode / path_id / step_no / interaction_type / learning_level`，返回最终命中的 binding 与 agent。
- 依赖视图
  在 agent 详情页显示其默认 provider/model、skill 绑定、命中规则与最近调用效果。

#### 5.6.6 AI 配置操作保护规则

因为这些配置直接影响线上教学质量，首期必须采用“停用优先、删除从严、变更必审计”的策略。

建议规则如下：

- provider 物理删除默认关闭；只有无任何 model 引用、无历史运行依赖且由 `super_admin` 操作时才允许。
- model 物理删除默认关闭；只允许删除未被任何 agent 模板引用的孤立配置。
- agent 模板不提供物理删除；只允许停用或复制为新模板。
- `skill_packs` 首期不开放物理删除，只允许停用和解除绑定。
- 停用 provider 前，必须先确认其关联活跃 model 都已迁出或停用。
- 停用 model 前，必须先确认不存在活跃 `agent_templates.default_model_code` 引用。
- 停用 agent 模板前，必须先确认不存在活跃 `agent_bindings` 指向该模板。
- 停用 skill 绑定前，不要求阻塞，但要提示会影响哪些 agent 的上下文构成。
- 所有写操作必须要求 `changeReason`，并把前值、后值写入 `admin_audit_logs`。
- 首期不单独建设 draft/publish 表；继续复用现有真源表，以 `version + 审计日志 + 模板复制` 完成回滚与灰度。

与这两个核心主业务配套的后续能力：

- `agent` 测试接口
- provider / model / agent / skill 的后台配置页
- Prompt 灰度与回滚

### 5.7 导出与审计

管理后台首期必须具备两类横向能力：

- 导出能力
  用户列表、反馈列表、AI 调用列表、学习计划列表都需要提供导出能力。
- 审计能力
  所有管理员写操作都要记录操作人、对象、前值、后值、原因、时间和来源。

这两个能力的优先级应高于复杂图表，因为它们直接影响运营协作和风控。

### 5.8 暂不纳入首期后台的模块

以下模块先在设计上预留，但不进入后台第一阶段：

- 通知模板与通知发送后台
- 订阅与支付后台
- 课程/路径内容大规模可视化配置后台
- 排行榜和社区运营后台

---

## 6. 技术方案

### 6.1 总体技术路线

管理后台继续复用当前同仓技术栈：

- 前端与路由：`Next.js 16.2.0` App Router
- UI：`React 19.2.4` + `Tailwind CSS 4.2` + `shadcn/ui`
- 后端：`app/api/admin/*` + `server/modules/*`
- 鉴权与会话：Supabase Auth
- 数据与存储：阿里云 AnalyticDB PostgreSQL 版 Supabase
- 契约文档：OpenAPI 3.1 + Swagger UI

不建议为后台单独新建一个独立后端服务。当前阶段继续放在同仓项目中，能最大化复用现有业务规则和 read model。

### 6.2 路由与目录建议

建议后台前端路由按当前代码继续落在 `(admin-shell)` 分组：

- `app/(admin-shell)/admin/page.tsx`（或 `app/admin/page.tsx`）
- `app/(admin-shell)/admin/users/*`（**已落地**）
- `app/(admin-shell)/admin/learning/*`（**已落地**）
- `app/(admin-shell)/admin/feedback/*`
- `app/admin/ai/*`
- `app/admin/settings/*`

建议首期按下列页面职责落目录，而不是只建空壳路由：

| 路由 | 页面职责 |
|------|----------|
| `app/admin/page.tsx` | 后台首页，总览值班面板 |
| `app/admin/feedback/page.tsx` | 反馈列表 |
| `app/admin/feedback/[id]/page.tsx` | 工单详情、回复、状态切换 |
| `app/(admin-shell)/admin/users/page.tsx` | 用户列表、筛选、导出、行内编辑抽屉 |
| `app/(admin-shell)/admin/users/[userId]/page.tsx` | 用户详情（资料/学习/工单/软删恢复）；备注与积分调整入口仍待后续 API |
| `app/(admin-shell)/admin/learning/page.tsx` | 学习路径实例列表、筛选、导出 |
| `app/(admin-shell)/admin/learning/[pathId]/page.tsx` | 学习路径详情、时间线、最近会话、状态运营 |
| `app/admin/ai/page.tsx` | AI 运营首页 |
| `app/admin/ai/providers/page.tsx` | provider 列表 |
| `app/admin/ai/providers/new/page.tsx` | provider 新建 |
| `app/admin/ai/providers/[id]/page.tsx` | provider 详情/编辑 |
| `app/admin/ai/models/page.tsx` | model 列表 |
| `app/admin/ai/models/new/page.tsx` | model 新建 |
| `app/admin/ai/models/[id]/page.tsx` | model 详情/编辑 |
| `app/admin/ai/agents/page.tsx` | agent 模板列表 |
| `app/admin/ai/agents/new/page.tsx` | agent 新建 |
| `app/admin/ai/agents/[id]/page.tsx` | agent 详情/编辑 |
| `app/admin/ai/bindings/page.tsx` | 命中规则列表与排序 |
| `app/admin/ai/skills/page.tsx` | skill 绑定管理 |
| `app/admin/ai/invocations/page.tsx` | 调用日志列表 |
| `app/admin/ai/invocations/[id]/page.tsx` | 调用日志详情 |
| `app/admin/ai/test/page.tsx` | resolve preview 与 agent test |

建议新增后台前端业务域：

- `features/admin-shell`
- `features/admin-users`
- `features/admin-feedback`
- `features/admin-learning`（**已落地**）
- `features/admin-ai`
- `features/admin-dashboard`

### 6.3 当前已落地的管理后台导航与联动说明

当前管理后台主导航已与代码一致：

- `/admin`：总览看板
- `/admin/users`：用户运营
- `/admin/learning`：学习运营
- `/admin/feedback`：反馈工单

当前真实页面联动关系：

- 用户详情页可携带 `?userId=` 跳转到反馈工单列表，保持用户筛选上下文。
- 学习运营列表页进入学习路径详情页后，详情页右侧展示用户快照，并可跳转到对应用户详情页。
- 用户运营与学习运营共享同一套后台壳层、顶部 breadcrumb、管理员会话守卫和 BFF 客户端错误处理。
- 学习运营中的状态操作统一走 `POST /api/admin/learning-paths/{pathId}/status`，由服务端复用用户侧学习路径状态机约束并写入审计。

后端建议：

- 保持 `/api/admin/*` 作为后台 API 统一命名空间
- 跨域 read model 用专门的 `server/modules/admin-*` 模块承接
- 单域内的后台能力继续复用原域模块，例如当前反馈后台仍可由 `server/modules/feedback` 维护

### 6.3 管理员认证演进

当前已落地（Phase 1）：

- 已建立 `admin_accounts`、`admin_roles`、`admin_account_roles`
- 后台页面通过 Supabase Auth 登录，服务端通过管理员会话 Cookie 识别身份
- 服务端通过 `admin_accounts + admin_account_roles` 做权限解析
- `/api-docs` 已纳入管理员登录守卫，未登录会跳转 `/admin/login?next=/api-docs`

### 6.4 OpenAPI 与共享 schema

后台新增 API 必须继续接入当前运行时文档体系：

- schema 放入 `server/modules/api-docs/schemas.ts`
- 路由注册放入 `server/modules/api-docs/openapi.ts`
- 路由层继续复用 `server/lib/request-validation.ts`、`route-response.ts`、`route-error.ts`

这样后台接口能与用户侧接口一样，在 `/api-docs` 中统一查看与调试。

---

## 7. 后端 API 契约与规范

### 7.1 总体原则

后台 API 继续遵守当前项目统一规范：

- 命名空间：`/api/admin/*`
- 响应结构：`{ code, message, data }`
- 路由层保持薄入口
- 请求校验集中到共享 validation helper
- 错误码与错误文案可直接映射前端
- 全部写接口必须记录管理员审计日志

### 7.2 认证规范

- 浏览器通过后台登录接口获取受控管理员会话（Cookie）
- API 服务端从管理员会话中解析管理员身份
- 后台接口文档与调试以会话模式为准

### 7.3 查询规范

后台查询接口统一支持以下能力：

- `page`
- `pageSize`
- `sortBy`
- `sortOrder`
- 时间范围筛选
- 关键词搜索
- 结构化筛选项

后台列表响应统一建议：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 120,
    "hasMore": true
  }
}
```

### 7.4 后台 API 分组建议

首期建议接口分组如下：

| 分组 | 接口 | 状态 |
|------|------|------|
| 管理员认证 | `POST /api/admin/auth/login`、`GET /api/admin/session`、`POST /api/admin/auth/logout` | 新增 |
| 总览看板 | `GET /api/admin/dashboard/overview` | 新增 |
| 用户运营 | `GET /api/admin/users`、`GET /api/admin/users/export`、`GET /api/admin/users/{userId}`、`PATCH /api/admin/users/{userId}`、`POST /api/admin/users/{userId}/soft-delete`、`POST /api/admin/users/{userId}/restore` | **已落地** |
| 用户备注 | `GET /api/admin/users/{userId}/notes`、`POST /api/admin/users/{userId}/notes` | 规划中 |
| 积分调整 | `POST /api/admin/users/{userId}/score-adjustments` | 规划中 |
| 反馈工单 | `GET /api/admin/feedback`、`GET /api/admin/feedback/{id}`、`POST /api/admin/feedback/{id}/reply`、`POST /api/admin/feedback/{id}/status` | 已有 |
| 学习运营 | `GET /api/admin/learning-paths`、`GET /api/admin/learning-paths/export`、`GET /api/admin/learning-paths/{pathId}`、`POST /api/admin/learning-paths/{pathId}/status` | **已落地** |
| AI 运营 | `GET /api/admin/ai/invocations`、`GET /api/admin/ai/invocations/{id}` | 新增 |
| LLM 管理 | `GET /api/admin/ai/providers`、`POST /api/admin/ai/providers`、`GET /api/admin/ai/providers/{id}`、`PATCH /api/admin/ai/providers/{id}`、`GET /api/admin/ai/models`、`POST /api/admin/ai/models`、`GET /api/admin/ai/models/{id}`、`PATCH /api/admin/ai/models/{id}` | 新增 |
| Agents 管理 | `GET /api/admin/ai/agents`、`POST /api/admin/ai/agents`、`GET /api/admin/ai/agents/{id}`、`PATCH /api/admin/ai/agents/{id}`、`GET /api/admin/ai/agent-bindings`、`POST /api/admin/ai/agent-bindings`、`PATCH /api/admin/ai/agent-bindings/{id}`、`GET /api/admin/ai/agent-skill-bindings`、`POST /api/admin/ai/agent-skill-bindings`、`PATCH /api/admin/ai/agent-skill-bindings/{id}`、`GET /api/admin/ai/skills` | 新增 |
| AI 测试 | `POST /api/admin/ai/resolve-preview`、`POST /api/admin/ai/agent/test` | 参考 AI 文档，后续新增 |
| 审计 | `GET /api/admin/audit-logs` | 新增 |

### 7.5 写接口规范

后台写接口需要额外约束：

- 必须要求填写 `reason` 或 `remark`
- 必须写入 `admin_audit_logs`
- 对会影响用户状态机的操作，要做前置校验与冲突返回
- 需要尽量复用已有领域 service，而不是后台自己重写状态机

### 7.6 AI 核心配置接口细化

#### `POST /api/admin/ai/providers`

请求体建议：

```json
{
  "code": "siliconflow",
  "name": "SiliconFlow",
  "providerType": "siliconflow",
  "baseUrl": "https://api.siliconflow.cn/v1",
  "authMode": "bearer",
  "secretRef": "SILICONFLOW_API_KEY",
  "supportsStream": true,
  "supportsJsonMode": false,
  "timeoutMs": 60000,
  "retryCount": 1,
  "isActive": true,
  "metadata": {
    "consoleUrl": "https://cloud.siliconflow.cn/models"
  },
  "changeReason": "新增正式生产 provider"
}
```

关键校验规则：

- `code` 必须唯一，且只允许小写字母、数字、中横线。
- 不允许提交 `secretValue`、`apiKey` 一类明文密钥字段。
- `timeoutMs`、`retryCount` 必须在允许范围内。
- 若 `isActive = true`，`baseUrl`、`authMode`、`secretRef` 必须完整。

成功响应建议：

```json
{
  "code": "OK",
  "message": "provider created",
  "data": {
    "id": "uuid",
    "code": "siliconflow"
  }
}
```

#### `PATCH /api/admin/ai/providers/{id}`

用途：

- 更新 provider 的展示属性、能力标记、超时与停用状态。

关键规则：

- 不允许修改 `code`。
- 若请求停用 provider，必须先校验不存在依赖它的活跃 model 或活跃 agent 链路。
- 必须带 `changeReason`。

#### `POST /api/admin/ai/models`

关键规则：

- `providerId` 必须存在且 provider 为启用状态，除非本次创建明确为停用模型。
- `maxContextTokens` 必须大于 `defaultMaxOutputTokens`。
- `recommendedTemperature`、`topP` 等浮点字段需要做区间校验。
- `code` 唯一且创建后不可改。

#### `PATCH /api/admin/ai/models/{id}`

关键规则：

- 不允许修改 `code`。
- 若请求停用 model，必须先检查 `agent_templates.default_model_code` 是否存在活跃引用。
- 支持更新 `pricingMetadata` 与 `metadata`，但必须记录差异审计。

#### `POST /api/admin/ai/agents`

请求体建议：

```json
{
  "code": "codex-cli-coach",
  "name": "Codex CLI 工作流教练",
  "scenarioType": "teaching",
  "description": "Codex CLI 工作流训练主教学 agent",
  "systemPromptTemplate": "你是 Codex CLI 工作流教练，关注短提示、范围控制和结果验证。",
  "developerPromptTemplate": "优先让用户缩小任务范围并验证当前结果。",
  "defaultProviderCode": "siliconflow",
  "defaultModelCode": "deepseek-v3-2",
  "contextMessageLimit": 8,
  "maxOutputTokens": 2600,
  "temperature": 0.2,
  "topP": 0.8,
  "streamEnabled": true,
  "isActive": true,
  "metadata": {
    "toolFamily": "cli",
    "profileCode": "sf-code-workflow"
  },
  "changeReason": "新增 Codex CLI 训练营主教学 agent"
}
```

关键规则：

- `defaultProviderCode`、`defaultModelCode` 必须存在且处于可用状态。
- `scenarioType` 必须和后续绑定里的 `interactionType` 组合保持业务一致，不允许出现明显不匹配的配置。
- agent 更新时若 prompt、默认模型、上下文窗口有变化，建议服务端自动把 `version` 加一。

#### `POST /api/admin/ai/agent-bindings`

关键规则：

- `agentCode` 必须存在且 agent 为启用状态，除非本次 binding 本身创建为停用。
- `pathId` 若存在，则必须属于对应 `toolId`。
- `stepNo` 若存在，则只能在已选路径下使用。
- `interactionType` 必须落在当前运行时支持集合：`teaching`、`blocked_help`、`task_review`、`completion_feedback`、`path_guidance`。
- 同一筛选维度允许存在多条记录，但必须通过 `priority` 明确先后顺序。

#### `POST /api/admin/ai/agent-skill-bindings`

关键规则：

- `(agentCode, skillCode)` 必须唯一。
- `skillCode` 必须存在且 skill pack 为启用状态，除非本次 binding 为停用。
- `contextBudgetTokens` 若填写，必须为正整数，且应小于 agent 最大上下文预算。

#### `POST /api/admin/ai/resolve-preview`

用途：

- 供后台输入一组运行时条件，预览最终会命中的 binding、agent、provider、model、skills。

请求体建议：

```json
{
  "toolId": "uuid",
  "learningLevel": "intermediate",
  "selectionMode": "preset_training",
  "pathId": "uuid",
  "stepNo": 3,
  "interactionType": "teaching"
}
```

响应建议返回：

- 命中的 `agentBinding`
- 命中的 `agentTemplate`
- 最终 provider / model
- skill 列表
- 若未命中，给出明确未命中原因

#### `POST /api/admin/ai/agent/test`

用途：

- 在后台受控触发一次 agent 测试调用，用于验证 prompt、provider、model、skill 组合。

关键约束：

- 测试调用必须打上 `invocation_source = admin_test` 或等价 metadata，避免混淆真实学习流量。
- 测试不得默认复用真实用户会话，除非管理员明确使用受控测试账号。
- 测试结果同样写 `llm_invocations`，但与生产用户流量分开筛选。

### 7.7 错误码与冲突规则建议

后台管理 API 需要比用户侧接口更明确的冲突信息，避免运营误操作。

建议补齐以下共享错误码：

| 错误码 | HTTP | 场景 |
|------|------|------|
| `ADMIN_FORBIDDEN` | 403 | 管理员未登录或角色无权限 |
| `ADMIN_VALIDATION_ERROR` | 400 | 请求字段不合法 |
| `ADMIN_DUPLICATE_CODE` | 409 | `code` 重复 |
| `ADMIN_REFERENCE_CONFLICT` | 409 | 目标对象仍被活跃依赖引用 |
| `ADMIN_INACTIVE_DEPENDENCY` | 409 | 依赖对象已停用，当前配置不可提交 |
| `ADMIN_SECRET_FIELD_REJECTED` | 400 | 请求中出现明文密钥字段 |
| `ADMIN_RESOLVE_NOT_FOUND` | 422 | resolve preview 未命中任何有效 agent |
| `ADMIN_AUDIT_REASON_REQUIRED` | 400 | 缺少 `changeReason` |

实现建议：

- 继续复用当前共享 route error helper，再新增后台专用错误映射 helper。
- 对“停用失败”类错误，响应里要包含简短依赖摘要，例如“仍有 3 个活跃 agent 模板引用此 model”。
- `/api-docs` 中应给这些错误补统一示例，方便后台开发和调试。

---

## 8. 数据库扩展方案

### 8.1 继续复用的现有表与视图

管理后台第一阶段优先复用以下对象：

- `user_profile_export_view`
- `feedback_tickets`
- `feedback_replies`
- `user_learning_paths`
- `user_tasks`
- `score_ledgers`
- `user_ranks`
- `daily_checkins`
- `conversation_sessions`
- `conversation_messages`
- `ai_providers`
- `ai_models`
- `agent_templates`
- `agent_bindings`
- `skill_packs`
- `agent_skill_bindings`
- `llm_invocations`

其中 AI 运营后台的“LLM 管理”和“Agents 管理”应直接把这些表作为配置真源，而不是另外复制一套后台专用配置表。

### 8.2 建议新增的核心表

建议新增以下后台基础表：

#### `admin_accounts`

用途：

- 记录后台管理员账号与状态

关键字段建议：

- `user_id`
- `display_name`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

#### `admin_roles`

用途：

- 定义角色，如 `support_admin`、`ops_admin`、`ai_ops_admin`、`super_admin`

#### `admin_account_roles`

用途：

- 建立管理员与角色的多对多关系

#### `admin_audit_logs`

用途：

- 记录所有后台写操作与敏感读操作

关键字段建议：

- `id`
- `admin_user_id`
- `action`
- `target_type`
- `target_id`
- `before_snapshot`
- `after_snapshot`
- `reason`
- `request_context`
- `request_id`
- `created_at`

#### `user_admin_notes`

用途：

- 支撑客服与运营的内部备注

关键字段建议：

- `id`
- `user_id`
- `author_admin_user_id`
- `content`
- `is_pinned`
- `created_at`
- `updated_at`

### 8.3 建议扩展的现有表

#### `feedback_tickets`

建议后续扩展字段：

- `assigned_admin_user_id`
- `first_response_at`
- `resolved_at`
- `sla_due_at`
- `tags`

原因：

- 当前反馈表足够支撑基本处理，但还不足以支撑工单分派、SLA 和团队协作。

#### `event_logs`

当前仍停留在设计层，建议作为后台第二阶段基础设施补齐。

用途：

- 支撑激活、留存、转化、入口来源、页面行为与漏斗分析

### 8.4 AI registry 与 agent 配置约束

LLM 管理与 Agents 管理应遵守以下数据库约束：

- `ai_providers` 与 `ai_models` 继续作为 provider / model registry 真源
- `agent_templates` 继续作为 agent 模板真源
- `agent_bindings` 继续作为命中规则真源
- `agent_skill_bindings` 继续作为 skill 挂载真源
- 后台若提供“删除”能力，首期应优先实现为 `is_active = false` 的软停用，而不是物理删除
- 后台对 provider / model / agent 的写操作，都需要检查是否存在活跃引用关系

对 agent 规则的运营要求：

- 自由学习模式必须支持按 `tool + self_directed + interaction_type` 管理默认 agent
- 平台预设训练模式必须支持按 `tool + preset_training + path_id + interaction_type` 管理精细绑定
- 如后续继续细化到 `step_no` 级别，也必须继续落在 `agent_bindings` 上，而不是前端手写规则

### 8.5 建议新增读视图

视图不是第一批必须，但会显著降低后台列表复杂度。

建议视图：

- `admin_user_overview_view`
  基于 `user_profile_export_view` 再补积分、打卡、最近反馈数、最近 AI 会话时间。
- `admin_feedback_queue_view`
  聚合反馈单、最后回复、指派人、SLA 状态。
- `admin_ai_invocation_daily_view`
  聚合 provider / model / day 维度的成功率、延迟与 token 汇总。

### 8.6 AI 配置变更落库策略

AI 核心配置变更既要可追踪，也要尽量少引入额外配置真源。基于当前代码基线，首期建议如下：

- 不新增第二套 provider / model / agent 草稿表。
- `ai_providers`、`ai_models`、`agent_templates`、`agent_bindings`、`agent_skill_bindings` 继续作为唯一真源。
- 回滚优先依赖 `admin_audit_logs.before_snapshot` 与“复制模板后重新绑定”的方式完成。
- `agent_templates.version` 在以下变更时自动递增：
  - `system_prompt_template`
  - `developer_prompt_template`
  - `default_provider_code`
  - `default_model_code`
  - `context_message_limit`
  - `max_output_tokens`
  - `temperature`
  - `top_p`
- 对 `agent_bindings` 和 `agent_skill_bindings`，首期不单独做版本表，直接依赖审计快照即可。
- 若后续 AI 配置变更频率显著提高，再评估是否新增 `ai_config_change_sets` 或 `agent_template_versions` 一类历史表。

这样做的原因：

- 当前系统还处于 MVP 后续运营化阶段，配置数量可控。
- 先保证“真源单一、可追踪、可回退”，比过早引入复杂 draft/publish 体系更重要。
- 该策略与现有运行时解析方式兼容，不会破坏已经实现的 agent 命中链路。

---

## 9. 安全、权限与审计原则

后台能力的风险远高于用户侧页面，因此必须遵守以下原则：

- 管理员身份和普通用户身份分离建模
- 后台写操作默认需要审计
- 后台不能直接暴露完整敏感 payload，AI 请求体和响应体应保持脱敏版本
- 导出接口需要权限控制和导出记录
- 用户原始消息、手机号、邮箱等敏感信息要按最小必要原则展示
- 对可能影响主链路的数据修正，优先采用“写补偿记录”而不是“直接覆盖原值”

---

## 10. 推进计划

### Phase 0：设计对齐与基础收口

目标：

- 确认后台边界与首期模块
- 统一认证、权限、审计的总体方案
- 统一 OpenAPI 与数据库扩展策略

产出：

- 本设计文档
- 后续后台前端设计文档
- 后台 API 细化计划

### Phase 1：反馈工单后台正式化 ✅ 已完成

目标：

- 把已存在的反馈后台 API 接上真实后台页面
- 补管理员登录与后台壳层
- 补最小审计能力

范围：

- 管理员登录
- 后台基础 layout
- 反馈列表、详情、回复、状态切换
- `admin_accounts`、`admin_roles`、`admin_account_roles`、`admin_audit_logs`

完成日期：2026-03-31

详细设计：`docs/plans/2026-03-31-admin-console-phase1-design.md`
实施计划：`docs/plans/2026-03-31-admin-console-phase1-implementation.md`

### 用户运营（终端用户）✅ 已完成

目标：

- 让运营与客服能检索用户、查看聚合详情、导出 CSV，并在受控范围内维护资料与账号可用性。

范围（已实现）：

- 前端：`features/admin-users`（列表、详情、编辑抽屉、与 `admin-shell` 菜单联动）
- 后端：`server/modules/admin-users` + `app/api/admin/users/*`
- 数据：读模型基于 `user_profile_export_view`；写模型为资料 PATCH、软删除标记与恢复
- 文档：OpenAPI `admin-users` 分组

完成日期：2026-04（以仓库提交为准）

明确未包含在本阶段：

- 用户内部备注 API、人工积分调整 API（仍见 §5.3「仍属后续规划」）

### Phase 2：AI 核心配置后台

目标：

- 让 AI 运营可以真正管理和微调当前 AI 导师的核心配置真源

范围：

- provider CRUD
- model CRUD
- 自由学习模式 agent CRUD
- 平台预设不同工具 / 不同路径 agent CRUD
- `agent_bindings` / `agent_skill_bindings` 管理
- AI 调用日志列表与详情
- 最小 AI 健康面板

### Phase 3：用户域深化

目标：

- 在已有用户运营与看板基础上，补齐「学习路径级」运营能力与用户域剩余写能力

范围：

- 用户内部备注、`user_admin_notes`（若采用独立表）及对应 API
- 人工积分调整与审计
- 必要读视图与列表性能优化

说明：**用户列表、详情、导出、资料 PATCH、软删/恢复**以及**学习路径列表、详情、导出、状态运营**已在当前代码中交付，不再重复列入本阶段范围。

### Phase 4：高级运营配置

目标：

- 进入更深层运营化配置与分析

范围：

- `event_logs` 落地与行为分析
- AI agent test
- AI 配置可视化
- Prompt 灰度与回滚
- 通知、订阅等后续域的后台接入

---

## 11. 建议开发顺序

建议按以下顺序推进：

1. 管理员认证、后台壳层、反馈工单与用户运营（列表/详情/导出/资料/软删）已在当前仓库交付，可作为后续模块的基础。
2. 紧接着优先做 LLM 管理和 agents 管理，把 provider、model、自由学习模式 agent、平台预设不同工具/路径 agent 的可视化配置能力接上。
3. 再做 AI 调用日志和最小 AI 健康面板，让 AI 运营能把“配置微调”与“线上效果”连起来看。
4. 用户列表、详情、导出与资料维护已交付，学习路径级运营也已交付；继续补用户备注与积分人工调整等，形成更深运营闭环。
5. 最后再补 `event_logs`、AI agent test、Prompt 灰度与回滚，以及通知/订阅等更重的后台能力。

---

## 12. 关键风险与约束

### 12.1 权限模型过晚补齐

如果先做后台页面、后补权限体系，会导致接口和页面大量返工。管理员身份模型必须优先于大规模后台写接口。

### 12.2 直接改主链路数据

后台若直接覆盖用户主数据，容易破坏学习计划状态机与成长一致性。所有修正动作都应优先通过领域 service 或补偿记录完成。

### 12.3 埋点未落地导致指标失真

在 `event_logs` 落地前，后台看板只能提供“业务代理指标”，不能冒充完整增长分析面板。

### 12.4 AI 运营读写边界不清

AI registry、agent、skill、prompt 的后台配置能力必须遵守 `2026-03-30-ai-coding-tutor-ai-orchestration-design.md`，不能在后台重新发明一套不兼容结构。

### 12.5 AI 配置误操作直接影响教学质量

当前系统的 AI 导师效果强依赖 provider、model、agent、binding、skill 的后台配置。如果缺少依赖检查、审计和回滚路径，单次误停用或错误绑定就可能直接破坏真实学习链路。

因此必须坚持：

- 停用优先于删除
- 变更必填原因
- 写操作必审计
- 命中预览与测试页面先于大规模配置编辑上线

---

## 13. 结论

当前项目已具备管理后台多条可用链路：**反馈工单**、**用户运营（列表/详情/导出/资料/软删恢复）**、**学习运营（学习路径列表/详情/导出/状态运营）**以及与 Phase 1 一体的认证与看板。若要继续提升「AI 导师质量」的可运营性，仍应优先把 **LLM 管理与 agents 管理** 做成核心主业务；用户侧与学习路径侧运营主数据检索、回看与受控状态操作已不再阻塞基础运营工作。

因此，推荐推进顺序可调整为「反馈 + 壳层 + 用户运营/学习运营（已交付）-> LLM/agents 管理 -> AI 调用观测 -> 用户域深化（备注、积分等）-> 高级配置」。

后台设计必须继续建立在当前同仓架构上，复用：

- `app/api/admin/*`
- `server/lib/*` 共享校验与错误处理
- `server/modules/*` 领域服务
- Supabase 现有业务表、写模型表、导出视图和 AI 调用审计表

在此基础上，管理员身份与基础审计、用户 read model 与导出已可用；后续再逐步补更重的 AI 配置与学习路径运营能力，才能在不破坏主链路完整性的前提下，把后台真正做成运营可用的系统。
