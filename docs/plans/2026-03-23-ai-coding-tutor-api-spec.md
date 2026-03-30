# AI编程学习教练 API 接口详细定义文档

> 文档类型：API 接口详细定义文档  
> 产品名称：AI编程学习教练  
> 版本：v1.1  
> 状态：已按前端原型校准  
> 创建日期：2026-03-23  
> 适用阶段：MVP  
> 关联文档：`docs/plans/2026-03-23-ai-coding-tutor-technical-architecture.md`

---

## 1. 文档目标

本文档定义 AI编程学习教练 MVP 的服务端 API，包含接口分组、认证方式、请求响应结构、参数定义、业务规则、错误码和幂等要求，作为前后端联调与测试依据。

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
  "message": "login required",
  "data": null
}
```

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
| `RATE_LIMITED` | 请求频率过高 |
| `INTERNAL_ERROR` | 系统内部错误 |

---

## 4. 接口分组总览

## 4.1 认证与档案

- `POST /api/auth/login`
- `GET /api/profile/me`
- `POST /api/profile/init`

## 4.2 新手引导

- `GET /api/onboarding/tools`
- `GET /api/onboarding/path-options`
- `POST /api/onboarding/complete`

## 4.3 学习核心

- `POST /api/learning/message`
- `GET /api/learning/current-session`
- `POST /api/learning/stuck-help`

## 4.4 任务与进度

- `POST /api/task/complete`
- `POST /api/task/update-status`
- `GET /api/progress/current`
- `GET /api/progress/map`

## 4.5 成长与历史

- `GET /api/achievement/summary`
- `GET /api/history/recent`
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

- `POST /api/analytics/event`

## 4.8 当前前端页面与接口映射

基于当前前端原型，MVP 首期真正要打通的页面与接口对应关系如下：

| 页面 | 路由 | 主要接口 | 说明 |
|------|------|------|------|
| 登录页 | `/login` | `POST /api/auth/login`、`GET /api/profile/me` | 登录成功后判断是否新用户、是否已完成 onboarding |
| 新手引导 | `/onboarding` | `GET /api/onboarding/tools`、`GET /api/onboarding/path-options`、`POST /api/onboarding/complete` | 产出主工具、学习等级、学习模式、初始学习路径实例 |
| 学习页 | `/learn` | `GET /api/learning/current-session`、`POST /api/learning/message`、`POST /api/learning/stuck-help`、`POST /api/task/update-status`、`POST /api/task/complete` | 学习主链路核心 |
| 地图页 | `/map` | `GET /api/progress/current`、`GET /api/progress/map` | 展示当前路径实例及各关卡状态 |
| 成就页 | `/achievements` | `GET /api/achievement/summary`、`GET /api/history/recent`、`POST /api/checkin/daily` | 成长总览和 XP 流水 |
| 历史页 | `/history` | `GET /api/history/recent` | 当前前端实际需要的是“历史学习计划列表”，而不是“最近对话列表” |
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

## 5.2 `GET /api/profile/me`

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

## 5.3 `POST /api/profile/init`

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

请求体：

```json
{
  "conversationId": "uuid",
  "taskId": "uuid",
  "inputType": "link",
  "content": "https://example.com/tutorial",
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
| `inputType` | 是 | `text` / `link` / `code` |
| `content` | 是 | 用户输入内容 |
| `clientContext` | 否 | 页面与调试上下文 |

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "conversationId": "uuid",
    "taskId": "uuid",
    "assistantMessage": {
      "messageId": "uuid",
      "currentGoal": "熟悉 Cursor 的工作区",
      "currentStep": "先打开 Cursor，并确认左侧文件树可见",
      "whyThisStep": "先完成环境熟悉，后续 Prompt 才不会卡在界面操作",
      "hintIfStuck": "如果左侧文件树没显示，尝试从 View 菜单恢复",
      "knowledgePoints": ["工作区", "文件树", "基础界面"],
      "nextStepPreview": "下一步会让你输入第一个 Prompt"
    },
    "taskState": "in_progress"
  }
}
```

错误场景：

- 链接解析失败
- AI 输出结构化校验失败
- 用户当前无有效学习路径

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
- `quickActions`、`supportOptions`、`tips`、`knowledgeTags.color` 等字段偏展示层，可在首期先由前端保留静态配置；如果服务端返回，也应视为可选扩展字段，而不是底层数据库实体。
- `messages.role` 在服务端内部建议使用 `assistant`，若前端仍保留 `ai`，可在 BFF DTO 层做映射。

## 7.3 `POST /api/learning/stuck-help`

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
- 必须在事务内完成任务状态与积分写入

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
- `status`：可选，`in_progress` / `completed` / `abandoned`
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
        "tool": {
          "code": "cursor",
          "name": "Cursor"
        },
        "learningLevel": "beginner",
        "selectionMode": "preset_training",
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
    "hasMore": true
  }
}
```

