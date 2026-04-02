# AI编程学习教练 API 接口详细定义文档

> 文档类型：API 接口详细定义文档  
> 产品名称：AI编程学习教练  
> 版本：v1.1  
> 状态：已按当前代码实现同步  
> 创建日期：2026-03-23  
> 适用阶段：MVP  
> 关联文档：`docs/plans/2026-03-23-ai-coding-tutor-technical-architecture.md`

---

## 1. 文档目标

本文档定义 AI编程学习教练 MVP 的服务端 API，包含接口分组、认证方式、请求响应结构、参数定义、业务规则、错误码和幂等要求，作为前后端联调与测试依据。

## 1.1 持久文档与运行时文档的关系

本文件是持久化 API 主文档，用来说明接口边界、业务语义、分组方式和“已实现 / 规划中”状态。

当前代码里同时提供运行时 API 文档：

- `GET /api/docs/openapi`：返回当前注册过的 OpenAPI 3.1 JSON
- `/api-docs`：基于 Swagger UI 的接口查看与调试页

当前运行时文档的维护入口位于：

- `server/modules/api-docs/openapi.ts`
- `server/modules/api-docs/schemas.ts`

需要明确的是：当前实现不是扫描整个 `app/api` 目录后零配置自动发现所有接口；新增或修改后端接口时，除了改 `route.ts` / `route-handler.ts` / `service.ts` 外，仍需同步更新上述 OpenAPI 注册与 schema，运行时文档才会一起反映真实变更。

---

## 2. 通用规范

## 2.1 Base Path

统一前缀：

`/api`

## 2.2 数据格式

- 请求体：`application/json`
- 响应体：`application/json`
- 时间格式：`ISO 8601`

## 2.3 通用响应结构

成功响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

失败响应：

```json
{
  "code": "AUTH_REQUIRED",
  "message": "未登录或登录态已失效。",
  "data": null
}
```

当前代码约定补充：

- 成功响应统一使用 `code/message/data`
- 常见错误文案当前以中文为主，便于直接映射前端提示
- `400` 常用于请求结构错误、非法 ID、缺少前置条件等
- `422` 常用于共享 schema 已识别出字段，但字段值未通过业务校验
- `404` / `409` / `502` 等错误，已在部分高频路由中通过共享 helper 统一映射

## 2.4 认证方式

MVP 默认使用登录态 Session 或 Bearer Token。

所有用户数据接口必须要求认证，公开接口除外：

- `GET /api/onboarding/tools`
- 可选的营销页相关接口

## 2.5 幂等规范

以下接口必须支持幂等：

- `POST /api/task/complete`
- `POST /api/checkin/daily`
- 所有积分发放类动作

建议头部：

- `Idempotency-Key`

## 2.6 前端原型校准原则

当前仓库中的前端原型已经覆盖 `/login`、`/onboarding`、`/learn`、`/map`、`/achievements`、`/history` 等核心页面。服务端接口在与原型对齐时，必须区分以下三类字段：

1. 权威业务字段：需要由服务端持久化或计算，例如 `currentScore`、`currentRank`、`task.status`、`streakDays`、`selectedPathId`。
2. 服务端 read model 字段：可由服务端聚合后直接返回给前端，例如 `nextRankRemainingXP`、`progress.percent`、`currentStageId`、`hasMore`。
3. 前端展示字段：不建议作为后端权威契约，例如颜色 token、图标对象、FAQ 文案、营销套餐文案、按钮 helper 文案、日历周标题矩阵等。

因此本次 API 文档更新遵循两条原则：

- 服务端接口优先定义“真实业务语义 + 可直接渲染的 read model”，而不是复用前端组件类型。
- 当前前端 mock 中的 `icon`、`color`、`bg`、`guideItems.color`、`stats.icon`、`weekDays`、`dates`、`faqItems`、`subscription.*` 等字段，不作为 MVP 后端首期必做接口字段。

## 2.7 当前代码实现状态快照

本文件同时承载“当前已实现接口”和“后续规划接口”两部分内容。

当前仓库代码中已经实现的接口有：

- `POST /api/auth/login`
- `GET /api/auth/session`
- `GET /api/profile/me`
- `PATCH /api/profile/me`
- `POST /api/profile/avatar`
- `GET /api/onboarding/tools`
- `GET /api/onboarding/path-options`
- `POST /api/onboarding/complete`
- `GET /api/learning/current-session`
- `POST /api/learning/message`
- `GET /api/learning/messages`
- `POST /api/task/complete`
- `POST /api/task/update-status`
- `POST /api/checkin/daily`
- `GET /api/progress/current`
- `GET /api/progress/map`
- `GET /api/achievement/summary`
- `GET /api/history/recent`
- `GET /api/history/{id}`
- `POST /api/history/{id}/status`
- `POST /api/feedback`
- `GET /api/feedback/mine`
- `GET /api/feedback/mine/{id}`
- `GET /api/admin/feedback`
- `GET /api/admin/feedback/{id}`
- `POST /api/admin/feedback/{id}/reply`
- `POST /api/admin/feedback/{id}/status`
- `POST /api/learning/plan-from-material`
- `POST /api/learning/plan-drafts/{id}/confirm`
- `POST /api/learning/plan-drafts/{id}/regenerate`

当前这些已实现接口，已经开始复用一套共享的请求与响应基础设施：

- `server/lib/request-validation.ts`
- `server/lib/route-response.ts`
- `server/lib/route-error.ts`
- `server/lib/route-error-presets.ts`

当前 `app/api` 中越来越多的 `route.ts` 只负责接住请求并转交各域 `route-handler.ts`，而不是在每个文件里重复手写参数读取、错误分支和响应结构。

当前仍属于规划、尚未在代码中落地的接口包括：

- `POST /api/profile/init`
- `POST /api/learning/stuck-help`
- `POST /api/analytics/event`

除明确标注“规划中”的接口外，本文件中描述的现状应以当前代码为准。

---

## 3. 错误码定义

