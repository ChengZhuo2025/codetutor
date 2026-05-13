# Test Cases: Learning Chat Multimodal Attachments

## Overview
- **Feature**: `/learn` 学习对话图片与语音附件最小闭环
- **Requirements Source**: `docs/plans/2026-05-13-learning-chat-multimodal-attachments.md`
- **Test Coverage**: 前端图片/语音输入、附件上传、消息发送、后端预处理、百炼 vision/ASR 模型路由、历史回放、Admin AI 配置、错误处理
- **Last Updated**: 2026-05-13

## Automated Test Strategy

本功能的自动化验收分为单元测试、路由集成测试、运行时配置集成测试和 live provider 测试。

| 层级 | 命令 | 覆盖内容 |
| --- | --- | --- |
| 单元测试 | `pnpm test:learning-multimodal-attachments` | `vision/asr` capability 模型解析、env override 固定模型、`Qwen3-ASR-Flash` 的 `input_audio` payload、`attachmentIds` 传入消息执行器 |
| 路由集成测试 | `pnpm test:learning-attachments-route` | 附件上传鉴权、图片 MIME 校验、语音 60 秒边界、有效图片 metadata 透传 service |
| 消息 HTTP 集成测试 | `pnpm test:learning-message-http-logic` | JSON/SSE 传输选择、纯附件消息、provider 错误映射、幂等 SSE replay |
| 消息路由集成测试 | `pnpm test:learning-message-route` | `/api/learning/message` 鉴权、JSON 解析、JSON/SSE 响应、provider 错误映射 |
| Live 集成测试 | `pnpm test:learning-message-live:json` | 真实 Supabase + provider 的学习消息 JSON 主链路 |
| 数据库连通与配置 | `pnpm db:check` | 远端 Supabase 连接、核心学习工具数据可读 |

前端录音 UI 的自动化覆盖当前以 lint + 人工 smoke 为主；需人工验证录音按钮、60 秒倒计时、主色进度条、波形动画、停止后音频预览和发送闭环。

## Functional Tests

### TC-F-001: 发送图片 + 文字消息
- **Requirement**: Phase 5 图片选择、上传、发送 `attachmentIds`
- **Priority**: High
- **Preconditions**:
  - 用户已登录并进入 `/learn`
  - 当前存在 active learning session
- **Test Steps**:
  1. 点击输入框左侧图片按钮。
  2. 选择一张 `png/jpg/webp` 截图。
  3. 输入“这个报错是什么意思？”
  4. 点击发送。
- **Expected Results**:
  - 发送前显示图片预览。
  - 前端先调用 `POST /api/learning/attachments`，成功后调用 `POST /api/learning/message`。
  - message 请求体包含 `attachmentIds`。
  - 用户消息气泡展示图片附件。
  - AI 回复能结合图片摘要或视觉输入回答。
  - 后端图片预处理使用 `Qwen3.6-Flash`，并以 `data:<mime>;base64,...` 形式传递私有图片内容。
- **Postconditions**: `learning_message_attachments.message_id` 关联到用户消息。

### TC-F-002: 发送纯图片消息
- **Requirement**: Phase 3/5 允许纯附件消息
- **Priority**: High
- **Preconditions**: 同 TC-F-001
- **Test Steps**:
  1. 选择一张图片。
  2. 不输入文字，直接点击发送。
- **Expected Results**:
  - 发送按钮可用。
  - message 请求 `content` 可为空字符串，`attachmentIds` 非空。
  - 后端不返回 `VALIDATION_FAILED`。
  - AI 回复提示基于截图内容进行分析。
- **Postconditions**: 用户消息文本使用默认图片说明或后端标准化内容。

### TC-F-003: 录制并发送语音消息
- **Requirement**: Phase 5 语音录制、上传、ASR 后发送
- **Priority**: High
- **Preconditions**:
  - 浏览器允许麦克风权限
  - 后台存在 `asr` capability 模型
- **Test Steps**:
  1. 点击麦克风按钮开始录音。
  2. 说一句技术问题。
  3. 点击停止。
  4. 确认语音预览出现后点击发送。
- **Expected Results**:
  - 录音时发送按钮不可用，图片按钮不可用。
  - 输入区切换为主色调录音状态，显示 60 秒倒计时、横向进度条和动态波形柱。
  - 停止后显示语音预览播放器。
  - 附件上传 kind 为 `audio`。
  - 后端通过 `Qwen3-ASR-Flash` 的 `/chat/completions` + `input_audio` 生成 `transcript_text` 并注入教学上下文。
  - AI 按语音内容回复。
- **Postconditions**: 历史消息可显示语音附件与识别文本。

### TC-F-005: Admin AI 媒体 Agent 默认模型展示
- **Requirement**: Phase 4 media agent 配置与模型能力一致
- **Priority**: Medium
- **Preconditions**: 已执行 `supabase/seeds/005_ai_provider_and_model_registry.sql` 和 `supabase/seeds/006_ai_agent_and_binding_registry.sql`
- **Test Steps**:
  1. 登录管理后台。
  2. 打开 AI 管理的 Agent 管理列表。
  3. 查看“学习图片理解转译助手”和“学习语音转写助手”。
- **Expected Results**:
  - “学习图片理解转译助手”的默认 Provider / Model 为 `阿里云百炼 / Qwen3.6-Flash`。
  - “学习语音转写助手”的默认 Provider / Model 为 `阿里云百炼 / Qwen3-ASR-Flash`。

