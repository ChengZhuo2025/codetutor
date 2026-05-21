import test from "node:test"
import assert from "node:assert/strict"

import { runSupabaseQueryWithRetry } from "../server/lib/supabase.ts"
import { assertHostnameAllowed } from "../server/modules/learning-materials/whitelist.ts"
import { MaterialPlanError } from "../server/modules/learning-materials/errors.ts"
import {
  buildMaterialChunkRows,
  extractMaterialEvidenceForSource,
  runMaterialIntake,
} from "../server/modules/learning-materials/service.ts"
import {
  claimMaterialPlanRun,
  isMaterialPlanRunClaimable,
  MaterialPlanQueueMigrationError,
} from "../server/modules/learning-materials/queue.ts"
import { bilibiliMaterialSourceAdapter } from "../server/modules/learning-materials/adapters/bilibili.ts"
import { douyinMaterialSourceAdapter } from "../server/modules/learning-materials/adapters/douyin.ts"
import { resolveMaterialPipelineModelsFromSnapshots } from "../server/modules/learning-materials/providers.ts"
import { resolveMaterialSourceAdapter } from "../server/modules/learning-materials/source-resolver.ts"
import { extractJsonObjectString } from "../server/modules/learning-plans/json-parse.ts"
import {
  finalizeMaterialPlanGenerationFailure,
  parsePlannerOutputContent,
} from "../server/modules/learning-plans/service.ts"
import { assertDraftQualityReadyForConfirm } from "../server/modules/learning-plans/activation.ts"
import { analyzePlannerSourceStructure } from "../server/modules/learning-plans/source-structure.ts"
import { runPlanQualityGate } from "../server/modules/learning-plans/quality-gate.ts"
import { readDraftQualitySignalsFromRunSourceSnapshot } from "../server/modules/learning-plans/service.ts"
import { resolvePlannerProviderTimeoutConfig } from "../server/modules/learning-plans/planner-runtime.ts"
import {
  plannerOutputSchema,
  validatePlannerBusinessRules,
} from "../server/modules/learning-plans/schema.ts"
import { parsePlanDraftPatchBody } from "../server/lib/request-validation.ts"
import {
  isTransientMaterialPlanDraftLoadError,
  resolveMaterialPlanDraftLoadErrorMessage,
  resolveMaterialPlanStatusDisplay,
} from "../features/learning/lib/material-plan-messages.ts"

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

