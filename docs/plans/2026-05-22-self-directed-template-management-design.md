# 自学模式学习路径模板管理设计

> 文档类型：功能设计方案  
> 创建日期：2026-05-22  
> 状态：待实施设计  
> 适用范围：管理后台「学习路径模板管理」首版，仅覆盖自学模式初始化模板  
> 关联文档：
>
> - `docs/plans/2026-05-21-free-mode-initial-learning-task-current-state.md`
> - `docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md`
> - `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`
> - `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`
> - `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`

---

## 1. 背景

当前用户在 onboarding 中选择「自主学习模式」后，首次进入 `/learn` 看到的初始化学习任务来自 Supabase seed 中的 `learning_paths` 和 `path_steps`。服务端在 `completeOnboarding` 中把模板复制为用户自己的 `user_learning_paths` 和 `user_tasks`，因此初始化任务不是由 agent 或 skill 实时生成。

这套链路可以稳定工作，但存在两个运营问题：

1. 模板正文只能通过 seed 或数据库手工修改，不适合日常运营维护。
2. 当前 self-directed 模板查询按 `tool_id + source_type + is_active` 找第一条，没有严格匹配用户选择的 `learningLevel`，未来同一工具存在多个水平模板时会有命中风险。

本设计目标是在管理后台增加「学习路径模板管理」能力，让管理员可以为不同工具、不同水平维护自学模式初始化模板，并在编辑器中使用后台专用 AI agent 一键生成模板草稿，再由管理员修改后保存生效。

## 2. 目标

首版目标：

1. 管理员可以在后台管理 `learning_paths.source_type = 'self_directed'` 的初始化模板。
2. 模板按「工具 + 水平」维护，每个工具和水平最多一个启用模板。
3. 管理员可以编辑模板基础信息和步骤内容。
4. 管理员可以在编辑器内调用后台专用 agent 生成模板草稿。
5. 保存后立即影响新完成 onboarding 的用户。
6. 管理员可以手动同步到仍未完成任何任务的存量初始化自学路径。
7. 修正 onboarding self-directed 模板选择逻辑，使其精确匹配 `tool_id + target_level + source_type + is_active`。

## 3. 非目标

首版不做以下能力：

1. 不管理 `preset_training` 预设训练路径。
2. 不做模板草稿 / 发布两阶段。
3. 不做模板版本化、回滚或灰度发布。
4. 不自动同步所有存量用户路径。
5. 不让 AI 生成结果直接落库；必须由管理员确认和保存。
6. 不把该 agent 接入用户侧 `/learn` 对话或材料链接生成计划。

## 4. 总体方案

新增管理后台页面：

```text
/admin/learning/templates
/admin/learning/templates/[templateId]
```

页面放在管理后台「学习运营」下，和现有 `/admin/learning` 用户学习记录分离。现有 `/admin/learning` 继续管理用户学习路径实例；新页面只管理全局自学初始化模板。

数据真源仍使用现有表：

```text
learning_paths
path_steps
```

不新增独立模板表。这样 `/learn`、`/map`、`/history` 和 onboarding 仍沿用现有数据结构，只需要补后台 CRUD、校验、同步和 AI 生成接口。

后台专用 agent 使用新的 `agent_templates.code`：

```text
self-study-template-planner
```

它只在管理后台模板编辑器中使用，用于生成「工具 + 水平 + 可选运营目标」对应的初始化模板 JSON。它不参与普通学习对话，也不替代 `self-study-material-planner`。

## 5. 数据模型

### 5.1 `learning_paths`

首版继续使用现有字段：

| 字段 | 用途 |
| --- | --- |
| `tool_id` | 关联学习工具 |
| `code` | 模板编码，例如 `path-codex-intermediate-self-study` |
| `name` | 模板名称 |
| `target_level` | 目标水平 |
| `source_type` | 固定为 `self_directed` |
| `stage_count` | 步骤数，保存时按 steps 数量同步 |
| `description` | 模板简介 |
| `metadata.templateScope` | 固定为 `admin_self_directed_initial`，用于和用户材料生成的 self-directed 路径区分 |
| `metadata.preview` | `/learn` 首屏预览文案 |
| `agent_code` | 可选，仍优先由现有 agent binding 体系处理 |
| `is_active` | 是否启用 |

建议新增数据库唯一约束或服务端强校验：

```sql
unique active self-directed template per tool and target_level
```

如果数据库层实现，建议使用部分唯一索引：

```sql
CREATE UNIQUE INDEX ...
ON public.learning_paths(tool_id, target_level)
WHERE source_type = 'self_directed'
  AND metadata->>'templateScope' = 'admin_self_directed_initial'
  AND is_active = true;
```

### 5.2 `path_steps`

