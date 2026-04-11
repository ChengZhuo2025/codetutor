import test from "node:test"
import assert from "node:assert/strict"

import { assertHostnameAllowed } from "../server/modules/learning-materials/whitelist.ts"
import { MaterialPlanError } from "../server/modules/learning-materials/errors.ts"
import {
  buildMaterialChunkRows,
  extractMaterialEvidenceForSource,
} from "../server/modules/learning-materials/service.ts"
import { resolveMaterialPipelineModelsFromSnapshots } from "../server/modules/learning-materials/providers.ts"
import { resolveMaterialSourceAdapter } from "../server/modules/learning-materials/source-resolver.ts"
import { extractJsonObjectString } from "../server/modules/learning-plans/json-parse.ts"
import { runPlanQualityGate } from "../server/modules/learning-plans/quality-gate.ts"
import {
  plannerOutputSchema,
  validatePlannerBusinessRules,
} from "../server/modules/learning-plans/schema.ts"

test("assertHostnameAllowed accepts frozen whitelist hosts", () => {
  assert.doesNotThrow(() =>
    assertHostnameAllowed("https://developer.mozilla.org/en-US/docs/Web"),
  )
  assert.doesNotThrow(() => assertHostnameAllowed("https://nextjs.org/docs"))
  assert.doesNotThrow(() => assertHostnameAllowed("https://web.dev/learn/"))
})

test("assertHostnameAllowed rejects unknown host", () => {
  assert.throws(
    () => assertHostnameAllowed("https://example.com/a"),
    (e: unknown) => e instanceof MaterialPlanError,
  )
})

test("resolveMaterialSourceAdapter supports configured public platform sources", () => {
  assert.equal(
    resolveMaterialSourceAdapter("https://developer.mozilla.org/en-US/docs/Web").sourceCode,
    "html",
  )
  assert.equal(
    resolveMaterialSourceAdapter("https://www.douyin.com/video/123").sourceCode,
    "douyin",
  )
  assert.equal(
    resolveMaterialSourceAdapter("https://www.xiaohongshu.com/explore/123").sourceCode,
    "xiaohongshu",
  )
  assert.equal(
    resolveMaterialSourceAdapter("https://www.bilibili.com/video/BV1xx").sourceCode,
    "bilibili",
  )
})

test("extractJsonObjectString unwraps fenced json", () => {
  const raw = '前缀\n```json\n{"a":1}\n```\n后缀'
  assert.equal(extractJsonObjectString(raw), '{"a":1}')
})

test("plannerOutputSchema + business rules accept valid planner payload", () => {
  const raw = {
    title: "测试计划",
    goal: "完成最小闭环",
    tasks: [
      {
        taskNo: 1,
        title: "第一步",
        objective: "跑通环境",
        practiceSteps: ["安装", "运行"],
        acceptanceCriteria: "能启动",
        estimatedMinutes: 30,
        sourceRefs: ["c1"],
      },
      {
        taskNo: 2,
        title: "第二步",
        objective: "改页面",
        practiceSteps: ["编辑", "验证"],
        acceptanceCriteria: "页面更新",
        sourceRefs: ["c1"],
      },
      {
        taskNo: 3,
        title: "第三步",
        objective: "复盘",
        practiceSteps: ["记录", "计划下一步"],
        acceptanceCriteria: "有清单",
        sourceRefs: ["c1"],
      },
    ],
  }
  const parsed = plannerOutputSchema.parse(raw)
  assert.equal(validatePlannerBusinessRules(parsed), null)
})

test("validatePlannerBusinessRules rejects non-sequential taskNo", () => {
  const raw = {
    title: "测试计划",
    goal: "完成最小闭环",
    tasks: [
      {
        taskNo: 1,
        title: "第一步",
        objective: "a",
        practiceSteps: ["a", "b"],
        acceptanceCriteria: "x",
        sourceRefs: ["c1"],
      },
      {
        taskNo: 3,
        title: "第三步",
        objective: "b",
        practiceSteps: ["a", "b"],
        acceptanceCriteria: "y",
        sourceRefs: ["c1"],
      },
      {
        taskNo: 4,
        title: "第四步",
        objective: "c",
        practiceSteps: ["a", "b"],
        acceptanceCriteria: "z",
        sourceRefs: ["c1"],
      },
    ],
  }
  const parsed = plannerOutputSchema.parse(raw)
  assert.ok(validatePlannerBusinessRules(parsed))
})

