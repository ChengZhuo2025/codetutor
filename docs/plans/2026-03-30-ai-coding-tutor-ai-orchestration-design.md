# AI编程学习教练 AI Orchestration 设计文档

> 文档类型：AI Orchestration 设计文档  
> 产品名称：AI编程学习教练  
> 版本：v1.1  
> 状态：持久性设计文档，后续需随实现持续同步  
> 创建日期：2026-03-30  
> 适用阶段：MVP 向可持续教学系统演进阶段  
> 关联文档：`docs/plans/2026-03-23-ai-coding-tutor-technical-architecture.md`、`docs/plans/2026-03-23-ai-coding-tutor-backend-structure-design.md`、`docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`、`docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`

---

## 1. 文档目标

本文档是 AI 编排能力的长期设计主文档，用于在后续开发、重构、交接和运营配置扩展时，持续说明这个模块的完整链路、设计边界、开发规范和实现方向。

本文档不是一次性讨论稿，也不是单次迭代说明。后续凡是涉及以下内容的真实代码变更，都应优先回写本文件：

- AI provider 接入
- 会话持久化
- 消息表结构
- agent 模板与绑定规则
- prompt 结构调整
- 模型参数策略
- 审计与调用日志
- 自由模式与平台预设模式的编排逻辑

本文档的作用是让任何后续接手这个模块的人，在不依赖口头上下文的情况下，也能快速理解：

- 当前真实代码应朝什么结构实现
- 为什么这样分层
- 哪些能力已经做了
- 哪些能力仍待落地
- 后续改动应遵守哪些边界

本文档主要回答以下问题：

1. 当前项目要如何接第三方大模型，而不是只做一个简单聊天接口。
2. 如何支持多供应商、多模型、多 agent 模板，而不把业务逻辑写死在某一家 SDK 上。
3. 如何同时支撑“自由模式”和“平台预设训练模式”。
4. 如何让不同工具、不同学习阶段、不同关卡使用不同教学 agent。
5. 在还没有管理后台前端时，后端和数据库应该先怎么设计。

---

## 1.1 文档定位与维护规则

本文档定位如下：

1. 这是 AI Orchestration 模块的持久性设计文档。
2. 这是后续数据库、API、服务层与配置层实现的上游约束文档之一。
3. 这不是单纯的头脑风暴记录，因此后续确认后的方案不应再散落到聊天记录中，而应回写到本文档。

维护规则：

1. 若真实代码与本文档不一致，应先确认是文档过期还是实现偏离。
2. 若确认实现是正确演进，应同步回写本文档中的“当前实现快照”与“推荐方案”。
3. 若确认实现是临时折中，应在本文档中显式记录技术债，而不是默认忽略。
4. 后续如新增专门的 AI provider、prompt、agent 或消息存储文档，应以本文档为总入口，不应造成重复主文档。

---

## 1.2 当前代码实现状态快照

截至 2026-04-06，当前仓库与 AI 编排直接相关的真实情况如下：

- 已有学习消息入口：`POST /api/learning/message`
- 已有学习会话恢复入口：`GET /api/learning/current-session`
- 已有学习历史消息分页入口：`GET /api/learning/messages`
- 已落地 `conversation_sessions`、`conversation_messages`
- 已落地 `ai_providers`、`ai_models`、`agent_templates`、`agent_bindings`、`skill_packs`、`agent_skill_bindings`、`llm_invocations`
- `POST /api/learning/message` 已切到真实编排链路：会话创建/复用、消息持久化、agent 解析、skill 上下文装配、provider 调用、调用审计写入
- 当前首版 provider 调用已同时支持非流式 JSON 与 `text/event-stream` SSE
- 当前 assistant 消息已显式返回并持久化 `structuredContent`，其中包含 `interactionType / variant / summary / blocks / sections / actions`
- 当前 prompt 已加入 agent 原生 Markdown 输出契约，要求模型按固定二级标题与 `动作文案｜点击后发送的话` 格式返回
- 当前前端 `/learn` 已提升到 `interactionType` 级别展示驱动，再按 `variant` 做次级细分
- agent / provider / model / skill binding 解析已补进程内配置快照缓存，后台写入 Provider / Model / Agent / Binding / Skill 后会主动失效对应缓存组；不会缓存解密后的明文 Provider 密钥
- `POST /api/learning/message` 已补第一阶段运行时保护：按用户限流、并发会话保护、请求级观测头与结构化请求摘要日志
- 当前学习消息链路已覆盖 logic / HTTP / output-format 测试，以及真实 provider / database 参与的 live JSON、live SSE 集成测试
- 当前 provider 密钥主路径已改为“管理后台录入 -> 服务端加密 -> 数据库存储 -> 运行时解密”；若数据库密钥缺失，则仍可通过 `envSecretRef` 回退读取环境变量；若两者都不存在会返回 `AI_PROVIDER_ERROR`
- 当前仓库已经具备适合承载该能力的基础设施：`app/api`、`server/modules`、Supabase Auth、Database、Storage、远程迁移执行脚本
- **学习对话多模态附件与播读**：`/learn` 已支持图片和语音附件。前端先调用 `POST /api/learning/attachments` 上传到私有 Storage，再在 `POST /api/learning/message` 传 `attachmentIds`；服务端验证归属后做 deterministic media preprocessing，图片转译和语音转文本模型由后台 `media_transcription_settings` 配置决定，处理结果写回 `learning_message_attachments` 并注入教学上下文。AI 回复消息底部支持按需播读，`POST /api/learning/message-speech` 调用后台 `text_to_speech` 配置并返回临时音频，首版不持久化音频。
- **教程链接生成学习计划（Phase A/B）**：已落地专用接口 `POST /api/learning/plan-from-material`（及草稿 `confirm` / `regenerate`），计划生成使用 `agent_templates.code = self-study-material-planner` 与 `invokeAIProvider` 非流式 JSON，不经过 `POST /api/learning/message` 主消息编排；intake worker 现已按 `raw text -> subtitle -> ASR -> OCR/vision` 顺序做多模态证据摄取，并通过独立 quality gate 做规则校验；仅在弱证据、长计划、缺少时长估算或时长压力较高时才触发轻量化模型自检，自检超时只记入 `selfCheck.reason`，不再污染用户可见 warning
- **后台自学路径模板生成**：已落地 `agent_templates.code = self-study-template-planner`，仅供 `/admin/learning/templates` 编辑器调用；它使用 `invokeAIProvider` 非流式 JSON 生成模板草稿，不接入用户侧 `/learn` 对话，不直接写入 `learning_paths` / `path_steps`，管理员应用并保存后才发布。
- 当前仍未引入 Redis / 消息队列；上述缓存、限流与观测增强均为单实例进程内实现，属于第一阶段运行时加固而非分布式基础设施

因此，本文档既是后续扩展规范，也是当前首版真实实现的权威快照

---

## 2. 当前确认的设计决策

### 2.1 本项目不应只实现“简单 AI 对话”

本项目的 AI 核心不是普通聊天，而是“教学编排系统”。

服务端运行时至少需要同时理解以下上下文：

- 当前用户是谁
- 当前是否处于自由模式或平台预设模式
- 当前工具是什么，例如 Cursor、Claude Code、Codex
- 当前学习等级是什么
- 当前正在进行哪一条学习路径
- 当前是哪一关、哪一个教学阶段
- 当前交互属于正常提问、卡住求助、完成复盘还是下一步推荐

因此后端不应把 `POST /api/learning/message` 直接实现为“前端发一句，模型回一句”的薄包装，而应实现为：

`用户输入 -> 解析当前学习场景 -> 选中合适 agent -> 选中合适模型 -> 组装提示词与上下文 -> 调用 provider -> 记录输入输出与调用审计 -> 返回教学结果`

### 2.2 Provider 抽象层为必选项，不允许直接绑定单家模型 SDK

从第一版开始，AI 接入固定分成两层：

1. Provider 层
  负责接不同模型供应商，如百炼、OpenAI-compatible、Anthropic、Gemini。
2. Agent 层
  负责定义当前教学角色、提示词结构、上下文规则、适用场景和默认模型。

这样可以做到：

- 后续换模型供应商时，不需要重写教学逻辑
- 后续增加不同 agent 时，不需要重写 provider 调用层
- 后续做管理后台时，只是给已有配置和模板做可视化编辑

### 2.3 核心 AI 编排固定放在当前项目后端，不下沉到 Supabase Edge Functions

当前仓库已经有：

- `app/api`
- `server/modules`
- Supabase Auth / Database / Storage

因此当前确认采用：

- 继续在当前项目的 `app/api + server/modules` 中实现 AI orchestration
- Supabase 继续承担 Auth、DB、Storage、Secrets、可选 Edge Functions
- 第一阶段不把核心 AI 业务编排迁到 Supabase Edge Functions

原因：

- 当前最难的是教学状态机和 agent 选择，不是函数托管位置
- 当前项目已有稳定 BFF 结构，更适合先做领域规则闭环
- 后续若确实需要更强隔离、异步任务、回调或单独扩容，再考虑把 provider execution 下沉到 Edge Functions

### 2.4 首期能力增强机制固定采用 Skills，不以 MCP 或知识库为主路径

当前确认：

1. 首期 agent 能力增强主路径为 `skills`
2. `skills` 是本项目内部的产品能力包机制，不依赖某一款 IDE 或某一个模型平台的私有 runtime
3. 首期不把 MCP 作为主增强机制
4. 首期不把知识库 / RAG 作为主增强机制

原因：

- 你当前的核心场景是“不同工具的安装、配置、命令习惯、常见错误、阶段性教学策略”
- 这类知识更适合通过版本化文档、结构化资源、可审核脚本和模板资源来承载
- `skills` 可直接与不同工具、不同路径、不同 agent 绑定，维护成本更低，也更符合教学产品的可控性要求

这并不代表后续永远不用 MCP 或知识库，而是明确：

- `skills` 是首期主路径
- MCP / RAG 如后续引入，也只能作为补充层，而不是替代当前技能包机制

### 2.5 首期实现范围固定为“单 Provider + 真实流式 + 可扩展抽象”

当前确认：

1. 第一阶段只实际接入一个 provider
2. Provider 抽象必须按多 provider 可扩展方式设计
3. 第一阶段优先接入硅基流动
4. 第一阶段采用真实流式响应
5. 前端展示采用节奏化分块渲染，而不是逐 token 直接抖动显示

原因：

- 当前最重要的是先把会话、消息、agent、skills、provider 抽象跑通
- 硅基流动可以作为单一 provider 接入多种模型，适合作为首阶段统一模型接入层
- 真实流式更符合学习教练场景，也便于后续过渡到更自然的交互体验
- 前端分块渲染可以避免原始流式 chunk 过碎导致的阅读抖动

---

## 3. 平台能力边界判断

## 3.1 阿里云 Supabase 当前可提供的基础能力

根据当前官方能力，可确认以下几点：

- 提供 PostgreSQL 数据库，可存会话、消息、agent 配置和调用审计
- 提供 Auth，可支撑用户登录态与用户隔离
- 提供 Storage，可存消息附件、代码截图、上传资源
- 提供 Edge Functions，可执行服务端函数逻辑
- 提供 Secrets 管理，可保存第三方模型 API Key

这意味着：

- 阿里云 Supabase 可以“承载”第三方模型接入
- 但它不直接等于“完整多模型 Agent 编排平台”

