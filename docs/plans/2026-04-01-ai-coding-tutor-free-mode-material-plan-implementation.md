# AI 编程学习教练：自由学习模式“教程链接自动拆解学习计划”落地实施方案（规范对齐版 v1.1）

> 文档类型：实施设计方案（Implementation Plan）  
> 适用范围：自由学习模式（`selection_mode=self_directed`）  
> 创建日期：2026-04-01  
> 状态：待实施（用于开发接手与执行）  
> 关联文档：  
>
> - `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`  
> - `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`  
> - `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`  
> - `docs/plans/2026-03-23-ai-coding-tutor-backend-structure-design.md`

---

## 1. 背景与目标

当前主链路已支持学习消息对话（`POST /api/learning/message`）和 AI 编排（agent / skill / provider / SSE），但用户在自由学习模式下提交教程链接（视频或图文）后，系统还不能自动完成以下闭环：

1. 读取教程内容（正文、字幕、关键步骤）
2. 结构化抽取学习要点与实践动作
3. 自动拆分为“可执行、可验收”的多阶段练习任务
4. 生成并保存学习计划草稿，供用户确认后进入执行

本方案目标是新增一条“材料摄取 -> 计划生成 -> 草稿确认 -> 激活执行”的完整业务能力，且保持与现有 AI Orchestration 分层一致。

---

## 2. 当前实现基线（已有什么）

基于现有代码与文档，已具备以下可复用基础：

1. **学习消息主链路已落地**
   - `POST /api/learning/message` 已支持 JSON + SSE。
   - 会话、消息、调用审计已落库（`conversation_sessions`、`conversation_messages`、`llm_invocations`）。

2. **AI 编排关键分层已存在**
   - agent 解析：`agent_bindings` + `agent_templates`
   - skill 注入：`skill_packs` + `agent_skill_bindings` + `server/modules/learning/skills.ts`
   - provider 抽象：`server/modules/learning/provider.ts`

3. **输入类型已预留 `link`**
   - `LearningInputType` 已支持 `"link"`，但当前仅作为普通文本处理。

4. **自学材料整理类 skill 已有雏形**
   - `ai/skills/learning-material-intake-skill/SKILL.md` 已定义“材料分组与最小步产出”方向。

结论：当前不需要重建学习体系，只需新增“材料摄取和计划生成”的能力层与数据流。

---

## 3. 目标能力定义（要做到什么）

### 3.1 用户体验目标

用户在自由学习模式输入教程链接后，系统应在 60-180 秒内给出：

1. 建议学习计划标题与范围
2. 分阶段任务列表（例如 3-8 个任务）
3. 每个任务的：
   - 学习目标
   - 输入材料片段（来源证据）
   - 实操动作
   - 完成标准（验收口径）
   - 预计耗时
4. 风险提示（缺失信息、外部链接不可读、字幕质量差等）

### 3.2 系统能力目标

1. 支持图文链接解析（首期必做）
2. 支持视频链接解析（首期可做“有字幕优先”，无字幕降级）
3. 支持多链接合并生成计划（首期限制上限，例如最多 5 条）
4. 支持草稿确认后才写入正式学习路径
5. 全流程可审计、可重试、可回放

---

## 4. 架构设计（怎么做）

## 4.1 新增链路总览

新增专用接口：

- `POST /api/learning/plan-from-material`

运行时阶段：

1. `material intake`：链接检查与内容提取
2. `material normalize`：统一结构化材料模型
3. `plan generate`：调用 planner agent 产出任务计划 JSON
4. `plan validate`：Schema 校验 + 业务规则校验
5. `draft persist`：保存计划草稿与任务草稿
6. `draft confirm`（单独接口或现有接口扩展）后激活计划

---

## 4.2 分层职责（保持与现有编排一致）

1. **API Layer（`app/api` + route-handler）**
   - 鉴权、参数校验、响应格式统一
   - 不承载抓取逻辑和 AI prompt 拼装

