import test from "node:test"
import assert from "node:assert/strict"

import {
  buildDashScopeTtsAuthorizationHeader,
  buildDashScopeTtsFinishEvent,
  buildDashScopeTtsSessionUpdate,
  buildDashScopeTtsTextEvents,
  buildPcmWavBuffer,
  createDashScopeTtsSessionUpdateTracker,
  isDashScopeTtsTerminalEvent,
  normalizeLearningMessageSpeechText,
  resolveDashScopeTtsCloseErrorMessage,
  resolveLearningMessageSpeechTimeoutMs,
  resolveLearningMessageSpeechSourceText,
  resolveLearningTtsInstructions,
  resolveLearningTtsVoice,
  summarizeDashScopeTtsServerEvent,
} from "../server/modules/learning/speech.ts"
import {
  normalizeSpeechTextForTts,
  splitSpeechTextIntoSegments,
} from "../lib/learning/speech-text.ts"

const runtime = {
  provider: {
    code: "aliyun",
    providerType: "openai_compatible" as const,
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    authMode: "bearer" as const,
    envSecretRef: "TEST_KEY",
    secretCiphertext: null,
    secretIv: null,
    secretAuthTag: null,
    secretKeyVersion: null,
    timeoutMs: 30000,
    retryCount: 1,
  },
  model: {
    code: "qwen3-tts-flash-realtime",
    modelName: "qwen3-tts-flash-realtime",
    defaultMaxOutputTokens: 2048,
    recommendedTemperature: null,
    metadata: {},
  },
}

test("normalizeLearningMessageSpeechText trims whitespace and caps long text", () => {
  const longText = `  ${"你好，AI 教练。".repeat(300)}  `
  const normalized = normalizeLearningMessageSpeechText(longText)

  assert.equal(normalized.length, 2000)
  assert.equal(normalized.startsWith("你好，AI 教练。"), true)
  assert.equal(normalized.endsWith(" "), false)
})

