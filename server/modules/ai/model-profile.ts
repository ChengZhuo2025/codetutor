import type {
  AdminAIModelConnectionTestMode,
  AdminAIModelFamily,
  AdminAIModelRuntimeCapability,
} from "@/lib/api/contracts/admin-ai"

type JsonRecord = Record<string, unknown>

function readMetaString(meta: JsonRecord, key: string): string | null {
  const value = meta[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function uniqueItems<T>(items: T[]) {
  return Array.from(new Set(items))
}

function normalizeCapabilityName(raw: string): AdminAIModelRuntimeCapability | null {
  const normalized = raw.trim().toLowerCase().replace(/-/g, "_")
  if (normalized === "asr" || normalized === "speech_to_text") {
    return "asr"
  }
  if (normalized === "vision") {
    return "vision"
  }
  if (normalized === "quality_check") {
    return "quality_check"
  }
  return null
}

export function normalizeModelRuntimeCapabilities(raw: unknown): AdminAIModelRuntimeCapability[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return uniqueItems(
    raw
      .map((item) => typeof item === "string" ? normalizeCapabilityName(item) : null)
      .filter((item): item is AdminAIModelRuntimeCapability => item !== null),
  )
}

export function normalizeModelConnectionTestMode(raw: unknown): AdminAIModelConnectionTestMode | null {
  if (typeof raw !== "string") {
    return null
  }

  const normalized = raw.trim().toLowerCase().replace(/-/g, "_")
  if (normalized === "chat" || normalized === "chat_completions") {
    return "chat"
  }
  if (normalized === "audio_transcription" || normalized === "asr" || normalized === "speech_to_text") {
    return "audio_transcription"
  }
  if (normalized === "models_list") {
    return "models_list"
  }
  return null
}

export function normalizeModelFamily(raw: unknown): AdminAIModelFamily | null {
  if (typeof raw !== "string") {
    return null
  }

  const normalized = raw.trim().toLowerCase().replace(/-/g, "_")
  if (normalized === "chat" || normalized === "reasoning" || normalized === "asr" || normalized === "vision" || normalized === "other") {
    return normalized
  }
  return null
}

export function normalizeModelProfileGroup(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null
}

export function normalizeModelNotes(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null
}

function readLegacyConnectionTestMode(meta: JsonRecord): AdminAIModelConnectionTestMode | null {
  const direct = normalizeModelConnectionTestMode(readMetaString(meta, "connectionTest"))
  if (direct) {
    return direct
  }

  const nested = meta.connectionTest
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return normalizeModelConnectionTestMode(readMetaString(nested as JsonRecord, "mode"))
  }

  return null
}

export function resolveStoredModelProfile(input: {
  modelFamily?: unknown
  runtimeCapabilities?: unknown
  connectionTestMode?: unknown
  reasoningEnabled?: unknown
  profileGroup?: unknown
  notes?: unknown
  metadata?: JsonRecord | null
}): {
  modelFamily: AdminAIModelFamily
  runtimeCapabilities: AdminAIModelRuntimeCapability[]
  connectionTestMode: AdminAIModelConnectionTestMode
  reasoningEnabled: boolean
  profileGroup: string | null
  notes: string | null
} {
  const metadata = input.metadata ?? {}
  const runtimeCapabilities = uniqueItems([
    ...normalizeModelRuntimeCapabilities(input.runtimeCapabilities),
    ...normalizeModelRuntimeCapabilities(metadata.capabilities),
  ])

  const profileGroup =
    normalizeModelProfileGroup(input.profileGroup)
    ?? normalizeModelProfileGroup(metadata.profileGroup)

  const reasoningEnabled =
    input.reasoningEnabled === true
    || metadata.enableThinking === true
    || profileGroup === "reasoning_lab"

  const connectionTestMode =
    normalizeModelConnectionTestMode(input.connectionTestMode)
    ?? readLegacyConnectionTestMode(metadata)
    ?? (runtimeCapabilities.includes("asr")
      ? "audio_transcription"
      : runtimeCapabilities.includes("quality_check") || reasoningEnabled
        ? "models_list"
        : "chat")

  const modelFamily =
    normalizeModelFamily(input.modelFamily)
    ?? normalizeModelFamily(metadata.modelFamily)
    ?? (reasoningEnabled
      ? "reasoning"
      : runtimeCapabilities.includes("asr")
        ? "asr"
        : runtimeCapabilities.includes("vision")
          ? "vision"
          : "chat")

  const notes =
    normalizeModelNotes(input.notes)
    ?? normalizeModelNotes(metadata.notes)

  return {
    modelFamily,
    runtimeCapabilities,
    connectionTestMode,
    reasoningEnabled,
    profileGroup,
    notes,
  }
}

export function modelSupportsRuntimeCapability(
  input: {
    runtime_capabilities?: unknown
    metadata?: JsonRecord | null
  },
  capability: AdminAIModelRuntimeCapability,
) {
  return resolveStoredModelProfile({
    runtimeCapabilities: input.runtime_capabilities,
    metadata: input.metadata,
  }).runtimeCapabilities.includes(capability)
}