2. **Material Intake Layer（新增 `server/modules/learning-materials`）**
   - URL 合法性检查
   - 来源类型识别（video/article/docs）
   - 内容抓取与清洗
   - 错误归一化（`MATERIAL_FETCH_FAILED` 等）

3. **Plan Orchestration Layer（新增 `server/modules/learning-plans`）**
   - 组装 planner prompt
   - 触发 provider 调用
   - 输出结构校验、重试与回退策略

4. **Persistence Layer**
   - 草稿计划与草稿任务写入
   - 草稿确认后转为 active path + tasks

5. **Audit Layer**
   - 记录材料摄取日志、LLM 调用日志、草稿变更日志

---

## 4.3 Skills 与 MCP 的定位决策

### 4.3.1 首期决策

1. **Skills 继续作为“教学拆解规则与模板”主路径**
   - 例如：`learning-material-intake-skill`、`task-slicing-skill`

2. **材料读取能力不放在 skill 脚本中直接联网执行**
   - 遵守当前 skill 安全边界（首期禁止任意网络访问脚本）

3. **首期不强依赖 MCP**
   - 先在服务端直接实现 `intake adapters`（快、可控、低耦合）

### 4.3.2 中期演进（可选）

当来源扩大到 YouTube / B 站 / 公众号 / Notion / 飞书 / PDF 时，再把 intake adapters 统一抽象为 MCP 工具层，复用权限、速率限制与可观测性。

---

## 4.4 命名与落位冻结（避免实现偏差）

后续实现统一使用以下命名，不再自行变体：

1. 模块目录：
   - `server/modules/learning-materials`
   - `server/modules/learning-plans`
2. API 路由目录：
   - `app/api/learning/plan-from-material/route.ts`
   - `app/api/learning/plan-drafts/[id]/confirm/route.ts`
   - `app/api/learning/plan-drafts/[id]/regenerate/route.ts`
3. OpenAPI 回写入口：
   - `server/modules/api-docs/openapi.ts`
   - `server/modules/api-docs/schemas.ts`

---

## 5. 数据模型与接口设计

## 5.1 新增/扩展数据结构（建议）

建议新增表（命名可按项目规范微调）：

1. `learning_material_intakes`
   - 记录一次材料摄取任务
   - 字段建议：`id`、`user_id`、`status`、`input_links`、`normalized_summary`、`error_code`、`metadata`、`created_at`

2. `learning_material_sources`
   - 记录每条链接的处理结果
   - 字段建议：`intake_id`、`url`、`source_type`、`fetch_status`、`title`、`language`、`content_excerpt`、`token_estimate`

3. `learning_plan_drafts`
   - 记录 AI 生成的学习计划草稿
   - 字段建议：`id`、`user_id`、`intake_id`、`title`、`goal`、`difficulty`、`estimated_total_minutes`、`status(draft/confirmed/rejected)`、`raw_plan_json`

4. `learning_plan_draft_tasks`
   - 记录草稿任务明细
   - 字段建议：`draft_id`、`task_no`、`title`、`objective`、`practice_steps`、`acceptance_criteria`、`estimated_minutes`、`source_refs`

说明：若希望最小改动，也可先将草稿存在 `metadata jsonb`，但不建议长期依赖 JSON 大字段承载主业务对象。

所有新表统一要求（与现有迁移风格对齐）：

1. 必带 `created_at`、`updated_at`
2. 必带 `metadata jsonb not null default '{}'`
3. 查询高频字段必须建索引（如 `user_id + status + updated_at`）
4. 关键唯一约束必须显式定义（如 `unique(draft_id, task_no)`）
5. 状态字段优先用 enum，不使用自由字符串

## 5.2 新增接口契约（规范冻结）

