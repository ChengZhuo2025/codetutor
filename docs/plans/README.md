# docs/plans README

## 目的

本目录保存的是当前项目仍然有效的产品、设计、架构与接口规范文档。

如果你是第一次接手这个项目，建议不要从单篇文档随机开始读，而是按下面顺序建立全局认识。

## 快速阅读顺序

1. [PRD](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-prd.md)
   当前产品范围、真实 MVP 边界、页面与能力口径。
2. [页面级原型说明](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-page-prototype-spec.md)
   当前 7 个前端页面的功能定位、信息结构与页面职责。
3. [前端工程说明](/Users/baoyouhua/Documents/CodeTutor/docs/plans/2026-03-23-ai-coding-tutor-frontend-engineering-guide.md)
   当前仓库代码结构、页面落位、mock 数据与前端实现现状。
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

## 当前项目事实摘要

- 当前仓库已经有完整可运行的前端原型，不再是纯文档仓库。
- 当前真实页面为 7 个：`/`、`/login`、`/onboarding`、`/learn`、`/map`、`/achievements`、`/history`。
- 当前尚未落地真实后端、数据库迁移目录和 `app/api` 运行时代码。
- 后端与数据库相关文档目前仍是设计文档，不是已交付实现。
- 当前产品主线围绕 `user_learning_paths` 展开，`/learn`、`/map`、`/history` 共用这条主线。

## 文档维护原则

- 优先更新已有权威文档，不新增重复主题文档。
- 当真实代码和文档不一致时，先修正文档主文档，再修下游文档。
- 过程性、临时性、已完成使命的计划文档不再放回本目录。
- 新增文档仍使用 `YYYY-MM-DD-topic-name.md` 命名。