## 3.2 本项目仍需要自行实现的能力

以下能力需要由本项目服务端自行实现：

- Provider 适配层
- Agent 模板与绑定规则
- Prompt 版本管理
- 会话持久化
- 上下文裁剪规则
- 模型参数策略
- 任务上下文拼装
- 调用审计与错误归一化
- 不同学习模式和不同关卡的 agent 解析机制

---

## 4. 设计目标

本方案建议同时满足以下目标：

1. 先支持一条可用主链路，但结构上能自然扩展到多模型、多 agent。
2. 支持自由模式与预设训练模式共存。
3. 支持不同工具、不同阶段、不同交互类型命中不同 agent。
4. 所有教学对话要可审计、可回放、可补救、可后续运营分析。
5. 管理后台前端可以后置，但底层配置模型不能先写死。

---

## 5. 范围界定

## 5.1 本文档包含

- AI 编排模块边界
- 建议数据库表
- 建议 API 形态
- Agent 选择机制
- 上下文组装机制
- 运行时调用流程
- 分阶段落地建议

## 5.2 本文档暂不展开

- 具体某一家模型供应商的最终采购与商务选择
- 管理后台前端页面设计
- Prompt 逐条文案内容
- 复杂工具调用体系，如代码执行沙箱、外部插件市场
- 复杂多 agent 并行协作
- 以 MCP 或知识库为中心的增强架构

---

## 6. 核心架构

当前确认将 AI 编排固定分成七层。

### 6.1 API Layer

当前确认入口仍放在：

- `POST /api/learning/message`
- `GET /api/learning/current-session`
- `GET /api/learning/messages`
- 后续可补 `GET /api/learning/session/{id}`

职责：

- 认证
- 参数解析
- 调用 application service
- 统一返回格式

### 6.2 Session Layer

职责：

- 维护会话主记录
- 维护消息持久化
- 维护与 `user_learning_paths`、`user_tasks` 的关联
- 恢复上下文

这一层回答的问题是：

- 当前用户正在和哪个教学会话对话
- 当前会话属于哪条路径、哪一关、哪种学习模式
- 这一轮对话的历史要带几条

### 6.3 Agent Resolution Layer

职责：

- 按当前场景选择最合适的 agent 模板

至少要考虑以下维度：

- `selection_mode`
- `tool_code`
- `learning_level`
- `path_code`
- `step_no` 或 `step_code`
- `interaction_type`

这一层是整个系统最核心的业务层。

### 6.4 Skill Capability Layer

职责：

- 加载本地 skill 包
- 解析 skill manifest、资源文档、提示片段、脚本声明
- 根据当前工具、路径、阶段、交互类型选择要挂载的 skill
- 为 Prompt Assembly Layer 输出结构化技能上下文

这一层回答的问题是：

- 当前 agent 除了基础提示词外，还能额外获得哪些工具知识
- 当前关卡需要附带哪些安装说明、命令示例、错误排查文档
- 当前是否要启用某个经过审核的脚本能力

### 6.5 Prompt Assembly Layer

职责：

- 组装 system prompt
- 拼接任务上下文
- 拼接用户输入
- 选择历史消息条数
- 处理最大 token 与上下文裁剪
- 融合 skills 输出的结构化资源上下文

### 6.6 Provider Layer

职责：

- 适配不同模型供应商
- 归一化输入输出
- 处理重试、超时、错误码
- 记录 token usage 与 latency

### 6.7 Audit Layer

职责：

- 记录每次模型调用
- 记录 provider、model、token、耗时、错误
- 便于后期分析成本、稳定性和效果

---

## 7. Provider 层设计

## 7.1 Provider 不直接承载教学规则

Provider 层只应处理：

- `provider code`
- `model id`
- 鉴权
- 请求格式映射
- 响应格式映射
- stream / non-stream
- usage 提取

不要在 Provider 层写：

- 针对 Cursor 初学者的教学规则
- 某条学习路径的教学风格
- 某关卡的复盘策略

这些都应在 Agent 层完成。

## 7.2 当前确认的 Provider 抽象

建议统一定义一个内部接口，例如：

```ts
type ChatGenerationInput = {
  model: string
  systemPrompt: string
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
  maxTokens: number
  temperature: number
  topP?: number
  responseFormat?: "text" | "json"
  stream?: boolean
}
```

```ts
type ChatGenerationResult = {
  content: string
  finishReason: string | null
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  } | null
  rawProviderResponse?: unknown
}
```

然后针对不同供应商实现不同 adapter：

- `siliconflow-provider.ts`
- `openai-compatible-provider.ts`
- `anthropic-provider.ts`

第一阶段只实际实现一个 provider adapter，但接口形状必须先统一。

## 7.3 第一阶段 Provider 决策

当前确认：

- 第一阶段 provider：硅基流动
- 后续兼容方向：OpenAI-compatible provider adapter
- provider 密钥存放位置：`ai_providers` 表中的密文字段为主，服务端环境变量 `AI_PROVIDER_SECRET_ENCRYPTION_KEY` 为加密主密钥，`envSecretRef` 为兼容回退引用
- provider 调用位置：当前项目服务端，不放前端
- provider 调用模式：真实流式

## 7.4 首期输出模式决策

当前确认：

1. 后端对模型调用采用真实流式输出
2. 服务端 SSE 直接转发 provider 增量文本，不做服务端节奏化缓冲
3. 前端按浏览器动画帧合并同一帧内到达的 provider delta，避免逐 token 高频重渲染，也不再额外按固定时间窗口或固定字数切片
4. Provider 流式超时语义为 idle timeout：首包前和每次收到上游数据后都会重置超时；只要上游持续返回增量，不因总生成时间超过 `timeout_ms` 被强制中断
5. 最终目标体验是“随 provider 增量自然推进”，避免机械抖动和人为卡顿

这样做的原因：

- 用户看到的是连续递增生成，而不是等整段返回
- 渲染层仍有可控节奏，不会因为 provider chunk 太碎而影响阅读
- 底层仍保留真实流式能力，后续也方便接语音、停止生成、继续生成等能力

## 7.5 SiliconFlow 首批模型白名单决策

截至 2026-03-30，结合 SiliconFlow 官方 API 文档、功能文档与更新公告，第一阶段固定采用“少量稳定白名单”策略，不做“模型广场全量开放”。

首批生产白名单固定为：

1. `Pro/deepseek-ai/DeepSeek-V3.2`
2. `Pro/zai-org/GLM-5`

首批人工测试白名单固定为：

1. `Pro/deepseek-ai/DeepSeek-R1`

当前明确不进入第一阶段主白名单的模型包括：

1. 已被官方明确要求迁移的旧模型别名  
   例如 `deepseek-ai/DeepSeek-V3.1`、`Pro/deepseek-ai/DeepSeek-V3.1` 已被官方要求迁移，不再作为当前首批方案基线。
2. 已被官方公告下线或即将下线的模型  
   例如 `Qwen/Qwen2.5-Coder-7B-Instruct` 与 `Pro/Qwen/Qwen2.5-Coder-7B-Instruct` 已在 2026-03-10 官方公告中列入 2026-03-17 下线名单。
3. 当前业务首期没有必要接入、但变化频率较高的模型  
   第一阶段不为了“模型多”而增加编排复杂度。

当前确认的选型理由：

1. `Pro/deepseek-ai/DeepSeek-V3.2` 与 `Pro/zai-org/GLM-5` 都已在 SiliconFlow 官方 `chat/completions` 支持模型列表中出现，可作为当前正式可用模型名。
2. `DeepSeek-V3.2` 是官方当前已公开的较新 DeepSeek 主力模型版本，优先于旧 `V3.1 Terminus`。
3. `GLM-5` 适合作为第二条生产模型主线，用于长解释、总结与较强中文表达场景。
4. 第一阶段优先使用 `Pro/` 版本，原因不是“效果一定更强”，而是产品主链路更需要稳定限速、清晰计费和更可控的生产配额。

## 7.6 首批 Model Profile 固定方案

第一阶段不把模型选择做成前台可选项，而是由服务端按固定 profile 选择。

### `sf-balanced-default`

- 模型：`Pro/deepseek-ai/DeepSeek-V3.2`
- 用途：默认教学、路径引导、常规解释、自由模式的一般问答
- 适用场景：`teaching`、`path_guidance`
- 默认参数：
  - `stream=true`
  - `max_tokens=2200`
  - `temperature=0.30`
  - `top_p=0.85`
  - `response_format=text`
- 设计意图：
  - 作为全站默认主力模型
  - 优先覆盖大多数学习对话，而不是只优化极端推理场景

### `sf-code-workflow`

- 模型：`Pro/deepseek-ai/DeepSeek-V3.2`
- 用途：代码工作流、CLI 工具教学、调试与交付复盘
- 适用场景：
  - `claude-code-*`
  - `codex-*`
  - `opencode-*`
  - 以及 `cli-blocked-helper`、`cli-task-reviewer`
- 默认参数：
  - `stream=true`
  - `max_tokens=2600`
  - `temperature=0.20`
  - `top_p=0.80`
  - `response_format=text`
- 设计意图：
  - 作为代码与 CLI 教学场景的专用主模型
  - 优先保证代码解释、任务拆解、调试分析和验收建议的稳定性

### `sf-longform-coach`

- 模型：`Pro/zai-org/GLM-5`
- 用途：长解释、复盘总结、学习反馈、相对展开的中文教学表达
- 适用场景：
  - `completion_feedback`
  - 部分 `task_review`
  - 需要较强中文长文本组织能力的总结型回复
- 默认参数：
  - `stream=true`
  - `max_tokens=2800`
  - `temperature=0.40`
  - `top_p=0.90`
  - `response_format=text`
- 设计意图：
  - 不作为站内默认主力模型
  - 主要承担“讲清楚、讲完整、讲顺畅”的总结型输出

### `sf-reasoning-lab`

- 模型：`Pro/deepseek-ai/DeepSeek-R1`
- 用途：后台手工测试、复杂推理实验、少量高难度复盘验证
- 第一阶段状态：仅允许后台测试，不允许自动进入生产主链路
- 默认参数：
  - `stream=true`
  - `max_tokens=3000`
  - `temperature=0.60`
  - `top_p=0.95`
  - `thinking_budget=2048`
- 设计意图：
  - 保留高推理能力实验入口
  - 不让其在首期破坏统一 prompt 结构和稳定性

## 7.7 DeepSeek-R1 在第一阶段不进入自动主链路

当前确认：

1. `DeepSeek-R1` 第一阶段只进入后台测试，不进入自动 agent 路由。
2. 原因不是模型能力不足，而是它与当前固定 Prompt 架构存在冲突。

冲突点如下：

1. SiliconFlow 官方推理模型文档对 `DeepSeek-R1` 的使用建议中明确提出“避免添加系统提示，所有指令应包含在用户提示中”。
2. 本项目当前固定采用“五段式 Prompt 组装”，其中包含平台系统规则、agent 系统模板、developer prompt 与 skill 上下文。
3. 若在第一阶段直接让 `R1` 承担主链路，会导致：
   - prompt 结构需要为它单独分叉
   - agent 模板体系出现一套“R1 特例”
   - 历史上下文裁剪和 `reasoning_content` 处理复杂度显著上升

因此第一阶段明确采用：