test("resolveMaterialPipelineModelsFromSnapshots prefers env model and falls back to capability when env model is inactive", async () => {
  const providers = [
    {
      id: "provider-a",
      code: "p-a",
      provider_type: "openai_compatible" as const,
      base_url: "https://provider-a.example.com",
      auth_mode: "bearer" as const,
      secret_ref: "A_SECRET",
      secret_ciphertext: null,
      secret_iv: null,
      secret_auth_tag: null,
      secret_key_version: null,
      timeout_ms: 15_000,
      retry_count: 1,
      is_active: true,
    },
    {
      id: "provider-b",
      code: "p-b",
      provider_type: "openai_compatible" as const,
      base_url: "https://provider-b.example.com",
      auth_mode: "bearer" as const,
      secret_ref: "B_SECRET",
      secret_ciphertext: null,
      secret_iv: null,
      secret_auth_tag: null,
      secret_key_version: null,
      timeout_ms: 15_000,
      retry_count: 1,
      is_active: true,
    },
  ]

  const models = [
    {
      id: "m-1",
      provider_id: "provider-a",
      code: "asr-env",
      model_name: "asr-env-model",
      default_max_output_tokens: 4000,
      recommended_temperature: 0,
      is_active: true,
      metadata: { capabilities: ["asr"] },
    },
    {
      id: "m-2",
      provider_id: "provider-b",
      code: "asr-capability",
      model_name: "asr-capability-model",
      default_max_output_tokens: 4000,
      recommended_temperature: 0,
      is_active: true,
      metadata: { capabilities: ["asr"] },
    },
    {
      id: "m-3",
      provider_id: "provider-b",
      code: "vision-env-inactive",
      model_name: "vision-env-model",
      default_max_output_tokens: 4000,
      recommended_temperature: 0,
      is_active: false,
      metadata: { capabilities: ["vision"] },
    },
    {
      id: "m-4",
      provider_id: "provider-a",
      code: "vision-capability",
      model_name: "vision-capability-model",
      default_max_output_tokens: 4000,
      recommended_temperature: 0,
      is_active: true,
      metadata: { capabilities: ["vision"] },
    },
  ]

  const resolved = resolveMaterialPipelineModelsFromSnapshots({
    providers,
    models,
    env: {
      MATERIAL_PLAN_ASR_MODEL_CODE: "asr-env",
      MATERIAL_PLAN_VISION_MODEL_CODE: "vision-env-inactive",
    },
  })

  assert.equal(resolved.asr?.model.code, "asr-env")
  assert.equal(resolved.asr?.provider.code, "p-a")
  assert.equal(resolved.vision?.model.code, "vision-capability")
  assert.equal(resolved.vision?.provider.code, "p-a")
})

test("extractMaterialEvidenceForSource stops before ASR when subtitles already make content sufficient", async () => {
  let asrCalls = 0
  let ocrCalls = 0
  let visionCalls = 0

  const result = await extractMaterialEvidenceForSource(
    {
      sourceId: "source-1",
      url: "https://www.bilibili.com/video/BV1xx",
      urlIndex: 1,
      sourceType: "video",
      rawTextBlocks: ["这是一段很短的公开简介。"],
      subtitleTracks: [
        {
          language: "zh-CN",
          text: "字幕内容".repeat(240),
        },
      ],
      mediaAssets: [{ kind: "video", url: "https://cdn.example.com/video.mp4" }],
      warnings: [],
    },
    {
      runAsrExtraction: async () => {
        asrCalls += 1
        return { evidence: [], warnings: [] }
      },
      runOcrExtraction: async () => {
        ocrCalls += 1
        return { evidence: [], warnings: [] }
      },
      runVisionExtraction: async () => {
        visionCalls += 1
        return { evidence: [], warnings: [] }
      },
    },
  )

  assert.equal(asrCalls, 0)
  assert.equal(ocrCalls, 0)
  assert.equal(visionCalls, 0)
  assert.equal(result.coverage.isSufficient, true)
  assert.ok(result.chunks.some((chunk) => chunk.modality === "subtitle"))
})

