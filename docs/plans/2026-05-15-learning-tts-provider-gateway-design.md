# 用户端学习播读 TTS Provider Gateway 设计

## 1. 背景

当前 `/learn` AI 回复消息播读通过 `POST /api/learning/message-speech` 调用后台 `text_to_speech` 配置。现有实现主要围绕阿里云百炼 DashScope Realtime TTS WebSocket：

- `qwen3-tts-instruct-flash-realtime`
- `qwen3-tts-flash-realtime`

本地环境可以成功合成并播放，但部署到阿里云服务器后反复出现 25 秒超时。排查日志显示服务器链路可以建立 WebSocket，也能收到 DashScope 的 `session.created`，但无法稳定进入 `session.updated` / `response.created` / `response.audio.delta` 阶段，最终 `audioBytes=0` 超时。该问题已经超出普通业务逻辑错误范围，继续把用户端播读默认路径押在 realtime WebSocket 上，风险较高。

同时，本机另一个项目 `../OpenMAIC` 的 TTS 功能可正常工作。OpenMAIC 的核心实现位于：

- `../OpenMAIC/lib/audio/tts-providers.ts`
- `../OpenMAIC/app/api/generate/tts/route.ts`
- `../OpenMAIC/lib/audio/constants.ts`
- `../OpenMAIC/lib/audio/use-tts-preview.ts`

OpenMAIC 采用统一 TTS provider 入口，根据 provider 分发到不同 HTTP TTS adapter。它的 Qwen TTS 实现没有使用 realtime WebSocket，而是调用 DashScope HTTP 多模态生成接口，获取音频 URL 后下载音频；MiniMax 也是同步 HTTP；前端只关心拿到音频并播放。

## 2. 目标

本设计目标是将 CodeTutor 用户端播读改造成稳定的统一 TTS 网关：

1. `/learn` 前端继续调用 `POST /api/learning/message-speech`，继续接收 `audio/*` Blob，不感知供应商差异。
2. 后端根据管理后台 `/admin/ai/media/transcription-settings` 当前启用的 `text_to_speech` 模型自动选择 TTS adapter。
3. 第一阶段默认使用 HTTP 非实时 TTS，覆盖阿里云百炼 `qwen3-tts-flash`、MiniMax、硅基流动等供应商。
4. 保留 realtime WebSocket adapter 作为未来可选能力，但不再作为用户端播读的默认路径。
5. 管理后台可以随时切换不同供应商、不同 TTS 模型，用户端播读行为保持稳定。

## 3. 非目标

第一阶段不做以下事情：

- 不实现真正的流式音频边合成边播放。
- 不持久化用户端播读音频文件。
- 不新增前端供应商选择逻辑。
- 不要求所有供应商 voice 列表在第一版做到完整自动发现。
- 不继续深挖 DashScope realtime WebSocket 服务器环境兼容问题，除非未来单独恢复 realtime 能力。

## 4. 调研结论

### 4.1 `qwen3-tts-flash` 接入方式更简单

`qwen3-tts-flash` 不需要 realtime WebSocket 会话状态机，可走 DashScope HTTP 非实时 TTS。OpenMAIC 的实现路径是：

