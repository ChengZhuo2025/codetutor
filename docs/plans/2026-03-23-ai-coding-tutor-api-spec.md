# AI编程学习教练 API 接口详细定义文档

> 文档类型：API 接口详细定义文档  
> 产品名称：AI编程学习教练  
> 版本：v1.0  
> 状态：初稿  
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
- `POST /api/onboarding/select-tool`
- `GET /api/onboarding/initial-path`

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

## 4.6 数据事件

- `POST /api/analytics/event`

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

## 6.2 `POST /api/onboarding/select-tool`

用途：

- 提交用户等级与目标工具，生成默认学习路径

请求体：

```json
{
  "learningLevel": "beginner",
  "toolCode": "cursor"
}
```

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "pathId": "uuid",
    "currentTaskId": "uuid",
    "initialPreview": [
      "认识工具界面",
      "写第一个 Prompt",
      "生成第一个页面"
    ]
  }
}
```

业务规则：

- 一个用户必须先完成主工具选择，才能进入学习主界面

## 6.3 `GET /api/onboarding/initial-path`

用途：

- 获取当前用户的初始化学习路径预览

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
      "taskId": "uuid",
      "title": "生成第一个页面",
      "status": "in_progress"
    },
    "messages": [],
    "rightPanel": {
      "currentStep": "先描述你想要的页面结构",
      "completionCriteria": "成功生成一个可见页面",
      "knowledgePoints": ["Prompt", "页面生成"]
    }
  }
}
```

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

返回内容建议：

- 当前工具
- 当前路径
- 当前任务
- 当前积分和段位
- 今日是否已打卡

## 8.4 `GET /api/progress/map`

用途：

- 获取闯关地图所需完整节点数据

返回内容建议：

- 路径名称
- 总步骤数
- 当前进度
- 每个节点的标题、状态、摘要

---

## 9. 成长与历史接口

## 9.1 `GET /api/achievement/summary`

用途：

- 获取成就页数据

成功响应内容建议：

- 当前段位
- 当前积分
- 距离下一段位
- 已完成任务数
- 连续学习天数
- 成就列表
- 技能标签矩阵

## 9.2 `GET /api/history/recent`

用途：

- 获取历史会话列表

查询参数建议：

- `limit`
- `cursor`

成功响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "conversationId": "uuid",
        "toolCode": "cursor",
        "taskTitle": "生成第一个页面",
        "summary": "你刚完成页面结构生成",
        "lastMessageAt": "2026-03-23T08:00:00Z"
      }
    ],
    "nextCursor": null
  }
}
```

## 9.3 `POST /api/checkin/daily`

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

## 11. 接口权限矩阵

| 接口 | 是否需登录 | 说明 |
|------|------|------|
| `POST /api/auth/login` | 否 | 登录入口 |
| `GET /api/onboarding/tools` | 否 | 可公开 |
| `POST /api/onboarding/select-tool` | 是 | 写用户偏好 |
| `POST /api/learning/message` | 是 | 核心学习数据 |
| `POST /api/task/complete` | 是 | 写积分与任务 |
| `GET /api/history/recent` | 是 | 私有历史 |
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

## 15. 结论

这套 API 的核心原则，是让前端始终围绕“当前一步”这个业务中心组织体验，而让服务端统一承担鉴权、学习编排、状态推进和成长计算。只要接口边界清晰且幂等控制做稳，MVP 主链路的前后端协作就能保持稳定。