| 错误码 | 说明 |
|------|------|
| `OK` | 成功 |
| `BAD_REQUEST` | 参数错误 |
| `AUTH_REQUIRED` | 未登录 |
| `FORBIDDEN` | 无权限 |
| `NOT_FOUND` | 资源不存在 |
| `CONFLICT` | 状态冲突 |
| `VALIDATION_FAILED` | 业务校验失败 |
| `AI_PROVIDER_ERROR` | AI 服务异常 |
| `MATERIAL_UNSUPPORTED_DOMAIN` | 当前链接来源不在支持范围内 |
| `MATERIAL_FETCH_FAILED` | 教程材料抓取失败 |
| `MATERIAL_INSUFFICIENT_CONTENT` | 材料内容不足，无法生成稳定计划 |
| `PLAN_DRAFT_NOT_FOUND` | 学习计划草稿不存在 |
| `PLAN_DRAFT_ALREADY_CONFIRMED` | 学习计划草稿已确认 |
| `AI_RESPONSE_INVALID` | AI 返回结果未通过计划校验 |
| `RATE_LIMITED` | 请求频率过高 |
| `INTERNAL_ERROR` | 系统内部错误 |

---

## 4. 接口分组总览

## 4.1 认证与档案

当前已实现：

- `POST /api/auth/login`
- `GET /api/auth/session`
- `GET /api/profile/me`
- `PATCH /api/profile/me`
- `POST /api/profile/avatar`

规划中：

- `POST /api/profile/init`

## 4.2 新手引导

- `GET /api/onboarding/tools`
- `GET /api/onboarding/path-options`
- `POST /api/onboarding/complete`

## 4.3 学习核心

当前已实现：

- `POST /api/learning/message`
- `GET /api/learning/current-session`
- `GET /api/learning/messages`
- `POST /api/learning/plan-from-material`（自学模式白名单教程链接 → 同步生成计划草稿）
- `POST /api/learning/plan-drafts/{id}/confirm`（草稿确认并物化到主路径链路，幂等）
- `POST /api/learning/plan-drafts/{id}/regenerate`（仅替换草稿，可选更换链接）

规划中：

- `POST /api/learning/stuck-help`

## 4.4 任务与进度

当前已实现：

- `POST /api/task/complete`
- `POST /api/task/update-status`
- `GET /api/progress/current`
- `GET /api/progress/map`

## 4.5 成长与历史

当前已实现：

- `GET /api/achievement/summary`
- `GET /api/history/recent`
- `GET /api/history/{id}`
- `POST /api/history/{id}/status`
- `POST /api/checkin/daily`

## 4.6 反馈与运营

- `POST /api/feedback`
- `GET /api/feedback/mine`
- `GET /api/feedback/mine/{id}`
- `GET /api/admin/feedback`
- `GET /api/admin/feedback/{id}`
- `POST /api/admin/feedback/{id}/reply`
- `POST /api/admin/feedback/{id}/status`

## 4.7 数据事件

规划中：

- `POST /api/analytics/event`

## 4.8 当前前端页面与接口映射

基于当前前端原型，MVP 首期真正要打通的页面与接口对应关系如下：

| 页面 | 路由 | 主要接口 | 说明 |
|------|------|------|------|
| 营销首页 | `/` | `GET /api/auth/session` | 首页导航、Hero、套餐区、页脚与最终 CTA 会根据登录态切换为“继续学习”，并跳转到 `/learn`、`/history` 或 `/onboarding` |
| 登录页 | `/login` | `POST /api/auth/login`、`GET/PATCH /api/profile/me`、`POST /api/profile/avatar` | 当前已打通手机号验证码登录、微信 OAuth 跳转、用户档案读取与资料编辑 |
| 新手引导 | `/onboarding` | `GET /api/onboarding/tools`、`GET /api/onboarding/path-options`、`POST /api/onboarding/complete` | 产出主工具、学习等级、学习模式、初始学习路径实例 |
| 学习页 | `/learn` | `GET /api/learning/current-session`、`GET /api/learning/messages`、`POST /api/learning/message`、`POST /api/task/complete`、`POST /api/task/update-status`、`POST /api/learning/plan-from-material`、`POST /api/learning/plan-drafts/{id}/confirm`、`POST /api/learning/plan-drafts/{id}/regenerate` | 已打通学习主界面 read model、历史消息分页、真实 AI provider 消息编排、SSE 与任务状态写入；自学模式（`selection_mode=self_directed`）已支持白名单教程链接生成计划草稿并确认后替换当前 active 路径 |
| 地图页 | `/map` | `GET /api/progress/current`、`GET /api/progress/map` | 展示当前路径实例及各关卡状态 |
| 成就页 | `/achievements` | `GET /api/achievement/summary` | 当前已打通成长总览 read model，并支持真实每日打卡 |
| 历史页 | `/history` | `GET /api/history/recent`、`GET /api/history/{id}`、`POST /api/history/{id}/status` | 当前前端实际需要的是“历史学习计划列表 + 详情复盘 + 状态操作”，而不是“最近对话列表” |
| 反馈弹窗 | 设置菜单 / `/history` 侧栏 | `POST /api/feedback`、`GET /api/feedback/mine`、`GET /api/feedback/mine/{id}` | 用户可提交反馈并查看管理员回复 |

以下内容继续保留前端本地静态配置，不进入 MVP 首期后端：

- 营销页内容
- FAQ
- 订阅套餐文案与价格展示
- 图标映射与颜色 token
- 快捷按钮 helper 文案、部分提示文案

---

## 5. 认证与档案接口

## 5.1 `POST /api/auth/login`

用途：

- 服务端校验登录态并返回用户基础信息

请求体：

```json
{
  "loginType": "wechat",
  "authCode": "xxx"
}
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `loginType` | 是 | `wechat` / `phone` |
| `authCode` | 是 | 第三方登录授权码或服务端交换码 |

成功响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "userId": "uuid",
    "isNewUser": true,
    "profileCompleted": false
  }
}
```

业务规则：

- 首次登录仅建立最小档案，不强制补全昵称
- 若阿里云 Supabase 的微信 OAuth 配置在首阶段未完成，可先用手机号作为临时回退入口

## 5.2 `GET /api/auth/session`

用途：

