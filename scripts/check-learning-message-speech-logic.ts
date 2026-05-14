import test from "node:test"
import assert from "node:assert/strict"

import {
  buildPcmWavBuffer,
  normalizeLearningMessageSpeechText,
} from "../server/modules/learning/speech.ts"

test("normalizeLearningMessageSpeechText trims whitespace and caps long text", () => {
  const longText = `  ${"你好，AI 教练。".repeat(300)}  `
  const normalized = normalizeLearningMessageSpeechText(longText)

  assert.equal(normalized.length, 2000)
  assert.equal(normalized.startsWith("你好，AI 教练。"), true)
  assert.equal(normalized.endsWith(" "), false)
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
