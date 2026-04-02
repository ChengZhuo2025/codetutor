# AI 编程学习教练：自由学习模式“教程链接自动拆解学习计划”落地实施方案（规范对齐版 v1.2）

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

5. **当前学习主闭环高度依赖既有路径模型**
   - `/learn`、`/map`、`/history` 当前都围绕 `user_learning_paths + user_tasks + path_steps` 运行。
   - 现有任务推进、会话恢复、历史回放都假定“当前活动路径”已经具备真实 `path_steps` 和 `user_tasks`。

6. **自由学习模式在 onboarding 完成时会先创建一条通用 active path**
   - 当前 `selection_mode=self_directed` 不是“无路径占位”，而是会立即创建真实 `user_learning_path` 与首批 `user_tasks`。
   - 因此本能力不能只停留在 draft 表层，必须定义“确认后如何替换当前自学 active path”。

7. **首期不应复用聊天消息接口承载计划生成**
   - 当前 `/learn` 聊天框仍固定走 `POST /api/learning/message`，前端发送时也仍默认 `inputType="text"`。
   - 因此首期应走专用接口与专用草稿预览流程，而不是把“贴链接生成计划”混进普通对话流。

结论：当前不需要重建学习体系，只需新增“材料摄取和计划生成”的能力层与数据流。

---

## 3. 目标能力定义（要做到什么）

### 3.1 用户体验目标

用户在自由学习模式输入教程链接后，系统应在首期支持范围内给出稳定反馈：

1. 图文白名单链接场景下，优先在一次请求内返回计划草稿，目标 P95 在 10-25 秒内
2. 若材料不可读、信息不足或超出首期支持范围，返回明确的降级提示，而不是长时间无响应
3. 建议学习计划标题与范围
4. 分阶段任务列表（例如 3-8 个任务）
5. 每个任务的：
   - 学习目标
   - 输入材料片段（来源证据）
   - 实操动作
   - 完成标准（验收口径）
   - 预计耗时
6. 风险提示（缺失信息、外部链接不可读、字幕质量差等）

### 3.2 系统能力目标

1. 支持图文链接解析（首期必做）
2. 支持视频链接解析（Phase B 做“有字幕优先”，无字幕降级）
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

## 4.3 与现有学习主线的兼容策略（首期冻结）

为避免新能力与当前 `/learn`、`/map`、`/history` 主闭环脱节，首期实现冻结以下规则：

1. `learning_plan_drafts` 只承担“确认前草稿态”，不是正式学习执行真源。
2. `confirm` 成功后，必须把草稿物化到现有主链路：
   - 创建一条用户私有 `learning_paths` 记录，作为本次个性化计划模板快照。
   - 为该模板创建对应 `path_steps`。
   - 再创建新的 `user_learning_paths` 和 `user_tasks`。
3. `confirm` 前不得修改当前 active path。
4. `confirm` 时若用户当前存在 `selection_mode=self_directed` 且 `status=active` 的路径：
   - 先归档旧路径。
   - 再激活新路径。
   - 两步需在同一服务编排中完成，避免出现双 active path。
5. 旧路径上的历史会话、完成记录、历史页数据保留，不做硬删除。
6. `regenerate` 只能影响 draft，不得修改 active path、user tasks 或历史消息。

以上决策意味着：首期不改造 `/learn` 去直接读取 draft tasks，而是继续复用现有学习路径执行体系。

---

## 4.4 Skills 与 MCP 的定位决策

### 4.4.1 首期决策

1. **Skills 继续作为“辅助教学规则与模板”输入**
   - 例如：`learning-material-intake-skill`、`task-slicing-skill`
   - 但首期计划生成的权威契约仍是 `planner prompt + JSON schema + validator`，不是现有 skill 文本本身。

2. **材料读取能力不放在 skill 脚本中直接联网执行**
   - 遵守当前 skill 安全边界（首期禁止任意网络访问脚本）

3. **首期不强依赖 MCP**
   - 先在服务端直接实现 `intake adapters`（快、可控、低耦合）

4. **现有 skill 不足以单独承载多阶段计划生成**
   - 当前 `learning-material-intake-skill` 更偏“材料整理”和“当前最小一步”，不应被当作整门计划输出规范。
   - 如后续发现 planner prompt 过长或领域规则变复杂，再新增专用 planner skill 或 planner prompt 资源文件。

### 4.4.2 中期演进（可选）