编辑器覆盖以下字段：

| 字段 | 用途 |
| --- | --- |
| `step_no` | 连续步骤编号 |
| `title` | 任务标题 |
| `summary` | 任务摘要 |
| `focus` | 教练提示 / 为什么做这一步 |
| `goal` | 当前任务目标 |
| `completion_criteria` | 完成标准 |
| `review_summary` | 复盘文案 |
| `estimated_minutes` | 预计耗时 |
| `reward_score` | 奖励分 |
| `knowledge_points` | 知识点 |
| `key_points` | 掌握点 |
| `pitfalls` | 注意事项 / 易错点 |
| `metadata.lessonBrief` | 更长的任务说明 |
| `metadata.practiceSteps` | 可执行练习步骤 |
| `metadata.submissionGuide` | 提交说明 |
| `metadata.checkpoints` | AI 检查点 |

保存时服务端按前端传入顺序重排 `step_no`，并保证编号从 1 连续递增。

## 6. API 设计

新增接口分组：

```text
GET  /api/admin/learning/templates
POST /api/admin/learning/templates
GET  /api/admin/learning/templates/[templateId]
PATCH /api/admin/learning/templates/[templateId]
POST /api/admin/learning/templates/generate
POST /api/admin/learning/templates/[templateId]/generate
POST /api/admin/learning/templates/[templateId]/sync-unstarted
```

### 6.1 列表

`GET /api/admin/learning/templates`

查询参数：

| 参数 | 说明 |
| --- | --- |
| `toolCode` | 可选，学习工具 |
| `learningLevel` | 可选，`beginner` / `intermediate` / `advanced` |
| `status` | 可选，`all` / `active` / `inactive` |
| `keyword` | 可选，按名称或 code 搜索 |
| `page` / `limit` | 分页 |

返回内容包括模板基础信息、工具名称、水平、步骤数、启用状态、更新时间，以及可同步的未开始用户路径预估数量。

### 6.2 创建

`POST /api/admin/learning/templates`

创建 `source_type = 'self_directed'` 的模板和步骤。服务端必须校验同一工具和水平下是否已有启用模板。若冲突，返回 `CONFLICT`。

### 6.3 详情

`GET /api/admin/learning/templates/[templateId]`

返回 `learning_paths` 基础信息和按 `step_no` 排序的 `path_steps`。

### 6.4 保存

`PATCH /api/admin/learning/templates/[templateId]`

保存即发布。请求体包含模板基础字段和全量 steps。服务端在同一事务中：

1. 更新 `learning_paths`。
2. 对 `path_steps` 做全量替换或按 step id upsert。
3. 重排 `step_no`。
4. 更新 `stage_count`。
5. 写 `admin_audit_logs`。

首版建议使用「全量 steps 保存」语义，减少局部 patch 的复杂度。

### 6.5 AI 生成

`POST /api/admin/learning/templates/generate`

用于创建前生成草稿。

`POST /api/admin/learning/templates/[templateId]/generate`

用于基于已有模板上下文重新生成草稿。

请求体：

| 字段 | 说明 |
| --- | --- |
| `toolCode` | 工具 code |
| `learningLevel` | 水平 |
| `operatorGoal` | 可选运营目标，如“适合第一次用 Codex 的非科班用户” |
| `currentTemplate` | 可选，已有模板内容，用于改写 |

AI 生成接口只返回结构化 JSON，不写入 `learning_paths` 或 `path_steps`。

### 6.6 同步未开始用户路径

`POST /api/admin/learning/templates/[templateId]/sync-unstarted`

只同步满足以下条件的用户路径：

```text
template_path_id = templateId
selection_mode = 'self_directed'
metadata.seedSource = 'api_onboarding_complete'
status in ('active', 'interrupted')
completed_steps = 0
```

命中 0 条也返回成功。

## 7. Onboarding 查询修正

当前 `completeOnboarding` 在 self-directed 模式下按 `tool_id + source_type + is_active` 查询并取 `target_level` 排序后的第一条。实施本功能时必须改为精确匹配：

```ts
supabase
  .from("learning_paths")
  .select("id, code, name, description, stage_count, metadata")
  .eq("tool_id", tool.id)
  .eq("source_type", "self_directed")
  .eq("target_level", learningLevel)
  .eq("is_active", true)
  .maybeSingle()
```

如果没有对应水平模板，首版建议返回明确错误，让管理员补模板；不建议再静默取其他水平模板。

## 8. 后台页面设计

### 8.1 列表页

`/admin/learning/templates`

核心区域：

1. 筛选栏：工具、水平、启用状态、关键词。
2. 表格：工具、水平、模板名称、code、步骤数、启用状态、更新时间。
3. 操作：编辑、AI 生成、同步未开始用户。
4. 顶部按钮：新建模板。

