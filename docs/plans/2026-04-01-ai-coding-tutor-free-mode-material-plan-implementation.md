# AI 编程学习教练：自由学习模式“平台教程链接生成学习计划”实施方案（异步多模态共创版 v2.0）

> 文档类型：实施设计方案（Implementation Plan）  
> 适用范围：自由学习模式（`selection_mode=self_directed`）  
> 创建日期：2026-04-01  
> 最近更新：2026-05-21  
> 状态：当前代码已落地 **单链接、异步多模态摄取、HTML 图文来源 + 抖音 / 小红书 / B 站公开来源、可编辑草稿、局部重生成、确认后激活**  
> 关联文档：
>
> - `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`
> - `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`
> - `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`
> - `docs/plans/2026-03-23-ai-coding-tutor-backend-structure-design.md`

---

## 1. 文档目的

本文记录自由学习模式“教程链接生成学习计划”的当前权威实现与目标口径：

1. 保留 HTML 图文抓取能力（MDN / Next.js / web.dev）
2. 支持用户粘贴 **单条** 抖音、小红书、B 站公开教程链接
3. 支持 **视频** 与 **图文** 两类材料
4. 统一走 **异步多模态摄取 -> 结构化归一化 -> 学习计划草稿生成**
5. 异步完成后进入 **可编辑草稿工作台**
6. 用户可在确认前执行：
   - 编辑标题
   - 调整顺序
   - 删除某关
   - 增加约束说明
   - 全量重生成
   - 单关局部重生成
7. 只有在用户点击 `confirm` 后，才替换当前自学 active path

本文不描述“任意网页通用抓取平台”。本文只定义当前产品要实现的可运营、可灰度、可回放链路。

---

## 2. 目标口径

### 2.1 产品目标

用户在自由学习模式粘贴一条公开教程链接后，系统应输出一份：

1. 与用户目标显式对齐
2. 能说明“每一关依据了材料中的哪一段/哪种能力点”
3. 可按时间预算校准
4. 可在确认前共创编辑
5. 每一关都先教“怎么做”，再要求用户练习、提交证据和接受 AI 验收
6. 可确认后直接接入当前 `/learn`、`/map`、`/history` 主链路

### 2.2 本版核心变化

相较当前已落地版本，本版有四个结构性变化：

1. 从早期 `同步一次出稿` 升级为 `异步生成`
2. 从早期 `图文-only` 升级为 `多模态摄取`
3. 从早期 `整包 regenerate` 升级为 `草稿可编辑 + 单关局部重生成`
4. 从 `仅任务列表` 改为 `任务 + 用户目标对齐表 + 证据链 + 周预算校准`
5. 从 `只给完成标准` 改为 `新手教案 + 可执行步骤 + 提交说明 + AI 检查点 + 完成标准`

### 2.3 范围冻结

本版严格冻结以下范围：

1. 每次仅允许 **1 条链接** 生成 **1 份学习计划**
2. 首批支持来源固定为：
   - HTML 图文来源：
     - `developer.mozilla.org`
     - `nextjs.org`
     - `web.dev`
   - 平台公开来源：
     - 抖音
     - 小红书
     - B 站
3. 仅处理 **公开可访问** 内容
4. 仅支持 **确认后激活**
5. 不做多链接合并计划
6. 不做自动跳过确认直接替换路径

---

## 3. 当前实现快照（代码事实）

当前仓库内已经落地的能力，仍然是本方案的基础，不应推倒重来：

1. `/learn` 已有“教程链接生成学习计划”独立入口，不走普通聊天消息接口
2. `POST /api/learning/plan-from-material`、`confirm`、`regenerate` 三条接口已存在
3. `learning_material_intakes`、`learning_material_sources`、`learning_plan_drafts`、`learning_plan_draft_tasks` 已落库
4. `confirm` 已可把草稿物化为正式 `learning_paths`、`path_steps`、`user_learning_paths`、`user_tasks`
5. 现有 planner agent `self-study-material-planner`、JSON 校验与 confirm 激活闭环已可复用
6. source resolver 已支持 HTML 图文来源，以及公开抖音、小红书、B 站链接
7. 链路已统一走异步 intake，并支持可编辑草稿与单关局部重生成

