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

function parseVisionContent(content: string) {
  try {
    const raw = JSON.parse(extractJsonObjectString(content)) as {
      summary?: string
      warning?: string
    }

    return {
      summary: raw.summary?.trim() ?? "",
      warning: raw.warning?.trim() ?? null,
    }
  } catch {
    return {
      summary: content.trim(),
      warning: null,
    }
  }
}

export async function runVisionExtraction(input: {
  runtime?: MaterialPipelineRuntime | null
  mediaAsset: MediaAsset
  title?: string | null
  description?: string | null
}) {
  if (!input.runtime) {
    return {
      evidence: [] as MaterialEvidenceInput[],
      warnings: ["当前未配置 vision 模型，已跳过画面理解。"],
    }
  }

  const response = await invokeMaterialPipelineModel({
    runtime: input.runtime,
    systemPrompt: "你是教程材料视觉理解助手。若无法读取图片 URL，请返回空 summary 并说明 warning。只输出 JSON：{\"summary\":\"...\",\"warning\":\"...\"}。",
    userContent: [
      {
        type: "text",
        text: [
          `标题：${input.title ?? "未提供"}`,
          `描述：${input.description ?? "未提供"}`,
          `资源类型：${input.mediaAsset.kind}`,
          "请总结图片里能支持学习计划的事实：界面区域、步骤顺序、出现的术语或操作结果。不要编造看不见的细节。",
        ].join("\n"),
      },
      {
        type: "image_url",
        image_url: {
          url: input.mediaAsset.url,
        },
      },
    ],
    temperature: 0,
    maxOutputTokens: 1200,
  })

  const parsed = parseVisionContent(response.content)
  const summary = parsed.summary.trim()
  if (!summary) {
    return {
      evidence: [] as MaterialEvidenceInput[],
      warnings: [parsed.warning ?? "vision 未获得稳定结论。"],
    }
  }

  return {
    evidence: [
      {
        modality: "vision_summary" as const,
        evidenceType: "vision_summary" as const,
        content: summary,
        confidence: 0.55,
        sourceRef: {
          assetKind: input.mediaAsset.kind,
          assetUrl: input.mediaAsset.url,
          frameNo: 0,
          region: "full_frame",
        },
      },
    ],
    warnings: parsed.warning ? [parsed.warning] : [],
  }
}