1. 主生产链路不用 `R1`
2. `R1` 只保留在后台测试、AB 对比或人工评估使用
3. 若第二阶段确实需要把 `R1` 正式接入，必须先新增“reasoning-model prompt mode”，把其提示词拼装规则单独建模

## 7.8 首批 Agent 与 Model Profile 绑定规则

第一阶段固定按以下规则绑定，不允许在运行时自由漂移：

| agent / 场景 | 默认 profile | 说明 |
|--------------|--------------|------|
| `cursor-buddy`、`cursor-self-study-coach`、`trae-self-study-coach`、`windsurf-self-study-coach` | `sf-balanced-default` | 图形化 IDE 场景先统一使用默认主力模型 |
| `claude-code-coach`、`claude-debug-coach`、`claude-shipping-coach` | `sf-code-workflow` | Claude Code 路径固定走代码工作流模型 |
| `codex-cli-coach`、`codex-debug-coach`、`codex-shipping-coach` | `sf-code-workflow` | Codex 路径固定走代码工作流模型 |
| `opencode-coach`、`opencode-self-study-coach` | `sf-code-workflow` | OpenCode 先与其他 CLI 工具共用 |
| `stitch-buddy`、`bolt-buddy`、`lovable-buddy` | `sf-balanced-default` | 在线工具场景首期不单独拆模型 |
| `ide-blocked-helper`、`web-builder-blocked-helper` | `sf-balanced-default` | 通用卡点排查先用默认主力模型 |
| `cli-blocked-helper`、`cli-task-reviewer` | `sf-code-workflow` | CLI 卡点排查与复盘走代码工作流模型 |
| `learning-completion-coach` | `sf-longform-coach` | 完成反馈、复盘总结默认走长文本讲解模型 |
| 后台 `agent test` / 人工评估 | `sf-reasoning-lab` 可选 | 仅后台手工切换，不进入生产自动路由 |

---

## 8. Skill 能力层设计

## 8.1 Skill 在本项目中的正式定义

本项目中的 `skill` 指的是“可绑定给 agent 的教学能力包”。

它不是单纯 prompt，也不是一段零散文档，而是一个可版本化、可审核、可组合的能力单元。一个 skill 可以包含：

- 教学说明文档
- 工具安装文档
- 常见错误排查文档
- 命令模板
- 结构化提示片段
- 可选脚本声明
- 资源元数据

## 8.2 Skill 的目标

Skill 层用于解决以下问题：

1. 不同工具的专有知识如何稳定复用
2. 不同 agent 如何共享同一套工具知识而不重复写 prompt
3. 平台预设课程的阶段性知识如何沉淀
4. 后续接入自建或下载的技能包时，如何做到可审计、可控、可扩展

## 8.3 Skill 采用“文件系统为主、数据库绑定为辅”的混合模式

当前确认：

1. Skill 的内容资源以仓库本地文件系统为主
2. Skill 的启用状态、绑定关系、优先级等元信息放数据库
3. 文件系统是内容真源
4. 数据库是运行时绑定真源

原因：

- Skill 文档、脚本、模板更适合跟随代码版本管理
- 数据库更适合做运行时选择、灰度控制和启停
- 这样既能下载现成 skill 包，也能做内部自建 skill 包

## 8.4 Skill 包目录结构确认

当前确认 skill 包目录结构如下：

```text
ai/skills/
└── <skill_code>/
    ├── manifest.json
    ├── SKILL.md
    ├── resources/
    │   ├── *.md
    │   ├── *.json
    │   └── *.txt
    ├── prompts/
    │   └── *.md
    ├── snippets/
    │   └── *.md
    └── scripts/
        └── *.ts
```

字段含义：

- `manifest.json`
  - skill 基本元数据、适用工具、适用场景、版本、入口资源、脚本声明
- `SKILL.md`
  - 人类可读说明文档
- `resources/`
  - 工具知识、安装说明、排查文档、阶段资料
- `prompts/`
  - 可复用提示片段
- `snippets/`
  - 命令片段、示例输入输出、模板文本
- `scripts/`
  - 经过项目审核后可供服务端调用的脚本

## 8.5 Skill 的运行规则确认

当前确认：

1. 模型不能直接任意执行 skill 目录中的脚本
2. skill 脚本只能由服务端显式注册和白名单调用
3. 下载的外部 skill 包默认不可直接执行脚本
4. 外部 skill 包进入仓库前必须经过人工审核
5. 第一阶段 skill 的主要用途是“资源注入”和“结构化提示增强”
6. 脚本能力属于可选增强，不作为首期主能力

这条规则非常重要，用于避免把“下载 skill”变成“下载任意可执行代码”。

## 8.6 Skill 与 Agent 的关系确认

当前确认：

- Provider 负责“调用模型”
- Agent 负责“定义教学行为”
- Skill 负责“增强 agent 的工具能力与领域知识”

也就是说：

- Agent 决定当前该怎么教
- Skill 决定当前能掌握哪些工具资料和辅助资源

一个 agent 可以绑定多个 skill。

例如：

- `claude_code_platform_stage_1_tutor`
  - 绑定 `claude_code_install_skill`
  - 绑定 `claude_code_cli_basics_skill`
  - 绑定 `macos_terminal_common_issues_skill`

## 8.7 Skill 首期适用范围确认

第一阶段优先做以下类型的 skill：

1. 工具安装类
2. 工具基础命令类
3. 常见错误排查类
4. 平台预设阶段资料类
5. 复盘模板类

第一阶段不做：

1. 可联网抓取型 skill
2. 自动执行复杂系统命令型 skill
3. 多步外部 API 编排型 skill

## 8.8 Skill 脚本白名单首期决策

为避免 skill 机制演变成“任意脚本执行入口”，第一阶段固定只允许以下四类脚本能力进入白名单：

1. 本地资源读取与结构化提取  
   仅允许读取 skill 包目录内的 `md`、`txt`、`json`、`yaml`、`yml` 等静态资源，并转为结构化上下文。
2. 用户输入材料整理  
   仅允许把用户贴入的教程片段、链接摘要、代码片段、终端输出整理成标准化教学上下文。
3. 错误日志与终端输出提炼  
   仅允许对“已经提供给服务端的文本内容”做关键词提取、报错归类、检查清单生成，不允许主动执行 shell 命令。
4. 模板与检查单生成  
   仅允许根据内置模板生成复盘表、调试检查单、交付验收清单等结构化产物。

第一阶段明确禁止：

1. 任意 shell 执行
2. 任意 git 命令执行
3. 任意网络访问
4. 任意包安装
5. 任意文件删除、覆盖或批量写入

因此，第一阶段的 skill 脚本能力定位很明确：

- 可以“整理与增强上下文”
- 不可以“替用户执行系统动作”

---

## 9. Agent 层设计

---

## 9.1 Agent 不是单纯“系统提示词”

一个 agent 至少应包含以下配置：

- `agent_code`
- `name`
- `scenario_type`
- `system_prompt_template`
- `developer_prompt_template`
- `default_provider_code`
- `default_model_code`
- `context_message_limit`
- `max_output_tokens`
- `temperature`
- `top_p`
- `is_active`
- `version`

也就是说，一个 agent 是“教学行为模板”，而不是一段孤立 prompt。

## 9.2 当前确认支持的场景类型

第一阶段固定抽象以下场景：

- `teaching`
- `blocked_help`
- `task_review`
- `completion_feedback`
- `path_guidance`

不同场景可绑定不同 agent。

## 9.3 自由模式与预设训练模式的差异

### 自由模式

更强调：

- 用户自主输入问题
- agent 更像一个通用学习教练
- 上下文更多依赖当前工具和用户等级

### 平台预设训练模式

更强调：

- 平台预定义路径和关卡
- 每一关有明确目标、完成标准、复盘摘要
- agent 需要更强约束，不应偏离当前教学目标

当前确认：

- 自由模式使用较少的 agent 模板
- 平台预设训练模式按路径或阶段拆更细的 agent 模板

---

## 10. Agent 绑定规则

## 10.1 为什么需要绑定表

如果把 agent 选择逻辑硬编码在 `if/else` 里，后面会迅速失控。

例如：

- Cursor 新手第一阶段
- Cursor 中级调试阶段
- Claude Code 平台学习模式第一阶段
- Codex CLI 卡住求助模式

这类映射必须可配置，否则后续改一个路径就得改代码。

## 10.2 当前确认的绑定优先级

固定按“最具体优先”匹配：

1. `tool + selection_mode + path_code + step_no + interaction_type`
2. `tool + selection_mode + path_code + interaction_type`
3. `tool + learning_level + interaction_type`
4. `selection_mode + interaction_type`
5. `interaction_type` 默认兜底

这样既能做精细控制，也能保留通用兜底模板。

## 10.3 示例

例如：

- `cursor + preset_training + cursor-quickstart + step_1 + teaching`
  - 命中 `cursor-buddy`
- `codex + preset_training + path-codex-intermediate-workflow-boost + step_2 + blocked_help`
  - 命中 `cli-blocked-helper`
- `claude-code + self_directed + path-claude-code-intermediate-self-study + blocked_help`
  - 命中 `cli-blocked-helper`
- 若都未命中
  - 回退到 `generic_tutor`

## 10.4 首批主教学 Agent 命中表

第一阶段首批主教学 agent 固定以“真实 path code + selection mode”为基础命中，不再写抽象占位名。

| 模式 | path code | 工具 | 默认主教学 agent |
|------|-----------|------|------------------|
| `preset_training` | `cursor-quickstart` | `cursor` | `cursor-buddy` |
| `self_directed` | `path-cursor-beginner-self-study` | `cursor` | `cursor-self-study-coach` |
| `self_directed` | `path-trae-beginner-self-study` | `trae` | `trae-self-study-coach` |
| `self_directed` | `path-windsurf-intermediate-self-study` | `windsurf` | `windsurf-self-study-coach` |
| `preset_training` | `path-claude-code-intermediate-workflow-boost` | `claude-code` | `claude-code-coach` |
| `preset_training` | `path-claude-code-intermediate-debug-lab` | `claude-code` | `claude-debug-coach` |
| `preset_training` | `path-claude-code-intermediate-feature-shipping` | `claude-code` | `claude-shipping-coach` |
| `self_directed` | `path-claude-code-intermediate-self-study` | `claude-code` | `claude-code-self-study-coach` |
| `preset_training` | `path-codex-intermediate-workflow-boost` | `codex` | `codex-cli-coach` |
| `preset_training` | `path-codex-intermediate-debug-lab` | `codex` | `codex-debug-coach` |
| `preset_training` | `path-codex-intermediate-feature-shipping` | `codex` | `codex-shipping-coach` |
| `self_directed` | `path-codex-intermediate-self-study` | `codex` | `codex-self-study-coach` |
| `preset_training` | `path-opencode-intermediate-workflow-boost` | `opencode` | `opencode-coach` |
| `self_directed` | `path-opencode-intermediate-self-study` | `opencode` | `opencode-self-study-coach` |
| `preset_training` | `path-stitch-beginner-quickstart` | `stitch` | `stitch-buddy` |
| `self_directed` | `path-stitch-beginner-self-study` | `stitch` | `stitch-self-study-coach` |
| `preset_training` | `path-bolt-beginner-quickstart` | `bolt` | `bolt-buddy` |
| `self_directed` | `path-bolt-beginner-self-study` | `bolt` | `bolt-self-study-coach` |
| `preset_training` | `path-lovable-beginner-quickstart` | `lovable` | `lovable-buddy` |
| `self_directed` | `path-lovable-beginner-self-study` | `lovable` | `lovable-self-study-coach` |