当前限制也必须如实保留：

1. 当前只支持单条链接，不支持多链接合并计划
2. 当前只支持 1 条链接
3. 当前只处理公开可访问内容，登录可见、粉丝可见、下线或反爬严重内容可能失败
4. 当前不支持任意网页通用抓取，HTML 图文来源仍限定为 MDN / Next.js / web.dev

因此，本版不是重写“学习计划体系”，而是升级：

1. `learning-materials` intake 能力
2. `learning-plans` draft 编排能力
3. `/learn` 草稿预览与等待体验

---

## 4. 设计原则

### 4.1 单真源原则

1. 草稿态真源仍是 `learning_plan_drafts` + `learning_plan_draft_tasks`
2. 执行态真源仍是 `user_learning_paths` + `user_tasks`
3. draft 未确认前，不污染当前 active path

### 4.2 异步优先原则

对抖音、小红书、B 站这类平台，以及后续需要字幕 / 音频 / OCR / vision 的材料源，默认视为高不确定性输入：

1. 可能需要解析跳转
2. 可能需要拉字幕
3. 可能需要抽音频转写
4. 可能需要抽帧做 OCR 或视觉理解

因此入口统一按异步链路设计，不再把主目标建立在同步 SLA 上。

### 4.3 可校准共创原则

系统第一次产出的不是最终答案，而是第一版草稿。用户必须能在确认前表达：

1. 我已经会什么
2. 我没有什么环境
3. 我每周能投入多少
4. 哪一关太难
5. 哪一关与我的目标不符

### 4.4 证据可解释原则

每一关都必须带：

1. 来源证据
2. 对应用户目标
3. 预计时长
4. 验收标准

防止“泛泛拆解”和“看起来像课程，实际上无法执行”。

### 4.5 质量闸门优先于速度

当材料质量不足或 planner 输出不可靠时，系统优先：

1. 自动重试
2. 降级为 3 关试点计划
3. 要求用户补充约束或摘要

而不是硬生成一套看似完整但质量不可信的长计划。

---

## 5. 目标链路总览

目标链路统一为：

1. 用户在 `/learn` 粘贴一条平台教程链接
2. 前端调用 `POST /api/learning/plan-from-material`
3. 服务端创建 `intake`
4. 后台异步执行多模态摄取：
   - 链接解析
   - 平台元数据抓取
   - 字幕拉取
   - 音频转写
   - 抽帧 OCR / vision
   - 正文/描述清洗
5. 归一化为 `material chunks`
6. planner 生成第一版草稿
7. 质量闸门校验
8. 草稿 ready 后，前端进入“可编辑草稿工作台”
9. 用户编辑或局部重生成
10. 用户确认草稿
11. 服务端将草稿物化为正式学习路径
12. `/learn` 刷新并切换到新计划第一关

---

## 6. 用户体验设计

## 6.1 提交流程

输入面板保留在 `/learn`，但提交后不直接等待整包完成，而是进入异步等待态。

提交项冻结为：

1. `link`
2. `userGoal`
3. `weeklyHours`
4. `currentConstraints`
   - 当前环境限制
   - 已掌握内容
   - 时间/设备约束

其中 `currentConstraints` 为新增字段，用于提高首稿准确度。

## 6.2 等待体验

前端等待过程必须做成“进度可感知”，不能只显示一个 spinner。

建议阶段文案：

1. `正在识别链接来源`
2. `正在提取教程内容`
3. `正在解析字幕或转写音频`
4. `正在整理关键知识点`
5. `正在生成第一版学习计划`
6. `正在做质量校验`
7. `草稿已就绪`

建议前端表现：

1. 顶部阶段进度条
2. 当前阶段说明
3. 预估剩余时间区间
4. “你可以离开此页，完成后会在工作台提醒你”的提示
5. 失败时给出明确下一步操作，而不是只显示错误码

