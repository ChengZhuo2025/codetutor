# docs/plans README

## 目的

本目录保存的是当前项目仍然有效的产品、设计、架构与接口规范文档。

如果你是第一次接手这个项目，建议不要从单篇文档随机开始读，而是按下面顺序建立全局认识。

## 30 秒状态速览

- 当前项目已不是纯原型仓库，而是“前端页面 + `app/api` + `server/modules` + Supabase migrations”的同仓 MVP。
- 已实现主链路：登录、首页登录态恢复、onboarding、学习会话读取与历史消息分页、真实 AI 学习消息、自学模式异步教程链接生成学习计划草稿（`plan-from-material` async intake、`material-intakes/{id}` 状态轮询、`plan-drafts/{id}` 详情/编辑、`plan-drafts/{id}/tasks/{taskId}/regenerate`、confirm·regenerate，以及 `raw text -> subtitle -> ASR -> OCR/vision` 多模态证据摄取、evidence metadata 落库、每关 `masteryPoints` / `cautions` 生成与编辑、编辑/单任务重生成后的即时质量复检、confirm 写入 `path_steps.key_points` / `pitfalls`、规则 + 可选小模型 quality gate）、地图、成就、历史学习计划管理、个人资料、头像上传、用户反馈、管理后台 Phase 1（管理员登录/退出、总览看板、反馈工单）、**用户运营**（`/admin/users` 列表与筛选、`/admin/users/[userId]` 详情、CSV 导出、受控资料编辑、软删除/恢复、关联反馈工单）、**学习运营**（`/admin/learning` 列表与筛选、`/admin/learning/[pathId]` 详情、CSV 导出、最近会话摘要、`reactivate/archive` 状态操作）、**AI 运营**（`/admin/ai` 概览、providers/models/agents 列表与详情、bindings/skills、调用日志列表与详情、resolve preview、agent test）以及 **系统设置**（`/admin/settings`：资料、安全、管理员账号列表与启停、角色权限说明、操作审计、系统信息）。
- 当前代码技术栈以 `package.json` 为准：`Next.js 16.2.0`、`React 19.2.4`、`TypeScript 5.7.3`、`Tailwind CSS 4.2`、`shadcn/ui`、`Zod + zod-to-openapi + Swagger UI`；当前本地验证环境为 `Node.js 22.18.0`。
- 已补运行时接口文档：`/api/docs/openapi` 输出 OpenAPI 3.1 JSON，`/api-docs` 提供 Swagger UI 查看与调试；文档 `info.description` 注明用户端主题偏好为前端 localStorage、无 REST 接口。
- 用户端支持明暗主题切换（默认暗色，`next-themes` + `app/globals.css` 双套令牌），入口：营销顶栏、登录页右上角、工作台左侧栏底部设置行右侧。
- 用户端工作台共享壳层现已支持桌面端左右栏折叠：左侧可收起为 mini rail（保留 logo / 头像 / 导航 / 学习提醒 / 设置 / 主题 / 展开入口），右侧上下文栏可完全收起并由浮动按钮重新展开；状态保存在浏览器 `localStorage`，无 REST API。
- `app/api` 当前已大量收敛为薄入口层，请求校验、统一响应、错误映射与部分路由编排已下沉到 `server/lib/*` 与各域 `route-handler.ts`。
- 已落地数据侧：远程 Supabase、`001` 到 `027` 迁移（含 `018` 材料摄取与计划草稿表、`019` 用户软删除、`020` analytics/notifications、`021` Provider API Key 数据库加密托管、`024` async material intake / generation runs / chunks、`025` editable drafts / revisions、`026` material chunk evidence metadata、`027` 草稿任务 `mastery_points` / `cautions` 契约升级、planner prompt 同步与历史已确认自学路径 `key_points/pitfalls` 回填）、头像 Storage、反馈工单表、学习计划 `interrupted` 状态迁移、成长写模型、每日打卡表、AI 会话 / provider / agent / skill / invocation 表，以及管理员账号/角色/审计日志表。
- 已补 Phase 1 运行时性能与稳定性加固：进程内短 TTL 用户鉴权 / 管理员会话缓存、AI 配置快照缓存、关键接口限流与请求级观测头 / 结构化日志；当前仍未引入 Redis / 消息队列，缓存与限流均为单实例进程内实现。
- 仍待实现：细粒度权限深化、用户域更深写能力如内部备注 / 人工积分调整、AI 域更深运营化能力（prompt 版本化、灰度/回滚、成本与稳定性面板等）、订阅支付域。（**用户运营**、**学习运营**、**AI 运营**、**系统设置**、**analytics 事件写入** 与 **通知设置落库/站内提醒** 已在代码中落地，不再归入「待实现」。）
- 若只想最快了解真实现状，优先读：
  1. `docs/plans/README.md`
  2. `docs/plans/2026-03-23-ai-coding-tutor-frontend-engineering-guide.md`
  3. `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`