test("extractMaterialEvidenceForSource escalates to ASR for video sources when text and subtitles are insufficient", async () => {
  let asrCalls = 0

  const result = await extractMaterialEvidenceForSource(
    {
      sourceId: "source-2",
      url: "https://www.bilibili.com/video/BV2yy",
      urlIndex: 1,
      sourceType: "video",
      rawTextBlocks: ["很短的简介"],
      subtitleTracks: [],
      mediaAssets: [{ kind: "video", url: "https://cdn.example.com/video.mp4" }],
      warnings: [],
    },
    {
      runAsrExtraction: async ({ mediaAsset }) => {
        asrCalls += 1
        assert.equal(mediaAsset.url, "https://cdn.example.com/video.mp4")
        return {
          evidence: [
            {
              modality: "audio_transcript",
              evidenceType: "asr_transcript",
              content: "语音转写".repeat(420),
              confidence: 0.75,
              sourceRef: {
                assetUrl: mediaAsset.url,
                assetKind: mediaAsset.kind,
                timeRange: { startMs: 0, endMs: 90_000 },
              },
            },
          ],
          warnings: [],
        }
      },
    },
  )

  assert.equal(asrCalls, 1)
  assert.ok(result.chunks.some((chunk) => chunk.evidenceType === "asr_transcript"))
  assert.equal(result.coverage.isSufficient, true)
})

test("extractMaterialEvidenceForSource uses OCR before vision for image posts and skips vision once OCR is sufficient", async () => {
  let ocrCalls = 0
  let visionCalls = 0

  const result = await extractMaterialEvidenceForSource(
    {
      sourceId: "source-3",
      url: "https://www.xiaohongshu.com/explore/abc",
      urlIndex: 1,
      sourceType: "image_post",
      rawTextBlocks: ["太短"],
      subtitleTracks: [],
      mediaAssets: [{ kind: "cover_image", url: "https://cdn.example.com/cover.jpg" }],
      warnings: [],
    },
    {
      runOcrExtraction: async ({ mediaAsset }) => {
        ocrCalls += 1
        return {
          evidence: [
            {
              modality: "image_ocr",
              evidenceType: "ocr_text",
              content: "OCR 提取正文".repeat(260),
              confidence: 0.68,
              sourceRef: {
                assetUrl: mediaAsset.url,
                assetKind: mediaAsset.kind,
                frameNo: 0,
              },
            },
          ],
          warnings: [],
        }
      },
      runVisionExtraction: async () => {
        visionCalls += 1
        return { evidence: [], warnings: [] }
      },
    },
  )

  assert.equal(ocrCalls, 1)
  assert.equal(visionCalls, 0)
  assert.ok(result.chunks.some((chunk) => chunk.modality === "image_ocr"))
})

test("extractMaterialEvidenceForSource keeps weak-evidence warnings when platform text is insufficient and no expensive extraction succeeds", async () => {
  const result = await extractMaterialEvidenceForSource(
    {
      sourceId: "source-4",
      url: "https://www.douyin.com/video/123",
      urlIndex: 1,
      sourceType: "video",
      rawTextBlocks: ["公开页简介很短"],
      subtitleTracks: [],
      mediaAssets: [{ kind: "cover_image", url: "https://cdn.example.com/cover.jpg" }],
      warnings: ["公开页可提取文本较少，可能只能生成试点计划。"],
    },
    {
      runOcrExtraction: async () => ({ evidence: [], warnings: ["OCR 未识别到稳定文字。"] }),
      runVisionExtraction: async () => ({ evidence: [], warnings: ["vision 未获得稳定结论。"] }),
    },
  )

  assert.equal(result.coverage.isWeakEvidence, true)
  assert.ok(result.warnings.some((warning) => warning.includes("公开页可提取文本较少")))
  assert.ok(result.warnings.some((warning) => warning.includes("OCR 未识别到稳定文字")))
  assert.ok(result.warnings.some((warning) => warning.includes("vision 未获得稳定结论")))
})

