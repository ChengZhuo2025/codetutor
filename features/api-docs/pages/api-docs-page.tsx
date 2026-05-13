"use client"

import { useEffect, useMemo, useState } from "react"
import { StatePanel } from "@/components/ui/state-panel"
import { SwaggerApiViewer } from "@/features/api-docs/components/swagger-api-viewer"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminBffFetch,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"

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
  const [state, setState] = useState<ApiDocsState>({
    status: "loading",
  })
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)
  const endpointCount = useMemo(() => {
    if (state.status !== "success") {
      return null
    }

    const paths = (state.spec.paths ?? {}) as Record<string, Record<string, unknown>>
    const methodSet = new Set(["get", "post", "put", "patch", "delete", "head", "options"])
    let count = 0

    for (const pathItem of Object.values(paths)) {
      for (const method of Object.keys(pathItem ?? {})) {
        if (methodSet.has(method.toLowerCase())) {
          count += 1
        }
      }
    }

    return count
  }, [state])

  useEffect(() => {
    let cancelled = false

    async function loadSpec() {
      try {
        const response = await adminBffFetch(
          "/docs/openapi",
          {
            method: "GET",
          },
          "加载接口文档失败。",
        )

        if (cancelled) {
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
      } catch (error) {
        if (cancelled) {
          return
        }

        setAuthExpired(isAdminSessionExpiredError(error))
        setState({
          status: "error",
          message: getAdminApiErrorMessage(error, "加载接口文档失败。"),
        })
      }
    }

    void loadSpec()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200/80 bg-white/90 px-6 py-6 shadow-sm backdrop-blur sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
            {endpointCount !== null ? (
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                API 总数: {endpointCount}
              </span>
            ) : null}
          </div>
        </section>

        {state.status === "success" ? (
          <>
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