### 6.2.1 离开页面后的友好体验

用户关闭弹窗或离开页面后，异步任务继续执行。

建议复用现有通知体系与工作台能力：

1. 侧边栏提醒卡片展示“草稿生成中 / 已就绪 / 失败”
2. `GET /api/notifications/in-app` 可补充一条系统提醒
3. 用户回到 `/learn` 时自动恢复最近一个 `draft` 或 `intake in_progress`

## 6.3 草稿工作台

异步完成后，不再只是一个只读预览弹窗，而是进入“草稿工作台”视图。

建议分为 4 个区块：

1. `计划概览`
   - 标题
   - 目标
   - 总预计时长
   - 周预算
   - 风险提示
2. `任务列表`
   - 可拖拽排序
   - 可删除
   - 可展开查看 evidence 与 acceptance
3. `目标对齐表`
   - 用户目标子项
   - 对应任务
   - 对应材料证据
4. `校准面板`
   - 我已经会什么
   - 我当前没有什么环境
   - 我希望更快 / 更稳 / 更偏实战
   - 重新估算总时长

## 6.4 编辑与共创交互

确认前必须支持：

1. 编辑计划标题
2. 编辑草稿总目标说明
3. 编辑 `currentConstraints`
4. 拖拽调整任务顺序
5. 删除任务
6. 对单个任务执行“重生成这一关”
7. 对整份草稿执行“基于新约束全量重生成”

不支持用户直接手写整段任务正文覆盖系统产物；正文仍以模型生成和规则校验为主。

## 6.5 时长与难度校准

planner 输出必须包含：

1. `estimated_total_minutes`
2. `weekly_hours_budget`
3. `recommended_start_task_nos`
4. `pace_label`
   - `light`
   - `balanced`
   - `intensive`

前端应给出：

1. 总时长预算
2. 以 `weeklyHours` 推算的预计周数
3. “本周建议先完成的子集”

说明：

1. “本周建议子集”是建议视图，不改变正式路径的任务总数
2. 可在确认时写入 step metadata，供 `/learn` 默认强调前几关

---

## 7. 功能边界

## 7.1 本版必做

1. 单链接异步 intake
2. 来源识别：白名单 HTML 图文 / 抖音 / 小红书 / B 站
3. 视频字幕优先解析
4. 无字幕时音频转写与抽帧 OCR / vision
5. 归一化 evidence chunks
6. 第一版草稿异步生成
7. 草稿编辑与局部重生成
8. 质量闸门
9. confirm 激活主链路

## 7.2 本版不做

1. 多链接合并计划
2. 任意网页通用抓取平台
3. 登录态内容抓取
4. 私密内容解析
5. 确认前直接替换 active path
6. 用户自由编辑每关全部正文后跳过系统校验

---

## 8. 架构设计

## 8.1 分层职责

1. `API Layer`
   - 鉴权
   - 参数校验
   - 创建 intake
   - 查询进度
   - patch 草稿
   - confirm 激活

2. `Material Intake Layer`
   - 平台识别
   - 平台 adapter 分发
   - 公共媒体抓取
   - 字幕 / 音频 / 图片抽取
   - OCR / ASR / vision 调用

3. `Material Normalize Layer`
   - 统一为结构化 `material chunks`
   - 计算质量评分、风险标签、时长估计

4. `Plan Orchestration Layer`
   - 组装 planner 输入
   - 调用 planner model
   - 调用质量自检
   - 产出 draft revision

5. `Draft Collaboration Layer`
   - patch draft
   - 局部 regenerate 单关
   - 全量 regenerate
   - 审计变更

6. `Activation Layer`
   - confirm draft
   - 归档旧 active path
   - 物化新 path / steps / tasks

## 8.2 异步状态机

`learning_material_intakes.status` 建议从当前简单状态扩展为更可观测的分层状态：

1. `queued`
2. `resolving`
3. `extracting`
4. `transcribing`
5. `normalizing`
6. `planning`
7. `validating`
8. `draft_ready`
9. `failed`
10. `cancelled`

说明：