列表页需要明确提示：

```text
同步仅影响初始化自学路径中尚未完成任何任务的用户，不会修改材料生成计划或已完成任务的学习路径。
```

### 8.2 编辑页

`/admin/learning/templates/[templateId]`

页面分为两块：

1. 基础信息区：
   - 工具
   - 水平
   - 模板名称
   - code
   - 描述
   - preview 文案
   - 是否启用
   - 可选 agent code

2. 步骤编辑器：
   - 支持新增、删除、排序步骤。
   - 每一步编辑标题、摘要、focus、goal、完成标准、复盘文案、预计时长、奖励分。
   - 数组字段使用多行输入或 tag-like 编辑：知识点、掌握点、注意事项、练习步骤、检查点。
   - 保存前做前端校验，服务端仍做强校验。

### 8.3 AI 生成弹窗

入口在编辑页，也可在列表页打开。

输入：

1. 工具。
2. 水平。
3. 可选运营目标。

生成后展示预览，管理员可以：

1. 覆盖全部模板内容。
2. 只替换 steps。
3. 取消并保留当前编辑内容。

AI 结果应用到表单后仍未写库，必须点击保存才生效。

## 9. AI 生成器设计

新增后台专用 agent：

```text
agent_templates.code = self-study-template-planner
```

建议 `scenario_type` 使用现有可用类型中的 `path_guidance`，并通过 `metadata.role = admin_self_study_template_planner` 标明用途。

系统提示要求模型只输出 JSON：

```json
{
  "name": "string",
  "description": "string",
  "preview": ["string"],
  "steps": [
    {
      "title": "string",
      "summary": "string",
      "focus": "string",
      "goal": "string",
      "completionCriteria": "string",
      "reviewSummary": "string",
      "estimatedMinutes": 30,
      "rewardScore": 20,
      "knowledgePoints": ["string"],
      "keyPoints": ["string"],
      "pitfalls": ["string"],
      "lessonBrief": "string",
      "practiceSteps": ["string"],
      "submissionGuide": "string",
      "checkpoints": ["string"]
    }
  ]
}
```

规则：

1. 面向用户文案使用简体中文。
2. 默认生成 3 步，允许 1 到 5 步。
3. 任务必须适合作为第一次进入 `/learn` 的初始化任务。
4. 不引用用户没有提供的具体教程材料。
5. 不输出 Markdown、代码围栏或解释文字。

服务端调用方式可复用 `self-study-material-planner` 的 `invokePlannerModel` 模式：

1. 从 AI 配置快照读取 agent、provider、model。
2. 使用非流式 `invokeAIProvider`。
3. 解析 JSON 并做 schema 校验。
4. 返回可编辑草稿。

## 10. 存量同步设计

同步操作只处理未完成任何任务的初始化路径。

同步流程：

1. 读取模板和最新 steps。
2. 查询符合条件的 `user_learning_paths`。
3. 对每条路径：
   - 删除该路径下未完成的 `user_tasks`。
   - 按最新 steps 重建 `user_tasks`。
   - 第一条任务设为 `in_progress`，其余为 `not_started`。
   - 更新 `current_task_id`、`total_steps`、`path_name_snapshot`、`path_summary_snapshot`、`updated_at`。
   - 写入 `metadata.templateSyncedAt`、`metadata.templateSyncedBy`。
4. 写管理审计日志。

首版允许同步有过对话但尚未完成任务的路径，因为 `completed_steps = 0` 是主保护条件。同步后旧任务的 `last_conversation_id` 会随旧 task 删除而断开；若后续希望保留对话关联，需要单独做会话迁移设计。

建议同步接口返回：

```json
{
  "templateId": "uuid",
  "matchedPathCount": 12,
  "syncedPathCount": 12,
  "skippedPathCount": 0
}
```

## 11. 审计与观测

以下操作写 `admin_audit_logs`：

1. 创建模板。
2. 更新模板。
3. 启用 / 停用模板。
4. 执行 AI 生成。
5. 同步未开始用户路径。

模板保存审计需要包含 before / after snapshot。同步审计需要包含 templateId、命中数量、同步数量、跳过数量、管理员 ID 和操作时间。

AI 生成调用需要写入或复用现有 `llm_invocations` 记录，至少保留：

1. agent code。
2. provider code。
3. model code。
4. 输入摘要。
5. token usage。
6. 耗时。
7. 错误信息。

## 12. 错误处理

