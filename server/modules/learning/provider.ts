import "server-only"

import { resolveProviderSecret } from "@/server/lib/secrets/provider-secret"
import { LearningAIProviderError } from "./errors.ts"

type AIProviderConfig = {
  code: string
  providerType: "siliconflow" | "openai_compatible" | "anthropic"
  baseUrl: string
  authMode: "bearer" | "api_key_header"
  envSecretRef: string | null
  secretCiphertext: string | null
  secretIv: string | null
  secretAuthTag: string | null
  secretKeyVersion: string | null
  timeoutMs: number
  retryCount: number
}

type AIModelConfig = {
  code: string
  modelName: string
}

export type AIChatContentPart =
  | {
      type: "text"
      text: string
    }
  | {
      type: "image_url"
      image_url: {
        url: string
      }
    }
  | {
      type: "audio_url"
      audio_url: {
        url: string
      }
    }
  | {
      type: "video_url"
      video_url: {
        url: string
      }
    }

export type AIChatMessage = {
  role: "system" | "user" | "assistant"
  content: string | AIChatContentPart[]
}

export type AIProviderResult = {
  content: string
  finishReason: string | null
  streamChunkCount: number
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  requestPayloadRedacted: Record<string, unknown>
  responsePayloadRedacted: Record<string, unknown>
}

type InvokeAIProviderInput = {
  provider: AIProviderConfig
  model: AIModelConfig
  messages: AIChatMessage[]
  temperature: number
  maxOutputTokens: number
}

type StreamAIProviderInput = InvokeAIProviderInput & {
  onTextDelta: (delta: string) => Promise<void> | void
}

type OpenAICompatibleChoice = {
  finish_reason?: string | null
  message?: OpenAICompatibleMessage
  delta?: {
    content?: string | Array<{ type?: string; text?: string }>
  }
}

type OpenAICompatibleMessage = {
  content?: string | Array<{ type?: string; text?: string }>
}

