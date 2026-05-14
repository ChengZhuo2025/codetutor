import test from "node:test"
import assert from "node:assert/strict"

import {
  buildDashScopeTtsSessionUpdate,
  buildDashScopeTtsTextEvents,
  buildPcmWavBuffer,
  normalizeLearningMessageSpeechText,
  resolveLearningTtsVoice,
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
      response_format: "wav",
      sample_rate: 24000,
      mode: "commit",
    },
  })
})

test("buildDashScopeTtsTextEvents uses realtime text buffer event names", () => {
  const eventIds = ["event-append", "event-commit", "event-finish"]
  assert.deepEqual(buildDashScopeTtsTextEvents("你好", () => eventIds.shift() ?? "event-extra"), [
    {
      event_id: "event-append",
      type: "input_text_buffer.append",
      text: "你好",
    },
    {
      event_id: "event-commit",
      type: "input_text_buffer.commit",
    },
    {
      event_id: "event-finish",
      type: "session.finish",
    },
  ])
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