1. `draft_ready` 表示 intake 完成且第一版 draft 已生成
2. draft 后续的 patch / regenerate 不改变 intake 成功事实

## 8.3 任务与运行实例拆分

建议将“摄取实体”和“运行实例”分开：

1. `learning_material_intakes`
   - 表示一次用户提交
2. `learning_plan_generation_runs`
   - 表示一次真正的后台运行
   - 包括：
     - 初次生成
     - 全量 regenerate
     - 单关 regenerate

这样做的原因：

1. intake 是业务对象
2. run 是后台执行对象
3. 用户多次校准后需要完整可审计链

---

## 9. 数据模型设计

## 9.1 保留现有表

继续保留并扩展：

1. `learning_material_intakes`
2. `learning_material_sources`
3. `learning_plan_drafts`
4. `learning_plan_draft_tasks`

## 9.2 新增表建议

### 9.2.1 `learning_material_chunks`

用途：保存归一化后的证据块，作为 planner 真正输入。

建议字段：

1. `id`
2. `intake_id`
3. `chunk_no`
4. `modality`
   - `article_text`
   - `subtitle`
   - `transcript`
   - `ocr_text`
   - `image_caption`
   - `metadata`
5. `source_ref`
6. `content`
7. `time_range_start_sec`
8. `time_range_end_sec`
9. `confidence_score`
10. `metadata`

### 9.2.2 `learning_plan_generation_runs`

用途：记录每次异步生成或重生成执行。

建议字段：

1. `id`
2. `user_id`
3. `draft_id`
4. `intake_id`
5. `run_type`
   - `initial_generate`
   - `full_regenerate`
   - `task_regenerate`
6. `target_task_id`
7. `status`
8. `stage`
9. `progress_percent`
10. `error_code`
11. `error_message`
12. `warnings_json`
13. `started_at`
14. `completed_at`
15. `metadata`

### 9.2.3 `learning_plan_draft_revisions`

用途：记录每次草稿结构变化，支撑审计与回退。

建议字段：

1. `id`
2. `draft_id`
3. `revision_no`
4. `source_run_id`
5. `change_type`
   - `initial`
   - `user_patch`
   - `full_regenerate`
   - `task_regenerate`
6. `snapshot_json`
7. `metadata`

## 9.3 扩展现有表建议

### 9.3.1 `learning_material_intakes`

新增建议字段：

1. `platform_code`
   - `douyin`
   - `xiaohongshu`
   - `bilibili`
   - `legacy_article`
2. `content_kind`
   - `video`
   - `article`
   - `mixed`
3. `submitted_link`
4. `normalized_link`
5. `progress_stage`
6. `progress_percent`
7. `user_goal`
8. `weekly_hours`
9. `current_constraints`
10. `material_quality_score`
11. `material_quality_flags`

### 9.3.2 `learning_material_sources`

新增建议字段：

1. `platform_content_id`
2. `author_name`
3. `published_at`
4. `duration_seconds`
5. `subtitle_status`
6. `transcript_status`
7. `ocr_status`
8. `cover_image_url`
9. `raw_metadata_json`

### 9.3.3 `learning_plan_drafts`

新增建议字段：

1. `revision_no`
2. `draft_mode`
   - `editable`
   - `locked_confirmed`
3. `alignment_summary_json`
4. `quality_gate_status`
5. `quality_gate_report_json`
6. `recommended_start_task_nos`
7. `current_constraints_snapshot`

### 9.3.4 `learning_plan_draft_tasks`

新增建议字段：

1. `task_uuid`
2. `is_deleted`
3. `difficulty_level`
4. `goal_alignment_json`
5. `evidence_refs_json`
6. `quality_flags_json`
7. `generation_source`
   - `initial`
   - `manual_patch`
   - `task_regenerate`

---

## 10. API 设计

## 10.1 创建 intake

`POST /api/learning/plan-from-material`

入参：

1. `link: string`
2. `userGoal?: string`
3. `weeklyHours?: number`
4. `currentConstraints?: string`

返回：