业务规则：

- 本接口面向 `/history` 页，返回的是“用户的学习路径实例列表”，不是单纯的“最近消息列表”。
- `progress.percent` 为 read model 聚合字段，服务端可直接返回，前端不必自行计算。
- `tool.name`、`title`、`summary` 等字段来自路径模板快照，避免模板后续改名导致历史记录漂移。

## 9.3 `POST /api/feedback`

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

## 9.4 `GET /api/feedback/mine` 与 `GET /api/feedback/mine/{id}`

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

## 9.5 `POST /api/checkin/daily`

用途：

- 完成每日打卡

请求头：

- `Idempotency-Key: uuid`

成功响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "checkedIn": true,
    "scoreDelta": 20,
    "streakDays": 4,
    "currentScore": 150
  }
}
```

---

## 10. 数据事件接口

## 10.1 `POST /api/analytics/event`

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

## 11. 管理员反馈接口

管理员接口首期不提供后台页面，但先提供后端能力，默认使用 `x-admin-secret` 请求头做临时鉴权。

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

## 11. 接口权限矩阵

| 接口 | 是否需登录 | 说明 |
|------|------|------|
| `POST /api/auth/login` | 否 | 登录入口 |
| `GET /api/onboarding/tools` | 否 | 可公开 |
| `GET /api/profile/me` | 是 | 获取侧边栏与用户档案快照 |
| `POST /api/profile/init` | 是 | 初始化用户档案 |
| `GET /api/onboarding/path-options` | 是 | 获取路线候选 |
| `POST /api/onboarding/complete` | 是 | 写用户引导结果 |
| `POST /api/learning/message` | 是 | 核心学习数据 |
| `GET /api/learning/current-session` | 是 | 恢复当前学习上下文 |
| `POST /api/learning/stuck-help` | 是 | 请求卡住帮助 |
| `POST /api/task/complete` | 是 | 写积分与任务 |
| `POST /api/task/update-status` | 是 | 更新任务状态 |
| `GET /api/progress/current` | 是 | 当前路径总览 |
| `GET /api/progress/map` | 是 | 当前路径地图 |
| `GET /api/achievement/summary` | 是 | 私人成长总览 |
| `GET /api/history/recent` | 是 | 私有历史 |
| `POST /api/checkin/daily` | 是 | 私人打卡写入 |
| `POST /api/analytics/event` | 是 | 绑定用户事件 |

---

## 12. 典型错误响应示例

## 12.1 未登录

```json
{
  "code": "AUTH_REQUIRED",
  "message": "login required",
  "data": null
}
```

## 12.2 AI 服务异常

```json
{
  "code": "AI_PROVIDER_ERROR",
  "message": "ai service temporarily unavailable",
  "data": null
}
```

## 12.3 任务重复完成

```json
{
  "code": "CONFLICT",
  "message": "task already completed",
  "data": null
}
```

---

## 13. 联调与测试建议

- 所有接口至少提供一个成功响应示例
- 关键接口必须覆盖失败响应示例
- 任务完成、打卡、积分发放必须做幂等测试
- 学习主链路接口必须提供可复现实例数据

---

## 14. 版本控制建议

- 当前文档对应 `v1 MVP API`
- 后续新增支付、社区、多模态能力时，建议按模块新增接口版本说明
- 不建议轻易改动现有字段语义，优先新增字段兼容

---

## 15. 当前前端原型中不建议直接服务端化的字段

以下字段当前存在于前端 mock 或 view model 中，但不建议在 MVP 首期直接作为服务端权威接口字段：

- 图标对象：`icon`
- 颜色样式：`color`、`bg`、`borderColor`
- FAQ 与营销文案：`faqItems`、`marketingPlans`
- 订阅展示文案：`planPriceLabel`、`renewalHint`、`primaryActionLabel`
- 纯展示辅助信息：`guideItems.color`
- 可本地生成的日历展示矩阵：`weekDays`、`dates`

这些内容应优先作为前端静态配置或 BFF 层装配结果存在，避免把表现层细节固化进底层领域接口。

---

## 16. 结论

这套 API 的核心原则，是让前端始终围绕“当前一步”这个业务中心组织体验，而让服务端统一承担鉴权、学习编排、状态推进和成长计算。只要接口边界清晰且幂等控制做稳，MVP 主链路的前后端协作就能保持稳定。
