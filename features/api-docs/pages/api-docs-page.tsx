"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { StatePanel } from "@/components/ui/state-panel"
import { ADMIN_ROUTES, ROUTES } from "@/constants/routes"
import { SwaggerApiViewer } from "@/features/api-docs/components/swagger-api-viewer"
import { apiFetch } from "@/lib/api/client"

const TAG_GUIDES = [
  {
    tag: "auth",
    title: "登录与会话",
    summary: "覆盖登录收口、会话跳转和登录态恢复。",
    successExamples: [
      "200 → `userId / redirectTo / onboardingCompleted`",
      "常见入口：`/api/auth/login`、`/api/auth/session`",
    ],
    errorNotes: [
      "401：Bearer Token 缺失或登录态失效",
      "400：`loginType` 不合法",
    ],
  },
  {
    tag: "profile",
    title: "资料与头像",
    summary: "查看/修改个人档案，以及头像上传。",
    successExamples: [
      "200 → `nickname / primaryTool / currentScore`",
      "上传头像返回 `avatarUrl / storagePath / previousAvatarUrl`",
    ],
    errorNotes: [
      "400：昵称、邮箱、头像文件类型或大小校验失败",
      "404：当前用户档案不存在",
    ],
  },
  {
    tag: "onboarding",
    title: "路径初始化",
    summary: "工具选择、路径推荐和 onboarding 完成激活。",
    successExamples: [
      "200 → 推荐工具分组、自学模式和预设路径选项",
      "完成后返回 `currentTaskId / redirectTo`",
    ],
    errorNotes: [
      "400：缺少合法的查询参数或请求体结构错误",
      "422：`learningLevel / selectionMode` 业务校验失败",
    ],
  },
  {
    tag: "learning",
    title: "学习会话",
    summary: "当前学习面板、消息发送和历史消息分页。",
    successExamples: [
      "200 → `conversationId / messages / mission / rightPanel`",
      "SSE：`/api/learning/message` 支持流式返回",
    ],
    errorNotes: [
      "422：`conversationId`、消息体 JSON 或字段校验失败",
      "502：AI provider 或下游编排失败",
    ],
  },
  {
    tag: "task",
    title: "任务状态写接口",
    summary: "完成任务与更新阻塞/进行中状态。",
    successExamples: [
      "200 → `taskStatus / currentScore / nextTask`",
      "用于学习流程里的任务推进和阻塞反馈",
    ],
    errorNotes: [
      "422：`taskId` 或 `status` 未通过请求校验",
      "400：任务存在，但当前路径状态不允许该操作",
    ],
  },
  {
    tag: "history",
    title: "学习历史",
    summary: "查看历史计划、详情和状态流转。",
    successExamples: [
      "200 → `items / summary / timeline / steps`",
      "状态写接口返回 `pathId / status`",
    ],
    errorNotes: [
      "400：计划 ID 或操作不合法",
      "409：已有进行中的学习计划，不能直接恢复/切换",
    ],
  },
  {
    tag: "feedback",
    title: "用户反馈",
    summary: "用户提交反馈、查看自己的反馈列表与详情。",
    successExamples: [
      "200 → `ticketId` 或反馈单详情/回复列表",
      "用于产品问题、建议和交互反馈",
    ],
    errorNotes: [
      "400：标题、内容、联系方式等字段校验失败",
      "404：反馈记录不存在",
    ],
  },
  {
    tag: "admin-profile",
    title: "管理员资料",
    summary: "管理员本人资料读取、更新与头像上传。",
    successExamples: [
      "200 → `displayName/nickname`、`avatarUrl` 等资料字段",
      "上传头像返回 `avatarUrl / storagePath / previousAvatarUrl`",
    ],
    errorNotes: [
      "401：管理员登录态缺失或过期",
      "400：昵称、邮箱、头像文件类型或大小校验失败",
    ],
  },
  {
    tag: "admin-feedback",
    title: "管理员反馈",
    summary: "管理员筛选反馈、查看详情、回复和更新状态。",
    successExamples: [
      "200 → 带 `userSnapshot` 的反馈单详情",
      "需携带管理员登录态（admin cookie）",
    ],
    errorNotes: [
      "403：管理员登录态无效或已过期",
      "400：筛选参数、回复体或状态更新体不合法",
    ],
  },
] as const

const DEBUG_TIPS = [
  {
    title: "普通接口调试",
    lines: [
      "Swagger UI 会自动带当前 Supabase 登录用户的 Bearer Token。",
      "如果返回 401，先确认你当前浏览器是否仍处于登录状态。",
    ],
  },
  {
    title: "管理员接口调试",
    lines: [
      "管理员接口依赖后台登录态（admin-access-token cookie），不使用普通用户 Bearer Token。",
      "若返回 403，请先确认是否已在 `/admin/login` 登录且会话未过期。",
    ],
  },
  {
    title: "常见错误码",
    lines: [
      "400：请求结构对了，但路由侧参数或业务前置条件不满足。",
      "422：请求字段通过 JSON 解析，但共享 schema 校验未通过。",
      "409：当前资源状态冲突，通常出现在历史计划状态流转。",
      "502：AI provider/编排层失败，主要出现在学习消息接口。",
    ],
  },
  {
    title: "学习消息接口",
    lines: [
      "`/api/learning/message` 同时支持 JSON 与 `text/event-stream`。",
      "若你想看流式响应，请在 Swagger UI 里使用支持 SSE 的调试方式或直接用 curl。",
    ],
  },
] as const