- 读取当前已登录用户的只读会话摘要，供首页营销层恢复登录态并决定“继续学习”跳转目标

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "userId": "uuid",
    "redirectTo": "/learn",
    "phone": "18600165902",
    "nickname": "小王"
  }
}
```

字段说明：

| 字段 | 说明 |
|------|------|
| `userId` | 当前登录用户 ID |
| `redirectTo` | 基于学习计划状态摘要计算出的推荐跳转地址 |
| `phone` | 当前登录手机号，可为空 |
| `nickname` | 当前用户昵称，可为空 |

业务规则：

- 该接口必须要求认证。
- 该接口是只读摘要接口，不承担登录写入、副作用更新或登录时间刷新职责。
- 首页和营销层组件恢复登录态时，应优先读取该接口，而不是复用会产生登录写语义的 `POST /api/auth/login`。
- 当前真实分流规则为：
  - 有 `active` 学习计划：`/learn`
  - 无 `active`，但已有 `interrupted` / `completed` / `abandoned` 历史计划：`/history`
  - 无任何学习计划历史：`/onboarding`

## 5.3 `GET /api/profile/me`

用途：

- 获取当前用户档案与顶层学习状态

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "userId": "uuid",
    "nickname": "小王",
    "primaryTool": {
      "code": "cursor",
      "name": "Cursor"
    },
    "learningLevel": "beginner",
    "currentScore": 120,
    "currentRank": "rookie",
    "streakDays": 3,
    "lastLearningAt": "2026-03-23T08:00:00Z"
  }
}
```

补充规则：

- `primaryTool` 可为空；当前前端原型默认已有主工具，但真实新用户在完成 onboarding 前可能没有主工具。
- `completedTaskCount`、`currentScore`、`currentRank`、`streakDays` 为服务端聚合快照，不要求前端自行计算。
- 工作台侧栏中的订阅块继续沿用前端 mock，待支付域明确后再单独设计订阅接口。

## 5.4 规划中：`POST /api/profile/init`

用途：

- 首次登录后写入初始用户信息

请求体：

```json
{
  "nickname": "小王",
  "learningLevel": "beginner"
}
```

---

## 6. 新手引导接口

## 6.1 `GET /api/onboarding/tools`

用途：

- 获取工具选择页工具列表

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "groups": [
      {
        "groupCode": "gui",
        "groupName": "图形化工具",
        "tools": [
          {
            "id": "uuid",
            "code": "cursor",
            "name": "Cursor",
            "difficultyLevel": "beginner",
            "summary": "适合从可视化界面开始上手"
          }
        ]
      }
    ]
  }
}
```

## 6.2 `GET /api/onboarding/path-options`

用途：

- 获取当前主工具与学习水平下可选的起始学习路线

请求参数：

```json
{
  "toolCode": "cursor",
  "learningLevel": "beginner"
}
```

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "selfStudyOption": {
      "id": "self-study",
      "code": "self-study",
      "name": "自学模式",
      "sourceType": "self_directed",
      "summary": "粘贴教程、代码、链接或截图，系统按当前工具与水平拆解训练步骤",
      "preview": ["粘贴学习内容", "获得当前一步", "卡住时继续追问"],
      "inputTypes": ["教程文本", "代码片段", "网页链接", "截图"]
    },
    "presetPathOptions": [
      {
        "pathId": "uuid",
        "code": "cursor-beginner-quickstart",
        "name": "Cursor 零基础起步营",
        "sourceType": "preset_training",
        "stageCount": 8,
        "summary": "从界面熟悉到完成第一个小作品",
        "recommended": true,
        "currentLevelFit": "适合第一次系统上手 Cursor 的新用户",
        "coachAgentLabel": "入门陪练 Agent",
        "estimatedDuration": "3-5 天",
        "tags": ["界面熟悉", "Prompt 入门", "小作品"],
        "preview": ["认识 Cursor 工作区", "写第一个 Prompt", "完成第一个页面练习"]
      }
    ]
  }
}
```

业务规则：

- 路线列表由 `toolCode + learningLevel` 联合决定
- 当没有命中的平台路径时，仍必须返回 `selfStudyOption`

## 6.3 `POST /api/onboarding/complete`

用途：

- 提交新手引导三步结果并生成进入学习主界面的初始化上下文

请求体：

```json
{
  "toolCode": "cursor",
  "learningLevel": "beginner",
  "selectionMode": "preset_training",
  "selectedPathId": "uuid"
}
```

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "onboardingCompleted": true,
    "primaryToolCode": "cursor",
    "learningLevel": "beginner",
    "selectionMode": "preset_training",
    "pathId": "uuid",
    "currentTaskId": "uuid",
    "initialPreview": [
      "认识工作区",
      "写第一个 Prompt",
      "完成第一个小页面"
    ],
    "redirectTo": "/learn"
  }
}
```

业务规则：

- 一个用户必须完成三步引导后，才能进入学习主界面
- `selectionMode=self_directed` 时 `selectedPathId` 可为空
- `selectionMode=preset_training` 时 `selectedPathId` 必填

---

## 7. 学习核心接口

## 7.1 `POST /api/learning/message`

用途：

- 提交学习输入并触发 AI 导师编排

当前实现说明：

- 当前接口已经真实落地并接入 `/learn`
- 当前已接通真实 AI 编排链路：会话创建/复用、用户消息持久化、agent 解析、skill 上下文装配、provider 调用、assistant 消息持久化、`llm_invocations` 审计写入
- 当前同时支持 `application/json` 与 `text/event-stream` 两种返回方式；当请求头 `Accept` 包含 `text/event-stream` 或请求体传 `stream=true` 时，返回 SSE
- 当前消息返回与持久化都已显式包含 `structuredContent`，其中至少包含 `interactionType`、`variant`、`summary`、`blocks`、`sections`、`actions`

请求体：

```json
{
  "conversationId": "uuid",
  "taskId": "uuid",
  "clientMessageId": "msg_client_20260331_xxx",
  "interactionType": "blocked_help",
  "inputType": "text",
  "content": "我卡在这里了，命令执行后报错。",
  "stream": false,
  "clientContext": {
    "pagePath": "/learn"
  }
}
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `conversationId` | 否 | 无则新建会话 |
| `taskId` | 否 | 当前任务 ID |
| `clientMessageId` | 否 | 前端幂等消息 ID；当前真实实现已支持并建议始终传入 |
| `interactionType` | 否 | `teaching` / `blocked_help` / `task_review` / `completion_feedback` / `path_guidance`；为空时由服务端自动推断 |
| `inputType` | 是 | `text` / `link` / `code` |
| `content` | 是 | 用户输入内容 |
| `stream` | 否 | `true` 时优先请求 SSE |
| `clientContext` | 否 | 页面与调试上下文 |