当来源扩大到 YouTube / B 站 / 公众号 / Notion / 飞书 / PDF 时，再把 intake adapters 统一抽象为 MCP 工具层，复用权限、速率限制与可观测性。

---

## 4.5 前端入口与交互时序冻结（首期）

1. 首期入口放在自由学习模式的 `/learn` 页面，不复用普通聊天消息发送链路。
2. 首期交互形态采用：
   - 自由模式用户在 `/learn` 顶部或右侧看到“粘贴教程链接，生成专属计划”入口。
   - 提交后进入独立的生成 loading 状态。
   - 成功后展示 draft 预览，不直接进入聊天流。
   - 用户点击确认后，服务端完成路径切换，前端刷新当前 session。
3. 首期不要求在普通聊天框里识别 URL 后自动切换到计划生成。
4. 若当前用户已有正在进行的自学 active path，确认前页面必须明确提示：
   - “确认后将替换当前自由学习计划，但保留历史记录。”

## 4.6 命名与落位冻结（避免实现偏差）

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
   - 字段建议：`id`、`user_id`、`intake_id`、`title`、`goal`、`difficulty`、`estimated_total_minutes`、`status(draft/confirmed/rejected/superseded)`、`raw_plan_json`

4. `learning_plan_draft_tasks`
   - 记录草稿任务明细
   - 字段建议：`draft_id`、`task_no`、`title`、`objective`、`practice_steps`、`acceptance_criteria`、`estimated_minutes`、`source_refs`

此外，正式激活阶段不新增第二套“执行中任务表”，而是继续复用现有模型：

1. `learning_paths`
   - `confirm` 时新增一条用户私有模板快照记录。
   - `source_type` 仍使用 `self_directed`，并在 `metadata` 标注 `seed_source=plan_draft_confirmed`、`draft_id`、`intake_id`。

2. `path_steps`
   - `confirm` 时把草稿任务一一物化为正式步骤。
   - `step_no`、`title`、`goal`、`completion_criteria`、`estimated_minutes`、`knowledge_points` 等字段需从 draft 映射。

3. `user_learning_paths` / `user_tasks`
   - 继续作为 `/learn`、`/map`、`/history` 的唯一执行真源。
   - 不引入 `draft_tasks` 直读模式，避免页面和服务端出现双执行模型。

说明：若希望最小改动，也可先将草稿存在 `metadata jsonb`，但不建议长期依赖 JSON 大字段承载主业务对象。

所有新表统一要求（与现有迁移风格对齐）：

1. 必带 `created_at`、`updated_at`
2. 必带 `metadata jsonb not null default '{}'`
3. 查询高频字段必须建索引（如 `user_id + status + updated_at`）
4. 关键唯一约束必须显式定义（如 `unique(draft_id, task_no)`）
5. 状态字段优先用 enum，不使用自由字符串

补充冻结：

1. `confirm` 服务必须是幂等的。
   - 同一 `draft_id` 被重复确认时，只允许成功激活一次。
   - 建议通过 `learning_plan_drafts.status` + `confirmed_path_id` 或等价字段保证。
2. `confirm` 必须校验 draft 所属用户。
3. `confirm` 成功后，draft 状态置为 `confirmed`，并记录落地的 `learning_path_id`。
4. `regenerate` 成功后建议保留旧 draft 记录，置为 `superseded` 或在 `metadata` 标注被替代关系，避免审计断链。

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
     - `processingMode`

2. `POST /api/learning/plan-drafts/{id}/confirm`
   - 功能：将草稿转为正式学习路径与任务
   - 成功后返回：
     - `learningPathId`
     - `currentTaskId`
     - `redirectTo`

3. `POST /api/learning/plan-drafts/{id}/regenerate`
   - 功能：基于同一 intake 重新生成（可带偏好参数）

补充约束：

1. 新接口响应必须遵循统一结构 `code/message/data`
2. 新接口错误码需纳入统一错误映射，不在模块内自定义随意文案
3. `plan-from-material` 首期固定为同步接口：
   - 仅覆盖白名单图文链接。
   - 目标是“一次请求内返回草稿”。
   - 若超出超时或材料不可稳定抽取，则直接返回可恢复错误，不在 Phase A 引入异步 job/轮询。
4. 视频链接不纳入 Phase A 的同步 SLA。

## 5.3 错误码口径（建议冻结）

建议新增以下业务错误码，并统一纳入 API 文档与 OpenAPI schema：