实现规则固定如下：

1. 若 `learning_paths.agent_code` 有值，`teaching` 与 `path_guidance` 默认直接命中该值。
2. 若 `learning_paths.agent_code` 为空，按上表命中该工具的 self-study agent。
3. 第一阶段不按 `step_no` 再拆独立 agent，step 差异通过结构化任务上下文和 skill 绑定表达。
4. 自动意图推断中，“下一步 / 继续当前任务 / 下一项练习 / 先做什么”等当前任务推进语义必须归入 `path_guidance`，避免误落到全局 `concept_qa`。

## 10.5 首批辅助场景 Agent 命中表

第一阶段不把所有辅助场景细拆到每条路径，而是固定采用“主教学 agent + 工具族辅助 agent”的两层结构。

| interaction_type | 工具范围 | 命中 agent | 说明 |
|------------------|----------|------------|------|
| `teaching` | 全部 | 对应主教学 agent | 当前步骤教学、解释、带练 |
| `path_guidance` | 全部 | 对应主教学 agent | 告知当前该做什么、为什么先做这一步 |
| `blocked_help` | `cursor`、`trae`、`windsurf` | `ide-blocked-helper` | 图形化 IDE 卡点排查 |
| `blocked_help` | `claude-code`、`codex`、`opencode` | `cli-blocked-helper` | CLI 工具卡点排查 |
| `blocked_help` | `stitch`、`bolt`、`lovable` | `web-builder-blocked-helper` | 在线工具卡点排查 |
| `task_review` | `cursor`、`trae`、`windsurf` | `ide-task-reviewer` | 代码/结果回看、指出下一轮修正重点 |
| `task_review` | `claude-code`、`codex`、`opencode` | `cli-task-reviewer` | CLI 输出、diff、验证动作回看 |
| `task_review` | `stitch`、`bolt`、`lovable` | `web-builder-task-reviewer` | 页面生成结果、可视化迭代回看 |
| `completion_feedback` | 全部 | `learning-completion-coach` | 通用完成反馈、成长鼓励、下一步建议 |
| `concept_qa` | 全部 | `learning-concept-qa-coach` | 明确概念问答、自由咨询和偏题问题的轻量回应 |

当前确认：

1. `blocked_help` 第一阶段不按每个工具再细拆，而是按工具族拆成 `ide / cli / web-builder` 三类。
2. Claude Code 与 Codex 虽然是当前重点工具，但第一阶段仍先落在 `cli-blocked-helper` 这条统一链路上。
3. 若后续发现 Claude Code 与 Codex 的卡点明显分化，再单独拆出 `claude-code-blocked-helper` 与 `codex-blocked-helper`。

## 10.6 首批 Skill Binding 规则表

第一阶段 `skill_packs.code` 固定按“工具/场景/能力”命名，并按下表绑定。

| agent 或 agent 组 | 首批绑定 skill packs | 绑定目的 |
|-------------------|----------------------|----------|
| `cursor-buddy` | `cursor-install-setup-skill`、`cursor-ask-vs-agent-skill`、`cursor-debug-basics-skill`、`general-learning-reflection-skill` | 覆盖 Cursor 起步营 6 个关卡里的安装、提问、Agent 分工、调试、复盘 |
| `cursor-self-study-coach`、`trae-self-study-coach`、`windsurf-self-study-coach` | `learning-material-intake-skill`、`ide-context-organization-skill`、`general-learning-reflection-skill` | 支撑图形化 IDE 自学模式的材料整理、最小步拆解与复盘 |
| `claude-code-coach` | `claude-code-workspace-basics-skill`、`task-slicing-skill`、`cli-verification-basics-skill` | 对应工作区准备、任务拆解、CLI 验证 |
| `claude-debug-coach`、`codex-debug-coach` | `debug-hypothesis-checklist-skill`、`error-context-format-skill`、`cli-retest-checklist-skill` | 对应调试训练营里的“复现问题、形成假设、复测闭环” |
| `claude-shipping-coach`、`codex-shipping-coach` | `feature-slicing-skill`、`implementation-plan-skill`、`acceptance-checklist-skill` | 对应功能交付路径里的切片、实现顺序、联调验收 |
| `codex-cli-coach` | `codex-cli-basics-skill`、`prompt-compaction-skill`、`cli-verification-basics-skill` | 对应 Codex CLI 的短提示、范围控制与验证动作 |
| `claude-code-self-study-coach`、`codex-self-study-coach`、`opencode-self-study-coach` | `learning-material-intake-skill`、`cli-context-organization-skill`、`general-learning-reflection-skill` | 支撑 CLI 工具的自学模式 |
| `opencode-coach` | `opencode-context-basics-skill`、`multi-language-context-skill`、`cli-verification-basics-skill` | 支撑开源 CLI 工作流与多语言上下文组织 |
| `stitch-buddy`、`bolt-buddy`、`lovable-buddy` | `prompt-to-ui-basics-skill`、`web-iteration-checklist-skill`、`visual-acceptance-check-skill` | 支撑在线工具的从描述到页面结果的最小闭环 |
| `stitch-self-study-coach`、`bolt-self-study-coach`、`lovable-self-study-coach` | `learning-material-intake-skill`、`prompt-to-ui-basics-skill`、`general-learning-reflection-skill` | 支撑在线工具自学模式的材料整理与页面迭代 |
| `ide-blocked-helper` | `ide-debug-intake-skill`、`error-context-format-skill`、`verification-next-step-skill` | 统一处理 IDE 类工具的卡住求助 |
| `cli-blocked-helper` | `cli-debug-intake-skill`、`error-context-format-skill`、`cli-retest-checklist-skill` | 统一处理 CLI 类工具的卡住求助 |
| `web-builder-blocked-helper` | `web-builder-debug-intake-skill`、`ui-diff-review-skill`、`verification-next-step-skill` | 统一处理在线页面生成类工具的卡住求助 |
| `ide-task-reviewer`、`cli-task-reviewer`、`web-builder-task-reviewer` | `review-checklist-skill`、`next-step-guidance-skill` | 统一处理任务回看与下一步建议 |
| `learning-completion-coach` | `completion-summary-skill`、`rank-progress-feedback-skill`、`next-step-guidance-skill` | 统一处理完成反馈、成长感知与下一步建议 |

绑定规则固定如下：

1. 一个 agent 至少绑定 1 个 skill，最多首期建议绑定 4 个 skill。
2. `learning-material-intake-skill`、`general-learning-reflection-skill`、`next-step-guidance-skill` 属于跨工具可复用 skill。
3. 与工具强相关的 skill 必须按工具拆分，不允许把 Claude Code、Codex、Cursor 的安装与工作流文档混成一个大 skill。
4. skill 资源文档与脚本应优先围绕当前 seeds 中已有路径和步骤编写，不为不存在的课程先造内容。

---

## 11. 数据库设计方向

以下是当前确认需要新增的核心表。此处已细化到“字段级 + 约束级 + 索引级”的程度，后续可直接作为数据库设计文档和 migration 的上游输入。

## 11.0 新增枚举

建议在 AI 编排相关表落地前，先补以下枚举。

### `conversation_session_status`

- `active`
- `completed`
- `interrupted`
- `failed`
- `archived`

### `conversation_message_role`

- `system`
- `developer`
- `user`
- `assistant`
- `tool`

### `conversation_message_type`

- `plain_text`
- `structured_prompt_context`
- `skill_context`
- `assistant_answer`
- `assistant_error`
- `tool_result`

### `ai_provider_type`

- `siliconflow`
- `openai_compatible`
- `anthropic`

### `ai_auth_mode`

- `bearer`
- `api_key_header`

### `agent_scenario_type`

- `teaching`
- `blocked_help`
- `task_review`
- `completion_feedback`
- `path_guidance`

### `skill_source_type`

- `built_in`
- `imported`
- `custom`

### `skill_trust_level`

- `internal_verified`
- `reviewed_external`
- `untrusted`

### `llm_invocation_status`

- `streaming`
- `succeeded`
- `failed`
- `cancelled`
- `timed_out`

## 11.1 会话层

### `conversation_sessions`

用途：

- 学习对话会话主记录
- 一个会话对应一个当前路径场景下的持续交互容器
- 用于恢复 `/learn` 页、确定历史消息范围、绑定当前任务与当前 agent 快照

主键：

- `id uuid`，主键

字段定义：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK | 会话主键 |
| `user_id` | `uuid` | FK | 用户 ID，关联 `auth.users.id` |
| `user_learning_path_id` | `uuid` | FK, nullable | 关联当前学习路径实例 |
| `user_task_id` | `uuid` | FK, nullable | 关联当前学习任务实例 |
| `selection_mode` | `path_selection_mode` | not null | 自由模式或平台预设模式快照 |
| `tool_id` | `uuid` | FK | 当前工具 |
| `agent_code_snapshot` | `varchar(64)` | not null | 当前命中的 agent 快照 |
| `provider_code_snapshot` | `varchar(64)` | not null | 当前 provider 快照 |
| `model_code_snapshot` | `varchar(64)` | not null | 当前模型快照 |
| `status` | `conversation_session_status` | not null default `active` | 会话状态 |
| `message_count` | `integer` | not null default 0 | 当前消息条数快照 |
| `last_user_message_at` | `timestamptz` | nullable | 最近一次用户消息时间 |
| `last_assistant_message_at` | `timestamptz` | nullable | 最近一次助手消息时间 |
| `last_message_at` | `timestamptz` | nullable | 最近一次消息时间 |
| `started_at` | `timestamptz` | not null | 会话开始时间 |
| `closed_at` | `timestamptz` | nullable | 会话关闭时间 |
| `metadata` | `jsonb` | not null default '{}' | 扩展字段，如 UI 来源、流式状态快照、最近 interaction_type |
| `created_at` | `timestamptz` | not null | 创建时间 |
| `updated_at` | `timestamptz` | not null | 更新时间 |

索引：

- `idx_conversation_sessions_user_status_last_message_at`
- `idx_conversation_sessions_user_learning_path_id`
- `idx_conversation_sessions_user_task_id`

业务约束：

- 同一 `user_task_id` 同时最多只有 1 条 `active` 会话
- `agent_code_snapshot`、`provider_code_snapshot`、`model_code_snapshot` 必须快照化，避免后续配置变更影响历史审计

### `conversation_messages`

用途：

- 会话消息明细
- 保存用户输入、系统上下文消息、assistant 输出和异常结果
- 为真实流式输出后的最终落库提供权威记录

主键：

- `id uuid`，主键

