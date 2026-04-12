import test from "node:test"
import assert from "node:assert/strict"

import { assertHostnameAllowed } from "../server/modules/learning-materials/whitelist.ts"
import { MaterialPlanError } from "../server/modules/learning-materials/errors.ts"
import {
  buildMaterialChunkRows,
  extractMaterialEvidenceForSource,
} from "../server/modules/learning-materials/service.ts"
import { douyinMaterialSourceAdapter } from "../server/modules/learning-materials/adapters/douyin.ts"
import { resolveMaterialPipelineModelsFromSnapshots } from "../server/modules/learning-materials/providers.ts"
import { resolveMaterialSourceAdapter } from "../server/modules/learning-materials/source-resolver.ts"
import { extractJsonObjectString } from "../server/modules/learning-plans/json-parse.ts"
import { assertDraftQualityReadyForConfirm } from "../server/modules/learning-plans/activation.ts"
import { runPlanQualityGate } from "../server/modules/learning-plans/quality-gate.ts"
import { readDraftQualitySignalsFromRunSourceSnapshot } from "../server/modules/learning-plans/service.ts"
import {
  plannerOutputSchema,
  validatePlannerBusinessRules,
} from "../server/modules/learning-plans/schema.ts"
import { parsePlanDraftPatchBody } from "../server/lib/request-validation.ts"

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

test("douyin adapter normalizes self modal share link into public video url", async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl: string | null = null
  let requestUserAgent: string | null = null

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    requestUserAgent =
      init?.headers && init.headers instanceof Headers
        ? init.headers.get("User-Agent")
        : Array.isArray(init?.headers)
          ? (init?.headers.find(([key]) => key.toLowerCase() === "user-agent")?.[1] ?? null)
          : typeof init?.headers === "object" && init.headers
            ? ((init.headers as Record<string, string>)["User-Agent"] ?? (init.headers as Record<string, string>)["user-agent"] ?? null)
            : null
    return {
      ok: true,
      url: requestedUrl,
      text: async () => `
        <html>
          <head>
            <title>抖音视频标题</title>
            <meta property="og:description" content="这是一个公开视频页面" />
          </head>
          <body>视频正文</body>
        </html>
      `,
    } as Response
  }) as typeof fetch

  try {
    const rawUrl =
      "https://www.douyin.com/user/self?from_tab_name=main&modal_id=7621128300018158911&showSubTab=compilation&showTab=favorite_collection"

    const result = await douyinMaterialSourceAdapter.fetch(rawUrl)

    assert.equal(requestedUrl, "https://www.douyin.com/video/7621128300018158911?source=Baiduspider")
    assert.match(requestUserAgent ?? "", /Baiduspider/i)
    assert.equal(result.canonicalUrl, "https://www.douyin.com/video/7621128300018158911?source=Baiduspider")
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("douyin adapter rejects non-video detail pages with a friendly message", async () => {
  await assert.rejects(
    () => douyinMaterialSourceAdapter.fetch("https://www.douyin.com/user/self?from_tab_name=main"),
    (error: unknown) => {
      assert.ok(error instanceof MaterialPlanError)
      assert.equal(error.code, "MATERIAL_FETCH_FAILED")
      assert.match(error.message, /单条视频详情页|个人页|收藏页|合集页/)
      return true
    },
  )
})

test("douyin adapter returns a friendly message when public fetch is blocked by login shell", async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = (async () =>
    ({
      ok: true,
      url: "https://www.douyin.com/video/7621128300018158911?source=Baiduspider",
      text: async () => "<html><head><meta charset=\"UTF-8\" /></head><body></body><script>var glb;window._$jsvmprt=function(){}</script></html>",
    }) as Response) as typeof fetch

  try {
    await assert.rejects(
      () => douyinMaterialSourceAdapter.fetch("https://www.douyin.com/video/7621128300018158911"),
      (error: unknown) => {
        assert.ok(error instanceof MaterialPlanError)
        assert.equal(error.code, "MATERIAL_FETCH_FAILED")
        assert.match(error.message, /公开访问|需要登录|仅粉丝可见|已下线/)
        return true
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }
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
        masteryPoints: ["知道如何启动项目", "知道成功运行的判断标准"],
        cautions: [{ text: "不要跳过环境检查", isTrap: true }],
      },
      {
        taskNo: 2,
        title: "第二步",
        objective: "改页面",
        practiceSteps: ["编辑", "验证"],
        acceptanceCriteria: "页面更新",
        sourceRefs: ["c1"],
        masteryPoints: ["知道需要修改哪个页面", "知道如何验证页面已更新"],
        cautions: [{ text: "不要一上来大改结构" }],
      },
      {
        taskNo: 3,
        title: "第三步",
        objective: "复盘",
        practiceSteps: ["记录", "计划下一步"],
        acceptanceCriteria: "有清单",
        sourceRefs: ["c1"],
        masteryPoints: ["能复述这次练习的核心收获", "能列出下一步行动"],
        cautions: [{ text: "不要只看结果不复盘原因" }],
      },
    ],
  }
  const parsed = plannerOutputSchema.parse(raw)
  assert.equal(validatePlannerBusinessRules(parsed), null)
})

