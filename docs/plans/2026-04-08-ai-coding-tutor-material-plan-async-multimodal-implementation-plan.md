# Async Multimodal Material Plan Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将自由学习模式的“教程链接生成学习计划”升级为单链接、异步、多模态、可编辑草稿工作台版本，同时保留现有白名单 HTML 图文抓取能力。

**Architecture:** 基于现有 `learning_material_*` + `learning_plan_draft*` 主线增量演进，不重写确认激活闭环。由于当前仓库仍未引入 Redis / MQ，本计划先落地“数据库真源 + 进程内 best-effort worker + 可恢复轮询”的异步编排，后续再平滑替换为共享队列。多模态解析与 planner 解耦，分别由 intake provider、planner、quality gate 三段执行。

**Tech Stack:** Next.js App Router、React 19、TypeScript、Supabase、现有 AI provider / agent 编排、Zod、OpenAPI、Node test scripts

---

## 实施前提

- 范围冻结为“1 条链接 -> 1 份计划”，不做多链接合并。
- 保留现有 `developer.mozilla.org`、`nextjs.org`、`web.dev` 图文支持。
- 新增支持抖音、小红书、B 站公开教程链接。
- 前端提交后统一进入异步流程；HTML 白名单来源也不再走同步首稿。
- 确认前草稿必须可编辑、可局部重生成；确认后才替换当前 active path。
- 质量不足时自动降级为“3 关试点计划”，而不是硬出长计划。

## 里程碑

### M1：异步骨架先跑通

- POST 创建 intake 和 generation run，立即返回 `processingMode=async`
- GET intake 状态可轮询
- `/learn` 有明确进度反馈和可恢复状态
- 原白名单 HTML 来源改走异步链路后仍可用

### M2：多模态摄取跑通

- HTML / B 站 / 抖音 / 小红书 source resolver 可识别
- 字幕优先，缺失时再走 ASR / OCR / vision
- 归一化 `learning_material_chunks` 可落库和回放

### M3：共创草稿跑通

- 草稿详情、PATCH、全量重生成、单任务重生成全部落地
- planner 输出含目标对齐表、evidence refs、周预算校准、week-1 推荐子集
- confirm 写入 revision 与结构化 metadata

### M4：质量闸门与文档收口

- 规则校验 + 二次小模型自检
- 自动 fallback 到试点计划
- OpenAPI、数据库文档、AI orchestration 文档全部同步

## 执行约束

- 不直接复制 `../OpenMAIC` 代码；只借鉴 provider 拆分、SSRF guard、JSON repair、proxy-media 思路。
- 平台来源只处理公开页面，不绕过登录、不抓私有内容。
- 任何“支持平台”的实现都要先保留 `MATERIAL_UNSUPPORTED_SOURCE` 降级出口。
- 没有把握稳定抽取正文/字幕时，优先保留 source metadata 和 warning，不伪造内容。

### Task 1: 建立异步 intake 与 generation run 数据骨架

**Files:**
- Create: `supabase/migrations/022_async_material_plan_runs.sql`
- Modify: `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`
- Modify: `.env.example`
- Test: `pnpm db:check`

**Step 1: 扩展 intake 状态机，不先动业务代码**

在 `022_async_material_plan_runs.sql` 中为现有 `learning_material_intake_status` 增量补齐以下状态：

```sql
ALTER TYPE public.learning_material_intake_status
  ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE public.learning_material_intake_status
  ADD VALUE IF NOT EXISTS 'extracting';
ALTER TYPE public.learning_material_intake_status
  ADD VALUE IF NOT EXISTS 'planning';
ALTER TYPE public.learning_material_intake_status
  ADD VALUE IF NOT EXISTS 'quality_checking';
ALTER TYPE public.learning_material_intake_status
  ADD VALUE IF NOT EXISTS 'ready';
```

同时给 `learning_material_intakes` 新增：

- `processing_stage text`
- `progress_percent integer`
- `progress_message text`
- `latest_run_id uuid null`
- `latest_draft_id uuid null`
- `source_kind text`
- `current_constraints text`