## 快速阅读顺序

1. [PRD](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-prd.md)
   当前产品范围、真实 MVP 边界、页面与能力口径。
2. [页面级原型说明](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-page-prototype-spec.md)
   当前 7 个用户端页面的功能定位、信息结构与页面职责。
3. [前端工程说明](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-frontend-engineering-guide.md)
   当前仓库代码结构、页面落位、真实接口接入情况与前端实现现状。
4. [技术架构设计](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-technical-architecture.md)
   当前全栈技术路线、领域划分、关键链路与系统边界。
5. [API 规范](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-api-spec.md)
   当前前后端联调契约，已按前端原型校准。
6. [数据库 Schema 设计](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md)
   当前核心实体、约束、查询场景与建模主线。
7. [后端结构设计](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-backend-structure-design.md)
   后端模块划分、职责边界与 MVP 开发顺序。

按需补充阅读：

- [UI 视觉设计说明](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-ui-visual-design-spec.md)
- [ADR 合集](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-adr-records.md)
- [AI Orchestration 设计文档](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md)
- [自由学习模式教程链接自动拆解实施方案](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-04-01-ai-coding-tutor-free-mode-material-plan-implementation.md)
- [自由学习模式异步多模态实施计划](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-04-08-ai-coding-tutor-material-plan-async-multimodal-implementation-plan.md)
- [管理后台设计文档](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md)

## 当前目录中各文档职责

- `2026-03-23-ai-coding-tutor-prd.md`
  产品范围与需求主文档。
- `2026-03-23-ai-coding-tutor-page-prototype-spec.md`
  页面职责、信息架构、页面级交互口径。
- `2026-03-23-ai-coding-tutor-ui-visual-design-spec.md`
  当前视觉系统、颜色语义、页面级视觉重点。
- `2026-03-23-ai-coding-tutor-frontend-engineering-guide.md`
  当前前端工程落地现状，以真实代码为准。
- `2026-03-23-ai-coding-tutor-technical-architecture.md`
  系统整体技术架构与关键链路。
- `2026-03-23-ai-coding-tutor-api-spec.md`
  当前服务端接口契约。
- `2026-03-23-ai-coding-tutor-database-schema-design.md`
  当前数据库建模与一致性规则。
- `2026-03-23-ai-coding-tutor-backend-structure-design.md`
  后端目录结构、模块划分与开发顺序。
- `2026-03-23-ai-coding-tutor-adr-records.md`
  仍然有效的关键架构决策记录。
- `2026-03-30-ai-coding-tutor-ai-orchestration-design.md`
  AI 编排模块的持久性设计主文档，用于说明 provider、agent、会话、消息、上下文与运行时链路。
- `2026-04-01-ai-coding-tutor-free-mode-material-plan-implementation.md`
  自由学习模式中“教程链接 -> 材料摄取 -> 自动生成学习计划草稿 -> 确认激活”的实施方案与验收机制；**Phase A（白名单图文 + 同步草稿 + confirm 物化）已在代码与迁移中落地**，后续 Phase B/C 仍以本文档为范围说明。
- `2026-04-08-ai-coding-tutor-material-plan-async-multimodal-implementation-plan.md`
  基于 `2026-04-01` 目标态方案拆出的可执行实施计划，覆盖异步 intake、多模态解析、可编辑草稿工作台、质量闸门、通知恢复与文档同步顺序。
