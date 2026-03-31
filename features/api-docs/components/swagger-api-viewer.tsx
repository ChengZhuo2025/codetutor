"use client"

import { useEffect, useRef, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type SwaggerApiViewerProps = {
  spec: Record<string, unknown>
}

type SwaggerRequest = {
  headers?: Record<string, string>
} & Record<string, unknown>

export function SwaggerApiViewer({ spec }: SwaggerApiViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    let system: { destroy?: () => void } | void
    const container = containerRef.current

    if (!container) {
      return
    }

    async function ensureSwaggerUiBundle() {
      if (typeof window === "undefined") {
        return null
      }

      if (typeof window.SwaggerUIBundle === "function") {
        return window.SwaggerUIBundle
      }

      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
          'script[data-swagger-ui-bundle="true"]',
        )

        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true })
          existing.addEventListener(
            "error",
            () => reject(new Error("failed to load swagger ui bundle")),
            { once: true },
          )
          return
        }

        const script = document.createElement("script")
        script.src = "/api/docs/swagger-ui-bundle"
        script.async = true
        script.dataset.swaggerUiBundle = "true"
        script.addEventListener("load", () => resolve(), { once: true })
        script.addEventListener(
          "error",
          () => reject(new Error("failed to load swagger ui bundle")),
          { once: true },
        )
        document.head.appendChild(script)
      })

      return typeof window.SwaggerUIBundle === "function"
        ? window.SwaggerUIBundle
        : null
    }

    async function mountSwaggerUi() {
      const SwaggerUIBundle = await ensureSwaggerUiBundle()

      if (disposed || !container || typeof SwaggerUIBundle !== "function") {
        if (!disposed && typeof SwaggerUIBundle !== "function") {
          setLoadError("Swagger UI 资源加载失败，请刷新页面后重试。")
        }
        return
      }

      setLoadError(null)
      container.innerHTML = ""

      system = SwaggerUIBundle({
        spec,
        domNode: container,
        defaultModelsExpandDepth: 1,
        docExpansion: "list",
        displayRequestDuration: true,
        persistAuthorization: true,
        presets: SwaggerUIBundle.presets?.apis
          ? [SwaggerUIBundle.presets.apis]
          : undefined,
        requestInterceptor: async (request: SwaggerRequest) => {
          const supabase = createSupabaseBrowserClient()
          const {
            data: { session },
          } = await supabase.auth.getSession()

          if (session?.access_token) {
            request.headers = {
              ...request.headers,
              Authorization: `Bearer ${session.access_token}`,
            }
          }

          return request
        },
      })
    }

    void mountSwaggerUi().catch(() => {
      if (!disposed) {
        setLoadError("Swagger UI 资源加载失败，请刷新页面后重试。")
      }
    })

    return () => {
      disposed = true
      if (typeof system?.destroy === "function") {
        system.destroy()
      }
      container.innerHTML = ""
    }
  }, [spec])

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {loadError ? (
        <div className="p-6 text-sm text-rose-600">{loadError}</div>
      ) : null}
      <div ref={containerRef} />
    </div>
  )
}