test("buildMaterialChunkRows persists modality, sourceRef, evidenceType, and confidence", () => {
  const rows = buildMaterialChunkRows(
    "intake-1",
    "source-1",
    [
      {
        id: "u1-subtitle-0-0",
        url: "https://www.bilibili.com/video/BV1xx",
        excerpt: "字幕内容一",
        modality: "subtitle",
        evidenceType: "subtitle_track",
        confidence: 0.92,
        sourceRef: {
          sourceId: "source-1",
          url: "https://www.bilibili.com/video/BV1xx",
          chunkNo: 0,
          trackLanguage: "zh-CN",
          assetKind: "subtitle",
        },
      },
    ],
    "2026-04-11T00:00:00.000Z",
  )

  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.modality, "subtitle")
  assert.equal(rows[0]?.evidence_type, "subtitle_track")
  assert.equal(rows[0]?.confidence, 0.92)
  assert.deepEqual(rows[0]?.source_ref, {
    sourceId: "source-1",
    url: "https://www.bilibili.com/video/BV1xx",
    chunkNo: 0,
    trackLanguage: "zh-CN",
    assetKind: "subtitle",
  })
})

test("runPlanQualityGate falls back to pilot plan for weak evidence and generic long plans", async () => {
  const raw = plannerOutputSchema.parse({
    title: "抖音短教程计划",
    goal: "快速学会一个概念",
    warnings: ["公开页可提取文本较少。"],
    tasks: [
      { taskNo: 1, title: "第一步", objective: "先了解一下主题", practiceSteps: ["看一遍", "记一下"], acceptanceCriteria: "知道大概是什么", sourceRefs: ["c1"] },
      { taskNo: 2, title: "第二步", objective: "继续了解一下更多内容", practiceSteps: ["再看一遍", "做记录"], acceptanceCriteria: "知道更多概念", sourceRefs: ["c1"] },
      { taskNo: 3, title: "第三步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"] },
      { taskNo: 4, title: "第四步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"] },
      { taskNo: 5, title: "第五步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"] },
      { taskNo: 6, title: "第六步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"] },
    ],
  })

  const result = await runPlanQualityGate({
    plan: raw,
    weeklyHours: 2,
    intakeWarnings: ["公开页可提取文本较少。"],
    evidenceCoverage: {
      highConfidenceChars: 120,
      totalUsefulChars: 220,
      chunkCount: 1,
      isSufficient: false,
      isWeakEvidence: true,
    },
  })

  assert.equal(result.qualityStatus, "pilot_fallback")
  assert.equal(result.plan.tasks.length, 3)
  assert.ok(result.qualityReport.warnings.some((warning) => warning.includes("试点计划")))
})

test("runPlanQualityGate falls back after quality self-check keeps asking for retry on the final attempt", async () => {
  const plan = plannerOutputSchema.parse({
    title: "质量自检计划",
    goal: "完成一个最小改造",
    tasks: [
      { taskNo: 1, title: "第一步", objective: "完成本地环境准备并记录初始状态", practiceSteps: ["安装依赖", "运行项目"], acceptanceCriteria: "项目可以正常启动", sourceRefs: ["c1"] },
      { taskNo: 2, title: "第二步", objective: "根据材料完成一次页面结构改造并截图对比", practiceSteps: ["调整布局", "保存截图"], acceptanceCriteria: "页面结构更新且截图可对比", sourceRefs: ["c1"] },
      { taskNo: 3, title: "第三步", objective: "整理复盘并记录下一步优化清单", practiceSteps: ["记录问题", "列出优化项"], acceptanceCriteria: "产出一份复盘清单", sourceRefs: ["c1"] },
    ],
  })

  const result = await runPlanQualityGate(
    {
      plan,
      qualityRuntime: {
        provider: {
          code: "provider-1",
          providerType: "openai_compatible",
          baseUrl: "https://provider.example.com",
          authMode: "bearer",
          envSecretRef: "SECRET",
          secretCiphertext: null,
          secretIv: null,
          secretAuthTag: null,
          secretKeyVersion: null,
          timeoutMs: 10_000,
          retryCount: 1,
        },
        model: {
          code: "quality-model",
          modelName: "quality-model-name",
          defaultMaxOutputTokens: 300,
          recommendedTemperature: 0,
        },
      },
      attempt: 2,
      maxAttempts: 2,
    },
    {
      invokeQualityModel: async () => ({
        content: "{\"decision\":\"retry\",\"reason\":\"信息密度还不够\"}",
        finishReason: "stop",
        streamChunkCount: 0,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        requestPayloadRedacted: {},
        responsePayloadRedacted: {},
      }),
    },
  )

  assert.equal(result.qualityStatus, "pilot_fallback")
  assert.equal(result.qualityReport.selfCheck.decision, "retry")
  assert.equal(result.qualityReport.fallbackReason, "quality_model_retry_exhausted")
})
