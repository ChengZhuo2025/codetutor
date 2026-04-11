import "server-only"

import { extractJsonObjectString } from "@/server/modules/learning-plans/json-parse.ts"
import {
  invokeMaterialPipelineModel,
  type MaterialPipelineRuntime,
} from "../providers.ts"
import type { MaterialEvidenceInput } from "../normalizer.ts"

type MediaAsset = {
  kind: string
  url: string
}

function parseTranscriptContent(content: string) {
  try {
    const raw = JSON.parse(extractJsonObjectString(content)) as {
      transcript?: string
      warning?: string
    }

    return {
      transcript: raw.transcript?.trim() ?? "",
      warning: raw.warning?.trim() ?? null,
    }
  } catch {
    return {
      transcript: content.trim(),
      warning: null,
    }
  }
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

  const response = await invokeMaterialPipelineModel({
    runtime: input.runtime,
    systemPrompt: "你是教程材料的 ASR 转写助手。若无法直接访问媒体 URL，请返回空 transcript 并说明 warning。只输出 JSON：{\"transcript\":\"...\",\"warning\":\"...\"}。",
    userPrompt: [
      `标题：${input.title ?? "未提供"}`,
      `描述：${input.description ?? "未提供"}`,
      `媒体链接：${input.mediaAsset.url}`,
      `媒体类型：${input.mediaAsset.kind}`,
      "请尽可能提取可执行学习相关的中文转写，保留关键术语，不要凭空补充未出现的步骤。",
    ].join("\n"),
    temperature: 0,
    maxOutputTokens: 2200,
  })

  const parsed = parseTranscriptContent(response.content)
  const transcript = parsed.transcript.trim()
  if (!transcript) {
    return {
      evidence: [] as MaterialEvidenceInput[],
      warnings: [parsed.warning ?? "ASR 未返回稳定转写内容。"],
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
    warnings: parsed.warning ? [parsed.warning] : [],
  }
}
