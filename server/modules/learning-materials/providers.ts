import "server-only"

import {
  loadAIModelsSnapshot,
} from "@/server/modules/ai/config-cache"

type AIModelRow = {
  code: string
  model_name: string
  is_active: boolean
  metadata?: {
    capabilities?: string[]
  } | null
}

function resolveEnvOrCapabilityModel(
  envCode: string | undefined,
  models: AIModelRow[],
  capability: string,
) {
  if (envCode) {
    return models.find((model) => model.code === envCode && model.is_active) ?? null
  }

  return models.find((model) =>
    model.is_active && model.metadata?.capabilities?.includes(capability),
  ) ?? null
}

export async function resolveMaterialPipelineModels() {
  const models = await loadAIModelsSnapshot<AIModelRow>()

  return {
    asr: resolveEnvOrCapabilityModel(process.env.MATERIAL_PLAN_ASR_MODEL_CODE, models, "asr"),
    vision: resolveEnvOrCapabilityModel(process.env.MATERIAL_PLAN_VISION_MODEL_CODE, models, "vision"),
    quality: resolveEnvOrCapabilityModel(process.env.MATERIAL_PLAN_QUALITY_MODEL_CODE, models, "quality_check"),
  }
}