test("normalizeSpeechTextForTts removes markdown style markers before synthesis", () => {
  const normalized = normalizeSpeechTextForTts(`
## 关键提醒

- **保持风格统一**：按钮的 \`blur\` 参数尽量一致。
- **注意文字可读性**：如果文字看不清，直接说“调亮文字”。

---

1. 添加玻璃按钮
`)

  assert.equal(
    normalized,
    "关键提醒。保持风格统一：按钮的 blur 参数尽量一致。注意文字可读性：如果文字看不清，直接说“调亮文字”。添加玻璃按钮",
  )
  assert.equal(normalized.includes("减减减"), false)
  assert.equal(/[*#`]/.test(normalized), false)
})

test("splitSpeechTextIntoSegments returns short readable chunks", () => {
  const segments = splitSpeechTextIntoSegments(
    "第一句先播放。第二句也很短。第三句包含更多内容，用来模拟比较长的 AI 回复，前端应该可以先播放前面的片段，再继续生成后面的片段。第四句继续补充更多建议，确保较长内容会被拆成多个可播放片段。",
  )

  assert.ok(segments.length > 1)
  assert.ok(segments[0].startsWith("第一句先播放。"))
  assert.ok(segments.every((segment) => segment.length <= 135))
})

test("normalizeLearningMessageSpeechText rejects empty text", () => {
  assert.throws(
    () => normalizeLearningMessageSpeechText("   \n\t  "),
    /没有可播读的 AI 回复内容/,
  )
})

test("resolveLearningMessageSpeechSourceText falls back to persisted assistant content when client text is blank", () => {
  assert.equal(
    resolveLearningMessageSpeechSourceText("   ", "数据库里的最终 AI 回复。"),
    "数据库里的最终 AI 回复。",
  )
})

test("resolveLearningMessageSpeechSourceText only accepts text segments from persisted assistant content", () => {
  const persisted = "第一句先播放。第二句也很短。第三句包含更多内容，用来模拟比较长的 AI 回复，前端应该可以先播放前面的片段，再继续生成后面的片段。第四句继续补充更多建议，确保较长内容会被拆成多个可播放片段。"
  const segment = splitSpeechTextIntoSegments(persisted)[0]

  assert.equal(
    resolveLearningMessageSpeechSourceText(segment, persisted),
    segment,
  )
  assert.throws(
    () => resolveLearningMessageSpeechSourceText("这是一段不属于该消息的任意文本。", persisted),
    /请求播读文本必须来自该 AI 回复内容/,
  )
})

test("resolveLearningMessageSpeechTimeoutMs caps user-facing TTS below gateway timeouts", () => {
  assert.equal(resolveLearningMessageSpeechTimeoutMs(60_000), 25_000)
  assert.equal(resolveLearningMessageSpeechTimeoutMs(2_000), 5_000)
  assert.equal(resolveLearningMessageSpeechTimeoutMs(12_000), 12_000)
})

test("resolveDashScopeTtsCloseErrorMessage explains empty provider close", () => {
  assert.equal(
    resolveDashScopeTtsCloseErrorMessage(1006, ""),
    "TTS provider closed before returning audio (code 1006)",
  )
  assert.equal(
    resolveDashScopeTtsCloseErrorMessage(1008, "policy rejected"),
    "TTS provider closed before returning audio (code 1008: policy rejected)",
  )
})

test("buildPcmWavBuffer wraps pcm bytes with a playable wav header", () => {
  const pcm = Buffer.from([1, 2, 3, 4])
  const wav = buildPcmWavBuffer(pcm, {
    sampleRate: 24000,
    channels: 1,
    bitsPerSample: 16,
  })

  assert.equal(wav.toString("ascii", 0, 4), "RIFF")
  assert.equal(wav.toString("ascii", 8, 12), "WAVE")
  assert.equal(wav.toString("ascii", 12, 16), "fmt ")
  assert.equal(wav.toString("ascii", 36, 40), "data")
  assert.equal(wav.readUInt32LE(40), pcm.length)
  assert.deepEqual(wav.subarray(44), pcm)
})

test("buildDashScopeTtsSessionUpdate uses supported response format and sample rate", () => {
  assert.deepEqual(buildDashScopeTtsSessionUpdate(runtime, () => "event-session"), {
    event_id: "event-session",
    type: "session.update",
    session: {
      voice: "Cherry",
      response_format: "pcm",
      sample_rate: 24000,
      mode: "server_commit",
      language_type: "Auto",
    },
  })
})

test("buildDashScopeTtsSessionUpdate includes default instructions for instruct realtime models", () => {
  const instructRuntime = {
    ...runtime,
    model: {
      ...runtime.model,
      modelName: "qwen3-tts-instruct-flash-realtime",
    },
  }

  const event = buildDashScopeTtsSessionUpdate(instructRuntime, () => "event-session")
  const instructions = event.session.instructions

  assert.ok(typeof instructions === "string")
  assert.ok(instructions.length > 0)
  assert.equal(event.session.optimize_instructions, false)
})

test("resolveLearningTtsInstructions supports metadata override", () => {
  assert.equal(resolveLearningTtsInstructions(runtime), null)
  assert.equal(
    resolveLearningTtsInstructions({
      ...runtime,
      model: {
        ...runtime.model,
        modelName: "qwen3-tts-instruct-flash-realtime",
        metadata: {
          ttsInstructions: "语速稍快，语气耐心。",
          optimizeInstructions: true,
        },
      },
    }),
    "语速稍快，语气耐心。",
  )
})

test("isDashScopeTtsTerminalEvent treats all DashScope completion events as terminal", () => {
  assert.equal(isDashScopeTtsTerminalEvent("response.audio.done"), true)
  assert.equal(isDashScopeTtsTerminalEvent("response.done"), true)
  assert.equal(isDashScopeTtsTerminalEvent("session.finished"), true)
  assert.equal(isDashScopeTtsTerminalEvent("response.audio.delta"), false)
})

test("buildDashScopeTtsTextEvents appends text without immediately finishing the session", () => {
  const eventIds = ["event-append"]
  assert.deepEqual(buildDashScopeTtsTextEvents("你好", () => eventIds.shift() ?? "event-extra"), [
    {
      event_id: "event-append",
      type: "input_text_buffer.append",
      text: "你好",
    },
  ])
})

test("buildDashScopeTtsFinishEvent creates a separate delayed finish event", () => {
  assert.deepEqual(buildDashScopeTtsFinishEvent(() => "event-finish"), {
    event_id: "event-finish",
    type: "session.finish",
  })
})

test("createDashScopeTtsSessionUpdateTracker waits for session.updated before text", () => {
  const tracker = createDashScopeTtsSessionUpdateTracker()

  assert.equal(tracker.shouldSendSynthesisEvents(), false)
  tracker.markSessionUpdateSent()
  assert.equal(tracker.shouldSendSynthesisEvents(), false)
  assert.equal(tracker.shouldFallbackSynthesis(), false)
  tracker.markSessionUpdated()
  assert.equal(tracker.shouldSendSynthesisEvents(), true)
})

test("createDashScopeTtsSessionUpdateTracker allows one fallback when session.updated never arrives", () => {
  const tracker = createDashScopeTtsSessionUpdateTracker()
  tracker.markSessionUpdateSent()
  assert.equal(tracker.shouldFallbackSynthesis(), false)
  tracker.markSessionUpdateTimedOut()
  assert.equal(tracker.shouldFallbackSynthesis(), true)
  assert.equal(tracker.shouldFallbackSynthesis(), false)
})

test("buildDashScopeTtsAuthorizationHeader uses the official Bearer scheme casing", () => {
  assert.equal(buildDashScopeTtsAuthorizationHeader("sk-test"), "Bearer sk-test")
})

test("summarizeDashScopeTtsServerEvent captures safe server event diagnostics", () => {
  assert.deepEqual(
    summarizeDashScopeTtsServerEvent({
      type: "response.created",
      event_id: "event-1",
      response: { id: "resp-1" },
    }),
    {
      serverEventType: "response.created",
      serverEventId: "event-1",
      serverResponseId: "resp-1",
      serverSessionId: undefined,
      serverItemId: undefined,
      serverErrorCode: undefined,
      serverErrorMessage: undefined,
      serverEventKeys: ["event_id", "response", "type"],
    },
  )
})

test("normalizeSpeechTextForTts filters serial number prefixes for TTS playback", () => {
  assert.equal(
    normalizeSpeechTextForTts("- 项目一\n-项目二\n-   项目三"),
    "项目一。项目二。项目三",
  )

  assert.equal(
    normalizeSpeechTextForTts("1. 第一步\n2.第二步\n3)、第三步"),
    "第一步。第二步。第三步",
  )

  assert.equal(
    normalizeSpeechTextForTts("(1) 步骤一\n(2)步骤二\n(3)  步骤三"),
    "步骤一。步骤二。步骤三",
  )

  assert.equal(
    normalizeSpeechTextForTts("#1 任务\n#2任务\n#  任务"),
    "任务。任务。任务",
  )

  assert.equal(
    normalizeSpeechTextForTts("- 无序列号内容"),
    "无序列号内容",
  )

  assert.equal(
    normalizeSpeechTextForTts("普通文本没有序列号前缀。"),
    "普通文本没有序列号前缀。",
  )
})

test("resolveLearningTtsVoice supports model metadata override", () => {
  assert.equal(resolveLearningTtsVoice(runtime), "Cherry")
  assert.equal(
    resolveLearningTtsVoice({
      ...runtime,
      model: {
        ...runtime.model,
        metadata: {
          ttsVoice: "Ethan",
        },
      },
    }),
    "Ethan",
  )
})
