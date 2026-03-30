# docs/plans README

## 目的

本目录保存的是当前项目仍然有效的产品、设计、架构与接口规范文档。

如果你是第一次接手这个项目，建议不要从单篇文档随机开始读，而是按下面顺序建立全局认识。

## 30 秒状态速览

- 当前项目已不是纯原型仓库，而是“前端页面 + `app/api` + `server/modules` + Supabase migrations”的同仓 MVP。
- 已实现主链路：登录、首页登录态恢复、onboarding、学习会话读取、地图、成就、历史学习计划管理、个人资料、头像上传、用户反馈。
- 已落地数据侧：远程 Supabase、`001` 到 `011` 迁移、头像 Storage、反馈工单表、学习计划 `interrupted` 状态迁移、成长写模型、每日打卡表。
- 仍待实现：外部 AI provider 接入、事件埋点写入、通知设置落库、管理员后台前端、订阅支付域。
- 若只想最快了解真实现状，优先读：
  1. `docs/plans/README.md`
  2. `docs/plans/2026-03-23-ai-coding-tutor-frontend-engineering-guide.md`
  3. `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`

## 快速阅读顺序

1. [PRD](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-prd.md)
   当前产品范围、真实 MVP 边界、页面与能力口径。
2. [页面级原型说明](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-page-prototype-spec.md)
   当前 7 个前端页面的功能定位、信息结构与页面职责。
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

## 当前项目事实摘要

- 当前仓库已经不是“纯前端 demo”，而是一个包含前端页面、`app/api` BFF、`server/modules` 服务层、Supabase 迁移与远程数据库接入脚本的同仓项目。
- 当前真实页面为 7 个：`/`、`/login`、`/onboarding`、`/learn`、`/map`、`/achievements`、`/history`。
- 当前已落地的真实接口包括：认证登录、认证会话摘要、用户档案、头像上传、onboarding、当前学习会话、任务完成与任务状态更新、每日打卡、地图/进度、成就汇总、历史学习计划、用户反馈与管理员反馈接口。
- 当前已落地的数据库迁移为 `001` 到 `011`，其中已包含学习主线核心表、用户资料字段升级、运营导出视图、头像 Storage bucket、反馈工单表、学习计划 `interrupted` 状态，以及成长写模型表 `score_ledgers`、`user_ranks`、`daily_checkins`。
- 首页营销层已接入登录态恢复：顶部导航、Hero、套餐区、最终 CTA、页脚 CTA 会在用户已登录时切换为“继续学习”，并按真实用户状态跳转到 `/learn`、`/history` 或 `/onboarding`。
- 工作台左侧栏数据已提升到根级 Provider 缓存，在 `/learn`、`/map`、`/achievements`、`/history` 间切换时不再重复请求并产生加载跳动。
- 当前学习计划状态机已区分 `active`、`interrupted`、`completed`、`abandoned`、`archived`；其中 `interrupted` 为连续 7 天无学习行为后的系统自动中断，`abandoned` 为用户主动放弃。
- 当前仍未落地的能力主要包括：外部 AI provider 接入、事件埋点写接口、管理员后台前端页面、通知设置落库、订阅支付域。
- 当前产品主线围绕 `user_learning_paths` 展开，`/learn`、`/map`、`/history` 共用这条主线。
- 各文档如果同时包含“已实现”与“后续规划”两部分，应以文档中的“当前实现快照”或“已落地状态”说明为准；若与代码冲突，以代码和迁移为准，再回写文档。

## 当前未完成能力清单

以下清单按“是否直接影响用户学习主闭环”排序，作为当前阶段的建议开发优先级。

### P0：必须优先补齐

- 学习会话持久化与真实 AI 编排：补齐 `conversation_sessions`、`conversation_messages` 及 provider / agent / skill 配置表，并将 `POST /api/learning/message` 从服务端内置教学回复升级为真实外部 AI provider 编排。

### P1：用户体验与运营能力完善

- 事件埋点写入：补齐 `POST /api/analytics/event` 与 `event_logs`，为激活、留存、转化和卡点分析提供真实数据。
- 通知设置落库：把当前静态通知设置升级为真实用户偏好数据，避免设置只停留在前端展示层。
- 管理员后台前端：在已有反馈后台接口基础上，补齐管理员登录、反馈工单列表/详情、用户列表、导出视图接入等页面。

### P2：商业化与基础设施增强

- 订阅与支付域：补齐套餐权益、支付状态、订阅生命周期与前端订阅模块的真实接入。
- 缓存与队列增强：按实际流量决定是否引入 Redis、异步队列、频控与更完整的服务端缓存。
- 前端请求层与自动化测试增强：在必要时评估 React Query / SWR，并逐步补齐高频主链路自动化测试。

### 当前建议开发顺序

1. 先补 `conversation_sessions + conversation_messages + 外部 AI provider`，让学习对话从“可演示”升级为“可持续使用”。
   当前 AI 相关权威设计以 [AI Orchestration 设计文档](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md) 为准。
2. 再补 `analytics + 通知设置落库 + 管理员后台前端`，把运营和运维能力接上。
3. 最后再进入 `订阅支付 + Redis/队列 + 更完整测试体系`。

## 文档维护原则

- 优先更新已有权威文档，不新增重复主题文档。
- 当真实代码和文档不一致时，先修正文档主文档，再修下游文档。
- 过程性、临时性、已完成使命的计划文档不再放回本目录。
- 新增文档仍使用 `YYYY-MM-DD-topic-name.md` 命名。