**Step 2: 新建 intake 过程真相表**

在同一迁移中新增：

- `learning_material_chunks`
- `learning_plan_generation_runs`

最小字段要求：

```sql
CREATE TABLE public.learning_material_chunks (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.learning_material_intakes(id) on delete cascade,
  source_id uuid not null references public.learning_material_sources(id) on delete cascade,
  chunk_no integer not null,
  modality text not null,
  content text not null,
  summary text null,
  source_ref jsonb not null default '{}'::jsonb,
  token_estimate integer null,
  created_at timestamptz not null default timezone('utc', now())
);
```

```sql
CREATE TABLE public.learning_plan_generation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intake_id uuid not null references public.learning_material_intakes(id) on delete cascade,
  draft_id uuid null references public.learning_plan_drafts(id) on delete set null,
  trigger_type text not null,
  status text not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  planner_input jsonb null,
  planner_output jsonb null,
  quality_report jsonb null,
  error_code text null,
  error_message text null,
  started_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

**Step 3: 给后续 rollout 预留环境变量**

在 `.env.example` 先声明，不在本任务绑定真实 provider：

- `MATERIAL_PLAN_ASYNC_ENABLED`
- `MATERIAL_PLAN_PLATFORM_SOURCES_ENABLED`
- `MATERIAL_PLAN_ASR_MODEL_CODE`
- `MATERIAL_PLAN_VISION_MODEL_CODE`
- `MATERIAL_PLAN_QUALITY_MODEL_CODE`

**Step 4: 跑迁移连通性检查**

Run: `pnpm db:check`

Expected: 远程连接成功，且迁移文件可被后续执行脚本识别。

**Step 5: 回写数据库主文档**

更新 [2026-03-23-ai-coding-tutor-database-schema-design.md](docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md)：

- intake 状态机从同步三态扩为可观测多阶段
- 新增 `learning_material_chunks`
- 新增 `learning_plan_generation_runs`
- 说明当前仍是 DB-backed async，不是 Redis queue

**Step 6: Commit**

```bash
git add supabase/migrations/022_async_material_plan_runs.sql .env.example docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md
git commit -m "feat: add async material intake run schema"
```

### Task 2: 建立可编辑草稿与 revision 数据骨架

**Files:**
- Create: `supabase/migrations/023_material_plan_editable_drafts.sql`
- Modify: `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`
- Test: `pnpm db:check`

**Step 1: 为 draft 增加可编辑和回放字段**

在 `023_material_plan_editable_drafts.sql` 中给 `learning_plan_drafts` 新增：

- `alignment_json jsonb`
- `week_1_task_ids jsonb`
- `revision_no integer not null default 1`
- `editable_payload jsonb not null default '{}'::jsonb`
- `quality_status text not null default 'pending'`
- `quality_report jsonb`

给 `learning_plan_draft_tasks` 新增：

- `position integer`
- `is_user_edited boolean not null default false`
- `goal_alignment_refs jsonb not null default '[]'::jsonb`
- `recommended_for_week_1 boolean not null default false`

**Step 2: 新建 revision 表**

新增 `learning_plan_draft_revisions`：

```sql
CREATE TABLE public.learning_plan_draft_revisions (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.learning_plan_drafts(id) on delete cascade,
  revision_no integer not null,
  change_type text not null,
  patch_payload jsonb not null default '{}'::jsonb,
  generated_by_run_id uuid null references public.learning_plan_generation_runs(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (draft_id, revision_no)
);
```

**Step 3: 给 confirm 需要的 path metadata 留出契约**

迁移中不要改 `path_steps` 结构，但在数据库文档注明确认时写入：

- `source_refs`
- `goal_alignment_refs`
- `recommended_for_week_1`
- `draft_revision_no`

**Step 4: 跑迁移连通性检查**

Run: `pnpm db:check`

Expected: 连接检查通过；新迁移与 `022` 顺序兼容。

**Step 5: 更新数据库文档**

将 draft/revision 语义同步到 [2026-03-23-ai-coding-tutor-database-schema-design.md](docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md)。

**Step 6: Commit**

```bash
git add supabase/migrations/023_material_plan_editable_drafts.sql docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md
git commit -m "feat: add editable draft revision schema"
```

### Task 3: 把创建链路改成异步 API，并建立状态查询接口

**Files:**
- Modify: `lib/api/contracts/learning.ts`
- Modify: `server/lib/request-validation.ts`
- Modify: `server/modules/learning-materials/constants.ts`
- Modify: `server/modules/learning-materials/errors.ts`
- Modify: `server/modules/learning-materials/whitelist.ts`
- Modify: `server/modules/learning-materials/service.ts`
- Create: `server/modules/learning-materials/status.ts`
- Create: `server/modules/learning-materials/queue.ts`
- Modify: `server/modules/learning-plans/service.ts`
- Modify: `server/modules/learning-plans/route-handler.ts`
- Create: `app/api/learning/material-intakes/[id]/route.ts`
- Modify: `app/api/learning/plan-from-material/route.ts`
- Modify: `server/modules/api-docs/schemas.ts`
- Modify: `server/modules/api-docs/openapi.ts`
- Test: `scripts/check-learning-plan-from-material-route.ts`
- Test: `scripts/check-learning-material-intake-route.ts`
- Test: `scripts/check-api-request-validation.ts`
- Test: `scripts/check-openapi-document.ts`

**Step 1: 改客户端和服务端契约**

将 `PlanFromMaterialRequestContract` 扩为：

```ts
type PlanFromMaterialRequestContract = {
  links: string[]
  userGoal?: string | null
  weeklyHours?: number | null
  currentConstraints?: string | null
}
```

将 `PlanFromMaterialResponseData` 改为：

```ts
type PlanFromMaterialResponseData = {
  processingMode: "async"
  intakeId: string
  runId: string
  draftId: string | null
  status: "queued" | "extracting" | "planning" | "quality_checking" | "ready" | "failed"
}
```

保留单链接校验；把错误码从 `MATERIAL_UNSUPPORTED_DOMAIN` 升级为 `MATERIAL_UNSUPPORTED_SOURCE`。

**Step 2: 新增 intake 状态读模型**

在 `server/modules/learning-materials/status.ts` 实现：

- `getMaterialIntakeStatus(userId, intakeId)`
- 响应字段包括 `status`、`processingStage`、`progressPercent`、`progressMessage`、`draftId`、`runId`、`errorCode`、`errorMessage`

**Step 3: 让 POST 只负责“登记 + kick worker”**

在 `server/modules/learning-materials/service.ts` 与 `server/modules/learning-plans/service.ts` 中拆成两段：

- `submitMaterialPlanGeneration`
- `executeMaterialPlanGenerationRun`

`submit` 只做：

- 校验链接
- 创建 intake
- 创建 run
- 返回 async 状态

`execute` 交给后续任务实现。

**Step 4: 增加 DB-backed best-effort queue**

在 `server/modules/learning-materials/queue.ts` 先做最小实现：

- `kickMaterialPlanRun(runId)`
- `resumePendingMaterialPlanRuns(limit)`

约束：

- 只允许单实例 best-effort
- 每次读 run 状态时允许顺手 resume 一次卡住的 pending / queued run
- 所有进度都必须回写 DB，不依赖内存状态

**Step 5: 新增 `GET /api/learning/material-intakes/{id}`**

路由只做认证、参数校验、状态读取，返回最新 intake / run / draft 摘要。

**Step 6: 更新 OpenAPI 与 request validation**

同步：

- `server/lib/request-validation.ts`
- `server/modules/api-docs/schemas.ts`
- `server/modules/api-docs/openapi.ts`

确保运行时文档已从同步返回改为异步返回。

**Step 7: 写 route 与 validation 测试**

新增并跑：

- `node --experimental-loader ./scripts/lib/alias-loader.mjs --experimental-strip-types --experimental-specifier-resolution=node --test scripts/check-learning-plan-from-material-route.ts`
- `node --experimental-loader ./scripts/lib/alias-loader.mjs --experimental-strip-types --experimental-specifier-resolution=node --test scripts/check-learning-material-intake-route.ts`
- `pnpm test:api-request-validation`
- `pnpm test:openapi-document`

Expected: 新老接口 schema 一致；非法来源返回 `MATERIAL_UNSUPPORTED_SOURCE`；创建接口返回 `processingMode=async`。

**Step 8: Commit**

```bash
git add lib/api/contracts/learning.ts server/lib/request-validation.ts server/modules/learning-materials/constants.ts server/modules/learning-materials/errors.ts server/modules/learning-materials/whitelist.ts server/modules/learning-materials/service.ts server/modules/learning-materials/status.ts server/modules/learning-materials/queue.ts server/modules/learning-plans/service.ts server/modules/learning-plans/route-handler.ts app/api/learning/material-intakes/[id]/route.ts app/api/learning/plan-from-material/route.ts server/modules/api-docs/schemas.ts server/modules/api-docs/openapi.ts scripts/check-learning-plan-from-material-route.ts scripts/check-learning-material-intake-route.ts
git commit -m "feat: convert material plan creation to async intake"
```

### Task 4: 落地 source resolver，并保留 HTML 白名单支持

**Files:**
- Create: `server/modules/learning-materials/source-resolver.ts`
- Create: `server/modules/learning-materials/adapters/html.ts`
- Create: `server/modules/learning-materials/adapters/douyin.ts`
- Create: `server/modules/learning-materials/adapters/xiaohongshu.ts`
- Create: `server/modules/learning-materials/adapters/bilibili.ts`
- Modify: `server/modules/learning-materials/constants.ts`
- Modify: `server/modules/learning-materials/service.ts`
- Modify: `server/modules/learning-materials/normalizer.ts`
- Modify: `server/modules/learning-materials/extractors/article.ts`
- Test: `scripts/check-learning-plan-from-material-logic.ts`

**Step 1: 把“host 白名单”升级为“source resolver”**

新增统一接口：

```ts
type MaterialSourceAdapter = {
  sourceCode: "html" | "douyin" | "xiaohongshu" | "bilibili"
  supports(url: URL): boolean
  fetch(rawUrl: string): Promise<AdapterFetchResult>
}
```

要求：

- HTML adapter 只允许 `developer.mozilla.org`、`nextjs.org`、`web.dev`
- 抖音、小红书、B 站 adapter 先只接公开分享页
- 未命中任何 adapter 时返回 `MATERIAL_UNSUPPORTED_SOURCE`

**Step 2: 先把 HTML adapter 抽离出来**

把当前 `fetchArticleText` 路径改造成 `adapters/html.ts` 复用，避免后续平台适配继续往 `service.ts` 塞分支。

**Step 3: 为三个平台只定义“可实现的首版抓取边界”**

每个平台 adapter 首版都只允许输出如下结构：

```ts
type AdapterFetchResult = {
  canonicalUrl: string
  sourceType: "article" | "video" | "image_post"
  title: string | null
  description: string | null
  authorName: string | null
  coverImageUrl: string | null
  subtitleTracks: SubtitleTrack[]
  mediaAssets: MediaAsset[]
  rawTextBlocks: string[]
  warnings: string[]
}
```

注意：

- B 站优先读公开字幕 / 简介 / 分 P 文本
- 抖音、小红书优先读公开标题、描述、图文正文、可见字幕
- 对拿不到正文的来源返回 `warnings`，不直接伪造 chunk

**Step 4: 统一将 adapter 输出落进 `learning_material_sources`**

至少写入：

- `source_type`
- `fetch_status`
- `title`
- `content_excerpt`
- `metadata.sourceCode`
- `metadata.warnings`
- `metadata.mediaAssets`

**Step 5: 补单元逻辑测试**

扩展 `scripts/check-learning-plan-from-material-logic.ts` 覆盖：

- HTML 来源仍成功
- 非法平台返回 `MATERIAL_UNSUPPORTED_SOURCE`
- 平台 adapter 能生成最小 source metadata

**Step 6: Commit**

```bash
git add server/modules/learning-materials/source-resolver.ts server/modules/learning-materials/adapters/html.ts server/modules/learning-materials/adapters/douyin.ts server/modules/learning-materials/adapters/xiaohongshu.ts server/modules/learning-materials/adapters/bilibili.ts server/modules/learning-materials/constants.ts server/modules/learning-materials/service.ts server/modules/learning-materials/normalizer.ts server/modules/learning-materials/extractors/article.ts scripts/check-learning-plan-from-material-logic.ts
git commit -m "feat: add material source resolver and platform adapters"
```

### Task 5: 落地多模态抽取与质量闸门

**Files:**
- Create: `server/modules/learning-materials/providers.ts`
- Create: `server/modules/learning-materials/extractors/subtitle.ts`
- Create: `server/modules/learning-materials/extractors/asr.ts`
- Create: `server/modules/learning-materials/extractors/ocr.ts`
- Create: `server/modules/learning-materials/extractors/vision.ts`
- Modify: `server/modules/learning-materials/service.ts`
- Modify: `server/modules/learning-materials/normalizer.ts`
- Modify: `server/modules/learning-plans/prompt.ts`
- Modify: `server/modules/learning-plans/schema.ts`
- Create: `server/modules/learning-plans/quality-gate.ts`
- Modify: `server/modules/learning-plans/service.ts`
- Modify: `server/modules/learning-plans/planner-runtime.ts`
- Test: `scripts/check-learning-plan-from-material-logic.ts`

**Step 1: 为 intake-side model 增加独立 provider 解析**

在 `server/modules/learning-materials/providers.ts` 不复用学习消息主链路的 agent 解析，直接按模型 code 读取：

- planner model
- quality-check model
- ASR model
- vision/OCR model

选择规则优先：

1. env 显式指定的 model code
2. `ai_models.metadata.capabilities` 命中的模型

本任务不做 admin UI 改动，只做运行时读取。

**Step 2: 落地“字幕优先”的抽取顺序**

统一顺序固定为：

1. raw text / 图文正文
2. subtitle tracks
3. ASR
4. OCR / vision

任何来源只要前一层够用，就不继续打更贵的模型。

**Step 3: 把抽取结果归一化为 chunk**

更新 `normalizer.ts`，确保每个 chunk 都带：

- `modality`
- `content`
- `sourceRef`
- `evidenceType`
- `confidence`

并把 chunk 真正持久化到 `learning_material_chunks`。

**Step 4: 强化 planner 输出 schema**

`server/modules/learning-plans/schema.ts` 至少补齐：

- `alignmentTable`
- `estimatedTotalMinutes`
- `week1TaskNos`
- `warnings`

每个 task 还要补：

- `goalAlignmentRefs`
- `sourceRefs`
- `acceptanceCriteria`

**Step 5: 加入质量闸门与 fallback**

在 `quality-gate.ts` 实现两层检查：

第一层规则：

- 关卡数区间
- 每关必须有 acceptance
- 每关必须有 source refs
- 不允许空泛 objective
- 总时长与 `weeklyHours` 不明显失衡

第二层小模型自检：

- 输出 `pass / retry / fallback`
- 若两次重试仍失败，则降级为 3 关试点计划

**Step 6: 把 worker 状态推进串起来**

`executeMaterialPlanGenerationRun` 要显式推进：

- `extracting`
- `planning`
- `quality_checking`
- `ready` / `failed`

每一步都写 `progress_percent` 和 `progress_message`。

**Step 7: 跑逻辑测试**

Run: `pnpm test:learning-plan-from-material`

Expected: 旧 HTML 用例仍过；planner schema 升级后 route/logic 仍能生成有效草稿；质量失败时可 fallback。

**Step 8: Commit**

```bash
git add server/modules/learning-materials/providers.ts server/modules/learning-materials/extractors/subtitle.ts server/modules/learning-materials/extractors/asr.ts server/modules/learning-materials/extractors/ocr.ts server/modules/learning-materials/extractors/vision.ts server/modules/learning-materials/service.ts server/modules/learning-materials/normalizer.ts server/modules/learning-plans/prompt.ts server/modules/learning-plans/schema.ts server/modules/learning-plans/quality-gate.ts server/modules/learning-plans/service.ts server/modules/learning-plans/planner-runtime.ts scripts/check-learning-plan-from-material-logic.ts
git commit -m "feat: add multimodal extraction and plan quality gate"
```

### Task 6: 落地草稿详情、PATCH、全量重生成、单任务重生成

**Files:**
- Create: `app/api/learning/plan-drafts/[id]/route.ts`
- Create: `app/api/learning/plan-drafts/[id]/tasks/[taskId]/regenerate/route.ts`
- Create: `server/modules/learning-plans/draft-detail.ts`
- Create: `server/modules/learning-plans/draft-patch.ts`
- Create: `server/modules/learning-plans/task-regenerate.ts`
- Modify: `server/modules/learning-plans/service.ts`
- Modify: `server/modules/learning-plans/route-handler.ts`
- Modify: `server/modules/learning-plans/activation.ts`
- Modify: `server/lib/request-validation.ts`
- Modify: `lib/api/contracts/learning.ts`
- Modify: `server/modules/api-docs/schemas.ts`
- Modify: `server/modules/api-docs/openapi.ts`
- Test: `scripts/check-learning-plan-draft-edit-route.ts`
- Test: `scripts/check-learning-plan-from-material-route.ts`

**Step 1: 新增草稿详情读模型**

`GET /api/learning/plan-drafts/{id}` 返回：

- draft 基础信息
- alignment table
- tasks
- quality report
- latest revision
- latest run summary

**Step 2: 支持 PATCH 共创编辑**

`PATCH /api/learning/plan-drafts/{id}` 仅允许：

- 改标题
- 改约束说明
- 调整任务顺序
- 删除任务
- 标记 week-1 子集

不允许直接 PATCH 已确认草稿。

**Step 3: 全量重生成改为“新 run + 新 revision”**

现有 `POST /api/learning/plan-drafts/{id}/regenerate` 不再同步返回新 preview，而是：

- 创建新的 generation run
- 保留当前 draft 为编辑中的真源
- 生成完成后把 draft 升 revision，而不是简单 supersede 整行

**Step 4: 新增单任务重生成**

`POST /api/learning/plan-drafts/{id}/tasks/{taskId}/regenerate` 需要接受：

- `reason`
- `currentConstraints`
- `preservePosition`

只替换单任务内容，不改其它任务。

**Step 5: confirm 写入结构化 metadata**

在 `activation.ts` 确保物化到 `path_steps.metadata`：

- `source_refs`
- `goal_alignment_refs`
- `recommended_for_week_1`
- `draft_revision_no`

**Step 6: 补 API docs 与 route tests**

至少新增：

- `scripts/check-learning-plan-draft-edit-route.ts`

并更新：

- request validation
- OpenAPI path 注册
- response example

**Step 7: 跑测试**

Run:

- `node --experimental-loader ./scripts/lib/alias-loader.mjs --experimental-strip-types --experimental-specifier-resolution=node --test scripts/check-learning-plan-draft-edit-route.ts`
- `pnpm test:learning-plan-from-material`
- `pnpm test:openapi-document`

Expected: PATCH、task regenerate、confirm metadata 全部可通过。

**Step 8: Commit**

```bash
git add app/api/learning/plan-drafts/[id]/route.ts app/api/learning/plan-drafts/[id]/tasks/[taskId]/regenerate/route.ts server/modules/learning-plans/draft-detail.ts server/modules/learning-plans/draft-patch.ts server/modules/learning-plans/task-regenerate.ts server/modules/learning-plans/service.ts server/modules/learning-plans/route-handler.ts server/modules/learning-plans/activation.ts server/lib/request-validation.ts lib/api/contracts/learning.ts server/modules/api-docs/schemas.ts server/modules/api-docs/openapi.ts scripts/check-learning-plan-draft-edit-route.ts
git commit -m "feat: add editable draft and single task regenerate"
```

### Task 7: 重做 `/learn` 前端等待体验与草稿工作台

**Files:**
- Modify: `features/learning/components/material-plan-panel.tsx`
- Modify: `features/learning/components/material-plan-dialog.tsx`
- Modify: `features/learning/pages/learn-page.tsx`
- Create: `features/learning/components/material-plan-progress.tsx`
- Create: `features/learning/components/material-plan-workbench.tsx`
- Create: `features/learning/components/material-plan-alignment.tsx`
- Modify: `providers/workspace-sidebar-provider.tsx`
- Modify: `components/layout/dashboard-sidebar.tsx`
- Modify: `lib/api/contracts/learning.ts`
- Test: `scripts/check-learning-plan-workbench-ui.mjs`
- Test: `scripts/check-workspace-sidebar.mjs`

**Step 1: 提交后从“等结果”改为“等状态”**

`material-plan-panel.tsx` 的本地状态至少拆成：

- `idle`
- `submitting`
- `polling`
- `ready`
- `failed`

POST 成功后保存 `intakeId` 与 `runId`，改为轮询 `GET /api/learning/material-intakes/{id}`。

**Step 2: 新增进度组件**

`material-plan-progress.tsx` 展示：

- 阶段进度条
- 当前阶段文案
- 预计耗时区间
- 可离开页面提示

不要只放 spinner。

**Step 3: 新增草稿工作台**

`material-plan-workbench.tsx` 至少包含四区：

- 概览
- 可编辑任务列表
- 目标对齐表
- 校准面板

`material-plan-alignment.tsx` 单独渲染 alignment table，避免 `panel.tsx` 继续膨胀。

**Step 4: 支持恢复最近一次 in-progress intake**

在 `learn-page.tsx` 中：

- 页面加载时检查是否存在最近未完成 intake
- 若存在，优先恢复到 progress / workbench
- 不要强制用户重新粘贴链接

**Step 5: 接入侧边栏提醒**

在 `providers/workspace-sidebar-provider.tsx` 与 `components/layout/dashboard-sidebar.tsx` 中复用现有站内提醒区域，增加“材料计划生成中 / 已就绪 / 失败”的展示入口。

这里只做站内提醒和恢复入口，不做新的提醒中心页面。

**Step 6: 写 UI 校验脚本**

新增 `scripts/check-learning-plan-workbench-ui.mjs` 覆盖：

- progress 阶段文案
- 工作台区块存在
- 单任务 regenerate 按钮存在
- 约束输入存在

并跑：

- `node scripts/check-learning-plan-workbench-ui.mjs`
- `pnpm test:workspace-sidebar`

**Step 7: Commit**

```bash
git add features/learning/components/material-plan-panel.tsx features/learning/components/material-plan-dialog.tsx features/learning/pages/learn-page.tsx features/learning/components/material-plan-progress.tsx features/learning/components/material-plan-workbench.tsx features/learning/components/material-plan-alignment.tsx providers/workspace-sidebar-provider.tsx components/layout/dashboard-sidebar.tsx lib/api/contracts/learning.ts scripts/check-learning-plan-workbench-ui.mjs
git commit -m "feat: add async material plan workbench experience"
```

### Task 8: 通知、恢复、文档与收尾验证

**Files:**
- Modify: `server/modules/notifications/service.ts`
- Modify: `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`
- Modify: `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`
- Modify: `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`
- Modify: `docs/plans/README.md`
- Modify: `AGENTS.md`
- Modify: `package.json`
- Test: `pnpm lint`
- Test: `pnpm test:learning-plan-from-material`
- Test: `pnpm test:analytics-notifications-logic`
- Test: `pnpm test:workspace-sidebar`
- Test: `pnpm test:openapi-document`

**Step 1: 发站内提醒，不新增另一套通知模型**

在 `server/modules/notifications/service.ts` 里复用 `user_notifications`：

- intake 创建后可选发一条“生成中”提醒
- ready 时发“草稿已就绪”
- failed 时发“生成失败，请重试或更换链接”

payload 至少带：

- `intakeId`
- `draftId`
- `runId`
- `sourceKind`

**Step 2: 完整回写 API 主文档**

更新 [2026-03-23-ai-coding-tutor-api-spec.md](docs/plans/2026-03-23-ai-coding-tutor-api-spec.md)：

- `POST /api/learning/plan-from-material` 从同步改为异步
- 新增 `GET /api/learning/material-intakes/{id}`
- 新增 `GET/PATCH /api/learning/plan-drafts/{id}`
- 新增 `POST /api/learning/plan-drafts/{id}/tasks/{taskId}/regenerate`
- 错误码改为 `MATERIAL_UNSUPPORTED_SOURCE`

**Step 3: 回写 AI orchestration 主文档**

更新 [2026-03-30-ai-coding-tutor-ai-orchestration-design.md](docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md)，明确：

- 材料计划链路是独立于学习消息主链路的第二条 AI 编排线
- intake-side provider 分为 planner / quality / ASR / vision 几类
- 当前 async worker 仍是 DB-backed single-instance best-effort

**Step 4: 更新仓库入口说明**

只有在代码已真正落地后，才更新：

- [docs/plans/README.md](docs/plans/README.md)
- `AGENTS.md`

禁止把“计划中能力”写成“已实现”。

**Step 5: 补 package script**

在 `package.json` 增加：

- `test:learning-material-intake-route`
- `test:learning-plan-draft-edit`
- `test:learning-plan-workbench-ui`

并把它们串进已有 `test:learning-plan-from-material` 或新建聚合命令。

**Step 6: 跑最终验证**

Run:

- `pnpm lint`
- `pnpm test:learning-plan-from-material`
- `pnpm test:analytics-notifications-logic`
- `pnpm test:workspace-sidebar`
- `pnpm test:openapi-document`

Expected: lint 通过；学习计划主链路、通知联动、侧边栏提醒、OpenAPI 文档全部通过。

**Step 7: Commit**

```bash
git add server/modules/notifications/service.ts docs/plans/2026-03-23-ai-coding-tutor-api-spec.md docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md docs/plans/README.md AGENTS.md package.json
git commit -m "docs: sync async multimodal material plan architecture"
```

## 风险检查清单

- 平台页面结构变化会导致 adapter 脆弱，必须保留 source warnings 与 graceful fallback。
- 无 Redis / MQ 的前提下，worker 只能做到 best-effort；必须把 run 状态、重试、恢复全部放到 DB。
- 单任务重生成如果直接覆盖 task 行，容易丢用户手改内容；必须先写 revision，再替换当前视图。
- 小模型质量闸门如果过严，会把可用计划误判掉；规则与模型判断必须都记录到 `quality_report`。
- 抖音 / 小红书来源可能拿不到稳定字幕；实现上必须允许“描述 + OCR + vision”组成弱证据计划，并明确标注低置信度。

## 完成定义

- 用户可以粘贴 1 条 HTML 白名单 / 抖音 / 小红书 / B 站公开教程链接生成计划。
- 提交后立即进入异步等待态，前端有可感知进度。
- 草稿 ready 后进入可编辑工作台，而不是只读 preview。
- 用户可以在确认前改标题、改约束、删任务、调顺序、全量重生成、单任务重生成。
- 计划包含目标对齐表、证据 refs、时长预算、本周建议子集。
- confirm 后仍走现有学习路径物化闭环，并写入 revision metadata。