成功响应示例：

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
      "content": "先固定当前执行命令、终端输出和你预期的结果。",
      "structuredContent": {
        "interactionType": "blocked_help",
        "variant": "blocked_help",
        "summary": "先固定当前执行命令、终端输出和你预期的结果。",
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

错误场景：

- 链接解析失败
- provider 调用失败
- 用户当前无有效学习路径

SSE 事件补充：

- `session_started`
- `task_patch`
- `assistant_delta`
- `assistant_done`
- `error`

## 7.2 `GET /api/learning/current-session`

用途：

- 获取最近一次学习上下文，用于恢复页面

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "conversationId": "uuid",
    "task": {
      "taskId": "task-ask-vs-agent",
      "title": "理解 Ask 与 Agent 的区别",
      "status": "in_progress"
    },
    "profile": {
      "userId": "user-demo-001",
      "nickname": "陈小明",
      "primaryTool": {
        "code": "cursor",
        "name": "Cursor"
      },
      "learningLevel": "beginner",
      "currentScore": 680,
      "currentRank": "Vibe Coder",
      "streakDays": 7,
      "completedTaskCount": 14,
      "lastLearningAt": "2026-03-24T14:32:00+08:00"
    },
    "planSummary": {
      "selectedToolName": "Cursor",
      "learningLevelLabel": "完全入门",
      "selectionModeLabel": "平台训练模式",
      "selectionMode": "preset_training",
      "pathName": "Cursor 零基础起步营"
    },
    "resume": {
      "title": "继续上次学习",
      "summary": "你已经完成了基础安装与第一次提问，现在继续验证 Ask 与 Agent 的职责边界。",
      "lastSeenLabel": "上次停留在 18 分钟前",
      "ctaLabel": "继续这一关"
    },
    "mission": {
      "title": "理解 Ask 与 Agent 的区别",
      "tool": "Cursor",
      "stageLabel": "第 3 关 / 共 6 关",
      "goal": "用 Cursor 的 Agent 功能创建一个 React 时钟组件。",
      "summary": "只做一个最小实验：让 Agent 生成一个 React 时钟组件，理解它和 Ask 的职责边界。",
      "estimatedTime": "约 8 分钟",
      "reward": "+10 XP",
      "progressLabel": "1 / 3 步",
      "progressPercent": 36,
      "coachCue": "先把任务做小，只验证 Agent 是否比 Ask 更适合生成完整文件。",
      "nextUnlockTitle": "AI 调试助手",
      "nextUnlockSummary": "学会带着错误上下文让 Cursor 帮你定位并修复 bug。"
    },
    "messages": [
      {
        "id": 1,
        "role": "system",
        "kind": "system_goal",
        "title": "系统目标说明",
        "content": "本关只验证一件事：Agent 是否更适合生成完整文件。"
      }
    ],
    "quickActions": [
      {
        "label": "我完成了",
        "tone": "primary",
        "helper": "推进任务",
        "category": "progress"
      }
    ],
    "supportOptions": [
      {
        "mode": "hint",
        "label": "给我一点提示",
        "description": "只提醒关键方向，不直接把答案展开。",
        "prompt": "给我一点提示"
      }
    ],
    "rightPanel": {
      "currentStep": "用 Agent 生成一个 React 时钟组件",
      "whyThisStep": "这是当前最小、最容易验证的实验",
      "completionCriteria": "看到一个可运行的时钟组件，并理解为什么这是 Agent 场景。",
      "hintIfStuck": "如果不知道怎么描述，就先提交一句结果导向的话，而不是试图写完整规范。",
      "knowledgePoints": ["Ask 模式", "Agent 模式", "React"],
      "masteryPoints": [
        "Ask 更适合解释概念、追问细节和帮你拆清思路。",
        "Agent 更适合生成完整文件或连续修改多段代码。"
      ],
      "cautions": [
        {
          "text": "最常见的卡点：明明想生成文件，却还在 Ask 里反复追问。",
          "isTrap": true
        }
      ],
      "nextStepPreview": "下一步会进入 AI 调试助手，继续建立更完整的 Cursor 协作工作流。"
    },
    "recentPracticeRounds": [
      {
        "id": "practice-round-001",
        "taskTitle": "安装与配置 Cursor",
        "stageLabel": "第 1 关",
        "lastActiveLabel": "今天",
        "status": "completed"
      }
    ],
    "tasks": [
      {
        "id": 1,
        "label": "安装与配置 Cursor",
        "done": true
      },
      {
        "id": 3,
        "label": "理解 Ask 与 Agent 的区别",
        "done": false,
        "current": true
      }
    ]
  }
}
```

实现约束：

- 当前前端原型确实消费了 `planSummary`、`mission`、`resume`、`rightPanel`、`tasks` 等 read model，因此服务端首期可以直接聚合返回。
- `planSummary.selectionMode` 为机器可读枚举：`self_directed`（自学模式）或 `preset_training`（预设训练），与 `selectionModeLabel` 同时返回；自学模式下前端可展示「教程链接生成计划」入口。
- `quickActions`、`supportOptions`、`tips`、`knowledgeTags.color` 等字段偏展示层，可在首期先由前端保留静态配置；如果服务端返回，也应视为可选扩展字段，而不是底层数据库实体。
- `messages.role` 在服务端内部建议使用 `assistant`，若前端仍保留 `ai`，可在 BFF DTO 层做映射。

## 7.3 `GET /api/learning/messages`

用途：

- 分页读取当前学习会话中的更早消息，供 `/learn` 顶部“加载更早消息”入口使用

查询参数：

- `conversationId`
- `beforeSequenceNo`
- `limit`

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "conversationId": "uuid",
    "messages": [
      {
        "id": 98,
        "role": "ai",
        "kind": "coach",
        "title": "下一步建议",
        "content": "先做一个最小验证结果，再回来继续。",
        "structuredContent": {
          "interactionType": "path_guidance",
          "variant": "path_guidance",
          "summary": "先做一个最小验证结果，再回来继续。",
          "blocks": [],
          "sections": [],
          "actions": []
        }
      }
    ],
    "pagination": {
      "hasMore": true,
      "nextBeforeSequenceNo": 37
    }
  }
}
```

