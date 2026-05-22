# 自由模式初始化学习任务现状说明

## 目的

本文记录用户在 onboarding 中选择“自主学习模式”后，首次进入 `/learn` 时看到的初始化学习任务是如何产生、存储和展示的。

这份文档只描述当前代码和数据库真实现状，方便后续升级初始化学习任务时快速定位功能链路、数据表和容易混淆的边界。

## 结论摘要

自由模式下刚进入 `/learn` 时展示的初始化学习任务，不是由用户侧 agent 实时生成，也不是由 skill 生成。当前模板内容可以由管理后台维护；后台 AI 只在模板编辑器里生成草稿，管理员保存后才生效。

当前链路是：

1. Supabase seed 或管理后台预置自学路径模板到 `learning_paths`。
2. Supabase seed 或管理后台预置自学任务步骤到 `path_steps`。
3. 用户完成 onboarding 且选择 `self_directed` 后，服务端把模板复制为用户自己的 `user_learning_paths`。
4. 服务端按模板步骤创建该用户的 `user_tasks`，第一步设为 `in_progress`。
5. `/learn` 读取当前用户 `active` 的 `user_learning_paths`、`user_tasks`、`path_steps` 并组装页面数据。

因此，页面上看到的初始化学习任务是多张表拼出来的，核心不是单表字段。

## 用户侧功能链路

### 1. Onboarding 选择自由模式

前端页面位于：

- `features/onboarding/pages/onboarding-page.tsx`
- `features/onboarding/components/path-selection-step.tsx`

用户选择“自主学习模式”时，请求体中的 `selectionMode` 为：

```text
self_directed
```

服务端入口最终进入：

- `server/modules/onboarding/service.ts` 的 `completeOnboarding`

当前 self-directed 路径选择逻辑：

```ts
const targetPathCode =
  selectionMode === "self_directed"
    ? `path-${toolCode}-${learningLevel}-self-study`
    : selectedPathId
```

实际查询 self-directed 模板时，当前代码已经按 `tool_id + source_type + target_level + is_active` 精确匹配：

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

如果对应工具和水平没有启用模板，onboarding 会返回模板不存在，需要管理员先在后台补齐。

### 2. 创建用户学习路径实例

Onboarding 完成时，服务端会：

1. 读取所选 `learning_paths` 模板。
2. 读取该模板下的 `path_steps`。
3. 归档用户之前的 active 学习路径。
4. 插入新的 `user_learning_paths`。
5. 为每个 `path_step` 插入一条 `user_tasks`。
6. 把第一条任务写入 `user_learning_paths.current_task_id`。

关键字段：

```text
user_learning_paths.template_path_id -> learning_paths.id
user_learning_paths.selection_mode = 'self_directed'
user_learning_paths.status = 'active'
user_learning_paths.metadata.seedSource = 'api_onboarding_complete'

user_tasks.user_learning_path_id -> user_learning_paths.id
user_tasks.path_step_id -> path_steps.id
第一条 user_tasks.status = 'in_progress'
后续 user_tasks.status = 'not_started'
```

### 3. `/learn` 首屏读取当前会话

前端 `/learn` 页面在首次加载时调用：

```text
GET /api/learning/current-session
```

前端入口：

- `features/learning/pages/learn-page.tsx`

API 路由：

- `app/api/learning/current-session/route.ts`

服务层：

- `server/modules/learning/service.ts`
- `getLearningCurrentSessionData`
- `loadLearningState`

当前读取顺序：

1. 查用户 profile：`user_profiles`
2. 查最新 active 学习路径：`user_learning_paths`
3. 查学习工具：`learning_tools`
4. 查用户任务实例：`user_tasks`
5. 按用户任务引用的 `path_step_id` 查模板步骤内容：`path_steps`
6. 如果是自由模式，额外查是否有待处理的材料计划草稿或 intake：
   - `learning_plan_drafts`
   - `learning_material_intakes`

页面展示的当前任务标题、目标、完成标准、右侧上下文、下一步预览等，主要来自 `path_steps` 和 `user_tasks`，再由服务层组装为 `mission`、`rightPanel`、`planSummary`、`messages` 等响应字段。

## 核心数据表

### `learning_paths`

路径模板表。