test("bilibili adapter keeps public page text as evidence before expensive extraction", async () => {
  const originalFetch = globalThis.fetch
  const visibleTutorialText = "Claude Code 教程步骤：先打开终端，确认当前项目目录，再输入 claude 启动交互。接着把任务拆成小步，每一步先说明目标，再让工具读取文件，最后根据输出调整下一步。".repeat(15)

  globalThis.fetch = (async (input: string | URL | Request) => {
    const requestedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    return {
      ok: true,
      url: requestedUrl,
      text: async () => `
        <html>
          <head>
            <title>装好 Claude Code，却不知道怎么用？_哔哩哔哩_bilibili</title>
            <meta property="og:description" content="这期视频演示 Claude Code 的基础操作。" />
            <meta property="og:image" content="//i2.hdslb.com/bfs/archive/cover.jpg" />
          </head>
          <body>
            <main>${visibleTutorialText}</main>
            <script>
              window.__INITIAL_STATE__={"videoData":{"title":"装好 Claude Code，却不知道怎么用？","desc":"这期视频演示 Claude Code 的基础操作。","owner":{"name":"汤姆CC的AI工具箱"},"pic":"http://i2.hdslb.com/bfs/archive/cover.jpg"}};
              (function(){})();
            </script>
          </body>
        </html>
      `,
    } as Response
  }) as typeof fetch

  try {
    const result = await bilibiliMaterialSourceAdapter.fetch(
      "https://www.bilibili.com/video/BV18KocB4EK4/?spm_id_from=333.337.search-card.all.click",
    )

    assert.equal(result.title, "装好 Claude Code，却不知道怎么用？")
    assert.equal(result.authorName, "汤姆CC的AI工具箱")
    assert.ok(result.rawTextBlocks.join("\n").length >= 1200)
    assert.ok(result.rawTextBlocks.join("\n").includes("Claude Code 教程步骤"))
    assert.deepEqual(result.warnings, [])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("runMaterialIntake preserves the concrete single-link fetch failure", async () => {
  const originalFetch = globalThis.fetch
  const insertedSources: Array<Record<string, unknown>> = []
  const supabase = {
    from(table: string) {
      assert.ok(["learning_material_sources"].includes(table))
      return {
        delete() {
          return {
            eq: async () => ({ error: null }),
          }
        },
        insert(row: Record<string, unknown> | Array<Record<string, unknown>>) {
          if (Array.isArray(row)) {
            insertedSources.push(...row)
          } else {
            insertedSources.push(row)
          }
          return Promise.resolve({ error: null })
        },
      }
    },
  }

  globalThis.fetch = (async (input: string | URL | Request) => {
    const requestedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    return {
      ok: false,
      status: 403,
      url: requestedUrl,
      text: async () => "",
    } as Response
  }) as typeof fetch

  try {
    await assert.rejects(
      () =>
        runMaterialIntake(
          supabase as never,
          "11111111-1111-4111-8111-111111111111",
          ["https://www.bilibili.com/video/BV18KocB4EK4/"],
          {
            resolveMaterialPipelineModels: async () => ({
              asr: null,
              vision: null,
              quality: null,
            }),
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof MaterialPlanError)
        assert.equal(error.code, "MATERIAL_FETCH_FAILED")
        assert.equal(error.message, "页面返回状态 403。")
        return true
      },
    )

    assert.equal(insertedSources.length, 1)
    assert.equal(insertedSources[0]?.fetch_status, "failed")
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
        lessonBrief: "先确认本地环境能运行项目，再做后续页面修改。这样可以把环境问题和代码问题分开判断。",
        practiceSteps: ["安装", "运行"],
        submissionGuide: "提交启动成功的终端输出或本地页面截图。",
        checkpoints: ["依赖安装成功", "开发服务器成功启动", "页面可以正常打开"],
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
        lessonBrief: "先找到页面入口，再做一个很小的文本改动，用最短路径确认改动会反映到界面。",
        practiceSteps: ["编辑", "验证"],
        submissionGuide: "提交修改前后的页面截图，或说明改了哪个文件和看到的页面变化。",
        checkpoints: ["能定位页面文件", "只做一个最小改动", "能在浏览器看到变化"],
        acceptanceCriteria: "页面更新",
        sourceRefs: ["c1"],
        masteryPoints: ["知道需要修改哪个页面", "知道如何验证页面已更新"],
        cautions: [{ text: "不要一上来大改结构" }],
      },
      {
        taskNo: 3,
        title: "第三步",
        objective: "复盘",
        lessonBrief: "复盘时不要只记录结果，要把本次操作中可复用的判断方法写下来。",
        practiceSteps: ["记录", "计划下一步"],
        submissionGuide: "提交一段复盘文字，包含本次做法、验证方式和下一步计划。",
        checkpoints: ["能说清本次做法", "能说清如何验证", "能列出下一步"],
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

test("plannerOutputSchema rejects tasks without teaching content", () => {
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

  assert.throws(() => plannerOutputSchema.parse(raw))
})

test("parsePlannerOutputContent upgrades legacy planner tasks with teaching fields", () => {
  const parsed = parsePlannerOutputContent(JSON.stringify({
    title: "Claude Code 入门计划",
    goal: "按教程完成基础操作练习",
    tasks: [
      {
        taskNo: 1,
        title: "启动 Claude Code",
        objective: "打开终端并启动 Claude Code，确认能进入交互界面。",
        practiceSteps: ["打开项目目录", "运行 claude", "观察是否进入交互界面"],
        acceptanceCriteria: "终端进入 Claude Code 交互界面，并能发送第一条请求。",
        sourceRefs: ["u1-raw_text-0-0"],
        masteryPoints: ["知道如何启动 Claude Code", "知道启动成功的终端表现"],
        cautions: [{ text: "不要在错误目录启动后直接继续", isTrap: true }],
      },
      {
        taskNo: 2,
        title: "拆分第一个任务",
        objective: "把一个需求拆成 Claude Code 可以执行的小步骤。",
        practiceSteps: ["写出目标", "让 Claude 读取相关文件", "确认下一步动作"],
        acceptanceCriteria: "能得到一份可执行的小步骤清单。",
        sourceRefs: ["u1-raw_text-0-0"],
        masteryPoints: ["知道如何描述任务目标", "知道如何让 AI 先读取上下文"],
        cautions: [{ text: "不要一上来要求它直接大改代码" }],
      },
      {
        taskNo: 3,
        title: "提交练习结果",
        objective: "整理终端输出和操作过程，交给 AI 教练检查。",
        practiceSteps: ["复制关键输出", "说明你执行了哪些命令", "描述是否遇到报错"],
        acceptanceCriteria: "提交内容能证明练习过程和结果。",
        sourceRefs: ["u1-raw_text-0-1"],
        masteryPoints: ["知道要提交哪些证据", "知道如何描述练习结果"],
        cautions: [{ text: "不要只回复完成了而没有证据" }],
      },
    ],
  }))

  assert.equal(parsed.tasks[0]?.lessonBrief.includes("打开终端并启动 Claude Code"), true)
  assert.match(parsed.tasks[0]?.submissionGuide ?? "", /截图|终端输出|文字说明/)
  assert.ok((parsed.tasks[0]?.checkpoints.length ?? 0) >= 2)
})

test("parsePlannerOutputContent hides raw schema json for unrecoverable planner output", () => {
  assert.throws(
    () => parsePlannerOutputContent(JSON.stringify({
      title: "坏计划",
      goal: "验证错误展示",
      tasks: [
        {
          taskNo: 1,
          title: "只有一关",
          objective: "缺少足够任务",
          practiceSteps: ["做一下", "看一下"],
          acceptanceCriteria: "完成",
          sourceRefs: ["c1"],
          masteryPoints: ["知道目标", "知道结果"],
          cautions: [{ text: "不要跳过" }],
        },
      ],
    })),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /学习计划生成结果缺少必要字段或结构不完整/)
      assert.doesNotMatch(error.message, /invalid_type|\"path\"|lessonBrief/)
      return true
    },
  )
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

function addTeachingFields<T extends { tasks: Array<Record<string, unknown>> }>(plan: T): T {
  return {
    ...plan,
    tasks: plan.tasks.map((task, index) => ({
      lessonBrief:
        `先理解第 ${index + 1} 步的方法：按教程目标做最小动作，再用结果判断是否进入下一步。`,
      submissionGuide: "提交截图、代码片段、终端输出或文字说明，证明当前任务已经完成。",
      checkpoints: ["截图或终端输出能证明最小操作完成", "能用文字说明提交证据对应的结果"],
      ...task,
    })),
  }
}

test("validatePlannerBusinessRules rejects non-sequential taskNo", () => {
  const raw = addTeachingFields({
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
  })
  const parsed = plannerOutputSchema.parse(raw)
  assert.ok(validatePlannerBusinessRules(parsed))
})

test("runPlanQualityGate flags generic teaching content and mismatched evidence checks", async () => {
  const plan = plannerOutputSchema.parse({
    title: "教学质量问题计划",
    goal: "验证教学字段质量",
    tasks: [
      {
        taskNo: 1,
        title: "第一步",
        objective: "完成一个可运行页面并记录验证结果",
        lessonBrief: "先了解一下相关内容，然后继续熟悉概念，按感觉完成练习即可。",
        practiceSteps: ["尝试优化", "验证效果"],
        submissionGuide: "提交页面截图和终端输出。",
        checkpoints: ["能说出学习感受", "能总结下一步"],
        acceptanceCriteria: "页面可运行，并能提交截图和终端输出。",
        sourceRefs: ["c1"],
        masteryPoints: ["知道页面运行目标", "知道需要提交证据"],
        cautions: [{ text: "不要跳过验证", isTrap: true }],
      },
      {
        taskNo: 2,
        title: "第二步",
        objective: "根据教程完成一次具体改造并截图对比",
        lessonBrief: "先理解改造范围，再用一个最小改动验证教程方法是否生效。",
        practiceSteps: ["打开目标文件", "修改指定文案", "刷新页面观察变化"],
        submissionGuide: "提交改造前后的页面截图。",
        checkpoints: ["截图能看到改造前后差异", "能说明修改了哪个文件"],
        acceptanceCriteria: "页面变化可见，并能说明修改位置。",
        sourceRefs: ["c1"],
        masteryPoints: ["知道改造范围", "知道如何验证页面变化"],
        cautions: [{ text: "不要同时修改多个无关位置" }],
      },
      {
        taskNo: 3,
        title: "第三步",
        objective: "整理本次练习方法并形成复盘记录",
        lessonBrief: "复盘时要记录方法、证据和下一步，而不是只写完成了。",
        practiceSteps: ["写下操作步骤", "贴上验证证据", "列出下一步"],
        submissionGuide: "提交包含方法、证据和下一步的复盘文字。",
        checkpoints: ["复盘包含方法", "复盘包含证据"],
        acceptanceCriteria: "产出一份可追溯的复盘记录。",
        sourceRefs: ["c1"],
        masteryPoints: ["能复述方法", "能说明证据"],
        cautions: [{ text: "不要只写结论不写过程" }],
      },
    ],
  })

  const result = await runPlanQualityGate({ plan })
  const failedCodes = result.qualityReport.checks
    .filter((check) => !check.passed)
    .map((check) => check.code)

  assert.ok(failedCodes.includes("LESSON_BRIEF_NOT_GENERIC"))
  assert.ok(failedCodes.includes("PRACTICE_STEPS_ACTIONABLE"))
  assert.ok(failedCodes.includes("CHECKPOINTS_MATCH_SUBMISSION_EVIDENCE"))
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
      runtime_capabilities: ["asr"],
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
      runtime_capabilities: ["asr"],
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
      runtime_capabilities: ["vision"],
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
      runtime_capabilities: ["vision"],
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

test("resolveMaterialPipelineModelsFromSnapshots falls back to legacy metadata capabilities when structured fields are absent", async () => {
  const resolved = resolveMaterialPipelineModelsFromSnapshots({
    providers: [
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
    ],
    models: [
      {
        id: "m-1",
        provider_id: "provider-a",
        code: "quality-legacy",
        model_name: "quality-legacy-model",
        default_max_output_tokens: 4000,
        recommended_temperature: 0,
        is_active: true,
        metadata: { capabilities: ["quality_check"] },
      },
    ],
    env: {},
  })

  assert.equal(resolved.quality?.model.code, "quality-legacy")
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

test("analyzePlannerSourceStructure detects numbered tip tutorials and derives minimum task count", () => {
  const result = analyzePlannerSourceStructure([
    {
      excerpt:
        "Claude Code技巧大公开，15条让你少走弯路。分别如下：1、设置 cc 别名2、用 /init 重构 CLAUDE.md 3、使用其他 UI 4、Esc / rewind 5、反馈链路 6、LSP 插件 7、技能 8、计划模式 9、直接贴 bug 10、/clear 11、子代理 12、/btw 13、--worktree 14、MCP 15、告诉 Claude 看哪些文件",
    },
  ])

  assert.equal(result.numberedItemCount, 15)
  assert.equal(result.minimumTaskCount, 5)
  assert.deepEqual(
    result.numberedItemsPreview.slice(0, 3),
    [
      "1. 设置 cc 别名",
      "2. 用 /init 重构 CLAUDE.md",
      "3. 使用其他 UI",
    ],
  )
})

test("runPlanQualityGate falls back to pilot plan for weak evidence and generic long plans", async () => {
  const raw = plannerOutputSchema.parse(addTeachingFields({
    title: "抖音短教程计划",
    goal: "快速学会一个概念",
    warnings: ["公开页可提取文本较少。"],
    tasks: [
      { taskNo: 1, title: "第一步", objective: "先了解一下主题", practiceSteps: ["看一遍", "记一下"], acceptanceCriteria: "知道大概是什么", sourceRefs: ["c1"], masteryPoints: ["知道主题核心范围", "知道这关输出什么"], cautions: [{ text: "不要只扫读标题就进入下一步", isTrap: true }] },
      { taskNo: 2, title: "第二步", objective: "继续了解一下更多内容", practiceSteps: ["再看一遍", "做记录"], acceptanceCriteria: "知道更多概念", sourceRefs: ["c1"], masteryPoints: ["能说出新增概念", "能记录核心差异"], cautions: [{ text: "不要只记名词不记含义" }] },
      { taskNo: 3, title: "第三步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"], masteryPoints: ["能复述关键概念", "知道概念之间的关系"], cautions: [{ text: "不要在概念没理顺时直接扩展练习" }] },
      { taskNo: 4, title: "第四步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"], masteryPoints: ["能复述关键概念", "知道当前任务边界"], cautions: [{ text: "不要堆积未验证理解" }] },
      { taskNo: 5, title: "第五步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"], masteryPoints: ["能指出关键概念", "能说明验证方式"], cautions: [{ text: "不要跳过记录过程" }] },
      { taskNo: 6, title: "第六步", objective: "熟悉概念并继续阅读资料", practiceSteps: ["阅读", "标记"], acceptanceCriteria: "能复述部分内容", sourceRefs: ["c1"], masteryPoints: ["能复述关键信息", "能说明下一步"], cautions: [{ text: "不要把弱证据当成结论", isTrap: true }] },
    ],
  }))

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

test("runPlanQualityGate asks for retry when numbered tutorial content is compressed into too few tasks", async () => {
  const plan = plannerOutputSchema.parse(addTeachingFields({
    title: "Claude Code 入门计划",
    goal: "按教程顺序掌握 15 个技巧",
    tasks: [
      { taskNo: 1, title: "第一关", objective: "掌握技巧1-3：别名、/init、其他 UI", practiceSteps: ["配置别名", "初始化文档"], acceptanceCriteria: "前三个技巧完成", estimatedMinutes: 45, sourceRefs: ["c1"], masteryPoints: ["知道 cc 别名如何设置", "知道 CLAUDE.md 该如何初始化"], cautions: [{ text: "不要跳过别名实际验证", isTrap: true }] },
      { taskNo: 2, title: "第二关", objective: "掌握技巧4-6：Esc、反馈链路、LSP", practiceSteps: ["练习 Esc", "安装 LSP"], acceptanceCriteria: "能演示交互控制", estimatedMinutes: 60, sourceRefs: ["c1"], masteryPoints: ["知道 Esc 和 rewind 的区别", "知道反馈链路如何提供"], cautions: [{ text: "不要只安装插件不验证效果" }] },
      { taskNo: 3, title: "第三关", objective: "掌握技巧7-10：技能、计划模式、贴 bug、/clear", practiceSteps: ["调用技能", "清理上下文"], acceptanceCriteria: "能完成一次对话优化演练", estimatedMinutes: 60, sourceRefs: ["c1"], masteryPoints: ["知道技能如何使用", "知道什么时候该 /clear"], cautions: [{ text: "不要在旧上下文里硬切新任务" }] },
      { taskNo: 4, title: "第四关", objective: "掌握技巧11-15：子代理、/btw、--worktree、MCP、指定文件", practiceSteps: ["体验子代理", "配置 MCP"], acceptanceCriteria: "能说明高级工作流要点", estimatedMinutes: 90, sourceRefs: ["c1"], masteryPoints: ["知道子代理的适用场景", "知道如何告诉 Claude 具体看哪些文件"], cautions: [{ text: "不要把 5 个新技巧一次性压成一个练习块", isTrap: true }] },
    ],
  }))

  const result = await runPlanQualityGate({
    plan,
    attempt: 1,
    maxAttempts: 2,
    evidenceCoverage: {
      highConfidenceChars: 2400,
      totalUsefulChars: 2600,
      chunkCount: 2,
      isSufficient: true,
      isWeakEvidence: false,
    },
    sourceStructure: {
      numberedItemCount: 15,
      minimumTaskCount: 5,
      numberedItemsPreview: [
        "1. 设置 cc 别名",
        "2. 用 /init 重构 CLAUDE.md",
        "3. 使用其他 UI",
      ],
    },
  })

  assert.equal(result.decision, "retry")
  assert.equal(result.plan.tasks.length, 4)
  assert.ok(
    result.qualityReport.warnings.some((warning) => warning.includes("至少拆成 5 关")),
  )
})

test("runPlanQualityGate falls back after quality self-check keeps asking for retry on the final attempt", async () => {
  const plan = plannerOutputSchema.parse(addTeachingFields({
    title: "质量自检计划",
    goal: "完成一个最小改造",
    tasks: [
      { taskNo: 1, title: "第一步", objective: "完成本地环境准备并记录初始状态", practiceSteps: ["安装依赖", "运行项目"], acceptanceCriteria: "项目可以正常启动", sourceRefs: ["c1"], masteryPoints: ["知道环境是否准备完成", "知道启动成功的判断标准"], cautions: [{ text: "不要跳过启动验证", isTrap: true }] },
      { taskNo: 2, title: "第二步", objective: "根据材料完成一次页面结构改造并截图对比", practiceSteps: ["调整布局", "保存截图"], acceptanceCriteria: "页面结构更新且截图可对比", sourceRefs: ["c1"], masteryPoints: ["知道当前任务改动范围", "知道如何对比改造前后"], cautions: [{ text: "不要同时修改无关模块" }] },
      { taskNo: 3, title: "第三步", objective: "整理复盘并记录下一步优化清单", practiceSteps: ["记录问题", "列出优化项"], acceptanceCriteria: "产出一份复盘清单", sourceRefs: ["c1"], masteryPoints: ["能复述这次练习产出", "能列出下一步优化点"], cautions: [{ text: "不要只记录结果不记录原因" }] },
    ],
  }))

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
  const plan = plannerOutputSchema.parse(addTeachingFields({
    title: "低风险计划",
    goal: "完成基础学习闭环",
    tasks: [
      { taskNo: 1, title: "第一步", objective: "完成项目环境配置并记录启动结果", practiceSteps: ["安装依赖", "启动项目"], acceptanceCriteria: "项目可以正常启动", estimatedMinutes: 45, sourceRefs: ["c1"], masteryPoints: ["知道依赖安装成功的判断方法", "知道项目成功启动的标志"], cautions: [{ text: "不要在环境未通前进入页面改造", isTrap: true }] },
      { taskNo: 2, title: "第二步", objective: "跟随材料完成一次页面结构调整并记录变化", practiceSteps: ["修改页面", "查看结果"], acceptanceCriteria: "页面结构按预期更新", estimatedMinutes: 60, sourceRefs: ["c1"], masteryPoints: ["知道这次要调整的结构点", "知道如何验证结构变化"], cautions: [{ text: "不要把视觉微调和结构改造混在一起" }] },
      { taskNo: 3, title: "第三步", objective: "整理本次练习结论并输出下一步计划", practiceSteps: ["记录结论", "列出下一步"], acceptanceCriteria: "输出一份复盘记录", estimatedMinutes: 30, sourceRefs: ["c1"], masteryPoints: ["能总结这次练习学会了什么", "能明确下一步行动"], cautions: [{ text: "不要遗漏阻塞点与解决方式" }] },
    ],
  }))

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
  const plan = plannerOutputSchema.parse(addTeachingFields({
    title: "高风险计划",
    goal: "在证据不足时收缩学习范围",
    tasks: [
      { taskNo: 1, title: "第一步", objective: "梳理材料里提到的概念并记录未知项", practiceSteps: ["阅读材料", "记录未知项"], acceptanceCriteria: "输出一份概念清单", sourceRefs: ["c1"], masteryPoints: ["能梳理已知概念", "能标出未知项"], cautions: [{ text: "不要把猜测当成已掌握内容" }] },
      { taskNo: 2, title: "第二步", objective: "根据材料完成一次最小实践并记录阻塞点", practiceSteps: ["尝试实践", "记录阻塞"], acceptanceCriteria: "完成一次最小实践记录", sourceRefs: ["c1"], masteryPoints: ["能跑通最小实践", "能定位阻塞位置"], cautions: [{ text: "不要一遇到报错就改很多地方", isTrap: true }] },
      { taskNo: 3, title: "第三步", objective: "整理后续求证问题并准备补充资料", practiceSteps: ["整理问题", "准备资料"], acceptanceCriteria: "输出待验证问题列表", sourceRefs: ["c1"], masteryPoints: ["能提出待验证问题", "能说明需要补什么资料"], cautions: [{ text: "不要在证据不足时下定论" }] },
    ],
    warnings: ["材料证据仍偏弱"],
  }))

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

test("material plan run claim helper only reclaims stale active runs", () => {
  const now = new Date("2026-04-10T10:00:00.000Z")

  assert.equal(isMaterialPlanRunClaimable({
    status: "queued",
    heartbeatAt: null,
    now,
  }), true)
  assert.equal(isMaterialPlanRunClaimable({
    status: "planning",
    heartbeatAt: "2026-04-10T09:59:00.000Z",
    now,
  }), false)
  assert.equal(isMaterialPlanRunClaimable({
    status: "planning",
    heartbeatAt: "2026-04-10T09:40:00.000Z",
    now,
  }), true)
  assert.equal(isMaterialPlanRunClaimable({
    status: "ready",
    heartbeatAt: null,
    now,
  }), false)
})

test("claimMaterialPlanRun reports missing migration with actionable code", async () => {
  const supabase = {
    rpc() {
      return Promise.resolve({
        data: null,
        error: {
          message:
            "Could not find the function public.claim_material_plan_generation_run(p_claim_token, p_run_id, p_timeout_seconds) in the schema cache",
        },
      })
    },
  }

  await assert.rejects(
    () => claimMaterialPlanRun(supabase as never, "578fbbd0-ac8f-4b64-9393-177fb2211ca5"),
    (error: unknown) => {
      assert.ok(error instanceof MaterialPlanQueueMigrationError)
      assert.equal(error.code, "MATERIAL_PLAN_MIGRATION_REQUIRED")
      assert.match(error.message, /046_harden_material_plan_generation\.sql/)
      return true
    },
  )
})

test("material plan failure finalizer persists missing migration as terminal failed state", async () => {
  const updates: Array<{
    table: string
    payload: Record<string, unknown>
    filters: Array<[string, unknown]>
  }> = []

  const supabase = {
    from(table: string) {
      return {
        update(payload: Record<string, unknown>) {
          const entry = {
            table,
            payload,
            filters: [] as Array<[string, unknown]>,
          }
          updates.push(entry)

          return {
            eq(column: string, value: unknown) {
              entry.filters.push([column, value])
              return Promise.resolve({ error: null })
            },
          }
        },
      }
    },
  }

  await finalizeMaterialPlanGenerationFailure(
    supabase as never,
    {
      id: "578fbbd0-ac8f-4b64-9393-177fb2211ca5",
      user_id: "11111111-1111-4111-8111-111111111111",
      intake_id: "5969f82d-df09-4c7e-8903-451f0c07e7e6",
      draft_id: null,
    },
    new MaterialPlanQueueMigrationError(
      "材料计划生成队列迁移未应用，请先执行 supabase/migrations/046_harden_material_plan_generation.sql。",
    ),
    "2026-05-15T00:00:00.000Z",
  )

  const runUpdate = updates.find((entry) => entry.table === "learning_plan_generation_runs")
  const intakeUpdate = updates.find((entry) => entry.table === "learning_material_intakes")

  assert.deepEqual(runUpdate?.payload, {
    status: "failed",
    error_code: "MATERIAL_PLAN_MIGRATION_REQUIRED",
    error_message: "材料计划生成队列迁移未应用，请先执行 supabase/migrations/046_harden_material_plan_generation.sql。",
    finished_at: "2026-05-15T00:00:00.000Z",
    updated_at: "2026-05-15T00:00:00.000Z",
  })
  assert.deepEqual(runUpdate?.filters, [["id", "578fbbd0-ac8f-4b64-9393-177fb2211ca5"]])
  assert.deepEqual(intakeUpdate?.payload, {
    status: "failed",
    processing_stage: "failed",
    progress_percent: 100,
    progress_message: "材料计划生成队列迁移未应用，请先执行 supabase/migrations/046_harden_material_plan_generation.sql。",
    error_code: "MATERIAL_PLAN_MIGRATION_REQUIRED",
    updated_at: "2026-05-15T00:00:00.000Z",
  })
  assert.deepEqual(intakeUpdate?.filters, [["id", "5969f82d-df09-4c7e-8903-451f0c07e7e6"]])
})

test("material plan status display hides raw AI provider timeout copy", () => {
  const result = resolveMaterialPlanStatusDisplay({
    status: "failed",
    progressMessage: "AI provider request timed out",
    errorCode: "AI_PROVIDER_ERROR",
    errorMessage: "AI provider request timed out",
  })

  assert.match(result.progressMessage, /AI 服务响应超时/)
  assert.match(result.errorMessage ?? "", /AI 服务响应超时/)
  assert.equal(result.progressMessage.includes("AI provider request timed out"), false)
  assert.equal(result.errorMessage?.includes("AI provider request timed out"), false)
})

test("planner provider runtime uses one longer async planning timeout instead of short retries", () => {
  assert.deepEqual(
    resolvePlannerProviderTimeoutConfig({
      timeoutMs: 60_000,
      retryCount: 1,
    }),
    {
      timeoutMs: 120_000,
      retryCount: 0,
    },
  )

  assert.deepEqual(
    resolvePlannerProviderTimeoutConfig({
      timeoutMs: 180_000,
      retryCount: 1,
    }),
    {
      timeoutMs: 180_000,
      retryCount: 1,
    },
  )
})

test("runSupabaseQueryWithRetry retries transient fetch failures", async () => {
  let attempts = 0

  const result = await runSupabaseQueryWithRetry(
    async () => {
      attempts += 1
      if (attempts < 3) {
        return {
          data: null,
          error: {
            message: "TypeError: fetch failed",
            details: "Caused by: Error: getaddrinfo ENOTFOUND example.supabase.test",
          },
        }
      }

      return {
        data: { ok: true },
        error: null,
      }
    },
    {
      context: "failed to load plan draft detail",
      delaysMs: [0, 0],
    },
  )

  assert.equal(attempts, 3)
  assert.deepEqual(result.data, { ok: true })
})

test("material plan draft load messages classify transient fetch failures", () => {
  assert.equal(
    isTransientMaterialPlanDraftLoadError(
      "INTERNAL_ERROR",
      "failed to load draft tasks: TypeError: fetch failed",
    ),
    true,
  )
  assert.equal(
    resolveMaterialPlanDraftLoadErrorMessage(
      "INTERNAL_ERROR",
      "failed to load draft tasks: TypeError: fetch failed",
    ),
    "草稿已生成，但读取详情时网络临时异常。系统会自动重试，请稍等；如果仍失败，可以关闭后重新打开生成弹框。",
  )
})
