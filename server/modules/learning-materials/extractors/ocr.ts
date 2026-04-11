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

function parseOcrContent(content: string) {
  try {
    const raw = JSON.parse(extractJsonObjectString(content)) as {
      text?: string
      warning?: string
    }

    return {
      text: raw.text?.trim() ?? "",
      warning: raw.warning?.trim() ?? null,
    }
  } catch {
    return {
      text: content.trim(),
      warning: null,
    }
  }
}

export async function runOcrExtraction(input: {
  runtime?: MaterialPipelineRuntime | null
  mediaAsset: MediaAsset
  title?: string | null
}) {
  if (!input.runtime) {
    return {
      evidence: [] as MaterialEvidenceInput[],
      warnings: ["当前未配置 OCR/vision 模型，已跳过图片文字识别。"],
    }
  }

  const response = await invokeMaterialPipelineModel({
    runtime: input.runtime,
    systemPrompt: "你是教程材料 OCR 助手。若无法读取图片 URL，请返回空 text 并说明 warning。只输出 JSON：{\"text\":\"...\",\"warning\":\"...\"}。",
    userContent: [
      {
        type: "text",
        text: [
          `标题：${input.title ?? "未提供"}`,
          `资源类型：${input.mediaAsset.kind}`,
          "请只提取图片中实际可见的教程标题、步骤、命令、代码片段或标签。不要总结，只做 OCR 文本提取。",
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
    maxOutputTokens: 1800,
  })

  const parsed = parseOcrContent(response.content)
  const text = parsed.text.trim()
  if (!text) {
    return {
      evidence: [] as MaterialEvidenceInput[],
      warnings: [parsed.warning ?? "OCR 未识别到稳定文字。"],
    }
  }

  return {
    evidence: [
      {
        modality: "image_ocr" as const,
        evidenceType: "ocr_text" as const,
        content: text,
        confidence: 0.68,
        sourceRef: {
          assetKind: input.mediaAsset.kind,
          assetUrl: input.mediaAsset.url,
          frameNo: 0,
        },
      },
    ],
    warnings: parsed.warning ? [parsed.warning] : [],
  }
}