- `2026-03-31-ai-coding-tutor-admin-console-design.md`
  管理后台的运营需求、技术方案、后端契约、数据库扩展与推进顺序主文档。

## 当前项目事实摘要

- 当前仓库已经不是“纯前端 demo”，而是一个包含前端页面、`app/api` BFF、`server/modules` 服务层、Supabase 迁移与远程数据库接入脚本的同仓项目。
- 当前真实用户端页面为 7 个：`/`、`/login`、`/onboarding`、`/learn`、`/map`、`/achievements`、`/history`；管理端已落地页面包括：`/admin/login`、`/admin`（总览）、`/admin/users`、`/admin/users/[userId]`、`/admin/learning`、`/admin/learning/[pathId]`、`/admin/ai`、`/admin/ai/providers`、`/admin/ai/providers/[providerId]`、`/admin/ai/models`、`/admin/ai/models/[modelId]`、`/admin/ai/agents`、`/admin/ai/agents/[agentId]`、`/admin/ai/bindings`、`/admin/ai/skills`、`/admin/ai/invocations`、`/admin/ai/invocations/[invocationId]`、`/admin/ai/test`、`/admin/settings`、`/admin/feedback`、`/admin/feedback/[id]`；另有内部开发用接口文档页 `/api-docs`。
- 当前已落地的真实接口包括：认证登录、认证会话摘要、用户档案、头像上传、onboarding、当前学习会话、学习消息发送、学习历史消息分页、任务完成与任务状态更新、自学模式教程链接计划异步生成、intake 状态轮询、草稿详情/编辑/单任务重生成/确认/重生成、每日打卡、地图/进度、成就汇总、历史学习计划、用户反馈与管理员反馈接口。
- 当前运行时 API 文档已接入：`GET /api/docs/openapi` 返回 OpenAPI 3.1 文档，`/api-docs` 使用 Swagger UI 按标签展示接口，并补充常见响应示例与调试说明。
- `/api-docs` 当前纳入管理员路由守卫：未登录会跳转到 `/admin/login?next=/api-docs`，登录后回跳；运行时文档已补齐 `admin-auth`、`admin-dashboard`、`admin-profile`、`admin-feedback`、`admin-users`、`admin-learning`、`admin-ai`、`admin-settings` 等管理端点分组。
- 当前接口文档不是“扫描整个 `app/api` 目录零维护生成”；新增或修改后端接口后，仍需同步更新 `server/modules/api-docs/openapi.ts` 与 `server/modules/api-docs/schemas.ts` 中的注册与 schema。
- 当前 `app/api` 路由文件已不再普遍手写请求解析；请求体/查询参数校验、统一成功/失败响应、常见 `NOT_FOUND` / `BAD_REQUEST` 文案与错误映射，正在集中收敛到 `server/lib/request-validation.ts`、`server/lib/route-response.ts`、`server/lib/route-error.ts`、`server/lib/route-error-presets.ts` 以及各域 `route-handler.ts`。
- 当前仓库顶层真实目录除了页面和服务端主目录外，还包含 `lib/auth`、`lib/learning`、`lib/mocks`、`server/services`、`server/utils`、`supabase/seeds` 等辅助或预留目录；目录阅读应以当前代码树为准，不再按最早设计稿假定不存在的层级。
- 当前已落地的数据库迁移为 `001` 到 `026`，其中已包含学习主线核心表、用户资料字段升级、运营导出视图、头像 Storage bucket、反馈工单表、学习计划 `interrupted` 状态、成长写模型表 `score_ledgers` / `user_ranks` / `daily_checkins`、AI 会话/agent/provider/skill 相关表、管理员账号/角色/审计日志表、`018` 自学材料摄取与计划草稿相关表（`learning_material_*`、`learning_plan_draft*`）、`019` 用户软删除、`020` analytics/notifications、`021` Provider API Key 密文存储字段与加密托管能力，以及 `024` async material intake / chunks / generation runs、`025` editable draft / revision 扩展与 `026` chunk evidence metadata 扩展。
- 当前 Provider 密钥机制已不是“仅环境变量”：后台 `/admin/ai/providers` 支持查看脱敏值、按需明文读取、修改并加密保存到数据库；运行时优先读数据库密文，`envSecretRef` 仅作兼容环境变量回退；服务端必须配置 `AI_PROVIDER_SECRET_ENCRYPTION_KEY`。
- 当前主学习闭环已真实打通：学习消息链路首版已完成 `conversation_sessions`、`conversation_messages`、provider / agent / skill 配置表、`POST /api/learning/message`、`GET /api/learning/current-session`、`GET /api/learning/messages`、SSE 流式输出、前端增量渲染、`task_patch` 状态联动、结构化 `structuredContent`（`interactionType / variant / summary / blocks / sections / actions`）与对应测试链路。
- 当前已补 Phase 1 运行时加固：用户 Bearer 鉴权与管理员会话查找走进程内短 TTL 缓存，AI provider / model / agent / binding / skill 解析走配置快照缓存，`/api/learning/message`、用户 / 管理员登录与会话、Provider 密钥读取、agent test 等关键接口已接入限流、并发保护、`X-Request-Id` / `X-Auth-Cache` / `X-Config-Cache` / `X-Rate-Limit` / `Server-Timing` 观测头与结构化请求日志；这些能力当前都还是单实例进程内实现。
- AI Orchestration 当前仅第一阶段主链路已落地；`2026-03-30-ai-coding-tutor-ai-orchestration-design.md` 中的 `15.2 第二阶段` 与 `15.3 第三阶段` 仍属后续开发计划，尚未开始实现。
- 首页营销层已接入登录态恢复：顶部导航、Hero、套餐区、最终 CTA、页脚 CTA 会在用户已登录时切换为“继续学习”，并按真实用户状态跳转到 `/learn`、`/history` 或 `/onboarding`。
- 用户端与管理端登录态已完成分流：用户端使用 `app-user-session`，管理端使用 `admin-access-token` / `admin-refresh-token`，并由 `proxy.ts` 统一做入口路由守卫。
- 工作台左侧栏数据缓存已收敛到 `app/(workspace)/layout.tsx` 的 `WorkspaceSidebarDataProvider`，在 `/learn`、`/map`、`/achievements`、`/history` 间切换时不再重复请求并产生加载跳动。
- 当前学习计划状态机已区分 `active`、`interrupted`、`completed`、`abandoned`、`archived`；其中 `interrupted` 为连续 7 天无学习行为后的系统自动中断，`abandoned` 为用户主动放弃，但历史页仍支持重新激活。
- 当前仍未落地的能力主要包括：细粒度权限控制深化、内部备注 / 人工积分调整等更深用户运营能力、订阅支付域，以及 AI 域更深层运营化与可视化配置能力（如 prompt 版本化、灰度/回滚、成本与稳定性面板；**用户运营、学习运营、AI 运营、系统设置、analytics 事件写入与通知设置落库/站内提醒已交付**）。
- 当前产品主线围绕 `user_learning_paths` 展开，`/learn`、`/map`、`/history` 共用这条主线。
- 各文档如果同时包含“已实现”与“后续规划”两部分，应以文档中的“当前实现快照”或“已落地状态”说明为准；若与代码冲突，以代码和迁移为准，再回写文档。