业务规则：

- 仅允许读取当前登录用户自己的会话
- `beforeSequenceNo` 和 `limit` 必须是正整数
- assistant 历史消息若已落库存储 `structuredContent`，返回时应一并恢复；旧记录若缺失该字段，则服务端按兼容逻辑回填

## 7.4 `POST /api/learning/plan-from-material`

用途：

- 在自学模式（`selection_mode=self_directed`）下，根据白名单教程链接同步生成学习计划草稿

实现说明：

- Phase A 仅支持白名单域名（如 `developer.mozilla.org`、`nextjs.org`、`web.dev`），同步返回
- 成功后只写入 `learning_material_intakes` / `sources` 与 `learning_plan_drafts` / `learning_plan_draft_tasks`，不直接改动当前 active path
- 主工具与等级来自 `user_profiles`，无需在请求中传 `targetToolCode`
- 运行时契约与 Swagger：`GET /api/docs/openapi`（operationId `postLearningPlanFromMaterial` 等）、调试页 `/api-docs`

请求体：

```json
{
  "links": [
    "https://web.dev/learn/"
  ],
  "userGoal": "我想跟着教程做一个最小可运行的页面练习",
  "weeklyHours": 6
}
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `links` | 是 | 教程链接列表，1–5 条，须为 http(s) URL |
| `userGoal` | 否 | 用户补充的学习目标 |
| `weeklyHours` | 否 | 每周计划投入时长，1–40（整数） |

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "processingMode": "sync",
    "intakeId": "22222222-2222-4222-8222-222222222222",
    "draftId": "11111111-1111-4111-8111-111111111111",
    "preview": {
      "title": "用官方教程完成第一个 Next.js 页面改造",
      "goal": "基于教程内容完成一个可运行、可验收的最小页面练习闭环。",
      "tasks": [
        {
          "taskNo": 1,
          "title": "通读教程并跑通基础项目",
          "objective": "先确认教程里的项目结构、依赖和运行方式都可复现。",
          "practiceSteps": [
            "阅读教程中的环境准备与启动步骤",
            "本地运行项目并截图记录首页结果"
          ],
          "acceptanceCriteria": "项目可正常启动；能说明教程目标和当前项目结构。",
          "estimatedMinutes": 30,
          "sourceRefs": ["chunk-1"]
        }
      ]
    }
  }
}
```

业务规则：

- 同步接口；材料抓取失败、域名不在白名单、AI JSON 校验失败等返回明确错误码（如 `MATERIAL_UNSUPPORTED_DOMAIN`、`MATERIAL_FETCH_FAILED`、`AI_RESPONSE_INVALID`）；上游模型失败返回 `AI_PROVIDER_ERROR`（502）
- 确认学习计划须调用 7.5，本接口不写 `user_learning_paths`

## 7.5 `POST /api/learning/plan-drafts/{id}/confirm`

用途：

- 将学习计划草稿确认并激活为正式学习路径实例

实现说明：

- 物化到 `learning_paths` + `path_steps` + `user_learning_paths` + `user_tasks`，与 onboarding 一致：先将用户所有 `active` 的 `user_learning_paths` 置为 `archived`，再插入新路径与任务，并更新 `current_task_id` / `last_active_task_id`
- 同一草稿重复确认幂等：返回已确认的 `learningPathId` 与 `currentTaskId`

路径参数：

- `id`: 学习计划草稿 UUID

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "learningPathId": "path-runtime-002",
    "currentTaskId": "task-runtime-001",
    "redirectTo": "/learn"
  }
}
```

业务规则：

- 仅允许确认当前登录用户自己的、`status=draft` 的草稿；已确认再调返回 `409 PLAN_DRAFT_ALREADY_CONFIRMED`（并发下亦可能因状态冲突得到该码）
- `learningPathId` 为 **用户路径实例** `user_learning_paths.id`（非模板 `learning_paths.id`）

## 7.6 `POST /api/learning/plan-drafts/{id}/regenerate`

用途：

- 重新生成学习计划草稿；可选更换 `links`，不传则复用原 intake 中保存的链接列表

请求体示例：

```json
{
  "links": ["https://developer.mozilla.org/en-US/docs/Learn"],
  "userGoal": "我更希望任务聚焦页面实战，不想先看太多理论",
  "weeklyHours": 4
}
```

业务规则：

- 仅允许对当前用户名下 `status=draft` 的草稿操作；旧草稿标记为 `superseded` 并写入 `superseded_by_draft_id` 指向新草稿
- 不直接修改当前 active path；仅插入新 intake（若重新抓取）与新 draft

## 7.7 规划中：`POST /api/learning/stuck-help`

用途：

- 用户主动请求卡住帮助

请求体：

```json
{
  "conversationId": "uuid",
  "taskId": "uuid",
  "helpMode": "hint",
  "userProblem": "我不知道 Prompt 怎么写"
}
```

字段说明：

- `helpMode`: `hint` / `breakdown` / `minimal_example`

成功响应：

- 返回一条 AI 教学型帮助消息
- 可同时更新任务状态为 `blocked`

---

## 8. 任务与进度接口

## 8.1 `POST /api/task/complete`

用途：

- 标记任务完成并触发积分计算

请求头：

- `Idempotency-Key: uuid`

请求体：

```json
{
  "taskId": "uuid",
  "conversationId": "uuid"
}
```

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "taskId": "uuid",
    "taskStatus": "completed",
    "scoreDelta": 10,
    "currentScore": 130,
    "rankChanged": false,
    "completionSummary": "你刚学会了如何描述页面结构",
    "nextTask": {
      "taskId": "uuid",
      "title": "优化页面 Prompt"
    }
  }
}
```

业务规则：

- 同一任务重复完成不得重复发分
- 当前首版实现会同步更新 `user_tasks`、`user_learning_paths`、`user_profiles`
- 当前已落地成长写模型：任务完成时会写入 `score_ledgers`，并刷新 `user_ranks`
- 完成当前关卡后，若仍有下一关，则自动推进 `current_task_id` 并把下一关置为 `in_progress`
- 若当前已是最后一关，则整条 `user_learning_path` 自动转为 `completed`

## 8.2 `POST /api/task/update-status`

用途：

- 主动更新任务状态，如卡住、继续