### TC-F-004: 历史消息回放附件
- **Requirement**: Phase 3 `GET /api/learning/messages` 返回附件元数据
- **Priority**: High
- **Preconditions**: 当前会话已有图片或语音附件消息
- **Test Steps**:
  1. 刷新 `/learn` 页面。
  2. 或点击“加载更早消息”。
- **Expected Results**:
  - 图片/语音附件元数据随消息返回。
  - 不依赖本地 object URL 的历史图片如无展示 URL，也不导致页面崩溃。
  - 语音消息显示附件名称、处理状态、识别文本。

## Edge Case Tests

### TC-E-001: 图片格式边界
- **Requirement**: 仅支持 `png/jpg/jpeg/webp`
- **Priority**: Medium
- **Test Steps**:
  1. 上传 `gif` 或 `txt` 文件并选择 kind=image。
- **Expected Results**:
  - 接口返回 422。
  - 文案为“图片仅支持 JPG、PNG、WebP 格式。”

### TC-E-002: 语音时长边界
- **Requirement**: 单条语音最长 60 秒
- **Priority**: Medium
- **Test Steps**:
  1. 上传 durationMs 大于 60000 的语音附件。
- **Expected Results**:
  - 接口返回 422。
  - 文案为“单条语音不能超过 60 秒。”

### TC-E-004: 录音自动停止边界
- **Requirement**: 前端录音最长 60 秒
- **Priority**: Medium
- **Test Steps**:
  1. 点击麦克风按钮开始录音。
  2. 不手动停止，等待倒计时到 `0:00`。
- **Expected Results**:
  - 录音自动停止。
  - 自动生成语音附件预览。
  - 发送按钮恢复可用。
  - 上传时 `durationMs` 不超过 `60000`。

### TC-E-003: 文本消息不受附件能力影响
- **Requirement**: 兼容原有纯文本学习消息
- **Priority**: High
- **Test Steps**:
  1. 不选择附件，发送普通问题。
- **Expected Results**:
  - 请求不包含 `attachmentIds`。
  - 原有 SSE 流式回复正常。
  - 任务状态联动正常。

## Error Handling Tests

### TC-ERR-001: 未登录上传附件
- **Requirement**: 附件上传必须鉴权
- **Priority**: High
- **Test Steps**:
  1. 未登录调用 `POST /api/learning/attachments`。
- **Expected Results**:
  - 返回 401 `AUTH_REQUIRED`。
  - 不写入 storage 和附件表。

### TC-ERR-002: ASR 未配置时发送纯语音
- **Requirement**: 语音转写失败必须给明确错误
- **Priority**: High
- **Test Steps**:
  1. 暂时停用所有 `asr` capability 模型。
  2. 发送纯语音消息。
- **Expected Results**:
  - 后端返回明确错误：“当前未配置 ASR 模型，暂时无法识别语音消息。”
  - 前端展示消息发送失败卡片。
  - 可重试。

### TC-ERR-003: 附件归属错误
- **Requirement**: 用户只能使用自己的附件
- **Priority**: High
- **Test Steps**:
  1. 用户 A 上传附件。
  2. 用户 B 使用该 `attachmentId` 发送消息。
- **Expected Results**:
  - 后端返回 `VALIDATION_FAILED`。
  - 不调用 AI provider。

## State Transition Tests

### TC-ST-001: 附件处理状态流转
- **Requirement**: `pending -> processing -> completed/failed`
- **Priority**: Medium
- **Test Steps**:
  1. 上传附件。
  2. 发送消息触发预处理。
  3. 查询 `learning_message_attachments`。
- **Expected Results**:
  - 上传后为 `pending`。
  - 预处理阶段更新为 `processing`。
  - 成功后为 `completed`，并写入 `visual_summary/extracted_text` 或 `transcript_text`。
  - 失败后为 `failed`，并写入 `error_message`。

## Test Coverage Matrix

| Requirement ID | Test Cases | Coverage Status |
| --- | --- | --- |
| REQ-ATTACH-UPLOAD | TC-F-001, TC-F-003, TC-E-001, TC-ERR-001 | Complete |
| REQ-MESSAGE-ATTACHMENT-IDS | TC-F-001, TC-F-002, TC-E-003 | Complete |
| REQ-IMAGE-VISION | TC-F-001, TC-F-002, TC-ST-001 | Complete |
| REQ-AUDIO-ASR | TC-F-003, TC-E-002, TC-ERR-002, TC-ST-001 | Complete |
| REQ-HISTORY-REPLAY | TC-F-004 | Complete |
| REQ-OWNERSHIP | TC-ERR-003 | Complete |
| REQ-ADMIN-MEDIA-AGENTS | TC-F-005 | Complete |
| REQ-RECORDING-UI | TC-F-003, TC-E-004 | Complete |

## Automated Verification Commands

Run:

```bash
pnpm lint
pnpm test:learning-multimodal-attachments
pnpm test:learning-message-http-logic
pnpm test:learning-attachments-route
pnpm test:learning-message-route
pnpm test:learning-message-live:json
pnpm db:check
```

## Notes

- Phase 5 当前实现的是单附件最小闭环：单条消息可发送一张图片或一条语音。
- 图片历史回放当前返回附件元数据；私有图片长期回放如需显示原图，需要后续增加后端签名 URL 查询或代理读取接口。
- AI 语音回复 TTS 不在本阶段范围内。
- 浏览器麦克风授权、真实图片理解和真实语音识别仍需在本地 dev server 上做人工 smoke；自动化 live JSON 主要覆盖学习消息主链路，不上传真实媒体文件。