## 当前未完成能力清单

以下清单按“是否直接影响用户学习主闭环”排序，作为当前阶段的建议开发优先级。

### P1：用户体验与运营能力完善

- AI 第二阶段能力：按 `2026-03-30-ai-coding-tutor-ai-orchestration-design.md` 的 `15.2` 落地更细粒度的 agent 控制，包括按不同工具/路径补 agent seed、按不同 `interactionType` 补专用 agent、补 prompt 版本化管理。
- analytics 深化：当前已落地 `POST /api/analytics/event`、`event_logs` 与基础聚合函数；后续重点转为把聚合结果接到增长看板、留存/漏斗分析和更深运营指标。
- 通知体系深化：当前已落地通知设置落库、站内提醒记录与工作台侧边栏提醒卡；后续如需邮件/微信真实发送或独立通知中心，再在现有模型上扩展。
- 管理员后台后续阶段：在 Phase 1、用户运营、学习运营、AI 运营 与系统设置已交付的基础上，继续补齐细粒度权限控制深化、AI 域更深运营化能力，以及用户域的后续能力（如内部备注、人工积分调整等，以代码与 OpenAPI 为准）。

### P2：商业化与基础设施增强

- AI 第三阶段能力：按 `2026-03-30-ai-coding-tutor-ai-orchestration-design.md` 的 `15.3` 补齐后台前端配置页、调用日志查看、Prompt 灰度与回滚、成本与稳定性面板。
- 订阅与支付域：补齐套餐权益、支付状态、订阅生命周期与前端订阅模块的真实接入。
- 缓存与队列增强：当前已落地单实例进程内缓存、限流与基础请求观测；后续按实际流量再决定是否引入 Redis、异步队列、跨实例频控与更完整的分布式缓存。
- 前端请求层与自动化测试增强：在必要时评估 React Query / SWR，并逐步补齐高频主链路自动化测试。

