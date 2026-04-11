import "server-only"

import {
  invokeMaterialAudioTranscription,
  type MaterialPipelineRuntime,
} from "../providers.ts"
import type { MaterialEvidenceInput } from "../normalizer.ts"

type MediaAsset = {
  kind: string
  url: string
}

export async function runAsrExtraction(input: {
  runtime?: MaterialPipelineRuntime | null
  mediaAsset: MediaAsset
  title?: string | null
  description?: string | null
}) {
  if (!input.runtime) {
    return {
      evidence: [] as MaterialEvidenceInput[],
      warnings: ["当前未配置 ASR 模型，已跳过语音转写。"],
    }
  }

  const response = await invokeMaterialAudioTranscription({
    runtime: input.runtime,
    mediaUrl: input.mediaAsset.url,
    prompt: [
      `标题：${input.title ?? "未提供"}`,
      `描述：${input.description ?? "未提供"}`,
      "请尽可能保留教程步骤、关键术语、命令和代码相关片段。",
    ].join("\n"),
  })

  const transcript = response.text.trim()
  if (!transcript) {
    return {
      evidence: [] as MaterialEvidenceInput[],
      warnings: ["ASR 未返回稳定转写内容。"],
    }
  }

  return {
    evidence: [
      {
        modality: "audio_transcript" as const,
        evidenceType: "asr_transcript" as const,
        content: transcript,
        confidence: 0.75,
        sourceRef: {
          assetKind: input.mediaAsset.kind,
          assetUrl: input.mediaAsset.url,
          timeRange: {
            startMs: 0,
            endMs: 0,
          },
        },
      },
    ],
    warnings: [],
  }
}