type OpenAICompatibleResponse = {
  id?: string
  choices?: OpenAICompatibleChoice[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

function getProviderSecret(provider: AIProviderConfig) {
  const resolved = resolveProviderSecret({
    secret_ref: provider.envSecretRef,
    secret_ciphertext: provider.secretCiphertext,
    secret_iv: provider.secretIv,
    secret_auth_tag: provider.secretAuthTag,
    secret_key_version: provider.secretKeyVersion,
  })

  if (!resolved.secret) {
    const refLabel = provider.envSecretRef ? ` or env fallback ${provider.envSecretRef}` : ""
    throw new LearningAIProviderError(`Missing required provider secret for ${provider.code}${refLabel}`)
  }

  return resolved.secret
}

function toResponseText(content: OpenAICompatibleMessage["content"] | undefined) {
  if (typeof content === "string") {
    return content.trim()
  }

  if (!Array.isArray(content)) {
    return ""
  }

  return content
    .map((item) => (item?.type === "text" ? item.text ?? "" : ""))
    .join("")
    .trim()
}

function toDeltaText(
  content: string | Array<{ type?: string; text?: string }> | undefined,
) {
  if (typeof content === "string") {
    return content
  }

  if (!Array.isArray(content)) {
    return ""
  }

  return content
    .map((item) => (item?.type === "text" ? item.text ?? "" : ""))
    .join("")
}

async function callOpenAICompatible(
  input: InvokeAIProviderInput,
): Promise<AIProviderResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, input.provider.timeoutMs)

  try {
    const headers = new Headers({
      "Content-Type": "application/json",
    })
    const secret = getProviderSecret(input.provider)

    if (input.provider.authMode === "bearer") {
      headers.set("Authorization", `Bearer ${secret}`)
    } else {
      headers.set("x-api-key", secret)
    }

    const requestBody = {
      model: input.model.modelName,
      messages: input.messages,
      temperature: input.temperature,
      max_tokens: input.maxOutputTokens,
      stream: false,
    }

    const response = await fetch(`${input.provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = (await response.text()).slice(0, 400)
      throw new LearningAIProviderError(
        `AI provider request failed with status ${response.status}: ${errorText}`,
      )
    }

    const payload = (await response.json()) as OpenAICompatibleResponse
    const choice = payload.choices?.[0]
    const content = toResponseText(choice?.message?.content)

    if (!content) {
      throw new LearningAIProviderError("AI provider returned empty assistant content")
    }

    return {
      content,
      finishReason: choice?.finish_reason ?? null,
      streamChunkCount: 0,
      usage: {
        promptTokens: payload.usage?.prompt_tokens ?? 0,
        completionTokens: payload.usage?.completion_tokens ?? 0,
        totalTokens: payload.usage?.total_tokens ?? 0,
      },
      requestPayloadRedacted: {
        model: input.model.modelName,
        messageCount: input.messages.length,
        roles: input.messages.map((message) => message.role),
        temperature: input.temperature,
        maxTokens: input.maxOutputTokens,
        stream: false,
      },
      responsePayloadRedacted: {
        providerResponseId: payload.id ?? null,
        choiceCount: payload.choices?.length ?? 0,
        finishReason: choice?.finish_reason ?? null,
        contentLength: content.length,
        usage: payload.usage ?? null,
      },
    }
  } catch (error) {
    if (error instanceof LearningAIProviderError) {
      throw error
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new LearningAIProviderError("AI provider request timed out")
    }

    throw new LearningAIProviderError(
      error instanceof Error ? error.message : "Unknown AI provider error",
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function callOpenAICompatibleStream(
  input: StreamAIProviderInput,
): Promise<AIProviderResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, input.provider.timeoutMs)

  const startedAt = Date.now()

  try {
    const headers = new Headers({
      "Content-Type": "application/json",
    })
    const secret = getProviderSecret(input.provider)

    if (input.provider.authMode === "bearer") {
      headers.set("Authorization", `Bearer ${secret}`)
    } else {
      headers.set("x-api-key", secret)
    }

    const requestBody = {
      model: input.model.modelName,
      messages: input.messages,
      temperature: input.temperature,
      max_tokens: input.maxOutputTokens,
      stream: true,
    }

    const response = await fetch(`${input.provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = (await response.text()).slice(0, 400)
      throw new LearningAIProviderError(
        `AI provider stream failed with status ${response.status}: ${errorText}`,
      )
    }

    if (!response.body) {
      throw new LearningAIProviderError("AI provider stream body is empty")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let content = ""
    let finishReason: string | null = null
    let streamChunkCount = 0
    let promptTokens = 0
    let completionTokens = 0
    let totalTokens = 0

    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      while (true) {
        const boundary = buffer.indexOf("\n\n")
        if (boundary < 0) {
          break
        }

        const rawEvent = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)

        const dataLines = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())

        if (dataLines.length === 0) {
          continue
        }

        const payloadText = dataLines.join("")
        if (payloadText === "[DONE]") {
          break
        }

        const payload = JSON.parse(payloadText) as OpenAICompatibleResponse
        const choice = payload.choices?.[0]
        const delta = toDeltaText(choice?.delta?.content)

        if (delta) {
          content += delta
          streamChunkCount += 1
          await input.onTextDelta(delta)
        }

        if (choice?.finish_reason) {
          finishReason = choice.finish_reason
        }

        promptTokens = payload.usage?.prompt_tokens ?? promptTokens
        completionTokens = payload.usage?.completion_tokens ?? completionTokens
        totalTokens = payload.usage?.total_tokens ?? totalTokens
      }
    }

    if (!content.trim()) {
      throw new LearningAIProviderError("AI provider returned empty streamed assistant content")
    }

    return {
      content: content.trim(),
      finishReason,
      streamChunkCount,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      requestPayloadRedacted: {
        model: input.model.modelName,
        messageCount: input.messages.length,
        roles: input.messages.map((message) => message.role),
        temperature: input.temperature,
        maxTokens: input.maxOutputTokens,
        stream: true,
      },
      responsePayloadRedacted: {
        durationMs: Date.now() - startedAt,
        finishReason,
        contentLength: content.length,
        streamChunkCount,
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
        },
      },
    }
  } catch (error) {
    if (error instanceof LearningAIProviderError) {
      throw error
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new LearningAIProviderError("AI provider stream timed out")
    }

    throw new LearningAIProviderError(
      error instanceof Error ? error.message : "Unknown AI provider stream error",
    )
  } finally {
    clearTimeout(timeout)
  }
}

export async function invokeAIProvider(input: InvokeAIProviderInput) {
  const maxAttempts = Math.max(1, input.provider.retryCount + 1)

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (
        input.provider.providerType === "siliconflow"
        || input.provider.providerType === "openai_compatible"
      ) {
        return await callOpenAICompatible(input)
      }

      throw new LearningAIProviderError(
        `Unsupported provider type: ${input.provider.providerType}`,
      )
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error
      }
    }
  }

  throw new LearningAIProviderError("AI provider call exhausted all retry attempts")
}

export async function streamAIProvider(input: StreamAIProviderInput) {
  const maxAttempts = Math.max(1, input.provider.retryCount + 1)

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (
        input.provider.providerType === "siliconflow"
        || input.provider.providerType === "openai_compatible"
      ) {
        return await callOpenAICompatibleStream(input)
      }

      throw new LearningAIProviderError(
        `Unsupported provider type: ${input.provider.providerType}`,
      )
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error
      }
    }
  }

  throw new LearningAIProviderError("AI provider stream exhausted all retry attempts")
}