自由模式初始化模板筛选条件：

```sql
source_type = 'self_directed'
```

常用字段：

| 字段 | 作用 |
| --- | --- |
| `id` | 模板路径 ID |
| `tool_id` | 对应学习工具 |
| `code` | 模板路径编码，例如 `path-codex-intermediate-self-study` |
| `name` | 模板名称，例如 `Codex CLI 自主学习模式` |
| `target_level` | 目标学习等级 |
| `source_type` | `self_directed` 或 `preset_training` |
| `stage_count` | 模板步骤数 |
| `description` | 路径描述 |
| `metadata` | 预览文案等扩展信息 |
| `agent_code` | 当前 seed 中 self-directed 模板多为 `NULL`；AI 回复主要走 `agent_bindings` |

当前 self-directed seed 来源：

- `supabase/seeds/001_dictionary.sql`
- `supabase/seeds/003_onboarding_tool_expansion.sql`

### `path_steps`

路径步骤模板表。

自由模式初始化三步任务主要存这里。当前通用模板为：

1. `整理学习材料`
2. `拆出当前一步`
3. `执行并复盘`

常用字段：

| 字段 | 作用 |
| --- | --- |
| `id` | 步骤模板 ID |
| `path_id` | 关联 `learning_paths.id` |
| `step_no` | 第几步 |
| `title` | 页面任务标题 |
| `summary` | 任务摘要 |
| `focus` | 为什么做这一步 / 教练提示优先来源 |
| `goal` | 当前任务目标 |
| `completion_criteria` | 完成标准 |
| `review_summary` | 复盘文案 |
| `estimated_minutes` | 预计耗时 |
| `reward_score` | 完成奖励分 |
| `knowledge_points` | 知识点 |
| `key_points` | 掌握点 |
| `pitfalls` | 注意事项 / 易错点 |
| `metadata` | 可扩展字段，如材料生成计划会写入 `practiceSteps`、`submissionGuide`、`checkpoints` |

### `user_learning_paths`

用户学习路径实例表。

这是 `/learn`、`/map`、`/history` 共用的用户主线对象。

常用字段：

| 字段 | 作用 |
| --- | --- |
| `id` | 用户学习路径实例 ID |
| `user_id` | 用户 ID |
| `template_path_id` | 指向 `learning_paths.id` |
| `tool_id` | 学习工具 |
| `path_code_snapshot` | 创建实例时的路径 code 快照 |
| `path_name_snapshot` | 创建实例时的路径名称快照 |
| `path_summary_snapshot` | 创建实例时的路径摘要快照 |
| `learning_level` | 用户选择时的学习等级 |
| `selection_mode` | 自由模式为 `self_directed` |
| `status` | 当前状态，`active` 表示当前进行中 |
| `total_steps` | 总步骤数 |
| `completed_steps` | 已完成步骤数 |
| `current_task_id` | 当前任务，指向 `user_tasks.id` |
| `metadata.seedSource` | 初始化来源标记 |

自由模式初始化路径的来源标记：

```json
{
  "seedSource": "api_onboarding_complete"
}
```

如果是用户粘贴材料生成并确认后的计划，来源标记会变成：

```json
{
  "seedSource": "plan_draft_confirmed"
}
```

服务层用这个字段判断当前自由模式路径是否已有“材料生成计划”：

```ts
activePath.selection_mode === "self_directed"
  && activePath.metadata.seedSource === "plan_draft_confirmed"
```

### `user_tasks`

用户任务实例表。

它保存每个用户在某条学习路径下每一步的状态，而不是任务正文。

常用字段：

| 字段 | 作用 |
| --- | --- |
| `id` | 用户任务实例 ID |
| `user_id` | 用户 ID |
| `user_learning_path_id` | 指向 `user_learning_paths.id` |
| `path_step_id` | 指向 `path_steps.id` |
| `status` | `not_started` / `in_progress` / `blocked` / `completed` / `archived` |
| `started_at` | 开始时间 |
| `completed_at` | 完成时间 |
| `last_conversation_id` | 最近一次学习对话 |
| `score_awarded` | 已发放分数 |
| `metadata` | 任务级扩展信息 |

## 与材料生成计划链路的区别

容易混淆的表：