test("plannerOutputSchema rejects tasks without mastery points and cautions", () => {
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

  assert.throws(() => plannerOutputSchema.parse(raw))
})

test("parsePlanDraftPatchBody preserves mastery points and cautions", () => {
  const parsed = parsePlanDraftPatchBody({
    tasks: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        masteryPoints: ["理解这关核心目标", "知道如何验证完成"],
        cautions: [
          { text: "不要一次改太多", isTrap: true },
          { text: "先做最小可验证版本" },
        ],
      },
    ],
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) {
    return
  }

  assert.deepEqual(parsed.data.tasks?.[0]?.masteryPoints, [
    "理解这关核心目标",
    "知道如何验证完成",
  ])
  assert.deepEqual(parsed.data.tasks?.[0]?.cautions, [
    { text: "不要一次改太多", isTrap: true },
    { text: "先做最小可验证版本" },
  ])
})

test("parsePlanDraftPatchBody rejects degraded mastery points and cautions", () => {
  const masteryParsed = parsePlanDraftPatchBody({
    tasks: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        masteryPoints: ["只保留一条"],
      },
    ],
  })
  assert.equal(masteryParsed.ok, false)

  const cautionParsed = parsePlanDraftPatchBody({
    tasks: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        cautions: [],
      },
    ],
  })
  assert.equal(cautionParsed.ok, false)
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
        masteryPoints: ["m1", "m2"],
        cautions: [{ text: "c1" }],
      },
      {
        taskNo: 3,
        title: "第三步",
        objective: "b",
        practiceSteps: ["a", "b"],
        acceptanceCriteria: "y",
        sourceRefs: ["c1"],
        masteryPoints: ["m1", "m2"],
        cautions: [{ text: "c1" }],
      },
      {
        taskNo: 4,
        title: "第四步",
        objective: "c",
        practiceSteps: ["a", "b"],
        acceptanceCriteria: "z",
        sourceRefs: ["c1"],
        masteryPoints: ["m1", "m2"],
        cautions: [{ text: "c1" }],
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
      { taskNo: 1, title: "第一步", objective: "先了解一下主题", practiceSteps: ["看一遍", "记一下"], acceptanceCriteria: "知道大概是什么", sourceRefs: ["c1"], masteryPoints: ["知道主题核心范围", "知道这关输出什么"], cautions: [{ text: "不要只扫读标题就进入下一步", isTrap: true }] },
      { taskNo: 2, title: "第二步", objective: "继续了解一下更多内容", practiceSteps: ["再看一遍", "做记录"], acceptanceCriteria: "知道更多概念", sourceRefs: ["c1"], masteryPoints: ["能说出新增概念", "能记录核心差异"], cautions: [{ text: "不要只记名词不记含义" }] },
      { taskNo: 3, title: "第三步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"], masteryPoints: ["能复述关键概念", "知道概念之间的关系"], cautions: [{ text: "不要在概念没理顺时直接扩展练习" }] },
      { taskNo: 4, title: "第四步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"], masteryPoints: ["能复述关键概念", "知道本关边界"], cautions: [{ text: "不要堆积未验证理解" }] },
      { taskNo: 5, title: "第五步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"], masteryPoints: ["能指出关键概念", "能说明验证方式"], cautions: [{ text: "不要跳过记录过程" }] },
      { taskNo: 6, title: "第六步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"], masteryPoints: ["能复述关键信息", "能说明下一步"], cautions: [{ text: "不要把弱证据当成结论", isTrap: true }] },
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
      { taskNo: 1, title: "第一步", objective: "完成本地环境准备并记录初始状态", practiceSteps: ["安装依赖", "运行项目"], acceptanceCriteria: "项目可以正常启动", sourceRefs: ["c1"], masteryPoints: ["知道环境是否准备完成", "知道启动成功的判断标准"], cautions: [{ text: "不要跳过启动验证", isTrap: true }] },
      { taskNo: 2, title: "第二步", objective: "根据材料完成一次页面结构改造并截图对比", practiceSteps: ["调整布局", "保存截图"], acceptanceCriteria: "页面结构更新且截图可对比", sourceRefs: ["c1"], masteryPoints: ["知道本关改动范围", "知道如何对比改造前后"], cautions: [{ text: "不要同时修改无关模块" }] },
      { taskNo: 3, title: "第三步", objective: "整理复盘并记录下一步优化清单", practiceSteps: ["记录问题", "列出优化项"], acceptanceCriteria: "产出一份复盘清单", sourceRefs: ["c1"], masteryPoints: ["能复述这次练习产出", "能列出下一步优化点"], cautions: [{ text: "不要只记录结果不记录原因" }] },
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
      evidenceCoverage: {
        highConfidenceChars: 420,
        totalUsefulChars: 860,
        chunkCount: 3,
        isSufficient: false,
        isWeakEvidence: false,
      },
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