1. 请求 `https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
2. 请求体包含：
   - `model`
   - `input.text`
   - `input.voice`
   - `input.language_type`
   - `parameters.rate`
3. 响应中读取 `output.audio.url`
4. 服务端再下载音频 URL
5. 返回音频 bytes 给前端

这条路径绕开了当前服务器上最不稳定的 realtime WebSocket 会话确认问题。

参考：

- OpenMAIC: `../OpenMAIC/lib/audio/tts-providers.ts`
- 阿里云百炼非实时 TTS 文档：https://www.alibabacloud.com/help/en/model-studio/non-realtime-tts-user-guide

### 4.2 MiniMax 和硅基流动也适合统一 HTTP adapter

MiniMax TTS 是同步 HTTP API，典型路径为 `/v1/t2a_v2`，请求中传 `model`、`text`、`voice_setting`、`audio_setting`，响应中 `data.audio` 为 hex 音频，需要转成 bytes。

参考：

- OpenMAIC: `../OpenMAIC/lib/audio/tts-providers.ts`
- MiniMax TTS 文档：https://platform.minimax.io/docs/api-reference/speech-t2a-http

硅基流动提供 OpenAI-compatible 风格的 speech endpoint，典型路径为 `/v1/audio/speech`，直接返回音频二进制，适合实现为 `openai_audio_speech` adapter。

参考：

- SiliconFlow speech API：https://docs.siliconflow.com/en/api-reference/audio/create-speech

### 4.3 OpenMAIC 可借鉴但不应照搬存储方式

OpenMAIC 使用本地 settings store 管理 TTS provider 配置；CodeTutor 已经有数据库驱动的 Provider / Model / Media Transcription Settings / 加密密钥体系，因此只借鉴 adapter 架构，不迁移设置存储方式。

CodeTutor 应继续从以下现有能力读取运行时配置：

- `ai_providers`
- `ai_models`
- `media_transcription_settings`
- Provider 加密 API Key
- Model `metadata`
- `runtime_capabilities=["tts"]`

## 5. 推荐架构

将当前 `server/modules/learning/speech.ts` 中 provider-specific 的 DashScope realtime 实现拆分为统一 TTS Provider Gateway。

建议新增模块结构：

```text
server/modules/learning/tts/
  types.ts
  registry.ts
  errors.ts
  adapters/
    dashscope-http-qwen.ts
    minimax-t2a-v2.ts
    openai-audio-speech.ts
    dashscope-realtime.ts        # 未来保留，不作为默认路径
```

统一入口：

```ts
synthesizeTextToSpeech({
  runtime,
  text,
}): Promise<{
  audio: Buffer
  contentType: string
}>
```

`synthesizeLearningMessageSpeech()` 保持职责简单：

1. 验证当前用户只能播读自己的 assistant message。
2. 读取数据库持久化文本；如果前端传入片段文本，必须能匹配该持久化文本经同一 Markdown 清理与分段规则得到的片段。
3. 清理 Markdown / 空白 / 长度限制。
4. 读取 `resolveLearningMediaTranscriptionModels().textToSpeech`。
5. 调用 `synthesizeTextToSpeech()`。
6. 返回音频 bytes 和 content type。

`/api/learning/message-speech` 路由不需要改变响应形态，仍返回二进制音频。

## 6. Adapter 选择策略

adapter 选择优先级：

1. 优先读取 `runtime.model.metadata.ttsProtocol`
2. 若没有 `ttsProtocol`，根据 provider code / provider type / model name 推断
3. 无法推断时返回配置错误，提示该 TTS 模型尚未支持用户端播读

建议协议枚举：

```ts
type TtsProtocol =
  | "dashscope_http_qwen"
  | "minimax_t2a_v2"
  | "openai_audio_speech"
  | "dashscope_realtime"
```

推断规则示例：

- `modelName` 为 `qwen3-tts-flash` 或 `qwen3-tts-instruct-flash`：`dashscope_http_qwen`
- `provider.code` 包含 `minimax` 或 `modelName` 以 `speech-` 开头：`minimax_t2a_v2`
- `provider.code` 为 `siliconflow` 且 `runtimeCapabilities` 包含 `tts`：`openai_audio_speech`
- `modelName` 包含 `realtime`：`dashscope_realtime`，但第一阶段不推荐启用

## 7. Model Metadata 约定

第一阶段尽量用少量 metadata 支撑跨供应商切换。

### 7.1 阿里云百炼 Qwen HTTP

```json
{
  "ttsProtocol": "dashscope_http_qwen",
  "voice": "Cherry",
  "format": "wav",
  "languageType": "Chinese",
  "speechSpeed": 1.1
}
```

说明：

- `voice` 默认可为 `Cherry`
- `languageType` 默认 `Chinese`
- `speechSpeed` 由管理后台转译设置页维护，0.5–2.0，1.0 为正常语速；Qwen HTTP adapter 会转换为 `parameters.rate`
- `rate` / `speechRate` 仍可作为 Model metadata 高级覆盖
- base URL 建议 provider 配为 `https://dashscope.aliyuncs.com/api/v1`