- `learning_material_intakes`
- `learning_material_sources`
- `learning_material_chunks`
- `learning_plan_generation_runs`
- `learning_plan_drafts`
- `learning_plan_draft_tasks`
- `learning_plan_draft_revisions`

这些表主要属于“粘贴教程链接生成学习计划”的链路，不是初始化学习任务的主来源。

材料计划链路是：

1. 用户在自由模式下粘贴教程链接。
2. 前端调用 `POST /api/learning/plan-from-material`。
3. 服务端创建 intake、sources、chunks、generation run。
4. `self-study-material-planner` agent 根据材料摘要生成 JSON 学习计划。
5. 服务端写入 `learning_plan_drafts` 和 `learning_plan_draft_tasks`。
6. 用户确认草稿。
7. `confirm_learning_plan_draft` RPC 将草稿物化为新的：
   - `learning_paths`
   - `path_steps`
   - `user_learning_paths`
   - `user_tasks`
8. 新路径的 `metadata.seedSource` 标记为 `plan_draft_confirmed`。

也就是说：

- 初始化自学任务：来自 seed 模板，onboarding 时创建。
- 教程链接生成计划：来自 agent 生成草稿，用户确认后替换为正式学习路径。

## Agent 与 Skill 的作用边界

### 初始化学习任务不由 agent 生成

刚进入 `/learn` 时展示的初始化三步任务已经存在于 `path_steps` 中，页面只是读取和展示。

管理后台 agent 不参与初始化任务生成。

### Self-study agent 用于学习对话

自由模式下用户发送学习消息时，`POST /api/learning/message` 会根据当前工具、路径、模式、交互类型解析 agent。

相关表：

- `agent_templates`
- `agent_bindings`
- `skill_packs`
- `agent_skill_bindings`
- `conversation_sessions`
- `conversation_messages`
- `llm_invocations`

seed 中已将 self-directed 路径绑定到对应 coach agent，例如：

```text
path-codex-intermediate-self-study -> codex-self-study-coach
path-claude-code-intermediate-self-study -> claude-code-self-study-coach
path-cursor-beginner-self-study -> cursor-self-study-coach
```

这影响的是后续 AI 回复，不是 `/learn` 初始化任务正文。

### Skills 用于增强 AI 回复上下文

skills 是挂给 agent 的教学能力包。当前服务端会读取 agent 绑定的 skill 文件内容，注入到 AI prompt 中。

skills 不创建 `learning_paths`、`path_steps`、`user_learning_paths` 或 `user_tasks`。

### `self-study-material-planner` 只用于材料生成计划

`self-study-material-planner` 是“教程材料 -> 学习计划草稿”的专用 agent。

它输出 JSON 计划草稿，写入：

- `learning_plan_drafts`
- `learning_plan_draft_tasks`

只有用户确认草稿后，才会物化成正式路径和任务。

## 查询 SQL

### 查看所有自由模式初始化模板

```sql
select
  lp.id as path_id,
  lp.code,
  lp.name,
  lp.target_level,
  lp.source_type,
  lp.metadata as path_metadata,
  ps.id as step_id,
  ps.step_no,
  ps.title,
  ps.summary,
  ps.focus,
  ps.goal,
  ps.completion_criteria,
  ps.estimated_minutes,
  ps.reward_score,
  ps.knowledge_points,
  ps.key_points,
  ps.pitfalls,
  ps.metadata as step_metadata
from public.learning_paths lp
join public.path_steps ps
  on ps.path_id = lp.id
where lp.source_type = 'self_directed'
order by lp.code, ps.step_no;
```

### 查看某个用户当前自由模式学习任务

```sql
select
  ulp.id as user_learning_path_id,
  ulp.status as path_status,
  ulp.selection_mode,
  ulp.path_code_snapshot,
  ulp.path_name_snapshot,
  ulp.learning_level,
  ulp.completed_steps,
  ulp.total_steps,
  ulp.current_task_id,
  ulp.metadata as user_path_metadata,
  ut.id as user_task_id,
  ut.status as task_status,
  ut.started_at,
  ut.completed_at,
  ut.last_conversation_id,
  ps.step_no,
  ps.title,
  ps.summary,
  ps.focus,
  ps.goal,
  ps.completion_criteria,
  ps.estimated_minutes,
  ps.reward_score,
  ps.knowledge_points,
  ps.key_points,
  ps.pitfalls,
  ps.metadata as step_metadata
from public.user_learning_paths ulp
join public.user_tasks ut
  on ut.user_learning_path_id = ulp.id
join public.path_steps ps
  on ps.id = ut.path_step_id
where ulp.user_id = '<USER_ID>'
  and ulp.status = 'active'
  and ulp.selection_mode = 'self_directed'
order by ps.step_no;
```