test("runPlanQualityGate skips low-risk quality self-check and does not invoke model", async () => {
  const plan = plannerOutputSchema.parse({
    title: "低风险计划",
    goal: "完成基础学习闭环",
    tasks: [
      { taskNo: 1, title: "第一步", objective: "完成项目环境配置并记录启动结果", practiceSteps: ["安装依赖", "启动项目"], acceptanceCriteria: "项目可以正常启动", estimatedMinutes: 45, sourceRefs: ["c1"], masteryPoints: ["知道依赖安装成功的判断方法", "知道项目成功启动的标志"], cautions: [{ text: "不要在环境未通前进入页面改造", isTrap: true }] },
      { taskNo: 2, title: "第二步", objective: "跟随材料完成一次页面结构调整并记录变化", practiceSteps: ["修改页面", "查看结果"], acceptanceCriteria: "页面结构按预期更新", estimatedMinutes: 60, sourceRefs: ["c1"], masteryPoints: ["知道这次要调整的结构点", "知道如何验证结构变化"], cautions: [{ text: "不要把视觉微调和结构改造混在一起" }] },
      { taskNo: 3, title: "第三步", objective: "整理本次练习结论并输出下一步计划", practiceSteps: ["记录结论", "列出下一步"], acceptanceCriteria: "输出一份复盘记录", estimatedMinutes: 30, sourceRefs: ["c1"], masteryPoints: ["能总结这次练习学会了什么", "能明确下一步行动"], cautions: [{ text: "不要遗漏阻塞点与解决方式" }] },
    ],
  })

  let invoked = false
  const result = await runPlanQualityGate(
    {
      plan,
      weeklyHours: 4,
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
      evidenceCoverage: {
        highConfidenceChars: 1800,
        totalUsefulChars: 2200,
        chunkCount: 4,
        isSufficient: true,
        isWeakEvidence: false,
      },
    },
    {
      invokeQualityModel: async () => {
        invoked = true
        throw new Error("should not invoke")
      },
    },
  )

  assert.equal(invoked, false)
  assert.equal(result.qualityStatus, "passed")
  assert.equal(result.qualityReport.selfCheck.decision, "skipped")
  assert.match(result.qualityReport.selfCheck.reason ?? "", /低风险计划/)
  assert.equal(result.qualityReport.warnings.includes("should not invoke"), false)
})

