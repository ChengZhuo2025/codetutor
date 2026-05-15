import type { Buffer } from "node:buffer"

import type { MaterialPipelineRuntime } from "@/server/modules/learning-materials/providers.ts"

export type TtsProtocol =
  | "dashscope_http_qwen"
  | "minimax_t2a_v2"
  | "openai_audio_speech"
  | "dashscope_realtime"

export type TtsFetch = typeof fetch

export type TtsSynthesisInput = {
  runtime: MaterialPipelineRuntime
  text: string
  fetchImpl?: TtsFetch
}

export type TtsSynthesisResult = {
  audio: Buffer
  contentType: string
}

export type TtsAdapterInput = {
  runtime: MaterialPipelineRuntime
  text: string
  fetchImpl: TtsFetch
}
