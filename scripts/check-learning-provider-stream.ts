import test from "node:test"
import assert from "node:assert/strict"

import { streamAIProvider } from "../server/modules/learning/provider.ts"

function sse(data: string) {
  return `data: ${data}\n\n`
}

test("streamAIProvider returns as soon as OpenAI-compatible stream emits DONE", async () => {
  const originalFetch = globalThis.fetch
  const originalSecret = process.env.MOCK_PROVIDER_SECRET
  const chunks = [
    sse(JSON.stringify({ choices: [{ delta: { content: "你好" } }] })),
    sse(JSON.stringify({ choices: [{ delta: { content: "，继续练习。" }, finish_reason: "stop" }] })),
    sse("[DONE]"),
  ]

  process.env.MOCK_PROVIDER_SECRET = "test-key"
  globalThis.fetch = (async () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder()
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk))
          }
          // Keep the stream technically open. The provider should stop after [DONE].
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
        },
      },
    )) as typeof fetch

  try {
    const deltas: string[] = []
    const result = await streamAIProvider({
      provider: {
        code: "mock",
        providerType: "openai_compatible",
        baseUrl: "https://example.test",
        authMode: "bearer",
        envSecretRef: "MOCK_PROVIDER_SECRET",
        secretCiphertext: null,
        secretIv: null,
        secretAuthTag: null,
        secretKeyVersion: null,
        timeoutMs: 1000,
        retryCount: 0,
      },
      model: {
        code: "mock-model",
        modelName: "mock-model",
      },
      messages: [{ role: "user", content: "继续" }],
      temperature: 0.2,
      maxOutputTokens: 256,
      onTextDelta(delta) {
        deltas.push(delta)
      },
    })

    assert.deepEqual(deltas, ["你好", "，继续练习。"])
    assert.equal(result.content, "你好，继续练习。")
    assert.equal(result.finishReason, "stop")
    assert.equal(result.streamChunkCount, 2)
    assert.equal(result.requestPayloadRedacted.estimatedContentChars, 2)
    assert.equal(typeof result.responsePayloadRedacted.firstChunkLatencyMs, "number")
  } finally {
    globalThis.fetch = originalFetch
    if (originalSecret === undefined) {
      delete process.env.MOCK_PROVIDER_SECRET
    } else {
      process.env.MOCK_PROVIDER_SECRET = originalSecret
    }
  }
})

test("streamAIProvider treats timeout as idle timeout after stream starts", async () => {
  const originalFetch = globalThis.fetch
  const originalSecret = process.env.MOCK_PROVIDER_SECRET
  const encoder = new TextEncoder()

  process.env.MOCK_PROVIDER_SECRET = "test-key"
  globalThis.fetch = (async (_input, init) =>
    new Response(
      new ReadableStream<Uint8Array>({
        async start(controller) {
          const signal = init?.signal
          const abort = () => {
            controller.error(new DOMException("Aborted", "AbortError"))
          }
          signal?.addEventListener("abort", abort, { once: true })

          controller.enqueue(encoder.encode(sse(JSON.stringify({ choices: [{ delta: { content: "第一段" } }] }))))
          await new Promise((resolve) => setTimeout(resolve, 35))
          controller.enqueue(encoder.encode(sse(JSON.stringify({ choices: [{ delta: { content: "第二段" } }] }))))
          await new Promise((resolve) => setTimeout(resolve, 35))
          controller.enqueue(encoder.encode(sse(JSON.stringify({ choices: [{ delta: { content: "第三段" }, finish_reason: "stop" }] }))))
          controller.enqueue(encoder.encode(sse("[DONE]")))
          signal?.removeEventListener("abort", abort)
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
        },
      },
    )) as typeof fetch

  try {
    const deltas: string[] = []
    const result = await streamAIProvider({
      provider: {
        code: "mock",
        providerType: "openai_compatible",
        baseUrl: "https://example.test",
        authMode: "bearer",
        envSecretRef: "MOCK_PROVIDER_SECRET",
        secretCiphertext: null,
        secretIv: null,
        secretAuthTag: null,
        secretKeyVersion: null,
        timeoutMs: 50,
        retryCount: 0,
      },
      model: {
        code: "mock-model",
        modelName: "mock-model",
      },
      messages: [{ role: "user", content: "继续" }],
      temperature: 0.2,
      maxOutputTokens: 256,
      onTextDelta(delta) {
        deltas.push(delta)
      },
    })

    assert.deepEqual(deltas, ["第一段", "第二段", "第三段"])
    assert.equal(result.content, "第一段第二段第三段")
    assert.equal(result.finishReason, "stop")
  } finally {
    globalThis.fetch = originalFetch
    if (originalSecret === undefined) {
      delete process.env.MOCK_PROVIDER_SECRET
    } else {
      process.env.MOCK_PROVIDER_SECRET = originalSecret
    }
  }
})