1. `processingMode: "async"`
2. `intakeId`
3. `runId`
4. `status`
5. `stage`
6. `progressPercent`
7. `pollAfterMs`
8. `message`

说明：

1. 本版不再接受 `links: string[]`
2. 当前新 UI 只允许单链接提交
3. 旧同步图文兼容逻辑可在服务内部保留，但对本版产品口径不再作为主模式

## 10.2 查询 intake 与草稿状态

`GET /api/learning/material-intakes/{id}`

返回：

1. intake 基本信息
2. 当前 stage / progress
3. 错误码与建议操作
4. 若草稿 ready，则返回：
   - `draftId`
   - `preview`
   - `warnings`
   - `qualityGateReport`

## 10.3 查询 draft 详情

`GET /api/learning/plan-drafts/{id}`

返回：

1. 草稿概览
2. 任务列表
3. 目标对齐表
4. 证据列表
5. 风险提示
6. 推荐起步子集

## 10.4 patch 草稿

`PATCH /api/learning/plan-drafts/{id}`

允许 patch：

1. `title`
2. `goal`
3. `currentConstraints`
4. `taskOrder`
5. `deletedTaskIds`

不允许 patch：

1. 直接写入任意 task 正文内容
2. 跳过系统生成写入无 evidence 的任务

## 10.5 全量重生成

`POST /api/learning/plan-drafts/{id}/regenerate`

用途：

1. 当用户更新约束后，重新生成整份计划
2. 新 run 完成后生成新的 draft revision
3. 原 draft 仍保留审计链

## 10.6 单关局部重生成

`POST /api/learning/plan-drafts/{id}/tasks/{taskId}/regenerate`

入参：

1. `reason?: string`
2. `currentConstraints?: string`
3. `preserveOrder?: boolean`

返回：

1. `runId`
2. `status`
3. `stage`

完成后只替换目标 task，不重新生成整份草稿。

## 10.7 confirm 激活

`POST /api/learning/plan-drafts/{id}/confirm`

保持当前语义：

1. 幂等
2. 校验资源归属
3. 归档旧 active path
4. 物化新 path / steps / tasks

---

## 11. 材料摄取策略

## 11.1 平台识别

提交链接后，先做：

1. URL 规范化
2. host 识别
3. canonical URL 解析
4. 内容类型识别

输出：

1. `platform_code`
2. `content_kind`
3. `normalized_link`

其中 `platform_code` 首批建议包括：

1. `mdn_article`
2. `nextjs_article`
3. `webdev_article`
4. `douyin`
5. `xiaohongshu`
6. `bilibili`

## 11.2 平台 adapter

建议目录：

1. `server/modules/learning-materials/adapters/html/mdn.ts`
2. `server/modules/learning-materials/adapters/html/nextjs.ts`
3. `server/modules/learning-materials/adapters/html/webdev.ts`
4. `server/modules/learning-materials/adapters/douyin.ts`
5. `server/modules/learning-materials/adapters/xiaohongshu.ts`
6. `server/modules/learning-materials/adapters/bilibili.ts`
7. `server/modules/learning-materials/adapters/shared/*`

每个 adapter 输出统一材料对象：

1. 标题
2. 简介
3. 作者
4. 发布时间
5. 时长
6. 图片或封面
7. 字幕
8. 正文
9. 章节或时间点
10. 原始 metadata

## 11.3 视频材料处理

视频类按以下优先级取材：

1. 平台可用字幕
2. 平台描述 / 简介 / 章节信息
3. 音频抽取 + ASR
4. 视频抽帧 + OCR
5. 视频抽帧 + vision caption

说明：

1. 字幕是首选，因为结构最稳定、成本较低
2. ASR 与 OCR 是补强，不是默认唯一来源
3. 若视频无字幕且转写质量低，应触发质量警告

## 11.4 图文材料处理

图文类按以下顺序处理：

1. 标题与摘要
2. 正文结构清洗
3. 图片 OCR
4. 图片 caption
5. 代码片段识别

## 11.5 质量评分

材料摄取后先计算 `material_quality_score` 和 `quality_flags`。