字段定义：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK | 消息主键 |
| `session_id` | `uuid` | FK | 所属会话 |
| `user_id` | `uuid` | FK | 用户 ID |
| `user_task_id` | `uuid` | FK, nullable | 所属任务 |
| `role` | `conversation_message_role` | not null | 消息角色 |
| `message_type` | `conversation_message_type` | not null | 消息类型 |
| `sequence_no` | `integer` | not null | 会话内顺序号 |
| `client_message_id` | `varchar(128)` | nullable | 前端生成的消息幂等标识 |
| `reply_to_message_id` | `uuid` | FK, nullable | 回复的上一条用户消息 |
| `content_text` | `text` | nullable | 最终文本内容 |
| `content_json` | `jsonb` | not null default '{}' | 结构化内容，如结构化提示上下文、tool 结果、AI 附加字段 |
| `provider_code` | `varchar(64)` | nullable | 实际使用 provider |
| `model_code` | `varchar(64)` | nullable | 实际使用模型 |
| `input_tokens` | `integer` | nullable | 输入 token |
| `output_tokens` | `integer` | nullable | 输出 token |
| `stream_chunk_count` | `integer` | not null default 0 | 本条 assistant 消息累计流式 chunk 数 |
| `finish_reason` | `varchar(32)` | nullable | 结束原因 |
| `trace_id` | `varchar(128)` | nullable | 调用追踪 ID |
| `metadata` | `jsonb` | not null default '{}' | 原始输入类型、附件引用、前端页面来源等扩展信息 |
| `created_at` | `timestamptz` | not null | 创建时间 |

约束：

- `unique(session_id, sequence_no)`
- `unique(session_id, client_message_id)`，仅对非空值生效

索引：

- `idx_conversation_messages_session_sequence`
- `idx_conversation_messages_user_task_id`
- `idx_conversation_messages_trace_id`

设计说明：

- 第一阶段不单独持久化每个流式 chunk
- 数据库中保存的是合并后的最终 assistant 消息
- 如后续确实需要逐 chunk 回放，再考虑新增 `conversation_message_chunks`

---

## 11.2 Provider 与模型配置层

### `ai_providers`

用途：

- 保存 provider 元配置
- 当前第一阶段仅会启用 `siliconflow`
- 后续若接 OpenAI-compatible 或 Anthropic，不改 agent 层，只增 provider 记录与 adapter

主键：

- `id uuid`，主键

字段定义：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK | provider 主键 |
| `code` | `varchar(64)` | unique | provider 代码，如 `siliconflow` |
| `name` | `varchar(128)` | not null | provider 名称 |
| `provider_type` | `ai_provider_type` | not null | provider 类型 |
| `base_url` | `text` | not null | API 基础地址 |
| `auth_mode` | `ai_auth_mode` | not null default `bearer` | 鉴权方式 |
| `secret_ref` | `varchar(128)` | nullable | 对应兼容环境变量引用名 |
| `secret_ciphertext` | `text` | nullable | API Key 密文（base64） |
| `secret_iv` | `text` | nullable | AES-256-GCM IV（base64） |
| `secret_auth_tag` | `text` | nullable | AES-256-GCM auth tag（base64） |
| `secret_key_version` | `varchar(32)` | nullable | 加密主密钥版本 |
| `secret_last_updated_at` | `timestamptz` | nullable | 最近一次密钥更新时间 |
| `supports_stream` | `boolean` | not null default true | 是否支持真实流式 |
| `supports_json_mode` | `boolean` | not null default false | 是否支持 JSON 输出 |
| `timeout_ms` | `integer` | not null default 60000 | 默认超时；流式调用中作为首包/idle timeout 使用，每次收到上游数据后重置 |
| `retry_count` | `integer` | not null default 1 | 默认重试次数 |
| `is_active` | `boolean` | not null default true | 是否启用 |
| `metadata` | `jsonb` | not null default '{}' | 速率限制、平台说明等扩展字段 |
| `created_at` | `timestamptz` | not null | 创建时间 |
| `updated_at` | `timestamptz` | not null | 更新时间 |

索引：

- `uidx_ai_providers_code`

### `ai_models`

用途：

- 保存模型配置元信息
- 让同一 provider 下可灵活切换不同模型

主键：

- `id uuid`，主键

字段定义：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK | 模型配置主键 |
| `provider_id` | `uuid` | FK | 所属 provider |
| `code` | `varchar(64)` | unique | 模型代码，如 `deepseek-v3` |
| `display_name` | `varchar(128)` | not null | 模型显示名 |
| `model_name` | `varchar(128)` | not null | 实际请求模型名 |
| `supports_stream` | `boolean` | not null default true | 是否支持流式 |
| `supports_json_mode` | `boolean` | not null default false | 是否支持 JSON |
| `supports_tool_calling` | `boolean` | not null default false | 是否支持工具调用 |
| `max_context_tokens` | `integer` | not null | 最大上下文 |
| `default_max_output_tokens` | `integer` | not null | 默认最大输出 token |
| `recommended_temperature` | `numeric(4,2)` | nullable | 推荐温度 |
| `model_family` | `varchar(32)` | nullable | 管理后台主字段：模型类别，如 `chat` / `reasoning` / `asr` / `tts` / `vision` |
| `runtime_capabilities` | `text[]` | not null default `{}` | 管理后台主字段：运行时用途，如 `asr` / `tts` / `vision` / `quality_check` |
| `connection_test_mode` | `varchar(32)` | nullable | 管理后台主字段：连接测试模式，`chat` / `asr` / `tts` / `models_list`；历史 `audio_transcription` 读取时兼容为 `asr` |
| `reasoning_enabled` | `boolean` | not null default false | 是否按推理类模型对待；后台连接测试默认退化为 `/models` 连通性验证 |
| `profile_group` | `varchar(128)` | nullable | 管理后台可读分组，如 `balanced_default` / `reasoning_lab` |
| `notes` | `text` | nullable | 写给管理员的备注说明 |
| `pricing_metadata` | `jsonb` | not null default '{}' | 输入/输出计费信息 |
| `is_active` | `boolean` | not null default true | 是否启用 |
| `metadata` | `jsonb` | not null default '{}' | 仅存少量未结构化扩展字段；自 `028` 起主字段不再写入 `metadata`，运行时先读结构化列，再对历史 `metadata.capabilities` / `profileGroup` / `enableThinking` / `connectionTest` 做兼容兜底 |
| `created_at` | `timestamptz` | not null | 创建时间 |
| `updated_at` | `timestamptz` | not null | 更新时间 |

索引：

- `uidx_ai_models_code`
- `idx_ai_models_provider_id_active`

### `media_transcription_settings`

用途：

- 管理学习对话多媒体预处理使用的模型配置。
- 当前三类配置为 `image_translation`、`speech_to_text`、`text_to_speech`；前两类已接入学习对话附件预处理，文本转语音已接入 AI 回复消息按需播读。
- 该表只影响 `/learn` 对话附件预处理，不改变自学材料 intake 的 ASR / vision / quality 模型解析。