1. `MATERIAL_UNSUPPORTED_DOMAIN`
   - 当前链接域名不在首期支持范围内。
2. `MATERIAL_FETCH_FAILED`
   - 链接抓取失败、超时或正文抽取失败。
3. `MATERIAL_INSUFFICIENT_CONTENT`
   - 成功抓到页面，但有效内容不足以生成稳定计划。
4. `PLAN_DRAFT_NOT_FOUND`
   - 草稿不存在或不属于当前用户。
5. `PLAN_DRAFT_ALREADY_CONFIRMED`
   - 草稿已确认，不能重复激活。
6. `AI_RESPONSE_INVALID`
   - planner 输出未通过 schema 或业务校验。

---

## 6. 材料摄取与解析策略

## 6.1 输入约束

1. 每次最多 5 条链接
2. Phase A 仅支持白名单图文域名，建议先冻结为 3 个站点，不用“任意网页”表述
3. 限制抓取超时（例如单链接 8-10 秒，总链路 25 秒内）
4. 限制最大内容体积（例如 500 KB-1 MB 纯文本）
5. 不抓取需要登录、强反爬、动态渲染后才可见的正文页面

## 6.2 图文处理

1. 抓取 HTML
2. 正文抽取（去广告、导航、评论）
3. 提取标题、章节、小节、代码片段
4. 生成 `material chunks`（便于模型消费）

## 6.3 视频处理（Phase B 再开）

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
4. 现有执行模型约束：输出必须可映射到 `learning_paths/path_steps/user_tasks`
5. 风险策略：信息不足时返回追问项而非硬编造

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

目标：白名单图文链接可生成计划草稿并确认激活，且确认后能无缝接入当前学习主闭环。

实施项：

1. 新增 intake + draft 相关数据库迁移
2. 新增 `POST /api/learning/plan-from-material`
3. 图文链接抓取与正文抽取
4. planner agent + 输出校验
5. `confirm` 时把 draft 物化为 `learning_paths + path_steps + user_learning_paths + user_tasks`
6. 草稿落库与确认接口
7. 前端自由模式新增“链接生成计划”入口（草稿预览）

完成标准：

1. 冻结至少 3 个首期图文站点，并写入白名单配置
2. `confirm` 后 `/learn` 可直接恢复到新计划的第一关
3. 计划生成成功率（内部样本）>= 85%
4. 失败请求具备明确可重试提示

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
   - 用户确认草稿后，若当前存在 active 的自由学习路径，则替换为新路径并保留旧历史

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
   - 规避：材料长度截断、分块策略、白名单域名、调用配额与限流；Phase A 不做长耗时异步链路

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
   - `POST /api/learning/plan-drafts/{id}/confirm` 的资源归属与幂等校验

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
5. confirm 重复提交 -> 不产生第二条 active path

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
4. `/learn` 在确认后能读到新的 active path，会话刷新链路正常

## 12.3 业务验收

1. Phase A 图文白名单场景下，从输入链接到拿到计划草稿，P95 目标 10-25 秒
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
   - `activation.ts`（draft -> active path 物化）

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
3. 草稿生成、确认与 active path 切换
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

1. 先冻结“confirm 如何生成正式 path/steps/tasks”的落地规则
2. 再出 migration 草案（intake + draft 两组表 + draft 激活关联字段）
3. 并行起草 `POST /api/learning/plan-from-material` 与 `confirm` 的 request/response schema
4. 先实现图文 extractor + planner（最小可用）
5. 用 10-20 条真实样本做计划质量回归，定下通过阈值
6. 再扩视频场景，最后补运营化与灰度能力

---

## 17. 实施前冻结清单（必须勾选）

1. [ ] 模块目录命名冻结（`learning-materials` / `learning-plans`）
2. [ ] API 路由路径冻结（3 条新增接口）
3. [ ] `confirm` 是否归档旧自学 active path 已决策
4. [ ] draft 是否必须物化为正式 `learning_paths/path_steps/user_tasks` 已冻结
5. [ ] 状态字段是否新增枚举已决策并写入 migration 草案
6. [ ] 错误码口径冻结并回写 `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`
7. [ ] OpenAPI schema 草案已更新到 `server/modules/api-docs/openapi.ts` / `schemas.ts`
8. [ ] TDD 用例清单已拆分到开发任务
9. [ ] 验收 DoD 与指标阈值已确认

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