建议 flags：

1. `NO_SUBTITLE`
2. `LOW_TRANSCRIPT_CONFIDENCE`
3. `LOW_OCR_CONFIDENCE`
4. `INSUFFICIENT_TEXT`
5. `MATERIAL_TOO_FRAGMENTED`
6. `LOGIN_REQUIRED`
7. `EXTRACTION_PARTIAL`

当质量不足时：

1. 允许进入 planner，但必须附加 warnings
2. 严重不足时直接降级为“先生成 3 关试点计划”
3. 极端不足时返回要求补充说明，而不是强生成

---

## 12. 模型编排设计

## 12.1 模型角色拆分

建议至少拆为三类模型：

1. `ASR 模型`
   - 处理视频音频转文字
2. `Vision / OCR 模型`
   - 处理截图、长图、封面、视频帧、图文里的文字与结构
3. `Planner 模型`
   - 处理学习计划生成与局部重生成

不建议让一个模型直接承担完整摄取和 planner 责任。

## 12.2 当前仓库的兼容策略

当前 `server/modules/learning/provider.ts` 的 provider contract 仍是纯文本 chat completion。

因此建议：

1. planner 继续复用现有 `AI provider + agent template` 体系
2. ASR / OCR / vision 作为 intake 侧独立 provider 或独立服务，不强塞进现有 chat provider contract

## 12.3 Planner 输入

planner 输入必须包含：

1. 用户信息
   - 工具
   - 学习等级
   - `weeklyHours`
   - `currentConstraints`
2. 材料摘要
   - 平台
   - 内容类型
   - 时长
   - 质量评分
3. evidence chunks
4. 风险标签
5. 输出约束
   - 单关时长范围
   - 任务数范围
   - acceptance 强约束
   - 目标对齐表
   - 推荐本周起步子集

## 12.4 Planner 输出契约

建议将输出从当前的简单结构扩展为：

1. `title`
2. `goal`
3. `estimatedTotalMinutes`
4. `paceLabel`
5. `recommendedStartTaskNos`
6. `goalAlignment`
7. `warnings`
8. `tasks`

其中：

### 12.4.1 `goalAlignment`

每项包含：

1. `goalItem`
2. `mappedTaskNos`
3. `mappedEvidenceRefs`
4. `notes`

### 12.4.2 `tasks[]`

每项至少包含：

1. `taskNo`
2. `title`
3. `objective`
4. `lessonBrief`：AI 将教程干货重写成适合新手理解的本关教案
5. `practiceSteps`：用户可照做的具体操作步骤
6. `submissionGuide`：做完后应提交的证据，如截图、代码、终端输出、Prompt 或报错
7. `checkpoints`：AI 验收时对照的关键证据点
8. `acceptanceCriteria`
9. `estimatedMinutes`
10. `difficultyLevel`
11. `sourceRefs`
12. `goalAlignmentRefs`
13. `whyThisTaskExists`

## 12.5 局部重生成输入

单关重生成时，输入不应只有该 task 自己，还必须补充：

1. 全局用户目标
2. 最新约束
3. 前一关摘要
4. 后一关摘要
5. 当前任务 evidence refs
6. 当前任务被用户标记的问题原因

这样能避免局部重生成后整份计划割裂。

---

## 13. 质量闸门设计

## 13.1 第一层：规则校验

规则至少包括：

1. 任务数在约定区间内
2. `taskNo` 连续递增
3. 每关必须有非空 `acceptanceCriteria`
4. 每关必须有 `sourceRefs`
5. `estimatedMinutes` 必须落在合理范围
6. 禁止空泛目标文案
7. 禁止所有任务标题高度重复

## 13.2 第二层：结构化自检

建议增加一层轻量自检：

1. 可用小模型
2. 或规则增强器

检查项：

1. 与用户目标是否真的对齐
2. 是否存在“泛泛拆解”
3. 是否存在时长严重超预算
4. 是否有 evidence 不足却写得过于确定

## 13.3 失败策略

校验失败后按顺序处理：

