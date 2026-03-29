import type { ApiResponse } from "@/lib/api/types"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { unwrapResponse } from "@/lib/api/types"

const API_BASE_PATH = "/api"

async function buildRequestHeaders(initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders)

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  if (typeof window !== "undefined") {
    const supabase = createSupabaseBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${session.access_token}`)
    }
  }

  return headers
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const headers = await buildRequestHeaders(init?.headers)

  const response = await fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  })

  return (await response.json()) as ApiResponse<T>
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
}

export async function requestData<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await request<T>(path, init)
  return unwrapResponse(response)
}