### 当前建议开发顺序

1. 先补 `管理员后台后续能力 + analytics/notifications 的运营化深化`（用户运营、学习运营、AI 运营、系统设置、analytics 事件写入与通知设置落库已交付；重点转为权限与审计深化、AI 更深运营化，以及更深用户运营写能力），把运营与运维能力接上。
2. 再继续做学习消息链路的运营化增强，优先落 `15.2 第二阶段`，例如不同工具/路径/交互类型的 agent 拆分与 prompt 版本化管理。
   当前 AI 相关权威设计以 [AI Orchestration 设计文档](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md) 为准。
   其中第一阶段已完成；文档里的 `15.2 第二阶段`、`15.3 第三阶段` 目前都还没有开始。
3. 然后再进入 `15.3 第三阶段` 的 AI 运营深水区能力，例如 prompt 版本化、灰度/回滚、成本与稳定性可视化配置。
4. 最后再进入 `订阅支付 + Redis/共享队列 + 更完整测试体系`。

## 文档维护原则

- 优先更新已有权威文档，不新增重复主题文档。
- 当真实代码和文档不一致时，先修正文档主文档，再修下游文档。
- 过程性、临时性、已完成使命的计划文档不再放回本目录。
- 新增文档仍使用 `YYYY-MM-DD-topic-name.md` 命名。

## 文档对齐检查清单

每次功能改动完成后，至少按下面顺序检查一次，避免“代码已变、主文档没变”：

1. 先看是否影响仓库入口说明
   - 若影响当前已实现能力、迁移编号、环境变量、接手口径，更新 `AGENTS.md` 与本 README。
2. 再看是否影响权威设计主文档
   - 产品范围变化：更新 PRD。
   - 页面职责/后台能力变化：更新页面原型说明或管理后台设计文档。
   - 技术边界、密钥机制、运行时链路变化：更新技术架构或 AI Orchestration 设计文档。
3. 再看是否影响接口契约
   - 新增/删除/修改 API、请求体、响应体、错误码时，同时更新 API 规范、`server/modules/api-docs/openapi.ts`、`server/modules/api-docs/schemas.ts`。
4. 再看是否影响数据库真相
   - 新增 migration、字段、约束、密钥存储策略时，同时更新数据库 Schema 设计文档与 `.env.example`。
5. 最后回头扫“已实现 / 待实现”表述
   - 凡是已经上线到代码或迁移的能力，不能继续留在“待实现”。
   - 凡是还没落地的规划，不能写成当前事实。

对本项目，下面几类改动最容易漏同步：

- `app/api` 或 `server/modules` 改动：同步 API 规范与 OpenAPI。
- `supabase/migrations` 改动：同步数据库设计、README 快照、`AGENTS.md` 中的迁移编号。
- 管理后台 AI/Provider 改动：同步管理后台设计、AI Orchestration 设计、技术架构中的密钥管理描述。
- 新增服务端环境变量：同步 `.env.example`、README 快照、相关设计文档中的前置条件。