1. 同 prompt 小幅重试一次
2. 若仍失败，自动降级为 `3 关试点计划`
3. 若试点计划仍失败，返回 `AI_RESPONSE_INVALID` 或 `MATERIAL_INSUFFICIENT_CONTENT`

---

## 14. 草稿共创设计

## 14.1 可编辑范围

用户确认前可编辑：

1. 标题
2. 总目标
3. 当前约束
4. 顺序
5. 删除某关

## 14.2 不可直接手改范围

以下内容不允许用户绕开模型直接写入正式草稿：

1. `sourceRefs`
2. `goalAlignment`
3. `estimatedMinutes`
4. `acceptanceCriteria`

原因是这些字段需要始终受质量闸门约束。

## 14.3 用户变更触发策略

1. 仅修改标题：
   - 不触发 regenerate
2. 修改约束：
   - 提示用户可选择全量 regenerate
3. 删除某关：
   - 立即保存草稿 revision
   - 同时标记“计划节奏已变化”
4. 拖拽顺序：
   - 立即保存草稿 revision
5. 单关重生成：
   - 只创建 `task_regenerate` run

---

## 15. 激活策略

激活策略保持不变，并作为本版硬约束：

1. draft 未确认前不改 active path
2. confirm 必须幂等
3. confirm 成功后归档旧 active path
4. confirm 物化为：
   - `learning_paths`
   - `path_steps`
   - `user_learning_paths`
   - `user_tasks`
5. 历史消息、旧路径、旧会话保留

新增要求：

1. confirm 时写入 `draft revision no`
2. `path_steps.metadata` 写入：
   - `source_refs`
   - `goal_alignment_refs`
   - `recommended_for_week_1`

---

## 16. 错误码与降级口径

建议新增或扩展错误码：

1. `MATERIAL_UNSUPPORTED_SOURCE`
2. `MATERIAL_LINK_INVALID_URL`
3. `MATERIAL_FETCH_FAILED`
4. `MATERIAL_EXTRACTION_PARTIAL`
5. `MATERIAL_INSUFFICIENT_CONTENT`
6. `MATERIAL_LOGIN_REQUIRED`
7. `PLAN_DRAFT_NOT_FOUND`
8. `PLAN_DRAFT_ALREADY_CONFIRMED`
9. `PLAN_DRAFT_PATCH_INVALID`
10. `PLAN_TASK_REGENERATE_IN_PROGRESS`
11. `AI_RESPONSE_INVALID`
12. `AI_PROVIDER_ERROR`

---

## 17. 安全、合规与风控

1. 只处理公开内容
2. 不抓取登录态页面
3. 不绕过平台访问限制
4. 不记录完整敏感原文到普通日志
5. 外部 URL 抓取必须补 SSRF 防护
6. 音频、图片、视频临时文件必须设置 TTL 清理

---

## 18. 实施阶段

## 18.1 Phase B1：异步 intake 与等待体验

目标：

1. 把链路切为异步
2. 前端有完整等待体验
3. 单链接异步 intake 可回到 `/learn` 恢复
4. 原有 HTML 图文来源迁移到异步链路后仍可用

交付物：

1. `POST /api/learning/plan-from-material` 异步化
2. `GET /api/learning/material-intakes/{id}`
3. intake 状态机
4. 工作台等待 UI

## 18.2 Phase B2：多模态摄取

目标：

1. HTML 图文来源与抖音 / 小红书 / B 站单链接 intake 打通
2. 视频字幕优先
3. 无字幕时走 ASR + OCR / vision

交付物：

1. 6 类来源 adapter
2. `learning_material_chunks`
3. 质量评分与 warnings

## 18.3 Phase B3：共创草稿

目标：

1. 草稿可编辑
2. 全量重生成
3. 单关局部重生成

交付物：

1. `PATCH /api/learning/plan-drafts/{id}`
2. `POST /api/learning/plan-drafts/{id}/tasks/{taskId}/regenerate`
3. `learning_plan_generation_runs`
4. `learning_plan_draft_revisions`

## 18.4 Phase B4：质量闸门与激活补强