### 7.2 MiniMax

```json
{
  "ttsProtocol": "minimax_t2a_v2",
  "voice": "male-qn-qingse",
  "format": "mp3",
  "speechSpeed": 1.1,
  "sampleRate": 32000,
  "bitrate": 128000,
  "languageBoost": "auto"
}
```

说明：

- endpoint 使用 `${baseUrl}/v1/t2a_v2`
- `speechSpeed` 会映射到 `voice_setting.speed`
- `output_format` 建议先用 `hex`
- 响应 `data.audio` 转 Buffer
- content type 根据 `extra_info.audio_format` 或 metadata format 决定

### 7.3 硅基流动

```json
{
  "ttsProtocol": "openai_audio_speech",
  "voice": "FunAudioLLM/CosyVoice2-0.5B:alex",
  "format": "mp3",
  "responseFormat": "mp3",
  "speechSpeed": 1.1
}
```

说明：

- endpoint 使用 `${baseUrl}/audio/speech`
- 请求体使用 OpenAI-compatible speech 格式
- `speechSpeed` 会映射到 `/audio/speech` 的 `speed`
- 响应直接是音频二进制
- content type 可按 `responseFormat` 映射
- `FunAudioLLM/*CosyVoice*` 模型未配置 Metadata voice 时，运行时默认推断为 `${modelName}:alex`；管理员仍可通过 `voice` / `ttsVoice` / `defaultVoice` 覆盖。

## 8. 管理后台行为

现有 `/admin/ai/media/transcription-settings` 继续作为 TTS 开关和模型选择入口。

要求：

1. 只有具备 `tts` runtime capability 且启用的模型可选。
2. 切换 `text_to_speech` 模型后，用户端播读立即使用新模型。
3. Model 表单中的 Metadata JSON 用于声明 `ttsProtocol`、voice、format、采样率等供应商参数。
4. 连接测试模式 `tts` 应改为调用统一 TTS adapter 进行短文本真实合成，而不是只做 WebSocket 握手。
5. 后台模型列表和详情页应展示模型类别、运行时用途、连接测试模式，便于管理员确认选择的是 TTS 模型。

建议将后台连接测试文本固定为短句：

```text
你好，我是 CodeTutor AI 教练。
```

测试通过标准：

- adapter 成功返回非空音频 bytes
- content type 可识别
- 不要求后台播放，但可以后续增加试听

## 9. `/learn` 前端行为

前端不感知供应商。

现有流程可保留：

1. 用户点击 AI 回复消息上的播读按钮。
2. 前端用 `splitSpeechTextIntoSegments()` 把正文拆短段。
3. 逐段调用 `/api/learning/message-speech`。
4. 首段音频生成完成即可播放。
5. 后续段边播边预取。
6. 用户可暂停 / 继续 / 取消当前播读。

服务端返回 `audio/wav`、`audio/mpeg`、`audio/mp3` 等 Blob 时，浏览器 `Audio` 都可播放。前端不需要解析 JSON 音频数据，也不需要知道 provider。

## 10. 错误处理

统一错误类型：

### 10.1 配置错误

返回 `503 SERVICE_UNAVAILABLE`。

示例：

- 未启用 `text_to_speech`
- 所选模型不具备 `tts`
- Provider 未配置 API Key
- 无法推断 adapter

新环境迁移默认将 `text_to_speech` 保持停用，管理员需要在 `Ai 管理 / 多媒体管理 / 转译设置` 中选择具备 `tts` 运行时用途的模型并开启后，用户端播读才会可用。

### 10.2 供应商调用错误

返回 `502 AI_PROVIDER_ERROR`。

日志记录：

- requestId
- providerCode
- modelCode
- modelName
- ttsProtocol
- upstreamStatus
- upstreamErrorMessage 摘要
- textLength