请求体：

```json
{
  "taskId": "uuid",
  "status": "blocked",
  "reason": "环境配置没完成"
}
```

当前首版支持状态：

- `blocked`
- `in_progress`

业务规则：

- 仅允许更新当前 `active` 学习计划中的当前关卡
- `blocked` 会写入 `blocked_at` 与 `block_reason`
- `in_progress` 会清理 `blocked_at` 与 `block_reason`
- 当前 `/learn` 页里的“我完成了”和求助动作已接入这两个真实任务写接口

## 8.3 `GET /api/progress/current`

用途：

- 获取当前用户的进度总览

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "currentTool": {
      "id": "cursor",
      "label": "Cursor"
    },
    "currentPathName": "Cursor 零基础起步营",
    "currentTaskTitle": "理解 Ask 与 Agent 的区别",
    "currentScore": 680,
    "currentRank": "Vibe Coder",
    "streakDays": 7,
    "checkedInToday": true,
    "summary": {
      "totalXP": 680,
      "currentRank": "Vibe Coder",
      "nextRank": "AI 建造者",
      "remainingXPToNextRank": 320,
      "streakDays": 7
    }
  }
}
```

## 8.4 `GET /api/progress/map`

用途：

- 获取闯关地图所需完整节点数据

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "pathName": "Cursor 零基础起步营",
    "pathSummary": "从第一次 AI 对话到第一个迷你项目，建立最小但完整的 Cursor 入门工作流。",
    "totalSteps": 6,
    "completedSteps": 2,
    "currentStageId": 3,
    "stages": [
      {
        "id": 3,
        "taskId": "task-ask-vs-agent",
        "title": "理解 Ask 与 Agent 的区别",
        "summary": "先做一个最小实验，判断 Agent 何时比 Ask 更适合。",
        "goal": "用 Cursor 的 Agent 功能创建一个 React 时钟组件。",
        "completionCriteria": "看到一个可运行的时钟组件，并理解为什么这是 Agent 场景。",
        "reviewSummary": "你已经验证了 Ask 与 Agent 的分工差异，下一步可以进入调试协作。",
        "xp": 10,
        "status": "current",
        "tags": ["Ask 模式", "Agent 模式", "React"],
        "keyPoints": ["Ask 更适合解释概念", "Agent 更适合生成完整文件"],
        "pitfalls": [
          {
            "text": "最常见的卡点：明明想生成文件，却还在 Ask 里反复追问。",
            "isTrap": true
          }
        ],
        "estimatedTime": "8 分钟",
        "focus": "只做一个最小实验：让 Agent 生成一个 React 时钟组件，理解它和 Ask 的职责边界。"
      }
    ]
  }
}
```

业务规则：

- `status=done/current/locked` 是地图 read model 状态，不要求前端从底层任务状态自行推导。
- `unlockHint`、`focus`、`reviewSummary` 属于服务端聚合后的路径展示字段，可来源于步骤模板及当前实例状态。

---

## 9. 成长与历史接口

## 9.1 `GET /api/achievement/summary`

用途：

- 获取成就页数据

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "currentRank": "Vibe Coder",
    "currentScore": 680,
    "nextRank": "AI 建造者",
    "nextRankRemainingXP": 320,
    "completedTaskCount": 14,
    "streakDays": 7,
    "overview": {
      "totalXP": 680,
      "streakDays": 7,
      "monthlyXP": 360,
      "totalCheckinDays": 21,
      "nextRankRemainingXP": 320,
      "earnedBadges": 2
    },
    "ranks": [
      { "code": "rookie", "name": "萌新码农", "minScore": 0, "maxScore": 200 },
      { "code": "apprentice", "name": "AI 学徒", "minScore": 200, "maxScore": 500 },
      { "code": "vibe_coder", "name": "Vibe Coder", "minScore": 500, "maxScore": 1000 }
    ],
    "badges": [
      {
        "code": "first_task",
        "title": "零到一",
        "desc": "完成第一个自由模式的 AI 编程任务",
        "earned": true,
        "progressHint": "已完成第一个任务切入点"
      }
    ],
    "history": [
      {
        "label": "完成「Chat vs Composer」",
        "xp": "+10",
        "time": "2026-03-24T14:32:00+08:00",
        "type": "task"
      }
    ]
  }
}
```

实现约束：

- `ranks.icon`、`ranks.color`、`badges.icon`、`badges.color` 不应作为首期后端权威字段，前端按 `rank.code` / `badge.code` 本地映射图标和样式。
- `stats`、`guideItems`、`calendar.weekDays`、`calendar.dates` 这类强展示型块在首期建议前端静态维护；服务端优先提供累计 XP、连续天数、打卡明细、勋章解锁和 XP 流水。

## 9.2 `GET /api/history/recent`

用途：

- 获取历史学习计划列表

查询参数建议：

- `page`
- `pageSize`
- `status`：可选，`all` / `in_progress` / `interrupted` / `completed` / `abandoned`
- `toolCode`：可选

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "ulp-001",
        "planId": "plan-cursor-basic",
        "title": "Cursor 零基础起步营",
        "summary": "从第一次 AI 对话到第一个迷你项目，建立最小但完整的 Cursor 入门工作流。",
        "tool": "Cursor",
        "level": "入门",
        "mode": "平台训练",
        "progress": {
          "completed": 8,
          "total": 10,
          "percent": 80
        },
        "xpEarned": 680,
        "status": "in_progress",
        "createdAt": "2026-03-15T00:00:00+08:00",
        "updatedAt": "2026-03-27T00:00:00+08:00"
      }
    ],
    "total": 15,
    "page": 1,
    "hasMore": true,
    "filter": "in_progress",
    "summary": {
      "activeCount": 1,
      "interruptedCount": 2,
      "completedCount": 8,
      "abandonedCount": 4,
      "totalCount": 15,
      "activePlanId": "ulp-001",
      "canCreateNewPlan": false
    }
  }
}
```

业务规则：