| 场景 | 错误码 | 说明 |
| --- | --- | --- |
| 未登录后台 | `ADMIN_FORBIDDEN` | 沿用现有后台鉴权 |
| 模板不存在 | `NOT_FOUND` | 按 templateId 查询不到 |
| 同工具同水平已有启用模板 | `CONFLICT` | 阻止重复 active 模板 |
| steps 不合法 | `VALIDATION_FAILED` | 标题、摘要、目标、step 连续性等校验失败 |
| AI agent 未配置 | `VALIDATION_FAILED` | 提示去 Ai 管理配置 |
| provider 或 model 不可用 | `VALIDATION_FAILED` | 提示检查 Provider / Model |
| AI 输出不是合法 JSON | `VALIDATION_FAILED` | 不写库，只返回生成失败 |
| 同步命中 0 条 | 成功 | 返回 `syncedPathCount = 0` |

## 13. 测试计划

### 13.1 服务端逻辑测试

覆盖：

1. 模板创建和更新请求校验。
2. steps 至少 1 条、stepNo 连续、必填字段校验。
3. 同工具同水平重复 active 模板冲突。
4. AI 生成 JSON 解析和非法 JSON 错误。
5. 同步只命中 `api_onboarding_complete + completed_steps = 0`。
6. onboarding self-directed 按 `target_level` 精确命中。

### 13.2 路由测试

覆盖：

1. 列表、详情、创建、保存接口。
2. AI 生成接口。
3. 同步接口。
4. 后台鉴权失败。
5. 常见错误码映射。

### 13.3 页面检查脚本

新增类似：

```text
pnpm test:admin-learning-templates
```

检查：

1. 列表筛选和表格关键文案。
2. 编辑器基础字段。
3. 步骤编辑器关键字段。
4. AI 生成弹窗文案。
5. 同步确认提示。

## 14. 文档同步

实施完成后至少同步：

1. `docs/plans/2026-05-21-free-mode-initial-learning-task-current-state.md`
   - 补充初始化模板现在可由后台维护。
2. `docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md`
   - 增加学习路径模板管理能力。
3. `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`
   - 补唯一约束、同步规则和后台模板管理口径。
4. `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`
   - 补新增后台接口。
5. `server/modules/api-docs/openapi.ts` 与 `server/modules/api-docs/schemas.ts`
   - 补 OpenAPI。
6. `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`
   - 补 `self-study-template-planner` 后台专用 agent 边界。
7. `docs/plans/README.md` 与 `AGENTS.md`
   - 实施完成后更新当前已实现能力摘要。

## 15. 实施切分

建议分四步实施。

### Step 1：数据与 onboarding 修正

1. 新增 migration：
   - 唯一索引或必要约束。
   - `self-study-template-planner` agent seed。
2. 修正 `completeOnboarding` self-directed 模板查询，按 `target_level` 精确匹配。
3. 补 onboarding 相关测试。

### Step 2：后台模板 CRUD API

1. 新增 `lib/api/contracts/admin-learning-templates.ts`。
2. 新增 `server/modules/admin-learning-templates`。
3. 新增列表、详情、创建、保存接口。
4. 补服务端逻辑测试和路由测试。
5. 补 OpenAPI。

### Step 3：AI 生成与同步

1. 新增 AI 生成 runtime。
2. 新增 `generate` 接口。
3. 新增 `sync-unstarted` 接口。
4. 补审计和调用记录。
5. 补测试。

### Step 4：后台页面

1. 新增 `/admin/learning/templates` 列表页。
2. 新增编辑页。
3. 接入 AI 生成弹窗。
4. 接入同步确认。
5. 新增页面检查脚本。
6. 做文档同步。

## 16. 关键风险

1. **误同步存量用户路径**  
   通过 `completed_steps = 0`、`seedSource = api_onboarding_complete` 和管理员确认弹窗降低风险。

2. **同工具同水平模板冲突**  
   通过部分唯一索引或服务端强校验避免 onboarding 命中不确定。

3. **AI 输出不可用**  
   AI 生成只作为草稿返回，必须 schema 校验并由管理员保存。

4. **与材料计划链路混淆**  
   模板管理只维护初始化模板；教程链接生成计划仍走 `learning_plan_drafts`，确认后物化为用户路径。

5. **页面字段过多导致编辑困难**  
   首版按基础信息 + 步骤编辑器分区展示，数组字段优先用简单多行输入，后续再优化成更高级编辑控件。

## 17. 验收标准

1. 管理员可以创建和编辑某工具某水平的 self-directed 初始化模板。
2. 新完成 onboarding 的 self-directed 用户会命中对应工具和水平的 active 模板。
3. 模板保存后，`stage_count` 与 steps 数量一致。
4. AI 生成结果只进入编辑器，不会直接写库。
5. 同步操作只影响 `api_onboarding_complete` 且 `completed_steps = 0` 的用户路径。
6. 管理后台有审计记录。
7. OpenAPI 和项目文档完成同步。