type ApiDocsState =
  | {
      status: "loading"
    }
  | {
      status: "error"
      message: string
    }
  | {
      status: "success"
      spec: Record<string, unknown>
    }

export function ApiDocsPage() {
  const router = useRouter()
  const [state, setState] = useState<ApiDocsState>({
    status: "loading",
  })
  const tagOperationCounts = useMemo(() => {
    if (state.status !== "success") {
      return new Map<string, number>()
    }

    const counts = new Map<string, number>()
    const paths = (state.spec.paths ?? {}) as Record<
      string,
      Record<string, { tags?: string[] }>
    >

    for (const pathItem of Object.values(paths)) {
      for (const operation of Object.values(pathItem)) {
        if (!operation?.tags) {
          continue
        }

        for (const tag of operation.tags) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1)
        }
      }
    }

    return counts
  }, [state])

  useEffect(() => {
    let cancelled = false

    async function loadSpec() {
      const response = await apiFetch("/docs/openapi", {
        method: "GET",
      })

      if (cancelled) {
        return
      }

      if (response.status === 401) {
        router.replace(`${ADMIN_ROUTES.login}?next=${encodeURIComponent(ROUTES.apiDocs)}`)
        return
      }

      if (!response.ok) {
        let message = "加载接口文档失败。"

        try {
          const body = (await response.json()) as { message?: string }
          if (typeof body.message === "string" && body.message.trim()) {
            message = body.message
          }
        } catch {
          // Ignore JSON parsing errors and keep fallback message.
        }

        setState({
          status: "error",
          message,
        })
        return
      }

      const spec = (await response.json()) as Record<string, unknown>

      if (cancelled) {
        return
      }

      setState({
        status: "success",
        spec,
      })
    }

    void loadSpec()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200/80 bg-white/90 px-6 py-6 shadow-sm backdrop-blur sm:px-8">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">
              API Docs
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                后端接口文档与调试面板
              </h1>
              <p className="w-full text-sm leading-6 text-slate-600">
                当前页面基于已实现后端 API 自动生成 OpenAPI 3.1 文档。普通接口会自动继承当前登录用户
                的 Bearer Token；管理员接口请在 Swagger UI 的 Authorize 弹窗里填写
                <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-800">
                  x-admin-secret
                </code>
                。
              </p>
            </div>
          </div>
        </section>

        {state.status === "success" ? (
          <>
            <section className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
              <div className="flex flex-col gap-5">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    按标签分组的响应示例说明
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    下面这层导览帮你先看懂每组接口主要返回什么、最常见的错误码是什么。详细字段请再往下看
                    Swagger UI 中每个 operation 的 response example。
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {TAG_GUIDES.map((item) => (
                    <article
                      key={item.tag}
                      className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-slate-950">
                            {item.title}
                          </h3>
                          <p className="text-sm leading-6 text-slate-600">
                            {item.summary}
                          </p>
                        </div>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                          {item.tag}
                          {" · "}
                          {tagOperationCounts.get(item.tag) ?? 0} 个接口
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Success
                          </p>
                          <ul className="space-y-2 text-sm leading-6 text-slate-700">
                            {item.successExamples.map((line) => (
                              <li key={line}>- {line}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Common Errors
                          </p>
                          <ul className="space-y-2 text-sm leading-6 text-slate-700">
                            {item.errorNotes.map((line) => (
                              <li key={line}>- {line}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
              <div className="flex flex-col gap-5">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    常见调试说明
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    这部分是进入具体接口调试前最常见的排查路径，能帮你快速判断是登录态、管理员密钥、共享
                    schema 校验，还是 AI provider 本身出了问题。
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {DEBUG_TIPS.map((tip) => (
                    <article
                      key={tip.title}
                      className="rounded-3xl border border-amber-200/70 bg-amber-50/70 p-5"
                    >
                      <h3 className="text-base font-semibold text-slate-950">
                        {tip.title}
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                        {tip.lines.map((line) => (
                          <li key={line}>- {line}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {state.status === "success" ? (
          <SwaggerApiViewer spec={state.spec} />
        ) : (
          <section className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-10">
            <StatePanel
              status={state.status}
              title={
                state.status === "loading"
                  ? "正在加载接口文档"
                  : "接口文档暂时不可用"
              }
              description={
                state.status === "loading"
                  ? "正在校验登录态并拉取 OpenAPI 规范。"
                  : state.message
              }
            />
          </section>
        )}
      </div>
    </main>
  )
}