1. `POST /api/learning/plan-from-material`
   - 入参：
     - `links: string[]`
     - `userGoal?: string`
     - `targetToolCode?: string`
     - `weeklyHours?: number`
   - 出参：
     - `intakeId`
     - `draftId`
     - `planSummary`
     - `tasks[]`
     - `warnings[]`

2. `POST /api/learning/plan-drafts/{id}/confirm`
   - 功能：将草稿转为正式学习路径与任务

3. `POST /api/learning/plan-drafts/{id}/regenerate`
   - 功能：基于同一 intake 重新生成（可带偏好参数）

补充约束：

1. 新接口响应必须遵循统一结构 `code/message/data`
2. 新接口错误码需纳入统一错误映射，不在模块内自定义随意文案

---

## 6. 材料摄取与解析策略

## 6.1 输入约束

1. 每次最多 5 条链接
2. 限制允许域名白名单（首期先放常见平台）
3. 限制抓取超时（例如单链接 15 秒）
4. 限制最大内容体积（例如 1-2 MB 文本）

## 6.2 图文处理

1. 抓取 HTML
2. 正文抽取（去广告、导航、评论）
3. 提取标题、章节、小节、代码片段
4. 生成 `material chunks`（便于模型消费）

## 6.3 视频处理（首期建议）

1. 优先使用字幕源（如果可获得）
2. 无字幕时回退为：
   - 标题 + 描述 + 用户补充文本
   - 或标记 `NEED_TRANSCRIPT` 警告，先不自动拆完整计划

3. 若后续接入 ASR，再新增异步转写任务队列

---

## 7. 计划生成策略（AI 侧）

## 7.1 Planner Agent 设计

新增 `agent_templates` 记录（示例）：

- `self-study-material-planner`
- 场景：首期建议复用 `path_guidance`（避免立即新增枚举迁移）
- 第二阶段如确认长期独立场景，再新增 `plan_generation` 枚举并补迁移

核心约束：

1. 输出必须为严格 JSON（可配 `zod` 校验）
2. 每个任务必须包含验收标准
3. 任务粒度控制在“可在 30-120 分钟内完成”
4. 必须引用来源证据（`source_refs`）

## 7.2 Prompt 组装输入

1. 用户信息：等级、工具偏好、周可投入时长
2. 材料摘要：分块内容 + 元数据 + 可读性质量分
3. 计划约束：任务数范围、总周期范围、验收规则
4. 风险策略：信息不足时返回追问项而非硬编造

## 7.3 输出校验

至少两层校验：

1. **Schema 校验**：字段完整、类型正确、范围合法
2. **业务校验**：任务数、时长、验收标准非空、无重复任务

校验失败策略：

1. 同 prompt 小幅重试一次
2. 仍失败则返回 `AI_RESPONSE_INVALID`，并给出“需用户补充信息”的可操作提示

---

## 8. 实施步骤（分阶段）

## 8.1 Phase A：最小可用版本（建议 1-2 周）

目标：图文链接可生成计划草稿并确认激活。

实施项：

1. 新增 intake + draft 相关数据库迁移
2. 新增 `POST /api/learning/plan-from-material`
3. 图文链接抓取与正文抽取
4. planner agent + 输出校验
5. 草稿落库与确认接口
6. 前端自由模式新增“链接生成计划”入口（草稿预览）

完成标准：

1. 至少支持 3 个主流图文站点
2. 计划生成成功率（内部样本）>= 85%
3. 失败请求具备明确可重试提示

## 8.2 Phase B：视频增强版本（建议 1-2 周）

目标：支持“视频 + 图文混合材料”生成计划。

实施项：

1. 字幕优先解析逻辑
2. 视频无字幕降级流程（提示用户补充）
3. 材料质量评分与风险提示增强

完成标准：

1. 典型视频链接可产出可执行任务列表
2. 无字幕场景有稳定降级体验（不 silently fail）

## 8.3 Phase C：运营化与鲁棒性（建议 1 周+）

1. 后台查看 intake / draft 成功率、失败原因分布
2. 成本与时延监控
3. 灰度开关（按用户分组启用）