- 本接口面向 `/history` 页，返回的是“用户的学习路径实例列表”，不是单纯的“最近消息列表”。
- `progress.percent` 为 read model 聚合字段，服务端可直接返回，前端不必自行计算。
- `tool`、`title`、`summary` 等字段来自路径模板快照，避免模板后续改名导致历史记录漂移。
- `in_progress` 是前端展示状态，数据库实际来源为 `user_learning_paths.status = active`。
- `interrupted` 由服务端在读取摘要或历史接口前自动对账；当前规则为最近学习时间距离现在大于等于 7 天时，`active` 自动转为 `interrupted`。
- `summary.canCreateNewPlan = true` 仅代表当前没有 `active` 计划，不代表必须新建；前端也可优先引导用户重新激活 `interrupted` 计划。

## 9.3 `GET /api/history/{id}`

用途：

- 获取单条学习计划的复盘详情，供 `/history` 页右侧复盘弹窗使用

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "detail": {
      "item": {
        "id": "ulp-001",
        "planId": "plan-cursor-basic",
        "title": "Cursor 零基础起步营",
        "summary": "从第一次 AI 对话到第一个迷你项目，建立最小但完整的 Cursor 入门工作流。",
        "tool": "Cursor",
        "level": "入门",
        "mode": "平台训练",
        "progress": {
          "completed": 8,
          "total": 10,
          "percent": 80
        },
        "xpEarned": 680,
        "createdAt": "2026-03-15T00:00:00+08:00",
        "updatedAt": "2026-03-27T00:00:00+08:00",
        "status": "completed"
      },
      "timeline": {
        "startedAt": "2026-03-15T00:00:00+08:00",
        "lastActivityAt": "2026-03-24T10:00:00+08:00",
        "completedAt": "2026-03-27T20:00:00+08:00",
        "interruptedAt": null,
        "abandonedAt": null
      },
      "steps": [
        {
          "id": "step-001",
          "stepNo": 1,
          "title": "安装 Cursor",
          "status": "completed",
          "rewardXp": 80,
          "completedAt": "2026-03-15T10:00:00+08:00"
        }
      ]
    }
  }
}
```

## 9.4 `POST /api/history/{id}/status`

用途：

- 更新历史学习计划状态，支持用户在历史页执行放弃、重新激活、删除记录等动作

请求体：

```json
{
  "action": "reactivate"
}
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `action` | 是 | `abandon` / `reactivate` / `archive` |

业务规则：

- `abandon` 仅允许对 `active` 计划执行，执行后状态转为 `abandoned`。
- `reactivate` 仅允许对 `interrupted` 计划执行，执行后状态转为 `active`。
- `archive` 用于删除历史记录，只允许对 `completed`、`interrupted`、`abandoned` 执行，数据库实际转为 `archived` 软删除。
- 同一时刻最多只允许 1 条 `active` 计划；若当前已有其他 `active` 计划，再激活中断计划时必须返回冲突错误。
- `abandoned` 为用户主动放弃，不支持再次激活；若要重新学习，应新建学习计划。

## 9.5 `POST /api/feedback`

用途：

- 提交新的用户反馈单

请求体：

```json
{
  "feedbackType": "feature_request",
  "title": "希望增加课程续学入口",
  "content": "我退出后再次登录，希望直接看到继续上次计划的明显入口。",
  "contactMethod": "18600165902",
  "source": "settings_popover"
}
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `feedbackType` | 是 | `visual_design` / `interaction_flow` / `feature_request` / `issue_report` |
| `title` | 是 | 4 到 80 个字符 |
| `content` | 是 | 10 到 2000 个字符 |
| `contactMethod` | 否 | 用户希望被联系的手机号、微信号或邮箱 |
| `source` | 否 | 入口来源，如 `settings_popover`、`history_sidebar` |

成功响应：

```json
{
  "code": "OK",
  "message": "feedback created",
  "data": {
    "ticketId": "uuid"
  }
}
```

业务规则：

- 反馈提交后默认状态为 `submitted`
- 提交时应快照用户昵称、手机号、联系邮箱，避免后续用户资料变化影响运营排查

## 9.6 `GET /api/feedback/mine` 与 `GET /api/feedback/mine/{id}`

用途：

- 获取当前用户自己的反馈列表及详情
- 支撑反馈弹窗中的“我的反馈”视图

列表响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "feedbackType": "interaction_flow",
        "feedbackTypeLabel": "交互流程",
        "status": "replied",
        "statusLabel": "已回复",
        "title": "登录后希望直接继续当前计划",
        "contentPreview": "我希望再次登录后优先回到当前计划，而不是重新走 onboarding。",
        "contactMethod": "18600165902",
        "latestReplySnippet": "这个逻辑已经在最新版本修复。",
        "replyCount": 1,
        "submittedAt": "2026-03-30T08:00:00Z",
        "updatedAt": "2026-03-30T09:00:00Z",
        "lastReplyAt": "2026-03-30T09:00:00Z"
      }
    ]
  }
}
```

详情补充规则：

- 详情接口返回完整 `content` 与回复列表 `replies`
- 用户侧只返回对用户可见的回复，不返回内部备注
- `status` 当前支持 `submitted`、`in_review`、`replied`、`closed`

## 9.7 `POST /api/checkin/daily`

用途：

- 完成每日打卡

当前实现说明：

- 首版已落地 `daily_checkins`、`score_ledgers`、`user_ranks` 联动写入
- 同一天重复打卡会幂等返回，不重复发分
- 当前默认每日打卡奖励为 `+5 XP`
- 打卡成功后会刷新 `user_profiles.streak_days`、`last_learning_at`，并同步段位快照