### 判断当前自由模式路径是初始化模板还是材料生成计划

```sql
select
  id,
  user_id,
  path_code_snapshot,
  path_name_snapshot,
  selection_mode,
  status,
  metadata ->> 'seedSource' as seed_source
from public.user_learning_paths
where user_id = '<USER_ID>'
order by updated_at desc;
```

判断规则：

| `metadata.seedSource` | 含义 |
| --- | --- |
| `api_onboarding_complete` | onboarding 选择自由模式后创建的初始化自学路径 |
| `plan_draft_confirmed` | 用户粘贴材料生成草稿并确认后的自学路径 |

## 代码定位

| 位置 | 作用 |
| --- | --- |
| `features/learning/pages/learn-page.tsx` | `/learn` 页面加载 `GET /api/learning/current-session`，并在自由模式下打开材料计划弹窗 |
| `app/api/learning/current-session/route.ts` | 当前学习会话 API 入口 |
| `server/modules/learning/service.ts` | 读取 active 学习路径、用户任务、模板步骤，并组装 `/learn` 响应 |
| `server/modules/onboarding/service.ts` | onboarding 完成时创建 `user_learning_paths` 和 `user_tasks` |
| `features/admin-learning-templates` | 管理后台自学路径模板列表、编辑器与 AI 生成草稿 |
| `server/modules/admin-learning-templates` | 管理后台模板 CRUD、AI 生成、同步未开始用户路径服务 |
| `supabase/migrations/054_self_directed_template_management.sql` | 自学模板启用唯一约束、步骤归档索引与后台专用生成 agent |
| `supabase/seeds/001_dictionary.sql` | Cursor / Trae / Windsurf 等首批自学路径和通用三步初始化任务 seed |
| `supabase/seeds/003_onboarding_tool_expansion.sql` | Claude Code / Codex / OpenCode / Stitch / Bolt / Lovable 等自学路径和通用三步初始化任务 seed |
| `supabase/seeds/006_ai_agent_and_binding_registry.sql` | self-directed 路径与 coach agent 的绑定 seed |
| `supabase/seeds/008_material_plan_planner_agent.sql` | 教程材料生成计划专用 agent seed |
| `server/modules/learning-plans/service.ts` | 材料计划草稿生成与持久化 |
| `server/modules/learning-plans/activation.ts` | 草稿确认入口，调用数据库 RPC 物化正式学习路径 |
| `supabase/migrations/046_harden_material_plan_generation.sql` | `confirm_learning_plan_draft` RPC，负责草稿确认后的事务化物化 |

## 后续升级注意事项

1. 如果要改“刚进入 `/learn` 看到的初始化任务”，优先使用 `/admin/learning/templates` 管理 `learning_paths` / `path_steps`，不要误改 `learning_plan_drafts`。
2. 管理后台模板保存会影响新完成 onboarding 的用户；若要影响已存在但未开始的初始化自学路径，需要管理员手动执行“同步未开始”。
3. 当前后台 AI 生成只返回模板草稿，不直接落库；管理员保存后才发布到 `learning_paths` / `path_steps`。
4. 同一工具和水平只能有一个启用的 `self_directed` 模板，数据库通过 `054` 的部分唯一索引保护。
5. `/learn` 首屏展示依赖 `user_learning_paths.status = 'active'`。学习路径状态机已有 `active`、`interrupted`、`completed`、`abandoned`、`archived`，升级时要避免破坏 `/learn`、`/map`、`/history` 的共同主线。
6. `path_steps.metadata` 已被材料生成计划用于 `practiceSteps`、`lessonBrief`、`submissionGuide`、`checkpoints` 等扩展字段；如果初始化模板也要支持更丰富任务说明，可以复用这些字段，但要同步页面和文档口径。