---

## 9. 前置准备（实施前必须完成）

1. **供应商与合规准备**
   - 确认可抓取来源与使用条款
   - 明确禁止登录态页面抓取、禁止绕过平台限制

2. **环境变量与密钥**
   - 材料抓取服务/API（如有）
   - AI provider key（现有可复用）

3. **数据库准备**
   - 迁移评审通过
   - 关键索引与唯一约束确认

4. **产品口径**
   - 草稿确认前不改动当前 active path
   - 用户可拒绝草稿并重新生成

---

## 10. 风险与规避

1. **链接不可抓取 / 平台反爬**
   - 规避：白名单 + 超时 + 明确错误码 + 用户补充摘要兜底

2. **视频无字幕导致信息缺失**
   - 规避：降级流程 + 提示补充“章节摘要/关键时间点”

3. **模型幻觉导致任务不可信**
   - 规避：source_refs 强约束 + 业务校验 + 不通过即重试/降级

4. **任务过粗或过细，学习体验差**
   - 规避：任务时长区间约束 + 验收标准强校验 + 回归样本评测

5. **成本和时延不可控**
   - 规避：材料长度截断、分块策略、异步处理、调用配额与限流

6. **安全与隐私风险**
   - 规避：脱敏日志、禁止写入完整敏感正文到审计表、严格权限校验

---

## 11. TDD 实施方案

## 11.1 测试分层

1. **Domain 单测（纯函数）**
   - URL 分类
   - 材料分块
   - 任务业务校验器
   - 错误码映射

2. **Module 集成测试（mock 外部依赖）**
   - intake 成功/失败路径
   - planner 输出合法/非法路径
   - 草稿确认流程

3. **Route/HTTP 测试**
   - `POST /api/learning/plan-from-material` 请求校验
   - 错误状态码与响应结构

4. **Live 测试（可选，低频）**
   - 真 provider 联调冒烟
   - 真链接抓取冒烟（受外部波动影响）

## 11.2 TDD 节奏（建议）

每个能力按以下循环开发：

1. 先写失败测试（red）
2. 最小实现让测试通过（green）
3. 重构并补边界用例（refactor）

优先从以下用例开始：

1. 单图文链接 -> 生成 3-5 任务草稿
2. 多链接合并 -> 去重并输出统一计划
3. 链接不可读 -> 返回可操作错误提示
4. AI 返回非法 JSON -> 触发重试/降级

---

## 12. 验收机制（DoD）

## 12.1 功能验收

1. 自由学习模式可提交链接并生成计划草稿
2. 用户可确认草稿并进入正式任务链路
3. 草稿拒绝后可重新生成，不污染现有 active path

## 12.2 质量验收

1. 自动化测试通过（单测 + 集成 + route）
2. `pnpm lint` 通过
3. OpenAPI 文档同步更新（`server/modules/api-docs/openapi.ts` / `schemas.ts`）

## 12.3 业务验收

1. 从输入链接到拿到计划草稿，P95 时延可接受（目标建议 < 30s，超时走异步提示）
2. 内部评审样本中，计划“可执行性”评分达到约定阈值
3. 失败场景错误提示明确且可恢复

---

## 13. 目录与代码落位建议

建议新增：

1. `server/modules/learning-materials/`
   - `service.ts`（摄取编排）
   - `extractors/`（article/video 各适配器）
   - `normalizer.ts`
   - `types.ts`

2. `server/modules/learning-plans/`
   - `service.ts`（计划生成编排）
   - `prompt.ts`
   - `validator.ts`
   - `persistence.ts`

3. `app/api/learning/plan-from-material/route.ts`
4. `app/api/learning/plan-drafts/[id]/confirm/route.ts`
5. `app/api/learning/plan-drafts/[id]/regenerate/route.ts`
6. `scripts/check-learning-plan-from-material-route.ts`（路由级检查）