字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid` | 主键 |
| `media_type` | `media_transcription_type` | `image_translation` / `speech_to_text` / `text_to_speech` |
| `model_id` | `uuid` | 关联 `ai_models.id`，可为空 |
| `is_enabled` | `boolean` | 是否启用该类转译 |
| `metadata` | `jsonb` | 扩展信息；`text_to_speech` 可保存 `speechSpeed`（0.5–2.0，1.0 为正常语速） |
| `version` | `integer` | 乐观锁版本 |
| `created_at` / `updated_at` | `timestamptz` | 创建与更新时间 |

---

## 11.3 Agent 配置层

### `agent_templates`

用途：

- 保存 agent 定义
- 一个 agent 代表一类稳定的教学行为模板，而不是一段零散 prompt

主键：

- `id uuid`，主键

字段定义：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK | agent 主键 |
| `code` | `varchar(64)` | unique | agent 代码 |
| `name` | `varchar(128)` | not null | agent 名称 |
| `scenario_type` | `agent_scenario_type` | not null | 场景类型 |
| `description` | `text` | nullable | agent 说明 |
| `system_prompt_template` | `text` | not null | 系统提示模板 |
| `developer_prompt_template` | `text` | nullable | 开发者提示模板 |
| `default_provider_code` | `varchar(64)` | not null | 默认 provider |
| `default_model_code` | `varchar(64)` | not null | 默认模型 |
| `context_message_limit` | `integer` | not null default 8 | 历史消息条数 |
| `max_output_tokens` | `integer` | not null default 2048 | 最大输出 token |
| `temperature` | `numeric(4,2)` | not null default 0.70 | 温度 |
| `top_p` | `numeric(4,2)` | nullable | top_p |
| `stream_enabled` | `boolean` | not null default true | 是否允许流式输出 |
| `is_active` | `boolean` | not null default true | 是否启用 |
| `version` | `integer` | not null default 1 | 版本号 |
| `metadata` | `jsonb` | not null default '{}' | 输出风格、限制规则、保留字段 |
| `created_at` | `timestamptz` | not null | 创建时间 |
| `updated_at` | `timestamptz` | not null | 更新时间 |

索引：

- `uidx_agent_templates_code`
- `idx_agent_templates_scenario_active`

当前与自学模式相关的后台专用 agent：

- `self-study-material-planner`：用户侧教程链接材料计划草稿生成，供 material intake / draft flow 使用。
- `self-study-template-planner`：管理后台自学初始化模板草稿生成，仅供模板编辑器使用。

### `agent_bindings`

用途：

- 保存 agent 命中规则
- 把不同工具、不同模式、不同路径、不同阶段的解析逻辑从代码 if/else 中移出

主键：

- `id uuid`，主键

字段定义：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK | 绑定主键 |
| `agent_code` | `varchar(64)` | FK-like | 关联 `agent_templates.code` |
| `tool_id` | `uuid` | FK, nullable | 适用工具 |
| `learning_level` | `learning_level` | nullable | 适用等级 |
| `selection_mode` | `path_selection_mode` | nullable | 适用学习模式 |
| `path_id` | `uuid` | FK, nullable | 适用路径模板 |
| `step_no` | `integer` | nullable | 适用步骤 |
| `interaction_type` | `varchar(32)` | not null | 交互类型，如 `teaching`、`blocked_help` |
| `priority` | `integer` | not null default 100 | 命中优先级，值越小优先级越高 |
| `is_active` | `boolean` | not null default true | 是否启用 |
| `metadata` | `jsonb` | not null default '{}' | 额外限制条件 |
| `created_at` | `timestamptz` | not null | 创建时间 |
| `updated_at` | `timestamptz` | not null | 更新时间 |

索引：

- `idx_agent_bindings_priority_active`
- `idx_agent_bindings_tool_mode_path_step`

业务规则：

- 同一场景允许存在多个 binding，但必须通过 `priority` 决定唯一命中结果
- `interaction_type` 是首期必填项，不允许空绑定

---

## 11.4 Skill 配置层

### `skill_packs`

用途：

- 保存 skill 包元信息、信任级别与运行时启停状态
- 与本地文件系统中的 `ai/skills/<skill_code>` 目录形成一一对应

主键：

- `id uuid`，主键

字段定义：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK | skill 主键 |
| `code` | `varchar(64)` | unique | skill 代码 |
| `name` | `varchar(128)` | not null | skill 名称 |
| `version` | `varchar(32)` | not null | skill 版本 |
| `source_type` | `skill_source_type` | not null | 来源类型 |
| `trust_level` | `skill_trust_level` | not null | 信任级别 |
| `root_path` | `text` | not null | skill 根目录 |
| `manifest_path` | `text` | not null | manifest 文件路径 |
| `entry_resource_path` | `text` | nullable | 默认入口资源文件 |
| `scripts_enabled` | `boolean` | not null default false | 是否允许脚本能力 |
| `is_active` | `boolean` | not null default true | 是否启用 |
| `metadata` | `jsonb` | not null default '{}' | 适用工具、标签、审核备注等 |
| `created_at` | `timestamptz` | not null | 创建时间 |
| `updated_at` | `timestamptz` | not null | 更新时间 |

索引：

- `uidx_skill_packs_code`
- `idx_skill_packs_active_trust_level`

安全规则：

- `trust_level = untrusted` 的 skill 不允许启用脚本能力
- `scripts_enabled = true` 必须只允许 `internal_verified` 或人工审核后的 `reviewed_external`

### `agent_skill_bindings`

用途：

- 保存 agent 与 skill 的绑定关系
- 让某个 agent 在运行时自动挂载多个 skill

主键：

- `id uuid`，主键

字段定义：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK | 绑定主键 |
| `agent_code` | `varchar(64)` | FK-like | 关联 `agent_templates.code` |
| `skill_code` | `varchar(64)` | FK-like | 关联 `skill_packs.code` |
| `priority` | `integer` | not null default 100 | skill 注入顺序 |
| `is_required` | `boolean` | not null default true | 是否必挂载 |
| `context_budget_tokens` | `integer` | nullable | 分配给该 skill 的上下文预算 |
| `is_active` | `boolean` | not null default true | 是否启用 |
| `metadata` | `jsonb` | not null default '{}' | 指定资源文件、注入模式等扩展字段 |
| `created_at` | `timestamptz` | not null | 创建时间 |
| `updated_at` | `timestamptz` | not null | 更新时间 |

约束：

- `unique(agent_code, skill_code)`

索引：

- `idx_agent_skill_bindings_agent_priority`

---

## 11.5 调用审计层

### `llm_invocations`

用途：

- 记录每次真实模型调用
- 支撑成本分析、错误排查、稳定性分析和审计追踪

主键：

- `id uuid`，主键

字段定义：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK | 调用主键 |
| `session_id` | `uuid` | FK | 会话 ID |
| `assistant_message_id` | `uuid` | FK, nullable | 关联生成后的 assistant 消息 |
| `user_message_id` | `uuid` | FK, nullable | 触发本次调用的用户消息 |
| `user_id` | `uuid` | FK | 用户 ID |
| `provider_code` | `varchar(64)` | not null | provider |
| `model_code` | `varchar(64)` | not null | 模型 |
| `agent_code` | `varchar(64)` | not null | agent |
| `status` | `llm_invocation_status` | not null | 调用状态 |
| `stream_enabled` | `boolean` | not null default true | 是否流式 |
| `prompt_tokens` | `integer` | nullable | 输入 token |
| `completion_tokens` | `integer` | nullable | 输出 token |
| `total_tokens` | `integer` | nullable | 总 token |
| `latency_ms` | `integer` | nullable | 总耗时 |
| `first_chunk_latency_ms` | `integer` | nullable | 首包耗时 |
| `finish_reason` | `varchar(32)` | nullable | 结束原因 |
| `error_code` | `varchar(64)` | nullable | 归一化错误码 |
| `error_message` | `text` | nullable | 错误说明 |
| `request_payload_redacted` | `jsonb` | not null default '{}' | 脱敏后的请求载荷 |
| `response_payload_redacted` | `jsonb` | not null default '{}' | 脱敏后的响应载荷 |
| `created_at` | `timestamptz` | not null | 创建时间 |

索引：

- `idx_llm_invocations_session_created_at`
- `idx_llm_invocations_user_created_at`
- `idx_llm_invocations_provider_model_created_at`
- `idx_llm_invocations_status_created_at`

### `llm_invocations` 脱敏规则确认

第一阶段固定采用“结构可审计、正文最小保留”的审计策略。

也就是说：

1. 要能让后端排查“调用了谁、用了哪个 agent、为什么失败、花了多少 token、耗时多久”
2. 不要把完整用户输入、完整系统 prompt、完整 skill 文档和完整模型输出再复制一份进审计表

#### 绝不写入 `llm_invocations` 的内容

以下内容第一阶段明确禁止写入 `request_payload_redacted` 或 `response_payload_redacted`：

1. 完整 `system prompt`
2. 完整 `developer prompt`
3. 完整 skill 资源正文
4. 完整用户消息正文
5. 完整 assistant 消息正文
6. 完整附件 URL、图片 URL、上传文件私有路径
7. 完整手机号码、邮箱、微信号、access token、cookie、密钥、数据库连接串

这些内容的权威位置固定如下：

1. 用户与 assistant 正文只保留在 `conversation_messages`
2. prompt 模板正文只保留在 `agent_templates` 与本地 skill 文件
3. 审计表只保留脱敏后的结构摘要

#### `request_payload_redacted` 固定保留字段

第一阶段 `request_payload_redacted` 固定保留以下字段：

```json
{
  "requestMeta": {
    "interactionType": "blocked_help",
    "inputType": "text",
    "stream": true,
    "accept": "text/event-stream"
  },
  "agentMeta": {
    "agentCode": "cli_blocked_helper",
    "providerCode": "siliconflow",
    "modelCode": "glm-5",
    "contextMessageLimit": 6,
    "maxOutputTokens": 2600,
    "temperature": 0.2
  },
  "pathMeta": {
    "selectionMode": "preset_training",
    "toolCode": "claude-code",
    "pathCode": "path-claude-code-intermediate-debug-lab",
    "stepNo": 2
  },
  "contentMeta": {
    "userContentLength": 38,
    "historyMessageCount": 6,
    "skillCount": 3,
    "attachmentCount": 0,
    "containsCodeBlock": false,
    "containsUrl": false
  },
  "redactionMeta": {
    "userContentPreview": "我现在卡在这一步，不知道应该先检查什么",
    "systemPromptSha256": "hash",
    "developerPromptSha256": "hash",
    "skillContextHashes": ["hash1", "hash2"]
  }
}
```

保留规则固定如下：

1. `userContentPreview` 最多保留前 `48` 个中文字符或 `120` 个英文字符，超出必须截断并追加 `...`。
2. 若文本命中敏感信息规则：
   - 手机号只保留后 4 位，例如 `******5902`
   - 邮箱按 `a***@example.com` 形式脱敏
   - 微信号统一替换为 `[wechat_redacted]`
   - token / key / secret 统一替换为 `[secret_redacted]`
3. `systemPrompt`、`developerPrompt`、skill context 不保留正文，只保留：
   - 长度
   - `sha256`
   - 来源 code
4. 历史消息不保留逐条文本，只保留数量与总长度统计。

#### `response_payload_redacted` 固定保留字段

第一阶段 `response_payload_redacted` 固定保留以下字段：

```json
{
  "responseMeta": {
    "finishReason": "stop",
    "hasToolCall": false,
    "hasStructuredPatch": true,
    "streamChunkCount": 12
  },
  "contentMeta": {
    "assistantContentLength": 162,
    "assistantPreview": "先固定问题，再检查当前目录、报错文本和最近一次命令输出。",
    "taskPatchStatus": "blocked"
  },
  "providerMeta": {
    "providerRequestId": "req_xxx",
    "firstChunkLatencyMs": 820,
    "latencyMs": 4310
  }
}
```

保留规则固定如下：

1. `assistantPreview` 最多保留前 `64` 个中文字符或 `160` 个英文字符。
2. 若模型输出里包含代码块、路径、链接、账号、密钥样式内容，预览字段必须做同样脱敏。
3. 若本次调用失败，没有 assistant 正文：
   - 允许保留 `error_code`
   - 允许保留截断后的 `error_message`
   - 不允许保留 provider 原始完整报文

#### 敏感信息识别最小规则

第一阶段至少固定识别以下模式：

1. 中国大陆手机号
2. 常见邮箱格式
3. 微信号样式
4. `sk-`、`hf_`、`Bearer `、`postgres://`、`postgresql://`、`redis://` 等密钥和连接串前缀
5. Supabase `service_role`、`anon`、JWT 风格长 token

当前确认：

1. 第一阶段采用规则脱敏，不引入额外 DLP 服务。
2. 若文本无法确定是否敏感，按“宁可多遮，不可少遮”处理。

#### 错误与失败调用的审计规则

失败调用固定要求：

1. 必须写 `llm_invocations`
2. 必须写：
   - `provider_code`
   - `model_code`
   - `agent_code`
   - `status=failed`
   - `error_code`
   - 脱敏后的 `error_message`
3. 不允许因为 provider 抛异常就完全没有审计记录

#### 与 `conversation_messages` 的边界

当前确认：

1. `conversation_messages.content_text` 是会话真源，可按业务授权读取。
2. `llm_invocations.request_payload_redacted`、`response_payload_redacted` 只服务于：
   - 后端排错
   - 成本分析
   - 稳定性审计
3. 任何后台管理页若要展示“完整用户消息”，应从 `conversation_messages` 读取，并单独做权限控制，而不是从 `llm_invocations` 取。

---

## 12. API 形态

## 12.0A 站点更新日志生成

当前已新增后台专用 `site-changelog-writer` Agent seed（`supabase/seeds/009_site_changelog_writer_agent.sql`），默认模型 code 为 `deepseek-v4-pro`。该 Agent 只用于 `/api/admin/site/changelog/generate`：服务端读取本地 `.git` 指定日期 commits，调用非流式 `invokeAIProvider` 生成 JSON 草稿，写入 `llm_invocations` 与 `site_changelog_entries`，再由管理员审核发布。首版不自动发布，不接队列或定时任务；如果部署环境没有 `.git`，接口返回 `GIT_SOURCE_UNAVAILABLE`。

## 12.1 第一阶段保留现有入口

第一阶段不新造很多聊天入口，而是在现有接口上演进：

- `POST /api/learning/message`
- `GET /api/learning/current-session`

## 12.2 `POST /api/learning/message` 演进方向

该接口是第一阶段真实 AI 编排的唯一对话写入口。

接口原则固定如下：

1. 前端仍继续使用 `conversationId` 作为字段名，服务端内部映射到 `conversation_sessions.id`。
2. 第一阶段同一个接口同时支持：
   - 非流式 `application/json`
   - 流式 `text/event-stream`
3. 第一阶段不另外新增 `POST /api/learning/message/stream`，避免前后端维护两套路由。
4. 多模态附件不直接塞入 `content_text`。图片和语音先落 `learning_message_attachments`，再通过 `attachmentIds` 进入主消息编排。
5. 图片附件预处理使用 `data:<mime>;base64,...` 传给 vision 模型，避免私有 Storage signed URL 被 provider 侧网络阻断。
6. `Qwen3-ASR-Flash` 使用 OpenAI-compatible `/chat/completions` 的 `input_audio` 格式，不走传统 `/audio/transcriptions` multipart 表单；是否选用该模型由后台语音转文本设置决定。管理端 ASR 连接测试只验证 Provider `/models` 鉴权连通性，不发起真实转写请求。
7. 用户端 AI 回复播读通过 `POST /api/learning/message-speech` 调用后台 `text_to_speech` 配置；服务端统一 TTS Provider Gateway 默认走 HTTP TTS adapter：阿里云百炼 `qwen3-tts-flash` / `qwen3-tts-instruct-flash` 调用 DashScope HTTP 多模态生成接口并下载 `output.audio.url`，MiniMax 调用 `/v1/t2a_v2` 并解析 hex 音频，硅基流动/OpenAI-compatible 模型调用 `/audio/speech` 并直接返回二进制音频；Adapter 选择优先读取 Model metadata 的 `ttsProtocol`，否则按 provider / modelName 推断；DashScope realtime WebSocket 仅作为显式 `ttsProtocol="dashscope_realtime"` 的实验能力保留，不再作为默认播读路径；前端会清理 Markdown 标记并拆成短段队列，首段生成完成即播放、后续段预取；管理端模型连接测试可通过 `connection_test_mode=tts` 调用统一 gateway 做短文本真实合成探测。