目标：

1. 增加二层质量闸门
2. 降级为试点计划
3. confirm 时写入更多结构化 metadata

---

## 19. 验收标准（DoD）

## 19.1 功能验收

1. 用户可粘贴单条白名单 HTML 图文、抖音、小红书、B 站公开教程链接
2. 系统以异步方式生成草稿，不阻塞 UI
3. 用户可在确认前编辑草稿、删除任务、调整顺序
4. 用户可单关局部重生成
5. 用户确认后可进入正式学习链路

## 19.2 体验验收

1. 等待阶段有明确进度，不是单纯 spinner
2. 用户离开页面后可恢复任务状态
3. 生成成功、失败、部分成功三类状态都有清晰提示
4. 草稿 ready 后可直接进入可编辑视图

## 19.3 质量验收

1. 每关都有 evidence refs
2. 每关都有 acceptance criteria
3. 每份计划都有目标对齐表
4. 每份计划都有总时长预算和推荐起步子集
5. 质量闸门失败时不会直接放行低质量长计划

## 19.4 技术验收

1. OpenAPI 与 schema 同步更新
2. 单测、模块集成测试、route 测试补齐
3. 异步状态与审计链可回放
4. confirm 仍保持幂等

---

## 20. 代码落位建议

### 20.1 后端

1. `server/modules/learning-materials/`
   - `service.ts`
   - `queue.ts`
   - `status.ts`
   - `adapters/html/mdn.ts`
   - `adapters/html/nextjs.ts`
   - `adapters/html/webdev.ts`
   - `adapters/douyin.ts`
   - `adapters/xiaohongshu.ts`
   - `adapters/bilibili.ts`
   - `extractors/subtitle.ts`
   - `extractors/audio.ts`
   - `extractors/ocr.ts`
   - `extractors/vision.ts`
   - `normalizer.ts`
2. `server/modules/learning-plans/`
   - `service.ts`
   - `prompt.ts`
   - `schema.ts`
   - `quality-gate.ts`
   - `draft-patch.ts`
   - `task-regenerate.ts`
   - `activation.ts`

### 20.2 API

1. `app/api/learning/plan-from-material/route.ts`
2. `app/api/learning/material-intakes/[id]/route.ts`
3. `app/api/learning/plan-drafts/[id]/route.ts`
4. `app/api/learning/plan-drafts/[id]/regenerate/route.ts`
5. `app/api/learning/plan-drafts/[id]/tasks/[taskId]/regenerate/route.ts`
6. `app/api/learning/plan-drafts/[id]/confirm/route.ts`

### 20.3 前端

1. `features/learning/components/material-plan-dialog.tsx`
2. `features/learning/components/material-plan-panel.tsx`
3. 新增 `features/learning/components/material-plan-progress.tsx`
4. 新增 `features/learning/components/material-plan-workbench.tsx`
5. 新增 `features/learning/components/material-plan-alignment.tsx`

---

## 21. 跨文档同步要求

本方案推进时，必须同步更新：

1. `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`
2. `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`
3. `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`
4. `server/modules/api-docs/openapi.ts`
5. `server/modules/api-docs/schemas.ts`
6. 如迁移编号变化，同步更新 `docs/plans/README.md` 与 `AGENTS.md`

---

## 22. 冻结结论

本文冻结以下关键决策：

1. 本版只支持 **单链接**
2. 本版默认 **异步**
3. 支持来源为 **原有白名单 HTML 图文 + 抖音 / 小红书 / B 站**
4. 只处理 **公开内容**
5. planner 首稿不是最终答案，必须进入 **可校准草稿**
6. 草稿确认前允许：
   - 标题编辑
   - 顺序调整
   - 删除任务
   - 约束补充
   - 全量重生成
   - 单关重生成
7. 只有 `confirm` 后才替换当前自学路径
8. 质量闸门失败时，优先降级为 `3 关试点计划`，不放行低质量长计划

以上即为下一阶段实现、拆任务、补迁移与回写 OpenAPI 的唯一权威口径。