test("runPlanQualityGate keeps timeout reason in selfCheck but not in warnings", async () => {
  const plan = plannerOutputSchema.parse({
    title: "高风险计划",
    goal: "在证据不足时收缩学习范围",
    tasks: [
      { taskNo: 1, title: "第一步", objective: "梳理材料里提到的概念并记录未知项", practiceSteps: ["阅读材料", "记录未知项"], acceptanceCriteria: "输出一份概念清单", sourceRefs: ["c1"], masteryPoints: ["能梳理已知概念", "能标出未知项"], cautions: [{ text: "不要把猜测当成已掌握内容" }] },
      { taskNo: 2, title: "第二步", objective: "根据材料完成一次最小实践并记录阻塞点", practiceSteps: ["尝试实践", "记录阻塞"], acceptanceCriteria: "完成一次最小实践记录", sourceRefs: ["c1"], masteryPoints: ["能跑通最小实践", "能定位阻塞位置"], cautions: [{ text: "不要一遇到报错就改很多地方", isTrap: true }] },
      { taskNo: 3, title: "第三步", objective: "整理后续求证问题并准备补充资料", practiceSteps: ["整理问题", "准备资料"], acceptanceCriteria: "输出待验证问题列表", sourceRefs: ["c1"], masteryPoints: ["能提出待验证问题", "能说明需要补什么资料"], cautions: [{ text: "不要在证据不足时下定论" }] },
    ],
    warnings: ["材料证据仍偏弱"],
  })

  const result = await runPlanQualityGate(
    {
      plan,
      intakeWarnings: ["材料证据仍偏弱"],
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
      evidenceCoverage: {
        highConfidenceChars: 350,
        totalUsefulChars: 680,
        chunkCount: 3,
        isSufficient: false,
        isWeakEvidence: true,
      },
    },
    {
      invokeQualityModel: async (input) => {
        const payload = JSON.parse(input.userPrompt ?? "{}") as Record<string, unknown>
        assert.ok(payload.planSummary)
        assert.ok(Array.isArray(payload.riskSignals))
        assert.equal("plan" in payload, false)
        throw new Error("AI provider request timed out")
      },
    },
  )

  assert.equal(result.qualityStatus, "passed")
  assert.equal(result.qualityReport.selfCheck.decision, "skipped")
  assert.equal(result.qualityReport.selfCheck.reason, "AI provider request timed out")
  assert.equal(
    result.qualityReport.warnings.some((warning) => warning.includes("timed out")),
    false,
  )
})

test("readDraftQualitySignalsFromRunSourceSnapshot restores warnings and evidence coverage", () => {
  const result = readDraftQualitySignalsFromRunSourceSnapshot({
    links: ["https://web.dev/learn/"],
    sources: [
      {
        id: "source-1",
        metadata: {
          warnings: ["公开视频字幕不完整"],
          evidenceCoverage: {
            highConfidenceChars: 900,
            totalUsefulChars: 1200,
            chunkCount: 2,
            isSufficient: true,
            isWeakEvidence: false,
          },
        },
      },
      {
        id: "source-2",
        metadata: {
          warnings: ["封面文字较少"],
          evidenceCoverage: {
            highConfidenceChars: 300,
            totalUsefulChars: 500,
            chunkCount: 1,
            isSufficient: false,
            isWeakEvidence: true,
          },
        },
      },
    ],
  })

  assert.deepEqual(result.intakeWarnings, ["公开视频字幕不完整", "封面文字较少"])
  assert.deepEqual(result.evidenceCoverage, {
    highConfidenceChars: 1200,
    totalUsefulChars: 1700,
    chunkCount: 3,
    isSufficient: false,
    isWeakEvidence: true,
  })
})

test("assertDraftQualityReadyForConfirm rejects pending quality status", () => {
  assert.throws(
    () => assertDraftQualityReadyForConfirm("pending"),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /质量复检尚未完成/)
      return true
    },
  )

  assert.doesNotThrow(() => assertDraftQualityReadyForConfirm("passed"))
  assert.doesNotThrow(() => assertDraftQualityReadyForConfirm("pilot_fallback"))
})