### 12.2.1 请求头

固定请求头：

- `Content-Type: application/json`
- 登录态 Cookie 或 Bearer Token

可选请求头：

- `Accept: application/json`
- `Accept: text/event-stream`

当前确认：

1. 若 `Accept` 显式为 `text/event-stream`，服务端返回 SSE。
2. 否则默认返回一次性 JSON。

### 12.2.2 请求体

```json
{
  "conversationId": "uuid-or-null",
  "taskId": "uuid",
  "clientMessageId": "msg_client_20260330_xxx",
  "interactionType": "teaching",
  "inputType": "text",
  "content": "我现在卡在这一步，不知道应该先检查什么",
  "stream": true,
  "clientContext": {
    "pagePath": "/learn",
    "selectionMode": "preset_training",
    "toolCode": "claude-code",
    "pathCode": "path-claude-code-intermediate-debug-lab",
    "stepNo": 2,
    "locale": "zh-CN"
  }
}
```

字段定义：

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `conversationId` | 否 | `string` | 当前会话 ID；为空时服务端自动创建新会话 |
| `taskId` | 否 | `string` | 当前任务 ID；为空时服务端从当前 `active` 计划解析 |
| `clientMessageId` | 是 | `string` | 前端生成的幂等消息 ID |
| `interactionType` | 否 | `string` | `teaching` / `blocked_help` / `task_review` / `completion_feedback` / `path_guidance` / `concept_qa`；为空时由服务端自动推断 |
| `inputType` | 是 | `string` | 第一阶段固定支持 `text` / `link` / `code` |
| `content` | 是 | `string` | 用户输入内容 |
| `stream` | 否 | `boolean` | 是否期望流式返回；为 `true` 时优先返回 SSE |
| `clientContext` | 否 | `object` | 前端当前页面与调试上下文，属于辅助手段，不是权威真源 |

校验规则固定如下：

1. `clientMessageId` 必填，长度建议不超过 `128`。
2. `content` 去除首尾空白后不能为空。
3. `taskId` 若有值，必须属于当前用户的当前 `active` 学习计划。
4. `conversationId` 若有值，必须属于当前用户，且状态必须为 `active`。
5. `clientContext` 只能作为辅助校验与日志字段，不能覆盖服务端真实状态。

### 12.2.3 服务端固定处理步骤

收到请求后，服务端固定执行：

1. 鉴权并确认当前用户。
2. 校验 `clientMessageId` 是否重复。
3. 解析当前 `user_learning_path`、当前 `user_task`、当前工具与当前模式。
4. 推断或确认 `interactionType`。
5. 按 `agent_bindings` 命中 agent。
6. 按 agent 绑定选择 model profile、provider、model。
7. 加载 skill 列表并生成结构化 skill context。
8. 组装五段式 Prompt。
9. 写入用户消息。
10. 调用 provider。
11. 写入 assistant 消息与 `llm_invocations`。
12. 返回 JSON 或 SSE。

### 12.2.4 非流式成功响应

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "conversationId": "uuid",
    "taskId": "uuid",
    "message": {
      "id": 101,
      "role": "ai",
      "kind": "coach",
      "title": "排查建议",
      "content": "先固定问题，再检查当前目录、报错文本和最近一次命令输出。",
      "structuredContent": {
        "interactionType": "blocked_help",
        "variant": "blocked_help",
        "summary": "先固定问题，再检查当前目录、报错文本和最近一次命令输出。",
        "blocks": [],
        "sections": [],
        "actions": [
          {
            "label": "补充报错信息",
            "prompt": "补充完整报错文本、触发步骤和最近一次修改内容",
            "tone": "warning"
          }
        ]
      },
      "taskPatch": {
        "taskId": "uuid",
        "status": "blocked",
        "suggestedNextAction": "补充完整报错文本、触发步骤和最近一次修改内容"
      }
    },
    "taskState": "blocked",
    "taskPatch": {
      "taskId": "uuid",
      "status": "blocked",
      "suggestedNextAction": "补充完整报错文本、触发步骤和最近一次修改内容"
    }
  }
}
```

### 12.2.5 SSE 流式响应

第一阶段固定采用 SSE。

返回头：

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`

事件类型固定如下：

#### `session_started`

在开始调用 provider 前发出，用于前端建立会话上下文。

```text
event: session_started
data: {"conversationId":"uuid","interactionType":"teaching","agentCode":"coach_general","modelCode":"glm-5","providerCode":"siliconflow"}
```

#### `assistant_delta`

用于逐段返回原始模型文本增量。

```text
event: assistant_delta
data: {"delta":"先不要急着直接改代码，先固定当前报错的复现条件。"}
```

#### `task_patch`

用于提前返回任务状态变化建议。

```text
event: task_patch
data: {"taskId":"uuid","status":"blocked","suggestedNextAction":"补充完整报错文本、触发步骤和最近一次修改内容"}
```

#### `assistant_done`

表示本次 assistant 文本已经完成，并带回最终消息元数据、结构化内容与 usage。

```text
event: assistant_done
data: {"messageId":"uuid","title":"排查建议","kind":"coach","structuredContent":{"interactionType":"blocked_help","variant":"blocked_help","summary":"先固定问题，再检查当前目录、报错文本和最近一次命令输出。","blocks":[],"sections":[],"actions":[{"label":"补充报错信息","prompt":"补充完整报错文本、触发步骤和最近一次修改内容","tone":"warning"}]},"finishReason":"stop","usage":{"promptTokens":1240,"completionTokens":312,"totalTokens":1552}}
```

#### `error`

```text
event: error
data: {"code":"AI_PROVIDER_ERROR","message":"provider stream interrupted"}
```

当前确认：

1. SSE 中发的是 provider 原始增量文本，不做服务端节奏化缓冲。
2. 前端只按浏览器动画帧合并同一帧内增量，避免额外固定延迟与过碎 React 重渲染。
3. 服务端最终仍只落一条合并后的 assistant 消息，不落逐 chunk 明细。
4. 若 provider 超时或失败后客户端连接已关闭，服务端只记录原始 provider 失败；`ReadableStream` controller 已关闭属于传输层状态，不再额外写入 `llm_invocations` 失败记录或覆盖原始错误。

### 12.2.6 幂等规则

第一阶段固定以 `clientMessageId` 做消息幂等，不再另加 `Idempotency-Key` 头。

规则如下：

1. 同一 `conversationId` 下，`clientMessageId` 必须唯一。
2. 若前端重复提交同一 `clientMessageId`：
   - 若上次已成功完成，直接返回上次结果
   - 若上次仍在处理中，返回 `CONFLICT`
3. 若 `conversationId` 为空，由服务端先创建会话，再以创建后的会话 ID + `clientMessageId` 建立唯一约束。

### 12.2.7 错误码

该接口第一阶段固定支持以下错误码：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `AUTH_REQUIRED` | `401` | 未登录 |
| `VALIDATION_FAILED` | `422` | 请求字段不合法 |
| `NOT_FOUND` | `404` | 当前任务或会话不存在 |
| `CONFLICT` | `409` | 幂等冲突或当前已有处理中消息 |
| `NO_ACTIVE_LEARNING_PATH` | `409` | 当前没有进行中的学习计划 |
| `NO_ACTIVE_TASK` | `409` | 当前没有可对话的任务 |
| `AI_PROVIDER_ERROR` | `502` | provider 调用失败 |
| `AI_RESPONSE_INVALID` | `502` | 模型返回结构不满足要求 |
| `RATE_LIMITED` | `429` | 用户请求过频 |
| `INTERNAL_ERROR` | `500` | 服务端内部异常 |

## 12.3 后续可追加接口

后续可考虑新增：

- `GET /api/learning/session/{id}`
- `POST /api/learning/message/stream`
- `POST /api/admin/ai/agent/test`

但第一阶段不同时展开。

---

## 13. 运行时流程

运行时固定按以下顺序执行：

1. 用户在 `/learn` 输入消息。
2. 服务端确认当前用户、当前路径、当前任务和当前会话。
3. 识别本次交互类型。
  - 正常提问
  - 卡住求助
  - 复盘
  - 完成反馈
4. 根据绑定规则选择 agent。
5. 根据 agent 绑定加载 skill 列表。
6. 根据 agent 选择 model profile。
7. 组装 system prompt、开发者 prompt、任务上下文、skill 上下文和历史消息。
8. 调用 provider adapter。
9. 保存用户消息、AI 消息、调用审计。
10. 返回前端展示结果。

---

## 14. Prompt 组装规则

## 14.1 Prompt 来源固定拆成五段

每次请求固定按五段组装：

1. 平台基础系统规则
2. 当前 agent 系统模板
3. 当前 skill 输出的结构化能力上下文
4. 当前任务/路径结构化上下文
5. 最近 N 条对话历史 + 当前用户输入

## 14.2 任务上下文固定结构化注入

不要只塞一大段自然语言。

固定注入以下结构化字段：

- `tool_name`
- `selection_mode`
- `learning_level`
- `path_name`
- `step_title`
- `goal`
- `completion_criteria`
- `review_summary`
- `knowledge_points`
- `pitfalls`
- `current_task_status`

这样后续调 prompt 时更稳，也更利于不同 agent 复用。

## 14.3 历史条数固定配置化

不同 agent 不应统一写死历史条数。

例如：

- `blocked_help`：可只带最近 6 条
- `task_review`：可带最近 10 条
- `general_tutor`：可带最近 12 条

这固定放在 `agent_templates.context_message_limit`。

---

## 15. MVP 落地顺序

## 15.1 第一阶段

目标：

- 先让学习对话具备真实持久化、单 provider 调用能力和 skill 挂载能力

建议内容：

1. `conversation_sessions`
2. `conversation_messages`
3. `llm_invocations`
4. `ai_providers`
5. `ai_models`
6. `agent_templates`
7. `agent_bindings`
8. `skill_packs`
9. `agent_skill_bindings`
10. `POST /api/learning/message` 首版编排改造

本阶段固定只接入一家 provider，并采用真实流式输出。

### 15.1.1 当前迁移基线

截至 2026-03-31，当前仓库真实基线如下：

- `supabase/migrations/` 已到 `016_create_llm_invocations.sql`
- `supabase/seeds/` 已到 `007_ai_skill_registry.sql`

因此，AI 编排相关数据库首版已经按以下编号落地完成：

- migration 为 `012_*.sql` 到 `016_*.sql`
- seed 为 `005_*.sql` 到 `007_*.sql`

### 15.1.2 建议 migration 拆分顺序

第一阶段固定按“先基础枚举与会话表，再 provider/model，再 agent/skill，再审计”的顺序落地，不建议把全部对象塞进一个大 migration。

建议拆分如下：

#### `012_create_ai_conversation_core.sql`

内容固定包含：

1. 新增枚举：
   - `conversation_session_status`
   - `conversation_message_role`
   - `conversation_message_type`