不要记录完整 API Key、完整音频、完整长文本。

### 10.3 音频解析错误

返回 `502 AI_PROVIDER_ERROR`。

示例：

- Qwen HTTP 响应缺少 `output.audio.url`
- Qwen 音频 URL 下载失败
- MiniMax 响应缺少 `data.audio`
- MiniMax hex 非法
- SiliconFlow 返回 JSON 错误而不是音频

## 11. 测试计划

### 11.1 单元测试

新增或扩展：

- adapter 选择逻辑
- `ttsProtocol` metadata 优先级
- Qwen speed 到 rate 的转换
- content type 映射
- MiniMax hex 转 Buffer
- Qwen audio URL 下载
- SiliconFlow 二进制响应处理
- 配置错误和供应商错误映射

### 11.2 Route 测试

扩展 `scripts/check-learning-message-speech-route.ts`：

- 当前用户只能播读自己的 assistant message
- `text_to_speech` 选择 Qwen HTTP 时返回 `audio/wav`
- 选择 MiniMax 时返回 `audio/mpeg`
- 选择 SiliconFlow 时返回 `audio/mpeg`
- 缺少配置时返回 `503`
- 上游错误时返回 `502`

### 11.3 管理后台测试

扩展 admin AI / media service 测试：

- `text_to_speech` 只允许选择 `tts` runtime capability 模型
- `connectionTestMode=tts` 使用统一 adapter 做真实短文本合成
- 切换不同模型后 runtime 正确解析到对应 provider/model/metadata

### 11.4 手动验收

至少覆盖：

1. 阿里云百炼 `qwen3-tts-flash`
2. MiniMax `speech-2.8-*`
3. 硅基流动 TTS 模型

每个模型在本地和服务器分别验证：

- `/admin/ai/media/transcription-settings` 启用并切换模型
- `/learn` 同一条 AI 回复可正常播读
- 服务器日志出现 success，且 audioBytes > 0
- 浏览器 Network 返回 200 和非空音频 Blob

## 12. 迁移步骤

建议按以下顺序实施：

1. 新增统一 TTS adapter 类型和 registry。
2. 实现 `dashscope_http_qwen` adapter，并用 `qwen3-tts-flash` 作为第一条可用路径。
3. 将 `synthesizeLearningMessageSpeech()` 改为调用统一入口。
4. 更新 `connectionTestMode=tts` 为真实短文本合成测试。
5. 实现 MiniMax adapter。
6. 实现 SiliconFlow / OpenAI-compatible speech adapter。
7. 更新文档、OpenAPI 描述和后台模型 metadata 示例。
8. 将 realtime adapter 标记为可选/实验，不作为默认推荐。

## 13. 风险与缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| Qwen HTTP 返回临时 audio URL，服务器下载受网络影响 | 播读失败 | 下载失败记录 URL host/status，必要时支持代理或更换 endpoint |
| 不同供应商 voice 命名不统一 | 管理员配置错误 | metadata 明确 `voice`；连接测试做真实合成 |
| content type 判断错误 | 浏览器播放失败 | adapter 必须返回明确 contentType；测试覆盖 |
| 长文本 HTTP TTS 慢 | 用户等待变长 | 继续前端短段拆分和预取 |
| 某些供应商限流 | 502 或慢响应 | 日志区分 rate limit；后续可加缓存和重试 |

## 14. 推荐决策

采用方案 C：

- 本轮建设统一 HTTP TTS Provider Gateway。
- `qwen3-tts-flash` 作为阿里云百炼推荐模型，不再默认使用 `qwen3-tts-*-realtime`。
- MiniMax 和硅基流动通过 adapter 纳入同一入口。
- `/learn` 前端保持 Blob 播放模型。
- realtime WebSocket 作为未来实验能力保留，不阻塞当前用户端播读稳定性。

该方案能最大化复用现有管理后台 Provider/Model/Media Setting 能力，也能借鉴 OpenMAIC 已验证的 HTTP TTS 设计，避免继续被服务器环境下的 realtime WebSocket 会话确认问题阻塞。