---

## 14. 里程碑与交付物

## M1：图文最小闭环

交付物：

1. 新迁移 + seed（如需）
2. 新接口 + OpenAPI
3. 草稿生成与确认
4. 测试报告（单测/集成/route）

## M2：视频增强闭环

交付物：

1. 视频字幕解析与降级策略
2. 失败场景体验优化
3. 回归测试补齐

## M3：运营化

交付物：

1. 指标面板（成功率、耗时、失败原因）
2. 灰度开关与应急回滚手册

---

## 15. 非目标（当前不做）

1. 不做通用“任意网页全自动高保真解析”平台
2. 不做多 agent 并行协作编排
3. 不做自动执行本地命令/脚本的能力
4. 不做一次性生成超长课程（先聚焦短中期可执行计划）

---

## 16. 下一步执行建议（可直接开工）

1. 先出 migration 草案（intake + draft 两组表）
2. 并行起草 `POST /api/learning/plan-from-material` 的 request/response schema
3. 先实现图文 extractor + planner（最小可用）
4. 用 10-20 条真实样本做计划质量回归，定下通过阈值
5. 再扩视频场景，最后补运营化与灰度能力

---

## 17. 实施前冻结清单（必须勾选）

1. [ ] 模块目录命名冻结（`learning-materials` / `learning-plans`）
2. [ ] API 路由路径冻结（3 条新增接口）
3. [ ] 状态字段是否新增枚举已决策并写入 migration 草案
4. [ ] 错误码口径冻结并回写 `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`
5. [ ] OpenAPI schema 草案已更新到 `server/modules/api-docs/openapi.ts` / `schemas.ts`
6. [ ] TDD 用例清单已拆分到开发任务
7. [ ] 验收 DoD 与指标阈值已确认

---

## 18. 跨文档同步回写清单（严格交叉校验）

为避免“实施文档已更新，但权威主文档未同步”导致的规范漂移，新增能力时必须同步回写下列文件与章节。

### 18.1 API 主文档回写（必做）

目标文件：`docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`

1. `## 3. 错误码定义`
   - 新增并冻结本能力错误码（或明确映射到既有错误码）。
2. `## 4. 接口分组总览`
   - 补充 `plan-from-material`、`plan-drafts confirm/regenerate` 分组入口。
3. `## 7. 学习核心接口`
   - 新增三个接口的请求/响应/业务规则章节。
4. `## 12. 接口权限矩阵`
   - 增补三条新接口权限定义（用户鉴权、资源归属校验）。

### 18.2 AI 编排主文档回写（按范围决策）

目标文件：`docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`

1. `## 11.0 新增枚举`
   - 若本次引入 intake/draft 相关枚举，必须回写。
2. `## 12. API 形态`
   - 若将新接口纳入 AI 编排入口体系，必须回写。
3. `## 15. MVP 落地顺序`
   - 补充本能力属于哪一期（建议 15.2 之后的新增工作包）。
4. `## 16. 当前已确认决策`
   - 明确“首期复用 `path_guidance` 场景”还是“新增 `plan_generation` 场景”。

### 18.3 运行时文档回写（代码级必做）

目标文件：

1. `server/modules/api-docs/openapi.ts`
2. `server/modules/api-docs/schemas.ts`

要求：

1. 三条新接口都要在 OpenAPI 注册。
2. 请求体、成功响应、失败响应 schema 必须完整。
3. 错误响应必须与 `code/message/data` 统一结构一致。

### 18.4 PR 验收门禁（建议写入评审模板）

本能力相关 PR 在合并前必须满足：

1. [ ] 实施文档已更新（本文件）
2. [ ] API 主文档对应章节已同步
3. [ ] AI 编排主文档对应章节已同步（若涉及）
4. [ ] OpenAPI 运行时文档已同步
5. [ ] 新增错误码已在统一错误映射层落地
6. [ ] TDD 与验收用例已通过