2. 新建 `conversation_sessions`
3. 新建 `conversation_messages`
4. 建立核心索引与唯一约束
5. 建立 `updated_at` 触发器

这样拆的原因：

- 会话与消息是最先被 `POST /api/learning/message` 依赖的基础层
- 先把消息幂等和会话恢复能力建好，后续 provider 层 migration 才有明确挂载位置

#### `013_create_ai_provider_registry.sql`

内容固定包含：

1. 新增枚举：
   - `ai_provider_type`
   - `ai_auth_mode`
2. 新建 `ai_providers`
3. 新建 `ai_models`
4. 建立 provider/model 索引与启用状态索引

这样拆的原因：

- provider 与 model 是配置真源
- 该 migration 完成后即可先 seed 出 SiliconFlow 与首批模型

#### `014_create_ai_agent_registry.sql`

内容固定包含：

1. 新增枚举：
   - `agent_scenario_type`
2. 新建 `agent_templates`
3. 新建 `agent_bindings`
4. 建立命中优先级索引

这样拆的原因：

- agent 与 binding 是编排规则真源
- 必须独立于 provider/model 表存在，便于后续单独调优与回滚

#### `015_create_ai_skill_registry.sql`

内容固定包含：

1. 新增枚举：
   - `skill_source_type`
   - `skill_trust_level`
2. 新建 `skill_packs`
3. 新建 `agent_skill_bindings`
4. 建立 skill 启用状态与信任级别索引

这样拆的原因：

- skill 是首期主增强路径，应该有独立 migration 边界
- 便于后续单独增加 skill 审核字段或 manifest 字段

#### `016_create_llm_invocations.sql`

内容固定包含：

1. 新增枚举：
   - `llm_invocation_status`
2. 新建 `llm_invocations`
3. 建立调用审计索引

这样拆的原因：

- 审计表属于运行时附属层
- 即使前四个 migration 已经落地，审计表仍可独立追加，不阻塞开发联调

### 15.1.3 migration 执行约束

所有 AI migration 固定遵守以下约束：

1. 不修改当前已上线业务表的既有语义字段。
2. 不把 AI 配置直接塞入现有 `learning_paths.metadata` 或 `user_tasks.metadata` 里替代正式表。
3. `conversation_sessions`、`conversation_messages`、`llm_invocations` 必须带 `user_id`，避免后续审计和用户隔离困难。
4. `agent_bindings`、`agent_skill_bindings` 必须带 `is_active`，便于不停机切换。
5. 所有配置类表固定保留 `metadata jsonb`，但禁止把主字段偷放进 `metadata`。

### 15.1.4 首批 seed 拆分顺序

第一阶段 seed 固定分成三组，不把 provider、agent、skill 混在一个文件里。

#### `005_ai_provider_and_model_registry.sql`

内容固定包含：

1. 插入 `ai_providers`
   - `siliconflow`
2. 插入 `ai_models`
   - `deepseek-v3-2`
   - `glm-5`
   - `deepseek-r1`
3. 其中 `deepseek-r1` 必须显式标记：
   - `is_active=true`
   - `metadata.routePolicy = "manual_test_only"`
   - 不作为任何默认 agent 模型

#### `006_ai_agent_and_binding_registry.sql`

内容固定包含：

1. 插入首批 `agent_templates`
   - 主教学 agent
   - 辅助场景 agent
2. 插入首批 `agent_bindings`
3. 固定把默认模型映射为：
   - `sf-balanced-default -> deepseek-v3-2`
   - `sf-code-workflow -> deepseek-v3-2`
   - `sf-longform-coach -> glm-5`
   - `sf-reasoning-lab -> deepseek-r1`

#### `007_ai_skill_registry.sql`

内容固定包含：

1. 插入首批 `skill_packs`
2. 插入首批 `agent_skill_bindings`
3. 所有 `root_path` 与 `manifest_path` 必须指向项目内真实存在路径
4. 第一阶段所有 skill 默认：
   - `scripts_enabled=false`
   - 只有明确进入白名单的内部 skill 才允许后续再开脚本能力

### 15.1.5 首批 seed 最小范围

第一阶段 seed 只覆盖当前真实产品路径，不预埋未来课程。

必须覆盖的范围：

1. `cursor-quickstart`
2. `path-claude-code-intermediate-workflow-boost`
3. `path-claude-code-intermediate-debug-lab`
4. `path-claude-code-intermediate-feature-shipping`
5. `path-codex-intermediate-workflow-boost`
6. `path-codex-intermediate-debug-lab`
7. `path-codex-intermediate-feature-shipping`
8. 各工具的 self-study path

可以暂缓的范围：

1. `stitch`、`bolt`、`lovable` 的细粒度 stage agent
2. 后台运营自定义 agent
3. 第三方导入 skill 包

### 15.1.6 是否需要历史数据回填

当前确认：

1. `conversation_sessions`
   不做历史回填。`012` 之后的新会话已按真实链路写入；早于迁移落地的前端临时态消息不回补。
2. `conversation_messages`
   不做历史回填。仅以 `012` 迁移后真实持久化的消息为准，旧临时态消息不补写。
3. `llm_invocations`
   不做历史回填。审计表从真实 provider 接入当天开始计。
4. `agent_templates`、`agent_bindings`、`skill_packs`
   通过 seed 一次性初始化，不存在历史回填问题。

### 15.1.7 开发落地顺序

第一阶段真实实现顺序固定如下：

1. 先执行 `012` 到 `016` migration。
2. 再执行 `005` 到 `007` seed。
3. 然后实现 `server/modules/learning` 内的 provider adapter 与 agent resolution。
4. 最后把 `POST /api/learning/message` 从内置回复切到真实 provider。

禁止顺序：

1. 先写 route handler 里的临时 if/else，再等表补齐。
2. 先把模型名写死在前端，再补 provider registry。
3. 先做 skill 文件目录，却不补 `skill_packs` 与 `agent_skill_bindings`。

### 15.1.8 每步完成后的验收点

#### 完成 `012_create_ai_conversation_core.sql` 后

- 能在数据库看到 `conversation_sessions`、`conversation_messages`
- 能验证唯一约束：
  - `unique(session_id, sequence_no)`
  - `unique(session_id, client_message_id)` 对非空值生效

#### 完成 `013_create_ai_provider_registry.sql` 与 `005_ai_provider_and_model_registry.sql` 后

- `siliconflow` provider 已存在
- `deepseek-v3-2`、`glm-5`、`deepseek-r1` 三条模型记录已存在
- `deepseek-r1` 未被设置为任何默认生产 agent 模型

#### 完成 `014_create_ai_agent_registry.sql` 与 `006_ai_agent_and_binding_registry.sql` 后

- 当前真实课程路径都能命中一个明确 agent
- `blocked_help`、`task_review`、`completion_feedback` 都有兜底 agent

#### 完成 `015_create_ai_skill_registry.sql` 与 `007_ai_skill_registry.sql` 后

- 每个生产 agent 至少挂载 1 个 skill
- 所有 skill 路径都能在项目目录中找到对应资源

#### 完成 `016_create_llm_invocations.sql` 后

- 一次真实 provider 调用可写出一条 `llm_invocations`
- 失败调用也能留痕，而不是静默丢失

## 15.2 第二阶段

当前状态：

- 尚未开始落地；当前代码仅完成第一阶段主链路，不应把本节内容视为已实现能力

目标：

- 让平台预设课程具备更细的 agent 控制

建议内容：

1. 给不同工具和不同路径补 agent seed
2. 给不同交互类型补 agent
3. 补 prompt 版本化管理

## 15.3 第三阶段

当前状态：

- 尚未开始落地；当前仍停留在设计预留，后台配置与运营可视化能力尚不存在

目标：

- 让配置可运营化

建议内容：

1. 后台前端配置页
2. 调用日志查看
3. Prompt 灰度与回滚
4. 成本与稳定性面板

---

## 16. 当前已确认决策

当前已确认：

1. 先在当前项目的 `app/api + server/modules` 实现核心 AI orchestration。
2. 先做多 provider 抽象，但第一阶段只接入硅基流动。
3. 第一阶段采用真实流式，服务端转发 provider 增量，前端按浏览器动画帧合并渲染。
4. 不把 agent 等同于 prompt，而是做成独立配置实体。
5. 不把规则写死在代码 if/else 中，而是通过 `agent_bindings` 做解析。
6. Skill 是首期能力增强主路径，文件系统为内容真源，数据库为绑定真源。
7. 不采用 MCP 或知识库作为首期主增强机制。
8. 先做数据库和 API，管理后台后置。
9. 第一阶段生产模型白名单固定为 `Pro/deepseek-ai/DeepSeek-V3.2`、`Pro/zai-org/GLM-5`。
10. `Pro/deepseek-ai/DeepSeek-R1` 第一阶段仅保留后台测试，不进入自动主链路。

---

## 17. 当前仍待确认事项

当前版本下，第一阶段核心设计决策已收敛完成。

后续如有新增待确认项，应只记录“尚未定案且会影响实现”的真实问题，不保留已经定案但尚未编码的事项。

---

## 18. 开发与回写规范

后续实现本模块时，建议遵守以下规则：

1. 不要把某一家 provider 的请求格式直接渗透到 route handler 或教学服务层。
2. 不要把 agent 解析规则散落在多个页面接口中，应统一收敛到服务端编排层。
3. 不要把 prompt 文案硬编码在前端。
4. 不要把“不同工具、不同阶段、不同模式”的差异写成难以维护的大量 if/else。
5. 新增数据库表、状态枚举、消息结构后，应同步更新 API 文档、数据库文档和本文档。
6. 若后续引入后台配置页，也应以本文档中的模型划分为基础，而不是重新发明一套配置结构。
7. 若后续新增 skill 包目录规范、skill manifest 字段或 skill 审核流程，应优先回写本文档。

---

## 19. 建议的下一步

建议下一轮基于本文档继续细化以下三个部分：

1. 首批 migration SQL 草案  
   基于 `012` 到 `016` 的拆分方案，正式生成每个 migration 的字段、约束与索引 SQL。
2. 首批 seed SQL 草案  
   基于 `005` 到 `007` 的拆分方案，正式生成 provider、model、agent、binding、skill 的初始数据。
3. `server/modules/learning` 编排实现草案  
   明确 provider adapter、agent resolution、skill loader、message persistence 在服务端代码中的目录落位与调用顺序。

---

## 20. 参考资料

以下资料用于确认平台能力边界，不代表本项目最终必须采用对应部署方式：

- 阿里云 Supabase 总览：[https://help.aliyun.com/zh/analyticdb/analyticdb-for-postgresql/user-guide/supabase/](https://help.aliyun.com/zh/analyticdb/analyticdb-for-postgresql/user-guide/supabase/)
- 阿里云 Supabase Edge Functions：[https://help.aliyun.com/zh/analyticdb/analyticdb-for-postgresql/user-guide/using-edge-functions-in-analyticdb-supabase](https://help.aliyun.com/zh/analyticdb/analyticdb-for-postgresql/user-guide/using-edge-functions-in-analyticdb-supabase)
- Supabase Edge Functions：[https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- Supabase AI 示例（OpenAI）：[https://supabase.com/docs/guides/ai/examples/openai](https://supabase.com/docs/guides/ai/examples/openai)