成功响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "checkedIn": true,
    "alreadyCheckedIn": false,
    "checkinDate": "2026-03-30",
    "scoreDelta": 5,
    "streakDays": 4,
    "currentScore": 150,
    "currentRank": "萌新码农",
    "rankChanged": false
  }
}
```

---

## 10. 数据事件接口

## 10.1 规划中：`POST /api/analytics/event`

用途：

- 接收前端业务事件

请求体：

```json
{
  "eventName": "task_completed",
  "pagePath": "/learn",
  "properties": {
    "taskId": "uuid",
    "toolCode": "cursor"
  },
  "occurredAt": "2026-03-23T08:00:00Z"
}
```

业务规则：

- 服务端应补齐 `user_id`
- 非关键事件可异步入库

---

## 11. 管理员后台接口

管理员后台已实现完整前端页面与独立认证体系，采用 Cookie 鉴权（`admin-access-token`），与用户端完全分流。

### 11.0 管理员认证

| 接口 | 方法 | 说明 |
|------|------|------|
| `POST /api/admin/auth/login` | POST | 管理员登录（邮箱+密码） |
| `GET /api/admin/auth/session` | GET | 获取当前管理员会话 |
| `POST /api/admin/auth/logout` | POST | 管理员登出 |

鉴权方式：
- 登录成功后写入 `admin-access-token` Cookie（HttpOnly, SameSite=Lax）
- 与用户端 `app-user-session` Cookie 完全隔离
- 未登录访问 `/admin/*` 会被 `proxy.ts` 中间件重定向到 `/admin/login`

### 11.1 `GET /api/admin/feedback`

用途：

- 按状态、类型、关键词、用户查询反馈单列表

查询参数建议：

- `status`
- `feedbackType`
- `keyword`
- `userId`
- `limit`

### 11.2 `GET /api/admin/feedback/{id}`

用途：

- 获取反馈单详情、用户快照和回复记录

### 11.3 `POST /api/admin/feedback/{id}/reply`

用途：

- 以管理员身份追加回复，并可同步推进状态到 `replied` 或 `closed`

### 11.4 `POST /api/admin/feedback/{id}/status`

用途：

- 单独更新反馈状态，例如从 `submitted` 调整到 `in_review`

---

## 12. 接口权限矩阵

| 接口 | 是否需登录 | 说明 |
|------|------|------|
| `POST /api/auth/login` | 否 | 登录入口 |
| `GET /api/auth/session` | 是 | 首页与营销层恢复当前登录摘要 |
| `GET /api/onboarding/tools` | 否 | 可公开 |
| `GET /api/profile/me` | 是 | 获取侧边栏与用户档案快照 |
| `PATCH /api/profile/me` | 是 | 更新用户资料 |
| `POST /api/profile/avatar` | 是 | 上传用户头像 |
| `POST /api/profile/init` | 是，规划中 | 初始化用户档案 |
| `GET /api/onboarding/path-options` | 是 | 获取路线候选 |
| `POST /api/onboarding/complete` | 是 | 写用户引导结果 |
| `POST /api/learning/message` | 是 | 核心学习数据 |
| `GET /api/learning/current-session` | 是 | 恢复当前学习上下文 |
| `GET /api/learning/messages` | 是 | 分页读取当前学习会话历史消息 |
| `POST /api/learning/plan-from-material` | 是 | 自学模式（`selection_mode=self_directed`）下按白名单链接同步生成学习计划草稿 |
| `POST /api/learning/plan-drafts/{id}/confirm` | 是 | 确认当前用户草稿并物化为 `learning_paths` / `path_steps` / `user_learning_paths` / `user_tasks`，幂等 |
| `POST /api/learning/plan-drafts/{id}/regenerate` | 是 | 为当前用户重生成草稿；旧草稿标记 `superseded`，不直接改 active path |
| `POST /api/learning/stuck-help` | 是，规划中 | 请求卡住帮助 |
| `POST /api/task/complete` | 是 | 写任务完成、推进下一关、同步积分快照 |
| `POST /api/task/update-status` | 是 | 更新当前关卡状态 |
| `GET /api/progress/current` | 是 | 当前路径总览 |
| `GET /api/progress/map` | 是 | 当前路径地图 |
| `GET /api/achievement/summary` | 是 | 私人成长总览 |
| `GET /api/history/recent` | 是 | 私有历史 |
| `GET /api/history/{id}` | 是 | 查看单条学习计划详情 |
| `POST /api/history/{id}/status` | 是 | 更新学习计划状态 |
| `POST /api/feedback` | 是 | 提交用户反馈 |
| `GET /api/feedback/mine` | 是 | 查看我的反馈列表 |
| `GET /api/feedback/mine/{id}` | 是 | 查看我的反馈详情 |
| `GET /api/admin/feedback*` | 管理员 | 管理员反馈查询与回复 |
| `POST /api/admin/auth/login` | 否 | 管理员登录入口 |
| `GET /api/admin/auth/session` | 是 | 获取管理员会话摘要 |
| `POST /api/admin/auth/logout` | 是 | 管理员登出 |
| `GET /api/admin/dashboard/overview` | 是 | 管理员看板数据 |
| `POST /api/checkin/daily` | 是 | 私人打卡写入 |
| `POST /api/analytics/event` | 是，规划中 | 绑定用户事件 |

---

## 13. 典型错误响应示例

## 13.1 未登录

```json
{
  "code": "AUTH_REQUIRED",
  "message": "login required",
  "data": null
}
```

## 13.2 AI 服务异常

```json
{
  "code": "AI_PROVIDER_ERROR",
  "message": "ai service temporarily unavailable",
  "data": null
}
```

## 13.3 任务重复完成

```json
{
  "code": "CONFLICT",
  "message": "task already completed",
  "data": null
}
```

---

## 14. 联调与测试建议

- 所有接口至少提供一个成功响应示例
- 关键接口必须覆盖失败响应示例
- 任务完成、打卡、积分发放必须做幂等测试
- 学习主链路接口必须提供可复现实例数据

---

## 15. 版本控制建议

- 当前文档对应 `v1 MVP API`
- 后续新增支付、社区、多模态能力时，建议按模块新增接口版本说明
- 不建议轻易改动现有字段语义，优先新增字段兼容

---

## 16. 当前前端原型中不建议直接服务端化的字段

以下字段当前存在于前端 mock 或 view model 中，但不建议在 MVP 首期直接作为服务端权威接口字段：

- 图标对象：`icon`
- 颜色样式：`color`、`bg`、`borderColor`
- FAQ 与营销文案：`faqItems`、`marketingPlans`
- 订阅展示文案：`planPriceLabel`、`renewalHint`、`primaryActionLabel`
- 纯展示辅助信息：`guideItems.color`
- 可本地生成的日历展示矩阵：`weekDays`、`dates`

这些内容应优先作为前端静态配置或 BFF 层装配结果存在，避免把表现层细节固化进底层领域接口。

---

## 17. 结论

这套 API 的核心原则，是让前端始终围绕“当前一步”这个业务中心组织体验，而让服务端统一承担鉴权、学习编排、状态推进和成长计算。只要接口边界清晰且幂等控制做稳，MVP 主链路的前后端协作就能保持稳定。
